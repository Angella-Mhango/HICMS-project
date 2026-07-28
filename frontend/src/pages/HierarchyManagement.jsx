// frontend/src/pages/HierarchyManagement.jsx
import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { 
  getHierarchyLevels, 
  getCurrentAdminInfo, 
  getAdminsByLevel,
  createAdmin,
  deleteAdmin,
  getHierarchySummary 
} from "../services/hierarchyApi";

export default function HierarchyManagement({ user, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [levels, setLevels] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState("regional");
  const [admins, setAdmins] = useState([]);
  const [summary, setSummary] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    level_id: "",
    region_id: "",
    district_id: "",
    facility_id: "",
    can_manage_users: false,
    can_manage_roles: false,
    can_manage_admins: false,
    can_view_all_reports: false,
    can_approve_inspections: false,
    can_create_inspection_plans: false,
    phone: "",
    title: ""
  });
  const [regions, setRegions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [facilities, setFacilities] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedLevel) {
      fetchAdminsByLevel(selectedLevel);
    }
  }, [selectedLevel]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [adminInfo, levelsData, summaryData] = await Promise.all([
        getCurrentAdminInfo(user.token),
        getHierarchyLevels(user.token),
        getHierarchySummary(user.token)
      ]);
      
      setCurrentAdmin(adminInfo);
      setLevels(levelsData);
      setSummary(summaryData);
      
      // Fetch regions for dropdowns
      fetchRegions();
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load hierarchy data");
    } finally {
      setLoading(false);
    }
  };

  const fetchRegions = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/facilities/regions/", {
        headers: { "Authorization": `Token ${user.token}` }
      });
      const data = await response.json();
      setRegions(data);
    } catch (error) {
      console.error("Error fetching regions:", error);
    }
  };

  const fetchDistricts = async (regionId) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/facilities/regions/${regionId}/districts/`, {
        headers: { "Authorization": `Token ${user.token}` }
      });
      const data = await response.json();
      setDistricts(data);
    } catch (error) {
      console.error("Error fetching districts:", error);
    }
  };

  const fetchFacilities = async (districtId) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/facilities/districts/${districtId}/facilities/`, {
        headers: { "Authorization": `Token ${user.token}` }
      });
      const data = await response.json();
      setFacilities(data);
    } catch (error) {
      console.error("Error fetching facilities:", error);
    }
  };

  const fetchAdminsByLevel = async (levelName) => {
    try {
      const data = await getAdminsByLevel(user.token, levelName);
      setAdmins(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching admins:", error);
      setAdmins([]);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    try {
      const result = await createAdmin(user.token, formData);
      
      if (result.success) {
        setSuccess(result.message);
        setShowAddModal(false);
        resetForm();
        fetchAdminsByLevel(selectedLevel);
        fetchData(); // Refresh summary
      } else {
        setError(result.error || "Failed to create admin");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    }
  };

  const handleDeleteAdmin = async (adminId, adminName) => {
    if (!confirm(`Are you sure you want to delete admin "${adminName}"?`)) return;
    
    try {
      const result = await deleteAdmin(user.token, adminId);
      if (result.success) {
        setSuccess(result.message);
        fetchAdminsByLevel(selectedLevel);
        fetchData(); // Refresh summary
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(result.error || "Failed to delete admin");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    }
  };

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      password: "",
      first_name: "",
      last_name: "",
      level_id: "",
      region_id: "",
      district_id: "",
      facility_id: "",
      can_manage_users: false,
      can_manage_roles: false,
      can_manage_admins: false,
      can_view_all_reports: false,
      can_approve_inspections: false,
      can_create_inspection_plans: false,
      phone: "",
      title: ""
    });
    setDistricts([]);
    setFacilities([]);
  };

  const getLevelBadgeColor = (levelName) => {
    const colors = {
      national: "bg-purple-100 text-purple-700",
      regional: "bg-blue-100 text-blue-700",
      district: "bg-green-100 text-green-700",
      facility: "bg-yellow-100 text-yellow-700"
    };
    return colors[levelName] || "bg-gray-100 text-gray-700";
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
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Hierarchy Management</h1>
          <p className="text-gray-500 mt-1">Manage administrative levels and permissions</p>
        </div>

        {/* Current Admin Info */}
        {currentAdmin && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 mb-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Your Current Level</p>
                <p className="text-lg font-bold text-green-700">
                  {currentAdmin.level_name} Admin
                </p>
                {currentAdmin.region && <p className="text-sm">Region: {currentAdmin.region.name}</p>}
                {currentAdmin.district && <p className="text-sm">District: {currentAdmin.district.name}</p>}
                {currentAdmin.facility && <p className="text-sm">Facility: {currentAdmin.facility.name}</p>}
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Permissions</p>
                <div className="flex gap-2 mt-1">
                  {currentAdmin.can_manage_admins && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Manage Admins</span>}
                  {currentAdmin.can_manage_users && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Manage Users</span>}
                  {currentAdmin.can_view_all_reports && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">View Reports</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{summary.national_admins || 0}</p>
            <p className="text-xs text-gray-500">National Admins</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{summary.regional_admins || 0}</p>
            <p className="text-xs text-gray-500">Regional Admins</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{summary.district_admins || 0}</p>
            <p className="text-xs text-gray-500">District Admins</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{summary.facility_admins || 0}</p>
            <p className="text-xs text-gray-500">Facility Admins</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{summary.qa_members || 0}</p>
            <p className="text-xs text-gray-500">QA Members</p>
          </div>
        </div>

        {/* Level Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {levels.map((level) => (
            <button
              key={level.id}
              onClick={() => setSelectedLevel(level.name)}
              className={`px-6 py-3 font-medium transition ${
                selectedLevel === level.name
                  ? "text-green-600 border-b-2 border-green-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {level.display_name} Admins
            </button>
          ))}
        </div>

        {/* Add Admin Button */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            {levels.find(l => l.name === selectedLevel)?.display_name || "Regional"} Admins
          </h2>
          {currentAdmin?.can_manage_admins && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add {levels.find(l => l.name === selectedLevel)?.display_name} Admin
            </button>
          )}
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
            ✅ {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            ❌ {error}
          </div>
        )}

        {/* Admins Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Permissions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {admins.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                      No admins found at this level
                    </td>
                  </tr>
                ) : (
                  admins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-medium text-gray-800">{admin.user_details?.username}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {admin.user_details?.first_name} {admin.user_details?.last_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{admin.user_details?.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {admin.region?.name && <div>Region: {admin.region.name}</div>}
                        {admin.district?.name && <div>District: {admin.district.name}</div>}
                        {admin.facility?.name && <div>Facility: {admin.facility.name}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {admin.can_manage_admins && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Manage Admins</span>}
                          {admin.can_manage_users && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Manage Users</span>}
                          {admin.can_create_inspection_plans && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Create Plans</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {currentAdmin?.can_manage_admins && admin.user_details?.username !== currentAdmin.user_details?.username && (
                          <button
                            onClick={() => handleDeleteAdmin(admin.id, admin.user_details?.username)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Delete
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

        {/* Add Admin Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
            <div className="bg-white rounded-2xl shadow-xl w-[700px] max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 rounded-t-2xl sticky top-0">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-white">Add New Admin</h2>
                    <p className="text-green-100 text-sm">Create a new administrator account</p>
                  </div>
                  <button onClick={() => setShowAddModal(false)} className="text-white hover:text-gray-200 text-2xl">×</button>
                </div>
              </div>

              <form onSubmit={handleCreateAdmin} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="e.g., Regional Director"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Admin Level *</label>
                    <select
                      required
                      value={formData.level_id}
                      onChange={(e) => {
                        const levelId = e.target.value;
                        setFormData({ ...formData, level_id: levelId });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select Level</option>
                      {levels.map((level) => (
                        <option key={level.id} value={level.id}>{level.display_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                    <select
                      value={formData.region_id}
                      onChange={(e) => {
                        const regionId = e.target.value;
                        setFormData({ ...formData, region_id: regionId, district_id: "", facility_id: "" });
                        if (regionId) fetchDistricts(regionId);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select Region</option>
                      {regions.map((region) => (
                        <option key={region.id} value={region.id}>{region.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                    <select
                      value={formData.district_id}
                      onChange={(e) => {
                        const districtId = e.target.value;
                        setFormData({ ...formData, district_id: districtId, facility_id: "" });
                        if (districtId) fetchFacilities(districtId);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select District</option>
                      {districts.map((district) => (
                        <option key={district.id} value={district.id}>{district.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Facility</label>
                    <select
                      value={formData.facility_id}
                      onChange={(e) => setFormData({ ...formData, facility_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select Facility</option>
                      {facilities.map((facility) => (
                        <option key={facility.id} value={facility.id}>{facility.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.can_manage_users}
                        onChange={(e) => setFormData({ ...formData, can_manage_users: e.target.checked })}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <span className="text-sm text-gray-700">Manage Users</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.can_manage_roles}
                        onChange={(e) => setFormData({ ...formData, can_manage_roles: e.target.checked })}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <span className="text-sm text-gray-700">Manage Roles</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.can_manage_admins}
                        onChange={(e) => setFormData({ ...formData, can_manage_admins: e.target.checked })}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <span className="text-sm text-gray-700">Manage Admins</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.can_view_all_reports}
                        onChange={(e) => setFormData({ ...formData, can_view_all_reports: e.target.checked })}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <span className="text-sm text-gray-700">View All Reports</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.can_approve_inspections}
                        onChange={(e) => setFormData({ ...formData, can_approve_inspections: e.target.checked })}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <span className="text-sm text-gray-700">Approve Inspections</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.can_create_inspection_plans}
                        onChange={(e) => setFormData({ ...formData, can_create_inspection_plans: e.target.checked })}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <span className="text-sm text-gray-700">Create Inspection Plans</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    Create Admin
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}