# SilentForge

Multi-page development website for custom mini drone concepts.

Build: `python3 scripts/build.py`. Preview: `python3 -m http.server 4173 --directory dist`.
Verify: `python3 scripts/check.py`, `node --check assets/site.js`, `node --check assets/builder.js`.

Source pages live in `scripts/build.py`; styling and browser behavior live in `assets/`. Build output is ignored `dist/`. The original Grok configurator is retained in `original/configurator.html`. Three.js r128 is vendored from cdnjs with its license header retained.

Includes Home, Configurator, Process, Technology, About, Contact/Support, FAQ, Safety, Ordering/Shipping/Returns, Privacy and Terms, plus 404, sitemap and metadata.

The builder preserves prototype options and illustrative calculations. Selections and notes save locally, download as a text brief, and pass to an email draft. The visitor sends the email in their mail app. No automatic emails, payments, inventory or orders exist.

Before selling, establish a verified bill of materials, compatibility and performance testing, fulfillment and commercial policies, and an actual ordering flow. Estimates are not flight specifications or current supplier quotes.

Hosting uses OpenAI Sites and the exact ID in `.openai/hosting.json`, with static directory `dist`. The new Site is owner-private. Build, synchronize via the Sites source helper, package the resulting commit, then deploy through native Sites tools. GitHub pushes alone do not deploy.
