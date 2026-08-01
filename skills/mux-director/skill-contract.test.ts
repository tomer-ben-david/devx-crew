import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const skill = readFileSync(new URL("./SKILL.md", import.meta.url), "utf8");

test("mux-director is a cross-PR overseer, not a single-PR orchestrator", () => {
  // Identity: one director over many orchestrators, distinct from mux-orchestrate.
  assert.match(skill, /One director oversees many `mux-orchestrate` runs/);
  assert.match(skill, /Distinct from mux-orchestrate/);
  assert.match(skill, /Do not use for a single PR/);
  // Default stance is lightweight, escalating only on smell.
  assert.match(skill, /Default stance: lightweight overseer/);
  assert.match(skill, /Escalate to \*\*hands-on challenger\*\* only when a smell signal fires/);
});

test("mux-director does not own product code or verdicts", () => {
  assert.match(skill, /does not write product code/);
  assert.match(skill, /does not own any single PR/);
  assert.match(skill, /it does not write the verdict/);
  assert.match(skill, /Auto-approving, merging, deploying, or any remote mutation without explicit human confirmation/);
});

test("mux-director routes decisions instead of making them", () => {
  assert.match(skill, /The director does not make product decisions\. It routes them/);
  assert.match(skill, /surface to the human with the tradeoff, do not auto-resolve/);
  assert.match(skill, /When product intent is unclear AND the human is available, ask the human/);
});

