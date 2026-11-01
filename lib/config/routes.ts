/**
 * Every portal path, written down once.
 *
 * These were string literals scattered through the nav components — thirteen
 * distinct paths across 38 occurrences in `SidebarNav.tsx` alone, with
 * `/portal/dashboard` and `/portal/find` hand-typed six times each. Renaming a
 * route meant finding every copy, and the ones you missed did not fail to
 * compile: they became dead links that only a visitor discovers.
 *
 * Adding a route means adding it here. Nothing else should contain a
 * `"/portal/..."` literal.
 */
export const PORTAL_ROUTES = {
  dashboard: "/portal/dashboard",
  pets: "/portal/pets",
  checkin: "/portal/checkin",
  find: "/portal/find",
  bookings: "/portal/bookings",
  shop: "/portal/shop",
  orders: "/portal/orders",
  adopt: "/portal/adopt",
  adoptions: "/portal/adoptions",
  myProducts: "/portal/my-products",
  sellerProfile: "/portal/seller-profile",
  professionalProfile: "/portal/professional-profile",
  becomeAPro: "/portal/become-a-pro",
  settings: "/portal/settings",
  security: "/portal/settings/security",
} as const;

export type PortalRoute = (typeof PORTAL_ROUTES)[keyof typeof PORTAL_ROUTES];

/**
 * Paths that need an id. Functions rather than constants for the same reason
 * the constants exist: a template literal in a component is a copy, and the
 * copies drift. `/portal/pets/${petId}/health/log` was written in two files.
 */
export const petPath = (petId: string) => `${PORTAL_ROUTES.pets}/${petId}` as const;
export const petHealthLogPath = (petId: string) => `${petPath(petId)}/health/log` as const;
