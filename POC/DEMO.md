# Quick Demo

Run `npm start` from `POC` and open **http://localhost:4173/#entry**. The direct `/demo.html` page also remains available.

The full form starts at `/#quiz` and retains its internal decision, review and result routes. The root without a hash opens `/#entry`. The entry loader selects the demo or full-form stylesheet and controller, reloading only when switching between applications to isolate their DOM and listeners. The demo neither loads the original controller nor reads or writes the original form's local storage.

## Questions

There are five sections with two questions each. Review is replaced by immediate prompt output, not an additional question section.

| Section | Questions |
| --- | --- |
| Interests | Preferred name; up to three interests |
| Travel style | Autonomy; comfort beyond familiar places |
| This trip | One main motivation; pace |
| Practical details | Full trip duration in days; EUR budget per person |
| Your needs | Practical needs or limits (write `None` if none); desired physical intensity |

There are no unknown options, optional follow-ups, supporting questions, entry-mode screen or separate review step. Budget scope, currency and coverage are stated alongside the amount rather than asked separately. Answers remain in memory for the current page session only.

## Prompt Data

`demo-prompts.js` exports `demoPrompts`, an array of five prompt templates using the current complete prompt instructions. Fictional scenarios cover a solo traveller, a family with a young child, an anniversary couple with an essential dietary requirement, a group of friends, and a couple requiring accessible travel.

Every unasked active full-form decision is answered in those scenarios. Only fields covered by the ten demo questions are placeholders. Single motivations need no separate priority; interests are explicitly given equal importance. Dates use month windows so any offered demo duration fits without stale fixed dates. Each scenario uses the demo's explicit EUR per-person all-costs budget contract.

On generation, the controller randomly selects one template, parses its structured data, inserts the visitor's answers and uses the existing pure prompt builder and validation without changing either. User text is assigned as data, never interpolated into a template string. The result contains a complete validated snapshot, not stale summaries or unresolved template markers.

Fictional essential restrictions are never erased by `None` in the additional-needs question. Free-text demo needs remain requirements to verify; the demo does not infer diagnoses or claim that the six full-form safety screens were answered by the visitor. The result screen identifies unasked data as fictional, but the exported prompt contains no demonstration disclaimer or scenario-selection header. It does not fabricate full-profile confirmation, medical clearance or booking consent. External verification points from the original instructions remain intact.

## Verification

```sh
node --test demo.test.js model.test.js canvas.test.js capture.test.js
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node demo-browser.test.js
```

The browser test checks desktop/mobile layout, logo/tab alignment, two questions per section, validation, random selection, exports, answer editing and isolation from the existing form's storage. It requires an installed Playwright Chromium browser and temporarily serves the app on port 4187.
