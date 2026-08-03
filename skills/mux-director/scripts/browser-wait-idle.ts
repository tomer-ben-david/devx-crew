#!/usr/bin/env node
// Bounded foreground wait for a ChatGPT browser target to finish generating.
//
// ChatGPT shows a "stop" control while generating and restores the
// "send" control when idle. Waiting for the send control to reappear is a
// TRANSPORT IDLE signal (the UI is ready to type again), not a judgment about
// response content. It does not parse the answer, classify a verdict, or run
// page JavaScript that decides whether the review is complete - so it stays
// within the mux-director invariant that no script may declare a ChatGPT
// review "done". The orchestrator still performs the single content read and
// its own completion judgment after this returns.
//
// Browsers are slow: ChatGPT needs a floor before it is worth checking, so this
// sleeps --floor seconds first, then blocks on the send-control signal up to
// --max total seconds. Run it as a tracked FOREGROUND task (the harness owns the
// process), never fire-and-forget with a shell `&` (the child is reaped when the
// caller returns, leaving nothing running).
//
// Exit codes are explicit and machine-readable so callers can checkpoint the
// wait without guessing from a partial message:
//   0  - target is idle (send control visible) within the budget
//   1  - timed out still generating; print "still generating after <n>s"
//   2  - usage / arg error
//   3  - cmux/browser transport error (could not reach the surface)
//
// macOS-first: no dependency on GNU `timeout(1)`; --max is the only bound.
import { execFileSync } from "node:child_process";

function fail(message: string, code: number): never {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

const sleep = (seconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, seconds * 1_000));

// The ChatGPT send control marks "ready to type" = done generating. The stop
// control is shown while a response streams. We wait for send to be visible.
const SEND_CONTROL = 'button[data-testid="send-button"]';

type ExecFailure = Error & {
  readonly status?: number;
  readonly stderr?: Buffer | string | null;
  readonly stdout?: Buffer | string | null;
};

class BrowserTransportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BrowserTransportError";
  }
}

function execFailure(error: unknown): ExecFailure {
  if (error instanceof Error) return error as ExecFailure;
  return new Error(String(error));
}

function outputText(value: Buffer | string | null | undefined): string {
  return value === undefined || value === null ? "" : value.toString().trim();
}

function transportError(error: unknown): BrowserTransportError {
  const failure = execFailure(error);
  const detail = outputText(failure.stderr) || outputText(failure.stdout) || failure.message;
  return new BrowserTransportError(`cmux/browser transport error: ${detail}`);
}

function isExpectedHiddenResult(error: unknown): boolean {
  const failure = execFailure(error);
  return failure.status === 1 && outputText(failure.stderr) === "";
}

function isSendControlVisible(surface: string): boolean {
  try {
    execFileSync(
      "cmux",
      ["browser", surface, "is", "visible", SEND_CONTROL],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    return true;
  } catch (error) {
    if (isExpectedHiddenResult(error)) return false;
    throw transportError(error);
  }
}

function failTransport(error: unknown): never {
  const message = error instanceof BrowserTransportError ? error.message : transportError(error).message;
  fail(message, 3);
}

async function main(): Promise<void> {
  // browser-wait-idle.ts <surface> [--floor <s>] [--max <s>] [--selector <css>]
  const positionals: string[] = [];
  let floorSeconds = 150;
  let maxSeconds = 600;
  let selector = SEND_CONTROL;
  for (let i = 0; i < process.argv.slice(2).length; i += 1) {
    const arg = process.argv.slice(2)[i]!;
    if (arg === "--floor" || arg === "--max" || arg === "--selector") {
      const value = process.argv.slice(2)[i + 1];
      if (value === undefined) fail(`Usage: browser-wait-idle.ts <surface> [--floor <s>] [--max <s>] [--selector <css>]`, 2);
      i += 1;
      if (arg === "--selector") {
        selector = value;
      } else {
        const n = Number(value);
        if (!Number.isInteger(n) || n < 0) fail(`${arg} must be a non-negative integer: ${value}`, 2);
        if (arg === "--floor") floorSeconds = n;
        else maxSeconds = n;
      }
    } else {
      positionals.push(arg);
    }
  }
  if (positionals.length !== 1) {
    fail("Usage: browser-wait-idle.ts <surface> [--floor <s>] [--max <s>] [--selector <css>]", 2);
  }
  const surface = positionals[0]!;
  if (floorSeconds > maxSeconds) {
    fail(`--floor (${floorSeconds}) must not exceed --max (${maxSeconds})`, 2);
  }

  // 1. Floor sleep: browsers/ChatGPT need time before checking is worthwhile.
  await sleep(floorSeconds);

  // 2. If already idle after the floor, done immediately.
  try {
    if (isSendControlVisible(surface)) {
      process.stdout.write(`idle after floor ${floorSeconds}s\n`);
      process.exitCode = 0;
      return;
    }
  } catch (error) {
    failTransport(error);
  }

  // 3. Block on the send-control signal for the remaining budget. cmux browser
  //    wait --selector returns when the element is visible or times out.
  const remainingMs = (maxSeconds - floorSeconds) * 1_000;
  try {
    execFileSync(
      "cmux",
      ["browser", surface, "wait", "--selector", selector, "--timeout-ms", String(remainingMs)],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    process.stdout.write(`idle within ${maxSeconds}s\n`);
    process.exitCode = 0;
  } catch {
    // Timed out or transport error. Distinguish by re-checking once: if the send
    // control is now visible, the wait simply resolved late; otherwise still busy.
    try {
      if (isSendControlVisible(surface)) {
        process.stdout.write(`idle within ${maxSeconds}s\n`);
        process.exitCode = 0;
      } else {
        process.stdout.write(`still generating after ${maxSeconds}s\n`);
        process.exitCode = 1;
      }
    } catch (error) {
      failTransport(error);
    }
  }
}

await main();
