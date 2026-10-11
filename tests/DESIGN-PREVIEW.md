# Editorial design preview

This branch is local only. Do not push or publish to GitHub Pages without the user's explicit approval.

## QA inventory

- Desktop 1440px and mobile 375px: initial editorial hero, legible typography, original Buy Me a Coffee widget, no horizontal overflow.
- Hero actions: “Barımı oluştur” scrolls to discovery and focuses ingredient search; recommendation opens a real recipe.
- Navigation: all eight sections remain available and the selected tab is visibly indicated. Hero and discovery controls hide for forms/dashboard.
- Empty bar: three real recipes appear as inspiration, not as recipes the user can already make. Alcohol/taste filters affect inspiration picks.
- Ingredient selection: selecting/deselecting updates count and recipe results; keyboard activation works.
- Search: Mojito results, card expansion, portions, favorite toggle, timer, shopping actions.
- Custom recipe: create/view/delete and preserve escaping of HTML-looking input.
- Persistence/security: existing regression tests pass; all original UI binding hooks exist exactly once; supplied widget snippet is unchanged.
- Confirm that remote main still points to dbbd644 and that no push has happened.

## Results

- 441 recipes loaded with no page errors or CSP violations.
- Desktop 1440×1000 and mobile 375×812 reviewed; no document horizontal overflow.
- Initial recommendations are Negroni, Margarita and Espresso Martini. Alcohol-free and taste filters change these suggestions correctly.
- Ingredient CTA focus, keyboard selection, Mojito search, expansion/portions, favorite and shopping actions passed.
- All navigation sections, custom recipe create/delete, timer and original Buy Me a Coffee widget passed.
- The exact user-provided embed snippet is preserved. All 46 original static event-binding hooks remain present exactly once.
