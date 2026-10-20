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

## 3. Effects (PLAN steps 2–12), one session per batch

Each batch is one session in **Auto** mode that builds its effects one after another, then reviews, merges and records questions for you. Batches 3 and 4 can run in parallel.

| Batch | Replace `<LIST>` with | Type first, one per message |
|---|---|---|
| 1 (done) | `step 2 (line-boil), step 3 (paper-grain)` | (nothing) |
| 2 (done) | `step 4 (xray), step 5 (c3-window), step 7 (halo-menu)` | `/effort high`, then `/advisor fable` |
| 3 | `step 6 (sketch-in), step 8 (palette), step 9 (misregister), step 10 (panel-wipe)` | (nothing) |
| 4 | `step 11 (cables), step 12 (crt-screens)` | `/effort high`, then `/advisor fable` |

If her composition isn't settled (OWNER.md #9), run batch 4 as just `step 12 (crt-screens)` and do cables later. `/advisor fable` is optional, and only while the cloud credit lasts.

```
Implement these steps of PLAN.md, one at a time, in this order:
<LIST>
Follow CLAUDE.md and SPEC.md.

For each effect:
- Work only inside src/effects/<name>/, plus src/content/<name>.json if the
  step lists it. If you need a shared change, build it inside the folder and
  describe it in the PR instead.
- When it works, run npm run build && npm run shots, compare the screenshots
  with the drafts and list the differences.
- Run the design-reviewer subagent on that effect and fix every Must-fix
  finding.
- Commit it as its own commit before starting the next effect.

When all are done:
1. Run /code-review on the branch and fix what it finds.
2. Merge the latest main into the branch if it has moved, then re-run
   npm run check and npm run build.
3. Add any questions for me, and any shared changes you couldn't make, to
   OWNER.md.
4. Push, open a pull request into main, and merge it. If you can't create or
   merge the PR from here, tell me and I'll do it.
5. Show me the screenshots for each effect and summarize what each one does
   and anything you'd cut.
```

After each merge, try the live site on your phone. Add `?off=<effect>` to the URL to compare with and without an effect (SPEC §3).

## 3b. Shared changes (after the effect batches)

Effect sessions can't touch shared files, so they queue what they need in OWNER.md. Once batches 3 and 4 have merged, start one **Plan** session at `/effort high`:

```
Work through the "Shared changes queue" in OWNER.md, following CLAUDE.md,
SPEC.md and PLAN.md. Skip anything marked as my call and ask me about it
instead. Run npm run check, npm run build, npm run test:e2e and
npm run shots, then the design-reviewer subagent, and fix its Must-fix
findings. Move each finished item to "Decided" in OWNER.md. Run /code-review,
then open a pull request into main and merge it.
```

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
