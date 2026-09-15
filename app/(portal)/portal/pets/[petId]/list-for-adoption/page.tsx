"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import PageHeader from "@/components/portal/PageHeader";

interface Pet {
  id: string;
  name: string;
  species: string;
}

interface FormState {
  title: string;
  description: string;
  feeDollars: string;
  location: string;
  requiresExperience: boolean;
  goodWithKids: boolean | null;
  goodWithDogs: boolean | null;
  goodWithCats: boolean | null;
}

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  feeDollars: "",
  location: "",
  requiresExperience: false,
  goodWithKids: null,
  goodWithDogs: null,
  goodWithCats: null,
};

function TriState({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean | null) => void;
}) {
  const t = useTranslations("portal");
  return (
    <div>
      <p className="text-sm font-medium text-[var(--ink2)] mb-2">{label}</p>
      <div className="flex gap-2">
        {(["yes", "no", "unknown"] as const).map((opt) => {
          const mapped = opt === "yes" ? true : opt === "no" ? false : null;
          const active = value === mapped;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(mapped)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                active
                  ? "bg-[var(--teal)] text-white border-[var(--teal)]"
                  : "bg-white text-[var(--muted)] border-[var(--border)] hover:border-[var(--teal)]"
              }`}
            >
              {opt === "yes"
                ? t("listAdoptYes")
                : opt === "no"
                  ? t("listAdoptNo")
                  : t("listAdoptUnknown")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ListForAdoptionPage() {
  const t = useTranslations("portal");
  const { petId } = useParams<{ petId: string }>();
  const router = useRouter();

  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadPet = useCallback(() => {
    setLoading(true);
    setFetchError("");
    fetch(`/api/pets/${petId}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(({ data }) => {
        setPet(data ?? null);
        setLoading(false);
      })
      .catch(() => {
        setFetchError(t("loadFailed"));
        setLoading(false);
      });
  }, [petId, t]);

  useEffect(() => {
    loadPet();
  }, [loadPet]);

  function field<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const feeCents = form.feeDollars === "" ? null : Math.round(parseFloat(form.feeDollars) * 100);

    const res = await fetch("/api/adoptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        petId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        feeCents,
        location: form.location.trim() || null,
        requiresExperience: form.requiresExperience,
        goodWithKids: form.goodWithKids,
        goodWithDogs: form.goodWithDogs,
        goodWithCats: form.goodWithCats,
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!data.success) {
      setError(data.error ?? t("listAdoptFailed"));
      return;
    }
    router.push(`/portal/adoptions`);
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-[var(--off)] rounded w-48" />
        <div className="card h-80" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="card py-12 text-center">
        <p className="text-[var(--danger-text)] font-medium mb-3">{fetchError}</p>
        <button onClick={loadPet} className="btn-outline text-sm">
          {t("retry")}
        </button>
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="card py-16 text-center">
        <p className="font-medium text-[var(--ink)]">{t("listAdoptPetNotFound")}</p>
        <Link href="/portal/pets" className="btn-primary mt-4">
          {t("myPets")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        back={{ href: `/portal/pets/${petId}`, label: pet.name }}
        title={t("listAdoptTitle", { name: pet.name })}
        purpose={t("listAdoptSubtitle", { name: pet.name })}
      />

      <div className="card p-6">
        {error && <p className="alert-error mb-5">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="form-label">
              {t("listAdoptHeadline")} <span className="text-[var(--danger-text)]">*</span>
            </label>
            <input
              className="form-input"
              required
              placeholder={t("listAdoptHeadlinePlaceholder", { name: pet.name })}
              value={form.title}
              onChange={(e) => field("title", e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label className="form-label">
              {t("listAdoptAbout", { name: pet.name })}
              <span className="text-[var(--muted)] font-normal ms-1">{t("listOptional")}</span>
            </label>
            <textarea
              className="form-input min-h-[120px] resize-y"
              placeholder={t("listAdoptAboutPlaceholder", { name: pet.name })}
              value={form.description}
              onChange={(e) => field("description", e.target.value)}
            />
          </div>

          {/* Location + fee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                {t("listAdoptLocation")}{" "}
                <span className="text-[var(--muted)] font-normal ms-1">{t("listOptional")}</span>
              </label>
              <input
                className="form-input"
                placeholder={t("listAdoptLocationPlaceholder")}
                value={form.location}
                onChange={(e) => field("location", e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">
                {t("listAdoptFeeLabel")}
                <span className="text-[var(--muted)] font-normal ms-1">
                  {t("listAdoptFeeHint")}
                </span>
              </label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.feeDollars}
                onChange={(e) => field("feeDollars", e.target.value)}
              />
            </div>
          </div>

          {/* Traits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TriState
              label={t("listAdoptGoodWithKids")}
              value={form.goodWithKids}
              onChange={(v) => field("goodWithKids", v)}
            />
            <TriState
              label={t("listAdoptGoodWithDogs")}
              value={form.goodWithDogs}
              onChange={(v) => field("goodWithDogs", v)}
            />
            <TriState
              label={t("listAdoptGoodWithCats")}
              value={form.goodWithCats}
              onChange={(v) => field("goodWithCats", v)}
            />
            <div>
              <p className="text-sm font-medium text-[var(--ink2)] mb-2">
                {t("listAdoptExpRequired")}
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-[var(--teal)]"
                  checked={form.requiresExperience}
                  onChange={(e) => field("requiresExperience", e.target.checked)}
                />
                <span className="text-sm text-[var(--ink2)]">{t("listAdoptExpOwners")}</span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex items-center gap-2 disabled:opacity-60"
            >
              <Heart className="w-4 h-4" />
              {saving ? t("listAdoptCreating") : t("listAdoptCreate")}
            </button>
            <Link href={`/portal/pets/${petId}`} className="btn-outline">
              {t("cancel")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