test("mux-director takes delegated product + architect authority when the human is away", () => {
  assert.match(skill, /Delegated product authority \(overnight \/ away mode\)/);
  assert.match(skill, /If an agent is blocked on ANY question/);
  assert.match(skill, /You are PM AND architect overnight/);
  assert.match(skill, /Auto-approve routine permissions/);
  assert.match(skill, /There is NO production\/staging deployment in play/);
  assert.match(skill, /Answer questions, don't stall/);
  assert.match(skill, /Merge to main, deploy\/release, changing the goal itself/);
  assert.match(skill, /Morning handoff/);
});

test("mux-director detects backward motion and steers back to forward", () => {
  assert.match(skill, /Detect and correct backward motion \(regression\)/);
  assert.match(skill, /previously-passing test now fails/);
  assert.match(skill, /find the WHY before allowing more forward edits/);
  assert.match(skill, /monotonic progress/);
});

test("smell signals include the whack-a-mole and self-defense triggers", () => {
  assert.match(skill, /3rd finding in one family/);
  assert.match(skill, /Self-serving defense/);
  assert.match(skill, /PR fixes a problem the PR created/);
  assert.match(skill, /Reviewer-set asymmetry/);
  assert.match(skill, /Narrow repeated guards \/ duplication/);
  assert.match(skill, /Design-spiral \/ re-derivation/);
});

test("mux-director uses bounded waiters and avoids narration token waste", () => {
  assert.match(skill, /session-jsonl\.ts wait/);
  assert.match(skill, /browser-wait-idle\.ts/);
  assert.match(skill, /Never wake an orchestrator every interval to narrate/);
  assert.match(skill, /no script classifies a ChatGPT verdict/);
});

test("mux-director verifies a file is on the PR branch before judging it", () => {
  // Guards the real failure mode from this session: analyzing a file from a
  // different checkout and mistaking it for the PR's diff.
  assert.match(skill, /Verify the file is actually on the PR branch before judging it/);
  assert.match(skill, /do not analyze a file from a different checkout/);
});

test("mux-director checks PR ancestry before calling file-overlap a smell", () => {
  // Guards the stacked-PR failure mode: a bbox PR stacked on a governance PR
  // appears (via main..HEAD) to "contain" the governance layer it merely
  // inherits. Overlap is by design when the other PR is an ancestor.
  assert.match(skill, /Check PR ancestry before calling file-overlap a smell/);
  assert.match(skill, /PRs are often \*\*stacked\*\*/);
  assert.match(skill, /if the other PR is an ancestor, the overlap is BY DESIGN/);
  assert.match(skill, /Judge a PR's scope by its OWN commits/);
  assert.match(skill, /never by `main\.\.HEAD` on a stacked branch/);
});

test("mux-director keeps a stacked PR synced with its moving base", () => {
  // When PR-B stacks on PR-A and PR-A is still pushing, PR-B drifts stale and
  // conflicts at merge unless it periodically pulls/rebases PR-A. Each cycle,
  // check git rev-list HEAD..FETCH_HEAD --count; if >0, flag + relay.
  assert.match(skill, /Keep a stacked PR synced with its moving base/);
  assert.match(skill, /PR-A is still in progress/);
  assert.match(skill, /git rev-list HEAD\.\.FETCH_HEAD --count/);
  assert.match(skill, /A stacked PR that sits stale while its base advances/);
});

test("mux-director monitors the PR description as the alignment contract", () => {
  // The PR description is the contract keeping human/agent/reviewers aligned.
  // Read it each cycle (gh pr view --json body), not just screen output.
  assert.match(skill, /Monitor the PR description as the alignment contract/);
  // Three drifts: goal/non-goal drift, DoD overstatement, stale description.
  assert.match(skill, /Goal\/non-goal drift/);
  assert.match(skill, /DoD-checklist overstatement/);
  assert.match(skill, /DoD-checklist overstatement/);
  assert.match(skill, /overstates completion and lets a reviewer think the work is finished/);
  assert.match(skill, /Cross-check each checked item against the agent's actual screen\/git state/);
  assert.match(skill, /Stale description/);
});

test("mux-director classifies idle vs working from activity markers, not the prompt footer", () => {
  // Guards the failure mode: a short read-screen tail showing only the prompt
  // line read as "idle" when the agent was actually mid-turn.
  assert.match(skill, /classifying an agent as idle vs working, read enough lines to see the activity markers/);
  assert.match(skill, /A short tail showing only the .* prompt line is NOT proof of idle/);
});

test("mux-director reports every classification and owns its mistakes", () => {
  assert.match(skill, /Report every classification, not just the actions taken/);
  assert.match(skill, /Own mistakes plainly/);
});

test("mux-director leads with user-facing behavior change, not implementation detail", () => {
  // The human is founder+PM+engineer. They need before->after behavior deltas
  // ("what does the user see differently"), not a tour of functions/columns/SQL.
  assert.match(skill, /Lead with USER-FACING BEHAVIOR CHANGE, not implementation detail/);
  assert.match(skill, /what does the user see\/experience differently now/);
  assert.match(skill, /frame it as a behavior delta, ideally before -> after/);
  assert.match(skill, /internal only - no user-facing change/);
});

test("mux-director relays suspicions to the agent as a consideration, not a directive", () => {
  // Self-improvement loop: a technical smell is relayed to the owning agent for
  // its own self-review, framed as an observation/question, never as a command
  // to change. Always paired with a human surface; never re-relayed every cycle.
  assert.match(skill, /Relay suspicions to the agent for self-improvement/);
  assert.match(skill, /consideration for it to weigh itself/);
  assert.match(skill, /never as an instruction to change/);
  assert.match(skill, /Always pair with the human surface/);
  assert.match(skill, /Relay in the SAME cycle you surface it/);
  assert.match(skill, /Send mid-turn - do NOT defer to .idle./);
  assert.match(skill, /Transport \(verified\):.\* TWO commands, in order/);
  assert.match(skill, /SEPARATE .cmux send-key.* enter.* to actually submit/);
  assert.match(skill, /trailing .\\n. inside .cmux send. does NOT reliably submit/);
  assert.match(skill, /The .↳. marker is the only proof of delivery/);
  assert.match(skill, /A suspicion reported only to the human and never relayed is a failure mode/);
  assert.match(skill, /Re-relay until the loop actually closes - persistence is NOT nagging/);
  assert.match(skill, /Stop re-relaying only when/);
});

test("mux-director distinguishes justified deviation from real scope creep", () => {
  // A stated non-goal is a default, not a straightjacket: drifting past scope to
  // serve the work is good if justified (raise a doubt, allow pending human
  // confirmation); drifting with no justification is real scope creep (flag it).
  // Enforcing a set-in-stone non-goal that only hurts us is the failure mode.
  assert.match(skill, /Distinguish a \*justified deviation\* from \*real scope creep\*/);
  assert.match(skill, /stated goal\/non-goal is a default, not a straightjacket/);
  assert.match(skill, /Justified deviation/);
  assert.match(skill, /raise it as a \*\*doubt/);
  assert.match(skill, /Real scope creep/);
  assert.match(skill, /Never blindly enforce a non-goal that only constrains us/);
});

test("mux-director runs a quick review before declaring a PR done", () => {
  // Sign-off: a quick review that the diff achieves the PR's goal. Not a bug hunt.
  assert.match(skill, /Final sanity check \(before declaring a PR done\)/);
  assert.match(skill, /does it actually achieve what the PR set out to do/);
  assert.match(skill, /Not a deep bug hunt/);
});

test("mux-director measures review convergence and detects loops, telling the orchestrator", () => {
  // Concise loop rule: convergence across cycles, not commit count.
  assert.match(skill, /Loop detection \(convergence, not commit count\)/);
  // 2nd-finding proactive sweep: demand exhaustive edge-case sweep up front.
  assert.match(skill, /[Aa]t the 2nd finding in one file family, demand an exhaustive edge-case sweep/);
  // Loop confirmed only when BOTH hold across 2+ cycles: 3+ commits in a family
  // AND funnel not narrowing (one-cycle bump is noise; narrowing funnel is a
  // converging deepening sweep, not a loop).
  assert.match(skill, /3\+ fix-commits in one subsystem AND the funnel is not narrowing/);
  assert.match(skill, /one-cycle bump is noise/);
  // Loop-breaker action: tell the orchestrator with evidence + split-vs-keep.
  assert.match(skill, /tell the orchestrator with evidence/);
  assert.match(skill, /split .* its own follow-up PR/);
});
