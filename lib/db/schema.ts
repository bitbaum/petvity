import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  date,
  jsonb,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "pet_owner",
  "veterinarian",
  "pet_sitter",
  "groomer",
  "admin",
]);

export const speciesEnum = pgEnum("species", [
  "dog",
  "cat",
  "horse",
  "bird",
  "rabbit",
  "guinea_pig",
  "hamster",
  "reptile",
  "fish",
  "other",
]);

export const sexEnum = pgEnum("sex", ["male", "female", "unknown"]);

export const healthRecordTypeEnum = pgEnum("health_record_type", [
  "vet_visit",
  "vaccination",
  "medication",
  "surgery",
  "lab_result",
  "dental",
  "grooming",
  "other",
]);

export const vaccinationStatusEnum = pgEnum("vaccination_status", [
  "up_to_date",
  "due_soon",
  "overdue",
  "not_applicable",
]);

export const medicationStatusEnum = pgEnum("medication_status", [
  "active",
  "completed",
  "discontinued",
]);

export const emailQueueStatusEnum = pgEnum("email_queue_status", ["pending", "sent", "failed"]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
]);

export const blogPostStatusEnum = pgEnum("blog_post_status", ["draft", "published"]);

export const petWellnessSignalEnum = pgEnum("pet_wellness_signal", ["healthy", "watch", "concern"]);

// ─── NextAuth tables ──────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  password: text("password"),
  role: userRoleEnum("role").notNull().default("pet_owner"),
  /** Set when a vet or sitter is manually verified by admin (Phase 2). */
  verifiedAt: timestamp("verified_at", { mode: "date" }),
  /** Persisted UI locale — set by LocaleSwitcher; null = use defaultLocale. */
  locale: varchar("locale", { length: 5 }),
  /** When true, skip the welcome email digest (day-1/3/7 onboarding sequence). */
  digestOptOut: boolean("digest_opt_out").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

// ─── Owner profiles ───────────────────────────────────────────────────────────

