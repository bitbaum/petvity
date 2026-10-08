"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Stethoscope,
  Home,
  Scissors,
  BadgeCheck,
  MapPin,
  Phone,
  Search,
  CalendarPlus,
  X,
  Star,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { formatPrice, formatDateShort } from "@/lib/utils/format";
import { EmptyState } from "@/components/portal/PageState";
import HubTabs from "@/components/portal/HubTabs";
import PageHeader from "@/components/portal/PageHeader";
import { DateInput } from "@/components/ui/date-input";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface VetRow {
  id: string;
  userId: string;
  name: string | null;
  specialty: string | null;
  clinicName: string | null;
  city: string | null;
  country: string | null;
  bio: string | null;
  phone: string | null;
  isAcceptingClients: boolean;
  isVerified: boolean;
  avgRating: number | null;
  reviewCount: number;
}

interface SitterRow {
  id: string;
  userId: string;
  name: string | null;
  bio: string | null;
  services: string | null;
  pricePerDay: number | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  isAcceptingClients: boolean;
  isVerified: boolean;
  avgRating: number | null;
  reviewCount: number;
}

interface GroomerRow {
  id: string;
  userId: string;
  name: string | null;
  salonName: string | null;
  bio: string | null;
  services: string | null;
  priceFrom: number | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  isAcceptingClients: boolean;
  isVerified: boolean;
  avgRating: number | null;
  reviewCount: number;
}

interface PetOption {
  id: string;
  name: string | null;
}

interface BookingTarget {
  professionalId: string;
  name: string | null;
  role: "veterinarian" | "pet_sitter" | "groomer";
  pricePerDay: number | null;
  priceFrom: number | null;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function VerifiedBadge() {
  const t = useTranslations("portal");
  return (
    <span className="badge badge-teal">
      <BadgeCheck className="w-3 h-3" />
      {t("verified")}
    </span>
  );
}

function AcceptingBadge({ accepting }: { accepting: boolean }) {
  const t = useTranslations("portal");
  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
        accepting
          ? "bg-[var(--green-bg)] text-[var(--green-text)]"
          : "bg-[var(--off)] text-[var(--muted)]"
      }`}
    >
      {accepting ? t("acceptingClients") : t("notAccepting")}
    </span>
  );
}

function formatServices(services: string | null, t: ReturnType<typeof useTranslations>): string {
  if (!services) return "";
  return services
    .split(",")
    .map((s) => t(`service_${s.trim()}` as Parameters<typeof t>[0]))
    .filter(Boolean)
    .join(" · ");
}

function StarRating({ avg, count }: { avg: number | null; count: number }) {
  if (avg === null || count === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[var(--warn-text)]">
      <Star className="w-3 h-3 fill-current" />
      <span className="font-medium">{avg.toFixed(1)}</span>
      <span className="text-[var(--muted)]">({count})</span>
    </span>
  );
}

/* ─── Card components ────────────────────────────────────────────────────── */

function VetCard({ vet, onBook }: { vet: VetRow; onBook: (t: BookingTarget) => void }) {
  const t = useTranslations("portal");
  const locale = useLocale();
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--teal-light)] flex items-center justify-center text-[var(--teal)] font-bold text-sm flex-shrink-0">
            {(vet.name ?? "V")[0].toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-[var(--ink)]">{vet.name ?? t("findVetFallback")}</p>
              {vet.isVerified && <VerifiedBadge />}
              <AcceptingBadge accepting={vet.isAcceptingClients} />
              <StarRating avg={vet.avgRating} count={vet.reviewCount} />
            </div>
            {vet.specialty && <p className="text-sm text-[var(--teal)] mt-0.5">{vet.specialty}</p>}
          </div>
        </div>
        {vet.isAcceptingClients && (
          <button
            onClick={() =>
              onBook({
                professionalId: vet.userId,
                name: vet.name,
                role: "veterinarian",
                pricePerDay: null,
                priceFrom: null,
              })
            }
            className="btn-primary text-sm flex items-center gap-1.5 px-3 py-1.5 flex-shrink-0"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            {t("book")}
          </button>
        )}
      </div>
      {(vet.clinicName || vet.city) && (
        <div className="flex items-center gap-1.5 mt-3 text-sm text-[var(--muted)]">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{[vet.clinicName, vet.city, vet.country].filter(Boolean).join(" · ")}</span>
        </div>
      )}
      {vet.bio && <p className="text-sm text-[var(--ink2)] mt-2 line-clamp-2">{vet.bio}</p>}
      {vet.phone && (
        <div className="flex items-center gap-1.5 mt-1.5 text-sm text-[var(--muted)]">
          <Phone className="w-3.5 h-3.5 flex-shrink-0" />
          <a href={`tel:${vet.phone}`} className="hover:text-[var(--teal)] transition-colors">
            {vet.phone}
          </a>
        </div>
      )}
      <div className="mt-2">
        <a
          href={`/${locale}/pros/${vet.userId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[var(--teal)] hover:underline"
        >
          {t("findViewProfile")}
        </a>
      </div>
    </div>
  );
}

