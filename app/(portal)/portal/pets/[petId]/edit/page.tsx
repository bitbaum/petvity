"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { SPECIES_CONFIG } from "@/lib/config/species";
import { IMAGE_ACCEPT_ATTR } from "@/lib/config/uploads";
import type { SpeciesId, SexId } from "@/lib/config/species";
import Link from "next/link";
import { Trash2, Camera, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import PageHeader from "@/components/portal/PageHeader";
import { UploadedImage } from "@/components/ui/UploadedImage";
import {
  PetBioField,
  PetBirthDateAndSexFields,
  PetBreedField,
  PetNameField,
  PetPublicToggle,
  type PetFormValues,
} from "@/components/portal/PetFormFields";

interface PetData {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  birthDate: string | null;
  sex: SexId;
  bio: string | null;
  isPublic: boolean;
  handle: string | null;
  avatarUrl: string | null;
}

/** The shared pet fields plus the one this page owns: a public handle. */
type EditPetForm = PetFormValues & { handle: string };

export default function EditPetPage() {
  const t = useTranslations("portal");
  const tPub = useTranslations("public");
  const router = useRouter();
  const { petId } = useParams<{ petId: string }>();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  const [form, setForm] = useState<EditPetForm>({
    name: "",
    species: "",
    breed: "",
    birthDate: "",
    sex: "unknown",
    bio: "",
    isPublic: false,
    handle: "",
  });
  const patch = (values: Partial<EditPetForm>) => setForm({ ...form, ...values });

  useEffect(() => {
    fetch(`/api/pets/${petId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const p: PetData = data.data;
          setAvatarUrl(p.avatarUrl);
          setForm({
            name: p.name,
            species: p.species as SpeciesId,
            breed: p.breed ?? "",
            birthDate: p.birthDate ?? "",
            sex: p.sex,
            bio: p.bio ?? "",
            isPublic: p.isPublic,
            handle: p.handle ?? "",
          });
        }
        setLoading(false);
      });
  }, [petId]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview immediately via object URL
    const preview = URL.createObjectURL(file);
    setAvatarUrl(preview);
    setAvatarError("");
    setAvatarUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/pets/${petId}/avatar`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setAvatarUploading(false);

    if (data.success) {
      URL.revokeObjectURL(preview);
      setAvatarUrl(data.data.url);
    } else {
      setAvatarError(data.error ?? t("editPetUploadFailed"));
      setAvatarUrl(null);
    }
    // Reset input so the same file can be re-selected
    e.target.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload: Record<string, unknown> = {
      name: form.name,
      sex: form.sex,
      bio: form.bio || undefined,
      isPublic: form.isPublic,
    };
    if (form.breed) payload.breed = form.breed;
    if (form.birthDate) payload.birthDate = form.birthDate;
    if (form.handle) payload.handle = form.handle.toLowerCase().replace(/\s+/g, "-");

    const res = await fetch(`/api/pets/${petId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);

    if (!data.success) {
      setError(data.error ?? t("editPetSaveFailed"));
    } else {
      router.push(`/portal/pets/${petId}`);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/pets/${petId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      router.push("/portal/pets");
    } else {
      setError(t("editPetDeleteFailed"));
      setDeleting(false);
    }
  }

  // The header says nothing that depends on the pet being loaded, so it paints
  // straight away and only the form waits. Replacing the whole page with a
  // loading line meant the first thing a person saw had no title, no way back,
  // and nothing to say which pet they were about to edit.
  const header = (
    <PageHeader
      title={t("editPetTitle")}
      purpose={t("editPetPurpose")}
      back={{ href: `/portal/pets/${petId}`, label: t("editPetBack") }}
    />
  );

  if (loading) {
    return (
      <div className="max-w-lg">
        {header}
        <div className="space-y-5" aria-busy="true" aria-label={t("editPetLoading")}>
          <div className="card h-24 animate-pulse bg-[var(--off)]" />
          <div className="card h-80 animate-pulse bg-[var(--off)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      {header}

      {error && <p className="alert-error mb-4">{error}</p>}

      {/* Avatar upload */}
      <div className="card p-6 mb-5 flex items-center gap-5">
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-2xl bg-[var(--off)] border border-[var(--border)] overflow-hidden flex items-center justify-center text-3xl">
            {avatarUrl ? (
              <UploadedImage
                src={avatarUrl}
                alt="Pet avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              (SPECIES_CONFIG[form.species as SpeciesId]?.emoji ?? "🐾")
            )}
          </div>
          {avatarUploading && (
            <div className="absolute inset-0 rounded-2xl bg-white/70 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-[var(--teal)] animate-spin" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--ink)] mb-1">{t("editPetPhoto")}</p>
          <p className="text-xs text-[var(--muted)] mb-3">{t("editPetPhotoHint")}</p>
          {avatarError && <p className="text-xs text-[var(--danger-text)] mb-2">{avatarError}</p>}
          <input
            ref={fileInputRef}
            type="file"
            accept={IMAGE_ACCEPT_ATTR}
            className="sr-only"
            onChange={handleAvatarChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            className="btn-outline text-sm py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-60"
          >
            <Camera className="w-3.5 h-3.5" />
            {avatarUrl ? t("editPetChangePhoto") : t("editPetUploadPhoto")}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-5">
        <PetNameField form={form} onChange={patch} />

        {/* Species (read-only after creation) */}
        <div>
          <label className="form-label">{t("petSpeciesLabel")}</label>
          <div className="form-input bg-[var(--light)] text-[var(--muted)] cursor-not-allowed">
            {form.species
              ? `${SPECIES_CONFIG[form.species as SpeciesId]?.emoji ?? ""} ${tPub(`species_${form.species}` as Parameters<typeof tPub>[0])}`
              : form.species}
          </div>
          <p className="text-xs text-[var(--muted)] mt-1">{t("editPetSpeciesHint")}</p>
        </div>

        <PetBreedField form={form} onChange={patch} />
        <PetBirthDateAndSexFields form={form} onChange={patch} />
        <PetBioField form={form} onChange={patch} placeholder={t("editPetBioPlaceholder")} />

        {/* Public handle */}
        <div>
          <label className="form-label">{t("editPetHandle")}</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--muted)]">petvity.com/pets/</span>
            <input
              type="text"
              value={form.handle}
              onChange={(e) =>
                patch({ handle: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })
              }
              placeholder="fluffy-the-dog"
              pattern="[a-z0-9-]+"
              className="form-input flex-1"
            />
          </div>
          <p className="text-xs text-[var(--muted)] mt-1">{t("editPetHandleHint")}</p>
        </div>

        <PetPublicToggle
          form={form}
          onChange={patch}
          label={t("editPetPublicLabel")}
          description={t("editPetPublicDesc")}
        />

        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? t("saving") : t("editPetSave")}
          </button>
          <Link href={`/portal/pets/${petId}`} className="btn-outline">
            {t("cancel")}
          </Link>
        </div>
      </form>

      {/* Danger zone */}
      <div id="danger" className="mt-8 card p-5 border-[var(--danger-bg)] scroll-mt-20">
        <h3 className="text-sm font-semibold text-[var(--danger-text)] mb-1">
          {t("editPetDangerZone")}
        </h3>
        <p className="text-sm text-[var(--muted)] mb-4">{t("editPetDangerDesc")}</p>
        {confirmDelete ? (
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 bg-[var(--danger)] text-white border-none rounded-[10px] px-4 py-2 text-sm font-semibold cursor-pointer transition-opacity disabled:opacity-60"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? t("editPetDeleting") : t("editPetDeleteConfirm")}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="btn-outline text-sm">
              {t("cancel")}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-2 text-[var(--danger-text)] border border-[var(--danger)] bg-transparent rounded-[10px] px-4 py-2 text-sm font-semibold cursor-pointer hover:bg-[var(--danger-bg)] transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {t("editPetDeleteTrigger")}
          </button>
        )}
      </div>
    </div>
  );
}