export const ownerProfiles = pgTable("owner_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  phone: varchar("phone", { length: 50 }),
  city: varchar("city", { length: 100 }),
  /** ISO 3166-1 alpha-2 country code */
  country: varchar("country", { length: 2 }),
  timezone: varchar("timezone", { length: 60 }),
  bio: text("bio"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── Pets ─────────────────────────────────────────────────────────────────────

export const pets = pgTable(
  "pets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    species: speciesEnum("species").notNull(),
    /** Validated against SPECIES_CONFIG[species].commonBreeds in the domain layer. */
    breed: varchar("breed", { length: 100 }),
    /** YYYY-MM-DD */
    birthDate: varchar("birth_date", { length: 10 }),
    sex: sexEnum("sex").notNull().default("unknown"),
    /** Weight stored as integer grams. 3500 = 3.5 kg. Display: divide by 1000. */
    weightGrams: integer("weight_grams"),
    bio: text("bio"),
    /** Local file storage URL (served by Caddy under /uploads/*) */
    avatarUrl: text("avatar_url"),
    isPublic: boolean("is_public").notNull().default(false),
    /** @handle for public influencer profiles. Must be unique when set. */
    handle: varchar("handle", { length: 50 }).unique(),
    /** Cached signal from cron/health-alerts. Updated daily. */
    lastKnownSignal: varchar("last_known_signal", { length: 20 }),
    signalAlertSentAt: timestamp("signal_alert_sent_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("pets_owner_id_idx").on(t.ownerId)],
);

// ─── Health metrics (daily KPI log) ───────────────────────────────────────────

export const healthMetrics = pgTable(
  "health_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    petId: uuid("pet_id")
      .notNull()
      .references(() => pets.id, { onDelete: "cascade" }),
    /** YYYY-MM-DD — one row per pet per day */
    date: varchar("date", { length: 10 }).notNull(),
    /** Integer grams. Null = not recorded today. */
    weightGrams: integer("weight_grams"),
    /** Integer centidegrees (0.01°C). 3850 = 38.50°C. */
    temperatureCentidegrees: integer("temperature_centidegrees"),
    heartRateBpm: integer("heart_rate_bpm"),
    /** Emotional metrics: 1–5 integer scale */
    energy: integer("energy"),
    mood: integer("mood"),
    /** Inverted: 1 = calm (good), 5 = highly anxious (bad) */
    anxiety: integer("anxiety"),
    socialization: integer("socialization"),
    notes: text("notes"),
    /** SET NULL on user delete — the metric belongs to the pet (owner cascade
     *  handles its lifecycle); deleting the *logger* (e.g. a vet who entered
     *  it on the owner's behalf) must not erase the owner's history. */
    loggedBy: uuid("logged_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("health_metrics_pet_date_idx").on(t.petId, t.date)],
);

// ─── Health records (vet visits, procedures) ──────────────────────────────────

export const healthRecords = pgTable(
  "health_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    petId: uuid("pet_id")
      .notNull()
      .references(() => pets.id, { onDelete: "cascade" }),
    type: healthRecordTypeEnum("type").notNull(),
    title: text("title").notNull(),
    /** YYYY-MM-DD */
    date: varchar("date", { length: 10 }).notNull(),
    vetName: varchar("vet_name", { length: 150 }),
    clinic: varchar("clinic", { length: 150 }),
    notes: text("notes"),
    /** Local file storage URL for lab PDFs, prescriptions, etc. */
    attachmentUrl: text("attachment_url"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("health_records_pet_id_idx").on(t.petId)],
);

// ─── Vaccinations ─────────────────────────────────────────────────────────────

export const vaccinations = pgTable(
  "vaccinations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    petId: uuid("pet_id")
      .notNull()
      .references(() => pets.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 150 }).notNull(),
    /** YYYY-MM-DD */
    administeredDate: varchar("administered_date", { length: 10 }).notNull(),
    /** YYYY-MM-DD. Null = no booster required. */
    nextDueDate: varchar("next_due_date", { length: 10 }),
    status: vaccinationStatusEnum("status").notNull().default("up_to_date"),
    batchNumber: varchar("batch_number", { length: 100 }),
    vetName: varchar("vet_name", { length: 150 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("vaccinations_pet_id_idx").on(t.petId)],
);

// ─── Medications ──────────────────────────────────────────────────────────────

export const medications = pgTable(
  "medications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    petId: uuid("pet_id")
      .notNull()
      .references(() => pets.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 150 }).notNull(),
    dosage: varchar("dosage", { length: 100 }),
    frequency: varchar("frequency", { length: 100 }),
    /** YYYY-MM-DD */
    startDate: varchar("start_date", { length: 10 }).notNull(),
    /** YYYY-MM-DD. Null = ongoing. */
    endDate: varchar("end_date", { length: 10 }),
    prescribedBy: varchar("prescribed_by", { length: 150 }),
    status: medicationStatusEnum("status").notNull().default("active"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("medications_pet_id_idx").on(t.petId)],
);

// ─── Email queue ──────────────────────────────────────────────────────────────

export const emailQueue = pgTable(
  "email_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    templateKey: varchar("template_key", { length: 100 }).notNull(),
    sendAt: timestamp("send_at", { mode: "date" }).notNull(),
    sentAt: timestamp("sent_at", { mode: "date" }),
    status: emailQueueStatusEnum("status").notNull().default("pending"),
    /** Arbitrary data passed to the email template */
    payload: jsonb("payload").notNull().default({}),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("email_queue_status_send_at_idx").on(t.status, t.sendAt)],
);

// ─── Veterinarian profiles ─────────────────────────────────────────────────

export const vetProfiles = pgTable("vet_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  bio: text("bio"),
  specialty: varchar("specialty", { length: 200 }),
  clinicName: varchar("clinic_name", { length: 200 }),
  clinicAddress: text("clinic_address"),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 2 }),
  phone: varchar("phone", { length: 50 }),
  isAcceptingClients: boolean("is_accepting_clients").notNull().default(true),
  /** Set by admin after credential verification */
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── Pet sitter profiles ────────────────────────────────────────────────────

export const sitterProfiles = pgTable("sitter_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  bio: text("bio"),
  /** Comma-separated: boarding,daycare,walking,house_sitting,drop_in */
  services: text("services"),
  /** Daily rate in cents (e.g. 5000 = $50.00) */
  pricePerDay: integer("price_per_day"),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 2 }),
  phone: varchar("phone", { length: 50 }),
  isAcceptingClients: boolean("is_accepting_clients").notNull().default(true),
  /** Set by admin after credential verification */
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const groomerProfiles = pgTable("groomer_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  salonName: varchar("salon_name", { length: 200 }),
  bio: text("bio"),
  /** Comma-separated: bath_brush,full_groom,haircut,deshedding,nail_trim,teeth_cleaning */
  services: text("services"),
  /** Starting price in cents ("from $X") — sessions vary by breed and coat */
  priceFrom: integer("price_from"),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 2 }),
  phone: varchar("phone", { length: 50 }),
  isAcceptingClients: boolean("is_accepting_clients").notNull().default(true),
  /** Set by admin after credential verification */
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── Seller profiles ───────────────────────────────────────────────────────────

