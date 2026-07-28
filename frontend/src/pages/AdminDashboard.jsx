// frontend/src/pages/AdminDashboard.jsx
import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import HierarchyFilter from "../components/HierarchyFilter";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import {
  LayoutDashboard,
  Users,
  Building2,
  CheckCircle,
  XCircle,
  TrendingUp,
  Calendar,
  Filter,
  RefreshCw,
  MapPin,
  Clock,
  Award,
  AlertCircle,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Globe,
  UserCheck,
  FileText
} from "lucide-react";
import { showToast } from "../components/Toast";

const API_BASE = "http://127.0.0.1:8000";

export default function AdminDashboard({ user, onLogout }) {

   console.log("🚀 AdminDashboard RENDERED for user:", user?.username, "role:", user?.role);
   
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [chartData, setChartData] = useState([]);
  const [complianceTrends, setComplianceTrends] = useState([]);
  const [totalFacilities, setTotalFacilities] = useState(0);
  const [activeInspectors, setActiveInspectors] = useState(0);
  const [thisMonthInspections, setThisMonthInspections] = useState(0);
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
    if (!loading && (chartData.length > 0 || complianceTrends.length > 0)) {
      setChartsReady(true);
    }
  }, [loading, chartData, complianceTrends]);

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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-green-500" />
                <p className="text-xs text-gray-500">Total Inspections</p>
              </div>
              <p className="text-xl font-bold text-green-600">{stats.total_inspections || 0}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <p className="text-xs text-gray-500">Compliant</p>
              </div>
              <p className="text-xl font-bold text-green-600">{stats.compliant || 0}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-red-500" />
                <p className="text-xs text-gray-500">Non-Compliant</p>
              </div>
              <p className="text-xl font-bold text-red-600">{stats.non_compliant || 0}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <p className="text-xs text-gray-500">Compliance Rate</p>
              </div>
              <p className="text-xl font-bold text-green-600">{stats.compliance_rate || 0}%</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-green-500" />
                <p className="text-xs text-gray-500">Avg Score</p>
              </div>
              <p className="text-xl font-bold text-green-600">{stats.average_score || 0}%</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-gray-600" />
                <h3 className="text-gray-600 font-semibold">Inspection Trends</h3>
              </div>
              <div className="h-[250px] min-h-[200px] w-full">
                {chartsReady && chartData && chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <XAxis dataKey="month" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="inspections" fill="#22c55e" />
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
                <h3 className="text-gray-600 font-semibold">Compliance Rate Trend</h3>
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

          {/* Compliance Distribution and Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-4 justify-center">
                <PieChartIcon className="w-5 h-5 text-gray-600" />
                <h3 className="text-gray-600 font-semibold">Compliance Distribution</h3>
              </div>
              <div className="h-[250px] min-h-[200px] w-full">
                {chartsReady && (stats.compliant > 0 || stats.non_compliant > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Compliant", value: stats.compliant || 0 },
                          { name: "Non-Compliant", value: stats.non_compliant || 0 }
                        ]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                      >
                        <Cell fill="#22c55e" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 text-center">No data available</p>
                  </div>
                )}
              </div>
              <div className="flex justify-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-gray-600">Compliant: {stats.compliant || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-xs text-gray-600">Non-Compliant: {stats.non_compliant || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-gray-700" />
                <h3 className="text-gray-700 font-semibold">System Summary</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Total Facilities in View
                  </span>
                  <span className="text-lg font-bold text-gray-800">{totalFacilities || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Active Inspectors
                  </span>
                  <span className="text-lg font-bold text-gray-800">{activeInspectors || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    This Month's Inspections
                  </span>
                  <span className="text-lg font-bold text-gray-800">{thisMonthInspections || 0}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Award className="w-4 h-4 text-yellow-500" />
                    Overall Grade
                  </span>
                  <span className={`text-lg font-bold ${
                    (stats.compliance_rate || 0) >= 80 ? "text-green-600" :
                    (stats.compliance_rate || 0) >= 60 ? "text-yellow-600" : "text-red-600"
                  }`}>
                    {(stats.compliance_rate || 0) >= 80 ? "A - Excellent" :
                     (stats.compliance_rate || 0) >= 60 ? "B - Good" : "C - Needs Improvement"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}