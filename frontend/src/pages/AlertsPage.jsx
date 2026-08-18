// frontend/src/pages/AlertsPage.jsx
import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import {
  AlertCircle,
  Bell,
  CheckCircle,
  FileText,
  Info,
  MapPin,
  RefreshCw,
  XCircle
} from "lucide-react";
import { showToast } from "../components/Toast";

const API_BASE = "http://127.0.0.1:8000";

const AlertTypeIcon = ({ type }) => {
  if (type === "critical") return <XCircle className="w-6 h-6 text-red-500" />;
  if (type === "warning") return <AlertCircle className="w-6 h-6 text-green-500" />;
  return <Info className="w-6 h-6 text-green-500" />;
};

export default function AlertsPage({ user, onLogout }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [summary, setSummary] = useState({ critical: 0, warning: 0, info: 0, total: 0 });
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCurrentAdmin();
  }, []);

  useEffect(() => {
    if (currentAdmin !== null) {
      fetchAlerts();
    }
  }, [currentAdmin]);

  const authHeaders = {
    "Authorization": `Token ${user.token}`
  };

  const fetchCurrentAdmin = async () => {
    try {
      const response = await fetch(`${API_BASE}/hierarchy/my-admin-info/`, {
        headers: authHeaders
      });
      setCurrentAdmin(response.ok ? await response.json() : null);
    } catch (error) {
      console.error("Error fetching current admin:", error);
      setCurrentAdmin(null);
    }
  };

  const buildScopeParams = () => {
    const params = new URLSearchParams();
    if (currentAdmin?.level === "regional" && currentAdmin.region) {
      params.append("region_id", currentAdmin.region.id);
    } else if (currentAdmin?.level === "district" && currentAdmin.district) {
      params.append("district_id", currentAdmin.district.id);
    } else if (currentAdmin?.level === "facility" && currentAdmin.facility) {
      params.append("facility_id", currentAdmin.facility.id);
    }
    return params;
  };

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = buildScopeParams();
      const query = params.toString();
      const response = await fetch(`${API_BASE}/inspections/alerts/${query ? `?${query}` : ""}`, {
        headers: authHeaders
      });

      if (!response.ok) {
        throw new Error(`Alerts API error: ${response.status}`);
      }

      const data = await response.json();
      const dbAlerts = Array.isArray(data.alerts) ? data.alerts : [];
      setAlerts(dbAlerts);
      setSummary(data.summary || { critical: 0, warning: 0, info: 0, total: dbAlerts.length });

      if (dbAlerts.length > 0) {
        showToast(`Found ${dbAlerts.length} active alerts`, "info");
      } else {
        showToast("No alerts found. All systems are compliant!", "success");
      }
    } catch (error) {
      console.error("Error fetching alerts:", error);
      setError("Failed to load alerts from the database. Please try again.");
      setAlerts([]);
      setSummary({ critical: 0, warning: 0, info: 0, total: 0 });
      showToast("Failed to load alerts", "error");
    } finally {
      setLoading(false);
    }
  };

  const getAlertBgColor = (type) => {
    switch (type) {
      case "critical": return "bg-red-50 border-red-200";
      case "warning": return "bg-green-50 border-green-200";
      default: return "bg-green-50 border-green-200";
    }
  };

  const getAlertBorderColor = (type) => {
    switch (type) {
      case "critical": return "border-l-4 border-l-red-500";
      case "warning": return "border-l-4 border-l-green-500";
      default: return "border-l-4 border-l-green-500";
    }
  };

  const getAlertTextColor = (type) => {
    switch (type) {
      case "critical": return "text-red-700";
      case "warning": return "text-green-700";
      default: return "text-green-700";
    }
  };

  const getPageTitle = () => {
    if (!currentAdmin) return "Alerts & Notifications";
    if (currentAdmin.level === "regional") return `Alerts & Notifications - ${currentAdmin.region?.name || "Region"}`;
    if (currentAdmin.level === "district") return `Alerts & Notifications - ${currentAdmin.district?.name || "District"}`;
    if (currentAdmin.level === "facility") return `Alerts & Notifications - ${currentAdmin.facility?.name || "Facility"}`;
    return "Alerts & Notifications";
  };

  const getPageSubtitle = () => {
    if (!currentAdmin) return "Critical issues requiring attention across all facilities";
    if (currentAdmin.level === "regional") return `Critical issues requiring attention in ${currentAdmin.region?.name} region`;
    if (currentAdmin.level === "district") return `Critical issues requiring attention in ${currentAdmin.district?.name} district`;
    if (currentAdmin.level === "facility") return `Critical issues requiring attention at ${currentAdmin.facility?.name}`;
    return "Critical issues requiring attention";
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
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <Bell className="w-7 h-7 text-green-600" />
            <div>
              <h1 className="text-2xl font-semibold text-gray-700">{getPageTitle()}</h1>
              <p className="text-sm text-gray-500 mt-1">{getPageSubtitle()}</p>
            </div>
          </div>
          <button
            onClick={fetchAlerts}
            className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            title="Refresh Alerts"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
          <button
            onClick={fetchAlerts}
            className="ml-auto px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
          >
            Retry
          </button>
        </div>
      )}

      {currentAdmin && currentAdmin.level !== "national" && (
        <div className="mb-4 bg-green-50 rounded-lg p-3 border border-green-200 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-green-600" />
          <p className="text-sm text-green-800">
            <span className="font-semibold">Current scope:</span> Showing alerts for your {currentAdmin.level} scope only
          </p>
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-green-700">No Active Alerts</h3>
          <p className="text-sm text-green-600 mt-1">
            {currentAdmin?.level === "national"
              ? "All facilities are operating within acceptable parameters"
              : `All facilities in your ${currentAdmin?.level || "assigned"} scope are compliant`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`border rounded-xl p-5 ${getAlertBgColor(alert.type)} ${getAlertBorderColor(alert.type)} shadow-sm relative`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5"><AlertTypeIcon type={alert.type} /></div>
                <div className="flex-1">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <h3 className={`font-semibold ${getAlertTextColor(alert.type)}`}>
                        {alert.title}
                      </h3>
                      {alert.count !== null && alert.count > 0 && (
                        <span className={`ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full ${getAlertBgColor(alert.type)} ${getAlertTextColor(alert.type)}`}>
                          {alert.count}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{alert.date}</span>
                    </div>
                  </div>
                  <p className={`text-sm mt-1 ${getAlertTextColor(alert.type)} opacity-80`}>
                    {alert.message}
                  </p>
                  {alert.details && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer text-gray-500 hover:text-gray-700">View details</summary>
                      <p className="text-xs mt-1 text-gray-600">{alert.details}</p>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-red-500" />
            <p className="text-xs text-gray-500">Critical Alerts</p>
          </div>
          <p className="text-xl font-bold text-red-600">{summary.critical}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-green-500" />
            <p className="text-xs text-gray-500">Warnings</p>
          </div>
          <p className="text-xl font-bold text-green-600">{summary.warning}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Info className="w-4 h-4 text-green-500" />
            <p className="text-xs text-gray-500">Info Alerts</p>
          </div>
          <p className="text-xl font-bold text-green-600">{summary.info}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-green-500" />
            <p className="text-xs text-gray-500">Total Issues</p>
          </div>
          <p className="text-xl font-bold text-green-600">{summary.total}</p>
        </div>
      </div>
    </Layout>
  );
}
