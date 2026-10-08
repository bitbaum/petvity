"use client";

import { useParams } from "next/navigation";
import { Plus, Pill, X, Check, Clock, Ban, Pencil, Trash2, Search } from "lucide-react";
import { formatDateShort } from "@/lib/utils/format";
import { MEDICATION_STATUS_CONFIG } from "@/lib/config/medications";
import type { MedicationStatusId } from "@/lib/config/medications";
import { useHealthList } from "@/hooks/useHealthList";
import { useTranslations } from "next-intl";
import PageHeader from "@/components/portal/PageHeader";
import { DateInput } from "@/components/ui/date-input";

/* ── Icon map — React components stay in the UI layer, not in config ─────── */
const STATUS_ICONS: Record<MedicationStatusId, React.ElementType> = {
  active: Check,
  completed: Clock,
  discontinued: Ban,
};

type MedicationStatus = MedicationStatusId;

interface Medication {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  startDate: string;
  endDate: string | null;
  prescribedBy: string | null;
  status: MedicationStatus;
  notes: string | null;
}

interface FormState {
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate: string;
  prescribedBy: string;
  status: MedicationStatus;
  notes: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  dosage: "",
  frequency: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  prescribedBy: "",
  status: "active",
  notes: "",
};

function rowToForm(m: Medication): FormState {
  return {
    name: m.name,
    dosage: m.dosage ?? "",
    frequency: m.frequency ?? "",
    startDate: m.startDate,
    endDate: m.endDate ?? "",
    prescribedBy: m.prescribedBy ?? "",
    status: m.status,
    notes: m.notes ?? "",
  };
}

function buildBody(form: FormState, petId: string, isEdit: boolean) {
  return {
    ...(isEdit ? {} : { petId }),
    name: form.name.trim(),
    startDate: form.startDate,
    status: form.status,
    dosage: form.dosage.trim() || null,
    frequency: form.frequency.trim() || null,
    endDate: form.endDate || null,
    prescribedBy: form.prescribedBy.trim() || null,
    notes: form.notes.trim() || null,
  };
}

function matchesFilterAndSearch(m: Medication, filter: string, q: string): boolean {
  if (filter !== "all" && m.status !== filter) return false;
  if (q) {
    return (
      m.name.toLowerCase().includes(q) ||
      (m.dosage?.toLowerCase().includes(q) ?? false) ||
      (m.notes?.toLowerCase().includes(q) ?? false)
    );
  }
  return true;
}

