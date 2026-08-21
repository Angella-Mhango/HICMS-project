// frontend/src/components/GanttChart.jsx
import { useMemo, useRef, useState } from "react";
import {
  Building2,
  CalendarDays,
  Clock,
  Edit2,
  LocateFixed,
  Minus,
  Plus,
  Save,
  Search,
  User,
  X
} from "lucide-react";
import { showToast } from "./Toast";
import useModalExperience from "./useModalExperience";

const DAY_MS = 24 * 60 * 60 * 1000;
const LEFT_WIDTH = 520;
const ZOOM_LEVELS = [6, 10, 16];

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const date = typeof value === "string" ? parseDate(value) : value;
  if (!date) return "N/A";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

const isoDate = (value) => {
  const date = typeof value === "string" ? parseDate(value) : value;
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const daysBetween = (start, end) => Math.round((
  Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) -
  Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
) / DAY_MS);
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const statusConfig = {
  scheduled: { label: "Scheduled", bar: "bg-green-600", badge: "bg-green-50 text-green-700 border-green-200" },
  rescheduled: { label: "Rescheduled", bar: "bg-green-500", badge: "bg-green-50 text-green-700 border-green-200" },
  in_progress: { label: "In Progress", bar: "bg-green-600", badge: "bg-green-50 text-green-700 border-green-200" },
  completed: { label: "Completed", bar: "bg-slate-500", badge: "bg-slate-50 text-slate-700 border-slate-200" },
  cancelled: { label: "Cancelled", bar: "bg-red-600", badge: "bg-red-50 text-red-700 border-red-200" }
};

