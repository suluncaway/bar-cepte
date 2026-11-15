# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Shipped as a website/PWA (barcepte.com.tr) and wrapped for Windows/Linux (Electron) and Android (WebView). The wrappers reuse the web UI; there is no separate native design language.

## Users

Primary (confirmed): people who make cocktails at home. They stand in their kitchen or at a home bar, look at what bottles and fruit they have, and want to know what they can make tonight. Mostly on a phone, often in low light, sometimes with wet or busy hands while mixing.

Secondary surfaces exist (business.html inventory/reports for venues), but they are not the primary audience.

## Product Purpose

Pick the ingredients you have and instantly see which cocktails you can make, which are one ingredient away, and which single purchase unlocks the most new recipes. Success: the user finds a drink they can make with what they own, and makes it.

## Positioning

The mechanism is the user's own bar inventory: recommendations, "buy this, unlock +X recipes", missing-ingredient lists and the AI Barmen all reason from what is actually on the shelf, not from a generic recipe catalogue.

## Operating Context

- Ingredient selection → match list (ready / missing) → recipe detail with steps, serving multiplier (1x/2x/4x/8x), shake/stir timer and screen wake lock.
- Personal notebook: last 100 preparations, likes, notes up to 300 characters; manual or cloud backup and cross-device transfer by code.
- Works offline (service worker); Turkish first, English toggle.
- Static SEO pages: `tarif/` (recipes) and `rehber/` (guides).

## Capabilities and Constraints

- 440+ recipes (`cocktails.json`), alcoholic and non-alcoholic, taste filters (sweet, sour, strong, fresh).
- AI Barmen chat (server-side OpenAI key, rate limited 12 calls/hour/IP).
- Bar Cepte Reserve paid tier: ad-free, speakeasy selections, party mode (Shopier checkout).
- Stack: vanilla JS, HTML, Tailwind (prebuilt `tailwind.css`) plus layered CSS (`style.css` → `visual-refresh.css` → `vivid.css`); landing uses `landing.css`.
- 18+ content gate for alcohol.

## Brand Commitments

- Name "Bar Cepte" with the trailing orange period; shaker/glass brand mark.
- Voice: Turkish, warm, second person singular ("Bu akşam, barmen sensin.").
- Existing dark, amber/orange world is kept (user chose refinement, not redesign, 2026-11-15).

## Evidence on Hand

- Real recipe data and ingredient photos (`img/`, `cocktails.json`), editorial photo `editorial-cocktails.webp`, ambient video `hero-cocktail-ambient.mp4`.
- No testimonials, user counts or press exist; do not fabricate them.

## Product Principles

1. Start from the shelf: every screen answers "what can I make with what I have?"
2. Readable at the counter: legible in dim light, on a phone, at arm's length.
3. Honest gaps: missing ingredients are always stated, never hidden.
4. Works without a connection or an account.

## Accessibility & Inclusion

Target WCAG 2.2 AA contrast and touch targets; respect reduced motion. Turkish and English copy.
