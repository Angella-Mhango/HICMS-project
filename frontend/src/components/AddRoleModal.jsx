import { useState, useEffect } from "react";
import { 
  X, Shield, Key, AlertCircle, CheckCircle, ChevronDown, ChevronRight,
  LayoutDashboard, ClipboardList, CheckSquare, Building2, FileText,
  ClipboardCheck, Users, Bell, Settings
} from "lucide-react";
import useModalExperience from "./useModalExperience";

export default function AddRoleModal({ isOpen, onClose, onSuccess, user, editingRole }) {
  useModalExperience(isOpen, onClose);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: []
  });
  const [allPermissions, setAllPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedGroups, setExpandedGroups] = useState({});

  // Permission group definitions with Lucide icons
  const PERMISSION_GROUPS = {
    "Dashboard": {
      icon: LayoutDashboard,
      description: "Access dashboards and statistics",
    },
    "Inspections": {
      icon: ClipboardList,
      description: "Conduct and manage inspections",
    },
    "Compliance": {
      icon: CheckSquare,
      description: "Monitor compliance and corrective actions",
    },
    "Facilities": {
      icon: Building2,
      description: "Manage hospitals, departments and units",
    },
    "Reports": {
      icon: FileText,
      description: "Generate and export reports",
    },
    "Standards & Checklists": {
      icon: ClipboardCheck,
      description: "Manage inspection standards and checklists",
    },
    "Users & Roles": {
      icon: Users,
      description: "Manage users, roles and permissions",
    },
    "Notifications": {
      icon: Bell,
      description: "Manage alerts and notifications",
    },
    "System": {
      icon: Settings,
      description: "System administration and settings",
    }
  };

  // Map permissions to their groups
  const PERMISSION_GROUP_MAP = {
    // Dashboard
    'can_view_dashboard': 'Dashboard',

    // Inspections
    'can_create_inspection': 'Inspections',
    'can_view_inspection': 'Inspections',
    'can_edit_inspection': 'Inspections',
    'can_delete_inspection': 'Inspections',
    'can_schedule_inspections': 'Inspections',
    'can_assign_inspections': 'Inspections',
    'can_submit_inspection': 'Inspections',

    // Compliance
    'can_view_compliance': 'Compliance',
    'can_update_compliance': 'Compliance',
    'can_manage_corrective_actions': 'Compliance',
    'can_verify_corrective_actions': 'Compliance',

    // Facilities
    'can_manage_facilities': 'Facilities',
    'can_manage_departments': 'Facilities',
    'can_manage_units': 'Facilities',

    // Reports
    'can_view_reports': 'Reports',
    'can_generate_reports': 'Reports',
    'can_export_reports': 'Reports',
    'can_export_data': 'Reports',

    // Standards & Checklists
    'can_manage_standards': 'Standards & Checklists',
    'can_manage_checklists': 'Standards & Checklists',
    'can_manage_categories': 'Standards & Checklists',

    // Users & Roles
    'can_manage_users': 'Users & Roles',
    'can_manage_roles': 'Users & Roles',
    'can_assign_roles': 'Users & Roles',
    'can_manage_permissions': 'Users & Roles',

    // Notifications
    'can_send_notifications': 'Notifications',
    'can_view_notifications': 'Notifications',

    // System
    'can_manage_settings': 'System',
    'can_view_audit_logs': 'System',
    'can_audit_logs': 'System',
    'can_backup_database': 'System',
  };

  // Fetch available permissions when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPermissions();
      if (editingRole) {
        setFormData({
          name: editingRole.name || "",
          description: editingRole.description || "",
          permissions: editingRole.permissions || []
        });
      } else {
        setFormData({ name: "", description: "", permissions: [] });
      }
      // Expand all groups by default
      const initialExpanded = {};
      Object.keys(PERMISSION_GROUPS).forEach(group => {
        initialExpanded[group] = true;
      });
      setExpandedGroups(initialExpanded);
    }
  }, [isOpen, editingRole]);

  const fetchPermissions = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/accounts/permissions/", {
        headers: { "Authorization": `Token ${user.token}` }
      });
      const data = await response.json();
      
      // Map backend permissions to include group information
      const mappedPermissions = data.map(perm => ({
        ...perm,
        group: PERMISSION_GROUP_MAP[perm.codename] || 'Other'
      }));
      
      setAllPermissions(mappedPermissions);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      // Fallback default permissions with proper groups
      setAllPermissions([
        // Dashboard
        { id: 1, name: "View Dashboard", codename: "can_view_dashboard", group: "Dashboard" },
        
        // Inspections
        { id: 2, name: "Create Inspection", codename: "can_create_inspection", group: "Inspections" },
        { id: 3, name: "View Inspection", codename: "can_view_inspection", group: "Inspections" },
        { id: 4, name: "Edit Inspection", codename: "can_edit_inspection", group: "Inspections" },
        { id: 5, name: "Delete Inspection", codename: "can_delete_inspection", group: "Inspections" },
        { id: 6, name: "Schedule Inspection", codename: "can_schedule_inspections", group: "Inspections" },
        { id: 7, name: "Assign Inspector", codename: "can_assign_inspections", group: "Inspections" },
        { id: 8, name: "Submit Inspection", codename: "can_submit_inspection", group: "Inspections" },
        
        // Compliance
        { id: 9, name: "View Compliance", codename: "can_view_compliance", group: "Compliance" },
        { id: 10, name: "Update Compliance", codename: "can_update_compliance", group: "Compliance" },
        { id: 11, name: "Manage Corrective Actions", codename: "can_manage_corrective_actions", group: "Compliance" },
        { id: 12, name: "Verify Corrective Actions", codename: "can_verify_corrective_actions", group: "Compliance" },
        
        // Facilities
        { id: 13, name: "Manage Hospitals", codename: "can_manage_facilities", group: "Facilities" },
        { id: 14, name: "Manage Departments", codename: "can_manage_departments", group: "Facilities" },
        { id: 15, name: "Manage Units/Wards", codename: "can_manage_units", group: "Facilities" },
        
        // Reports
        { id: 16, name: "View Reports", codename: "can_view_reports", group: "Reports" },
        { id: 17, name: "Generate Reports", codename: "can_generate_reports", group: "Reports" },
        { id: 18, name: "Export Reports", codename: "can_export_reports", group: "Reports" },
        { id: 19, name: "Export Data", codename: "can_export_data", group: "Reports" },
        
        // Standards & Checklists
        { id: 20, name: "Manage Standards", codename: "can_manage_standards", group: "Standards & Checklists" },
        { id: 21, name: "Manage Checklist Categories", codename: "can_manage_categories", group: "Standards & Checklists" },
        { id: 22, name: "Manage Checklist Items", codename: "can_manage_checklists", group: "Standards & Checklists" },
        
        // Users & Roles
        { id: 23, name: "Manage Users", codename: "can_manage_users", group: "Users & Roles" },
        { id: 24, name: "Manage Roles", codename: "can_manage_roles", group: "Users & Roles" },
        { id: 25, name: "Assign Roles", codename: "can_assign_roles", group: "Users & Roles" },
        { id: 26, name: "Manage Permissions", codename: "can_manage_permissions", group: "Users & Roles" },
        
        // Notifications
        { id: 27, name: "Send Notifications", codename: "can_send_notifications", group: "Notifications" },
        { id: 28, name: "View Notifications", codename: "can_view_notifications", group: "Notifications" },
        
        // System
        { id: 29, name: "Manage Settings", codename: "can_manage_settings", group: "System" },
        { id: 30, name: "View Audit Logs", codename: "can_view_audit_logs", group: "System" },
        { id: 31, name: "Audit Logs", codename: "can_audit_logs", group: "System" },
        { id: 32, name: "Backup Database", codename: "can_backup_database", group: "System" },
      ]);
    }
  };

  // Group permissions by category
  const getGroupedPermissions = () => {
    const groups = {};
    allPermissions.forEach(perm => {
      const groupName = perm.group || "Other";
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(perm);
    });
    return groups;
  };

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const toggleAllInGroup = (groupName, permissions) => {
    const allIds = permissions.map(p => p.id);
    const allSelected = allIds.every(id => formData.permissions.includes(id));
    
    setFormData(prev => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter(id => !allIds.includes(id))
        : [...new Set([...prev.permissions, ...allIds])]
    }));
  };

  const handlePermissionToggle = (permId) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter(id => id !== permId)
        : [...prev.permissions, permId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const url = editingRole
      ? `http://127.0.0.1:8000/accounts/roles/${editingRole.id}/`
      : "http://127.0.0.1:8000/accounts/roles/create/";
    
    const method = editingRole ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${user.token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save role");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const groupedPermissions = getGroupedPermissions();
  const totalPermissions = allPermissions.length;
  const selectedCount = formData.permissions.length;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
    >
      <div role="dialog" aria-modal="true" aria-label={editingRole ? "Edit role" : "Add role"} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 rounded-t-2xl z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {editingRole ? "Edit Role" : "Add New Role"}
              </h2>
              <p className="text-green-100 text-sm mt-1">Define role and assign permissions</p>
            </div>
            <button 
              onClick={onClose}
              className="text-white hover:text-gray-200 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Inspector, Supervisor, Admin"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm placeholder-gray-400"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this role does"
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm placeholder-gray-400 resize-none"
              />
            </div>

            {/* Permissions with Groups */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Key className="w-4 h-4 text-gray-400" />
                  Permissions
                  <span className="text-xs text-gray-400 font-normal">
                    ({selectedCount} of {totalPermissions} selected)
                  </span>
                </label>
                {selectedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, permissions: [] }))}
                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    Clear All
                  </button>
                )}
              </div>
              
              <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto bg-gray-50">
                {Object.keys(groupedPermissions).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No permissions available</p>
                ) : (
                  <div className="space-y-1 p-2">
                    {Object.entries(groupedPermissions).map(([groupName, perms]) => {
                      const isExpanded = expandedGroups[groupName] !== undefined ? expandedGroups[groupName] : true;
                      const groupSelected = perms.every(p => formData.permissions.includes(p.id));
                      const groupPartial = perms.some(p => formData.permissions.includes(p.id)) && !groupSelected;
                      const groupInfo = PERMISSION_GROUPS[groupName];
                      const IconComponent = groupInfo?.icon;
                      
                      return (
                        <div key={groupName} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                          {/* Group Header */}
                          <div 
                            className={`flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition ${
                              groupSelected ? 'bg-green-50' : groupPartial ? 'bg-green-50' : ''
                            }`}
                            onClick={() => toggleGroup(groupName)}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <button type="button" className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                              {IconComponent && (
                                <IconComponent className={`w-4 h-4 flex-shrink-0 ${
                                  groupSelected ? 'text-green-600' : groupPartial ? 'text-green-600' : 'text-gray-400'
                                }`} />
                              )}
                              <div className="min-w-0">
                                <span className="text-sm font-medium text-gray-700">{groupName}</span>
                                {groupInfo?.description && (
                                  <span className="text-xs text-gray-400 ml-2 hidden sm:inline">- {groupInfo.description}</span>
                                )}
                              </div>
                              <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
                                ({perms.filter(p => formData.permissions.includes(p.id)).length}/{perms.length})
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleAllInGroup(groupName, perms);
                              }}
                              className={`ml-2 px-2.5 py-1 text-xs rounded transition flex-shrink-0 ${
                                groupSelected
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : groupPartial
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {groupSelected ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>
                          
                          {/* Group Permissions */}
                          {isExpanded && (
                            <div className="border-t border-gray-100 p-2 space-y-1 bg-gray-50/50">
                              {perms.map((perm) => {
                                const isChecked = formData.permissions.includes(perm.id);
                                return (
                                  <label 
                                    key={perm.id} 
                                    className={`flex items-center gap-2 cursor-pointer p-1.5 rounded transition ${
                                      isChecked ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-100'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handlePermissionToggle(perm.id)}
                                      className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                                    />
                                    <span className="text-sm text-gray-700 flex-1">{perm.name || perm.codename}</span>
                                    <span className="text-xs text-gray-400 hidden md:inline">{perm.codename}</span>
                                    {isChecked && <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />}
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {/* Quick Actions */}
              {totalPermissions > 0 && (
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = allPermissions.map(p => p.id);
                      setFormData(prev => ({
                        ...prev,
                        permissions: allIds
                      }));
                    }}
                    className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        permissions: []
                      }));
                    }}
                    className="text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition"
                  >
                    Deselect All
                  </button>
                </div>
              )}
            </div>

            {/* Role Suggestion */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs text-green-700">
                <strong>💡 Suggested Role Permissions:</strong>
              </p>
              <div className="grid grid-cols-2 gap-1 mt-1 text-xs text-green-600">
                <div><span className="font-medium">Inspector:</span> Dashboard, Inspections, Standards</div>
                <div><span className="font-medium">Supervisor:</span> Inspector + Compliance + Reports</div>
                <div><span className="font-medium">Hospital Admin:</span> Dashboard, Compliance, Reports</div>
                <div><span className="font-medium">QA Officer:</span> Dashboard, Compliance, Standards</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2 border-t border-gray-200 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.name.trim()}
                className={`flex-1 px-4 py-2 rounded-lg transition text-sm font-medium flex items-center justify-center gap-2 ${
                  loading || !formData.name.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Saving...
                  </>
                ) : (
                  editingRole ? "Update Role" : "Create Role"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
