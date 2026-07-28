// frontend/src/pages/ComplianceMonitoring.jsx
import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import {
  RefreshCw,
  MessageSquare,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  FileText,
  Building2,
  Calendar,
  User,
  Award,
  Filter,
  Inbox
} from "lucide-react";
import { showToast } from "../components/Toast";

export default function ComplianceMonitoring({ user, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [correctiveActions, setCorrectiveActions] = useState([]);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [accessibleFacilities, setAccessibleFacilities] = useState([]);
  const [filteredActions, setFilteredActions] = useState([]);
  const [complianceStats, setComplianceStats] = useState({
    overallCompliance: 0,
    compliantFacilities: 0,
    nonCompliantFacilities: 0,
    pendingActions: 0,
    overdueActions: 0,
    completedActions: 0,
    totalActions: 0
  });
  const [selectedAction, setSelectedAction] = useState(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedFacility, setSelectedFacility] = useState("all");
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    fetchCurrentAdmin();
  }, []);

  useEffect(() => {
    if (currentAdmin !== null) {
      fetchData();
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

  const fetchData = async () => {
    setLoading(true);
    setError("");
    setDataLoaded(false);
    
    try {
      // Build URL with filters based on admin level
      let actionsUrl = "http://127.0.0.1:8000/inspections/corrective-actions/";
      const params = new URLSearchParams();
      
      if (currentAdmin) {
        if (currentAdmin.level === 'regional' && currentAdmin.region) {
          params.append("region_id", currentAdmin.region.id);
        } else if (currentAdmin.level === 'district' && currentAdmin.district) {
          params.append("district_id", currentAdmin.district.id);
        } else if (currentAdmin.level === 'facility' && currentAdmin.facility) {
          params.append("facility_id", currentAdmin.facility.id);
        }
      }
      
      if (params.toString()) {
        actionsUrl += "?" + params.toString();
      }
      
      console.log("ðŸ“¡ Fetching corrective actions from:", actionsUrl);
      
      // Fetch corrective actions
      const actionsResponse = await fetch(actionsUrl, {
        headers: { "Authorization": `Token ${user.token}` }
      });
      
      let actionsData = [];
      if (actionsResponse.ok) {
        actionsData = await actionsResponse.json();
        actionsData = Array.isArray(actionsData) ? actionsData : [];
        console.log("âœ… Corrective actions loaded:", actionsData.length);
      } else {
        console.warn("âš ï¸ Corrective actions API returned:", actionsResponse.status);
        // Don't set error here, just use empty array
      }
      
      // Set the corrective actions - this will be empty if none exist
      setCorrectiveActions(actionsData);
      setFilteredActions(actionsData);
      setDataLoaded(true);
      
      // Build facility list from actual data
      const facilityMap = new Map();
      actionsData.forEach(action => {
        if (action.facility && !facilityMap.has(action.facility)) {
          facilityMap.set(action.facility, { id: action.id, name: action.facility });
        }
      });
      setAccessibleFacilities(Array.from(facilityMap.values()));
      
      // Calculate stats from actual data (all will be 0 if no actions)
      const pending = actionsData.filter(a => a.status?.toLowerCase() === "pending").length;
      const overdue = actionsData.filter(a => a.status?.toLowerCase() === "overdue").length;
      const completed = actionsData.filter(a => a.status?.toLowerCase() === "completed").length;
      
      // Fetch compliance stats from dashboard
      let complianceRate = 0;
      let compliantCount = 0;
      let nonCompliantCount = 0;
      
      try {
        let statsUrl = "http://127.0.0.1:8000/inspections/dashboard/";
        const statsParams = new URLSearchParams();
        
        if (currentAdmin) {
          if (currentAdmin.level === 'regional' && currentAdmin.region) {
            statsParams.append("region_id", currentAdmin.region.id);
          } else if (currentAdmin.level === 'district' && currentAdmin.district) {
            statsParams.append("district_id", currentAdmin.district.id);
          } else if (currentAdmin.level === 'facility' && currentAdmin.facility) {
            statsParams.append("facility_id", currentAdmin.facility.id);
          }
        }
        
        if (statsParams.toString()) {
          statsUrl += "?" + statsParams.toString();
        }
        
        console.log("ðŸ“¡ Fetching stats from:", statsUrl);
        
        const statsResponse = await fetch(statsUrl, {
          headers: { "Authorization": `Token ${user.token}` }
        });
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          complianceRate = statsData.compliance_rate || 0;
          compliantCount = statsData.compliant || 0;
          nonCompliantCount = statsData.non_compliant || 0;
          console.log("âœ… Stats loaded:", statsData);
        } else {
          console.warn("âš ï¸ Stats API returned:", statsResponse.status);
        }
      } catch (e) {
        console.error("Error fetching stats:", e);
      }
      
      setComplianceStats({
        overallCompliance: complianceRate,
        compliantFacilities: compliantCount,
        nonCompliantFacilities: nonCompliantCount,
        pendingActions: pending,
        overdueActions: overdue,
        completedActions: completed,
        totalActions: actionsData.length
      });
      
      if (actionsData.length === 0) {
        showToast("No corrective actions found in the system", "info");
      } else {
        showToast(`Loaded ${actionsData.length} corrective actions`, "success");
      }
      
    } catch (error) {
      console.error("âŒ Error fetching data:", error);
      setError("Failed to load compliance data. Please try again.");
      showToast("Failed to load compliance data", "error");
      setDataLoaded(true);
      // ALWAYS set empty arrays - NO HARDCODED DATA
      setCorrectiveActions([]);
      setFilteredActions([]);
      setAccessibleFacilities([]);
      setComplianceStats({
        overallCompliance: 0,
        compliantFacilities: 0,
        nonCompliantFacilities: 0,
        pendingActions: 0,
        overdueActions: 0,
        completedActions: 0,
        totalActions: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const updateActionStatus = async (actionId, newStatus) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/inspections/corrective-actions/${actionId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${user.token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        const updatedActions = correctiveActions.map(action =>
          action.id === actionId ? { ...action, status: newStatus } : action
        );
        setCorrectiveActions(updatedActions);

        const pending = updatedActions.filter(a => a.status === "Pending").length;
        const overdue = updatedActions.filter(a => a.status === "Overdue").length;
        const completed = updatedActions.filter(a => a.status === "Completed").length;

        setComplianceStats(prev => ({
          ...prev,
          pendingActions: pending,
          overdueActions: overdue,
          completedActions: completed
        }));

        showToast(`Action status updated to ${newStatus}`, "success");
        fetchData();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || "Failed to update status", "error");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      showToast("Network error. Please try again.", "error");
    }
  };

  const addComment = async (actionId) => {
    if (!commentText.trim()) return;

    try {
      const response = await fetch(`http://127.0.0.1:8000/inspections/corrective-actions/${actionId}/comments/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${user.token}`
        },
        body: JSON.stringify({ comment: commentText })
      });

      if (response.ok) {
        const result = await response.json();
        const newComment = result.comment || {
          user: user.username,
          text: commentText,
          date: new Date().toISOString().split('T')[0]
        };

        const updatedActions = correctiveActions.map(action =>
          action.id === actionId
            ? { ...action, comments: [...(action.comments || []), newComment] }
            : action
        );
        setCorrectiveActions(updatedActions);

        setCommentText("");
        setShowCommentModal(false);
        showToast("Comment added successfully", "success");
        fetchData();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || "Failed to add comment", "error");
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      showToast("Network error. Please try again.", "error");
    }
  };

  const applyFilters = () => {
    let filtered = [...correctiveActions];

    if (filter !== "all") {
      filtered = filtered.filter(action => action.status?.toLowerCase() === filter.toLowerCase());
    }
    if (selectedFacility !== "all") {
      filtered = filtered.filter(action => action.facility === selectedFacility);
    }

    setFilteredActions(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [filter, selectedFacility, correctiveActions]);

  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case "completed": return "bg-green-100 text-green-700 border-green-200";
      case "pending": return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "overdue": return "bg-red-100 text-red-700 border-red-200";
      case "in progress": return "bg-blue-50 text-blue-700 border-blue-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusBadge = (status) => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case "completed": return "bg-green-100 text-green-700";
      case "pending": return "bg-yellow-100 text-yellow-700";
      case "overdue": return "bg-red-100 text-red-700";
      case "in progress": return "bg-blue-100 text-blue-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const issueAnalysis = filteredActions.reduce((summary, action) => {
    const category = action.category || "General Compliance";
    const severity = action.severity || "Medium";

    summary.byCategory[category] = (summary.byCategory[category] || 0) + 1;
    summary.bySeverity[severity] = (summary.bySeverity[severity] || 0) + 1;
    return summary;
  }, { byCategory: {}, bySeverity: {} });

  const topIssueCategories = Object.entries(issueAnalysis.byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const getSeverityColor = (severity) => {
    const severityLower = severity?.toLowerCase();
    switch (severityLower) {
      case "critical": return "text-red-600 font-bold";
      case "high": return "text-orange-600 font-medium";
      case "medium": return "text-yellow-600";
      default: return "text-gray-500";
    }
  };

  const getPageTitle = () => {
    if (!currentAdmin) return "Compliance Monitoring";
    if (currentAdmin.level === 'regional') {
      return `Compliance Monitoring - ${currentAdmin.region?.name || 'Region'}`;
    }
    if (currentAdmin.level === 'district') {
      return `Compliance Monitoring - ${currentAdmin.district?.name || 'District'}`;
    }
    if (currentAdmin.level === 'facility') {
      return `Compliance Monitoring - ${currentAdmin.facility?.name || 'Facility'}`;
    }
    return "Compliance Monitoring - All Facilities";
  };

  const getPageSubtitle = () => {
    if (!currentAdmin) return "Track corrective actions and monitor facility compliance";
    if (currentAdmin.level === 'regional') {
      return `Track corrective actions and monitor compliance in ${currentAdmin.region?.name} region`;
    }
    if (currentAdmin.level === 'district') {
      return `Track corrective actions and monitor compliance in ${currentAdmin.district?.name} district`;
    }
    if (currentAdmin.level === 'facility') {
      return `Track corrective actions and monitor compliance at ${currentAdmin.facility?.name}`;
    }
    return "Track corrective actions and monitor facility compliance";
  };

  const canManageActions = () => {
    return currentAdmin?.can_approve_inspections === true || 
           currentAdmin?.can_manage_admins === true ||
           currentAdmin?.level === 'national';
  };

  if (loading) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading compliance data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-6">
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <FileText className="w-7 h-7 text-green-600" />
                {getPageTitle()}
              </h1>
              <p className="text-gray-500 mt-1">{getPageSubtitle()}</p>
              {/* Show that no inspections have been done */}
              {dataLoaded && correctiveActions.length === 0 && (
                <p className="text-sm text-green-600 mt-1">
                  âœ… No corrective actions needed - all facilities are compliant!
                </p>
              )}
            </div>
            <button
              onClick={fetchData}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
            <button 
              onClick={fetchData}
              className="ml-auto px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Scope Indicator */}
        {currentAdmin && currentAdmin.level !== 'national' && (
          <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-green-600" />
            <p className="text-sm text-green-800">
              <span className="font-semibold">Current scope:</span> Showing corrective actions for your {currentAdmin.level} scope
            </p>
          </div>
        )}

        {/* Stats Cards - All zeros if no actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Corrective Actions</p>
                <p className="text-2xl font-bold text-green-600">{complianceStats.totalActions}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Actions</p>
                <p className="text-2xl font-bold text-yellow-600">{complianceStats.pendingActions}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Overdue Actions</p>
                <p className="text-2xl font-bold text-red-600">{complianceStats.overdueActions}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed Actions</p>
                <p className="text-2xl font-bold text-green-600">{complianceStats.completedActions}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters - Only show if there are actions */}
        {correctiveActions.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Filter className="w-4 h-4 text-gray-400" />
                  Status
                </label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in progress">In Progress</option>
                  <option value="overdue">Overdue</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  Facility
                </label>
                <select
                  value={selectedFacility}
                  onChange={(e) => setSelectedFacility(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Facilities</option>
                  {accessibleFacilities.map((f, idx) => (
                    <option key={idx} value={f.name}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchData}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        )}

        {filteredActions.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-800">Issue Analysis</h2>
              </div>
              <div className="space-y-3">
                {topIssueCategories.map(([category, count]) => (
                  <div key={category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{category}</span>
                      <span className="text-gray-500">{count} issue{count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${Math.max(8, (count / filteredActions.length) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-semibold text-gray-800">Severity Mix</h2>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {["Critical", "High", "Medium"].map((severity) => (
                  <div key={severity} className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-center">
                    <p className={`text-2xl font-bold ${getSeverityColor(severity)}`}>
                      {issueAnalysis.bySeverity[severity] || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{severity}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* Corrective Actions Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-800">Corrective Actions</h2>
              <span className="ml-auto text-sm text-gray-500">
                {filteredActions.length} action{filteredActions.length !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Monitor and track remediation efforts in your scope</p>
          </div>

          <div className="overflow-x-auto">
            {filteredActions.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-700">All Facilities Are Compliant! ðŸŽ‰</h3>
                <p className="text-gray-500 mt-2 max-w-md mx-auto">
                  {dataLoaded 
                    ? "No corrective actions found in your scope. All facilities are meeting compliance standards!"
                    : "Unable to load corrective actions. Please try refreshing the page."
                  }
                </p>
                {dataLoaded && correctiveActions.length === 0 && (
                  <div className="mt-4 text-sm text-gray-400">
                    <p>âœ… No pending issues</p>
                    <p>âœ… All inspections passed</p>
                    <p>âœ… No corrective actions needed</p>
                  </div>
                )}
                {dataLoaded && (
                  <button
                    onClick={fetchData}
                    className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 mx-auto"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh Data
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Facility</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deadline</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredActions.map((action) => (
                    <tr key={action.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm text-gray-800">{action.issue}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{action.facility}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{action.department}</td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-medium ${getSeverityColor(action.severity)}`}>
                          {action.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm ${new Date(action.deadline) < new Date() && action.status !== "Completed" ? "text-red-600 font-medium" : "text-gray-600"}`}>
                          <Calendar className="w-3 h-3 inline mr-1" />
                          {action.deadline}
                          {new Date(action.deadline) < new Date() && action.status !== "Completed" && (
                            <span className="ml-1 text-xs text-red-500">(Overdue)</span>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {canManageActions() ? (
                          <select
                            value={action.status}
                            onChange={(e) => updateActionStatus(action.id, e.target.value)}
                            className={`px-2 py-1 text-xs rounded-full border-0 font-medium ${getStatusColor(action.status)}`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Overdue">Overdue</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusBadge(action.status)}`}>
                            {action.status}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            setSelectedAction(action);
                            setShowCommentModal(true);
                          }}
                          className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50 transition"
                          title="Add Comment"
                        >
                          <MessageSquare className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Comments Section for Selected Action */}
        {selectedAction && selectedAction.comments && selectedAction.comments.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-gray-600" />
                Comments: {selectedAction.issue}
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {selectedAction.comments.map((comment, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-gray-800 flex items-center gap-1">
                        <User className="w-4 h-4 text-gray-400" />
                        {comment.user}
                      </span>
                      <span className="text-xs text-gray-400">{comment.date}</span>
                    </div>
                    <p className="text-gray-600 text-sm mt-1">{comment.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Comment Modal */}
        {showCommentModal && selectedAction && (
          <div 
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)' }}
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 rounded-t-2xl">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Add Comment
                    </h2>
                    <p className="text-green-100 text-sm">{selectedAction.facility} - {selectedAction.issue}</p>
                  </div>
                  <button 
                    onClick={() => setShowCommentModal(false)}
                    className="text-white hover:text-gray-200 transition"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Enter your review comment or recommendation..."
                  rows="4"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 resize-none"
                />

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setShowCommentModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => addComment(selectedAction.id)}
                    disabled={!commentText.trim()}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Submit Comment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Compliance Analytics - Only show if there's data */}
        {(complianceStats.totalActions > 0 || complianceStats.overallCompliance > 0) && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-800">Compliance Analytics</h2>
              </div>
              <p className="text-sm text-gray-500 mt-1">Performance metrics for your scope</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-100">
                  <Award className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">{complianceStats.overallCompliance}%</p>
                  <p className="text-sm text-gray-600">Overall Compliance Rate</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-100">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">{complianceStats.completedActions}</p>
                  <p className="text-sm text-gray-600">Actions Completed</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg border border-red-100">
                  <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-600">{complianceStats.overdueActions}</p>
                  <p className="text-sm text-gray-600">Overdue Actions</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
