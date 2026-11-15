# Design

Records the incumbent Bar Cepte visual system (documented 2026-11-15). Source of truth is the CSS cascade below; this file describes it.

## World

Dark home-bar night. Near-black surfaces, warm off-white ink, one hot amber/orange accent used for action and selection. Feels like a dim bar lit by a single warm lamp. Light theme exists (`html[data-theme="light"]`) as a secondary mode.

## Cascade

App (`index.html`): `tailwind.css` (prebuilt utilities) → `style.css` (base components) → `visual-refresh.css` → `vivid.css` (current skin, wins). Put new skin rules at the end of `vivid.css`.
Landing (`landing.html`) and static pages: `landing.css` only.

## Color tokens (`vivid.css :root`, `landing.css :root`)

| Token | Value | Use |
|---|---|---|
| bg | `#050505` | page |
| surface / raised | `#101010` / `#161616` | cards, sheets |
| ink | `#f7f4f0` (landing `#f2f2f2`) | body text |
| muted | `#a8a29a` (landing `#9a9a9a`) | secondary text |
| accent | `#ff7a1a` | links, eyebrow lines, focus |
| accent-soft | `#ff9d4d` | text accent on dark, focus ring |
| `--grad-hot` | `#ff9a2e → #ff6a00` 135° | primary buttons, selected chips, active nav |
| `--on-hot` | `#1a0f05` | **text on any orange gradient** (white fails AA there) |
| light-theme accent text | `#a8460a` | accent text on light surfaces |

## Type

- Display: `--font-display` (headings, weight 800, tracking -0.03em).
- Body: `--font-body` / DM Sans on landing.
- Floor: functional text ≥ 11px; Tailwind `text-[9px|10px|11px]` are remapped to `--text-xs` (0.75rem) in `style.css`.

## Shape and depth

- Pills (`border-radius: 999px`) for actions and chips; ~16–24px radius for cards.
- Shadows carry offset + blur, tinted orange on primary actions (`0 8px 22px rgba(255,106,0,.3–.4)`). No zero-offset halos.
- Focus: 2px `#ff9d4d` outline, 2–3px offset.

## Components

Top bar (brand mark + "Bar Cepte." + pill buttons), bottom main navigation (pills, active = `--grad-hot`), ingredient chips (`aria-pressed`), cocktail cards with photo, recipe sheet with servings multiplier and mix timer, AI Barmen dialog, Reserve upsell, onboarding tutorial dialog.

## Known debt

- Eyebrow labels above headings are a house pattern; kept for now but should not spread to new surfaces.
- Gradient text on the hero span (`.hero-copy h2 span`) remains by brand choice.
- Three stacked skin files override each other; consolidating them is a separate refactor.
