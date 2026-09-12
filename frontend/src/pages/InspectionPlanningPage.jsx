// frontend/src/pages/InspectionPlanningPage.jsx
import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { showToast } from "../components/Toast";
import useModalExperience from "../components/useModalExperience";
import {
  Calendar,
  Plus,
  RefreshCw,
  FileText,
  Building2,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  Pencil,
  Trash2,
  Search,
  Filter,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export default function InspectionPlanningPage({ user, onLogout }) {
  const [hasPreInspection, setHasPreInspection] = useState(false);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [facilityInfo, setFacilityInfo] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    departments: [],
    preparation_date: "",
    focal_person: "",
    status: "submitted"
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedPlans, setExpandedPlans] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useModalExperience(showCreateModal, () => {
    setShowCreateModal(false);
    setEditingPlan(null);
  });

  useEffect(() => {
    fetchFacilityInfo();
  }, []);

  useEffect(() => {
    if (facilityInfo) {
      fetch(`http://127.0.0.1:8000/inspections/pre-inspection/${facilityInfo.facility.id}/`, { headers: { Authorization: `Token ${user.token}` } })
        .then(res => res.ok ? res.json() : Promise.reject()).then(data => setHasPreInspection(Boolean(data.id))).catch(() => setHasPreInspection(false));
      fetchDepartments();
      fetchPlans();
    }
  }, [facilityInfo]);

  const fetchFacilityInfo = async () => {
    try {
      const meResponse = await fetch("http://127.0.0.1:8000/accounts/me/", {
        headers: { "Authorization": `Token ${user.token}` }
      });
      
      if (meResponse.ok) {
        const userData = await meResponse.json();
        if (userData.facility_id) {
          const facilityRes = await fetch(`http://127.0.0.1:8000/facilities/api/${userData.facility_id}/`, {
            headers: { "Authorization": `Token ${user.token}` }
          });
          if (facilityRes.ok) {
            const facility = await facilityRes.json();
            setFacilityInfo({ facility, level: "facility" });
            return;
          }
        }
      }
      
      setError("Your QA account is not assigned to a facility. Ask an administrator to assign your facility.");
      setLoading(false);
    } catch (error) {
      console.error("Error fetching facility info:", error);
      setError("Unable to load your assigned facility.");
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    if (!facilityInfo?.facility?.id) return;
    try {
      const response = await fetch(`http://127.0.0.1:8000/facilities/${facilityInfo.facility.id}/departments/`, {
        headers: { "Authorization": `Token ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments || data);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/inspections/facility/${facilityInfo.facility.id}/plans/`, {
        headers: { "Authorization": `Token ${user.token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPlans(data);
        setLoading(false);
        return;
      }
      
      const data = await response.json().catch(() => ({}));
      setError(data.error || "Failed to load inspection plans.");
      setPlans([]);
    } catch (error) {
      console.error("Error fetching plans:", error);
      showToast("Failed to load plans", "error");
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast("Plan title is required", "warning");
      return;
    }
    if (!formData.preparation_date) {
      showToast("Please select a preparation date", "warning");
      return;
    }
    if (formData.departments.length === 0) {
      showToast("Please select at least one department", "warning");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/inspections/facility/plans/create/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${user.token}`
        },
        body: JSON.stringify({
          ...formData,
          facility_id: facilityInfo.facility.id
        })
      });

      const text = await response.text();
      const data = text ? JSON.parse(text) : {};

      if (response.ok) {
        showToast("Inspection plan created successfully!", "success");
        setShowCreateModal(false);
        resetForm();
        fetchPlans();
      } else {
        showToast(data.error || "Failed to create plan", "error");
      }
    } catch (error) {
      console.error("Error creating plan:", error);
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePlan = async (e) => {
    e.preventDefault();
    if (!editingPlan?.id) return;

    setSaving(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/inspections/facility/plans/${editingPlan.id}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${user.token}`
        },
        body: JSON.stringify(formData)
      });

      const text = await response.text();
      const data = text ? JSON.parse(text) : {};

      if (response.ok) {
        showToast("Plan updated successfully!", "success");
        setShowCreateModal(false);
        setEditingPlan(null);
        resetForm();
        fetchPlans();
      } else {
        showToast(data.error || "Failed to update plan", "error");
      }
    } catch (error) {
      console.error("Error updating plan:", error);
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm("Are you sure you want to delete this plan?")) return;
    try {
      const response = await fetch(`http://127.0.0.1:8000/inspections/facility/plans/${planId}/`, {
        method: "DELETE",
        headers: { "Authorization": `Token ${user.token}` }
      });

      if (response.ok) {
        showToast("Plan deleted successfully!", "success");
        fetchPlans();
      } else {
        showToast("Failed to delete plan", "error");
      }
    } catch (error) {
      console.error("Error deleting plan:", error);
      showToast("Network error", "error");
    }
  };

  const handleSubmitPlan = async (plan) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/inspections/facility/plans/${plan.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Token ${user.token}` },
        body: JSON.stringify({ status: "submitted" })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to submit plan");
      showToast("Plan submitted successfully", "success");
      fetchPlans();
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      departments: [],
      preparation_date: "",
      focal_person: "",
      status: "submitted"
    });
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingPlan(null);
    resetForm();
  };

  const toggleDepartment = (deptId) => {
    setFormData(prev => ({
      ...prev,
      departments: prev.departments.includes(deptId)
        ? prev.departments.filter(id => id !== deptId)
        : [...prev.departments, deptId]
    }));
  };

  const togglePlanExpand = (planId) => {
    setExpandedPlans(prev => ({
      ...prev,
      [planId]: !prev[planId]
    }));
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      draft: { label: "Draft", className: "bg-green-100 text-green-700" },
      active: { label: "Active", className: "bg-green-200 text-green-800" },
      approved: { label: "Approved", className: "bg-green-200 text-green-800" },
      submitted: { label: "Pending approval", className: "bg-green-100 text-green-700" },
      completed: { label: "Completed", className: "bg-green-200 text-green-800" }
    };
    const s = statusMap[status] || statusMap.draft;
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${s.className}`}>{s.label}</span>;
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return "bg-green-600";
    if (progress >= 50) return "bg-green-500";
    return "bg-green-400";
  };

  const filteredPlans = plans.filter(plan => {
    const matchesSearch = (plan.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          plan.focal_person?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || plan.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    );
  }

  if (error && !facilityInfo) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
          <h2 className="mt-3 text-lg font-semibold text-red-800">Facility assignment required</h2>
          <p className="mt-1 text-sm text-red-700">{error}</p>
        </div>
      </Layout>
    );
  }

  const facilityName = facilityInfo?.facility?.name || "Your Facility";

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-7 h-7 text-green-600" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-700">Inspection Planning</h1>
            <p className="text-sm text-gray-500 mt-1">
              Plan and prepare for inspections at {facilityName}
            </p>
          </div>
        </div>
      </div>

      {!hasPreInspection && <p className="mb-4 rounded border border-amber-300 bg-amber-50 p-4">Complete a pre-inspection before creating an inspection plan. <a className="underline" href="/pre-inspection">Go to pre-inspection</a></p>}
      {/* Quick Actions - All Green */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={fetchPlans}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
        <button
          onClick={() => {
            if (!hasPreInspection) return;
            setEditingPlan(null);
            resetForm();
            setShowCreateModal(true);
          }}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {hasPreInspection ? "New Plan" : "Pre-inspection required"}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-green-600 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search plans..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-green-600" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="submitted">Pending approval</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-500">
          Showing {filteredPlans.length} plan{filteredPlans.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Plans List */}
      <div className="space-y-4">
        {filteredPlans.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FileText className="w-16 h-16 text-green-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600">No Plans Found</h3>
            <p className="text-gray-400 mt-2">Create your first inspection plan to get started</p>
            <button
              onClick={() => {
                if (!hasPreInspection) return;
                setEditingPlan(null);
                resetForm();
                setShowCreateModal(true);
              }}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Plan
            </button>
          </div>
        ) : (
          filteredPlans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div 
                className="px-6 py-4 hover:bg-green-50 cursor-pointer transition flex items-center justify-between"
                onClick={() => togglePlanExpand(plan.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-800">{plan.title}</h3>
                    {getStatusBadge(plan.status)}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-green-600" />
                      {plan.preparation_date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-green-600" />
                      {plan.departments?.length || 0} departments
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-600" />
                      {plan.progress || 0}% complete
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-32">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`${getProgressColor(plan.progress || 0)} h-2 rounded-full transition-all`}
                        style={{ width: `${plan.progress || 0}%` }}
                      />
                    </div>
                  </div>
                  {expandedPlans[plan.id] ? (
                    <ChevronUp className="w-5 h-5 text-green-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-green-600" />
                  )}
                </div>
              </div>

              {expandedPlans[plan.id] && (
                <div className="px-6 py-4 border-t border-gray-100 bg-green-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Description</p>
                      <p className="text-sm text-gray-800">{plan.description || "No description"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Focal Person</p>
                      <p className="text-sm text-gray-800">{plan.focal_person || "Not assigned"}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-500">Departments</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {(plan.department_names?.length ? plan.department_names : plan.departments || []).map((dept) => (
                          <span key={dept} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                            {dept}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {["draft", "active"].includes(plan.status) && <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPlan(plan);
                        setFormData({
                          title: plan.title,
                          description: plan.description || "",
                          departments: plan.departments || [],
                          preparation_date: plan.preparation_date || "",
                          focal_person: plan.focal_person || "",
                          status: plan.status
                        });
                        setShowCreateModal(true);
                      }}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-1"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlan(plan.id);
                      }}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                    {plan.status !== "submitted" && plan.status !== "completed" && <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSubmitPlan(plan);
                      }}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Submit
                    </button>}
                  </div>}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-800 px-6 py-4 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    {editingPlan ? "Edit Inspection Plan" : "Create New Inspection Plan"}
                  </h2>
                  <p className="text-green-100 text-sm">
                    {editingPlan ? "Update your inspection plan" : "Plan and prepare for upcoming inspections"}
                  </p>
                </div>
                <button 
                  onClick={closeModal}
                  className="text-white hover:text-gray-200 transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={editingPlan ? handleUpdatePlan : handleCreatePlan} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plan Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Q3 2026 Preparation Plan"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the scope of this plan..."
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preparation Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.preparation_date}
                  onChange={(e) => setFormData({ ...formData, preparation_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Focal Person</label>
                <input
                  type="text"
                  value={formData.focal_person}
                  onChange={(e) => setFormData({ ...formData, focal_person: e.target.value })}
                  placeholder="Name of the internal focal person"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Departments <span className="text-red-500">*</span>
                </label>
                <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {departments.length === 0 ? (
                    <p className="text-sm text-gray-400">No departments available</p>
                  ) : (
                    departments.map((dept) => {
                      const isSelected = formData.departments.includes(dept.id);
                      return (
                        <label
                          key={dept.id}
                          className={`flex items-center gap-2 cursor-pointer p-2 rounded transition ${
                            isSelected ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleDepartment(dept.id)}
                            className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                          />
                          <span className="text-sm text-gray-700">{dept.name}</span>
                          {isSelected && <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />}
                        </label>
                      );
                    })
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Selected: {formData.departments.length} departments
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="draft">Draft</option>
                  <option value="submitted">Pending approval</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus className="w-4 h-4" />
                  {saving ? "Saving..." : editingPlan ? "Update Plan" : "Create Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
