// frontend/src/components/PlanManagementModal.jsx
import { useState, useEffect } from "react";
import {
  X,
  Calendar,
  CalendarDays,
  Building2,
  ClipboardList,
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2,
  Save,
  FileText,
  Clock,
  RefreshCw,
  Search
} from "lucide-react";
import { showToast } from "./Toast";
import useModalExperience from "./useModalExperience";

const getInitialFormData = () => {
  const today = new Date();
  const endDate = new Date(today);
  const deadline = new Date(today);
  endDate.setMonth(endDate.getMonth() + 3);
  deadline.setDate(deadline.getDate() + 30);

  return {
    title: "",
    description: "",
    start_date: today.toISOString().split("T")[0],
    end_date: endDate.toISOString().split("T")[0],
    pre_inspection_deadline: deadline.toISOString().split("T")[0],
    quarter: `Q${Math.floor(today.getMonth() / 3) + 1}`,
    year: today.getFullYear(),
    is_recurring: false,
    recurrence_pattern: "quarterly",
    status: "draft",
    focus_standard_ids: [],
    facility_ids: []
  };
};

export default function PlanManagementModal({
  user,
  isOpen,
  onClose,
  onSuccess,
  planToEdit,
  isEditMode = false
}) {
  useModalExperience(isOpen, onClose);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [facilities, setFacilities] = useState([]);
  const [standards, setStandards] = useState([]);
  const [searchFacility, setSearchFacility] = useState("");
  const [searchStandard, setSearchStandard] = useState("");
  const [formData, setFormData] = useState(getInitialFormData);
  const selectedFacilities = formData.facility_ids;
  const selectedStandards = formData.focus_standard_ids;

  useEffect(() => {
    if (isOpen) {
      fetchFacilities();
      fetchStandards();
      
      if (isEditMode && planToEdit) {
        // Populate form with plan data for editing
        setFormData({
          title: planToEdit.title || "",
          description: planToEdit.description || "",
          start_date: planToEdit.start_date || "",
          end_date: planToEdit.end_date || "",
          pre_inspection_deadline: planToEdit.pre_inspection_deadline || "",
          quarter: planToEdit.quarter || "Q2",
          year: planToEdit.year || new Date().getFullYear(),
          is_recurring: planToEdit.is_recurring || false,
          recurrence_pattern: planToEdit.recurrence_pattern || "quarterly",
          status: planToEdit.status || "draft",
          focus_standard_ids: (planToEdit.focus_standard_ids || []).map(Number),
          facility_ids: (planToEdit.facility_ids || []).map(Number)
        });
      } else {
        setFormData(getInitialFormData());
      }
      setSearchFacility("");
      setSearchStandard("");
      setError("");
    }
  }, [isOpen, isEditMode, planToEdit]);

  const fetchFacilities = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/facilities/api/", {
        headers: { "Authorization": `Token ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setFacilities(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching facilities:", error);
      showToast("Failed to load facilities", "error");
    }
  };

  const fetchStandards = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/standards/", {
        headers: { "Authorization": `Token ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStandards(Array.isArray(data) ? data.filter(standard => standard.is_active !== false) : []);
      } else {
        throw new Error("Standards request failed");
      }
    } catch (error) {
      console.error("Error fetching standards:", error);
      showToast("Failed to load standards", "error");
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const toggleFacility = (facilityId) => {
    setFormData(prev => {
      const currentIds = prev.facility_ids || [];
      const newIds = currentIds.includes(facilityId)
        ? currentIds.filter(id => id !== facilityId)
        : [...currentIds, facilityId];
      return { ...prev, facility_ids: newIds };
    });
  };

  const toggleStandard = (standardId) => {
    setFormData(prev => {
      const currentIds = prev.focus_standard_ids || [];
      const newIds = currentIds.includes(standardId)
        ? currentIds.filter(id => id !== standardId)
        : [...currentIds, standardId];
      return { ...prev, focus_standard_ids: newIds };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    // Validation
    if (!formData.title.trim()) {
      setError("Plan title is required");
      showToast("Plan title is required", "warning");
      setSaving(false);
      return;
    }
    if (!formData.start_date) {
      setError("Start date is required");
      showToast("Start date is required", "warning");
      setSaving(false);
      return;
    }
    if (!formData.end_date) {
      setError("End date is required");
      showToast("End date is required", "warning");
      setSaving(false);
      return;
    }
    if (!formData.pre_inspection_deadline) {
      setError("Pre-inspection deadline is required");
      showToast("Pre-inspection deadline is required", "warning");
      setSaving(false);
      return;
    }
    if (formData.end_date < formData.start_date) {
      setError("End date cannot be before the start date");
      showToast("End date cannot be before the start date", "warning");
      setSaving(false);
      return;
    }
    if (formData.facility_ids.length === 0) {
      setError("Please select at least one facility");
      showToast("Please select at least one facility", "warning");
      setSaving(false);
      return;
    }
    if (formData.focus_standard_ids.length === 0) {
      setError("Please select at least one focus standard");
      showToast("Please select at least one focus standard", "warning");
      setSaving(false);
      return;
    }

    try {
      const url = isEditMode
        ? `http://127.0.0.1:8000/inspections/plans/${planToEdit.id}/`
        : "http://127.0.0.1:8000/inspections/plans/create/";
      
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${user.token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        showToast(
          isEditMode ? "Plan updated successfully!" : "Plan created successfully!",
          "success"
        );
        onSuccess();
        onClose();
      } else {
        setError(data.error || `Failed to ${isEditMode ? 'update' : 'create'} plan`);
        showToast(data.error || `Failed to ${isEditMode ? 'update' : 'create'} plan`, "error");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      showToast("Network error. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Filter facilities by search
  const filteredFacilities = facilities.filter(f =>
    (f.name || "").toLowerCase().includes(searchFacility.toLowerCase()) ||
    (f.district || "").toLowerCase().includes(searchFacility.toLowerCase())
  );

  // Filter standards by search
  const filteredStandards = standards.filter(s => {
    const query = searchStandard.toLowerCase();
    return (s.name || "").toLowerCase().includes(query) ||
      (s.code || "").toLowerCase().includes(query);
  });

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
    >
      <div role="dialog" aria-modal="true" aria-label={isEditMode ? "Edit inspection plan" : "Create inspection plan"} className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 rounded-t-2xl z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {isEditMode ? (
                  <>
                    <Save className="w-5 h-5" />
                    Edit Inspection Plan
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Create New Inspection Plan
                  </>
                )}
              </h2>
              <p className="text-green-100 text-sm mt-1">
                {isEditMode ? "Update plan details" : "Plan nationwide inspections and scheduling"}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="text-white hover:text-gray-200 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                Plan Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Q2 2026 Nationwide Inspection"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm placeholder-gray-400"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the inspection plan..."
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm placeholder-gray-400 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                Pre-Inspection Deadline <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="pre_inspection_deadline"
                value={formData.pre_inspection_deadline}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-gray-400" />
                Quarter
              </label>
              <select
                name="quarter"
                value={formData.quarter}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm bg-white"
              >
                <option value="Q1">Q1 (Jan - Mar)</option>
                <option value="Q2">Q2 (Apr - Jun)</option>
                <option value="Q3">Q3 (Jul - Sep)</option>
                <option value="Q4">Q4 (Oct - Dec)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm bg-white"
              >
                <option value="draft">📝 Draft</option>
                <option value="published">📢 Published</option>
                <option value="in_progress">⏳ In Progress</option>
                <option value="completed">✅ Completed</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_recurring"
                  checked={formData.is_recurring}
                  onChange={handleChange}
                  className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">Recurring Plan</span>
              </label>
              {formData.is_recurring && (
                <select
                  name="recurrence_pattern"
                  value={formData.recurrence_pattern}
                  onChange={handleChange}
                  className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm bg-white"
                >
                  <option value="quarterly">Quarterly</option>
                  <option value="bi_annual">Bi-Annual</option>
                  <option value="annual">Annual</option>
                </select>
              )}
            </div>
          </div>

          {/* Focus Standards Selection */}
          <div className="border-t border-gray-200 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-gray-400" />
              Focus Standards <span className="text-red-500">*</span>
              <span className="text-xs text-gray-500 font-normal ml-2">
                (Select the standards that will be inspected)
              </span>
            </label>
            <div className="mb-2 flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search standards..."
                  value={searchStandard}
                  onChange={(e) => setSearchStandard(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm placeholder-gray-400"
                />
              </div>
              <button type="button" onClick={() => setFormData(prev => ({ ...prev, focus_standard_ids: filteredStandards.map(s => s.id) }))} className="whitespace-nowrap rounded-lg border border-green-600 px-3 py-2 text-sm text-green-700 hover:bg-green-50">Select shown</button>
              <button type="button" onClick={() => setFormData(prev => ({ ...prev, focus_standard_ids: [] }))} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100">Clear</button>
            </div>
            <div className="border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto bg-gray-50">
              {filteredStandards.length === 0 ? (
                <p className="text-gray-400 text-center py-2 text-sm">No standards found</p>
              ) : (
                filteredStandards.map(standard => {
                  const isChecked = selectedStandards.includes(standard.id);
                  return (
                    <label 
                      key={standard.id} 
                      className={`flex items-center gap-2 cursor-pointer p-1.5 rounded transition ${
                        isChecked ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleStandard(standard.id)}
                        className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700 flex-1">
                        {standard.code && <span className="font-medium">{standard.code} — </span>}
                        {standard.name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {standard.requirements?.length || 0} reqs
                      </span>
                      {isChecked && <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />}
                    </label>
                  );
                })
              )}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Selected: <span className="font-medium text-gray-700">{selectedStandards.length}</span> standards
            </div>
          </div>

          {/* Facilities Selection */}
          <div className="border-t border-gray-200 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              Facilities <span className="text-red-500">*</span>
              <span className="text-xs text-gray-500 font-normal ml-2">
                (Select facilities to include in this plan)
              </span>
            </label>
            <div className="mb-2">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search facilities by name or district..."
                  value={searchFacility}
                  onChange={(e) => setSearchFacility(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm placeholder-gray-400"
                />
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50">
              {filteredFacilities.length === 0 ? (
                <p className="text-gray-400 text-center py-2 text-sm">No facilities found</p>
              ) : (
                filteredFacilities.map(facility => {
                  const isChecked = selectedFacilities.includes(facility.id);
                  return (
                    <label 
                      key={facility.id} 
                      className={`flex items-center gap-2 cursor-pointer p-1.5 rounded transition ${
                        isChecked ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleFacility(facility.id)}
                        className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700 flex-1">{facility.name}</span>
                      <span className="text-xs text-gray-400">
                        {facility.district || 'N/A'} • {facility.region || 'N/A'}
                      </span>
                      {isChecked && <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />}
                    </label>
                  );
                })
              )}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Selected: <span className="font-medium text-gray-700">{selectedFacilities.length}</span> facilities
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              Plan Summary
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Title:</span>
                <span className="text-gray-800 ml-2 font-medium">{formData.title || '(Not set)'}</span>
              </div>
              <div>
                <span className="text-gray-500">Quarter:</span>
                <span className="text-gray-800 ml-2">{formData.quarter} {formData.year}</span>
              </div>
              <div>
                <span className="text-gray-500">Duration:</span>
                <span className="text-gray-800 ml-2">
                  {formData.start_date ? new Date(formData.start_date).toLocaleDateString() : '—'} 
                  → 
                  {formData.end_date ? new Date(formData.end_date).toLocaleDateString() : '—'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                  formData.status === 'draft' ? 'bg-gray-200 text-gray-700' :
                  formData.status === 'published' ? 'bg-green-100 text-green-700' :
                  formData.status === 'in_progress' ? 'bg-green-100 text-green-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {formData.status}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">Facilities:</span>
                <span className="text-gray-800 ml-2">{selectedFacilities.length} selected</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">Focus Standards:</span>
                <span className="text-gray-800 ml-2">{selectedStandards.length} selected</span>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 px-4 py-2 rounded-lg transition text-sm font-medium flex items-center justify-center gap-2 ${
                saving
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  {isEditMode ? (
                    <>
                      <Save className="w-4 h-4" />
                      Update Plan
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Plan
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
