# Session prompts

Copy these into new sessions at claude.ai/code, in order. Every session uses this repo and the cloud environment from `setup/cloud-setup.sh`.

Defaults: Opus 5.5 at its default `medium` effort, permission mode **Auto** (or **Accept edits** if Auto isn't offered). Raise to `/effort high` where noted. Start a new session for each step rather than continuing an old one.

---

## 1. Spec and plan

Type `/effort high` first, then send:

```
Read CLAUDE.md, reference/INSPIRATION.md and the drafts in reference/drafts/.

I want you to make most design and technical decisions yourself. Interview me
with the AskUserQuestion tool only about things you can't reasonably decide:
content, priorities, must-haves and hard constraints. At most 8 questions.

Then write:
- SPEC.md: what the site does, its sections, the effects in priority order,
  what's out of scope, and an end-to-end acceptance check.
- PLAN.md: step 1 is the scaffold, then one step per effect, each with the
  exact folder it owns (so parallel sessions don't collide) and how to verify it.

Commit both and push the branch.
```

Merge that branch, then start the next session.

## 2. Scaffold and design system

```
Implement step 1 of PLAN.md (the scaffold), following CLAUDE.md.

Use the ui-ux-pro-max skill to generate and persist the design system for
"C3 Showcase" (stack: Three.js with plain CSS). Then replace its colors with our
tokens from reference/INSPIRATION.md, keeping its type pairing, spacing and
checklist.

Set up npm run shots with Playwright. Finish with npm run build && npm run shots,
show me the screenshots, then commit and push.
```

When it's done, send `/run-skill-generator` as its own message. It records how to launch the site, so `/run` and `/verify` work reliably in later sessions. The first time you run `/verify`, it also saves its own recipe to the repo; after that, Claude runs it before each commit.

## 3. One effect per session (run 2–3 in parallel)

```
Implement "<effect name>" from PLAN.md, working only inside its folder.
Follow CLAUDE.md. When it works, run npm run build && npm run shots and compare
against the drafts. Then use the design-reviewer subagent and fix every Must-fix
finding. Commit and push the branch.
```

Review each diff at claude.ai/code, select **Create PR**, and merge. Use `/effort high` for shader or physics bugs.

Optional, while the cloud credit lasts: for the hardest sessions (the plan, halo navigation with cable physics, a bug that keeps coming back), type `/advisor fable` before your prompt. Opus keeps doing the work and consults Fable at decision points. Leave it off for routine effects, and type `/advisor off` once the credit is used up.

## 4. Final review

```
Run /code-review on main, then use the design-reviewer subagent on the whole
site. Fix Must-fix findings, re-run npm run shots, and show me the result.
```

## 5. Polish (local, in the Claude desktop app)

Pull the repo, open it in a **Local** session in the desktop app, and use its live preview. Tune timing, easing and the feel of the line boil by eye. This is the step you can't do well in the cloud, where WebGL runs without a GPU.

```
Start the dev server in the preview. I'll give you feedback on how things feel;
make one change at a time and keep the 60 fps budget from CLAUDE.md.
```

## Optional: reference research pass (local)

Section 5 of `reference/INSPIRATION.md` describes a hands-on pass through the reference sites. The cloud network can't load them, so run it in a local desktop-app session with a browser.
