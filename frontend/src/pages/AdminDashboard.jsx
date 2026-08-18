// frontend/src/pages/AdminDashboard.jsx
import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import HierarchyFilter from "../components/HierarchyFilter";
import { BarChart, Bar, Cell, ReferenceLine, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import {
  LayoutDashboard,
  Building2,
  CheckCircle,
  XCircle,
  TrendingUp,
  Calendar,
  RefreshCw,
  MapPin,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import { showToast } from "../components/Toast";

const API_BASE = "http://127.0.0.1:8000";

function StandardsTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const standard = payload[0].payload;
  const isMet = standard.status === "Met";

  return (
    <div className="max-w-64 rounded-lg border border-gray-200 bg-white p-3 text-sm shadow-lg">
      <p className="font-semibold text-gray-800">{standard.standard}: {standard.standard_name}</p>
      <p className="mt-1 text-gray-600">Performance: <span className="font-semibold">{standard.performance}%</span></p>
      <p className={`font-semibold ${isMet ? "text-green-600" : "text-red-600"}`}>
        {isMet ? "Met" : "Not met"} (target: 80%)
      </p>
    </div>
  );
}

export default function AdminDashboard({ user, onLogout }) {

   console.log("🚀 AdminDashboard RENDERED for user:", user?.username, "role:", user?.role);
   
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [, setChartData] = useState([]);
  const [complianceTrends, setComplianceTrends] = useState([]);
  const [standardsPerformance, setStandardsPerformance] = useState([]);
  const [, setTotalFacilities] = useState(0);
  const [, setActiveInspectors] = useState(0);
  const [, setThisMonthInspections] = useState(0);
  const [chartsReady, setChartsReady] = useState(false);
  
  // Hierarchy state
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState({ level: 'national', name: 'National (All Facilities)', id: null });
  const [dateRange, setDateRange] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showCustomDate, setShowCustomDate] = useState(false);

  useEffect(() => {
    fetchCurrentAdmin();
  }, []);

  useEffect(() => {
    console.log("🔍 AdminDashboard - currentAdmin state:", currentAdmin);
    console.log("🔍 AdminDashboard - selectedFilter:", selectedFilter);
    
    if (currentAdmin !== null) {
      console.log("📡 currentAdmin is NOT null, calling fetchDashboardData");
      fetchDashboardData();
    } else {
      console.log("⏳ currentAdmin is null, waiting...");
    }
  }, [selectedFilter, dateRange, customStartDate, customEndDate, currentAdmin]);

  // Set charts ready after data loads
  useEffect(() => {
    if (!loading && (standardsPerformance.length > 0 || complianceTrends.length > 0)) {
      setChartsReady(true);
    }
  }, [loading, standardsPerformance, complianceTrends]);

  const fetchCurrentAdmin = async () => {
    console.log("🔄 fetchCurrentAdmin started");
    
    try {
      console.log("📡 Fetching from:", `${API_BASE}/hierarchy/my-admin-info/`);
      console.log("🔑 Token exists:", !!user?.token);
      
      const response = await fetch(`${API_BASE}/hierarchy/my-admin-info/`, {
        headers: { "Authorization": `Token ${user?.token}` }
      });
      
      console.log("📊 Response status:", response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Admin data received:", data);
        setCurrentAdmin(data);
        console.log("✅ currentAdmin set to:", data);
        
        if (data.level === 'regional' && data.region) {
          setSelectedFilter({ level: 'region', name: data.region.name, id: data.region.id });
        } else if (data.level === 'district' && data.district) {
          setSelectedFilter({ level: 'district', name: data.district.name, id: data.district.id });
        } else if (data.level === 'facility' && data.facility) {
          setSelectedFilter({ level: 'facility', name: data.facility.name, id: data.facility.id });
        } else {
          setSelectedFilter({ level: 'national', name: 'National (All Facilities)', id: null });
        }
      } else if (response.status === 404) {
        console.log("⚠️ 404: No admin profile found, using national scope");
        setCurrentAdmin({ level: 'national', level_name: 'National' });
        setSelectedFilter({ level: 'national', name: 'National (All Facilities)', id: null });
      } else {
        console.error("❌ Failed to fetch current admin:", response.status);
        setCurrentAdmin(null);
      }
    } catch (error) {
      console.error("❌ Error fetching current admin:", error);
      setCurrentAdmin(null);
    }
  };

  const fetchDashboardData = async () => {
    console.log("📊 fetchDashboardData called");
    
    if (!user?.token) {
      console.error("❌ No authentication token found");
      setLoading(false);
      return;
    }

    setLoading(true);
    setChartsReady(false);
    try {
      const params = new URLSearchParams();
      if (selectedFilter.level && selectedFilter.level !== 'national') {
        params.append("level", selectedFilter.level);
        if (selectedFilter.id) params.append("id", selectedFilter.id);
      }
      if (dateRange !== "all" && !showCustomDate) params.append("date_range", dateRange);
      if (showCustomDate && customStartDate && customEndDate) {
        params.append("start_date", customStartDate);
        params.append("end_date", customEndDate);
      }

      const queryString = params.toString();
      const baseUrl = `${API_BASE}/inspections`;
      
      const headers = {
        "Authorization": `Token ${user.token}`,
        "Content-Type": "application/json"
      };

      console.log("📡 Fetching dashboard with params:", queryString);

      // Try to fetch stats
      try {
        const statsRes = await fetch(`${baseUrl}/dashboard/filtered/?${queryString}`, { headers });
        console.log("📊 Stats response status:", statsRes.status);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          console.log("✅ Stats data:", statsData);
          setStats(statsData);
        } else {
          console.error("Stats API error:", statsRes.status);
          setStats({ total_inspections: 0, compliant: 0, non_compliant: 0, compliance_rate: 0, average_score: 0 });
        }
      } catch (e) {
        console.error("Error fetching stats:", e);
        setStats({ total_inspections: 0, compliant: 0, non_compliant: 0, compliance_rate: 0, average_score: 0 });
      }

      // Try to fetch chart data
      try {
        const chartRes = await fetch(`${baseUrl}/chart-data/filtered/?${queryString}`, { headers });
        console.log("📊 Chart response status:", chartRes.status);
        if (chartRes.ok) {
          const chartDataResult = await chartRes.json();
          console.log("✅ Chart data:", chartDataResult);
          setChartData(Array.isArray(chartDataResult) ? chartDataResult : []);
        } else {
          console.error("Chart API error:", chartRes.status);
          setChartData([]);
        }
      } catch (e) {
        console.error("Error fetching chart data:", e);
        setChartData([]);
      }

      // Try to fetch compliance trends
      try {
        const trendsRes = await fetch(`${baseUrl}/compliance-trends/filtered/?${queryString}`, { headers });
        console.log("📊 Trends response status:", trendsRes.status);
        if (trendsRes.ok) {
          const trendsData = await trendsRes.json();
          console.log("✅ Trends data:", trendsData);
          setComplianceTrends(Array.isArray(trendsData) ? trendsData : []);
        } else {
          console.error("Trends API error:", trendsRes.status);
          setComplianceTrends([]);
        }
      } catch (e) {
        console.error("Error fetching compliance trends:", e);
        setComplianceTrends([]);
      }

      // Standard-level results are used for the overview performance chart and status cards.
      try {
        const standardsRes = await fetch(`${baseUrl}/standards-performance/filtered/?${queryString}`, { headers });
        if (standardsRes.ok) {
          const standardsData = await standardsRes.json();
          setStandardsPerformance(Array.isArray(standardsData) ? standardsData : []);
        } else {
          setStandardsPerformance([]);
        }
      } catch (e) {
        console.error("Error fetching standards performance:", e);
        setStandardsPerformance([]);
      }

      // Try to fetch summary
      try {
        const summaryRes = await fetch(`${baseUrl}/summary/filtered/?${queryString}`, { headers });
        console.log("📊 Summary response status:", summaryRes.status);
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          console.log("✅ Summary data:", summaryData);
          setTotalFacilities(summaryData.total_facilities || 0);
          setActiveInspectors(summaryData.active_inspectors || 0);
          setThisMonthInspections(summaryData.this_month_inspections || 0);
        }
      } catch (e) {
        console.error("Error fetching summary:", e);
      }

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      showToast("Failed to load dashboard data", "error");
    } finally {
      setLoading(false);
      setTimeout(() => setChartsReady(true), 300);
    }
  };

  const resetFilters = () => {
    setSelectedFilter({ level: 'national', name: 'National (All Facilities)', id: null });
    setDateRange("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setShowCustomDate(false);
    showToast("Filters reset", "info");
  };

  if (!user?.token) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-500">Please login to view the dashboard</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    );
  }

  const adminLevelName = currentAdmin?.level_name || "National";

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-7 h-7 text-green-600" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-700">Dashboard Overview</h1>
            <p className="text-sm text-gray-500 mt-1">
              Welcome back, {user.username} ({adminLevelName} Admin)
            </p>
          </div>
        </div>
      </div>

      {/* Two Column Layout for Filter and Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        {/* Hierarchy Filter Sidebar */}
        <div className="lg:col-span-1">
          <HierarchyFilter 
            user={user}
            onSelect={setSelectedFilter}
            selectedPath={selectedFilter}
            currentAdminLevel={currentAdmin?.level}
          />
          
          {/* Date Range Filter */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-700">Time Period</h3>
            </div>
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value);
                setShowCustomDate(e.target.value === "custom");
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
            >
              <option value="all">All Time</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last 3 Months</option>
              <option value="year">Last 12 Months</option>
              <option value="custom">Custom Range</option>
            </select>
            
            {showCustomDate && (
              <div className="mt-3 space-y-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                  placeholder="Start Date"
                />
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                  placeholder="End Date"
                />
              </div>
            )}
            
            <button
              onClick={resetFilters}
              className="w-full mt-3 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reset Filters
            </button>
          </div>
        </div>

        {/* Stats and Charts Area */}
        <div className="lg:col-span-3">
          {/* Current Selection Badge */}
          <div className="bg-green-50 rounded-lg p-3 mb-4 border border-green-200 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-green-600" />
            <p className="text-sm text-green-800">
              <span className="font-semibold">Currently viewing:</span> {selectedFilter.name}
              {selectedFilter.level === 'region' && ' (Region)'}
              {selectedFilter.level === 'district' && ' (District)'}
              {selectedFilter.level === 'facility' && ' (Facility)'}
              {selectedFilter.level === 'national' && ''}
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-4 h-4 text-green-500" />
                <p className="text-xs text-gray-500">Assessed Facilities</p>
              </div>
              <p className="text-xl font-bold text-green-600">{stats.assessed_facilities || 0}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <p className="text-xs text-gray-500">Compliant Facilities</p>
              </div>
              <p className="text-xl font-bold text-green-600">{stats.compliant_facilities || 0}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-red-500" />
                <p className="text-xs text-gray-500">Non-Compliant Facilities</p>
              </div>
              <p className="text-xl font-bold text-red-600">{stats.non_compliant_facilities || 0}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <p className="text-xs text-gray-500">Facility Compliance Rate</p>
              </div>
              <p className="text-xl font-bold text-green-600">{stats.compliance_rate || 0}%</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-gray-600" />
                <h3 className="text-gray-600 font-semibold">Performance Against Standards</h3>
              </div>
              <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-gray-600">
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-green-500" /> Met (80% or above)</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-red-500" /> Not met (below 80%)</span>
              </div>
              <div className="h-[250px] min-h-[200px] w-full">
                {chartsReady && standardsPerformance.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={standardsPerformance} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <XAxis dataKey="standard" fontSize={12} interval={0} angle={-25} textAnchor="end" height={55} />
                      <YAxis fontSize={12} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                      <Tooltip content={<StandardsTooltip />} />
                      <ReferenceLine y={80} stroke="#64748b" strokeDasharray="4 4" label={{ value: "80% target", position: "insideTopRight", fill: "#64748b", fontSize: 11 }} />
                      <Bar dataKey="performance" name="Performance (%)" radius={[4, 4, 0, 0]}>
                        {standardsPerformance.map((item) => (
                          <Cell key={item.standard} fill={item.status === "Met" ? "#22c55e" : "#ef4444"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 text-center">No data available</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-gray-600" />
                <h3 className="text-gray-600 font-semibold">Inspection Compliance Trend</h3>
              </div>
              <div className="h-[250px] min-h-[200px] w-full">
                {chartsReady && complianceTrends && complianceTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={complianceTrends} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <XAxis dataKey="month" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Line type="monotone" dataKey="compliance_rate" stroke="#22c55e" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 text-center">No data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Standards status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="text-gray-600 font-semibold">Standards Being Met</h3>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-3 px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <span>Standard</span><span>Performance</span>
              </div>
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {standardsPerformance.filter(item => item.status === "Met").map(item => (
                  <div key={item.standard} className="flex justify-between gap-3 rounded-lg bg-green-50 px-3 py-2 text-sm">
                    <span className="text-gray-700">{item.standard}: {item.standard_name}</span>
                    <span className="font-semibold text-green-700">{item.performance}%</span>
                  </div>
                ))}
                {!standardsPerformance.some(item => item.status === "Met") && <p className="py-8 text-center text-sm text-gray-500">No standards are meeting the 80% target yet.</p>}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <XCircle className="w-5 h-5 text-red-600" />
                <h3 className="text-gray-700 font-semibold">Standards Not Being Met</h3>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-3 px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <span>Standard</span><span>Performance</span>
              </div>
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {standardsPerformance.filter(item => item.status === "Not met").map(item => (
                  <div key={item.standard} className="flex justify-between gap-3 rounded-lg bg-red-50 px-3 py-2 text-sm">
                    <span className="text-gray-700">{item.standard}: {item.standard_name}</span>
                    <span className="font-semibold text-red-700">{item.performance}%</span>
                  </div>
                ))}
                {!standardsPerformance.some(item => item.status === "Not met") && <p className="py-8 text-center text-sm text-gray-500">No standards below the 80% target.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
