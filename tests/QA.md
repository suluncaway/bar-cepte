# Security patch QA inventory

- Initial desktop and 375px mobile: 441 bundled recipes load, no page errors or unexpected CSP violations, existing visual style and horizontal layout preserved.
- Support: both buttons open an accessible informational dialog; close button and Escape dismiss it; no unverified payment navigation.
- Static handlers: all tabs, alcohol/taste/subcategory filters, search, timer open/start/pause/reset/close.
- Dynamic handlers: recipe expansion, favorite toggle, portions, missing-ingredient shopping add/remove and purchased action.
- Recipe flow: create a valid custom recipe; view and delete it. HTML-looking names remain text.
- Backup: normal import persists after reload; cancellation preserves data; invalid ID/type/oversize import changes no data; corrupt local storage cannot prevent startup.
- Policy: inline script/handler probes are blocked; malicious URL/image schemas are rejected; release URL stays in expected repository.
- Cache: first load installs new worker; subsequent online and offline loads work; only this app's named caches are removed.
- Packaging: npm security tests and dependency audit; JS syntax checks; only explicit web assets in preview; no signing material in current repository tree.

Desktop installers and Android runtime require separate native build/device validation. Removing a leaked key from the latest tree does not revoke it or remove Git history.

## Completed checks, 2026-10-11

- Chromium: 441 recipes loaded; desktop 1365×900 and mobile 375×812 screenshots inspected. Mobile document width equals viewport width.
- Both support controls use the same handler; dialog open/close verified.
- Search “Mojito” returned 3 recipe cards. Favorite, shopping add/purchased, tab switches, all alcohol/taste/kitchen subcategory filters worked without page errors.
- A custom recipe named `<img src=x onerror=alert(99)> Test` displayed as literal text. Create/view/portion/timer/start/pause/reset/delete worked without executing the name.
- A malformed shopping backup was rejected. Valid backup survived reload; the ingredient `Bob's syrup` was treated as text and its purchased action worked.
- Eight Node security regression tests passed.
- New Service Worker controlled a reload and 441 recipes remained available with the browser offline. An injected inline script probe was blocked by CSP.
- Dependency audit: no critical/high findings; 8 moderate findings remain in optional desktop build dependencies. Production-only and optional-excluded audits return zero.

## Support profile follow-up, 2026-10-11

- Owner supplied `https://buymeacoffee.com/suluncau`; the public profile opens and describes Bar Cepte.
- Both header and footer buttons opened that exact profile in Chromium; the new page had `window.opener === null`.
- Nine Node security regression tests passed, including the shared support handler.
- Service Worker cache version advanced to `bar-cepte-v14-support`.
- No payment was submitted or tested.
- Supplied button styling was implemented as a static link with yellow background, black text/outline, white cup and Bree Serif. No third-party executable widget script was added.
- Desktop and 375px mobile footer screenshots inspected; no horizontal overflow. Footer click opened one profile tab with a null opener.
- Ten Node regression tests passed after the static-link change.
