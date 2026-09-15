"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Phone, MapPin, Package, ToggleRight } from "lucide-react";
import { useTranslations } from "next-intl";
import PageHeader from "@/components/portal/PageHeader";
import { ProfileTextField } from "@/components/portal/ProfileFields";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";

interface SellerProfile {
  id: string;
  displayName: string | null;
  bio: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  website: string | null;
  isActive: boolean;
}

interface Props {
  initialData: SellerProfile | null;
  userName: string | null;
}

export default function SellerProfileForm({ initialData, userName }: Props) {
  const t = useTranslations("portal");
  const router = useRouter();
  const isNew = !initialData;

  const [form, setForm] = useState({
    displayName: initialData?.displayName ?? userName ?? "",
    bio: initialData?.bio ?? "",
    city: initialData?.city ?? "",
    country: initialData?.country ?? "",
    phone: initialData?.phone ?? "",
    website: initialData?.website ?? "",
    isActive: initialData?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const patch = (values: Partial<typeof form>) => setForm((f) => ({ ...f, ...values }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

    const payload = {
      displayName: form.displayName || null,
      bio: form.bio || null,
      city: form.city || null,
      country: form.country || null,
      phone: form.phone || null,
      website: form.website || null,
      isActive: form.isActive,
    };

    const res = await fetch("/api/sellers/me", {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);

    if (!data.success) {
      setError(data.error ?? t("sellerSaveFailed"));
    } else {
      setSuccess(true);
      if (isNew) {
        // The profile exists now, so the server component that renders this form
        // has to fetch it again — the page switches from "become a seller" to
        // "your seller profile". `router.refresh()` re-runs that render in place;
        // assigning window.location.href reloaded the whole document to reach the
        // URL we are already on.
        router.refresh();
      }
    }
  }

  return (
    <div className="max-w-lg">
      <PageHeader
        title={isNew ? t("becomeSeller") : t("sellerProfile")}
        purpose={isNew ? t("sellerSetupSubtitle") : t("sellerProfilePurpose")}
      />

      {isNew && (
        <div className="card p-4 mb-5 border-[var(--teal)] bg-[var(--teal-light)]">
          <div className="flex gap-3">
            <Package className="w-5 h-5 text-[var(--teal)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[var(--teal)]">{t("sellerInfoTitle")}</p>
              <p className="text-xs text-[var(--ink2)] mt-0.5">{t("sellerInfoBody")}</p>
            </div>
          </div>
        </div>
      )}

      {error && <p className="alert-error mb-4">{error}</p>}
      {success && !isNew && <p className="alert-success mb-4">{t("sellerSavedSuccess")}</p>}

      <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-5">
        {/* Store name */}
        <ProfileTextField
          label={t("sellerStoreNameLabel")}
          value={form.displayName}
          onChange={(displayName) => patch({ displayName })}
          placeholder={t("sellerStoreNamePlaceholder")}
          hint={t("sellerStoreNameHint")}
        />

        {/* Bio */}
        <div>
          <label className="form-label">{t("sellerBioLabel")}</label>
          <textarea
            rows={3}
            value={form.bio}
            onChange={(e) => patch({ bio: e.target.value })}
            placeholder={t("sellerBioPlaceholder")}
            className="form-input resize-none"
          />
        </div>

        {/* City + Country */}
        <div className="grid grid-cols-2 gap-4">
          <ProfileTextField
            label={
              <>
                <MapPin className="w-3.5 h-3.5 inline me-1" />
                {t("profCity")}
              </>
            }
            value={form.city}
            onChange={(city) => patch({ city })}
            placeholder={t("profCityPlaceholder")}
          />
          <ProfileTextField
            label={t("profCountry")}
            value={form.country}
            onChange={(country) => patch({ country: country.toUpperCase().slice(0, 2) })}
            placeholder={t("profCountryPlaceholder")}
            maxLength={2}
          />
        </div>

        {/* Phone + Website */}
        <div className="grid grid-cols-2 gap-4">
          <ProfileTextField
            type="tel"
            label={
              <>
                <Phone className="w-3.5 h-3.5 inline me-1" />
                {t("profPhone")}
              </>
            }
            value={form.phone}
            onChange={(phone) => patch({ phone })}
            placeholder={t("profPhonePlaceholder")}
          />
          <ProfileTextField
            type="url"
            label={
              <>
                <Globe className="w-3.5 h-3.5 inline me-1" />
                {t("sellerWebsiteLabel")}
              </>
            }
            value={form.website}
            onChange={(website) => patch({ website })}
            placeholder={t("sellerWebsitePlaceholder")}
          />
        </div>

        {/* Active toggle (only shown after creation) */}
        {!isNew && (
          <ToggleSwitch
            checked={form.isActive}
            onChange={(isActive) => patch({ isActive })}
            label={
              <span className="flex items-center gap-1.5">
                <ToggleRight className="w-3.5 h-3.5" />
                {t("sellerActiveLabel")}
              </span>
            }
            description={t("sellerActiveHint")}
          />
        )}

        <div className="pt-1">
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? t("sellerSaving") : isNew ? t("sellerActivateButton") : t("sellerSaveButton")}
          </button>
        </div>
      </form>
    </div>
  );
}
