// frontend/src/pages/FacilityQADashboard.jsx
import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { showToast } from "../components/Toast";
import {
  LayoutDashboard,
  Building2,
  CheckCircle,
  XCircle,
  TrendingUp,
  Calendar,
  Clock,
  AlertCircle,
  FileText,
  RefreshCw,
  Award,
  ClipboardList,
  ArrowUpRight,
  ClipboardCheck,
  CalendarDays
} from "lucide-react";

export default function FacilityQADashboard({ user, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [facilityInfo, setFacilityInfo] = useState(null);
  const [stats, setStats] = useState({
    complianceScore: 0,
    totalInspections: 0,
    pendingActions: 0,
    overdueActions: 0,
    upcomingInspections: 0
  });
  const [recentInspections, setRecentInspections] = useState([]);
  const [pendingActions, setPendingActions] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  useEffect(() => {
    fetchFacilityData();
  }, []);

  const fetchFacilityData = async () => {
    setLoading(true);
    try {
      const meResponse = await fetch("http://127.0.0.1:8000/accounts/me/", {
        headers: { "Authorization": `Token ${user.token}` }
      });
      
      let facilityId = null;
      let facilityName = null;
      
      if (meResponse.ok) {
        const userData = await meResponse.json();
        if (userData.facility_id) {
          facilityId = userData.facility_id;
          facilityName = userData.facility_name;
        }
      }
      
      if (facilityId) {
        const facilityRes = await fetch(`http://127.0.0.1:8000/facilities/api/${facilityId}/`, {
          headers: { "Authorization": `Token ${user.token}` }
        });
        if (facilityRes.ok) {
          const facility = await facilityRes.json();
          setFacilityInfo({ facility, level: "facility" });
          await fetchFacilityStats(facilityId);
          await fetchRecentInspections(facilityId);
          await fetchPendingActions(facilityId);
          await fetchUpcomingEvents(facilityId);
        } else {
          setFacilityInfo({
            facility: { id: facilityId, name: facilityName || "Your Facility" },
            level: "facility"
          });
          setFallbackData();
        }
      } else {
        setFacilityInfo({
          facility: { id: 1, name: "Kamuzu Central Hospital" },
          level: "facility"
        });
        setFallbackData();
      }
    } catch (error) {
      console.error("Error fetching facility data:", error);
      showToast("Failed to load facility data", "error");
      setFallbackData();
    } finally {
      setLoading(false);
    }
  };

  const setFallbackData = () => {
    setStats({
      complianceScore: 78,
      totalInspections: 24,
      pendingActions: 5,
      overdueActions: 2,
      upcomingInspections: 3
    });
    setRecentInspections([
      { id: 1, date: "2026-06-15", score: 82, status: "Compliant", department: "OPD" },
      { id: 2, date: "2026-06-10", score: 65, status: "Non-compliant", department: "Emergency" },
      { id: 3, date: "2026-06-05", score: 91, status: "Compliant", department: "Maternity" }
    ]);
    setPendingActions([
      { id: 1, issue: "Fire extinguisher expired", deadline: "2026-07-01", severity: "High" },
      { id: 2, issue: "Hand hygiene compliance below 70%", deadline: "2026-06-25", severity: "Critical" }
    ]);
    setUpcomingEvents([
      { id: 1, type: "Pre-Inspection", date: "2026-06-20", status: "Pending" },
      { id: 2, type: "Official Inspection", date: "2026-07-05", status: "Scheduled" }
    ]);
  };

  const fetchFacilityStats = async (facilityId) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/inspections/facility/${facilityId}/stats/`, {
        headers: { "Authorization": `Token ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchRecentInspections = async (facilityId) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/inspections/facility/${facilityId}/recent/`, {
        headers: { "Authorization": `Token ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRecentInspections(data);
      }
    } catch (error) {
      console.error("Error fetching inspections:", error);
    }
  };

  const fetchPendingActions = async (facilityId) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/inspections/facility/${facilityId}/pending-actions/`, {
        headers: { "Authorization": `Token ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPendingActions(data);
      }
    } catch (error) {
      console.error("Error fetching pending actions:", error);
    }
  };

  const fetchUpcomingEvents = async (facilityId) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/inspections/facility/${facilityId}/upcoming/`, {
        headers: { "Authorization": `Token ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUpcomingEvents(data);
      }
    } catch (error) {
      console.error("Error fetching upcoming events:", error);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-green-500";
    return "text-red-600";
  };

  const getScoreBgColor = (score) => {
    if (score >= 80) return "bg-green-50 border-green-200";
    if (score >= 60) return "bg-green-50 border-green-200";
    return "bg-red-50 border-red-200";
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

  const facilityName = facilityInfo?.facility?.name || "Your Facility";

  return (
    <Layout user={user} onLogout={onLogout}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-7 h-7 text-green-600" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-700">Facility Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Welcome back, {user.username} • {facilityName}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards - All Green */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-green-600" />
            <p className="text-sm text-gray-500">Total Inspections</p>
          </div>
          <p className="text-2xl font-bold text-green-700">{stats.totalInspections || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <p className="text-sm text-gray-500">Compliance Rate</p>
          </div>
          <p className="text-2xl font-bold text-green-700">{stats.complianceScore || 0}%</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-green-600" />
            <p className="text-sm text-gray-500">Pending Actions</p>
          </div>
          <p className="text-2xl font-bold text-green-700">{stats.pendingActions || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <p className="text-sm text-gray-500">Overdue Actions</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.overdueActions || 0}</p>
        </div>
      </div>

      {/* Compliance Score Card */}
      <div className={`rounded-xl p-6 border ${getScoreBgColor(stats.complianceScore)} mb-8`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Overall Compliance Score</p>
            <p className={`text-3xl font-bold ${getScoreColor(stats.complianceScore)}`}>
              {stats.complianceScore}%
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Based on {stats.totalInspections} inspections
            </p>
          </div>
          <div className="w-20 h-20 rounded-full bg-green-100 border border-green-300 flex items-center justify-center">
            <div className="text-center">
              <Award className="w-8 h-8 mx-auto text-green-600" />
              <span className="text-xs font-medium text-green-700">
                {stats.complianceScore >= 80 ? "Excellent" :
                 stats.complianceScore >= 60 ? "Good" : "Needs Improvement"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-800">Recent Inspections</h3>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {recentInspections.length === 0 ? (
              <div className="p-6 text-center text-gray-400">No recent inspections</div>
            ) : (
              recentInspections.map((inspection) => (
                <div key={inspection.id} className="px-6 py-4 hover:bg-green-50 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{inspection.department}</p>
                      <p className="text-xs text-gray-500">{inspection.date}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold ${getScoreColor(inspection.score)}`}>
                        {inspection.score}%
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        inspection.status === "Compliant" 
                          ? "bg-green-100 text-green-700" 
                          : "bg-red-100 text-red-700"
                      }`}>
                        {inspection.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-800">Upcoming Events</h3>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {upcomingEvents.length === 0 ? (
              <div className="p-6 text-center text-gray-400">No upcoming events</div>
            ) : (
              upcomingEvents.map((event) => (
                <div key={event.id} className="px-6 py-4 hover:bg-green-50 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{event.type}</p>
                      <p className="text-xs text-gray-500">{event.date}</p>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                      {event.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Pending Corrective Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-800">Pending Corrective Actions</h3>
            </div>
            <span className="text-sm text-gray-500">{pendingActions.length} pending</span>
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {pendingActions.length === 0 ? (
            <div className="p-6 text-center text-gray-400">No pending corrective actions</div>
          ) : (
            pendingActions.map((action) => (
              <div key={action.id} className="px-6 py-4 hover:bg-green-50 transition">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{action.issue}</p>
                    <p className="text-xs text-gray-500">Deadline: {action.deadline}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      action.severity === "Critical" 
                        ? "bg-red-100 text-red-700" 
                        : "bg-green-100 text-green-700"
                    }`}>
                      {action.severity}
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-green-600" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions - All Green */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button 
          onClick={() => window.location.href = "/pre-inspection"}
          className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
        >
          <ClipboardCheck className="w-5 h-5" />
          Pre-Inspection
        </button>
        <button 
          onClick={() => window.location.href = "/inspection-planning"}
          className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
        >
          <Calendar className="w-5 h-5" />
          Planning
        </button>
        <button 
          onClick={() => window.location.href = "/corrective-actions"}
          className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
        >
          <ClipboardList className="w-5 h-5" />
          Corrective Actions
        </button>
        <button 
          onClick={() => window.location.href = "/national-schedule"}
          className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
        >
          <CalendarDays className="w-5 h-5" />
          National Schedule
        </button>
      </div>
    </Layout>
  );
}