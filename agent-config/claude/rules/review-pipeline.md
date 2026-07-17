# PR review pipeline (global)

**Do not write custom ChatGPT review prompts.** Use the shared pipeline — canonical lives in the RexIDE repo (`~/dev/projects/2025-rexide/scripts/review-pipeline/`, version-controlled). `~/dev/projects/scripts/review-pipeline/` holds body-pointers that forward there.

- **Pipeline (canonical):** `~/dev/projects/2025-rexide/scripts/review-pipeline/` (templates, send, poll, gates)
- **Skill:** `~/.agents/skills/staged-pr-review/SKILL.md`
- **DevX review skill:** `~/dev/projects/devx-coding-standards/.agents/skills/devx-review/SKILL.md`
- **DevX line-by-line clause** (always include in standards review prompts): `~/dev/projects/2025-rexide/scripts/review-pipeline/devx-standards-read-clause.txt`
- **Browser transport:** `~/.codex/skills/cmux-review-loop/SKILL.md`

```bash
export STAGED_PR_URL="..."
export STAGED_COMPARE_URL="..."
export STAGED_REPO="/path/to/repo"   # optional
PIPE=~/dev/projects/2025-rexide/scripts/review-pipeline
"$PIPE/staged-review-send.sh" <1|2|3>   # target auto-detected (see below)
"$PIPE/staged-review-poll.sh" REQUEST_ID=<id>   # poll auto-detects too
```

**Transport / target — auto-detected; the ChatGPT tab is resolved by URL, never by name.** The send/poll scripts pick the transport from the environment:
- **Inside RexIDE** (env `APP_NAME_*=RexIDE`) → `rex` — the ChatGPT review pane is a RexIDE pane (`rexide.sock`), **not** a cmux browser surface.
- **Standalone cmux** → `chatgpt`, resolved to the closest ChatGPT browser surface in the caller's workspace **by URL** (`https://chatgpt.com`). The tab does **not** need to be named anything specific — titles vary ("ChatGPT", "ChatGPT - Rex", custom names).

RexIDE embeds cmux as its terminal layer, so `CMUX_WORKSPACE_ID` is set inside RexIDE too — that marker is **not** enough to tell the two apart; use `APP_NAME_*=RexIDE`. Override explicitly with `rex | chatgpt | browser | surface:N`. Pass `surface:N` to pin a specific ChatGPT pane when several are open across workspaces.

**Reading the answer:** the REQUEST_ID is in the prompt, so poll/detect on the **last assistant turn** (`review_read_last_answer`), not whole-body REQUEST_ID matching.

**Hard rules:** push branch first; PR/compare URL only — never paste diff or bias templates. One stage per send; re-run same stage until clear. Stage 3 must include the devx standards read clause (auto-injected by send script). Stage 4 OCR stays per-repo (e.g. RexIDE `scripts/ocr-review.sh`).
