"use client";

import { useParams } from "next/navigation";
import {
  Plus,
  Syringe,
  X,
  Check,
  AlertTriangle,
  Clock,
  Pencil,
  Trash2,
  Search,
} from "lucide-react";
import { formatDateShort, formatRelativeDate } from "@/lib/utils/format";
import {
  VACCINATION_STATUS_CONFIG,
  computeVaccinationDisplayStatus,
} from "@/lib/config/vaccinations";
import type { VaccinationStatusId } from "@/lib/config/vaccinations";
import { VACCINATION_DUE_SOON_DAYS } from "@/lib/config/pet-signal";
import { useHealthList } from "@/hooks/useHealthList";
import { useTranslations, useLocale } from "next-intl";
import PageHeader from "@/components/portal/PageHeader";
import { DateInput } from "@/components/ui/date-input";

/* ── Icon map — React components stay in the UI layer, not in config ─────── */
const STATUS_ICONS: Partial<Record<VaccinationStatusId, React.ElementType>> = {
  up_to_date: Check,
  due_soon: Clock,
  overdue: AlertTriangle,
  not_applicable: undefined,
};

type VaccinationStatus = VaccinationStatusId;

interface Vaccination {
  id: string;
  name: string;
  administeredDate: string;
  nextDueDate: string | null;
  status: VaccinationStatus;
  vetName: string | null;
  batchNumber: string | null;
  notes: string | null;
}

interface FormState {
  name: string;
  administeredDate: string;
  nextDueDate: string;
  vetName: string;
  batchNumber: string;
  status: VaccinationStatus;
  notes: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  administeredDate: new Date().toISOString().slice(0, 10),
  nextDueDate: "",
  vetName: "",
  batchNumber: "",
  status: "up_to_date",
  notes: "",
};

function rowToForm(v: Vaccination): FormState {
  return {
    name: v.name,
    administeredDate: v.administeredDate,
    nextDueDate: v.nextDueDate ?? "",
    vetName: v.vetName ?? "",
    batchNumber: v.batchNumber ?? "",
    status: v.status,
    notes: v.notes ?? "",
  };
}

function buildBody(form: FormState, petId: string, isEdit: boolean) {
  return {
    ...(isEdit ? {} : { petId }),
    name: form.name.trim(),
    administeredDate: form.administeredDate,
    nextDueDate: form.nextDueDate || null,
    vetName: form.vetName.trim() || null,
    batchNumber: form.batchNumber.trim() || null,
    status: form.status,
    notes: form.notes.trim() || null,
  };
}

