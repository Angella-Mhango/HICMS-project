// frontend/src/pages/PreInspectionPage.jsx
import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import PreInspectionForm from "../components/PreInspectionForm";
import { showToast } from "../components/Toast";  // ✅ FIXED: changed from "./Toast" to "../components/Toast"
import {
  ClipboardCheck,
  RefreshCw,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Building2,
  Calendar,
  ArrowRight
} from "lucide-react";

export default function PreInspectionPage({ user, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [facilityInfo, setFacilityInfo] = useState(null);
  const [preInspections, setPreInspections] = useState([]);
  const [showPreInspectionForm, setShowPreInspectionForm] = useState(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFacilityInfo();
  }, []);

  useEffect(() => {
    // Only fetch pre-inspections if we have a valid facility ID
    if (facilityInfo?.facility?.id && facilityInfo.facility.id > 0) {
      setSelectedFacilityId(facilityInfo.facility.id);
      fetchPreInspections(facilityInfo.facility.id);
    } else if (facilityInfo && !facilityInfo.facility?.id) {
      setError("No facility assigned to your account. Please contact administrator.");
      setLoading(false);
    }
  }, [facilityInfo]);

  const fetchFacilityInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get user info with facility
      const meResponse = await fetch("http://127.0.0.1:8000/accounts/me/", {
        headers: { "Authorization": `Token ${user.token}` }
      });
      
      if (!meResponse.ok) {
        throw new Error(`Failed to fetch user info: ${meResponse.status}`);
      }
      
      const userData = await meResponse.json();
      console.log("👤 User data:", userData);
      
      // Check if user has a valid facility_id
      if (userData.facility_id && userData.facility_id > 0) {
        // Fetch facility details
        const facilityRes = await fetch(`http://127.0.0.1:8000/facilities/api/${userData.facility_id}/`, {
          headers: { "Authorization": `Token ${user.token}` }
        });
        
        if (facilityRes.ok) {
          const facility = await facilityRes.json();
          console.log("✅ Facility found:", facility);
          setFacilityInfo({ 
            facility: facility, 
            level: "facility",
            facility_id: facility.id 
          });
        } else {
          console.error("❌ Failed to fetch facility:", facilityRes.status);
          setError("Could not load facility information. Please contact administrator.");
          setFacilityInfo(null);
        }
      } else {
        // No facility assigned - show message but don't error out
        console.warn("⚠️ No facility assigned to user");
        setError("No facility assigned to your account. Please contact administrator.");
        setFacilityInfo(null);
      }
      
    } catch (error) {
      console.error("❌ Error fetching facility info:", error);
      setError("Failed to load user information. Please try again.");
      setFacilityInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreInspections = async (facilityId) => {
    // ✅ Guard: Don't fetch if facilityId is null, undefined, or invalid
    if (!facilityId || facilityId <= 0) {
      console.warn("⚠️ Invalid facility ID, skipping pre-inspection fetch");
      setPreInspections([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      console.log("📡 Fetching pre-inspections for facility:", facilityId);
      const response = await fetch(`http://127.0.0.1:8000/inspections/pre-inspection/${facilityId}/`, {
        headers: { "Authorization": `Token ${user.token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.id) {
          const preInspectionItem = {
            id: data.id,
            facility_name: data.facility_name || facilityInfo?.facility?.name || "Your Facility",
            department: data.department_name || "General",
            score: data.percentage || data.total_score || 0,
            status: data.status || "pending",
            date: data.submitted_at?.split('T')[0] || null,
            findings: 0,
            recommendations: 0
          };
          setPreInspections([preInspectionItem]);
        } else {
          setPreInspections([]);
        }
      } else if (response.status === 404) {
        // No pre-inspection found - show empty state
        setPreInspections([]);
      } else {
        console.error("❌ Failed to fetch pre-inspections:", response.status);
        setPreInspections([]);
      }
      
    } catch (error) {
      console.error("❌ Error fetching pre-inspections:", error);
      setPreInspections([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePreInspectionComplete = () => {
    if (facilityInfo?.facility?.id && facilityInfo.facility.id > 0) {
      fetchPreInspections(facilityInfo.facility.id);
    }
    setShowPreInspectionForm(false);
    showToast("Pre-inspection completed successfully!", "success");
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-green-600";
    return "text-red-600";
  };

  const getStatusBadge = (status) => {
    const statusLower = status?.toLowerCase();
    if (statusLower === "completed" || statusLower === "submitted" || statusLower === "approved") {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Completed</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Pending</span>;
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

  // Show error state if no facility assigned
  if (error || !facilityInfo?.facility?.id) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex flex-col items-center justify-center h-64">
          <div className="bg-green-50 border border-green-200 rounded-xl p-8 max-w-md text-center">
            <AlertCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-800 mb-2">No Facility Assigned</h3>
            <p className="text-green-700">
              {error || "Your account is not linked to a facility. Please contact your administrator."}
            </p>
            <button
              onClick={fetchFacilityInfo}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              Retry
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const facilityName = facilityInfo?.facility?.name || "Your Facility";
  const totalPreInspections = preInspections.length;
  const completedCount = preInspections.filter(p => {
    const status = p.status?.toLowerCase();
    return status === "completed" || status === "submitted" || status === "approved";
  }).length;
  const avgScore = completedCount > 0 
    ? Math.round(preInspections.filter(p => {
        const status = p.status?.toLowerCase();
        return status === "completed" || status === "submitted" || status === "approved";
      }).reduce((sum, p) => sum + (p.score || 0), 0) / completedCount)
    : 0;

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-700 flex items-center gap-2">
              <ClipboardCheck className="w-7 h-7 text-green-600" />
              Pre-Inspection
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Conduct self-assessments and identify gaps before official inspections at {facilityName}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (facilityInfo?.facility?.id && facilityInfo.facility.id > 0) {
                  fetchPreInspections(facilityInfo.facility.id);
                }
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={() => {
                if (facilityInfo?.facility?.id && facilityInfo.facility.id > 0) {
                  setSelectedFacilityId(facilityInfo.facility.id);
                  setShowPreInspectionForm(true);
                } else {
                  showToast("No facility assigned to you", "warning");
                }
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <ClipboardCheck className="w-4 h-4" />
              Start Pre-Inspection
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total</p>
                <p className="text-2xl font-bold text-green-700">{totalPreInspections}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Completed</p>
                <p className="text-2xl font-bold text-green-700">{completedCount}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Pending</p>
                <p className="text-2xl font-bold text-green-600">{totalPreInspections - completedCount}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Average Score</p>
                <p className={`text-2xl font-bold ${getScoreColor(avgScore)}`}>{avgScore}%</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Pre-Inspections List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-green-600" />
                Pre-Inspection History
              </h3>
              <span className="text-sm text-gray-500">{totalPreInspections} records</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-green-50">
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase">Findings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preInspections.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center">
                      <ClipboardCheck className="w-12 h-12 text-green-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No pre-inspections conducted yet</p>
                      <p className="text-sm text-gray-400 mt-1">Click "Start Pre-Inspection" to begin your first self-assessment</p>
                    </td>
                  </tr>
                ) : (
                  preInspections.map((item) => (
                    <tr key={item.id} className="hover:bg-green-50 transition">
                      <td className="px-6 py-4 text-sm font-medium text-gray-800">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-green-600" />
                          {item.department}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {item.date || <span className="text-gray-400">Not started</span>}
                      </td>
                      <td className="px-6 py-4">
                        {item.score > 0 ? (
                          <span className={`text-sm font-bold ${getScoreColor(item.score)}`}>
                            {item.score}%
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{item.findings || 0}</td>
                      <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                      <td className="px-6 py-4">
                        {item.status === "completed" || item.status === "submitted" || item.status === "approved" ? (
                          <button 
                            onClick={() => showToast("Report view coming soon", "info")}
                            className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center gap-1"
                          >
                            View Report
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => {
                              setSelectedFacilityId(facilityInfo?.facility?.id);
                              setShowPreInspectionForm(true);
                            }}
                            className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center gap-1"
                          >
                            Continue
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <h4 className="font-medium text-green-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-green-600" />
            Pre-Inspection Tips
          </h4>
          <ul className="mt-2 text-sm text-green-700 space-y-1">
            <li>• Conduct regular self-assessments to identify gaps early</li>
            <li>• Document all findings with photos for evidence</li>
            <li>• Create corrective actions immediately for critical issues</li>
            <li>• Use the pre-inspection report to prepare for official inspections</li>
          </ul>
        </div>
      </div>

      {/* Pre-Inspection Form Modal */}
      {showPreInspectionForm && selectedFacilityId && selectedFacilityId > 0 && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-2xl shadow-xl w-[900px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
            <PreInspectionForm
              user={user}
              facilityId={selectedFacilityId}
              onComplete={handlePreInspectionComplete}
              onClose={() => {
                setShowPreInspectionForm(false);
                setSelectedFacilityId(null);
              }}
            />
          </div>
        </div>
      )}
    </Layout>
  );
}