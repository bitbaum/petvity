"use client";

import { useState, useTransition, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  User,
  Lock,
  CheckCircle,
  Mail,
  AlertTriangle,
  Download,
  Store,
  Stethoscope,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { PORTAL_ROUTES } from "@/lib/config/routes";
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

        {/* ── Sign-in and security (AccountKit) ───────────────────────── */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="icon-tile bg-[var(--teal-light)]">
              <Lock className="w-4 h-4 text-[var(--teal)]" />
            </div>
            <h2 className="font-semibold text-[var(--ink)]">{t("settingsSecurityTitle")}</h2>
          </div>
          <p className="text-sm text-[var(--muted)] mb-4">{t("settingsSecurityDesc")}</p>
          <Link href={PORTAL_ROUTES.security} className="btn-outline inline-flex">
            {t("settingsSecurityOpen")}
            <ArrowRight className="w-4 h-4" />
          </Link>
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

        {/* ── Danger zone: deletion lives with the sign-in settings ─────── */}
        <div className="card p-6 border-[var(--danger)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="icon-tile bg-[var(--danger-bg)]">
              <AlertTriangle className="w-4 h-4 text-[var(--danger-text)]" />
            </div>
            <h2 className="font-semibold text-[var(--danger-text)]">{t("settingsDangerZone")}</h2>
          </div>
          <p className="text-sm text-[var(--muted)] mb-4">{t("settingsDangerDesc")}</p>
          <Link
            href={PORTAL_ROUTES.security}
            className="inline-flex text-sm font-medium px-4 py-2 rounded-lg border border-[var(--danger)] text-[var(--danger-text)] hover:bg-[var(--danger-bg)] transition-colors no-underline"
          >
            {t("settingsDeleteMyAccount")}
          </Link>
        </div>
      </div>
    </div>
  );
}