export default function MedicationsPage() {
  const t = useTranslations("portal");
  const { petId } = useParams<{ petId: string }>();

  const {
    petName,
    rows,
    loading,
    filteredRows,
    filter: statusFilter,
    setFilter: setStatusFilter,
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
  } = useHealthList<Medication, FormState>({
    petId,
    apiPath: "/api/medications",
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
          title={t("medsTitle")}
          purpose={t("medsSubtitle")}
        />
        <div className="card h-64 animate-pulse bg-[var(--off)]" aria-busy="true" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        back={{ href: `/portal/pets/${petId}`, label: petName || t("petFallback") }}
        title={t("medsTitle")}
        purpose={t("medsSubtitle")}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            {rows.length > 0 && !showForm && (
              <>
                <div className="relative">
                  <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)] pointer-events-none" />
                  <input
                    type="text"
                    placeholder={t("medsSearch")}
                    className="form-input form-input-icon text-sm py-1.5 w-44"
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    aria-label={t("medsSearch")}
                  />
                </div>
                <select
                  className="form-input text-sm py-1.5"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label={t("listStatusLabel")}
                >
                  <option value="all">{t("listAllStatuses")}</option>
                  {(Object.keys(MEDICATION_STATUS_CONFIG) as MedicationStatus[]).map((val) => (
                    <option key={val} value={val}>
                      {t(`medStatus_${val}` as Parameters<typeof t>[0])}
                    </option>
                  ))}
                </select>
              </>
            )}
            {!showForm && (
              <button onClick={openAdd} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" />
                {t("medsAdd")}
              </button>
            )}
          </div>
        }
      />

      {deleteError && <p className="alert-error mb-4">{deleteError}</p>}

      {/* Form (add / edit) */}
      {showForm && (
        <div className="card p-6 mb-6 border-2 border-[var(--teal-light)]">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="icon-tile bg-[var(--teal-light)]">
                <Pill className="w-4 h-4 text-[var(--teal)]" />
              </div>
              <h2 className="font-semibold text-[var(--ink)]">
                {editingId ? t("medsEditTitle") : t("medsNewTitle")}
              </h2>
            </div>
            <button type="button" onClick={closeForm} className="btn-ghost p-1 rounded-lg">
              <X className="w-4 h-4 text-[var(--muted)]" />
            </button>
          </div>

          {error && <p className="alert-error mb-4">{error}</p>}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label">
                {t("medsMedName")} <span className="text-[var(--danger-text)]">*</span>
              </label>
              <input
                className="form-input"
                placeholder={t("medsNamePlaceholder")}
                required
                value={form.name}
                onChange={(e) => field("name", e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">
                {t("medsDosage")}{" "}
                <span className="text-[var(--muted)] font-normal ms-1">{t("listOptional")}</span>
              </label>
              <input
                className="form-input"
                placeholder={t("medsDosagePlaceholder")}
                value={form.dosage}
                onChange={(e) => field("dosage", e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">
                {t("medsFrequency")}{" "}
                <span className="text-[var(--muted)] font-normal ms-1">{t("listOptional")}</span>
              </label>
              <input
                className="form-input"
                placeholder={t("medsFrequencyPlaceholder")}
                value={form.frequency}
                onChange={(e) => field("frequency", e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">
                {t("medsStartDate")} <span className="text-[var(--danger-text)]">*</span>
              </label>
              <DateInput
                type="date"
                className="form-input"
                required
                value={form.startDate}
                onChange={(e) => field("startDate", e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">
                {t("medsEndDate")}{" "}
                <span className="text-[var(--muted)] font-normal ms-1">{t("listOptional")}</span>
              </label>
              <DateInput
                type="date"
                className="form-input"
                value={form.endDate}
                onChange={(e) => field("endDate", e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">{t("listStatusLabel")}</label>
              <select
                className="form-input"
                value={form.status}
                onChange={(e) => field("status", e.target.value)}
              >
                {(Object.keys(MEDICATION_STATUS_CONFIG) as MedicationStatus[]).map((val) => (
                  <option key={val} value={val}>
                    {t(`medStatus_${val}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">
                {t("medsPrescribedBy")}{" "}
                <span className="text-[var(--muted)] font-normal ms-1">{t("listOptional")}</span>
              </label>
              <input
                className="form-input"
                placeholder={t("medsVetPlaceholder")}
                value={form.prescribedBy}
                onChange={(e) => field("prescribedBy", e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="form-label">
                {t("logNotes")}{" "}
                <span className="text-[var(--muted)] font-normal ms-1">{t("listOptional")}</span>
              </label>
              <textarea
                className="form-input min-h-[80px] resize-y"
                placeholder={t("medsNotesPlaceholder")}
                value={form.notes}
                onChange={(e) => field("notes", e.target.value)}
              />
            </div>

            <div className="sm:col-span-2 flex gap-3 pt-1">
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
                {saving ? t("saving") : editingId ? t("medsUpdate") : t("medsSave")}
              </button>
              <button type="button" onClick={closeForm} className="btn-outline">
                {t("cancel")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--teal-light)] flex items-center justify-center mx-auto mb-4">
              <Pill className="w-6 h-6 text-[var(--teal)]" />
            </div>
            <p className="font-medium text-[var(--ink)] mb-1">{t("medsEmptyTitle")}</p>
            <p className="text-sm text-[var(--muted)] mb-5">{t("medsEmptyDesc")}</p>
            {!showForm && (
              <button onClick={openAdd} className="btn-primary">
                <Plus className="w-4 h-4" />
                {t("medsAddFirst")}
              </button>
            )}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-12 text-center">
            <p className="font-medium text-[var(--ink)] mb-1">{t("medsNoMatch")}</p>
            <button
              onClick={() => {
                setStatusFilter("all");
                setSearchQ("");
              }}
              className="text-sm text-[var(--teal)] hover:underline mt-1"
            >
              {t("listClearFilters")}
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--off)]">
              <tr>
                <th className="text-start py-3 px-4 text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
                  {t("medsColMedication")}
                </th>
                <th className="text-start py-3 px-4 text-xs font-medium text-[var(--muted)] uppercase tracking-wide hidden sm:table-cell">
                  {t("medsColDosage")}
                </th>
                <th className="text-start py-3 px-4 text-xs font-medium text-[var(--muted)] uppercase tracking-wide hidden md:table-cell">
                  {t("medsColDuration")}
                </th>
                <th className="text-start py-3 px-4 text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
                  {t("listStatusLabel")}
                </th>
                <th className="py-3 px-4 w-20" />
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((m) => {
                const status =
                  MEDICATION_STATUS_CONFIG[m.status] ?? MEDICATION_STATUS_CONFIG.active;
                const StatusIcon = STATUS_ICONS[m.status] ?? STATUS_ICONS.active;
                const isDeleting = deletingId === m.id;
                return (
                  <tr
                    key={m.id}
                    className="border-t border-[var(--border)] hover:bg-[var(--off)] transition-colors"
                  >
                    <td className="py-3 px-4">
                      <p className="font-medium text-[var(--ink)]">{m.name}</p>
                      {m.prescribedBy && (
                        <p className="text-xs text-[var(--muted)] mt-0.5">{m.prescribedBy}</p>
                      )}
                      {(m.dosage || m.frequency) && (
                        <p className="text-xs text-[var(--muted)] mt-0.5 sm:hidden">
                          {[m.dosage, m.frequency].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[var(--muted)] hidden sm:table-cell">
                      {m.dosage || m.frequency ? (
                        <span>{[m.dosage, m.frequency].filter(Boolean).join(" · ")}</span>
                      ) : (
                        <span className="text-[var(--faint)]">–</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[var(--muted)] hidden md:table-cell">
                      {formatDateShort(m.startDate)}
                      {m.endDate ? ` → ${formatDateShort(m.endDate)}` : ` → ${t("medsOngoing")}`}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 ${status.className}`}>
                        <StatusIcon className="w-3 h-3" />
                        {t(`medStatus_${m.status}` as Parameters<typeof t>[0])}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {isDeleting ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(m.id)}
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
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(m)}
                            className="p-1.5 rounded-lg hover:bg-[var(--teal-light)] text-[var(--muted)] hover:text-[var(--teal)] transition-colors"
                            title={t("listEdit")}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingId(m.id)}
                            className="p-1.5 rounded-lg hover:bg-[var(--danger-bg)] text-[var(--muted)] hover:text-[var(--danger-text)] transition-colors"
                            title={t("listDelete")}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
