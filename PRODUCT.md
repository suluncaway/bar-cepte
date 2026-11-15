# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

(Also shipped as PWA, Electron desktop and an Android WebView wrapper around the same web UI; design language stays web.)

## Users

Primary: home bartenders — people making cocktails at home, usually on a phone, standing at the counter with whatever bottles they have. Job: "what can I make right now, and how?"
Secondary: bars and businesses using the business panel (business.html) for inventory, rules and reports.

## Product Purpose

Pick the ingredients you have, instantly see which cocktails you can make, then follow the recipe. Success: the user finds a drink they can actually make and finishes it.

## Positioning

An inventory-first bar engine in Turkish: recommendations are driven by what is in your own bar, with missing ingredients stated plainly and "buy this, unlock +X recipes" suggestions — not a generic recipe list.

## Operating Context

Phone in one hand at a kitchen counter, often in dim evening light; shake/stir timer and screen wake lock during preparation. Party mode with 1x/2x/4x/8x portions. Offline via service worker.

## Capabilities and Constraints

- 440+ cocktail database (cocktails.json, static tarif/ and rehber/ pages for SEO).
- Bar engine, filters (alcoholic/non-alcoholic, taste profiles), personal notebook (last 100 makes, likes, 300-char notes), favorites, custom recipes, shopping list, backup/transfer codes.
- AI Barmen chat assistant (server-side key, rate limited).
- Bar Cepte Reserve: paid ad-free tier with speakeasy selections and party mode.
- Stack: vanilla JS, Tailwind CSS, static HTML; Electron + Android wrappers. Redesign must preserve all JS behavior and DOM ids/hooks; visual layer only.
- Language: Turkish (i18n units exist).

## Brand Commitments

- Name "Bar Cepte" and the existing logo/favicon stay.
- Dark theme stays as the base.

## Evidence on Hand

Real recipe data and photos (cocktails.json, img/), brand assets in brand/. No testimonials, user counts or press — do not fabricate.

## Product Principles

1. Your bar first: everything starts from what the user already owns.
2. Honest about gaps: missing ingredients are always explicit.
3. Usable mid-pour: one-handed, glanceable, legible in low light.
4. Free core, Reserve as a calm upgrade, never a nag.

## Accessibility & Inclusion

Low-light, one-handed phone use: strong contrast, large touch targets, reduced-motion respected.
