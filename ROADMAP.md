# Roadmap

Where Petvity is going, in the order it is going there. This file is the record;
[petvity.orangecat.ch/en/roadmap](https://petvity.orangecat.ch/en/roadmap) renders it
through the fleet map. Planned work is a plan, not a delivery promise.

## Now

### Building in public

The roadmap and changelog live in this repository and are rendered on the site,
so anyone can see what shipped and what is planned without asking.

- [x] ROADMAP.md and CHANGELOG.md at the repository root
- [x] /roadmap and /changelog pages read the records from the fleet map
- [ ] The fleet map ingests these files, so the pages show them

### Pay on the platform

Orders and bookings are recorded today; the money still moves off-platform
until the payment provider is keyed in production.

- [x] Stripe Checkout wired for account and guest orders
- [x] Cancelled orders restore stock
- [ ] Live payment keys in production, so an order flips to Paid on its own
- [ ] Bookings paid through the same checkout

## Next

### Care reminders you can act on

Every reminder email leads to the one screen where the thing gets done.

- [x] Vaccination, medication, booking and weekly digest emails
- [ ] Reminders in the portal itself, not only by email
- [ ] Per-pet reminder preferences

### Cross-border adoption

Adoption listings are public and applications work; moving a pet between
countries needs more than a listing.

- [x] Public listings with species and location filters
- [x] Owner reviews applications and shares contact details on approval
- [ ] Transport and paperwork checklist per destination country
- [ ] Vet-verified health certificate attached to a listing

## Later

### Digital twin

Today the twin is the emotional-state model built from what an owner logs. The
long-term vision adds what the pet's environment can report on its own.

- [x] Emotional state (Thriving / Content / Attention / Struggling) with trends
- [ ] Wearable and scale integrations feed weight and activity automatically
- [ ] Camera-based activity and rest detection
- [ ] A signal that explains itself from sensor data, not only from logs

### Vet-facing records

A vet who sees the pet should be able to write into the same record the owner
reads, with the owner's consent.

- [ ] Shared record access granted per booking
- [ ] Clinic-authored visit notes and prescriptions

## Shipped

### Health tracking

Daily logs for physical and emotional wellness, per species, with a signal
that says why it changed.

- [x] Multi-species pet profiles (10 species, breeds, normal ranges)
- [x] Seven daily metrics with species-specific ranges and 30-day charts
- [x] Wellness signal (healthy / watch / concern) with history and reasons
- [x] Vaccinations, medications and vet records
- [x] Health alerts, vaccination and medication reminders, weekly digest
- [x] Public pet profiles

### Vets, sitters and groomers

Professionals publish a profile; owners find them and book.

- [x] Vet, sitter and groomer profiles with admin verification
- [x] Public directory and booking with calendar conflict blocking
- [x] Reviews linked to completed bookings

### Marketplace

A storefront that sells without an account.

- [x] Product catalogue with search, sort and photos from a phone
- [x] Guest checkout, emailed receipt, order history for accounts
- [x] Seller and admin order fulfilment

### Adoption

- [x] Owners list a pet for adoption; anyone can browse
- [x] Applications with owner approval and admin moderation

### Platform

- [x] Nine languages, Arabic right-to-left
- [x] Sign in with OrangeCat (Google, GitHub or email), with email and password kept for existing accounts
- [x] Live demo account that resets itself
- [x] Blog published from the admin
- [x] Self-hosted on Hetzner with automatic deploys
