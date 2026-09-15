"use client";

import { useTranslations } from "next-intl";

/**
 * The labelled text input, and the city/country/phone trio, that every
 * professional-profile form asks for.
 *
 * `ProfessionalProfileForm` carried the same four-field grid twice — once for a
 * vet's practice, once for a sitter's or groomer's services — which jscpd
 * reported as a 40-line clone of the file against itself. Two copies inside ONE
 * file is the worst kind: a reviewer reads the first, recognises it, and skims the
 * second, so that is exactly where "city" kept its label and lost its
 * placeholder.
 */

export function ProfileTextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength,
  min,
  step,
  hint,
  className,
}: {
  /** A node, so a caller can put an icon in front of the words. */
  label: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "tel" | "url" | "number";
  maxLength?: number;
  min?: string;
  step?: string;
  hint?: string;
  /** Grid placement — the only styling a caller gets to decide. */
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="form-label">{label}</label>
      <input
        type={type}
        className="form-input"
        placeholder={placeholder}
        maxLength={maxLength}
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? <p className="text-xs text-[var(--muted)] mt-1">{hint}</p> : null}
    </div>
  );
}

export interface ContactValues {
  city: string;
  country: string;
  phone: string;
}

/**
 * Where to reach this professional. A fragment, not a wrapper: the caller owns
 * the grid these cells sit in.
 *
 * `country` is passed through as typed: the professional-profile route takes the
 * first two characters and upper-cases them on submit, so normalising here would
 * be a second opinion about the same value.
 */
export function ContactFields({
  values,
  onChange,
}: {
  values: ContactValues;
  onChange: (patch: Partial<ContactValues>) => void;
}) {
  const t = useTranslations("portal");
  return (
    <>
      <ProfileTextField
        label={t("profCity")}
        placeholder={t("profCityPlaceholder")}
        value={values.city}
        onChange={(city) => onChange({ city })}
      />
      <ProfileTextField
        label={t("profCountry")}
        placeholder={t("profCountryPlaceholder")}
        maxLength={2}
        value={values.country}
        onChange={(country) => onChange({ country })}
      />
      <ProfileTextField
        label={t("profPhone")}
        placeholder={t("profPhonePlaceholder")}
        value={values.phone}
        onChange={(phone) => onChange({ phone })}
      />
    </>
  );
}
