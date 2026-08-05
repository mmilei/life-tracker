# Life Tracker

A local-first habit and life tracking app. Daily habit grids with streaks, weekly
1-10 self-ratings across user-defined life areas, workout logging with progress
charts, a notes/leads board, and a configurable dashboard. Every category is
parametrized by the user: no hardcoded habits, areas or note types.

React 19 · TypeScript · Vite · Tailwind v4 · shadcn/ui. No backend, no account,
no telemetry. All state lives in the browser.

Optional backup: point the app at a private GitHub repo of your own (Home →
GitHub sync) and it mirrors the state to one JSON file there, pulling it back on
startup, which is enough to survive Safari evicting the storage of a site you
didn't visit for a week. It's a background effect, never a blocker: with no token, no
network, or an expired token, the app behaves exactly as it does without it, and
the failure is shown in that panel instead of being swallowed.
`npm run check-sync` covers the pure logic.

## Why this repo exists

The app is real and was built for an actual user, but it doubled as a **test bed
for an agent loop structure** in Claude Code: can a delegated pipeline take a
one-page sketch to a working product without a human writing the implementation?

It can, with guardrails. Those guardrails are the interesting part of this repo,
and they are the part that is genuinely mine. **The application code was written
by delegated agents.** The loop design, the guardrails and the gates are the work
on display here.

## The loop

Each work item is a block in a state file with four fields:

| Field | Meaning |
|---|---|
| `TRIGGER` | Precondition. If unmet, skip the item this pass |
| `DO` | The change, delegated to a fresh sub-agent |
| `VERIFY` | A technical check, run by *executing*, not by reading code |
| `STATUS` | Result, with real command output pasted in as evidence |

Each iteration re-reads the whole state file, takes the next eligible item, runs
it, verifies it, and commits. Work and verification are structurally separated:
the sub-agent that writes the code never runs its own `VERIFY`. That split is the
single most important rule here, and it comes straight from the observation that
an agent grading its own output will praise it, because the context that produced
the code is already full of the reasons it was written that way.

## Guardrails

| Guardrail | Rule |
|---|---|
| Loop protection | 2 consecutive failed verifications on one item → mark `BLOCKED`, move on |
| Abort condition | More than half the items `BLOCKED` → stop the whole run |
| Budget | Fixed iteration cap, agreed before the run starts |
| Cost ceiling | Never spend past the included quota. Pause and resume, never overspend |
| Verification scope | `VERIFY` is always technical, never aesthetic |
| Human gate | The final item is always a human review, with no automated pass condition |

## What the guardrails caught

The first run closed every item with a clean build and passing checks, and the
human gate rejected it anyway: the finish quality was poor.

Root cause was recoverable from the agent's own written record. It had
deliberately steered away from the supplied visual reference, justifying the
choice as "avoiding generic AI defaults", while the reference was exactly the
style being avoided. It had also shipped a mobile navigation pattern into what
the plan explicitly called a desktop app.

Two lessons, both now permanent rules:

1. **A green technical `VERIFY` says nothing about whether the result is good.**
   Automated checks cannot judge taste, so visual direction gets sealed *before*
   the run, never evaluated during it.
2. **Give agents evidence, not adjectives.** The rework passed reference frames
   directly to each sub-agent instead of describing the target in prose.

The second run re-themed and restructured the shell across all five tabs, and
passed.

## Background

[**When AI Builds Itself**](https://www.anthropic.com/institute/recursive-self-improvement)
(Anthropic Institute) reports that over 80% of Anthropic's merged code is now
written by Claude, and makes an Amdahl's Law point about what happens next: when
one stage speeds up, the bottleneck moves somewhere else. Theirs moved to human
code review.

This repo is a one-person instance of the same shift. Every line of the app was
written by an agent, and the bottleneck landed exactly where the article predicts:
the only thing that caught a bad result was a human looking at it. That is why the
human gate here is a permanent part of the design and not scaffolding to remove
later.

Also drawn on:

- Addy Osmani, *Loop Engineering* (June 2026): the framing behind this repo, stop
  prompting the agent and build the system that prompts it
- The generator/evaluator separation, and the observation that an agent grading
  its own output will praise it

## Running it

```bash
npm install
npm run dev
```

The UI ships in Spanish and English (switch at the foot of the sidebar). Copy lives
in a single hand-rolled dictionary, `src/lib/i18n.ts`; `npm run check-i18n` fails if
the two languages drift apart.
