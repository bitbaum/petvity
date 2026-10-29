"use client";

import { useParams } from "next/navigation";
import {
  Plus,
  X,
  FileText,
  Stethoscope,
  Syringe,
  Pill,
  Scissors,
  FlaskConical,
  Smile,
  Sparkles,
  MoreHorizontal,
  Pencil,
  Trash2,
  Search,
} from "lucide-react";
import { formatDateShort } from "@/lib/utils/format";
import { HEALTH_RECORD_TYPE_CONFIG, HEALTH_RECORD_TYPE_OPTIONS } from "@/lib/config/health-records";
import type { HealthRecordTypeId } from "@/lib/config/health-records";
import { useHealthList } from "@/hooks/useHealthList";
import { useTranslations } from "next-intl";
import PageHeader from "@/components/portal/PageHeader";
import { DateInput } from "@/components/ui/date-input";

/* ── Icon map — React components stay in the UI layer, not in config ─────── */
const RECORD_TYPE_ICONS: Record<HealthRecordTypeId, React.ElementType> = {
  vet_visit: Stethoscope,
  vaccination: Syringe,
  medication: Pill,
  surgery: Scissors,
  lab_result: FlaskConical,
  dental: Smile,
  grooming: Sparkles,
  other: MoreHorizontal,
};

type RecordType = HealthRecordTypeId;

interface HealthRecord {
  id: string;
  type: RecordType;
  title: string;
  date: string;
  vetName: string | null;
  clinic: string | null;
  notes: string | null;
}

interface FormState {
  type: RecordType;
  title: string;
  date: string;
  vetName: string;
  clinic: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  type: "vet_visit",
  title: "",
  date: new Date().toISOString().slice(0, 10),
  vetName: "",
  clinic: "",
  notes: "",
};

function rowToForm(r: HealthRecord): FormState {
  return {
    type: r.type,
    title: r.title,
    date: r.date,
    vetName: r.vetName ?? "",
    clinic: r.clinic ?? "",
    notes: r.notes ?? "",
  };
}

function buildBody(form: FormState, petId: string, isEdit: boolean) {
  return {
    ...(isEdit ? {} : { petId }),
    type: form.type,
    title: form.title.trim(),
    date: form.date,
    vetName: form.vetName.trim() || null,
    clinic: form.clinic.trim() || null,
    notes: form.notes.trim() || null,
  };
}

function matchesFilterAndSearch(r: HealthRecord, filter: string, q: string): boolean {
  if (filter !== "all" && r.type !== filter) return false;
  if (q) {
    return (
      r.title.toLowerCase().includes(q) ||
      (r.vetName?.toLowerCase().includes(q) ?? false) ||
      (r.clinic?.toLowerCase().includes(q) ?? false) ||
      (r.notes?.toLowerCase().includes(q) ?? false)
    );
  }
  return true;
}