export const sellerProfiles = pgTable("seller_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  /** Public store name (defaults to user display name) */
  displayName: varchar("display_name", { length: 200 }),
  bio: text("bio"),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 2 }),
  phone: varchar("phone", { length: 50 }),
  website: varchar("website", { length: 500 }),
  /** false = store is paused (products still visible but not purchasable) */
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── Bookings ──────────────────────────────────────────────────────────────────

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** The pet owner making the booking */
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Pet being brought / cared for */
    petId: uuid("pet_id")
      .notNull()
      .references(() => pets.id, { onDelete: "cascade" }),
    /** The vet or sitter being booked */
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Whether this is a vet appointment or sitter booking */
    professionalRole: userRoleEnum("professional_role").notNull(),
    startDate: timestamp("start_date", { mode: "date" }).notNull(),
    endDate: timestamp("end_date", { mode: "date" }).notNull(),
    notes: text("notes"),
    status: bookingStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("bookings_owner_id_idx").on(t.ownerId),
    index("bookings_professional_id_idx").on(t.professionalId),
  ],
);

/** Date ranges a vet/sitter has marked themselves unavailable — the booking
 *  API rejects requests that overlap these (or an existing active booking). */
export const professionalBlockedDates = pgTable(
  "professional_blocked_dates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Inclusive range, date-only (whole days off) */
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    reason: varchar("reason", { length: 200 }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("professional_blocked_dates_professional_id_idx").on(t.professionalId)],
);

// ─── Marketplace ──────────────────────────────────────────────────────────────

export const productCategoryEnum = pgEnum("product_category", [
  "food",
  "toys",
  "health",
  "accessories",
  "grooming",
  "other",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
]);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    /** Price in integer cents (e.g. 1999 = $19.99) */
    priceCents: integer("price_cents").notNull(),
    imageUrl: text("image_url"),
    category: productCategoryEnum("category").notNull().default("other"),
    /** Inventory count; null = unlimited */
    stock: integer("stock"),
    isActive: boolean("is_active").notNull().default(true),
    /** null = admin/platform product; non-null = user-listed product */
    sellerId: uuid("seller_id").references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("products_seller_id_idx").on(t.sellerId)],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Null for a guest order. Exactly one of userId / guestEmail is set — the
     *  CHECK constraint below is the enforcement, so no code path can create an
     *  order nobody can be identified by. */
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    /** The buyer's email when they checked out without an account. */
    guestEmail: varchar("guest_email", { length: 255 }),
    /** Unguessable receipt key. A guest has no session, so this is the only way
     *  they can reach their own order — it is emailed to them and never listed. */
    publicToken: uuid("public_token").notNull().defaultRandom(),
    status: orderStatusEnum("status").notNull().default("pending"),
    /** Snapshot of total at order time (sum of line items) */
    totalCents: integer("total_cents").notNull(),
    /** Set by the Stripe webhook when the checkout session completes. Null when
     *  unpaid — which is also the permanent state when payments are not enabled. */
    paidAt: timestamp("paid_at", { mode: "date" }),
    /** Latest Stripe Checkout Session for this order (retry-safe: re-pay replaces it) */
    checkoutSessionId: varchar("checkout_session_id", { length: 255 }),
    /** Delivery details, captured at checkout. Snapshot — never re-read from the
     *  user's profile, so an address change can't rewrite a shipped order. */
    shippingName: varchar("shipping_name", { length: 200 }),
    shippingLine1: varchar("shipping_line1", { length: 200 }),
    shippingPostalCode: varchar("shipping_postal_code", { length: 20 }),
    shippingCity: varchar("shipping_city", { length: 100 }),
    shippingCountry: varchar("shipping_country", { length: 2 }),
    shippingPhone: varchar("shipping_phone", { length: 50 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("orders_user_id_idx").on(t.userId),
    uniqueIndex("orders_public_token_idx").on(t.publicToken),
    // An order belongs to an account or to an email address, never both and never
    // neither. Enforced here because it is the one invariant that, if broken,
    // produces an order with no reachable buyer — unfixable after the fact.
    check("orders_buyer_identity", sql`(${t.userId} IS NOT NULL) <> (${t.guestEmail} IS NOT NULL)`),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    /** Nullable: the product row may be deleted (e.g. the seller erased their
     *  account) — the buyer's order history survives via the snapshots below. */
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    /** Name snapshot at order time — order history is an immutable record */
    productName: varchar("product_name", { length: 200 }).notNull(),
    quantity: integer("quantity").notNull(),
    /** Price snapshot at order time */
    priceCents: integer("price_cents").notNull(),
  },
  (t) => [index("order_items_order_id_idx").on(t.orderId)],
);

