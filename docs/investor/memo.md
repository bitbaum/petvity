# Petvity — Investor Memo

*August 2026. This memo is the source of truth for the investor presentation.
Every claim in it is verifiable against the live product or a cited source —
nothing here is aspirational dressed up as fact. Where something is a plan, it
says so.*

---

## One paragraph

Petvity is a live, multilingual pet-care platform: a daily health check-in
builds a **Digital Twin** of each pet, and everything an owner then needs —
vets, sitters and groomers, a marketplace, and a humane adoption network —
sits next to it in one product. The health record is the wedge; the services
around it are the business. The product is complete and deployed at
[petvity.orangecat.ch](https://petvity.orangecat.ch), pre-revenue and
pre-marketing.

---

## The problem

1. **Pet health is invisible until it is an emergency.** Most animals —
   especially prey species like rabbits and birds — actively mask illness. A
   rabbit that stops eating can be beyond help in 48 hours. Owners have no
   structured way to notice the drift before the cliff.
2. **The record does not exist.** Vaccination cards live in drawers, weights
   in memory, medication schedules nowhere. When an owner changes vet, city,
   or country, the pet's history does not come along.
3. **Care is fragmented.** Finding a vet, booking a sitter, buying the right
   supplement, and rehoming an animal are four different products with four
   different accounts — none of which knows anything about the pet.

## The product (all of this is live today)

- **Species-aware daily check-ins.** Not one generic form: each of nine
  species (dog, cat, horse, bird, rabbit, guinea pig, hamster, reptile, fish)
  has its own observation set derived from veterinary triage logic — appetite
  and droppings for rabbits, water quality for fish, enclosure temperature for
  reptiles. The reasoning is documented in
  [`docs/pet-health-science.md`](./../pet-health-science.md).
- **The Digital Twin (stage 1).** Check-ins roll up into a living portrait:
  four emotional states (Thriving → Struggling) plus a trend, so decline is
  visible *before* it becomes a vet visit.
- **Records, vaccinations, medications** with reminders — the portable health
  file the industry never built.
- **Pro directory and booking** for vets, sitters, and groomers, with
  professional profiles owners can book directly.
- **Marketplace** with a full commerce stack: products, cart, checkout,
  orders, seller profiles. (Catalog is being seeded — see honesty section.)
- **Humane adoption network**: listings, applications, and workflow — free by
  design, because charging for rehoming creates the wrong incentives.
- **Progressive disclosure UX.** One-minute daily habit at the surface; depth
  (records, medications, twin history) revealed as the owner engages.
- **9 languages** (EN, DE, FR, ES, TR, JA, KO, ZH, AR) — localized routes,
  hreflang, RTL support. Global from day one.
- **No-friction top of funnel**: a public one-click demo (no account, no
  credit card) and public pet profiles.

**Live proof instead of testimonials.** The homepage links to Milo and Rosie —
two real resident pets whose daily check-ins are public. Anyone can open a
profile and watch a real health history grow. The site contains no invented
reviews, star ratings, or user counts, as policy.

## Why the Digital Twin is the moat

A longitudinal, structured, per-pet health dataset does not exist anywhere
else at consumer scale — vets keep episodic clinical notes, trackers log
walks. Each day of check-ins deepens a record that is costly for a competitor
to replicate and painful for an owner to abandon. The twin roadmap
([`docs/digital-twin-and-legacy.md`](./../digital-twin-and-legacy.md)) is
deliberately staged:

1. **Mirror** (shipped) — structured state + trend from real data.
2. **Narrator** — an LLM that explains the data in plain language
   ("her energy has dipped every day since the food change").
3. **Likeness** — photo/video/voice models of the individual animal.
4. **Persona** — an interactive companion, built only with explicit consent
   and hard ethical guardrails; the memo's source doc includes an explicit
   "would not build" list.

Stages 3–4 open the **memorial** category: pets who die can remain present —
a one-time, high-intent, high-margin purchase with no subscription fatigue.

## Business model

| Stream | Status | Mechanics |
|---|---|---|
| Owner tier | Live | Free forever — the dataset and the funnel |
| Pro tier | Designed, "coming soon" on the live pricing page | Subscription for breeders, show animals, pet businesses |
| Clinic tier | Designed, "coming soon" | White-label for veterinary clinics: client pets + automated care reminders |
| Marketplace | Stack live, catalog seeding | Take rate on third-party sellers; first-party margin on curated products |
| Pro bookings | Live surface | Take rate on booked services (activation pending supply) |
| Memorial / legacy | Roadmap (twin stages 3–4) | One-time purchases at the highest-intent moment in pet ownership |
| Adoption | Live | Deliberately free — trust and top-of-funnel, not a profit center |

The free tier is not charity: every check-in is the asset. Monetization
attaches to the segments with willingness to pay (professionals, clinics,
commerce, memorial) rather than taxing the daily habit.

## Market

Independent estimates put global **pet care** at roughly **USD 180–270B in
2025**, growing 6–7% annually (Fortune Business Insights, SkyQuest, Grand View
Research). The **pet tech** segment specifically is estimated at **USD 9–18B
in 2025 with 12–15% CAGR** (Mordor Intelligence, Grand View Research, Fortune
Business Insights). Two structural tailwinds:

- **Humanization**: pets are family; spending per animal keeps rising through
  economic cycles.
- **AI timing**: stages 2–4 of the twin were science fiction three years ago;
  they are now an engineering schedule.

Competitors are single-function: reminder apps, GPS trackers, telehealth,
clinic CRMs. None owns the daily structured health record, and none combines
record + services + commerce + adoption in one product. The risk is not an
incumbent doing this — it is distribution, which is what capital is for.

## Traction — the honest version

- Product: **complete and deployed**, 58 merged pull requests, CI-gated,
  self-hosted. Health tracking, twin stage 1, shop stack, adoption flow,
  pro booking surfaces, blog engine, admin — all live.
- Users: **pre-launch. No user or revenue numbers exist, so none are
  claimed.** The two public pet profiles are the founding team's real
  animals.
- Cost base: the entire platform runs on a single self-hosted server
  alongside sibling products — infrastructure cost is effectively noise.

## Why this team wins on cost and speed

Petvity is built inside a studio production system
([`docs/studio-production-system.md`](./../studio-production-system.md)):
shared open-source packages (e.g. **commercekit**, the tested
money/cart/inventory core that powers the shop), one design-token system, one
CI/CD standard across a fleet of products. The measurable consequence:
features that take pet-tech incumbents quarters ship here in days, and a new
commerce surface costs about an hour. Capital buys distribution and supply
activation, not engineering headcount.

## What funding accelerates

Priorities, in order:

1. **Distribution** — content engine (the species-science blog is
   half-written in the repo), ASO/SEO, partnerships with shelters and
   breeders (adoption network as acquisition).
2. **Supply activation** — onboarding real vets/sitters/groomers and
   marketplace sellers in the first target markets.
3. **Twin stage 2–3** — the narrator and likeness models, which convert the
   dataset into the product nobody else can copy.
4. **Pro/Clinic launch** — first recurring revenue.

Terms and structure: open — contact
[cato@orangecat.ch](mailto:cato@orangecat.ch).

---

*Sources for market figures: Fortune Business Insights (pet care 2026–2034;
pet tech 2026–2034), SkyQuest (pet care 2025–2031), Mordor Intelligence (pet
tech 2025–2031), Grand View Research (pet tech products 2026–2033). Figures
are third-party estimates and vary by scope; ranges are quoted rather than a
single number.*
