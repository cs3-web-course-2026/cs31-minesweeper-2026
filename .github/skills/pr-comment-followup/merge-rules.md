# Verdict merge rules for pr-comment-followup

Each classifier sub-agent returns one of three verdicts per thread:

- `fixed` — the diff addresses the concern raised in the comment
- `not_fixed` — the concern is still present in the current diff
- `not_relevant` — the comment itself is not a valid improvement (incorrect advice, misunderstanding, etc.)

## Tie-breaking table

Apply the following rules to merge the two verdicts (Claude and Codex) into a single merged verdict. **Most conservative option wins.**

| Claude verdict | Codex verdict  | Merged verdict | Note                             |
| -------------- | -------------- | -------------- | -------------------------------- |
| `fixed`        | `fixed`        | `fixed`        | Both agree — fix confirmed       |
| `not_fixed`    | `not_fixed`    | `not_fixed`    | Both agree — still open          |
| `not_relevant` | `not_relevant` | `not_relevant` | Both agree — dismiss             |
| `fixed`        | `not_fixed`    | `not_fixed`    | Disagreement — conservative      |
| `not_fixed`    | `fixed`        | `not_fixed`    | Disagreement — conservative      |
| `fixed`        | `not_relevant` | `fixed`        | Disagreement — Claude defers     |
| `not_relevant` | `fixed`        | `fixed`        | Disagreement — Codex defers      |
| `not_fixed`    | `not_relevant` | `not_fixed`    | `not_fixed` beats `not_relevant` |
| `not_relevant` | `not_fixed`    | `not_fixed`    | `not_fixed` beats `not_relevant` |

## Priority order (highest to lowest)

1. `not_fixed` — always wins; a concern that might still be open must stay open
2. `not_relevant` — wins over `fixed`; only dismiss if neither model thinks it's fixed
3. `fixed` — only when both models independently agree

## Disagreement flag

Whenever the two sub-agents return different verdicts, append `_(disagreement)_` to the merged verdict in the final report. Do not change the merged verdict — only annotate it.