function SitterCard({ sitter, onBook }: { sitter: SitterRow; onBook: (t: BookingTarget) => void }) {
  const t = useTranslations("portal");
  const locale = useLocale();
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--accent-light)] flex items-center justify-center text-[var(--accent)] font-bold text-sm flex-shrink-0">
            {(sitter.name ?? "S")[0].toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-[var(--ink)]">
                {sitter.name ?? t("findSitterFallback")}
              </p>
              {sitter.isVerified && <VerifiedBadge />}
              <AcceptingBadge accepting={sitter.isAcceptingClients} />
              <StarRating avg={sitter.avgRating} count={sitter.reviewCount} />
            </div>
            {sitter.pricePerDay != null && (
              <p className="text-sm text-[var(--accent)] mt-0.5 font-medium">
                {formatPrice(sitter.pricePerDay!, locale)}
                {t("findPerDay")}
              </p>
            )}
          </div>
        </div>
        {sitter.isAcceptingClients && (
          <button
            onClick={() =>
              onBook({
                professionalId: sitter.userId,
                name: sitter.name,
                role: "pet_sitter",
                pricePerDay: sitter.pricePerDay,
                priceFrom: null,
              })
            }
            className="btn-primary text-sm flex items-center gap-1.5 px-3 py-1.5 flex-shrink-0"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            {t("book")}
          </button>
        )}
      </div>
      {sitter.services && (
        <p className="text-sm text-[var(--muted)] mt-2">{formatServices(sitter.services, t)}</p>
      )}
      {(sitter.city || sitter.country) && (
        <div className="flex items-center gap-1.5 mt-1 text-sm text-[var(--muted)]">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{[sitter.city, sitter.country].filter(Boolean).join(", ")}</span>
        </div>
      )}
      {sitter.bio && <p className="text-sm text-[var(--ink2)] mt-2 line-clamp-2">{sitter.bio}</p>}
      {sitter.phone && (
        <div className="flex items-center gap-1.5 mt-1.5 text-sm text-[var(--muted)]">
          <Phone className="w-3.5 h-3.5 flex-shrink-0" />
          <a href={`tel:${sitter.phone}`} className="hover:text-[var(--teal)] transition-colors">
            {sitter.phone}
          </a>
        </div>
      )}
      <div className="mt-2">
        <a
          href={`/${locale}/pros/${sitter.userId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[var(--teal)] hover:underline"
        >
          {t("findViewProfile")}
        </a>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

type Tab = "vets" | "sitters" | "groomers";

export default function FindPage() {
  const t = useTranslations("portal");
  const [tab, setTab] = useState<Tab>("vets");
  const [vets, setVets] = useState<VetRow[]>([]);
  const [sitters, setSitters] = useState<SitterRow[]>([]);
  const [groomers, setGroomers] = useState<GroomerRow[]>([]);
  const [pets, setPets] = useState<PetOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState("");
  const [debouncedCity, setDebouncedCity] = useState("");
  const [vetsHasMore, setVetsHasMore] = useState(false);
  const [sittersHasMore, setSittersHasMore] = useState(false);
  const [groomersHasMore, setGroomersHasMore] = useState(false);
  const [bookingTarget, setBookingTarget] = useState<BookingTarget | null>(null);

  // Debounce city input 300ms before triggering a refetch
  useEffect(() => {
    const id = setTimeout(() => setDebouncedCity(cityFilter), 300);
    return () => clearTimeout(id);
  }, [cityFilter]);

  // Fetch pets once (not city-dependent)
  useEffect(() => {
    fetch("/api/pets").then(async (r) => {
      if (r.ok) setPets((await r.json()).data ?? []);
    });
  }, []);

  // Refetch vets + sitters whenever city filter changes
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const cityParam = debouncedCity ? `?city=${encodeURIComponent(debouncedCity)}` : "";
        const [vetRes, sitterRes, groomerRes] = await Promise.all([
          fetch(`/api/vets${cityParam}`),
          fetch(`/api/sitters${cityParam}`),
          fetch(`/api/groomers${cityParam}`),
        ]);
        if (vetRes.ok) {
          const json = await vetRes.json();
          setVets(json.data ?? []);
          setVetsHasMore(json.meta?.hasMore ?? false);
        }
        if (sitterRes.ok) {
          const json = await sitterRes.json();
          setSitters(json.data ?? []);
          setSittersHasMore(json.meta?.hasMore ?? false);
        }
        if (groomerRes.ok) {
          const json = await groomerRes.json();
          setGroomers(json.data ?? []);
          setGroomersHasMore(json.meta?.hasMore ?? false);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [debouncedCity]);

  return (
    <div>
      <HubTabs
        tabs={[
          { href: "/portal/find", label: t("findAPro") },
          { href: "/portal/bookings", label: t("bookings") },
        ]}
      />
      <PageHeader title={t("findTitle")} purpose={t("findSubtitle")} />

      {/* Tabs + search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex gap-1 bg-[var(--off)] p-1 rounded-xl w-fit">
          {(["vets", "sitters", "groomers"] as Tab[]).map((tabId) => (
            <button
              key={tabId}
              onClick={() => setTab(tabId)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === tabId
                  ? "bg-white text-[var(--ink)] shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {tabId === "vets"
                ? t("veterinarians")
                : tabId === "sitters"
                  ? t("petSitters")
                  : t("groomers")}
            </button>
          ))}
        </div>
        <div className="relative sm:ms-auto">
          <Search className="w-4 h-4 text-[var(--muted)] absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            className="form-input form-input-icon text-sm"
            placeholder={t("filterByCity")}
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-32 animate-pulse bg-[var(--off)]" />
          ))}
        </div>
      ) : tab === "vets" ? (
        vets.length === 0 ? (
          <EmptyState
            icon={Stethoscope}
            title={t("findNoVets")}
            body={
              debouncedCity ? t("findNoVetsCity", { city: debouncedCity }) : t("findNoVetsBody")
            }
            cta={
              debouncedCity
                ? undefined
                : { label: t("findRegisterVet"), href: "/register?role=vet" }
            }
          />
        ) : (
          <div className="space-y-3">
            {vets.map((vet) => (
              <VetCard key={vet.id} vet={vet} onBook={setBookingTarget} />
            ))}
            {vetsHasMore && (
              <p className="text-xs text-center text-[var(--muted)] pt-2">
                {t("findResultsLimited")}
              </p>
            )}
          </div>
        )
      ) : tab === "groomers" ? (
        groomers.length === 0 ? (
          <EmptyState
            icon={Scissors}
            title={t("findNoGroomers")}
            body={
              debouncedCity
                ? t("findNoGroomersCity", { city: debouncedCity })
                : t("findNoGroomersBody")
            }
            cta={
              debouncedCity
                ? undefined
                : { label: t("findRegisterGroomer"), href: "/register?role=groomer" }
            }
          />
        ) : (
          <div className="space-y-3">
            {groomers.map((groomer) => (
              <GroomerCard key={groomer.id} groomer={groomer} onBook={setBookingTarget} />
            ))}
            {groomersHasMore && (
              <p className="text-xs text-center text-[var(--muted)] pt-2">
                {t("findResultsLimited")}
              </p>
            )}
          </div>
        )
      ) : sitters.length === 0 ? (
        <EmptyState
          icon={Home}
          title={t("findNoSitters")}
          body={
            debouncedCity ? t("findNoSittersCity", { city: debouncedCity }) : t("findNoSittersBody")
          }
          cta={
            debouncedCity
              ? undefined
              : { label: t("findRegisterSitter"), href: "/register?role=sitter" }
          }
        />
      ) : (
        <div className="space-y-3">
          {sitters.map((sitter) => (
            <SitterCard key={sitter.id} sitter={sitter} onBook={setBookingTarget} />
          ))}
          {sittersHasMore && (
            <p className="text-xs text-center text-[var(--muted)] pt-2">
              {t("findResultsLimited")}
            </p>
          )}
        </div>
      )}

      {bookingTarget && (
        <BookingModal target={bookingTarget} pets={pets} onClose={() => setBookingTarget(null)} />
      )}
    </div>
  );
}

function GroomerCard({
  groomer,
  onBook,
}: {
  groomer: GroomerRow;
  onBook: (t: BookingTarget) => void;
}) {
  const t = useTranslations("portal");
  const locale = useLocale();
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--role-groomer-bg)] flex items-center justify-center text-[var(--role-groomer)] font-bold text-sm flex-shrink-0">
            {(groomer.name ?? "G")[0].toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-[var(--ink)]">
                {groomer.name ?? t("findGroomerFallback")}
              </p>
              {groomer.isVerified && <VerifiedBadge />}
              <AcceptingBadge accepting={groomer.isAcceptingClients} />
              <StarRating avg={groomer.avgRating} count={groomer.reviewCount} />
            </div>
            {groomer.salonName && (
              <p className="text-sm text-[var(--role-groomer)] mt-0.5">{groomer.salonName}</p>
            )}
            {groomer.priceFrom != null && (
              <p className="text-sm text-[var(--accent)] mt-0.5 font-medium">
                {t("findPriceFrom", { price: formatPrice(groomer.priceFrom, locale) })}
              </p>
            )}
          </div>
        </div>
        {groomer.isAcceptingClients && (
          <button
            onClick={() =>
              onBook({
                professionalId: groomer.userId,
                name: groomer.name,
                role: "groomer",
                pricePerDay: null,
                priceFrom: groomer.priceFrom,
              })
            }
            className="btn-primary text-sm flex items-center gap-1.5 px-3 py-1.5 flex-shrink-0"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            {t("book")}
          </button>
        )}
      </div>
      {groomer.services && (
        <p className="text-sm text-[var(--muted)] mt-2">{formatServices(groomer.services, t)}</p>
      )}
      {(groomer.city || groomer.country) && (
        <div className="flex items-center gap-1.5 mt-1 text-sm text-[var(--muted)]">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{[groomer.city, groomer.country].filter(Boolean).join(", ")}</span>
        </div>
      )}
      {groomer.bio && <p className="text-sm text-[var(--ink2)] mt-2 line-clamp-2">{groomer.bio}</p>}
      {groomer.phone && (
        <div className="flex items-center gap-1.5 mt-1.5 text-sm text-[var(--muted)]">
          <Phone className="w-3.5 h-3.5 flex-shrink-0" />
          <a href={`tel:${groomer.phone}`} className="hover:text-[var(--teal)] transition-colors">
            {groomer.phone}
          </a>
        </div>
      )}
    </div>
  );
}

/** Inclusive date-range overlap against the professional's busy ranges. */
function datesClash(start: string, end: string, busy: { start: string; end: string }[]): boolean {
  return busy.some((r) => start <= r.end && end >= r.start);
}

const VET_SLOTS = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

function BookingModal({
  target,
  pets,
  onClose,
}: {
  target: BookingTarget;
  pets: PetOption[];
  onClose: () => void;
}) {
  const t = useTranslations("portal");
  const locale = useLocale();
  const isSitter = target.role === "pet_sitter";
  const todayStr = new Date().toISOString().slice(0, 10);

  const [petId, setPetId] = useState(pets[0]?.id ?? "");
  // Sitter: date range (drop-off morning, pick-up evening). Vet: one date + slot.
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [slot, setSlot] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<{ start: string; end: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/bookings/busy?professionalId=${target.professionalId}`)
      .then((r) => r.json())
      .then(({ success, data }) => {
        if (success) setBusy(data);
      })
      .catch(() => {});
  }, [target.professionalId]);

  const effectiveEnd = isSitter ? endDate : startDate;
  const clash = Boolean(startDate && effectiveEnd) && datesClash(startDate, effectiveEnd, busy);

  const nights =
    isSitter && startDate && endDate
      ? Math.max(
          0,
          Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000),
        )
      : 0;
  const totalCents = nights > 0 && target.pricePerDay != null ? nights * target.pricePerDay : null;

  const ready =
    Boolean(petId) &&
    Boolean(startDate) &&
    !clash &&
    (isSitter ? Boolean(endDate) && endDate > startDate : Boolean(slot));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    // Sitter stays span whole days (drop off 9:00, pick up 17:00); vet visits
    // are one-hour appointments at the chosen slot. Local time, sent as ISO.
    const start = isSitter ? new Date(`${startDate}T09:00`) : new Date(`${startDate}T${slot}`);
    const end = isSitter
      ? new Date(`${endDate}T17:00`)
      : new Date(new Date(`${startDate}T${slot}`).getTime() + 60 * 60 * 1000);
    setSaving(true);
    setError("");
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        petId,
        professionalId: target.professionalId,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        notes: notes.trim() || undefined,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) {
      setSuccess(true);
    } else {
      setError(data.error ?? t("findBookingFailed"));
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-panel">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--border)]">
          <div>
            <h2 className="font-semibold text-[var(--ink)]">
              {t("findBookTitle", { name: target.name ?? t("findProfessional") })}
            </h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {isSitter
                ? target.pricePerDay != null
                  ? `${t("petSitters")} · ${formatPrice(target.pricePerDay, locale)}${t("findPerDay")}`
                  : t("petSitters")
                : target.role === "groomer"
                  ? target.priceFrom != null
                    ? `${t("findGroomerVisitHint")} · ${t("findPriceFrom", { price: formatPrice(target.priceFrom, locale) })}`
                    : t("findGroomerVisitHint")
                  : t("findVetVisitHint")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 -me-2 text-[var(--muted)] hover:text-[var(--ink)] transition-colors rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="px-5 py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--green-bg)] flex items-center justify-center mx-auto mb-3">
              <CalendarPlus className="w-6 h-6 text-[var(--green-text)]" />
            </div>
            <p className="font-medium text-[var(--ink)] mb-1">{t("findBookingSuccess")}</p>
            <p className="text-sm text-[var(--muted)] mb-4">{t("findBookingSuccessDesc")}</p>
            <div className="flex flex-col gap-2">
              <Link href="/portal/bookings" className="btn-primary w-full text-center">
                {t("findViewBookings")}
              </Link>
              <button onClick={onClose} className="btn-outline w-full">
                {t("findDone")}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            {error && <p className="alert-error">{error}</p>}

            {/* Pet: silent when there is only one — no decisions the user can't get wrong */}
            {pets.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                {t("noPets")}{" "}
                <Link href="/portal/pets/new" className="text-[var(--teal)] hover:underline">
                  {t("noPetsAction")}
                </Link>
              </p>
            ) : pets.length === 1 ? (
              <p className="text-sm text-[var(--ink2)]">
                {t("findForPet", { name: pets[0].name ?? t("unnamedPet") })}
              </p>
            ) : (
              <div>
                <label className="form-label">{t("findPetLabel")} *</label>
                <select
                  className="form-input"
                  value={petId}
                  onChange={(e) => setPetId(e.target.value)}
                  required
                >
                  {pets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name ?? t("unnamedPet")}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isSitter ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">{t("findDropOff")} *</label>
                  <DateInput
                    type="date"
                    className="form-input"
                    value={startDate}
                    min={todayStr}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (endDate && endDate <= e.target.value) setEndDate("");
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">{t("findPickUp")} *</label>
                  <DateInput
                    type="date"
                    className="form-input"
                    value={endDate}
                    min={startDate || todayStr}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="form-label">{t("findVisitDate")} *</label>
                  <DateInput
                    type="date"
                    className="form-input"
                    value={startDate}
                    min={todayStr}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                {startDate && (
                  <div>
                    <label className="form-label">{t("findVisitTime")} *</label>
                    <div className="flex flex-wrap gap-2">
                      {VET_SLOTS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSlot(s)}
                          className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                            slot === s
                              ? "bg-[var(--teal)] text-white border-[var(--teal)]"
                              : "bg-white text-[var(--ink2)] border-[var(--border)] hover:border-[var(--teal)]"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Availability feedback BEFORE submitting, not after */}
            {clash && <p className="alert-error text-sm">{t("findDatesUnavailable")}</p>}
            {!clash && busy.length > 0 && (
              <p className="text-xs text-[var(--muted)]">
                {t("findBusyHint", {
                  dates: busy
                    .slice(0, 3)
                    .map((r) =>
                      r.start === r.end
                        ? formatDateShort(r.start, locale)
                        : `${formatDateShort(r.start, locale)} – ${formatDateShort(r.end, locale)}`,
                    )
                    .join(", "),
                })}
              </p>
            )}

            {/* Price: the total, before any commitment */}
            {isSitter && nights > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-[var(--off)] px-3 py-2 text-sm">
                <span className="text-[var(--ink2)]">
                  {t("findNightsCount", { count: nights })}
                  {target.pricePerDay != null && ` × ${formatPrice(target.pricePerDay, locale)}`}
                </span>
                {totalCents != null && (
                  <span className="font-semibold text-[var(--ink)]">
                    {formatPrice(totalCents, locale)}
                  </span>
                )}
              </div>
            )}

            <div>
              <label className="form-label">{t("findBookingNotesLabel")}</label>
              <textarea
                className="form-input min-h-[72px] resize-none"
                placeholder={t("findBookingNotesPlaceholder")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pb-1">
              <button type="button" onClick={onClose} className="btn-outline flex-1">
                {t("cancel")}
              </button>
              <button
                type="submit"
                disabled={saving || !ready}
                className="btn-primary flex-1 disabled:opacity-60"
              >
                {saving ? t("findBookingInProgress") : t("findRequestBooking")}
              </button>
            </div>
            <p className="text-xs text-[var(--muted)] text-center pb-1">
              {t("findRequestExplainer")}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
