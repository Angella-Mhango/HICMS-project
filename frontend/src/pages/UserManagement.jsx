// frontend/src/pages/UserManagement.jsx
import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import {
  Pencil,
  Trash2,
  Eye,
  Plus,
  Users,
  Shield,
  UserCog,
  Building2,
  MapPin,
  Globe,
  Award,
  RefreshCw,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  UserX,
  FileText
} from "lucide-react";
import AddUserModal from "../components/AddUserModal";
import AddRoleModal from "../components/AddRoleModal";
import AssignRoleModal from "../components/AssignRoleModal";
import { showToast } from "../components/Toast";

export default function UserManagement({ user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [hierarchyLevels, setHierarchyLevels] = useState([]);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showAssignRoleModal, setShowAssignRoleModal] = useState(false);
  const [showHierarchyModal, setShowHierarchyModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedHierarchyUser, setSelectedHierarchyUser] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("users");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchCurrentAdmin();
    }
  }, [user]);

  useEffect(() => {
    if (currentAdmin) {
      fetchUsers();
      fetchRoles();
      fetchHierarchyLevels();
    }
  }, [currentAdmin]);

  const fetchUsers = async () => {
    setError(null);
    try {
      const usersResponse = await fetch("http://127.0.0.1:8000/accounts/users/", {
        headers: { "Authorization": `Token ${user.token}` }
      });
      
      if (!usersResponse.ok) {
        throw new Error(`HTTP error! status: ${usersResponse.status}`);
      }
      
      const usersData = await usersResponse.json();
      
      // Fetch hierarchy data for users
      const hierarchyResponse = await fetch("http://127.0.0.1:8000/hierarchy/users/all/hierarchy/", {
        headers: { "Authorization": `Token ${user.token}` }
      });
      
      let hierarchyData = [];
      if (hierarchyResponse.ok) {
        hierarchyData = await hierarchyResponse.json();
        console.log("📊 Hierarchy data loaded:", hierarchyData.length);
      } else {
        console.warn("⚠️ Hierarchy API returned:", hierarchyResponse.status);
      }
      
      // Merge user data with hierarchy data
      const mergedUsers = usersData.map(userItem => {
        const hierarchy = hierarchyData.find(h => h.user_id === userItem.id);
        return {
          ...userItem,
          hierarchy_level: hierarchy?.hierarchy_level || null,
          hierarchy_display: hierarchy?.hierarchy_display || null,
          region: hierarchy?.region || null,
          district: hierarchy?.district || null,
          facility: hierarchy?.facility || null,
        };
      });
      
      setUsers(mergedUsers);
      console.log("✅ Users loaded:", mergedUsers.length);
      
    } catch (error) {
      console.error("❌ Error fetching users:", error);
      setError("Failed to load users. Please try again.");
      showToast("Failed to load users", "error");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      console.log("🔍 Fetching roles...");
      const response = await fetch("http://127.0.0.1:8000/accounts/roles/", {
        headers: { "Authorization": `Token ${user.token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("📋 Roles loaded:", data.length);
        setRoles(Array.isArray(data) ? data : []);
      } else {
        console.warn("⚠️ Roles endpoint returned:", response.status);
        setRoles([]);
        showToast("No roles found. Please add a role first.", "warning");
      }
    } catch (error) {
      console.error("❌ Error fetching roles:", error);
      setRoles([]);
      showToast("Failed to load roles", "error");
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/accounts/audit-logs/", {
        headers: { "Authorization": `Token ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(Array.isArray(data) ? data : []);
        showToast(`Loaded ${data.length} audit logs`, "info");
      } else {
        setAuditLogs([]);
        showToast("No audit logs available", "info");
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      setAuditLogs([]);
      showToast("Failed to load audit logs", "error");
    }
  };

  const fetchHierarchyLevels = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/hierarchy/levels/", {
        headers: { "Authorization": `Token ${user.token}` }
      });
      if (response.ok) {
        let data = await response.json();
        // Filter based on admin level
        if (currentAdmin?.level === 'regional') {
          data = data.filter(l => l.name === 'district' || l.name === 'facility');
        } else if (currentAdmin?.level === 'district') {
          data = data.filter(l => l.name === 'facility');
        } else if (currentAdmin?.level === 'facility') {
          data = [];
        }
        setHierarchyLevels(data);
        console.log("📊 Hierarchy levels loaded:", data.length);
      } else {
        setHierarchyLevels([]);
        console.warn("⚠️ Hierarchy levels API returned:", response.status);
      }
    } catch (error) {
      console.error("Error fetching hierarchy levels:", error);
      setHierarchyLevels([]);
    }
  };

  const fetchCurrentAdmin = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/hierarchy/my-admin-info/", {
        headers: { "Authorization": `Token ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        console.log("👤 Current Admin:", data);
        setCurrentAdmin(data);
      } else {
        console.warn("⚠️ Failed to fetch admin info:", response.status);
        setCurrentAdmin(null);
      }
    } catch (error) {
      console.error("Error fetching current admin:", error);
      setCurrentAdmin(null);
      setLoading(false);
    }
  };

  const handleAssignHierarchy = async (userId, hierarchyData) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/hierarchy/users/${userId}/assign-level/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${user.token}`
        },
        body: JSON.stringify(hierarchyData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showToast(data.message || "Hierarchy level assigned successfully!", "success");
        await fetchUsers();
        setShowHierarchyModal(false);
        setSelectedHierarchyUser(null);
      } else {
        showToast(data.error || "Failed to assign hierarchy", "error");
      }
    } catch (error) {
      console.error("Error assigning hierarchy:", error);
      showToast("Network error. Please try again.", "error");
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Delete user "${username}"? This action cannot be undone.`)) return;
    try {
      const response = await fetch(`http://127.0.0.1:8000/accounts/users/${userId}/`, {
        method: "DELETE",
        headers: { "Authorization": `Token ${user.token}` }
      });
      
      if (response.ok) {
        await fetchUsers();
        showToast(`User "${username}" deleted successfully`, "success");
        if (showLogs) fetchAuditLogs();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || "Failed to delete user", "error");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      showToast("Network error. Please try again.", "error");
    }
  };

  const handleDeleteRole = async (roleId, roleName) => {
    if (!window.confirm(`Delete role "${roleName}"? This will remove this role from all users.`)) return;
    try {
      const response = await fetch(`http://127.0.0.1:8000/accounts/roles/${roleId}/`, {
        method: "DELETE",
        headers: { "Authorization": `Token ${user.token}` }
      });
      
      if (response.ok) {
        fetchRoles();
        await fetchUsers(); // Update users as their roles may change
        showToast(`Role "${roleName}" deleted successfully`, "success");
        if (showLogs) fetchAuditLogs();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || "Failed to delete role", "error");
      }
    } catch (error) {
      console.error("Error deleting role:", error);
      showToast("Network error. Please try again.", "error");
    }
  };

  const handleToggleActive = async (userId, currentStatus) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/accounts/users/${userId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${user.token}`
        },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      
      if (response.ok) {
        await fetchUsers();
        showToast(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`, "success");
        if (showLogs) fetchAuditLogs();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || "Failed to update user status", "error");
      }
    } catch (error) {
      console.error("Error toggling user status:", error);
      showToast("Network error. Please try again.", "error");
    }
  };

  const handleViewLogs = async () => {
    if (!showLogs) await fetchAuditLogs();
    setShowLogs(!showLogs);
  };

  const getHierarchyBadge = (userItem) => {
    if (userItem.hierarchy_level === 'national') {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 flex items-center gap-1"><Globe className="w-3 h-3" /> National</span>;
    }
    if (userItem.hierarchy_level === 'regional') {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 flex items-center gap-1"><MapPin className="w-3 h-3" /> Regional</span>;
    }
    if (userItem.hierarchy_level === 'district') {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 flex items-center gap-1"><Building2 className="w-3 h-3" /> District</span>;
    }
    if (userItem.hierarchy_level === 'facility') {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 flex items-center gap-1"><Building2 className="w-3 h-3" /> Facility</span>;
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-500 flex items-center gap-1"><User className="w-3 h-3" /> Standard</span>;
  };

  const canManageHierarchy = () => {
    return currentAdmin?.can_manage_admins === true || currentAdmin?.level === 'national';
  };

  const canAddUser = () => {
    return currentAdmin?.can_manage_users === true || currentAdmin?.can_manage_admins === true || currentAdmin?.level === 'national';
  };

  const canAddRole = () => {
    return currentAdmin?.can_manage_roles === true || currentAdmin?.can_manage_admins === true || currentAdmin?.level === 'national';
  };

  const getVisibleUsers = () => {
    if (!currentAdmin) return users;
    
    const currentLevel = currentAdmin.level;
    
    return users.filter(userItem => {
      const userLevel = userItem.hierarchy_level;
      const userRegion = userItem.region;
      const userDistrict = userItem.district;
      const userFacility = userItem.facility;
      
      // National Admin sees all users
      if (currentLevel === 'national') return true;
      
      // Regional Admin sees regional and below
      if (currentLevel === 'regional') {
        if (userLevel === 'national') return false;
        if (userRegion && userRegion !== currentAdmin.region?.name) return false;
        return true;
      }
      
      // District Admin sees district and below
      if (currentLevel === 'district') {
        if (userLevel === 'national' || userLevel === 'regional') return false;
        if (userDistrict && userDistrict !== currentAdmin.district?.name) return false;
        return true;
      }
      
      // Facility Admin sees only facility users
      if (currentLevel === 'facility') {
        if (userLevel === 'national' || userLevel === 'regional' || userLevel === 'district') return false;
        if (userFacility && userFacility !== currentAdmin.facility?.name) return false;
        return true;
      }
      
      return true;
    });
  };

  const visibleUsers = getVisibleUsers();

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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-700 flex items-center gap-2">
            <UserCog className="w-7 h-7 text-green-600" />
            User & Hierarchy Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage users, roles, and administrative hierarchy</p>
        </div>
        <div className="flex gap-3">
          {canAddRole() && (
            <button
              onClick={() => {
                setEditingRole(null);
                setShowRoleModal(true);
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Role
            </button>
          )}
          <button
            onClick={handleViewLogs}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            {showLogs ? "Hide Logs" : "View Logs"}
          </button>
          {canAddUser() && (
            <button
              onClick={() => {
                console.log("🖱️ Add User button clicked");
                setEditingUser(null);
                setShowUserModal(true);
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add User
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
          <button 
            onClick={fetchUsers}
            className="ml-auto px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Current Admin Info */}
      {currentAdmin && (
        <div className="bg-green-50 rounded-xl p-4 mb-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Your Current Level</p>
              <p className="text-lg font-bold text-green-700 flex items-center gap-2">
                <Award className="w-5 h-5 text-green-600" />
                {currentAdmin.level_name || 'National'} Admin
              </p>
              {currentAdmin.region && <p className="text-sm text-gray-600">Region: {currentAdmin.region.name}</p>}
              {currentAdmin.district && <p className="text-sm text-gray-600">District: {currentAdmin.district.name}</p>}
              {currentAdmin.facility && <p className="text-sm text-gray-600">Facility: {currentAdmin.facility.name}</p>}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Permissions</p>
              <div className="flex gap-2 mt-1 flex-wrap justify-end">
                {currentAdmin.can_manage_admins && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Manage Admins</span>
                )}
                {currentAdmin.can_manage_users && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Manage Users</span>
                )}
                {currentAdmin.can_view_all_reports && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">View Reports</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-6 py-3 font-medium transition flex items-center gap-2 ${
            activeTab === "users"
              ? "text-green-600 border-b-2 border-green-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Users className="w-5 h-5" />
          Users & Roles
        </button>
        {canManageHierarchy() && (
          <button
            onClick={() => setActiveTab("hierarchy")}
            className={`px-6 py-3 font-medium transition flex items-center gap-2 ${
              activeTab === "hierarchy"
                ? "text-green-600 border-b-2 border-green-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Shield className="w-5 h-5" />
            Hierarchy Management
          </button>
        )}
      </div>

      {activeTab === "users" && (
        <>
          {/* Roles Table */}
          <div className="bg-white rounded-2xl shadow-md mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                System Roles
              </h2>
              <p className="text-sm text-gray-500 mt-1">Manage roles and their permissions</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {roles && roles.length > 0 ? (
                    roles.map((role) => {
                      const userCount = users.filter(u => u.role === role.name).length;
                      return (
                        <tr key={role.id} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4 text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-green-600" />
                            {role.name}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{role.description || '-'}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{userCount}</td>
                          <td className="px-6 py-4 text-sm">
                            <button
                              onClick={() => {
                                setEditingRole(role);
                                setShowRoleModal(true);
                              }}
                              className="text-green-600 hover:text-green-800 mr-3 transition"
                            >
                              <Pencil className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRole(role.id, role.name)}
                              className="text-red-600 hover:text-red-800 transition"
                              disabled={userCount > 0}
                              title={userCount > 0 ? `Cannot delete - ${userCount} users have this role` : ''}
                            >
                              <Trash2 className={`w-5 h-5 ${userCount > 0 ? 'opacity-40 cursor-not-allowed' : ''}`} />
                            </button>
                            {userCount > 0 && (
                              <span className="text-xs text-gray-400 ml-1">({userCount} users)</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-gray-400">
                        No roles found. Click "Add Role" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl shadow-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-600" />
                    System Users
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">Total users in your scope: {visibleUsers.length}</p>
                </div>
                <button
                  onClick={fetchUsers}
                  className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visibleUsers && visibleUsers.length > 0 ? (
                    visibleUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-medium text-green-700">
                                {u.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">{u.username}</p>
                              <p className="text-xs text-gray-500">{u.first_name} {u.last_name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{u.email || '-'}</td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setShowAssignRoleModal(true);
                            }}
                            className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition flex items-center gap-1"
                          >
                            <Shield className="w-3 h-3" />
                            {u.role || 'Assign Role'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {getHierarchyBadge(u)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => handleToggleActive(u.id, u.is_active)}
                            className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${
                              u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {u.is_active ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            {u.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setShowUserModal(true);
                            }}
                            className="text-green-600 hover:text-green-800 mr-3 transition"
                          >
                            <Pencil className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            className="text-red-600 hover:text-red-800 transition"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                        No users found in your scope.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Hierarchy Tab */}
      {activeTab === "hierarchy" && canManageHierarchy() && (
        <div className="bg-white rounded-2xl shadow-md">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-600" />
                  User Hierarchy Assignment
                </h2>
                <p className="text-sm text-gray-500 mt-1">Assign hierarchy levels to users</p>
              </div>
              <div className="text-sm text-gray-500">
                Total: {visibleUsers.length} | Assigned: {visibleUsers.filter(u => u.hierarchy_level).length}
              </div>
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-5 gap-4 p-4 bg-gray-50 border-b">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{visibleUsers.filter(u => u.hierarchy_level === 'national').length}</div>
              <div className="text-xs text-gray-500 flex items-center justify-center gap-1"><Globe className="w-3 h-3 text-green-600" /> National</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{visibleUsers.filter(u => u.hierarchy_level === 'regional').length}</div>
              <div className="text-xs text-gray-500 flex items-center justify-center gap-1"><MapPin className="w-3 h-3 text-green-600" /> Regional</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{visibleUsers.filter(u => u.hierarchy_level === 'district').length}</div>
              <div className="text-xs text-gray-500 flex items-center justify-center gap-1"><Building2 className="w-3 h-3 text-green-600" /> District</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{visibleUsers.filter(u => u.hierarchy_level === 'facility').length}</div>
              <div className="text-xs text-gray-500 flex items-center justify-center gap-1"><Building2 className="w-3 h-3 text-green-600" /> Facility</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{visibleUsers.filter(u => !u.hierarchy_level).length}</div>
              <div className="text-xs text-gray-500 flex items-center justify-center gap-1"><UserX className="w-3 h-3" /> Unassigned</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-green-700">{u.username.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{u.username}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 flex items-center gap-1 w-fit">
                        <Shield className="w-3 h-3" />
                        {u.role || 'inspector'}
                      </span>
                    </td>
                    <td className="px-6 py-4">{getHierarchyBadge(u)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {u.region && <div className="flex items-center gap-1"><MapPin className="w-3 h-3 text-green-600" /> {u.region}</div>}
                      {u.district && <div className="flex items-center gap-1 text-xs text-gray-400">{u.district}</div>}
                      {u.facility && <div className="flex items-center gap-1 text-xs text-gray-400">{u.facility}</div>}
                      {!u.region && !u.district && !u.facility && <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-6 py-4">
                      {canManageHierarchy() && u.id !== user.id && (
                        <button
                          onClick={() => {
                            setSelectedHierarchyUser(u);
                            setShowHierarchyModal(true);
                          }}
                          className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-green-700 transition"
                        >
                          <Shield className="w-4 h-4" />
                          {u.hierarchy_level ? 'Change' : 'Assign'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Logs */}
      {showLogs && (
        <div className="bg-white rounded-2xl shadow-md mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              Audit Logs
            </h2>
            <p className="text-sm text-gray-500 mt-1">Track all user actions in the system</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-400">
                      No audit logs available
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-700 flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        {log.user}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          log.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                          log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                          log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{log.details || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {showHierarchyModal && selectedHierarchyUser && (
        <AssignHierarchyModal
          isOpen={showHierarchyModal}
          onClose={() => {
            setShowHierarchyModal(false);
            setSelectedHierarchyUser(null);
          }}
          onAssign={handleAssignHierarchy}
          user={user}
          targetUser={selectedHierarchyUser}
          hierarchyLevels={hierarchyLevels}
        />
      )}

      <AddUserModal
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setEditingUser(null);
        }}
        onSuccess={() => {
          fetchUsers();
          if (showLogs) fetchAuditLogs();
        }}
        user={user}
        editingUser={editingUser}
        roles={roles}
      />

      <AddRoleModal
        isOpen={showRoleModal}
        onClose={() => {
          setShowRoleModal(false);
          setEditingRole(null);
        }}
        onSuccess={() => {
          fetchRoles();
          if (showLogs) fetchAuditLogs();
        }}
        user={user}
        editingRole={editingRole}
      />

      <AssignRoleModal
        isOpen={showAssignRoleModal}
        onClose={() => {
          setShowAssignRoleModal(false);
          setSelectedUser(null);
        }}
        onSuccess={() => {
          fetchUsers();
          if (showLogs) fetchAuditLogs();
        }}
        user={user}
        selectedUser={selectedUser}
        roles={roles}
      />
    </Layout>
  );
}

// AssignHierarchyModal Component
function AssignHierarchyModal({ isOpen, onClose, onAssign, user, targetUser, hierarchyLevels }) {
  const [formData, setFormData] = useState({
    level_id: "",
    region_id: "",
    district_id: "",
    facility_id: "",
    can_manage_users: false,
    can_manage_admins: false,
    can_view_reports: false
  });
  const [regions, setRegions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchRegions();
      loadExistingHierarchy();
      setFormData({
        level_id: "",
        region_id: "",
        district_id: "",
        facility_id: "",
        can_manage_users: false,
        can_manage_admins: false,
        can_view_reports: false
      });
      setError("");
    }
  }, [isOpen]);

  async function loadExistingHierarchy() {
    try {
      const response = await fetch(`http://127.0.0.1:8000/hierarchy/users/${targetUser.id}/hierarchy/`, {
        headers: { "Authorization": `Token ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.has_hierarchy) {
          const levelObj = hierarchyLevels.find(l => l.name === data.level);
          if (levelObj) {
            setFormData(prev => ({
              ...prev,
              level_id: levelObj.id,
              can_manage_users: data.can_manage_users || false,
              can_manage_admins: data.can_manage_admins || false,
              can_view_reports: data.can_view_all_reports || false
            }));
          }
        }
      }
    } catch (error) {
      console.error("Error loading existing hierarchy:", error);
    }
  }

  async function fetchRegions() {
    try {
      const response = await fetch("http://127.0.0.1:8000/facilities/regions/", {
        headers: { "Authorization": `Token ${user.token}` }
      });
      const data = await response.json();
      setRegions(data);
    } catch (error) {
      console.error("Error fetching regions:", error);
    }
  }

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

  const handleLevelChange = (levelId) => {
    setFormData({
      ...formData,
      level_id: levelId,
      region_id: "",
      district_id: "",
      facility_id: ""
    });
    setDistricts([]);
    setFacilities([]);
    setError("");
  };

  const handleRegionChange = (regionId) => {
    setFormData({
      ...formData,
      region_id: regionId,
      district_id: "",
      facility_id: ""
    });
    fetchDistricts(regionId);
    setFacilities([]);
    setError("");
  };

  const handleDistrictChange = (districtId) => {
    setFormData({
      ...formData,
      district_id: districtId,
      facility_id: ""
    });
    fetchFacilities(districtId);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    // Validate
    if (!formData.level_id) {
      setError("Please select a hierarchy level");
      return;
    }
    
    const selectedLevel = hierarchyLevels.find(l => l.id == formData.level_id);
    if (selectedLevel?.name === 'regional' && !formData.region_id) {
      setError("Please select a region");
      return;
    }
    if (selectedLevel?.name === 'district' && (!formData.region_id || !formData.district_id)) {
      setError("Please select both region and district");
      return;
    }
    if (selectedLevel?.name === 'facility' && (!formData.region_id || !formData.district_id || !formData.facility_id)) {
      setError("Please select region, district, and facility");
      return;
    }
    
    setLoading(true);
    await onAssign(targetUser.id, formData);
    setLoading(false);
  };

  if (!isOpen) return null;

  const selectedLevel = hierarchyLevels.find(l => l.id == formData.level_id);

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 rounded-t-2xl z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Assign Hierarchy Level
              </h2>
              <p className="text-green-100 text-sm">
                User: {targetUser?.username} ({targetUser?.role || 'inspector'})
              </p>
            </div>
            <button 
              onClick={onClose}
              className="text-white hover:text-gray-200 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Hierarchy Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hierarchy Level <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.level_id}
              onChange={(e) => handleLevelChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
            >
              <option value="">Select Level</option>
              {hierarchyLevels.map(level => (
                <option key={level.id} value={level.id}>{level.display_name}</option>
              ))}
              <option value="none">None (Standard User)</option>
            </select>
            {hierarchyLevels.length === 0 && (
              <p className="text-xs text-yellow-600 mt-1">No hierarchy levels available for your scope</p>
            )}
          </div>

          {/* Region */}
          {selectedLevel?.name === 'regional' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Region <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.region_id}
                onChange={(e) => handleRegionChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
              >
                <option value="">Select Region</option>
                {regions.map(region => (
                  <option key={region.id} value={region.id}>{region.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* District */}
          {selectedLevel?.name === 'district' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Region <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.region_id}
                  onChange={(e) => handleRegionChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                >
                  <option value="">Select Region</option>
                  {regions.map(region => (
                    <option key={region.id} value={region.id}>{region.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  District <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.district_id}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                >
                  <option value="">Select District</option>
                  {districts.map(district => (
                    <option key={district.id} value={district.id}>{district.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Facility */}
          {selectedLevel?.name === 'facility' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Region <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.region_id}
                  onChange={(e) => handleRegionChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                >
                  <option value="">Select Region</option>
                  {regions.map(region => (
                    <option key={region.id} value={region.id}>{region.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  District <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.district_id}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                >
                  <option value="">Select District</option>
                  {districts.map(district => (
                    <option key={district.id} value={district.id}>{district.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Facility <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.facility_id}
                  onChange={(e) => setFormData({ ...formData, facility_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                >
                  <option value="">Select Facility</option>
                  {facilities.map(facility => (
                    <option key={facility.id} value={facility.id}>{facility.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Permissions */}
          {(selectedLevel?.name === 'regional' || selectedLevel?.name === 'district' || selectedLevel?.name === 'facility') && (
            <div className="border-t border-gray-200 pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Admin Permissions</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.can_manage_users}
                    onChange={(e) => setFormData({ ...formData, can_manage_users: e.target.checked })}
                    className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">Can manage users in their scope</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.can_manage_admins}
                    onChange={(e) => setFormData({ ...formData, can_manage_admins: e.target.checked })}
                    className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">Can manage lower-level admins</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.can_view_reports}
                    onChange={(e) => setFormData({ ...formData, can_view_reports: e.target.checked })}
                    className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">Can view all reports in scope</span>
                </label>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Assigning...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Assign Hierarchy
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