export default function HealthRecordsPage() {
  const t = useTranslations("portal");
  const { petId } = useParams<{ petId: string }>();

  const {
    petName,
    rows: records,
    loading,
    filteredRows: filteredRecords,
    filter: typeFilter,
    setFilter: setTypeFilter,
    searchQ,
    setSearchQ,
    showForm,
    editingId,
    deletingId,
    setDeletingId,
    form,
    saving,
    error,
    deleteError,
    openAdd,
    openEdit,
    closeForm,
    handleSubmit,
    handleDelete,
    field,
  } = useHealthList<HealthRecord, FormState>({
    petId,
    apiPath: "/api/health/records",
    emptyForm: EMPTY_FORM,
    rowToForm,
    buildBody,
    matchesFilterAndSearch,
    messages: { saveFailed: t("saveFailed"), deleteFailed: t("deleteFailed") },
  });

  // See the note in the vaccinations page: the heading is static, so it paints
  // before the fetch rather than being stood in for by a grey block.
  if (loading) {
    return (
      <div>
        <PageHeader
          back={{ href: `/portal/pets/${petId}`, label: petName || t("petFallback") }}
          title={t("recordsTitle")}
          purpose={t("recordsSubtitle")}
        />
        <div className="card h-64 animate-pulse bg-[var(--off)]" aria-busy="true" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        back={{ href: `/portal/pets/${petId}`, label: petName || t("petFallback") }}
        title={t("recordsTitle")}
        purpose={t("recordsSubtitle")}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            {records.length > 0 && !showForm && (
              <>
                <div className="relative">
                  <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)] pointer-events-none" />
                  <input
                    type="text"
                    placeholder={t("recordsSearch")}
                    className="form-input form-input-icon text-sm py-1.5 w-44"
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    aria-label={t("recordsSearch")}
                  />
                </div>
                <select
                  className="form-input text-sm py-1.5"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  aria-label={t("recordsAllTypes")}
                >
                  <option value="all">{t("recordsAllTypes")}</option>
                  {HEALTH_RECORD_TYPE_OPTIONS.map(({ value }) => (
                    <option key={value} value={value}>
                      {t(`recType_${value}` as Parameters<typeof t>[0])}
                    </option>
                  ))}
                </select>
              </>
            )}
            {!showForm && (
              <button onClick={openAdd} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" />
                {t("recordsAdd")}
              </button>
            )}
          </div>
        }
      />

      {deleteError && <p className="alert-error mb-4">{deleteError}</p>}

      {/* Add form */}
      {showForm && (
        <div className="card p-6 mb-6 border-2 border-[var(--teal-light)]">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="icon-tile bg-[var(--teal-light)]">
                <FileText className="w-4 h-4 text-[var(--teal)]" />
              </div>
              <h2 className="font-semibold text-[var(--ink)]">
                {editingId ? t("recordsEditTitle") : t("recordsNewTitle")}
              </h2>
            </div>
            <button type="button" onClick={closeForm} className="btn-ghost p-1 rounded-lg">
              <X className="w-4 h-4 text-[var(--muted)]" />
            </button>
          </div>

          {error && <p className="alert-error mb-4">{error}</p>}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                {t("recordsTypeLabel")} <span className="text-[var(--danger-text)]">*</span>
              </label>
              <select
                className="form-input"
                value={form.type}
                onChange={(e) => field("type", e.target.value)}
              >
                {HEALTH_RECORD_TYPE_OPTIONS.map(({ value }) => (
                  <option key={value} value={value}>
                    {t(`recType_${value}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">
                {t("recordsDateLabel")} <span className="text-[var(--danger-text)]">*</span>
              </label>
              <DateInput
                type="date"
                className="form-input"
                required
                value={form.date}
                onChange={(e) => field("date", e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="form-label">
                {t("recordsTitleLabel")} <span className="text-[var(--danger-text)]">*</span>
              </label>
              <input
                className="form-input"
                placeholder={t("recordsTitlePlaceholder")}
                required
                value={form.title}
                onChange={(e) => field("title", e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">
                {t("recordsVetLabel")}
                <span className="text-[var(--muted)] font-normal ms-1">{t("listOptional")}</span>
              </label>
              <input
                className="form-input"
                placeholder={t("recordsDrPlaceholder")}
                value={form.vetName}
                onChange={(e) => field("vetName", e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">
                {t("recordsClinicLabel")}
                <span className="text-[var(--muted)] font-normal ms-1">{t("listOptional")}</span>
              </label>
              <input
                className="form-input"
                placeholder={t("recordsClinicPlaceholder")}
                value={form.clinic}
                onChange={(e) => field("clinic", e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="form-label">
                {t("recordsNotesLabel")}
                <span className="text-[var(--muted)] font-normal ms-1">{t("listOptional")}</span>
              </label>
              <textarea
                className="form-input min-h-[80px] resize-y"
                placeholder={t("recordsNotesPlaceholder")}
                value={form.notes}
                onChange={(e) => field("notes", e.target.value)}
              />
            </div>

            <div className="sm:col-span-2 flex gap-3 pt-1">
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
                {saving ? t("saving") : editingId ? t("recordsUpdate") : t("recordsSave")}
              </button>
              <button type="button" onClick={closeForm} className="btn-outline">
                {t("cancel")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Records list */}
      {records.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--teal-light)] flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-[var(--teal)]" />
          </div>
          <p className="font-medium text-[var(--ink)] mb-1">{t("recordsEmptyTitle")}</p>
          <p className="text-sm text-[var(--muted)] mb-5">{t("recordsEmptyDesc")}</p>
          {!showForm && (
            <button onClick={openAdd} className="btn-primary">
              <Plus className="w-4 h-4" />
              {t("recordsAddFirst")}
            </button>
          )}
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="font-medium text-[var(--ink)] mb-1">{t("recordsNoMatch")}</p>
          <button
            onClick={() => {
              setTypeFilter("all");
              setSearchQ("");
            }}
            className="text-sm text-[var(--teal)] hover:underline mt-1"
          >
            {t("listClearFilters")}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((r) => {
            const cfg = HEALTH_RECORD_TYPE_CONFIG[r.type] ?? HEALTH_RECORD_TYPE_CONFIG.other;
            const Icon = RECORD_TYPE_ICONS[r.type] ?? RECORD_TYPE_ICONS.other;
            return (
              <div key={r.id} className="card p-4 flex gap-4">
                <div
                  className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}
                >
                  <Icon className={`w-5 h-5 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--ink)] leading-snug">{r.title}</p>
                      <p className="text-xs text-[var(--muted)] mt-0.5">
                        {t(`recType_${r.type}` as Parameters<typeof t>[0])} ·{" "}
                        {formatDateShort(r.date)}
                        {r.vetName && ` · ${r.vetName}`}
                        {r.clinic && ` @ ${r.clinic}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {deletingId === r.id ? (
                        <>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="text-xs font-medium text-[var(--danger-text)] hover:underline"
                          >
                            {t("listConfirm")}
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="text-xs text-[var(--muted)] hover:underline ms-1"
                          >
                            {t("cancel")}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => openEdit(r)}
                            className="p-1.5 rounded-lg hover:bg-[var(--teal-light)] text-[var(--muted)] hover:text-[var(--teal)] transition-colors"
                            title={t("listEdit")}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingId(r.id)}
                            className="p-1.5 rounded-lg hover:bg-[var(--danger-bg)] text-[var(--muted)] hover:text-[var(--danger-text)] transition-colors"
                            title={t("listDelete")}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {r.notes && (
                    <p className="text-sm text-[var(--ink2)] mt-2 leading-relaxed">{r.notes}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
