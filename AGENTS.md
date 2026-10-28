<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

<!-- fleet:rules:begin — generated from bitbaum/fleet templates/agent-rules.md; edit it there, not here -->

## Org rules

Read `bitbaum/fleet` `AGENTS.md`, `SHARED.md` and the registers it names before
inventing a host, a name, a page or a shared behaviour. Do not copy their facts
into this file.

- **Packages first.** If a `@bitbaum/*` package (or `bip-kit`, `limitkit`,
  `threadkit`, `ai-forms`) already does it, use it and fix a defect in the
  package, not in this app. Every chat is `@bitbaum/chatkit`, every search box
  `@bitbaum/searchkit`, every chart `@bitbaum/chartkit`, accounts
  `@bitbaum/accountkit`, model calls `@bitbaum/ai-kit`. Review this product's
  `package-plan.json` before building anything.
- **One shape per kind.** Things of the same kind look the same and sit in the
  same place (fleet `AGENTS.md`, "One shape per kind").
- **Finished work ships by itself.** Open a non-draft pull request; the fleet
  auto-merge sweep is the only merge path. Never merge by hand, through the
  merge API, with `--auto` or with an admin bypass, and never force-push a
  shared branch.
- **Nothing made up.** A fact on a page or in a doc needs a source that was
  opened; where there is none, the line is removed or softened.
- **Bitcoin orange is for Bitcoin and top-of-funnel actions only.**
- **No model identifier** in anything pushed to a repository.
- Before you finish, run `node <fleet>/scripts/ci/docs-truth-audit.mjs --dir .`:
  the same check the sweep runs on every pull request.

<!-- fleet:rules:end -->

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Design System

**Tailwind version:** v4. No `tailwind.config.*` file exists — Tailwind is loaded via `@import "tailwindcss"` in `app/globals.css`. There is no `@theme` block. All design tokens are `:root` CSS custom properties in `globals.css`. Do not create a `tailwind.config.*` file. Arbitrary Tailwind values or `style={{}}` must be avoided — use semantic CSS classes defined in `globals.css` instead.

**JS token file:** `lib/config/design-tokens.ts` exports `TOKENS` (a `const` object) with hex values mirroring `globals.css` — for use in JS rendering contexts that cannot read CSS vars (Recharts SVG attributes, Satori OG images). Values must stay in sync with `globals.css` manually — it is NOT auto-derived. Do NOT use `TOKENS` in JSX classNames.

### CSS Custom Properties (`app/globals.css` `:root`)

**Brand — deep forest teal:**
```
--teal:       #0D6E78    Brand (nav, links, focus rings, active states)
--teal-dark:  #0A5860    Brand hover
--teal-light: #E3F4F6    Brand backgrounds, hover fills
--teal-mid:   #B2DDE2    Eyebrow badge border, teal mid-tint
--teal-wash:  #f0fafb    Hero gradient endpoint
```

**Accent — warm terracotta (all primary CTAs):**
```
--accent:       #B8502A    Primary action buttons (WCAG AA 4.5:1 on white)
--accent-dark:  #9E4220    Accent hover
--accent-light: #FEF0E8    Accent backgrounds
```

**Text:**
```
--ink:   #1C1917    Primary text (warm charcoal)
--ink2:  #44403C    Secondary text
--muted: #78716C    Placeholder/helper text
--faint: #C4BBB3    Disabled/decorative
```

**Backgrounds:**
```
--off:    #FAF8F5    Page background (warm cream)
--light:  #F0EBE3    Light section backgrounds
--card:   #FFFFFF    Card background
--border: #E8E2D9    Default border
--border-hover: #d4cdc5    Hovered border
--off-bg: var(--off)        Legacy alias for --off
```

**State colors:**
```
--green:        #16A34A    Healthy signal, success text
--green-bg:     #DCFCE7    Success badge/alert background
--green-text:   #166534    Success text on --green-bg (WCAG AA)
--green-border: #bbf7d0    Success card borders
--warn:         #D97706    Watch signal, warning text
--warn-bg:      #FEF3C7    Warning badge/alert background
--warn-text:    #92400E    Warning text on --warn-bg (WCAG AA)
--warn-border:  #fde68a    Warning card borders
--danger:       #DC2626    Concern signal, error text
--danger-bg:    #FEE2E2    Error badge/alert background
--danger-text:  #991B1B    Error text on --danger-bg (WCAG AA)
--danger-dark:  #B91C1C    Danger hover
--danger-border:#fca5a5    Error card borders
```

