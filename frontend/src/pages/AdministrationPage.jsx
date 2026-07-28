// frontend/src/pages/AdministrationPage.jsx
import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  CheckCircle,
  Database,
  Download,
  FileArchive,
  FileText,
  FolderOpen,
  Lock,
  MapPin,
  Plus,
  Save,
  Settings,
  Shield,
  Upload,
  Users,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { showToast } from "../components/Toast";

export default function AdministrationPage({ user, onLogout }) {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("users");
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentAdmin();
  }, []);

  const fetchCurrentAdmin = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/hierarchy/my-admin-info/", {
        headers: { "Authorization": `Token ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentAdmin(data);
      } else {
        console.warn("Failed to fetch admin info:", response.status);
        setCurrentAdmin(null);
      }
    } catch (error) {
      console.error("Error fetching current admin:", error);
      setCurrentAdmin(null);
    } finally {
      setLoading(false);
    }
  };

  const canAccessAdministration = () => {
    if (!currentAdmin) return false;
    // National admin always has access
    if (currentAdmin.level === 'national') return true;
    // Other admins need specific permissions
    return currentAdmin.can_manage_admins === true || 
           currentAdmin.can_manage_users === true ||
           currentAdmin.can_manage_roles === true;
  };

  const menuItems = [
    {
      id: "users",
      name: "User Management",
      icon: Users,
      description: "Manage system users, roles, and permissions",
      permission: true,
      action: () => navigate("/users")
    },
    {
      id: "locations",
      name: "Location Management",
      icon: MapPin,
      description: "Manage districts, regions, and facility locations",
      permission: currentAdmin?.level === 'national' || currentAdmin?.level === 'regional',
      action: () => setActiveSection("locations")
    },
    {
      id: "data",
      name: "Data Management",
      icon: Database,
      description: "Import, export, and manage system data",
      permission: currentAdmin?.level === 'national',
      action: () => setActiveSection("data")
    },
    {
      id: "preferences",
      name: "System Preferences",
      icon: Settings,
      description: "Configure system settings and preferences",
      permission: currentAdmin?.level === 'national',
      action: () => setActiveSection("preferences")
    }
  ];

  const visibleMenuItems = menuItems.filter(item => item.permission !== false);

  const renderContent = () => {
    switch(activeSection) {
      case "data":
        return <DataManagement user={user} currentAdmin={currentAdmin} />;
      case "preferences":
        return <SystemPreferences user={user} currentAdmin={currentAdmin} />;
      case "locations":
        return <LocationManagement user={user} currentAdmin={currentAdmin} />;
      default:
        return null;
    }
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

  if (!canAccessAdministration()) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex flex-col items-center justify-center h-96">
          <Lock className="w-14 h-14 text-green-600 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">Access Denied</h2>
          <p className="text-gray-500">You don't have permission to access the Administration page.</p>
        </div>
      </Layout>
    );
  }

  const getPageSubtitle = () => {
    if (!currentAdmin) return "Manage system settings and configurations";
    if (currentAdmin.level === 'national') {
      return "Manage system settings and configurations (Full Access)";
    }
    if (currentAdmin.level === 'regional') {
      return `Manage settings for ${currentAdmin.region?.name} region`;
    }
    if (currentAdmin.level === 'district') {
      return `Manage settings for ${currentAdmin.district?.name} district`;
    }
    if (currentAdmin.level === 'facility') {
      return `Manage settings for ${currentAdmin.facility?.name}`;
    }
    return "Manage system settings and configurations";
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-7 h-7 text-green-600" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-700">Administration</h1>
            <p className="text-sm text-gray-500 mt-1">{getPageSubtitle()}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={item.action}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-left hover:shadow-md hover:border-green-200 transition-all duration-200"
            >
              <div className="w-11 h-11 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">{item.name}</h3>
              <p className="text-sm text-gray-500">{item.description}</p>
            </button>
          );
        })}
      </div>

      {activeSection !== "users" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {renderContent()}
        </div>
      )}
    </Layout>
  );
}

// Data Management Component
function DataManagement({ user, currentAdmin }) {
  const [exporting, setExporting] = useState(false);
  const [backupStatus, setBackupStatus] = useState(null);
  const [importFile, setImportFile] = useState(null);

  const canExportData = () => {
    return currentAdmin?.level === 'national';
  };

  const handleExportData = async (type) => {
    setExporting(true);
    try {
      let url = `http://127.0.0.1:8000/api/export/${type}/`;
      
      if (currentAdmin?.level === 'regional' && currentAdmin.region) {
        url += `?region_id=${currentAdmin.region.id}`;
      } else if (currentAdmin?.level === 'district' && currentAdmin.district) {
        url += `?district_id=${currentAdmin.district.id}`;
      } else if (currentAdmin?.level === 'facility' && currentAdmin.facility) {
        url += `?facility_id=${currentAdmin.facility.id}`;
      }
      
      const response = await fetch(url, {
        headers: { "Authorization": `Token ${user.token}` }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url_blob = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url_blob;
      a.download = `${type}_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url_blob);
      
      showToast(`${type} exported successfully!`, "success");
    } catch (error) {
      console.error("Export error:", error);
      showToast(`Error exporting ${type}`, "error");
    } finally {
      setExporting(false);
    }
  };

  const handleImportFile = async () => {
    if (!importFile) {
      showToast("Please select a file first", "warning");
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      
      const response = await fetch("http://127.0.0.1:8000/api/import/", {
        method: "POST",
        headers: { "Authorization": `Token ${user.token}` },
        body: formData
      });
      
      if (response.ok) {
        showToast("Data imported successfully!", "success");
        setImportFile(null);
      } else {
        const error = await response.json();
        showToast(error.error || "Import failed", "error");
      }
    } catch (error) {
      console.error("Import error:", error);
      showToast("Error importing data", "error");
    }
  };

  const handleBackup = async () => {
    setBackupStatus("loading");
    try {
      const response = await fetch("http://127.0.0.1:8000/api/backup/create/", {
        method: "POST",
        headers: { "Authorization": `Token ${user.token}` }
      });
      
      if (response.ok) {
        setBackupStatus("success");
        showToast("Backup created successfully!", "success");
        setTimeout(() => setBackupStatus(null), 3000);
      } else {
        throw new Error("Backup failed");
      }
    } catch (error) {
      setBackupStatus("error");
      showToast("Error creating backup", "error");
      setTimeout(() => setBackupStatus(null), 3000);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Data Management</h2>
      <p className="text-sm text-gray-500 mb-4">
        {currentAdmin?.level === 'national' 
          ? "Export all system data" 
          : `Export data for ${currentAdmin?.region?.name || currentAdmin?.district?.name || currentAdmin?.facility?.name || 'your scope'}`}
      </p>
      
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-700 mb-3">Export Data</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => handleExportData("facilities")}
            disabled={exporting || !canExportData()}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Building2 className="w-4 h-4" />
            {exporting ? "Exporting..." : "Export Facilities"}
          </button>
          <button
            onClick={() => handleExportData("inspections")}
            disabled={exporting || !canExportData()}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" />
            {exporting ? "Exporting..." : "Export Inspections"}
          </button>
          <button
            onClick={() => handleExportData("users")}
            disabled={exporting || !canExportData()}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Users className="w-4 h-4" />
            {exporting ? "Exporting..." : "Export Users"}
          </button>
        </div>
      </div>

      {currentAdmin?.level === 'national' && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-700 mb-3">Import Data</h3>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input 
              type="file" 
              className="hidden" 
              id="import-file"
              onChange={(e) => setImportFile(e.target.files[0])}
              accept=".json,.csv"
            />
            <label
              htmlFor="import-file"
              className="cursor-pointer inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              <FolderOpen className="w-4 h-4" />
              Choose File
            </label>
            {importFile && (
              <div className="mt-2 flex items-center justify-center gap-2">
                <span className="text-sm text-gray-600">{importFile.name}</span>
                <button
                  onClick={handleImportFile}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                >
                  Upload
                </button>
                <button
                  onClick={() => setImportFile(null)}
                  className="text-red-600 text-sm hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            )}
            <p className="text-sm text-gray-500 mt-2">Supported formats: JSON, CSV</p>
          </div>
        </div>
      )}

      {currentAdmin?.level === 'national' && (
        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-3">System Backup</h3>
          <button
            onClick={handleBackup}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <FileArchive className="w-4 h-4" />
            Create System Backup
          </button>
          {backupStatus === "loading" && <p className="text-green-600 mt-2">Creating backup...</p>}
          {backupStatus === "success" && <p className="text-green-600 mt-2">✅ Backup created successfully!</p>}
          {backupStatus === "error" && <p className="text-red-600 mt-2">❌ Error creating backup</p>}
        </div>
      )}
    </div>
  );
}

// System Preferences Component
function SystemPreferences({ user, currentAdmin }) {
  const [preferences, setPreferences] = useState({
    notifications: true,
    autoBackup: false,
    emailAlerts: true,
    defaultBenchmark: 80,
    dateFormat: "YYYY-MM-DD",
    language: "en"
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/preferences/", {
        headers: { "Authorization": `Token ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const canEditPreferences = () => {
    return currentAdmin?.level === 'national';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/preferences/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${user.token}`
        },
        body: JSON.stringify(preferences)
      });
      
      if (response.ok) {
        showToast("Preferences saved successfully!", "success");
      } else {
        const error = await response.json();
        showToast(error.error || "Error saving preferences", "error");
      }
    } catch (error) {
      console.error("Error saving preferences:", error);
      showToast("Error saving preferences", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading preferences...</div>;
  }

  if (!canEditPreferences()) {
    return (
      <div className="text-center py-8">
        <Lock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">System preferences can only be modified by National Admin.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">System Preferences</h2>
      
      <div className="space-y-6">
        <div className="border-b pb-4">
          <h3 className="text-lg font-medium text-gray-700 mb-3">Notifications</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={preferences.notifications}
                onChange={(e) => setPreferences({...preferences, notifications: e.target.checked})}
                className="w-4 h-4 text-green-600"
              />
              <span className="text-gray-700">Enable email notifications</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={preferences.emailAlerts}
                onChange={(e) => setPreferences({...preferences, emailAlerts: e.target.checked})}
                className="w-4 h-4 text-green-600"
              />
              <span className="text-gray-700">Send alerts for non-compliance</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={preferences.autoBackup}
                onChange={(e) => setPreferences({...preferences, autoBackup: e.target.checked})}
                className="w-4 h-4 text-green-600"
              />
              <span className="text-gray-700">Automatic weekly backup</span>
            </label>
          </div>
        </div>

        <div className="border-b pb-4">
          <h3 className="text-lg font-medium text-gray-700 mb-3">Inspection Settings</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Compliance Benchmark (%)</label>
            <input
              type="number"
              value={preferences.defaultBenchmark}
              onChange={(e) => setPreferences({...preferences, defaultBenchmark: parseInt(e.target.value)})}
              className="w-32 px-3 py-1 border border-gray-300 rounded-md"
              min="0"
              max="100"
            />
          </div>
        </div>

        <div className="border-b pb-4">
          <h3 className="text-lg font-medium text-gray-700 mb-3">Regional Settings</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
              <select
                value={preferences.dateFormat}
                onChange={(e) => setPreferences({...preferences, dateFormat: e.target.value})}
                className="w-48 px-3 py-1 border border-gray-300 rounded-md"
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
              <select
                value={preferences.language}
                onChange={(e) => setPreferences({...preferences, language: e.target.value})}
                className="w-48 px-3 py-1 border border-gray-300 rounded-md"
              >
                <option value="en">English</option>
                <option value="fr">French</option>
              </select>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Location Management Component
function LocationManagement({ user, currentAdmin }) {
  const [districts, setDistricts] = useState([]);
  const [regions, setRegions] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDistrict, setShowAddDistrict] = useState(false);
  const [newDistrict, setNewDistrict] = useState({ name: "", region_id: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLocations();
  }, [user.token]);

  const authHeaders = {
    "Authorization": `Token ${user.token}`
  };

  const applyAdminScope = (items) => {
    if (currentAdmin?.level === 'regional' && currentAdmin.region?.id) {
      return items.filter(item => item.region_id === currentAdmin.region.id);
    }
    if (currentAdmin?.level === 'district' && currentAdmin.district?.id) {
      return items.filter(item => item.district_id === currentAdmin.district.id || item.id === currentAdmin.district.id);
    }
    if (currentAdmin?.level === 'facility' && currentAdmin.facility?.id) {
      return items.filter(item => item.id === currentAdmin.facility.id);
    }
    return items;
  };

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const [regionsRes, districtsRes, facilitiesRes] = await Promise.all([
        fetch("http://127.0.0.1:8000/facilities/regions/", { headers: authHeaders }),
        fetch("http://127.0.0.1:8000/hierarchy/accessible-districts/", { headers: authHeaders }),
        fetch("http://127.0.0.1:8000/facilities/api/", { headers: authHeaders })
      ]);
      
      if (!regionsRes.ok || !districtsRes.ok || !facilitiesRes.ok) {
        throw new Error("Failed to fetch location data");
      }
      
      const [regionsData, districtsData, facilitiesData] = await Promise.all([
        regionsRes.json(),
        districtsRes.json(),
        facilitiesRes.json()
      ]);

      const normalizedDistricts = districtsData.map(district => ({
        id: district.id,
        name: district.name,
        code: district.code || "",
        region: district.region_name || district.region || "Unassigned",
        region_id: district.region_id
      }));

      const scopedDistricts = applyAdminScope(normalizedDistricts);
      const scopedFacilities = applyAdminScope(facilitiesData);
      const visibleRegionIds = new Set([
        ...scopedDistricts.map(district => district.region_id),
        ...scopedFacilities.map(facility => facility.region_id)
      ].filter(Boolean));

      const scopedRegions = currentAdmin?.level === 'regional' && currentAdmin.region
        ? regionsData.filter(region => region.id === currentAdmin.region.id)
        : regionsData.filter(region => visibleRegionIds.size === 0 || visibleRegionIds.has(region.id));

      setRegions(scopedRegions);
      setDistricts(scopedDistricts);
      setFacilities(scopedFacilities);
      
    } catch (error) {
      console.error("Error fetching locations:", error);
      showToast("Failed to load locations", "error");
    } finally {
      setLoading(false);
    }
  };

  const canAddDistrict = () => {
    return currentAdmin?.level === 'national' || currentAdmin?.level === 'regional';
  };

  const getAvailableRegions = () => {
    if (currentAdmin?.level === 'regional' && currentAdmin.region) {
      return [{ id: currentAdmin.region.id, name: currentAdmin.region.name }];
    }
    return regions;
  };

  const handleAddDistrict = async () => {
    if (!newDistrict.name || !newDistrict.region_id) {
      showToast("Please fill in all fields", "warning");
      return;
    }
    
    setSaving(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/facilities/districts/create/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${user.token}`
        },
        body: JSON.stringify({
          name: newDistrict.name,
          region_id: parseInt(newDistrict.region_id)
        })
      });
      
      if (response.ok) {
        showToast("District added successfully!", "success");
        setNewDistrict({ name: "", region_id: "" });
        setShowAddDistrict(false);
        fetchLocations();
      } else {
        const error = await response.json();
        showToast(error.error || "Failed to add district", "error");
      }
    } catch (error) {
      console.error("Error adding district:", error);
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading locations...</div>;
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Location Management</h2>
      <p className="text-sm text-gray-500 mb-4">
        {currentAdmin?.level === 'national' 
          ? "Manage all regions, districts, and facility locations from the database" 
          : `Manage locations in ${currentAdmin?.region?.name || 'your region'}`}
      </p>
      
      {/* Regions Section */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-700 mb-3">Regions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {regions.length === 0 ? (
            <div className="col-span-full bg-gray-50 rounded-lg p-6 border border-gray-200 text-center text-gray-500">
              No regions found in the database
            </div>
          ) : (
            regions.map((region) => (
              <div key={region.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="font-medium text-gray-800">{region.name}</h4>
                <p className="text-sm text-gray-500">
                  Districts: {districts.filter(d => d.region_id === region.id).length}
                </p>
                <p className="text-sm text-gray-500">
                  Facilities: {facilities.filter(f => f.region_id === region.id).length}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Districts Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium text-gray-700">Districts</h3>
          {canAddDistrict() && (
            <button
              onClick={() => setShowAddDistrict(!showAddDistrict)}
              className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-700 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add District
            </button>
          )}
        </div>

        {/* Add District Form */}
        {showAddDistrict && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="District Name"
                value={newDistrict.name}
                onChange={(e) => setNewDistrict({...newDistrict, name: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md"
              />
              <select
                value={newDistrict.region_id}
                onChange={(e) => setNewDistrict({...newDistrict, region_id: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select Region</option>
                {getAvailableRegions().map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleAddDistrict}
                disabled={saving}
                className="bg-green-600 text-white px-4 py-1 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setShowAddDistrict(false)}
                className="bg-gray-400 text-white px-4 py-1 rounded-lg text-sm hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Districts Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="border-b">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">District</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Region</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Facilities</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {districts.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-4 py-8 text-center text-gray-400">
                    No districts found
                  </td>
                </tr>
              ) : (
                districts.map((district) => (
                  <tr key={district.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{district.name}</td>
                    <td className="px-4 py-3 text-sm">{district.region}</td>
                    <td className="px-4 py-3 text-sm">
                      {facilities.filter(f => f.district_id === district.id).length}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Facilities Section */}
      <div>
        <h3 className="text-lg font-medium text-gray-700 mb-3">Facilities</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="border-b">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Facility</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">District</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Region</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Departments</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {facilities.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-gray-400">
                    No facilities found
                  </td>
                </tr>
              ) : (
                facilities.map((facility) => (
                  <tr key={facility.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{facility.name}</td>
                    <td className="px-4 py-3 text-sm">{facility.facility_type || "Not set"}</td>
                    <td className="px-4 py-3 text-sm">{facility.district || "Unassigned"}</td>
                    <td className="px-4 py-3 text-sm">{facility.region || "Unassigned"}</td>
                    <td className="px-4 py-3 text-sm">{facility.department_count ?? 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
