// frontend/src/pages/MyInspections.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import InspectionStepper from "../components/InspectionStepper";
import { showToast } from "../components/Toast";
import {
  ClipboardList,
  Plus,
  Building2,
  CheckCircle,
  AlertCircle,
  Calendar,
  RefreshCw,
  Search,
  Filter,
  X
} from "lucide-react";

export default function MyInspections({ user, onLogout }) {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showStepperModal, setShowStepperModal] = useState(false);

  useEffect(() => {
    fetchInspections();
  }, []);

  const fetchInspections = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/inspections/api/", {
        headers: { "Authorization": `Token ${user.token}` }
      });
      const data = await response.json();
      const myInspections = data.filter(i => 
        i.inspector?.toLowerCase() === user.username?.toLowerCase()
      );
      setInspections(myInspections);
    } catch (error) {
      console.error("Error fetching inspections:", error);
      showToast("Failed to load inspections", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchInspections();
    showToast("Data refreshed", "success");
  };

  const handleInspectionComplete = () => {
    fetchInspections();
    setShowStepperModal(false);
    showToast("Inspection completed successfully!", "success");
  };

  // Filter inspections
  const filteredInspections = inspections.filter(i => {
    const matchesSearch = i.facility_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          i.department?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || i.status?.toLowerCase() === filterStatus.toLowerCase();
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

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-700 flex items-center gap-2">
              <ClipboardList className="w-7 h-7 text-green-600" />
              My Inspections
            </h1>
            <p className="text-sm text-gray-500 mt-1">View all inspections assigned to you</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={() => setShowStepperModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Inspection
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by facility or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50 hover:bg-white transition"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-gray-50 hover:bg-white transition"
              >
                <option value="all">All Status</option>
                <option value="compliant">✅ Compliant</option>
                <option value="non-compliant">❌ Non-Compliant</option>
              </select>
            </div>
          </div>
        </div>

        {/* Inspections Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-green-600" />
                Inspection Results
              </h2>
              <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                {filteredInspections.length} inspections
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInspections.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <ClipboardList className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-400">No inspections found</p>
                      {searchTerm || filterStatus !== "all" ? (
                        <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
                      ) : (
                        <button
                          onClick={() => setShowStepperModal(true)}
                          className="mt-3 text-green-600 hover:text-green-700 font-medium"
                        >
                          Create your first inspection →
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredInspections.map((i) => (
                    <tr key={i.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-green-600" />
                          {i.facility_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{i.department}</td>
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
                      <td className="px-6 py-4 text-sm text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {i.date?.split('T')[0] || 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filteredInspections.length > 0 && (
            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 text-center text-xs text-gray-500">
              Showing {filteredInspections.length} inspections
            </div>
          )}
        </div>
      </div>

      {/* Inspection Stepper Modal */}
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
                onComplete={handleInspectionComplete}
                onClose={() => setShowStepperModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}