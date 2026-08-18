// frontend/src/components/GanttChart.jsx
import { useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  Clock,
  Edit2,
  Search,
  User,
  X
} from "lucide-react";
import { showToast } from "./Toast";

const DAY_MS = 24 * 60 * 60 * 1000;
const LEFT_WIDTH = 560;
const DAY_WIDTH = 10;

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
  return date ? date.toISOString().slice(0, 10) : "";
};

const daysBetween = (start, end) => Math.round((end - start) / DAY_MS);
const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS);

const statusConfig = {
  scheduled: { label: "Scheduled", bar: "bg-green-600", badge: "bg-green-50 text-green-700 border-green-200" },
  rescheduled: { label: "Rescheduled", bar: "bg-green-500", badge: "bg-green-50 text-green-700 border-green-200" },
  in_progress: { label: "In Progress", bar: "bg-green-600", badge: "bg-green-50 text-green-700 border-green-200" },
  completed: { label: "Completed", bar: "bg-slate-500", badge: "bg-slate-50 text-slate-700 border-slate-200" },
  cancelled: { label: "Cancelled", bar: "bg-red-600", badge: "bg-red-50 text-red-700 border-red-200" }
};

export default function GanttChart({ facilities, timeline, canEdit = false, inspectors = [], inspectionTypes = [], onUpdateTask }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

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
        left: daysBetween(bounds.minDate, start) * DAY_WIDTH,
        width: Math.max((daysBetween(start, end) + 1) * DAY_WIDTH, DAY_WIDTH)
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return result;
  }, [bounds]);

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      const haystack = `${row.facilityName} ${row.assigned_to} ${row.inspection_type_label} ${row.plan_title} ${row.district} ${row.region}`.toLowerCase();
      return matchesStatus && (!search || haystack.includes(search));
    });
  }, [query, rows, statusFilter]);

  const timelineWidth = Math.max(bounds.totalDays * DAY_WIDTH, 820);

  const positionFor = (row) => {
    const left = daysBetween(bounds.minDate, row.startDate) * DAY_WIDTH;
    const duration = Math.max(daysBetween(row.startDate, row.endDate) + 1, 1);
    return { left, width: Math.max(duration * DAY_WIDTH, 24) };
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
        <h3 className="text-lg font-semibold text-gray-700">No Future Inspection Schedule</h3>
        <p className="text-sm text-gray-500 mt-2">Create an inspection plan to schedule future facility visits.</p>
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
              Future Inspection Plan
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {formatDate(bounds.minDate)} to {formatDate(bounds.maxDate)} | {filteredRows.length} planned visit{filteredRows.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
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
          </div>
        </div>
      </div>

      <div className="overflow-auto max-h-[680px]">
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
            </div>
          </div>

          {filteredRows.map((row) => {
            const config = statusConfig[row.status] || statusConfig.scheduled;
            const pos = positionFor(row);
            return (
              <div key={`${row.facilityId}-${row.id}`} className="flex border-b border-gray-100 hover:bg-slate-50">
                <div className="sticky left-0 z-10 grid grid-cols-[1.3fr_1fr_1fr_86px] gap-3 border-r border-gray-200 bg-white px-4 py-3" style={{ width: LEFT_WIDTH }}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="w-4 h-4 text-green-700 shrink-0" />
                      <p className="truncate text-sm font-semibold text-slate-800">{row.facilityName}</p>
                    </div>
                    <p className="truncate text-xs text-slate-400 mt-1">{row.district || "N/A"} | {row.plan_title || "Plan"}</p>
                  </div>
                  <p className="truncate text-sm text-slate-700">{row.inspection_type_label || row.name}</p>
                  <div className="min-w-0 flex items-start gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <span className="truncate text-sm text-slate-600">{row.assigned_to || "Unassigned"}</span>
                  </div>
                  <span className={`inline-flex h-fit items-center justify-center rounded-full border px-2 py-1 text-[11px] font-semibold ${config.badge}`}>
                    {config.label}
                  </span>
                </div>

                <div className="relative min-h-[72px] bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px)]" style={{ width: timelineWidth, backgroundSize: `${DAY_WIDTH * 7}px 100%` }}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Edit Planned Visit</h3>
                <p className="text-sm text-gray-500">{editingTask.facilityName}</p>
              </div>
              <button onClick={() => setEditingTask(null)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Visit Date</label>
                <input type="date" value={formData.scheduled_date || ""} onChange={(event) => setFormData({ ...formData, scheduled_date: event.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">End Date</label>
                <input type="date" value={formData.end_date || ""} onChange={(event) => setFormData({ ...formData, end_date: event.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Inspector</label>
                <select value={formData.assigned_inspector_id || ""} onChange={(event) => setFormData({ ...formData, assigned_inspector_id: event.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white">
                  <option value="">Unassigned</option>
                  {inspectors.map((inspector) => <option key={inspector.id} value={inspector.id}>{inspector.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Inspection Type</label>
                <select value={formData.inspection_type || "ROUTINE"} onChange={(event) => setFormData({ ...formData, inspection_type: event.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white">
                  {inspectionTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                <select value={formData.status || "scheduled"} onChange={(event) => setFormData({ ...formData, status: event.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white">
                  {Object.entries(statusConfig).map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
                <textarea value={formData.notes || ""} onChange={(event) => setFormData({ ...formData, notes: event.target.value })} rows="3" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-3 border-t border-gray-200 px-6 py-4">
              <button onClick={() => setEditingTask(null)} className="flex-1 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">Cancel</button>
              <button onClick={saveEdit} disabled={saving} className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60">
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
