import { createProfessionalDirectoryRoute } from "@/lib/api/professional-directory";
import { groomerProfiles, users } from "@/lib/db/schema";

/** GET /api/groomers — browse groomers (portal), with review aggregates. */
export const GET = createProfessionalDirectoryRoute({
  role: "groomer",
  table: groomerProfiles,
  alsoRequired: [groomerProfiles.salonName, groomerProfiles.services, groomerProfiles.priceFrom],
  columns: {
    id: groomerProfiles.id,
    userId: groomerProfiles.userId,
    name: users.name,
    salonName: groomerProfiles.salonName,
    bio: groomerProfiles.bio,
    services: groomerProfiles.services,
    priceFrom: groomerProfiles.priceFrom,
    city: groomerProfiles.city,
    country: groomerProfiles.country,
    phone: groomerProfiles.phone,
    isAcceptingClients: groomerProfiles.isAcceptingClients,
    isVerified: groomerProfiles.isVerified,
  },
});
