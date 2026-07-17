# Global Agent Notes

## Working principles (learned, apply across all projects)

Detail files in `~/.claude/memory/`:

- **Write for the next reader — code must be clear, DRY, SRP, and long-term maintainable.** Clear over clever, one source of truth, one job per function; if a reader must decode a line, rewrite it. Never trade long-term clarity for cleverness or brevity. Full rule + reasoning: `~/dev/projects/devx-coding-standards/general-conventions.md` #1 RULE.
- **Claude orchestrator + Codex genius** — Claude enforces scope/standards/sanity, Codex implements; steer one step at a time; consult/don't-prescribe; verify state before claiming "done."
- **Prove the user-visible outcome before implementing** — never assume an API/intermediate number equals what the user sees; screenshot/check the UI first.
- **When stuck or over-complex, rethink** — "outside the box" = a simpler overlooked solution, not an over-engineered one; favor the minimal fix.
- **Prefer the best / long-term design over the quick / short-term one — and ignore human-shaped effort estimates.** Don't pick a solution because it's faster to write when a better long-term design exists. This covers: structural fix over non-structural patch (rewrite page order into the PDF itself, not a `reorder` column read instead), root-cause over symptom, durable over expedient. Agents self-censor the best design by estimating it like a human ("big, risky, hours") — but an agent does in minutes what a human budgets in hours. Judge by correctness, structure, and longevity, not perceived implementation time. This is the inverse of "favor the minimal fix": don't over-engineer, but also don't *under*-engineer into a short-term design that leaves the root cause or a second source of truth in place.
- **One field does two jobs → split it** — an unsolvable send/don't-send debate means the field bundles two concerns; split into two fields, one per job.
- **Explain with diagrams + tables + code** — for non-trivial things: ASCII diagram + before/after table + concrete code snippet, not prose paragraphs.
- **Prefer tiny hierarchical diagrams** — the user learns best from very simple ASCII trees and decision flowcharts. Show them frequently, keep each diagram to one concept with only a few plainly labeled nodes, and avoid dense or elaborate diagrams.

## Use rtk to save tokens

## AGY CLI

Use the `agy-cli` skill when consulting an external CLI reviewer, designer, or second-opinion agent.

## GitHub

Use the `gh` CLI for GitHub operations instead of GitHub skills, GitHub MCP
tools, or connector-based GitHub tools.

## Remote and Risky Commands

Always ask for explicit user confirmation before any remote mutation or externally visible action. This includes `git push`, force-pushes, deleting remote branches, merging PRs, creating releases, deploys, cloud mutations, database writes, and destructive shell commands.

For database inspection, use `psql-ro` (from `~/dev/projects/scripts`, on PATH) for read-only SQL. It sets `default_transaction_read_only=on` in PostgreSQL. Use plain `psql` only when a write is intentional and the user has approved it.

## User Instructions

These are common instructions for agents across all repos.

### General Guidelines

* Never use the em dash "—". Use plain dash "-" instead.
* When writing commit messages, never auto-add your acronym.
* Never manually modify CHANGELOG.md files or any files managed automatically.
* When writing or substantially editing long Markdown files, preserve layout structure. Preserve normal Markdown structure, but avoid wrapping lines arbitrarily.
* When making technical decisions, do not give much weight to popular opinions. Instead, prefer quality, simplicity, robustness, scalability, and efficiency.
* When doing bug fixes, always start with reproducing the bug locally if possible. This makes sure you find the real problem so your fix is verified.
* When end-to-end testing a product, be picky about the user experience. If something clearly looks off, even if it is not explicitly mentioned in the task, fix it.
* Apply that same high standard to engineering excellence when writing any code. If you see a real issue nearby, even if it is not caused by what you did, fix it when it is safe and in scope.

### User Opinions

When working on something that would benefit from context on the user's viewpoints, read `~/dev/projects/devx-coding-standards`.

### Voice Profile

When talking or posting on behalf of the user using his identity, read `~/dev/projects/devx-coding-standards` first and match the user's preferences from that repository.

@/Users/tomerbd/.codex/RTK.md
