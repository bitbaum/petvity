import { NextRequest, NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getInstance } from "@/lib/db";
import {
  users,
  pets,
  healthMetrics,
  vaccinations,
  medications,
  healthRecords,
} from "@/lib/db/schema";
import { DEMO_ACCOUNT } from "@/lib/config/demo";
import { BCRYPT_SALT_ROUNDS } from "@/lib/config/auth";
import { refreshSignalCache } from "@/lib/api/signal-cache";
import { requireCronAuth } from "@/lib/auth/cron";

/**
 * Wipe and reseed the shared demo account (also creates it on first run).
 *
 * Deleting the user row cascades through pets → metrics/vaccinations/
 * medications/records, so drive-by edits from demo visitors never persist.
 * Runs daily from a box timer; calling it once after deploy seeds the demo.
 */

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  const auth = requireCronAuth(req);
  if (!auth.ok) return auth.response;

  // Hashed before anything is deleted: bcrypt is the slow step, and it used to
  // sit between the delete and the insert, so for a few hundred milliseconds
  // every two hours the demo account did not exist. A visitor signing in to
  // the demo in that gap could get a demo row of its own (AccountKit creates a
  // person it does not find, and the mirror gives them a `users` row), and the
  // pinned-id insert below then failed on the unique email: HTTP 500, and no
  // demo account until the next run (petvity-cron-reset-demo, 2026-11-12).
  const hashed = await bcrypt.hash(DEMO_ACCOUNT.password, BCRYPT_SALT_ROUNDS);

  // One transaction: a visitor sees the old demo or the new one, never none,
  // and a run that fails half-way leaves the old demo in place instead of a
  // half-seeded one.
  const { demoUser, luna, metricDays } = await getInstance().transaction(async (db) => {
    // Full reset: the FK graph cascades everything the demo visitor touched. By
    // the pinned id AND the email, so a demo row created under another id (see
    // above) is cleared too instead of colliding with the insert.
    await db
      .delete(users)
      .where(or(eq(users.id, DEMO_ACCOUNT.id), eq(users.email, DEMO_ACCOUNT.email)));

    const [demoUser] = await db
      .insert(users)
      .values({
        // Pinned, not generated: sessions outlive the reset by design, so the
        // identity they point at has to survive it. See DEMO_ACCOUNT.id.
        id: DEMO_ACCOUNT.id,
        name: DEMO_ACCOUNT.name,
        email: DEMO_ACCOUNT.email,
        password: hashed,
        role: "pet_owner",
        emailVerified: new Date(),
      })
      .returning();

    // Public profile — /pets/luna doubles as the showcase for the
    // public-influencer-profile feature. Handles are globally unique, so only
    // claim it if no real user has taken it since the last reset.
    const handleTaken = await db.query.pets.findFirst({
      where: eq(pets.handle, "luna"),
    });

    const [luna] = await db
      .insert(pets)
      .values({
        ownerId: demoUser.id,
        name: "Luna",
        species: "dog",
        breed: "Golden Retriever",
        sex: "female",
        birthDate: "2022-05-12",
        bio: "Sunny golden retriever who fetches anything that fits in her mouth and greets every dog in the park by name.",
        ...(handleTaken ? {} : { isPublic: true, handle: "luna" }),
      })
      .returning();

    // 30 days of daily check-ins with plausible, deterministic variation —
    // enough history for the charts, trend lines, and digital twin to feel real.
    const today = new Date();
    const rows = Array.from({ length: 30 }, (_, i) => {
      const day = new Date(today.getTime() - (29 - i) * 86_400_000);
      const wave = Math.sin(i / 4.5); // slow mood/energy rhythm
      return {
        petId: luna.id,
        date: iso(day),
        weightGrams: 29_400 + Math.round(wave * 250) + i * 10,
        temperatureCentidegrees: 3_845 + (i % 3) * 5,
        heartRateBpm: 88 + ((i * 7) % 11),
        energy: wave > 0.3 ? 5 : wave < -0.5 ? 3 : 4,
        mood: wave < -0.6 ? 3 : wave > 0 ? 5 : 4,
        anxiety: i % 9 === 0 ? 3 : i % 2 === 0 ? 1 : 2,
        socialization: wave > -0.2 ? 5 : 4,
        notes: i === 29 ? "Long lake walk this morning — soaked, ecstatic, exhausted." : null,
      };
    });
    await db.insert(healthMetrics).values(rows);

    await db.insert(vaccinations).values([
      {
        petId: luna.id,
        name: "Rabies",
        administeredDate: iso(new Date(today.getTime() - 200 * 86_400_000)),
        nextDueDate: iso(new Date(today.getTime() + 165 * 86_400_000)),
        status: "up_to_date",
        vetName: "Dr. Keller, Seefeld Tierklinik",
      },
      {
        petId: luna.id,
        name: "DHPP booster",
        administeredDate: iso(new Date(today.getTime() - 340 * 86_400_000)),
        nextDueDate: iso(new Date(today.getTime() + 25 * 86_400_000)),
        status: "due_soon",
        vetName: "Dr. Keller, Seefeld Tierklinik",
      },
    ]);

    await db.insert(medications).values({
      petId: luna.id,
      name: "Simparica Trio",
      dosage: "1 chewable",
      frequency: "Monthly",
      startDate: iso(new Date(today.getTime() - 90 * 86_400_000)),
      status: "active",
      prescribedBy: "Dr. Keller",
      notes: "Flea, tick and heartworm prevention. Give with food.",
    });

    await db.insert(healthRecords).values([
      {
        petId: luna.id,
        type: "vet_visit",
        date: iso(new Date(today.getTime() - 45 * 86_400_000)),
        title: "Annual wellness exam",
        vetName: "Dr. Keller",
        clinic: "Seefeld Tierklinik",
        notes: "Excellent condition. Mild tartar on upper molars — dental chew recommended.",
      },
      {
        petId: luna.id,
        type: "grooming",
        date: iso(new Date(today.getTime() - 12 * 86_400_000)),
        title: "Full groom and nail trim",
        clinic: "Pfoten-Salon Zürich",
      },
    ]);

    return { demoUser, luna, metricDays: rows.length };
  });

  await refreshSignalCache(luna.id);

  return NextResponse.json({
    success: true,
    data: { userId: demoUser.id, petId: luna.id, metricDays },
  });
}
