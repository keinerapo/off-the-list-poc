# Quick Demo

Run `npm start` from `POC` and open **http://localhost:4173/#entry**. The direct `/demo.html` page also remains available.

The full form starts at `/#quiz` and retains its internal decision, review and result routes. The root without a hash opens `/#entry`. The entry loader selects the demo or full-form stylesheet and controller, reloading only when switching between applications to isolate their DOM and listeners. The demo neither loads the original controller nor reads or writes the original form's local storage.

## Questions

There are five sections with two questions each. Review is replaced by a ten-second animated preparation screen and then a single editorial journey presentation, not an additional question section.

| Section | Questions |
| --- | --- |
| Interests | Preferred name; up to three interests |
| Travel style | Autonomy; comfort beyond familiar places |
| This trip | One main motivation; pace |
| Practical details | Full trip duration in days; EUR budget per person |
| Your needs | Practical needs or limits (write `None` if none); desired physical intensity |

There are no unknown options, optional follow-ups, supporting questions, entry-mode screen or separate review step. Budget scope, currency and coverage are stated alongside the amount rather than asked separately. Answers remain in memory for the current page session only.

The preparation screen uses the cream/coral editorial styling, asymmetric shapes and gentle motion of the `offthelist` brand site. Four stages change the message, pillar, photograph and timeline every 2.5 seconds, then reveal a journey at approximately ten seconds. This is a local presentation sequence, not remote destination research or a booking. Back to answers cancels the sequence without losing inputs. Reduced-motion settings remove animation while retaining changing messages and the same duration.

## Journey Data

`demo-journeys.js` exports exactly three prepared journeys, matching the updated Markdown documents in `../sample-journeys/`: underground kayaking in Mežica, Slovenia; whale watching and geothermal cooking in São Miguel, Azores; and overnight self-drive husky sledding in Swedish Lapland. Every attempt independently selects one with equal probability; repetition is possible. The ten demo answers do not filter, rewrite or verify the selected example. The result explicitly separates the sample context from visitor answers, including duration, group size, needs and budget scope.

`demo-journey-view.js` renders one experience-led hero, four pillar experiences, traveller portrait, practical travel shape, full budget coverage, trade-offs, verification tasks, change conditions and official source links. Costs remain declared caps, not invented quoted prices. The three Markdown documents use a consistent English structure and include researched activities and source consultation dates.

The presentation follows the sibling site's `sample-journeys.html`: Lora editorial headings, a large rounded photograph, cream background, coral accents and a compact experience summary. Destination names remain secondary to the activity-led headline. Local photographs and Lora fonts have attribution and license files under `assets/journeys/` and `assets/font/`; no image or font CDN is needed.

The final screen no longer shows, copies or downloads the technical prompt. Visitors can download the displayed journey as text, edit their answers, or start another random journey through the same transition. The earlier five prompt templates and builder remain available as pure utilities in `demo-prompts.js`, but are not used to select or generate the visible destination. The complete form and its prompt output are unchanged.

## Verification

```sh
node --test demo-journeys.test.js demo.test.js model.test.js canvas.test.js capture.test.js
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node demo-browser.test.js
```

The browser test checks desktop/mobile layout, logo/tab alignment, two questions per section, validation, random selection, exports, answer editing and isolation from the existing form's storage. It requires an installed Playwright Chromium browser and temporarily serves the app on port 4187.
