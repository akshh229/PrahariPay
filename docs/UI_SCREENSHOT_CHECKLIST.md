# UI Screenshot Consistency Checklist

Use this checklist before approving any new dashboard/mobile screen.

## 1) Theme Tokens Only
- Use semantic theme variables/tokens only.
- Avoid hard-coded dark/neon colors (`#0f...`, `#111...`, slate-dark backgrounds).
- Primary accent stays warm (`--color-primary`) with muted neutral surfaces.

## 2) Surface Hierarchy
- App background: `--color-bg-app`.
- Primary cards: `--color-bg-card` + `--color-border-subtle`.
- Input/secondary surfaces: `--color-bg-muted`.
- Status chips use semantic success/warning/danger colors, not arbitrary new shades.

## 3) Spacing Rhythm (Mobile)
- Standard page padding: horizontal `20`, top `52`, bottom `32` for tab screens.
- Auth cards keep consistent section cadence:
  - heading/meta block
  - fields
  - primary action
  - secondary link
- Avoid large one-off gaps unless required by camera/overlay UI.

## 4) Spacing Rhythm (Dashboard)
- Content containers should be centered on wide layouts (e.g. `max-w-[1400px] w-full mx-auto`) where applicable.
- Header blocks use subtle bottom border and compact subtitle spacing.
- Form rows should keep consistent `mb-4`/`gap-3` cadence.

## 5) Typography
- Titles: strong, warm-neutral text color.
- Subtitles/helper text: secondary token color.
- Muted metadata: muted token color.
- Keep visual hierarchy clear; avoid mixing too many text weights in one card.

## 6) Controls
- Primary CTA: warm filled style (`pp-btn-primary` / token equivalent).
- Secondary actions: muted surface + subtle border.
- Toggles/switches: primary color when enabled, neutral muted when disabled.

## 7) Empty / Preview States
- Empty-state icons and helper lines use muted/secondary tokens.
- Preview/ready indicators can use success tones but should remain subtle.
- JSON/debug blocks should use muted surfaces, not dark console-like backgrounds.

## 8) Final QA Pass
- No remaining dark-slate utility classes on warm-themed screens.
- No hard-coded text white on light backgrounds.
- No contrast regressions on labels, placeholders, helper text.
- Run lint/diagnostics after visual edits.