export default function VaccinationsPage() {
  const t = useTranslations("portal");
  const locale = useLocale();
  const { petId } = useParams<{ petId: string }>();

  /* todayStr is needed both in the filter callback and in row rendering */
  const todayStr = new Date().toISOString().slice(0, 10);

  function matchesFilterAndSearch(v: Vaccination, filter: string, q: string): boolean {
    const displayStatus = computeVaccinationDisplayStatus(
      v.status,
      v.nextDueDate,
      todayStr,
      VACCINATION_DUE_SOON_DAYS,
    );
    if (filter !== "all" && displayStatus !== filter) return false;
    if (q) {
      return v.name.toLowerCase().includes(q) || (v.notes?.toLowerCase().includes(q) ?? false);
    }
    return true;
  }

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
  } = useHealthList<Vaccination, FormState>({
    petId,
    apiPath: "/api/vaccinations",
    emptyForm: EMPTY_FORM,
    rowToForm,
    buildBody,
    matchesFilterAndSearch,
    messages: { saveFailed: t("saveFailed"), deleteFailed: t("deleteFailed") },
  });

  // Title, purpose and the way back do not depend on the fetch, so they paint
  // immediately; only the action (which needs the rows) and the list wait.
  // Skeletons standing in for the heading left the first paint with no way to
  // tell which page you were on or how to leave it.
  if (loading) {
    return (
      <div>
        <PageHeader
          back={{ href: `/portal/pets/${petId}`, label: petName || t("petFallback") }}
          title={t("vaccTitle")}
          purpose={t("vaccSubtitle")}
        />
        <div className="card h-64 animate-pulse bg-[var(--off)]" aria-busy="true" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        back={{ href: `/portal/pets/${petId}`, label: petName || t("petFallback") }}
        title={t("vaccTitle")}
        purpose={t("vaccSubtitle")}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            {rows.length > 0 && !showForm && (
              <>
                <div className="relative">
                  <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)] pointer-events-none" />
                  <input
                    type="text"
                    placeholder={t("vaccSearch")}
                    className="form-input form-input-icon text-sm py-1.5 w-40"
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    aria-label={t("vaccSearch")}
                  />
                </div>
                <select
                  className="form-input text-sm py-1.5"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label={t("listStatusLabel")}
                >
                  <option value="all">{t("vaccAllTypes")}</option>
                  {(Object.keys(VACCINATION_STATUS_CONFIG) as VaccinationStatus[]).map((val) => (
                    <option key={val} value={val}>
                      {t(`vaccStatus_${val}` as Parameters<typeof t>[0])}
                    </option>
                  ))}
                </select>
              </>
            )}
            {!showForm && (
              <button onClick={openAdd} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" />
                {t("vaccAdd")}
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
                <Syringe className="w-4 h-4 text-[var(--teal)]" />
              </div>
              <h2 className="font-semibold text-[var(--ink)]">
                {editingId ? t("vaccEditTitle") : t("vaccNewTitle")}
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
                {t("vaccName")} <span className="text-[var(--danger-text)]">*</span>
              </label>
              <input
                className="form-input"
                placeholder={t("vaccNamePlaceholder")}
                required
                value={form.name}
                onChange={(e) => field("name", e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">
                {t("vaccDateAdministered")} <span className="text-[var(--danger-text)]">*</span>
              </label>
              <DateInput
                type="date"
                className="form-input"
                required
                value={form.administeredDate}
                onChange={(e) => field("administeredDate", e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">
                {t("vaccNextDue")}
                <span className="text-[var(--muted)] font-normal ms-1">{t("listOptional")}</span>
              </label>
              <DateInput
                type="date"
                className="form-input"
                value={form.nextDueDate}
                onChange={(e) => field("nextDueDate", e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">{t("listStatusLabel")}</label>
              <select
                className="form-input"
                value={form.status}
                onChange={(e) => field("status", e.target.value)}
              >
                {(Object.keys(VACCINATION_STATUS_CONFIG) as VaccinationStatus[]).map((val) => (
                  <option key={val} value={val}>
                    {t(`vaccStatus_${val}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">
                {t("listAdministeredByLabel")}
                <span className="text-[var(--muted)] font-normal ms-1">{t("listOptional")}</span>
              </label>
              <input
                className="form-input"
                placeholder={t("listAdministeredByPlaceholder")}
                value={form.vetName}
                onChange={(e) => field("vetName", e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="form-label">
                {t("vaccBatchNumber")}
                <span className="text-[var(--muted)] font-normal ms-1">{t("listOptional")}</span>
              </label>
              <input
                className="form-input"
                placeholder={t("vaccBatchPlaceholder")}
                value={form.batchNumber}
                onChange={(e) => field("batchNumber", e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="form-label">
                {t("logNotes")}
                <span className="text-[var(--muted)] font-normal ms-1">{t("listOptional")}</span>
              </label>
              <textarea
                rows={2}
                className="form-input resize-none"
                placeholder={t("vaccNotesPlaceholder")}
                value={form.notes}
                onChange={(e) => field("notes", e.target.value)}
              />
            </div>

            <div className="sm:col-span-2 flex gap-3 pt-1">
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
                {saving ? t("saving") : editingId ? t("vaccUpdate") : t("vaccSave")}
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
              <Syringe className="w-6 h-6 text-[var(--teal)]" />
            </div>
            <p className="font-medium text-[var(--ink)] mb-1">{t("vaccEmptyTitle")}</p>
            <p className="text-sm text-[var(--muted)] mb-5">{t("vaccEmptyDesc")}</p>
            {!showForm && (
              <button onClick={openAdd} className="btn-primary">
                <Plus className="w-4 h-4" />
                {t("vaccAddFirst")}
              </button>
            )}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-12 text-center">
            <p className="font-medium text-[var(--ink)] mb-1">{t("vaccNoMatch")}</p>
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
                  {t("vaccColVaccine")}
                </th>
                <th className="text-start py-3 px-4 text-xs font-medium text-[var(--muted)] uppercase tracking-wide hidden sm:table-cell">
                  {t("vaccColGiven")}
                </th>
                <th className="text-start py-3 px-4 text-xs font-medium text-[var(--muted)] uppercase tracking-wide hidden md:table-cell">
                  {t("vaccColNextDue")}
                </th>
                <th className="text-start py-3 px-4 text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
                  {t("listStatusLabel")}
                </th>
                <th className="py-3 px-4 w-20" />
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((v) => {
                const displayStatus = computeVaccinationDisplayStatus(
                  v.status,
                  v.nextDueDate,
                  todayStr,
                  VACCINATION_DUE_SOON_DAYS,
                );
                const status =
                  VACCINATION_STATUS_CONFIG[displayStatus] ?? VACCINATION_STATUS_CONFIG.up_to_date;
                const StatusIcon = STATUS_ICONS[displayStatus];
                const isDeleting = deletingId === v.id;
                return (
                  <tr
                    key={v.id}
                    className="group border-t border-[var(--border)] hover:bg-[var(--off)] transition-colors"
                  >
                    <td className="py-3 px-4">
                      <p className="font-medium text-[var(--ink)]">{v.name}</p>
                      {v.vetName && (
                        <p className="text-xs text-[var(--muted)] mt-0.5">{v.vetName}</p>
                      )}
                      {v.notes && (
                        <p className="text-xs text-[var(--muted)] mt-0.5 italic">{v.notes}</p>
                      )}
                      <p className="text-xs text-[var(--muted)] mt-0.5 sm:hidden">
                        {formatDateShort(v.administeredDate)}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-[var(--muted)] hidden sm:table-cell">
                      {formatDateShort(v.administeredDate)}
                    </td>
                    <td className="py-3 px-4 text-[var(--muted)] hidden md:table-cell">
                      {v.nextDueDate ? (
                        <span title={formatDateShort(v.nextDueDate)}>
                          {formatRelativeDate(v.nextDueDate, locale)}
                        </span>
                      ) : (
                        <span className="text-[var(--faint)]">–</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 ${status.className}`}>
                        {StatusIcon && <StatusIcon className="w-3 h-3" />}
                        {t(`vaccStatus_${displayStatus}` as Parameters<typeof t>[0])}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {isDeleting ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(v.id)}
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
                          {displayStatus === "overdue" && (
                            <button
                              onClick={() => openEdit(v)}
                              className="text-xs font-medium text-[var(--teal)] hover:underline me-1 whitespace-nowrap"
                            >
                              {t("vaccLogDose")}
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(v)}
                            className="p-1.5 rounded-lg hover:bg-[var(--teal-light)] text-[var(--muted)] hover:text-[var(--teal)] transition-colors"
                            title={t("listEdit")}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingId(v.id)}
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
