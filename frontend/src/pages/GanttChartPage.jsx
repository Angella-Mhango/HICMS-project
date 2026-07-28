// frontend/src/pages/GanttChartPage.jsx
import { useState, useEffect } from "react";
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
  CalendarDays
} from "lucide-react";

export default function GanttChartPage({ user, onLogout }) {
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

  useEffect(() => {
    fetchCurrentAdmin();
  }, []);

  useEffect(() => {
    if (currentAdmin !== null) {
      fetchGanttData();
      fetchScheduleOptions();
    }
  }, [currentAdmin]);

  const fetchCurrentAdmin = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/hierarchy/my-admin-info/", {
        headers: { "Authorization": `Token ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentAdmin(data);
        console.log("Current Admin:", data);
      } else {
        setCurrentAdmin(null);
      }
    } catch (error) {
      console.error("Error fetching current admin:", error);
      setCurrentAdmin(null);
    }
  };

  const fetchGanttData = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/inspections/gantt-chart-data/", {
        headers: { "Authorization": `Token ${user.token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setGanttData({
          facilities: Array.isArray(data.facilities) ? data.facilities : [],
          plans: Array.isArray(data.plans) ? data.plans : [],
          schedules: Array.isArray(data.schedules) ? data.schedules : [],
          focusAreas: Array.isArray(data.focus_areas) ? data.focus_areas : [],
          timeline: data.timeline || { min_date: '', max_date: '', total_days: 0 }
        });
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to load Gantt chart data");
        showToast("Failed to load data", "error");
      }
    } catch (error) {
      console.error("Error fetching Gantt data:", error);
      setError("Network error");
      showToast("Network error", "error");
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
    await fetchGanttData();
    return data;
  };
  const handleRefresh = () => {
    fetchGanttData();
    showToast("Data refreshed", "success");
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
    console.log("âœï¸ Editing plan:", plan);
    setSelectedPlan(plan);
    setShowEditModal(true);
  };

  const handleOpenCreateModal = () => {
    console.log("ðŸ”„ Opening Create Plan Modal");
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
              Nationwide inspection planning and scheduling
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
                {ganttData.schedules?.length || 0} scheduled
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
          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            {canEdit && (
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
        <GanttChart
          user={user}
          plans={ganttData.plans || []}
          facilities={ganttData.facilities || []}
          schedules={ganttData.schedules || []}
          focusAreas={ganttData.focusAreas || []}
          timeline={ganttData.timeline || { min_date: '', max_date: '', total_days: 0 }}
          canEdit={canEdit}
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
            console.log("ðŸ”´ Closing Create Plan Modal");
            setShowCreateModal(false);
            setSelectedPlan(null);
          }}
          onSuccess={() => {
            console.log("âœ… Plan created successfully, refreshing data...");
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
            console.log("ðŸ”´ Closing Edit Plan Modal");
            setShowEditModal(false);
            setSelectedPlan(null);
          }}
          onSuccess={() => {
            console.log("âœ… Plan updated successfully, refreshing data...");
            handleRefresh();
          }}
          planToEdit={selectedPlan}
          isEditMode={true}
        />
      )}
    </Layout>
  );
}

