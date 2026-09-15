import { createProfessionalDirectoryRoute } from "@/lib/api/professional-directory";
import { sitterProfiles, users } from "@/lib/db/schema";

/** GET /api/sitters — browse pet sitters (portal), with review aggregates. */
export const GET = createProfessionalDirectoryRoute({
  role: "pet_sitter",
  table: sitterProfiles,
  alsoRequired: [sitterProfiles.services, sitterProfiles.pricePerDay],
  columns: {
    id: sitterProfiles.id,
    userId: sitterProfiles.userId,
    name: users.name,
    bio: sitterProfiles.bio,
    services: sitterProfiles.services,
    pricePerDay: sitterProfiles.pricePerDay,
    city: sitterProfiles.city,
    country: sitterProfiles.country,
    phone: sitterProfiles.phone,
    isAcceptingClients: sitterProfiles.isAcceptingClients,
    isVerified: sitterProfiles.isVerified,
  },
});