**Role badge colors:**
```
--role-vet-bg:    #EFF6FF    --role-vet:    #1D4ED8
--role-sitter-bg: #FFFBEB    --role-sitter: #92400E
--role-admin-bg:  #F3E8FF    --role-admin:  #6B21A8
```

**Secondary palette (sitter / feminine brand):**
```
--secondary:      #EC4899
--secondary-dark: #BE185D
--secondary-bg:   #FDF2F8
```

**Info palette:**
```
--info:    #2563EB
--info-bg: #EFF6FF
```

**Digital twin identity:**
```
--twin:    #7C3AED
--twin-bg: #EDE9FE
```

**Warm bg/text (decorative icon backgrounds):**
```
--warm-bg:   #FFFBEB
--warm-text: #B45309
```

**Star rating:**
```
--star: #FBBF24
```

**Shadows:**
```
--shadow-sm:        0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)
--shadow-md:        0 4px 16px 0 rgb(0 0 0 / 0.07), 0 2px 6px -2px rgb(0 0 0 / 0.05)
--shadow-lg:        0 12px 40px 0 rgb(0 0 0 / 0.10), 0 4px 12px -4px rgb(0 0 0 / 0.06)
--brand-shadow:     0 4px 12px rgb(13 110 120 / 0.25)
--secondary-shadow: 0 4px 12px rgb(236 72 153 / 0.25)
--cta-shadow:       0 4px 20px rgb(0 0 0 / 0.15)
--tooltip-shadow:   0 2px 8px rgb(0 0 0 / 0.08)
```

**Obsidian luxury layer (marketing surface only — homepage + `(marketing)` pages, nav, footer):**
```
--obsidian:      #08080A    Marketing page ground (near-black, warm bias)
--obsidian-deep: #050506    Deepest band (final CTA, footer)
--carbon:        #0F0F13    Raised section surface
--onyx:          #131318    Card surface on dark (.lux-card)
--hairline:      #26262C    Borders on dark
--hairline-soft: #1B1B20    Subtle dividers on dark
--platinum:      #ECE9E2    Primary text on dark
--platinum-dim:  #B6B3AC    Secondary text on dark
--mist-dark:     #86847E    Muted text on dark
--champagne:        #C9B586    Accent — champagne gold (CTAs, eyebrows, emphasis)
--champagne-bright: #E3D2A9    Accent hover
--champagne-dim:    #8F7F5B    Subdued accent, borders
--danger-soft:   #F0A8A8    Danger-tinted text legible on dark
```
Classes: `.lux-hero` (aurora + grid ground), `.lux-section` / `.lux-section-raised` / `.lux-section-deep`,
`.lux-card` + `.lux-card-hover`, `.lux-chip`, `.display-title` / `.ed-title` / `.ed-title-sm` (Jost 200,
`em` renders champagne), `.ed-eyebrow` (IBM Plex Mono, tracked uppercase champagne), `.btn-editorial`
(champagne pill), `.btn-editorial-ghost(-sm)`, `.btn-editorial-light`, `.btn-editorial-sm`, `.ed-num`,
`.ed-icon`, `.lux-rise` (hero entrance, reduced-motion-safe). The portal/admin product UI stays on the
light teal/terracotta palette — never mix the two surfaces.

### Semantic CSS Classes (defined in `globals.css` — use these, not arbitrary Tailwind values)

**Layout:**
- `.section-inner` — max-width 1100px, centered, 24px side padding

**Cards:**
- `.card` — white card, `--border` border, 16px radius, `--shadow-sm`
- `.card-hover` — hover: `--shadow-md` + `--border-hover`

**Buttons:**
- `.btn-primary` — terracotta fill (`--accent`), white text, 10px radius
- `.btn-outline` — transparent, `--ink2` text, `--border` border, hover: teal tint
- `.btn-ghost` — transparent, `--muted` text, hover: `--light` bg
- `.btn-on-teal` — white fill on teal backgrounds, `--teal` text
- `.btn-on-teal-ghost` — white/10 fill on teal backgrounds, white text