// ─── Adoption ──────────────────────────────────────────────────────────────────

export const adoptionListingStatusEnum = pgEnum("adoption_listing_status", [
  "available",
  "on_hold",
  "adopted",
  "withdrawn",
]);

export const adoptionApplicationStatusEnum = pgEnum("adoption_application_status", [
  "pending",
  "approved",
  "rejected",
  "withdrawn",
]);

export const adoptionListings = pgTable(
  "adoption_listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    petId: uuid("pet_id")
      .notNull()
      .references(() => pets.id, { onDelete: "cascade" }),
    /** Denormalized for query efficiency — same as pet.ownerId */
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: adoptionListingStatusEnum("status").notNull().default("available"),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    /** Adoption fee in cents; null = free */
    feeCents: integer("fee_cents"),
    /** City, region, or country */
    location: varchar("location", { length: 150 }),
    requiresExperience: boolean("requires_experience").notNull().default(false),
    goodWithKids: boolean("good_with_kids"),
    goodWithDogs: boolean("good_with_dogs"),
    goodWithCats: boolean("good_with_cats"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("adoption_listings_owner_id_idx").on(t.ownerId),
    index("adoption_listings_status_idx").on(t.status),
  ],
);

export const adoptionApplications = pgTable(
  "adoption_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => adoptionListings.id, { onDelete: "cascade" }),
    applicantId: uuid("applicant_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: adoptionApplicationStatusEnum("status").notNull().default("pending"),
    message: text("message"),
    experience: text("experience"),
    housingType: varchar("housing_type", { length: 100 }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("adoption_applications_listing_id_idx").on(t.listingId),
    index("adoption_applications_applicant_id_idx").on(t.applicantId),
    uniqueIndex("adoption_applications_unique_applicant_idx").on(t.listingId, t.applicantId),
  ],
);

// ─── Pet signal history ────────────────────────────────────────────────────────

/**
 * Append-only log of pet wellness signal transitions.
 * A row is inserted only when the signal CHANGES from its previous value.
 * Used to show owners a timeline of "why did my pet's signal change?"
 */
export const petSignalHistory = pgTable(
  "pet_signal_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    petId: uuid("pet_id")
      .notNull()
      .references(() => pets.id, { onDelete: "cascade" }),
    signal: petWellnessSignalEnum("signal").notNull(),
    /** Human-readable reason at the moment of transition (from computePetSignal). */
    reason: text("reason"),
    /** Structured reason data for i18n display; null for legacy rows written before this column. */
    reasonData: jsonb("reason_data"),
    /** "user_action" = triggered by a health/vaccination mutation; "cron" = daily batch. */
    source: varchar("source", { length: 20 }).notNull().default("user_action"),
    recordedAt: timestamp("recorded_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("pet_signal_history_pet_id_idx").on(t.petId)],
);

// ─── Reviews ───────────────────────────────────────────────────────────────────

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** One review per completed booking */
    bookingId: uuid("booking_id")
      .notNull()
      .unique()
      .references(() => bookings.id, { onDelete: "cascade" }),
    /** The pet owner who wrote the review */
    reviewerId: uuid("reviewer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** The vet or sitter being reviewed */
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** 1–5 star rating */
    rating: integer("rating").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("reviews_professional_id_idx").on(t.professionalId)],
);

/* ─── Blog ───────────────────────────────────────────────────────────────── */

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Appears in the public URL (/[locale]/blog/<slug>), so once published it is
     *  a permanent address — changing it breaks every inbound link. */
    slug: varchar("slug", { length: 200 }).notNull().unique(),
    title: varchar("title", { length: 200 }).notNull(),
    /** Shown on the index and used as the meta description. */
    excerpt: text("excerpt").notNull(),
    /** The author's own markdown, parsed into typed blocks at render time by
     *  lib/domain/longform.ts (bip-kit). Stored as written rather than as
     *  parsed blocks: the source is the single truth, so the renderer can
     *  improve without a data migration. */
    body: text("body").notNull(),
    status: blogPostStatusEnum("status").notNull().default("draft"),
    /** Set the first time a post is published, and the date readers see. Null
     *  while it has never been published. */
    publishedAt: timestamp("published_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("blog_posts_status_published_at_idx").on(t.status, t.publishedAt)],
);
