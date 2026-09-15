import { createProfessionalDirectoryRoute } from "@/lib/api/professional-directory";
import { vetProfiles, users } from "@/lib/db/schema";

/** GET /api/vets — browse veterinarians (portal), with review aggregates. */
export const GET = createProfessionalDirectoryRoute({
  role: "veterinarian",
  table: vetProfiles,
  alsoRequired: [vetProfiles.clinicName, vetProfiles.specialty],
  columns: {
    id: vetProfiles.id,
    userId: vetProfiles.userId,
    name: users.name,
    specialty: vetProfiles.specialty,
    clinicName: vetProfiles.clinicName,
    city: vetProfiles.city,
    country: vetProfiles.country,
    bio: vetProfiles.bio,
    phone: vetProfiles.phone,
    isAcceptingClients: vetProfiles.isAcceptingClients,
    isVerified: vetProfiles.isVerified,
  },
});
