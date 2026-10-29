# Changelog

What changed for the people using Petvity, newest first. Fixes carry the same
weight as features. Rendered at
[petvity.orangecat.ch/en/changelog](https://petvity.orangecat.ch/en/changelog).

## 2026-10-02

### Added

- **Sign in with OrangeCat.** One OrangeCat account (Google, GitHub or email) signs you in; you can still sign up and sign in with an email and password.

### Fixed

- **Mail to Petvity arrives.** The footer, legal pages and emails pointed at addresses on a domain Petvity does not own; they now point at cato@orangecat.ch.
- **Marketing copy cut back to what the product does.** Removed: plans that do not exist, the claim that vets and sitters see a client's pet records (they see the pet's name on a booking), sitters logging health, unmeasured timings such as "in 30 seconds", and a "coming soon" waitlist that led nowhere. The Arabic, Chinese, Japanese, Korean and Turkish pages now say what the English ones say.

## 2026-09-28

### Added

- **Roadmap and changelog pages.** What is planned and what shipped are public at /roadmap and /changelog, linked from the footer.

### Changed

- **The homepage is short and mobile-first.** One headline, one call to action, three benefits. The call to action is visible without scrolling on a phone.

## 2026-09-26

### Fixed

- **Every header control is a 44px target.** The public detail pages share one header, and each button in it is large enough to tap.

## 2026-09-17

### Fixed

- **Vita is named and described correctly** in all eight translated languages.

## 2026-08-31

### Fixed

- **The sidebar tells screen readers which page is current**, not only sighted users.

## 2026-08-16

### Added

- **Buy without an account.** Add to cart on the public shop, check out on one page with an email and address, and get a receipt by email.

### Fixed

- **Prices in zero-decimal currencies** (such as JPY) were shown 100 times too high.
- **One filter control** on the browse pages, and sign-in screens that fit a phone.
- **A missing server secret now denies cron requests** instead of accepting them.

## 2026-08-15

### Added

- **Publish blog posts from the admin** instead of editing code.
- **Search and sort the catalogue** on both the public and the portal storefront.
- **List a product with a photo from your phone**, not a URL.

### Fixed

- **A taken blog URL is a 409 the author can fix**, not a server error.
- **Uploaded images are served with the right type**, so they display everywhere.
- **Test accounts no longer receive real email.**

## 2026-08-14

### Added

- **Real onboarding for vets, sitters and groomers** replaces placeholder profiles; orders become shippable with seller and admin fulfilment.
- **The dashboard covers the whole platform**, and every portal page says what it is for.

### Fixed

- **Sign-out returns to the site** instead of a dead localhost address.
- **The shared demo keeps its identity across its two-hourly reset**, so sessions stay valid.
- **A complete professional profile is live even while not accepting clients.**
- **Portal pages paint their heading before the data loads**, and the pet count reads correctly.

## 2026-08-13

### Added

- **Grooming as a professional vertical**, alongside vets and sitters.
- **Humane booking flow**, self-serve upgrade to a professional account, role-aware dashboard.
- **Calendar conflict blocking** for bookings.
- **Public professional directory, blog, and a six-item sidebar.**
- **Branded category art**: no product renders as a placeholder box.

### Fixed

- **Cancelled orders restore stock**, and sellers can delete their account.
- **Every fabricated trust signal removed.** Nothing on the site claims what is not true.
- **Header trimmed to seven items**, with a grouped sidebar and an honest footer.

## 2026-08-11

### Added

- **Obsidian marketing surface**: platinum text and champagne accents on near-black across the public pages.
- **Living demo data**: every user type is represented with a resident account.

## 2026-08-08

### Added

- **Milo**, a real pet tracked for real, one day at a time, on the public demo.

## 2026-08-07

### Added

- **One-click demo** with a public demo profile, no account needed.
- **New-pet grace period** so a freshly added pet is not flagged for missing logs.

### Fixed

- **Password reset says honestly when it fails** instead of pretending an email went out.
- **A walkthrough bug sweep** across the marketing subpages.

## 2026-05-08

### Added

- **Seller profiles** with onboarding at registration.
- **Species guides for nine species**: bird, rabbit, guinea pig, hamster, reptile and fish join dog, cat and horse.

## 2026-05-07

### Added

- **Approved adoption applicants see the owner's contact details.**
- **Vaccinations due soon are actionable from the dashboard**, and the mobile check-in shows the signal badge.

### Fixed

- **Errors are shown, not swallowed**, when cancelling an order, deleting a product, or editing health entries.
- **Ages, relative dates and prices follow your language and currency.**
- **Two orders could no longer race for the same stock**, nor two applications for the same listing.
- **Touch targets and text sizes** raised on small icon buttons and captions.

## 2026-05-04

### Added

- **Filter adoption listings by species and location** on the public browse page.
- **Pending adoption applications and vaccinations due soon** on the dashboard.

## 2026-05-03

### Added

- **Health charts shade the normal range** instead of drawing two lines.
- **Signal reasons are stored and translated**, so the history reads in your language.
- **Share previews** for the homepage, adoption listings, products and professional profiles.
- **Sitemap and language alternates** for every public page.

## 2026-05-02

### Added

- **The marketing site, species guides and portal read in nine languages**, including the digital twin labels.

### Fixed

- **Portal pages show an error and a retry button** when a fetch fails, instead of a blank screen.

## 2026-04-27

### Added

- **Public shop**: browse products and open a product page without an account.
- **Weekly wellness digest** by email every Sunday.
- **Signal history timeline** on the pet health page.
- **My Adoptions** in the sidebar.
- **Email templates in nine languages**, and a notification when a professional profile is verified.

### Fixed

- **Contrast and minimum text size** on the sign-in brand panel.
