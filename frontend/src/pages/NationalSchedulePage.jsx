// frontend/src/pages/NationalSchedulePage.jsx
import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import GanttChart from "../components/GanttChart";
import { showToast } from "../components/Toast";
import {
  AlertCircle,
  Building2,
  Calendar,
  CalendarDays,
  Eye,
  FileText,
  RefreshCw
} from "lucide-react";

export default function NationalSchedulePage({ user, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [facilityInfo, setFacilityInfo] = useState(undefined);
  const [error, setError] = useState("");
  const [ganttData, setGanttData] = useState({
    facilities: [],
    plans: [],
    schedules: [],
    timeline: { min_date: "", max_date: "", total_days: 0 }
  });

  useEffect(() => {
    fetchFacilityInfo();
  }, []);

  useEffect(() => {
    if (facilityInfo !== undefined) {
      fetchGanttData();
    }
  }, [facilityInfo]);

  const fetchFacilityInfo = async () => {
    try {
      const meResponse = await fetch("http://127.0.0.1:8000/accounts/me/", {
        headers: { "Authorization": `Token ${user.token}` }
      });

      if (meResponse.ok) {
        const userData = await meResponse.json();
        if (userData.facility_id) {
          const facilityRes = await fetch(`http://127.0.0.1:8000/facilities/api/${userData.facility_id}/`, {
            headers: { "Authorization": `Token ${user.token}` }
          });
          if (facilityRes.ok) {
            const facility = await facilityRes.json();
            setFacilityInfo({ facility, level: "facility" });
            return;
          }
        }
      }

      setFacilityInfo(null);
    } catch (error) {
      console.error("Error fetching facility info:", error);
      setFacilityInfo(null);
    }
  };

  const filterGanttForFacility = (data, facility) => {
    if (!facility) return data;

    const facilities = (data.facilities || []).filter((item) => {
      return item.id === facility.id || item.name?.toLowerCase() === facility.name?.toLowerCase();
    });
    const allowedFacilityIds = new Set(facilities.map((item) => item.id));
    const schedules = (data.schedules || []).filter((schedule) => allowedFacilityIds.has(schedule.facility_id));

    return { ...data, facilities, schedules };
  };

  const fetchGanttData = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://127.0.0.1:8000/inspections/gantt-chart-data/", {
        headers: { "Authorization": `Token ${user.token}` }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to load national schedule");
      }

      const data = await response.json();
      const normalized = {
        facilities: Array.isArray(data.facilities) ? data.facilities : [],
        plans: Array.isArray(data.plans) ? data.plans : [],
        schedules: Array.isArray(data.schedules) ? data.schedules : [],
        timeline: data.timeline || { min_date: "", max_date: "", total_days: 0 }
      };
      const filtered = filterGanttForFacility(normalized, facilityInfo?.facility);

      setGanttData(filtered);
      if (filtered.facilities.length === 0) {
        setError(
          facilityInfo?.facility
            ? `No future inspection schedules found for ${facilityInfo.facility.name}.`
            : "No future inspection schedules found."
        );
      }
    } catch (error) {
      console.error("Error fetching national schedule:", error);
      setError(error.message || "Failed to load national schedule");
      showToast("Failed to load national schedule", "error");
      setGanttData({
        facilities: [],
        plans: [],
        schedules: [],
        timeline: { min_date: "", max_date: "", total_days: 0 }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchGanttData();
    showToast("Schedule refreshed", "success");
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

  const facilityName = facilityInfo?.facility?.name;

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-700 flex items-center gap-2">
              <CalendarDays className="w-7 h-7 text-green-600" />
              National Inspection Schedule
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {facilityName
                ? `Read-only Gantt chart for ${facilityName}`
                : "Read-only national Gantt chart for future inspections"}
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3 text-green-600" />
                View only
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {ganttData.plans.length} plans
              </span>
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {ganttData.facilities.length} facilities
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {ganttData.schedules.length} scheduled visits
              </span>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-green-800 font-medium">Read-Only Planning View</p>
            <p className="text-xs text-green-600">
              Facility QA users can view the national inspection Gantt chart, but cannot create plans or edit schedules.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
            <AlertCircle className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">{error}</p>
          </div>
        )}

        <GanttChart
          facilities={ganttData.facilities}
          timeline={ganttData.timeline}
          canEdit={false}
          inspectors={[]}
          inspectionTypes={[]}
        />
      </div>
    </Layout>
  );
}
