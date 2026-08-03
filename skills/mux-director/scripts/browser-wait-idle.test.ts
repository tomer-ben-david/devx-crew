import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync, chmodSync, appendFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "browser-wait-idle.ts");

// A fake `cmux` that returns a scripted sequence of visible/hidden results,
// one per invocation, regardless of subcommand. It reads the next entry from a
// shared timeline file and exits 0 (visible) or 1 (hidden), mimicking both
// `cmux browser ... is visible <sel>` and `cmux browser ... wait --selector`.
function fakeCmuxBin(binsDir: string, timeline: Array<boolean | "error">): { binDir: string; timelineFile: string; callsFile: string } {
  const timelineFile = path.join(binsDir, "timeline.json");
  const callsFile = path.join(binsDir, "calls.txt");
  writeFileSync(timelineFile, JSON.stringify(timeline));
  writeFileSync(callsFile, "");
  const bin = path.join(binsDir, "cmux");
  writeFileSync(
    bin,
    `#!/usr/bin/env node
import { readFileSync, appendFileSync } from "node:fs";
const timeline = JSON.parse(readFileSync("${timelineFile}", "utf8"));
const calls = readFileSync("${callsFile}", "utf8").split("\\n").filter(Boolean);
const idx = calls.length;
const entry = timeline[Math.min(idx, timeline.length - 1)] ?? false;
if (entry === "error") {
  process.stderr.write("transport unavailable\\n");
  process.exit(9);
}
const visible = entry === true;
appendFileSync("${callsFile}", (visible ? "visible" : "hidden") + "\\n");
process.exit(visible ? 0 : 1);
`,
  );
  chmodSync(bin, 0o755);
  return { binDir: binsDir, timelineFile, callsFile };
}

function runResult(
  args: string[],
  pathEnv: string,
): { stdout: string; status: number | null } {
  const result = spawnSync(process.execPath, ["--import", "tsx", script, ...args], {
    encoding: "utf8",
    env: { ...process.env, PATH: pathEnv },
  });
  return { stdout: (result.stdout || "") + (result.stderr || ""), status: result.status };
}

test("usage errors exit 2 with no surface", () => {
  const root = mkdtempSync(path.join(tmpdir(), "mux-bwait-"));
  const result = runResult([], `${root}:${process.env.PATH}`);
  assert.equal(result.status, 2);
  assert.match(result.stdout, /Usage: browser-wait-idle/);
});

test("rejects --floor greater than --max", () => {
  const root = mkdtempSync(path.join(tmpdir(), "mux-bwait-"));
  const result = runResult(["surface:1", "--floor", "200", "--max", "100"], `${root}:${process.env.PATH}`);
  assert.equal(result.status, 2);
  assert.match(result.stdout, /must not exceed --max/);
});

test("exits 3 when the browser transport fails", () => {
  const root = mkdtempSync(path.join(tmpdir(), "mux-bwait-"));
  fakeCmuxBin(root, ["error"]);
  const result = runResult(["surface:1", "--floor", "0", "--max", "5"], `${root}:${process.env.PATH}`);
  assert.equal(result.status, 3);
  assert.match(result.stdout, /cmux\/browser transport error/);
});

test("exits 0 (idle) when send control is visible right after the floor", () => {
  const root = mkdtempSync(path.join(tmpdir(), "mux-bwait-"));
  fakeCmuxBin(root, [true]); // first "is visible" check -> visible
  const result = runResult(["surface:1", "--floor", "0", "--max", "5"], `${root}:${process.env.PATH}`);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /idle/);
});

test("exits 1 (still generating) when send control never becomes visible", () => {
  const root = mkdtempSync(path.join(tmpdir(), "mux-bwait-"));
  fakeCmuxBin(root, [false, false, false]); // every check hidden
  const result = runResult(["surface:1", "--floor", "0", "--max", "3"], `${root}:${process.env.PATH}`);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /still generating/);
});

test("exits 0 when send control becomes visible during the wait phase", () => {
  const root = mkdtempSync(path.join(tmpdir(), "mux-bwait-"));
  // is-visible after floor = hidden, then the wait resolves visible, then the
  // post-timeout recheck = visible.
  const { callsFile } = fakeCmuxBin(root, [false, true, true]);
  const result = runResult(["surface:1", "--floor", "0", "--max", "5"], `${root}:${process.env.PATH}`);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /idle/);
  // Confirms it actually consulted cmux (not a stub).
  assert.ok(readFileSync(callsFile, "utf8").trim().length > 0);
});
