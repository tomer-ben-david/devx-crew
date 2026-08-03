# PR review pipeline (global)

Use the public DevX Mux skills instead of maintaining provider-specific review
scripts or custom prompts:

- `$mux-staged-review` for sequential commit, branch, standards, and final gates
- `$mux-multireview` for independent read-only Codex and Grok reviews
- `$mux-chatgpt-review` for an exact-head ChatGPT browser review loop
- `$mux-orchestrate` for implementation plus independent review coordination

Before a review, establish the repository, base, branch or PR, and exact head.
Pass the PR or compare URL when the selected skill requests it, and keep the
review scope read-only. Use the transport and polling commands documented by
the selected skill; do not infer completion from a partial provider response.