export default function GanttChart({ facilities, plans = [], timeline, canEdit = false, inspectors = [], inspectionTypes = [], onUpdateTask, onEditPlan, viewMode = "upcoming" }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(1);
  const scrollRef = useRef(null);
  const dayWidth = ZOOM_LEVELS[zoomIndex];
  useModalExperience(Boolean(editingTask), () => setEditingTask(null));

  const rows = useMemo(() => {
    const safeFacilities = Array.isArray(facilities) ? facilities : [];
    return safeFacilities.flatMap((facility) => {
      const tasks = Array.isArray(facility.tasks) ? facility.tasks : [];
      return tasks.map((task) => ({
        ...task,
        facilityId: facility.id,
        facilityName: facility.name,
        district: facility.district,
        region: facility.region,
        startDate: parseDate(task.start),
        endDate: parseDate(task.end || task.start)
      }));
    }).filter((task) => task.startDate && task.endDate)
      .sort((a, b) => a.startDate - b.startDate || a.facilityName.localeCompare(b.facilityName));
  }, [facilities]);

  const bounds = useMemo(() => {
    const timelineStart = parseDate(timeline?.min_date);
    const timelineEnd = parseDate(timeline?.max_date);
    const rowStart = rows[0]?.startDate;
    const rowEnd = rows.reduce((latest, row) => !latest || row.endDate > latest ? row.endDate : latest, null);
    const minDate = timelineStart || rowStart || new Date();
    const maxDate = timelineEnd || rowEnd || addDays(minDate, 90);
    return { minDate, maxDate, totalDays: Math.max(daysBetween(minDate, maxDate) + 1, 1) };
  }, [rows, timeline]);

  const months = useMemo(() => {
    const result = [];
    const cursor = new Date(bounds.minDate.getFullYear(), bounds.minDate.getMonth(), 1);
    while (cursor <= bounds.maxDate) {
      const monthStart = new Date(cursor);
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      const start = monthStart < bounds.minDate ? bounds.minDate : monthStart;
      const end = monthEnd > bounds.maxDate ? bounds.maxDate : monthEnd;
      result.push({
        key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
        label: cursor.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        left: daysBetween(bounds.minDate, start) * dayWidth,
        width: Math.max((daysBetween(start, end) + 1) * dayWidth, dayWidth)
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return result;
  }, [bounds, dayWidth]);

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      const haystack = `${row.facilityName} ${row.assigned_to} ${row.inspection_type_label} ${row.plan_title} ${row.district} ${row.region}`.toLowerCase();
      return matchesStatus && (!search || haystack.includes(search));
    });
  }, [query, rows, statusFilter]);

  const timelineWidth = Math.max(bounds.totalDays * dayWidth, 820);
  const plansById = useMemo(
    () => new Map((Array.isArray(plans) ? plans : []).map((plan) => [plan.id, plan])),
    [plans]
  );

  const positionFor = (row) => {
    const left = daysBetween(bounds.minDate, row.startDate) * dayWidth;
    const duration = Math.max(daysBetween(row.startDate, row.endDate) + 1, 1);
    return { left, width: Math.max(duration * dayWidth, 32) };
  };

  const today = new Date();
  const todayOffset = daysBetween(bounds.minDate, today);
  const todayIsVisible = todayOffset >= 0 && todayOffset < bounds.totalDays;
  const todayLeft = todayOffset * dayWidth;

  const jumpToToday = () => {
    if (!todayIsVisible || !scrollRef.current) return;
    scrollRef.current.scrollTo({ left: Math.max(todayLeft - 240, 0), behavior: "smooth" });
  };

  const openEdit = (row) => {
    if (!canEdit) return;
    setEditingTask(row);
    setFormData({
      scheduled_date: isoDate(row.startDate),
      end_date: isoDate(row.endDate),
      assigned_inspector_id: row.assigned_inspector_id || "",
      inspection_type: row.inspection_type || "ROUTINE",
      status: row.status || "scheduled",
      notes: row.notes || ""
    });
  };

  const saveEdit = async () => {
    if (!editingTask || !onUpdateTask) return;
    if (!formData.scheduled_date || !formData.end_date) {
      showToast("Visit date and end date are required", "warning");
      return;
    }
    if (formData.end_date < formData.scheduled_date) {
      showToast("End date cannot be before the visit date", "warning");
      return;
    }
    setSaving(true);
    try {
      await onUpdateTask(editingTask.id, formData);
      setEditingTask(null);
      showToast("Schedule updated", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to update schedule", "error");
    } finally {
      setSaving(false);
    }
  };

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
        <CalendarDays className="w-14 h-14 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700">{viewMode === "past" ? "No Past Visits" : "No Upcoming Inspection Visits"}</h3>
        <p className="text-sm text-gray-500 mt-2">{viewMode === "past" ? "Completed facility visits will appear here." : "Create an inspection plan to schedule future facility visits."}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 bg-slate-50">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-green-700" />
              {viewMode === "past" ? "Past Inspection Visits" : "Upcoming Inspection Visits"}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {formatDate(bounds.minDate)} to {formatDate(bounds.maxDate)} | {filteredRows.length} planned visit{filteredRows.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search facility, inspector, type"
                className="w-full sm:w-72 pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">All statuses</option>
              {Object.entries(statusConfig).map(([value, config]) => (
                <option key={value} value={value}>{config.label}</option>
              ))}
            </select>
            <div className="flex items-center rounded-lg border border-gray-300 bg-white p-1" aria-label="Timeline zoom controls">
              <button type="button" onClick={() => setZoomIndex(index => Math.max(index - 1, 0))} disabled={zoomIndex === 0} title="Zoom out" className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-30">
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-20 text-center text-xs font-medium text-gray-600">{["Compact", "Normal", "Detailed"][zoomIndex]}</span>
              <button type="button" onClick={() => setZoomIndex(index => Math.min(index + 1, ZOOM_LEVELS.length - 1))} disabled={zoomIndex === ZOOM_LEVELS.length - 1} title="Zoom in" className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-30">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button type="button" onClick={jumpToToday} disabled={!todayIsVisible} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40" title={todayIsVisible ? "Scroll to today" : "Today is outside this timeline"}>
              <LocateFixed className="h-4 w-4 text-green-700" /> Today
            </button>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="max-h-[680px] overflow-auto scroll-smooth">
        <div style={{ minWidth: LEFT_WIDTH + timelineWidth }}>
          <div className="sticky top-0 z-20 flex border-b border-gray-200 bg-white">
            <div
              className="sticky left-0 z-30 grid grid-cols-[1.3fr_1fr_1fr_86px] gap-3 border-r border-gray-200 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
              style={{ width: LEFT_WIDTH }}
            >
              <span>Facility</span>
              <span>Inspection Type</span>
              <span>Inspector</span>
              <span>Status</span>
            </div>
            <div className="relative h-12 bg-white" style={{ width: timelineWidth }}>
              {months.map((month) => (
                <div key={month.key} className="absolute top-0 h-12 border-r border-gray-200 px-2 py-2 text-xs font-semibold text-slate-600" style={{ left: month.left, width: month.width }}>
                  {month.label}
                </div>
              ))}
              {todayIsVisible && <div className="absolute inset-y-0 z-10 w-0.5 bg-red-500" style={{ left: todayLeft }} title="Today" />}
            </div>
          </div>

          {filteredRows.length === 0 && (
            <div className="sticky left-0 flex min-h-28 items-center justify-center border-b border-gray-100 bg-white px-6 text-sm text-gray-500" style={{ width: LEFT_WIDTH + timelineWidth }}>
              No scheduled visits match the current search and status filters.
            </div>
          )}
          {filteredRows.map((row) => {
            const config = statusConfig[row.status] || statusConfig.scheduled;
            const pos = positionFor(row);
            return (
              <div key={`${row.facilityId}-${row.id}`} className="group flex border-b border-gray-100 hover:bg-slate-50">
                <div className="sticky left-0 z-10 grid grid-cols-[1.35fr_1fr_1fr_82px] gap-3 border-r border-gray-200 bg-white px-4 py-3 group-hover:bg-slate-50" style={{ width: LEFT_WIDTH }}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="w-4 h-4 text-green-700 shrink-0" />
                      <p className="truncate text-sm font-semibold text-slate-800">{row.facilityName}</p>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">{[row.district, row.region].filter(Boolean).join(", ") || "Location unavailable"}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {canEdit && onEditPlan && plansById.has(row.plan_id) ? (
                        <button type="button" onClick={() => onEditPlan(plansById.get(row.plan_id))} className="font-medium text-green-700 hover:underline">
                          {row.plan_title || "Plan"}
                        </button>
                      ) : (row.plan_title || "Plan")}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-700">{row.inspection_type_label || row.name}</p>
                    <p className="mt-1 text-xs text-slate-400">{row.focus_standards?.length || 0} focus standard{row.focus_standards?.length === 1 ? "" : "s"}</p>
                  </div>
                  <div className="min-w-0 flex items-start gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <span className="truncate text-sm text-slate-600">{row.assigned_to || "Unassigned"}</span>
                  </div>
                  <span className={`inline-flex h-fit items-center justify-center rounded-full border px-2 py-1 text-[11px] font-semibold ${config.badge}`}>
                    {config.label}
                  </span>
                </div>

                <div className="relative min-h-[76px] bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px)]" style={{ width: timelineWidth, backgroundSize: `${dayWidth * 7}px 100%` }}>
                  {todayIsVisible && <div className="absolute inset-y-0 z-[1] w-0.5 bg-red-400/70" style={{ left: todayLeft }} />}
                  <button
                    type="button"
                    onClick={() => openEdit(row)}
                    className={`absolute top-5 h-7 rounded-md ${config.bar} shadow-sm text-white ${canEdit ? "cursor-pointer hover:ring-2 hover:ring-green-300" : "cursor-default"}`}
                    style={{ left: pos.left, width: pos.width }}
                    title={`${row.facilityName} | ${row.inspection_type_label} | ${formatDate(row.startDate)} - ${formatDate(row.endDate)}`}
                  >
                    <div className="h-full flex items-center justify-between gap-2 px-2 text-[11px] font-semibold overflow-hidden">
                      <span className="truncate">{formatDate(row.startDate)} - {formatDate(row.endDate)}</span>
                      {canEdit && <Edit2 className="w-3 h-3 shrink-0" />}
                    </div>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-gray-200 bg-slate-50 px-5 py-3 text-xs text-slate-600">
        <span className="font-semibold uppercase tracking-wide text-slate-500">Legend</span>
        {Object.entries(statusConfig).map(([value, config]) => (
          <span key={value} className="flex items-center gap-2"><span className={`w-3 h-3 rounded-sm ${config.bar}`} />{config.label}</span>
        ))}
        {canEdit && <span className="ml-auto text-slate-400">Click a bar to edit schedule details</span>}
      </div>

      {editingTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-label="Edit planned visit" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 rounded-t-2xl bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="flex items-center gap-2 text-xl font-bold text-white"><Edit2 className="h-5 w-5" /> Edit Planned Visit</h3>
                  <p className="mt-1 text-sm text-green-100">Update the visit schedule, assignment and status</p>
                </div>
                <button type="button" onClick={() => setEditingTask(null)} aria-label="Close modal" className="rounded-lg p-1 text-white transition hover:bg-white/10">
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <form onSubmit={(event) => { event.preventDefault(); saveEdit(); }} className="space-y-6 p-6">
              <div className="rounded-xl border border-green-100 bg-green-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Facility visit</p>
                <p className="mt-1 text-base font-semibold text-gray-800">{editingTask.facilityName}</p>
                <p className="mt-1 text-sm text-gray-600">{editingTask.plan_title || "Inspection plan"} · {editingTask.inspection_type_label || editingTask.name}</p>
              </div>

              <section>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800"><CalendarDays className="h-4 w-4 text-green-600" /> Visit dates</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Visit Date <span className="text-red-500">*</span></label>
                    <input type="date" required value={formData.scheduled_date || ""} max={formData.end_date || undefined} onChange={(event) => setFormData({ ...formData, scheduled_date: event.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">End Date <span className="text-red-500">*</span></label>
                    <input type="date" required value={formData.end_date || ""} min={formData.scheduled_date || undefined} onChange={(event) => setFormData({ ...formData, end_date: event.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500" />
                  </div>
                </div>
              </section>

              <section className="border-t border-gray-200 pt-5">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800"><User className="h-4 w-4 text-green-600" /> Visit details</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Inspector</label>
                    <select value={formData.assigned_inspector_id || ""} onChange={(event) => setFormData({ ...formData, assigned_inspector_id: event.target.value })} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-green-500">
                      <option value="">Unassigned</option>
                      {inspectors.map((inspector) => <option key={inspector.id} value={inspector.id}>{inspector.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Inspection Type</label>
                    <select value={formData.inspection_type || "ROUTINE"} onChange={(event) => setFormData({ ...formData, inspection_type: event.target.value })} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-green-500">
                      {inspectionTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                    <select value={formData.status || "scheduled"} onChange={(event) => setFormData({ ...formData, status: event.target.value })} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-green-500">
                      {Object.entries(statusConfig).map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}
                    </select>
                    {formData.status === "completed" && <p className="mt-2 text-xs text-green-700">Saving as Completed will move this visit from Upcoming to Past Visits.</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
                    <textarea value={formData.notes || ""} onChange={(event) => setFormData({ ...formData, notes: event.target.value })} rows="3" placeholder="Add scheduling or visit notes..." className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-green-500" />
                  </div>
                </div>
              </section>

              <div className="flex gap-3 border-t border-gray-200 pt-4">
                <button type="button" onClick={() => setEditingTask(null)} className="flex-1 rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-300">Cancel</button>
                <button type="submit" disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60">
                  <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
