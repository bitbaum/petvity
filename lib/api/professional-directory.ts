import { NextResponse, type NextRequest } from "next/server";
import { and, avg, count, eq, ilike, inArray, isNotNull, sql, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable, SelectedFields } from "drizzle-orm/pg-core";
import { requireSession } from "@/lib/auth/guards";
import { getInstance } from "@/lib/db";
import { reviews, users } from "@/lib/db/schema";

/**
 * The browse-a-professional endpoint, once.
 *
 * `/api/vets`, `/api/sitters` and `/api/groomers` were three files that differed
 * in a role string, a table and a list of columns — and agreed, character for
 * character, on everything that decides what a caller actually sees: the session
 * guard, the completeness rule, the city filter, the 50-row page, the review
 * aggregate and the response envelope. Three copies of a paging rule is three
 * chances for one directory to quietly start answering a different question from
 * its siblings.
 *
 * What stays per-route is the SELECT list, because that IS the contract each
 * directory publishes — a sitter has a day rate, a vet has a clinic.
 */

/** One page. Fetch one extra row to learn cheaply whether there are more. */
const PAGE = 50;

/** The columns every professional profile table has, whatever else it carries. */
interface ProfileTable {
  userId: PgColumn;
  city: PgColumn;
  phone: PgColumn;
  bio: PgColumn;
  isAcceptingClients: PgColumn;
}

/** A bio this short is a placeholder, not something a customer can act on. */
const MIN_BIO_LENGTH = 40;

export interface ProfessionalDirectoryConfig<TColumns extends SelectedFields> {
  /** The `users.role` these profiles belong to. */
  role: typeof users.$inferSelect.role;
  table: PgTable & ProfileTable;
  /**
   * Columns beyond the shared ones that must be filled before a profile is
   * listed at all — the vet's clinic name, the sitter's day rate. Same rule as
   * the public directory (lib/domain/profile-readiness).
   */
  alsoRequired: PgColumn[];
  /** What this directory returns. Must include `userId`; the ratings join on it. */
  columns: TColumns & { userId: PgColumn };
}

export function createProfessionalDirectoryRoute<TColumns extends SelectedFields>(
  config: ProfessionalDirectoryConfig<TColumns>,
) {
  const { role, table, alsoRequired, columns } = config;

  return async function GET(req: NextRequest) {
    const { error } = await requireSession();
    if (error) return error;

    const city = req.nextUrl.searchParams.get("city");
    const accepting = req.nextUrl.searchParams.get("accepting");

    const db = getInstance();

    // Only complete profiles are listed — a customer must be able to act on it.
    const conditions: SQL[] = [
      eq(users.role, role),
      ...alsoRequired.map((column) => isNotNull(column)),
      isNotNull(table.city),
      isNotNull(table.phone),
      sql`length(coalesce(${table.bio}, '')) >= ${MIN_BIO_LENGTH}`,
    ];
    if (accepting === "true") conditions.push(eq(table.isAcceptingClients, true));
    if (city) conditions.push(ilike(table.city, `%${city}%`));

    const rows = await db
      .select(columns)
      .from(table)
      .innerJoin(users, eq(users.id, table.userId))
      .where(and(...conditions))
      .limit(PAGE + 1);

    const hasMore = rows.length > PAGE;
    const filtered = rows.slice(0, PAGE);

    if (filtered.length === 0) {
      return NextResponse.json({ success: true, data: [], meta: { hasMore: false } });
    }

    // Review aggregates for every returned professional, in one query.
    const professionalIds = filtered.map((r) => r.userId as string);
    const ratingRows = await db
      .select({
        professionalId: reviews.professionalId,
        avgRating: avg(reviews.rating),
        reviewCount: count(reviews.id),
      })
      .from(reviews)
      .where(inArray(reviews.professionalId, professionalIds))
      .groupBy(reviews.professionalId);

    const ratingMap = new Map(
      ratingRows.map((r) => [
        r.professionalId,
        {
          avgRating: r.avgRating ? Number(Number(r.avgRating).toFixed(1)) : null,
          reviewCount: r.reviewCount,
        },
      ]),
    );

    const data = filtered.map((r) => ({
      ...r,
      avgRating: ratingMap.get(r.userId as string)?.avgRating ?? null,
      reviewCount: ratingMap.get(r.userId as string)?.reviewCount ?? 0,
    }));

    return NextResponse.json({ success: true, data, meta: { hasMore } });
  };
}
