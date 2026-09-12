// frontend/src/pages/GanttChartPage.jsx
import { useState, useEffect } from "react";
import PlanReview from "../components/PlanReview";
import Layout from "../components/Layout";
import GanttChart from "../components/GanttChart";
import PlanManagementModal from "../components/PlanManagementModal";
import { showToast } from "../components/Toast";
import {
  RefreshCw,
  Plus,
  FileText,
  Building2,
  Calendar,
  User,
  AlertCircle,
  CalendarDays,
  History
} from "lucide-react";

export default function GanttChartPage({ user, onLogout }) {
  const [showReview, setShowReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [ganttData, setGanttData] = useState({
    facilities: [],
    plans: [],
    schedules: [],
    focusAreas: [],
    timeline: { min_date: '', max_date: '', total_days: 0 }
  });
  const [error, setError] = useState("");
  const [scheduleOptions, setScheduleOptions] = useState({ inspectors: [], inspection_types: [] });
  const [viewMode, setViewMode] = useState("upcoming");

  useEffect(() => {
    fetchCurrentAdmin();
    fetchScheduleOptions();
  }, [user.token]);

  useEffect(() => {
    fetchGanttData(viewMode);
  }, [user.token, viewMode]);

  const fetchCurrentAdmin = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/hierarchy/my-admin-info/", {
        headers: { "Authorization": `Token ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentAdmin(data);
      } else {
        setCurrentAdmin(null);
      }
    } catch (error) {
      console.error("Error fetching current admin:", error);
      setCurrentAdmin(null);
    }
  };

  const fetchGanttData = async (mode = viewMode) => {
    setLoading(true);
    try {
      const query = mode === "past" ? "?view=past" : "";
      const response = await fetch(`http://127.0.0.1:8000/inspections/gantt-chart-data/${query}`, {
        headers: { "Authorization": `Token ${user.token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setError("");
        setGanttData({
          facilities: Array.isArray(data.facilities) ? data.facilities : [],
          plans: Array.isArray(data.plans) ? data.plans : [],
          schedules: Array.isArray(data.schedules) ? data.schedules : [],
          focusAreas: Array.isArray(data.focus_areas) ? data.focus_areas : [],
          timeline: data.timeline || { min_date: '', max_date: '', total_days: 0 }
        });
        return true;
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to load Gantt chart data");
        showToast("Failed to load data", "error");
        return false;
      }
    } catch (error) {
      console.error("Error fetching Gantt data:", error);
      setError("Network error");
      showToast("Network error", "error");
      return false;
    } finally {
      setLoading(false);
    }
  };


  const fetchScheduleOptions = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/inspections/schedules/options/", {
        headers: { "Authorization": `Token ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setScheduleOptions({
          inspectors: Array.isArray(data.inspectors) ? data.inspectors : [],
          inspection_types: Array.isArray(data.inspection_types) ? data.inspection_types : []
        });
      }
    } catch (error) {
      console.error("Error fetching schedule options:", error);
    }
  };

  const handleUpdateSchedule = async (scheduleId, payload) => {
    const response = await fetch(`http://127.0.0.1:8000/inspections/schedules/${scheduleId}/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Token ${user.token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to update schedule");
    }
    await fetchGanttData(viewMode);
    return data;
  };
  const handleRefresh = async () => {
    const refreshed = await fetchGanttData(viewMode);
    if (refreshed) showToast("Data refreshed", "success");
  };

  // Check if user is National Admin only
  const isNationalAdmin = () => {
    if (currentAdmin?.level === 'national') {
      return true;
    }
    if (user?.role === 'admin' || user?.role === 'national_admin') {
      return true;
    }
    return false;
  };

  const canEdit = isNationalAdmin();

  const handleEditPlan = (plan) => {
    setSelectedPlan(plan);
    setShowEditModal(true);
  };

  const handleOpenCreateModal = () => {
    setSelectedPlan(null);
    setShowCreateModal(true);
  };

  if (loading) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-700 flex items-center gap-2">
              <CalendarDays className="w-7 h-7 text-green-600" />
              Inspection Schedule
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {viewMode === "past" ? "Completed facility inspection visits" : "Nationwide inspection planning and scheduling"}
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {ganttData.plans?.length || 0} plans
              </span>
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {ganttData.facilities?.length || 0} facilities
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {ganttData.schedules?.length || 0} {viewMode === "past" ? "completed visits" : "scheduled"}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span className="capitalize">{user?.role}</span>
                {canEdit && (
                  <span className="text-green-600 font-medium ml-1">(Full Access)</span>
                )}
                {!canEdit && (
                  <span className="text-gray-500 font-medium ml-1">(View Only)</span>
                )}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {user.role === "national_admin" && <button className="rounded-lg bg-green-700 px-4 py-2 text-white" onClick={() => setShowReview(!showReview)}>Review QA inspection requests</button>}
            <div className="flex rounded-lg border border-gray-300 bg-white p-1 shadow-sm">
              <button type="button" onClick={() => setViewMode("upcoming")} className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${viewMode === "upcoming" ? "bg-green-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                <CalendarDays className="h-4 w-4" /> Upcoming
              </button>
              <button type="button" onClick={() => setViewMode("past")} className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${viewMode === "past" ? "bg-green-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                <History className="h-4 w-4" /> Past Visits
              </button>
            </div>
            <button
              onClick={handleRefresh}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            {canEdit && viewMode === "upcoming" && (
              <button 
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                onClick={handleOpenCreateModal}
              >
                <Plus className="w-4 h-4" />
                New Schedule Plan
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Gantt Chart */}
        {showReview && user.role === "national_admin" && <PlanReview user={user} onChanged={() => fetchGanttData()} />}
        <GanttChart
          user={user}
          plans={ganttData.plans || []}
          facilities={ganttData.facilities || []}
          schedules={ganttData.schedules || []}
          focusAreas={ganttData.focusAreas || []}
          timeline={ganttData.timeline || { min_date: '', max_date: '', total_days: 0 }}
          canEdit={canEdit && viewMode === "upcoming"}
          viewMode={viewMode}
          inspectors={scheduleOptions.inspectors}
          inspectionTypes={scheduleOptions.inspection_types}
          onUpdateTask={handleUpdateSchedule}
          onEditPlan={handleEditPlan}
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Plans</p>
                <p className="text-2xl font-bold text-green-600">{ganttData.plans?.length || 0}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Facilities</p>
                <p className="text-2xl font-bold text-green-600">{ganttData.facilities?.length || 0}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Building2 className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Scheduled</p>
                <p className="text-2xl font-bold text-green-600">{ganttData.schedules?.length || 0}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Focus Areas</p>
                <p className="text-2xl font-bold text-green-600">{ganttData.focusAreas?.length || 0}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal - Only for National Admin */}
      {showCreateModal && canEdit && (
        <PlanManagementModal
          user={user}
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedPlan(null);
          }}
          onSuccess={() => {
            handleRefresh();
          }}
          planToEdit={null}
          isEditMode={false}
        />
      )}

      {/* Edit Modal - Only for National Admin */}
      {showEditModal && selectedPlan && canEdit && (
        <PlanManagementModal
          user={user}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedPlan(null);
          }}
          onSuccess={() => {
            handleRefresh();
          }}
          planToEdit={selectedPlan}
          isEditMode={true}
        />
      )}
    </Layout>
  );
}

