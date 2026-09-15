"use client";

import { SEX_OPTIONS, getBreedOptions } from "@/lib/config/species";
import type { SpeciesId, SexId } from "@/lib/config/species";
import { useTranslations } from "next-intl";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";

/**
 * The fields "add a pet" and "edit a pet" render identically.
 *
 * The two pages are genuinely different — one creates and can send you on to the
 * first health log, the other uploads an avatar, owns a handle and a delete zone
 * — but the middle of both forms was the same 120 lines twice. Which means a new
 * species field, a changed breed control or a fixed label had to be applied in
 * two places, and the two only stayed identical by luck.
 *
 * Each field takes the whole form plus a patch callback rather than a value and a
 * setter: the pages hold one `useState` object (the edit page's also carries
 * `handle`), so a patch is what they can actually apply.
 */

export interface PetFormValues {
  name: string;
  species: SpeciesId | "";
  breed: string;
  birthDate: string;
  sex: SexId;
  bio: string;
  isPublic: boolean;
}

interface FieldProps {
  form: PetFormValues;
  onChange: (patch: Partial<PetFormValues>) => void;
}

export function PetNameField({
  form,
  onChange,
  placeholder,
}: FieldProps & { placeholder?: string }) {
  const t = useTranslations("portal");
  return (
    <div>
      <label className="form-label">{t("petNameLabel")} *</label>
      <input
        type="text"
        required
        value={form.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder={placeholder}
        className="form-input"
      />
    </div>
  );
}

/**
 * Renders nothing when the chosen species has no curated breed list — the same
 * `breedOptions.length > 0` guard both pages had, kept with the field it guards.
 */
export function PetBreedField({ form, onChange }: FieldProps) {
  const t = useTranslations("portal");
  const breedOptions = form.species ? getBreedOptions(form.species) : [];
  if (breedOptions.length === 0) return null;
  return (
    <div>
      <label className="form-label">{t("petBreedLabel")}</label>
      <select
        value={form.breed}
        onChange={(e) => onChange({ breed: e.target.value })}
        className="form-input"
      >
        <option value="">{t("petBreedUnknown")}</option>
        {breedOptions.map((b) => (
          <option key={b.value} value={b.value}>
            {b.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function PetBirthDateAndSexFields({ form, onChange }: FieldProps) {
  const t = useTranslations("portal");
  const tPub = useTranslations("public");
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="form-label">{t("petBirthDate")}</label>
        <input
          type="date"
          value={form.birthDate}
          onChange={(e) => onChange({ birthDate: e.target.value })}
          className="form-input"
        />
      </div>
      <div>
        <label className="form-label">{t("petSex")}</label>
        <select
          value={form.sex}
          onChange={(e) => onChange({ sex: e.target.value as SexId })}
          className="form-input"
        >
          {SEX_OPTIONS.map(({ value }) => (
            <option key={value} value={value}>
              {tPub(`sex_${value}` as Parameters<typeof tPub>[0])}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function PetBioField({
  form,
  onChange,
  placeholder,
  markOptional = false,
}: FieldProps & { placeholder: string; markOptional?: boolean }) {
  const t = useTranslations("portal");
  return (
    <div>
      <label className="form-label">
        {t("petBioLabel")}
        {markOptional ? (
          <>
            {" "}
            <span className="text-[var(--faint)] font-normal">{t("listOptional")}</span>
          </>
        ) : null}
      </label>
      <textarea
        rows={3}
        value={form.bio}
        onChange={(e) => onChange({ bio: e.target.value })}
        placeholder={placeholder}
        className="form-input resize-none"
      />
    </div>
  );
}

export function PetPublicToggle({
  form,
  onChange,
  label,
  description,
}: FieldProps & { label: string; description: string }) {
  return (
    <ToggleSwitch
      checked={form.isPublic}
      onChange={(isPublic) => onChange({ isPublic })}
      label={label}
      description={description}
    />
  );
}
