# SilentForge

Multi-page development website for custom mini drone concepts.

Build: `python3 scripts/build.py`. Preview: `python3 -m http.server 4173 --directory dist`.
Verify: `python3 scripts/check.py`, `node --test scripts/model.test.cjs scripts/site.test.cjs`, `node --check assets/site.js`, `node --check assets/builder.js`.

Source pages live in `scripts/build.py`; styling and browser behavior live in `assets/`. Build output is ignored `dist/`. The original Grok configurator is retained in `original/configurator.html`. Three.js r128 is vendored from cdnjs with its license header retained.

Includes Home, Configurator, Build Review, Process, Technology, About, Contact/Support, FAQ, Safety, Ordering/Shipping/Returns, Privacy and Terms, plus 404, sitemap and metadata.

The builder uses `assets/catalog.json` for explicit component mass/price allowances. `assets/model.js` provides the same calculations to the builder, review, downloads and contact. It includes motor sets, controller/ESC, receiver, wiring/mounts, optional ground equipment and host/power/cooling allowances for accelerators. Rules flag voltage, diameter, payload-envelope and radio conflicts. Ground equipment is excluded from flying mass. Cost arithmetic uses integer cents with a separately itemized 30% planning margin.

Battery energy uses nominal cell voltage times capacity. Hover time is unavailable without user-entered whole-aircraft hover watts. Optional matching test data enables thrust-to-weight and nominal continuous battery-current comparisons. Inputs are bounded; changing onboard parts clears old performance data. These are arithmetic and planning checks, not tested performance or a full bill of materials for procurement.

Selections, notes and optional measurements save locally. Customers review their build, download a brief and prepare an inquiry. Long inquiries download in full and use a short mail-app link to avoid link-length limits; the customer must attach the file and send the email. No automatic emails, payments, inventory or orders exist. Browser storage is required for the review handoff; download and general contact remain available without it.

Before selling, establish a verified bill of materials, compatibility and performance testing, fulfillment and commercial policies, and an actual ordering flow. Estimates are not flight specifications or current supplier quotes.

Hosting uses OpenAI Sites and the exact ID in `.openai/hosting.json`, with static directory `dist`. The new Site is owner-private. Build, synchronize via the Sites source helper, package the resulting commit, then deploy through native Sites tools. GitHub pushes alone do not deploy.