**Forms:**
- `.form-input` — full-width input, 10px radius, teal focus ring (`--teal-light`)

**Signal badges:**
- `.signal-healthy` — `--green-bg` / `--green-text` pill
- `.signal-watch` — `--warn-bg` / `--warn-text` pill
- `.signal-concern` — `--danger-bg` / `--danger-text` pill

**Alerts:**
- `.alert-error` — `--danger-bg` / `--danger-text`
- `.alert-success` — `--green-bg` / `--green-text`

**Navigation:**
- `.nav-link` — base nav link (flex, 12px radius)
- `.nav-link-active` — `--teal-light` bg, `--teal` text
- `.nav-link-inactive` — `--ink2`, hover: `--light` bg + `--ink` text
- `.nav-link-muted` — `--muted`, hover: `--light` bg
- `.nav-link-danger` — `--muted`, hover: `--danger-bg` + `--danger-text`
- `.mobile-tab-item` / `.mobile-tab-item-active` / `.mobile-tab-item-inactive`

**Other:**
- `.eyebrow-badge` — teal pill for hero eyebrow labels
- `.prose-legal` — styled legal/terms/privacy long-form content

### Navigation Pattern

- Desktop: fixed 240px left sidebar (`components/portal/SidebarNav.tsx` — client component)
- Mobile: fixed top bar (h-14) + fixed bottom tab bar
- Portal layout offsets: `lg:ps-60 pt-14 lg:pt-0 pb-20 lg:pb-0`

### Typography

Declared once in `lib/fonts.ts` via `next/font/local`, from `.woff2` files vendored
in `lib/font-files/` (latin subset only — non-latin locales use system fallbacks, as
before). They are **not** fetched from Google at build time: that made every CI run
and deploy depend on `fonts.gstatic.com` being reachable, which failed twice in one
week and blocked a merge each time.

To add or refresh a weight: edit `scripts/fetch-fonts.mjs`, run `node scripts/fetch-fonts.mjs`,
commit the `.woff2`. Never wire it into the build — that reintroduces the network dependency.

- `--font-sans`: Plus Jakarta Sans, variable 400–800 — body everywhere.
- `--font-display`: Jost, variable 200–400 — marketing headlines (`.display-title`, `.ed-title*`).
- `--font-mono`: IBM Plex Mono 400/500 (static) — marketing eyebrows and instrument-style labels.

### RTL Support

Arabic only. `app/[locale]/layout.tsx` injects `dir="rtl"`. Use logical Tailwind props: `ms-*`, `me-*`, `ps-*`, `pe-*`. NEVER `ml-*`, `mr-*`, `pl-*`, `pr-*`. Use `.flip-rtl` for icons needing mirror.

### Utility overrides on semantic classes DO NOT WORK

The semantic classes in `globals.css` are **unlayered** CSS; Tailwind v4 puts
utilities in `@layer utilities`, and unlayered CSS beats every layer. So a
utility next to a semantic class (`form-input ps-9`, `btn-primary py-2`) is
**silently dead** whenever both set the same property. Wrapping the semantic
rules in `@layer components` does NOT help — the v4/Turbopack pipeline strips
author `@layer` blocks. When a variant of a semantic class is needed, add a
semantic modifier class in `globals.css` (e.g. `.form-input-icon` reserves
space for a leading icon) instead of a utility override.

### SSOT Rule

All design tokens live in `app/globals.css` only. There is no `tailwind.config.*` (Tailwind v4); if one ever existed it MUST reference CSS vars (`'var(--name)'`), never literal values. Components MUST use semantic CSS classes from `globals.css` or standard Tailwind utilities, never arbitrary values like `bg-[#hex]`.

**Violations to fix when touching UI:**
- `bg-[#hex]` / `text-[#hex]` in className → CSS var + semantic class
- `style={{ color: '#hex' }}` → CSS var + className
- Literal hex in a tailwind config → `'var(--color-name)'`
- Same token defined in 2+ files → consolidate to globals.css
- Hex values in `lib/config/design-tokens.ts` diverging from `globals.css` → sync them

**Audit:** `grep -r '\[#' src/` — every result is a violation.
