"use client";

import { useState, useTransition, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  User,
  Lock,
  CheckCircle,
  Mail,
  AlertTriangle,
  X,
  Download,
  Store,
  Stethoscope,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { PasswordInput } from "@/components/portal/PasswordInput";
import PageHeader from "@/components/portal/PageHeader";

export default function SettingsPage() {
  const t = useTranslations("portal");
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [, startTransition] = useTransition();

  /* ── Profile section ─────────────────────────────────────────────────── */
  const [name, setName] = useState(session?.user?.name ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // The session loads async — fill the field once it arrives, unless the user
  // has already started typing.
  const sessionName = session?.user?.name ?? "";
  useEffect(() => {
    setName((current) => current || sessionName);
  }, [sessionName]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    setProfileSaving(true);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const data = await res.json();
    setProfileSaving(false);
    if (data.success) {
      setProfileMsg({ ok: true, text: t("settingsNameUpdated") });
      await updateSession({ name: name.trim() });
      startTransition(() => router.refresh());
    } else {
      setProfileMsg({ ok: false, text: data.error ?? t("settingsUpdateFailed") });
    }
  }

  /* ── Email preferences section ───────────────────────────────────────── */
  const [digestOptOut, setDigestOptOut] = useState<boolean | null>(null);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/account")
      .then((r) => r.json())
      .then(({ data }) => setDigestOptOut(Boolean(data?.digestOptOut)))
      .catch(() => setDigestOptOut(false));
  }, []);

  async function toggleWeeklyDigest(next: boolean) {
    setDigestOptOut(next);
    setEmailMsg(null);
    setEmailSaving(true);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ digestOptOut: next }),
    });
    const data = await res.json();
    setEmailSaving(false);
    if (data.success) {
      setEmailMsg({
        ok: true,
        text: next ? t("settingsDigestUnsubscribed") : t("settingsDigestResubscribed"),
      });
    } else {
      // Roll back UI on failure
      setDigestOptOut(!next);
      setEmailMsg({ ok: false, text: data.error ?? t("settingsUpdateFailed") });
    }
  }

  /* ── Password section ────────────────────────────────────────────────── */
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (newPw !== confirmPw) {
      setPwMsg({ ok: false, text: t("settingsPwNoMatch") });
      return;
    }
    setPwSaving(true);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    });
    const data = await res.json();
    setPwSaving(false);
    if (data.success) {
      setPwMsg({ ok: true, text: t("settingsPwChanged") });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } else {
      setPwMsg({ ok: false, text: data.error ?? t("settingsPwChangeFailed") });
    }
  }

  /* ── Account deletion section ────────────────────────────────────────── */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePw, setDeletePw] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");

  function openDeleteModal() {
    setDeletePw("");
    setDeleteConfirm("");
    setDeleteErr("");
    setShowDeleteModal(true);
  }

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setDeleteErr("");
    setDeleting(true);
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: deletePw, confirm: deleteConfirm }),
    });
    const data = await res.json();
    if (!data.success) {
      setDeleting(false);
      setDeleteErr(data.error ?? t("settingsDeletionFailed"));
      return;
    }
    // Account is gone — sign out and land on the marketing home in default locale.
    await signOut({ callbackUrl: "/en" });
  }

  // The session arrives client-side, so this page server-renders before it
  // exists. Returning null for the whole page meant the first paint was blank
  // with nothing to explain it — the header is static, so it renders straight
  // away and only the account cards wait.
  if (!session) {
    return (
      <div className="max-w-lg">
        <PageHeader title={t("settingsTitle")} purpose={t("settingsSubtitle")} />
        <div className="space-y-6" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="card h-40 animate-pulse bg-[var(--off)]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <PageHeader title={t("settingsTitle")} purpose={t("settingsSubtitle")} />
      <div className="space-y-6">
        {/* ── Profile ───────────────────────────────────────────────────── */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="icon-tile bg-[var(--teal-light)]">
              <User className="w-4 h-4 text-[var(--teal)]" />
            </div>
            <h2 className="font-semibold text-[var(--ink)]">{t("settingsProfile")}</h2>
          </div>

          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="form-label">{t("settingsDisplayName")}</label>
              <input
                className="form-input"
                placeholder={t("settingsNamePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="form-label">{t("settingsEmail")}</label>
              <input
                className="form-input bg-[var(--off)] cursor-not-allowed"
                value={session.user?.email ?? ""}
                disabled
                title={t("settingsEmailCannotChange")}
              />
              <p className="text-xs text-[var(--muted)] mt-1">{t("settingsEmailHint")}</p>
            </div>

            <div>
              <label className="form-label">{t("settingsRole")}</label>
              <input
                className="form-input bg-[var(--off)] cursor-not-allowed"
                value={t(`role_${session.user?.role ?? "pet_owner"}` as Parameters<typeof t>[0])}
                disabled
              />
            </div>

            {profileMsg && (
              <p
                className={profileMsg.ok ? "alert-success flex items-center gap-2" : "alert-error"}
              >
                {profileMsg.ok && <CheckCircle className="w-4 h-4 flex-shrink-0" />}
                {profileMsg.text}
              </p>
            )}

            <button
              type="submit"
              disabled={profileSaving}
              className="btn-primary disabled:opacity-60"
            >
              {profileSaving ? t("saving") : t("settingsSaveChanges")}
            </button>
          </form>
        </div>

        {/* ── Email preferences ───────────────────────────────────────── */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="icon-tile bg-[var(--teal-light)]">
              <Mail className="w-4 h-4 text-[var(--teal)]" />
            </div>
            <h2 className="font-semibold text-[var(--ink)]">{t("settingsEmailPrefs")}</h2>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={digestOptOut === true}
              disabled={digestOptOut === null || emailSaving}
              onChange={(e) => toggleWeeklyDigest(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-[var(--border)] text-[var(--teal)] focus:ring-[var(--teal)]"
            />
            <span className="text-sm">
              <span className="font-medium text-[var(--ink)] block">
                {t("settingsDigestOptOut")}
              </span>
              <span className="text-[var(--muted)] block mt-0.5">
                {t("settingsDigestOptOutDesc")}
              </span>
            </span>
          </label>

          {emailMsg && (
            <p
              className={`mt-3 ${emailMsg.ok ? "alert-success flex items-center gap-2" : "alert-error"}`}
            >
              {emailMsg.ok && <CheckCircle className="w-4 h-4 flex-shrink-0" />}
              {emailMsg.text}
            </p>
          )}
        </div>

        {/* ── Password ─────────────────────────────────────────────────── */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="icon-tile bg-[var(--teal-light)]">
              <Lock className="w-4 h-4 text-[var(--teal)]" />
            </div>
            <h2 className="font-semibold text-[var(--ink)]">{t("settingsChangePassword")}</h2>
          </div>

          <form onSubmit={savePassword} className="space-y-4">
            <div>
              <label className="form-label">{t("settingsCurrentPassword")}</label>
              <PasswordInput
                value={currentPw}
                onChange={setCurrentPw}
                autoComplete="current-password"
                required
                placeholder={t("settingsCurrentPwPlaceholder")}
              />
            </div>

            <div>
              <label className="form-label">{t("settingsNewPassword")}</label>
              <PasswordInput
                value={newPw}
                onChange={setNewPw}
                autoComplete="new-password"
                required
              />
            </div>

            <div>
              <label className="form-label">{t("settingsConfirmPassword")}</label>
              <PasswordInput
                value={confirmPw}
                onChange={setConfirmPw}
                autoComplete="new-password"
                required
                placeholder={t("settingsConfirmPwPlaceholder")}
              />
            </div>

            {pwMsg && (
              <p className={pwMsg.ok ? "alert-success flex items-center gap-2" : "alert-error"}>
                {pwMsg.ok && <CheckCircle className="w-4 h-4 flex-shrink-0" />}
                {pwMsg.text}
              </p>
            )}

            <button type="submit" disabled={pwSaving} className="btn-primary disabled:opacity-60">
              {pwSaving ? t("settingsUpdating") : t("settingsUpdatePassword")}
            </button>
          </form>
        </div>

        {/* ── Data export ─────────────────────────────────────────────── */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="icon-tile bg-[var(--teal-light)]">
              <Download className="w-4 h-4 text-[var(--teal)]" />
            </div>
            <h2 className="font-semibold text-[var(--ink)]">{t("settingsYourData")}</h2>
          </div>
          <p className="text-sm text-[var(--muted)] mb-4">{t("settingsYourDataDesc")}</p>
          <a
            href="/api/account/export"
            download
            className="btn-outline inline-flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> {t("settingsDownloadData")}
          </a>
        </div>

        {/* ── Grow with Petvity — where the seller/pro upgrades live now ── */}
        {session?.user?.role === "pet_owner" && (
          <div className="card p-6">
            <h2 className="font-semibold text-[var(--ink)] mb-1">{t("settingsGrowTitle")}</h2>
            <p className="text-sm text-[var(--muted)] mb-4">{t("settingsGrowDesc")}</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Link
                href="/portal/seller-profile"
                className="card card-hover p-4 flex items-center gap-3 no-underline"
              >
                <div className="icon-tile bg-[var(--teal-light)]">
                  <Store className="w-4 h-4 text-[var(--teal)]" />
                </div>
                <span className="text-sm font-medium text-[var(--ink)] flex-1">
                  {t("becomeSeller")}
                </span>
                <ArrowRight className="w-4 h-4 text-[var(--muted)]" />
              </Link>
              <Link
                href="/portal/become-a-pro"
                className="card card-hover p-4 flex items-center gap-3 no-underline"
              >
                <div className="icon-tile bg-[var(--teal-light)]">
                  <Stethoscope className="w-4 h-4 text-[var(--teal)]" />
                </div>
                <span className="text-sm font-medium text-[var(--ink)] flex-1">
                  {t("becomePro")}
                </span>
                <ArrowRight className="w-4 h-4 text-[var(--muted)]" />
              </Link>
            </div>
          </div>
        )}

        {/* ── Danger zone ─────────────────────────────────────────────── */}
        <div className="card p-6 border-[var(--danger)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="icon-tile bg-[var(--danger-bg)]">
              <AlertTriangle className="w-4 h-4 text-[var(--danger-text)]" />
            </div>
            <h2 className="font-semibold text-[var(--danger-text)]">{t("settingsDangerZone")}</h2>
          </div>
          <p className="text-sm text-[var(--muted)] mb-4">{t("settingsDangerDesc")}</p>
          <button
            type="button"
            onClick={openDeleteModal}
            className="text-sm font-medium px-4 py-2 rounded-lg border border-[var(--danger)] text-[var(--danger-text)] hover:bg-[var(--danger-bg)] transition-colors"
          >
            {t("settingsDeleteMyAccount")}
          </button>
        </div>

        {/* ── Delete confirmation modal ───────────────────────────────── */}
        {showDeleteModal && (
          <div
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowDeleteModal(false)}
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--danger-text)] flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" /> {t("settingsDeleteAccountTitle")}
                </h3>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="p-1.5 rounded-lg hover:bg-[var(--off)] transition-colors"
                  aria-label={t("settingsClose")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-sm text-[var(--ink2)] mb-4 leading-relaxed">
                {t("settingsDeleteModalDesc")}
              </p>

              <form onSubmit={deleteAccount} className="space-y-4">
                <div>
                  <label className="form-label">{t("settingsCurrentPassword")}</label>
                  <PasswordInput
                    value={deletePw}
                    onChange={setDeletePw}
                    autoComplete="current-password"
                    required
                    placeholder={t("settingsConfirmPwModal")}
                  />
                </div>
                <div>
                  <label className="form-label">{t("settingsTypeDeleteToConfirm")}</label>
                  <input
                    className="form-input"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder="DELETE"
                    required
                  />
                </div>

                {deleteErr && <p className="alert-error">{deleteErr}</p>}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    className="btn-outline"
                    disabled={deleting}
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={deleting || deleteConfirm !== "DELETE" || !deletePw}
                    className="text-sm font-medium px-4 py-2 rounded-lg bg-[var(--danger)] text-white hover:bg-[var(--danger-dark)] disabled:opacity-60 transition-colors"
                  >
                    {deleting ? t("settingsDeleting") : t("settingsDeleteForever")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
