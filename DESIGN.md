---
name: Bar Cepte — Matchbox & Coaster
mode: operate (app, business, recipe/guide pages); persuade (landing)
---

# Bar Cepte design system

Turkish matchbox-and-coaster print ephemera on deep ink. Flat two-colour print, round coaster discs, one hue per section. No glow, glass, gradients or gradient text.

## Colour (dark, default)

| Token | Value | Job |
|---|---|---|
| `--bg-main` | `#0e131d` | Deep blue-black ink ground |
| `--surface` / `--surface-raised` / `--surface-sunk` | `#161d2a` / `#1e2738` / `#0a0e16` | Boards, raised controls, inputs |
| `--ink` | `#f3ead8` | Cream print ink (text) |
| `--muted` / `--faint` | `#aeb4c2` / `#7d8496` | Secondary text / placeholders |
| `--keyline` / `--keyline-strong` | cream @ 26% / 40% | 2px card keylines, 1.5px control outlines |
| `--citrus` | `#f4c430` | **Action only**: primary buttons, selected filters. Ink text `#1b1503` |
| `--mint` | `#52c495` | Makeable / selected ingredient / "ready" counts. Ink `#06241a` |
| `--cherry` | `#e0505c` | Missing / gaps / favourites |
| `--night` | `#6f9be8` | AI Barmen, links on secondary |
| `--clay` | `#e8834e` | Shopping, sponsor, "today", striker |

Every hue fill carries dark ink, never white. Nav tabs take the hue of their section's job when active: ingredients/Barım/Mutfak mint, Favoriler cherry, Alışveriş clay, AI Barmen night, everything else citrus. On phones the bar is four fixed tabs plus "Daha fazla", which opens the secondary sections as full-width rows above the bar and wears the active secondary section's hue when it is collapsed.
Light theme (opt-in `html[data-theme=light]`): same print on cream board `#efe6d2`, darker hue variants.

## Type

- Display: **Big Shoulders Display** 800, uppercase for page/section/card titles, line-height ~0.95–1, tracking ≈ 0.
- Body/UI: **Onest** 400–700. Measures and counts use `tabular-nums`.
- Floor: no text below 12px. No kicker/eyebrow labels above headings (hidden via CSS).

## Shape & material

- Radii: 8px controls, 10px inner, 14px cards. Circles are reserved for coaster discs (hero photo, today's cocktail, step numbers, stamps, brand mark).
- Cards: flat `--surface` with 2px keyline; no nested bordered boxes (inner sections separated by a 2px top keyline).
- Depth: only soft offset shadow on hover/overlay (`0 10px 28px rgba(3,6,12,.45)`).

## Signature moves

1. **Coaster stamp** — makeable cocktail cards (`#recipes-ready`) carry a rotated mint disc with a check; missing cards a cherry dashed ring.
2. **Matchbox striker** — `#smart-recommendation-banner` has a 12px clay/brown striker band on its leading edge; "+X kokteyl" renders as a citrus matchstick tag with a cherry head.

3. **Timer coaster** — the shaker timer (`#timer-coaster`) is a coaster disc whose rim fills with mint as the countdown runs (`--p` 0→1); at zero a rotated mint "SERVİS ET / SERVE IT" stamp (`#timer-stamp`, role=status) lands on the rim. Start/Pause is flat citrus (`.timer-toggle-btn`, outlined while running).

## Motion

Exponential ease-out `cubic-bezier(.16,1,.3,1)`. Page-in 300ms fade/rise; stamp lands with a short rotate-scale. All disabled under `prefers-reduced-motion`.

## Files

`vivid.css` (app theme layer, loaded last), `style.css` (font import), `landing.css`, `business.css` (appended block), `scripts/build-recipe-pages.js` STYLE (static tarif/rehber/info pages — regenerate after changes).

## Icons

No emoji in the UI. Icons are 24×24 line drawings (2px stroke, round caps) in `icons.css`, used as `<i class="bci bci-NAME" aria-hidden="true"></i>` and drawn in `currentColor` via CSS mask. Plain-text contexts (toasts, alerts, `<option>`, textContent) carry no icon.

## App home (#editorial-hero)

The hero shows the user's own bar: `#home-bar` (rendered by `renderHomeBar` in game.js from the same results as the recipe lists, skipped while a search or favourites filter is active) holds a mint tabular count of ready drinks, up to four coasters (ready first, then one-missing as cherry rings) that open the recipe, a "see all" link to Tarifler, and a matchbox striker whose button is the existing `data-action="ingredient"`. Empty bar = a dashed note. Headline is one colour; no eyebrow, no hero note, no arrows in button text. Phones show the coasters 2×2. Styles live at the end of vivid.css.

## Tarifler & Malzemelerim

Tarifler is titled "Barınla neler yapabilirsin?" (Malzemelerim keeps "Senin barında ne var?"). Filter captions and the "Ortam" label are sentence case; "Rastgele" is a neutral outline (citrus stays for the primary action and selected filters). Card stamps sit on the photo's lower-right corner so they never cover "Detay"; taste tags are sentence case and data badges use Onest tabular figures, not mono. The smart-advice banner uses the same leading-edge matchbox striker as home. On Malzemelerim the bar tray and its chips are mint (owned), the desktop shelf is a wrapping grid with no arrow buttons, unselected tiles carry a neutral keyline, and the CTA reads "N hazır tarifi gör" (set by `renderHomeBar`), sticky above the tab bar on phones.

## Other panels & footer

Barım, Tarif ekle, Tariflerim, Alışveriş, Yedekleme and AI Barmen share one 920px column. Each panel's title is a Big Shoulders display heading in ink (uppercase, like Tarifler/Malzemelerim; Barım's inventory card uses sentence case to match its sibling panels), with no icon. No boxes inside boxes: shopping rows are keyline-separated, Barım's stat tiles are sunk fills with display figures, owned ingredients in Barım are mint outline chips. "Aldım" is a mint fill, "Sil"/"Hepsini sil" cherry. Barım's advice uses the matchbox striker. AI Barmen drops its kicker and has a single focus outline on the composer. The footer legal note is a quiet keyline box in sentence case with a cherry 18+ mark; footer links wrap on phones.

## Landing (landing.html / landing.css)

One loud thing: the hero is a live mini-bar. Bottle chips (`aria-pressed`, mint when owned) drive 11 real coasters from cocktails.json (ice, sugar, garnish ignored): makeable = mint disc + cream check stamp, missing = cherry dashed ring naming what's missing. A tabular mint numeral counts what's ready; a matchbox striker names the one bottle that unlocks the most and can add it. Everything below is quiet: 2px keyline rows, no cards, no eyebrows, no stats strip, no testimonials, no arrows in link text. Section headings are Big Shoulders in sentence case; only the hero headline is uppercase.
