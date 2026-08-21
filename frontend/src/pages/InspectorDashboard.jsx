// frontend/src/pages/InspectorDashboard.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import AddInspectionModal from "../components/AddInspectionModal";
import InspectionStepper from "../components/InspectionStepper";
import { showToast } from "../components/Toast";
import {
  ClipboardList,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Calendar,
  FileText,
  Plus,
  RefreshCw,
  Building2,
  Users,
  Award,
  BarChart3,
  Eye,
  X,
  ChevronRight,
  AlertTriangle,
  Clock
} from "lucide-react";

const API_BASE = "http://127.0.0.1:8000";

export default function InspectorDashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [inspections, setInspections] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [showStepperModal, setShowStepperModal] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [pendingActions, setPendingActions] = useState([]);
  const [error, setError] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      
      // Fetch inspections - try both endpoints
      let inspectionsData = [];
      try {
        const inspectionsRes = await fetch(`${API_BASE}/inspections/api/`, {
          headers: { "Authorization": `Token ${user.token}` }
        });
        if (inspectionsRes.ok) {
          inspectionsData = await inspectionsRes.json();
        }
      } catch {
        // Keep the empty inspection list when this optional request is unavailable.
      }
      
      // Ensure inspectionsData is an array
      if (!Array.isArray(inspectionsData)) {
        inspectionsData = [];
      }
      
      setInspections(inspectionsData);

      // Fetch stats
      let statsData = {};
      try {
        const statsRes = await fetch(`${API_BASE}/inspections/dashboard/`, {
          headers: { "Authorization": `Token ${user.token}` }
        });
        if (statsRes.ok) {
          statsData = await statsRes.json();
        }
      } catch {
        // Keep the empty stats object when this optional request is unavailable.
      }
      setStats(statsData);

      // Fetch pending actions
      let actionsData = [];
      try {
        const actionsRes = await fetch(`${API_BASE}/inspections/corrective-actions/`, {
          headers: { "Authorization": `Token ${user.token}` }
        });
        if (actionsRes.ok) {
          actionsData = await actionsRes.json();
        }
      } catch {
        // Keep the empty action list when this optional request is unavailable.
      }
      
      if (Array.isArray(actionsData)) {
        setPendingActions(actionsData.filter(a => a.status === "Pending" || a.status === "Overdue"));
      } else {
        setPendingActions([]);
      }

      setDataLoaded(true);

    } catch (error) {
      console.error("Error fetching data:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleViewDetails = (inspection) => {
    setSelectedInspection(inspection);
    setShowModal(true);
  };

  const handleRefresh = () => {
    fetchData();
    showToast("Data refreshed", "success");
  };

  // Filter my inspections
  const myInspections = Array.isArray(inspections) ? inspections.filter(i => {
    const inspectionInspector = (i.inspector || "").trim().toLowerCase();
    const currentUser = (user.username || "").trim().toLowerCase();
    return inspectionInspector === currentUser;
  }) : [];

  // Sort by date (most recent first)
  const sortedInspections = [...myInspections].sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );

  const myCompliant = myInspections.filter(i => i.status === 'Compliant').length;
  const myNonCompliant = myInspections.filter(i => i.status === 'Non-compliant').length;
  const myAvgScore = myInspections.length > 0 
    ? Math.round(myInspections.reduce((sum, i) => sum + i.score, 0) / myInspections.length) 
    : 0;
  
  const complianceRate = myInspections.length > 0 
    ? Math.round((myCompliant / myInspections.length) * 100) 
    : 0;

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
      <div className="p-6 space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Welcome back, {user.username}!</h1>
              <p className="text-green-100 mt-1">Here's your inspection summary and pending tasks</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Inspections</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{myInspections.length}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Compliance Rate</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{complianceRate}%</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-green-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${complianceRate}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Average Score</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{myAvgScore}%</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Compliant</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{myCompliant}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Award className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Non-Compliant</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{myNonCompliant}</p>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* My Inspections Table */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  My Recent Inspections
                </h3>
                <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                  Total: {myInspections.length}
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Facility</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedInspections.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                        <ClipboardList className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                        No inspections found. Click "Compliance Inspection" to create one.
                      </td>
                    </tr>
                  ) : (
                    sortedInspections.slice(0, 5).map((i) => (
                      <tr key={i.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-green-600" />
                            {i.facility_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{i.department}</td>
                        <td className={`px-6 py-4 text-sm font-bold ${
                          i.score >= 80 ? "text-green-600" : "text-gray-600"
                        }`}>
                          {i.score}%
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            i.status === 'Compliant' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {i.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{i.date?.split('T')[0] || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleViewDetails(i)}
                            className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {myInspections.length > 5 && (
              <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 text-center">
                <button 
                  onClick={() => navigate('/my-inspections')}
                  className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center gap-1 mx-auto"
                >
                  View All {myInspections.length} Inspections
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pending Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-green-500" />
                  Pending Actions
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {pendingActions.length === 0 ? (
                  <div className="text-center py-4">
                    <CheckCircle className="w-10 h-10 text-green-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No pending actions</p>
                  </div>
                ) : (
                  pendingActions.slice(0, 3).map((action) => (
                    <div key={action.id} className="border-l-4 border-green-500 bg-green-50 p-3 rounded-r-lg">
                      <p className="text-sm font-medium text-gray-800">{action.issue}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        <Building2 className="w-3 h-3 inline mr-1" />
                        {action.facility} - {action.department}
                      </p>
                      <div className="flex justify-between items-center mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          action.status === 'Overdue' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {action.status}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {action.deadline}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Performance Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                  Performance Summary
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-gray-600">Total Inspections</span>
                  <span className="text-lg font-bold text-green-600">{myInspections.length}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-gray-600">Compliance Rate</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{ width: `${complianceRate}%` }}></div>
                    </div>
                    <span className="text-sm font-bold text-green-600">{complianceRate}%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-1 border-t border-gray-100">
                  <span className="text-sm text-gray-600">Average Score</span>
                  <span className="text-lg font-bold text-green-600">{myAvgScore}%</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-gray-600">Best Score</span>
                  <span className="text-lg font-bold text-green-600">
                    {myInspections.length > 0 ? Math.max(...myInspections.map(i => i.score)) : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-gray-600">Lowest Score</span>
                  <span className="text-lg font-bold text-green-600">
                    {myInspections.length > 0 ? Math.min(...myInspections.map(i => i.score)) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inspection Details Modal */}
      {showModal && selectedInspection && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)' }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 rounded-t-2xl z-10">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Inspection Details
                  </h2>
                  <p className="text-green-100 text-sm">{selectedInspection.facility_name}</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-white hover:text-gray-200 transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 font-medium uppercase tracking-wider block">Facility</label>
                  <p className="text-gray-800 font-medium mt-1 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-green-600" />
                    {selectedInspection.facility_name}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium uppercase tracking-wider block">Department</label>
                  <p className="text-gray-800 font-medium mt-1">{selectedInspection.department}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium uppercase tracking-wider block">Inspector</label>
                  <p className="text-gray-800 font-medium mt-1 flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    {selectedInspection.inspector}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium uppercase tracking-wider block">Date</label>
                  <p className="text-gray-800 font-medium mt-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {selectedInspection.date?.split('T')[0] || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium uppercase tracking-wider block">Score</label>
                  <p className={`font-bold text-2xl mt-1 ${
                    selectedInspection.score >= 80 ? "text-green-600" : "text-gray-600"
                  }`}>
                    {selectedInspection.score}%
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium uppercase tracking-wider block">Status</label>
                  <span className={`mt-1 px-3 py-1 text-sm font-medium rounded-full inline-block ${
                    selectedInspection.status === 'Compliant' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {selectedInspection.status}
                  </span>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 font-medium uppercase tracking-wider block">Notes</label>
                  <p className="text-gray-700 mt-1 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    {selectedInspection.notes || "No notes provided"}
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white rounded-b-2xl">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Inspection Modal */}
      <AddInspectionModal
        isOpen={showInspectionModal}
        onClose={() => setShowInspectionModal(false)}
        onSuccess={handleRefresh}
        user={user}
        initialInspector={user.username}
      />

      {/* Standards-based Inspection Stepper Modal */}
      {showStepperModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)' }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-[900px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 rounded-t-2xl z-10">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <ClipboardList className="w-5 h-5" />
                    Compliance Inspection
                  </h2>
                  <p className="text-green-100 text-sm">Standards-based facility assessment</p>
                </div>
                <button
                  onClick={() => setShowStepperModal(false)}
                  className="text-white hover:text-gray-200 transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <InspectionStepper
                user={user}
                onComplete={() => {
                  handleRefresh();
                  setShowStepperModal(false);
                }}
                onClose={() => setShowStepperModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
