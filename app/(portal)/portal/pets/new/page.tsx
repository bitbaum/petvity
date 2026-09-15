"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SPECIES_OPTIONS, SPECIES_CONFIG } from "@/lib/config/species";
import type { SpeciesId } from "@/lib/config/species";
import { PawPrint } from "lucide-react";
import { useTranslations } from "next-intl";
import PageHeader from "@/components/portal/PageHeader";
import {
  PetBioField,
  PetBirthDateAndSexFields,
  PetBreedField,
  PetNameField,
  PetPublicToggle,
  type PetFormValues,
} from "@/components/portal/PetFormFields";

function NewPetForm() {
  const t = useTranslations("portal");
  const tPub = useTranslations("public");
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromRegistration = searchParams.get("from") === "registration";

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<PetFormValues>({
    name: "",
    species: "",
    breed: "",
    birthDate: "",
    sex: "unknown",
    bio: "",
    isPublic: false,
  });
  const patch = (values: Partial<PetFormValues>) => setForm({ ...form, ...values });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.species) {
      setError(t("newPetSelectSpecies"));
      return;
    }
    setSaving(true);
    setError("");

    const res = await fetch("/api/pets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        species: form.species || undefined,
        breed: form.breed || undefined,
        birthDate: form.birthDate || undefined,
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!data.success) {
      setError(data.error ?? t("newPetFailed"));
    } else if (fromRegistration) {
      router.push(`/portal/pets/${data.data.id}/health/log`);
    } else {
      router.push(`/portal/pets/${data.data.id}`);
    }
  }

  return (
    <div className="max-w-lg">
      {fromRegistration ? (
        <div className="flex items-start gap-3 rounded-2xl bg-[var(--teal-light)] border border-[var(--teal)] px-5 py-4 mb-6">
          <div className="w-9 h-9 rounded-xl bg-[var(--teal)] flex items-center justify-center flex-shrink-0 mt-0.5">
            <PawPrint className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--teal)]">{t("newPetWelcomeTitle")}</p>
            <p className="text-xs text-[var(--ink2)] mt-0.5">{t("newPetWelcomeSubtitle")}</p>
          </div>
        </div>
      ) : null}

      {/* Coming from registration there is nowhere to go "back" to yet — the
          welcome card above stands in for it. */}
      <PageHeader
        title={t("addPet")}
        purpose={t("newPetSubtitle")}
        back={fromRegistration ? undefined : { href: "/portal/pets", label: t("myPets") }}
      />

      {error && <p className="alert-error mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-5">
        {/* Species first — it drives the breed options, and it is the one field
            the edit page cannot offer, so it stays here rather than in the
            shared set. */}
        <div>
          <label className="form-label">{t("petSpeciesLabel")} *</label>
          <select
            required
            value={form.species}
            onChange={(e) => patch({ species: e.target.value as SpeciesId, breed: "" })}
            className="form-input"
          >
            <option value="">{t("newPetChooseType")}</option>
            {SPECIES_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {SPECIES_CONFIG[s.value as SpeciesId].emoji}{" "}
                {tPub(`species_${s.value}` as Parameters<typeof tPub>[0])}
              </option>
            ))}
          </select>
        </div>

        <PetNameField form={form} onChange={patch} placeholder={t("newPetNamePlaceholder")} />
        <PetBreedField form={form} onChange={patch} />
        <PetBirthDateAndSexFields form={form} onChange={patch} />
        <PetBioField
          form={form}
          onChange={patch}
          placeholder={t("newPetBioPlaceholder")}
          markOptional
        />
        <PetPublicToggle
          form={form}
          onChange={patch}
          label={t("newPetPublicLabel")}
          description={t("newPetPublicDesc")}
        />

        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? t("saving") : t("newPetAdd")}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-outline">
            {t("cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewPetPage() {
  return (
    <Suspense>
      <NewPetForm />
    </Suspense>
  );
}
