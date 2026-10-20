# Session prompts

Paste these into new sessions at claude.ai/code, in order. Every session uses this repo and your cloud environment (see `setup/cloud-setup.sh`).

Defaults:
- Opus 5.5 at its default `medium` effort. Raise it with `/effort high` where a step says so.
- Permission mode **Auto** (or **Accept edits** if Auto isn't offered), except where a step says **Plan**.
- Start a new session for each step instead of continuing an old one.
- When a session finishes: open its diff at claude.ai/code, select **Create PR**, and merge.

---

## 1. Spec and plan (done)

This produced `SPEC.md` and `PLAN.md`. Merge that PR before step 2.

## Before step 2

- **frontend-design is on** in your skills settings on claude.ai. Cloud sessions load it from there, and the scaffold uses it to pick fonts.
- **GitHub Pages** (SPEC §8): get GitHub Pro through the Student Developer Pack, then set the repo's **Settings → Pages → Source** to **GitHub Actions**. Until then, the preview is shared as screenshots.
- **Ask her:**
  - Can her early drafts appear on a public URL as placeholders?
  - What name or handle goes in the credit?
  - Send her the handoff list in SPEC §5 for her final files (wanted by Oct 30).

## 2. Scaffold (PLAN step 1)

Pick **Plan** in the mode menu, type `/effort high`, then send:

```
Implement step 1 of PLAN.md (the scaffold), following CLAUDE.md and SPEC.md.
If it won't fit in one session, do 1A now (1.1–1.5 and 1.9–1.10) and tell me
when to start 1B.

Before you pick fonts, confirm the frontend-design skill is available, and
tell me if it isn't. Choose the two text fonts by CLAUDE.md's font rules:
compare two or three pairs next to her lettering in a throwaway screenshot,
pick one, and list the runners-up in the PR description.

Finish with npm run check, npm run build and npm run shots. Show me the
screenshots next to the drafts and list the differences. Then run the
design-reviewer subagent, fix its Must-fix findings, and commit and push.
```

Read the plan it proposes and approve it; then it builds. When it's done, send each of these as its own message:
1. `/code-review`, and let it fix what it finds.
2. `/run-skill-generator`. It records how to launch the site, so `/run` and `/verify` work in later sessions. The first time you run `/verify`, it saves its own recipe to the repo; after that, Claude runs it before each commit.

If it stopped after 1A, merge, then start a new **Plan** session at `/effort high`:

```
Implement step 1B of PLAN.md (1.6–1.8), following CLAUDE.md and SPEC.md.
Finish with npm run check, npm run build and npm run shots. Show me the
screenshots next to the drafts and list the differences. Then run the
design-reviewer subagent, fix its Must-fix findings, and commit and push.
```

Once step 1 is merged and Pages is set up, the site deploys on every merge to `main`. Opening it on your phone is the 24-hour preview.

## 3. Effects (PLAN steps 2–12)

One effect per session, two or three sessions at a time. Each works only inside its own folder, so parallel sessions don't collide. Run them in these batches (PLAN's schedule):

| Batch | Effects, in parallel | Notes |
|---|---|---|
| 1 | `line-boil` (step 2), `paper-grain` (3) | Both short. Merge them the same day if you can. |
| 2 | `xray` (4), `c3-window` (5), `halo-menu` (7) | Start halo-menu first; it's the longest step. |
| 3 | `sketch-in` (6), `palette` (8), `misregister` (9), then `panel-wipe` (10) | panel-wipe takes the first free slot. |
| 4 | `cables` (11), `crt-screens` (12) | First to cut if time runs short (SPEC §3). |

For each one, fill in the step number and name, then send:

```
Implement step <N> (<effect>) of PLAN.md, following CLAUDE.md and SPEC.md.
Work only inside src/effects/<effect>/, plus src/content/<effect>.json if the
step lists it. If you need a shared change, build it inside the folder and
describe it in the PR instead.

When it works, run npm run build && npm run shots, show me the screenshots
next to the drafts and list the differences. Then run the design-reviewer
subagent, fix every Must-fix finding, and commit and push.
```

Then send `/code-review` as its own message, create the PR and merge.

- Type `/effort high` before the prompt for `halo-menu` and `cables`, and for any shader or physics bug.
- Optional, while the cloud credit lasts: for the hardest sessions (halo-menu, cables, a bug that keeps coming back), type `/advisor fable` before your prompt. Opus keeps doing the work and consults Fable at decision points. Leave it off for routine effects, and type `/advisor off` once the credit is used up.
- After each merge, try the live site on your phone. Add `?off=<effect>` to the URL to compare with and without an effect (SPEC §3).

## 4. Launch (PLAN step 13)

If her final art is ready, first upload her files to `art-src/final/` on GitHub (**Add file → Upload files**). Then pick **Plan**, and send:

```
Implement step 13 of PLAN.md (launch), following CLAUDE.md and SPEC.md.

Real details: date <…>, location <…>, RSVP URL <…>, follow link <…>,
her credit line <…>, about blurb <…>.
Final art: <in art-src/final/ | not ready, keep the placeholders>.
Effects to turn off: <none | list>.

Run the full SPEC §9 check, then the design-reviewer subagent on the whole
site. Fix every Must-fix finding, re-run npm run shots, and show me the result.
```

Then send `/code-review` as its own message, and merge.

Two launch checks happen outside the cloud: Lighthouse on your own computer (section 5), and a test print of the QR code scanned with an iPhone and an Android camera.

## 5. Polish (local, in the Claude desktop app)

Pull the repo, open it in a **Local** session in the desktop app, and use its live preview. Tune timing, easing and the feel of the line boil by eye. This is the step you can't do well in the cloud, where WebGL runs without a GPU.

```
Start the dev server in the preview. I'll give you feedback on how things feel;
make one change at a time and keep the 60 fps budget from CLAUDE.md. Then run
Lighthouse on a mobile profile and check the budgets in SPEC §6.
```

## Optional: reference research pass (local)

Section 5 of `reference/INSPIRATION.md` describes a hands-on pass through the reference sites. The cloud network can't load them, so run it in a local desktop-app session with a browser.
