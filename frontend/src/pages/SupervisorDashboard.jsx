import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { Link } from "react-router-dom";

export default function SupervisorDashboard({ user, onLogout }) {
  const [inspections, setInspections] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const inspectionsRes = await fetch("http://127.0.0.1:8000/inspections/api/", {
        headers: { "Authorization": `Token ${user.token}` }
      });
      const inspectionsData = await inspectionsRes.json();
      setInspections(inspectionsData);

      const statsRes = await fetch("http://127.0.0.1:8000/inspections/dashboard/", {
        headers: { "Authorization": `Token ${user.token}` }
      });
      const statsData = await statsRes.json();
      setStats(statsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (inspectionId) => {
    alert(`Approve inspection ${inspectionId} - Feature coming soon`);
  };

  const handleReject = async (inspectionId) => {
    alert(`Reject inspection ${inspectionId} - Feature coming soon`);
  };

  const handleViewDetails = (inspection) => {
    setSelectedInspection(inspection);
    setShowModal(true);
  };

  const totalInspections = inspections.length;
  const compliantCount = inspections.filter(i => i.status === 'Compliant').length;
  const nonCompliantCount = inspections.filter(i => i.status === 'Non-compliant').length;

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
      {/* Header with Back Button */}
      <div className="flex justify-between items-center mb-6">
        
        <h1 className="text-2xl font-semibold text-gray-700">Supervisor Dashboard</h1>
        <div className="w-24"></div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-md p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-xl">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Inspections</p>
              <p className="text-2xl font-semibold text-gray-700">{totalInspections}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-xl">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Compliant</p>
              <p className="text-2xl font-semibold text-gray-700">{compliantCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-xl">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Non-Compliant</p>
              <p className="text-2xl font-semibold text-gray-700">{nonCompliantCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-xl">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Average Score</p>
              <p className="text-2xl font-semibold text-gray-700">{stats.average_score || 0}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Inspections Table */}
      <div className="bg-white rounded-2xl shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-700">All Inspections</h3>
            <span className="text-sm text-gray-500">Total: {inspections.length}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Facility</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inspector</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inspections.map((i) => (
                <tr key={i.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm text-gray-700">{i.facility_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{i.department}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{i.inspector}</td>
                  <td className={`px-6 py-4 text-sm font-medium ${
                    i.score >= 80 ? "text-green-600" : i.score >= 50 ? "text-green-600" : "text-red-600"
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
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewDetails(i)}
                        className="text-green-600 hover:text-green-800 text-sm font-medium"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleApprove(i.id)}
                        className="text-green-600 hover:text-green-800 text-sm font-medium"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(i.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspection Details Modal */}
      {showModal && selectedInspection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-[600px] max-h-[80vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-gray-700">Inspection Details</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block">Facility</label>
                  <p className="text-gray-800 font-medium">{selectedInspection.facility_name}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block">Department</label>
                  <p className="text-gray-800 font-medium">{selectedInspection.department}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block">Inspector</label>
                  <p className="text-gray-800 font-medium">{selectedInspection.inspector}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block">Visit Type</label>
                  <p className="text-gray-800 font-medium">{selectedInspection.visit_type || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block">Score</label>
                  <p className={`font-medium ${
                    selectedInspection.score >= 80 ? "text-green-600" : 
                    selectedInspection.score >= 50 ? "text-green-600" : "text-red-600"
                  }`}>
                    {selectedInspection.score}%
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block">Status</label>
                  <p>{selectedInspection.status}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 block">Notes</label>
                  <p className="text-gray-700 mt-1 bg-gray-50 p-3 rounded-lg">
                    {selectedInspection.notes || "No notes provided"}
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Close
              </button>
              <button
                onClick={() => handleApprove(selectedInspection.id)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Approve
              </button>
              <button
                onClick={() => handleReject(selectedInspection.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}