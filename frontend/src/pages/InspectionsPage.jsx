// frontend/src/pages/InspectionsPage.jsx
import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useNavigate } from "react-router-dom";
import InspectionStepper from "../components/InspectionStepper";
import ManageStandardsModal from "../components/ManageStandardsModal";
import PreInspectionForm from "../components/PreInspectionForm";
import { showToast } from "../components/Toast";
import {
  RefreshCw,
  Pencil,
  FileText,
  Filter,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Calendar,
  Building2,
  User,
  CheckCircle,
  XCircle,
  TrendingUp,
  Plus,
  Eye,
  Clock,
  MapPin,
  AlertCircle
} from "lucide-react";

export default function InspectionsPage({ user, onLogout }) {
  const [inspections, setInspections] = useState([]);
  const [preInspections, setPreInspections] = useState({});
  const [loading, setLoading] = useState(true);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [showManageStandardsModal, setShowManageStandardsModal] = useState(false);
  const [showPreInspectionModal, setShowPreInspectionModal] = useState(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState(null);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [showComparison, setShowComparison] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filter and grouping states
  const [groupBy, setGroupBy] = useState("month");
  const [expandedGroups, setExpandedGroups] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFacility, setFilterFacility] = useState("all");
  const [filterInspector, setFilterInspector] = useState("all");
  const [filterDateRange, setFilterDateRange] = useState("all");
  const [dateRangeStart, setDateRangeStart] = useState("");
  const [dateRangeEnd, setDateRangeEnd] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  const [stats, setStats] = useState({
    total: 0,
    compliant: 0,
    nonCompliant: 0,
    avgScore: 0
  });

  useEffect(() => {
    fetchCurrentAdmin();
  }, []);

  useEffect(() => {
    if (currentAdmin !== null) {
      fetchInspections();
      fetchPreInspections();
    }
  }, [currentAdmin]);

  const fetchCurrentAdmin = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/hierarchy/my-admin-info/", {
        headers: { "Authorization": `Token ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentAdmin(data);
        console.log("Current Admin:", data);
      } else {
        setCurrentAdmin(null);
      }
    } catch (error) {
      console.error("Error fetching current admin:", error);
      setCurrentAdmin(null);
    }
  };

  const fetchPreInspections = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/inspections/pre-inspection/list/", {
        headers: { "Authorization": `Token ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const indexed = {};
        data.forEach(pi => {
          const key = `${pi.facility_id}-${pi.department_id || 'general'}`;
          indexed[key] = pi;
        });
        setPreInspections(indexed);
      }
    } catch (error) {
      console.error("Error fetching pre-inspections:", error);
    }
  };

  const fetchInspections = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = "http://127.0.0.1:8000/inspections/api/";
      
      // Add filters based on admin level
      if (currentAdmin) {
        const params = new URLSearchParams();
        if (currentAdmin.level === 'regional' && currentAdmin.region) {
          params.append("region_id", currentAdmin.region.id);
        } else if (currentAdmin.level === 'district' && currentAdmin.district) {
          params.append("district_id", currentAdmin.district.id);
        } else if (currentAdmin.level === 'facility' && currentAdmin.facility) {
          params.append("facility_id", currentAdmin.facility.id);
        }
        
        if (params.toString()) {
          url += "?" + params.toString();
        }
      }
      
      console.log("📡 Fetching inspections from:", url);
      
      const response = await fetch(url, {
        headers: { "Authorization": `Token ${user.token}` }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("✅ Inspections loaded:", data.length);
      
      // Ensure we have an array
      const inspectionsData = Array.isArray(data) ? data : [];
      setInspections(inspectionsData);
      
      // Calculate stats from actual data
      const total = inspectionsData.length;
      const compliant = inspectionsData.filter(i => 
        i.status === 'Compliant' || i.status === 'compliant'
      ).length;
      const nonCompliant = total - compliant;
      const avgScore = total > 0 
        ? Math.round(inspectionsData.reduce((sum, i) => sum + (i.score || 0), 0) / total) 
        : 0;
      
      setStats({ total, compliant, nonCompliant, avgScore });
      
      if (total === 0) {
        console.log("ℹ️ No inspections found in the database");
        // Don't show toast here - it will show in the UI
      }
      
    } catch (error) {
      console.error("❌ Error fetching inspections:", error);
      setError("Failed to load inspections from database");
      showToast("Failed to load inspections", "error");
      setInspections([]);
      setStats({ total: 0, compliant: 0, nonCompliant: 0, avgScore: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    Promise.all([fetchInspections(), fetchPreInspections()])
      .finally(() => {
        setRefreshing(false);
        setCurrentPage(1);
        showToast("Data refreshed", "success");
      });
  };

  const getPreInspection = (facilityId, departmentId) => {
    const key = `${facilityId}-${departmentId || 'general'}`;
    return preInspections[key] || null;
  };

  const groupInspections = (inspectionsList) => {
    const groups = {};
    
    inspectionsList.forEach(inspection => {
      let key;
      switch(groupBy) {
        case "month": {
          const date = new Date(inspection.date);
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        }
        case "facility":
          key = inspection.facility_name;
          break;
        case "status":
          key = inspection.status;
          break;
        case "department":
          key = inspection.department;
          break;
        default:
          key = "All";
      }
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(inspection);
    });
    
    return groups;
  };

  const getFilteredInspections = () => {
    let filtered = [...inspections];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(i => 
        i.facility_name?.toLowerCase().includes(term) ||
        i.department?.toLowerCase().includes(term) ||
        i.inspector?.toLowerCase().includes(term) ||
        i.status?.toLowerCase().includes(term)
      );
    }
    
    if (filterStatus !== "all") {
      filtered = filtered.filter(i => i.status?.toLowerCase() === filterStatus.toLowerCase());
    }
    
    if (filterFacility !== "all") {
      filtered = filtered.filter(i => i.facility_name === filterFacility);
    }
    
    if (filterInspector !== "all") {
      filtered = filtered.filter(i => i.inspector === filterInspector);
    }
    
    if (filterDateRange === "today") {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(i => i.date === today);
    } else if (filterDateRange === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(i => new Date(i.date) >= weekAgo);
    } else if (filterDateRange === "month") {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filtered = filtered.filter(i => new Date(i.date) >= monthAgo);
    } else if (filterDateRange === "quarter") {
      const quarterAgo = new Date();
      quarterAgo.setMonth(quarterAgo.getMonth() - 3);
      filtered = filtered.filter(i => new Date(i.date) >= quarterAgo);
    } else if (filterDateRange === "custom" && dateRangeStart && dateRangeEnd) {
      filtered = filtered.filter(i => i.date >= dateRangeStart && i.date <= dateRangeEnd);
    }
    
    return filtered;
  };

  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const getUniqueFacilities = () => {
    const facilities = new Set();
    inspections.forEach(i => facilities.add(i.facility_name));
    return Array.from(facilities);
  };

  const getUniqueInspectors = () => {
    const inspectors = new Set();
    inspections.forEach(i => inspectors.add(i.inspector));
    return Array.from(inspectors);
  };

  const getPaginatedItems = (items) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  };

  const totalPages = (totalItems) => Math.ceil(totalItems / itemsPerPage);

  // Check if user is National Admin
  const isNationalAdmin = () => {
    return currentAdmin?.level === 'national' || user?.role === 'national_admin';
  };

  // Check if user can manage standards (only National Admin)
  const canManageStandards = () => {
    return isNationalAdmin();
  };

  // Check if user can create inspections (National Admin or Inspectors)
  const canCreateInspection = () => {
    return isNationalAdmin() || 
           user?.role === 'inspector' || 
           user?.role === 'national_inspector';
  };

  // Check if user can do pre-inspections
  const canPreInspect = () => {
    return isNationalAdmin() || 
           user?.role === 'inspector' || 
           user?.role === 'national_inspector' || 
           user?.role === 'admin';
  };

  const getPageTitle = () => {
    if (!currentAdmin) return "Inspections";
    if (currentAdmin.level === 'regional') {
      return `Inspections - ${currentAdmin.region?.name || 'Region'}`;
    }
    if (currentAdmin.level === 'district') {
      return `Inspections - ${currentAdmin.district?.name || 'District'}`;
    }
    if (currentAdmin.level === 'facility') {
      return `Inspections - ${currentAdmin.facility?.name || 'Facility'}`;
    }
    return "Inspections - All Facilities";
  };

  const getGroupDisplayName = (key) => {
    if (groupBy === "month") {
      const [year, month] = key.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return key;
  };

  const getStatusBadge = (status) => {
    const statusLower = status?.toLowerCase();
    if (statusLower === "compliant") {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Compliant</span>;
    }
    if (statusLower === "non-compliant") {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Non-Compliant</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">{status || 'N/A'}</span>;
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const filteredData = getFilteredInspections();
  const groupedData = groupInspections(filteredData);
  const groupKeys = Object.keys(groupedData);
  
  if (groupBy === "month") {
    groupKeys.sort((a, b) => b.localeCompare(a));
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

  return (
    <Layout user={user} onLogout={onLogout}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-700 flex items-center gap-2">
            <FileText className="w-6 h-6 text-green-600" />
            {getPageTitle()}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isNationalAdmin() && "View and manage all inspections across the country"}
            {currentAdmin?.level === 'regional' && `View inspections in ${currentAdmin.region?.name} region`}
            {currentAdmin?.level === 'district' && `View inspections in ${currentAdmin.district?.name} district`}
            {currentAdmin?.level === 'facility' && `View inspections at ${currentAdmin.facility?.name}`}
            {!currentAdmin && "View all inspections across facilities"}
          </p>
          <div className="mt-2 text-sm text-gray-400">
            {inspections.length === 0 ? (
              <span className="text-yellow-600">ℹ️ No inspections found in the database</span>
            ) : (
              <span>{inspections.length} inspection{inspections.length !== 1 ? 's' : ''} found</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition flex items-center gap-2 ${
              refreshing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          
         
          
          {canManageStandards() && (
            <button 
              onClick={() => setShowManageStandardsModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <Pencil className="w-4 h-4" />
              Edit Standards
            </button>
          )}
          
          {canCreateInspection() && (
            <button 
              onClick={() => setShowInspectionModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Inspection
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
            onClick={fetchInspections}
            className="ml-auto px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-green-600" />
            <p className="text-sm text-gray-500">Total</p>
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <p className="text-sm text-gray-500">Compliant</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.compliant}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-red-500" />
            <p className="text-sm text-gray-500">Non-Compliant</p>
          </div>
          <p className="text-2xl font-bold text-red-500">{stats.nonCompliant}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <p className="text-sm text-gray-500">Avg Score</p>
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.avgScore}%</p>
        </div>
      </div>

      {/* Filter and Group Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search inspections..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <select
            value={groupBy}
            onChange={(e) => {
              setGroupBy(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm bg-white"
          >
            <option value="month">Group by Month</option>
            <option value="facility">Group by Facility</option>
            <option value="status">Group by Status</option>
            <option value="department">Group by Department</option>
          </select>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            <Filter className="w-4 h-4" />
            Filters {showFilters ? '▲' : '▼'}
          </button>
          
          <button
            onClick={() => setShowComparison(!showComparison)}
            className={`px-4 py-2 text-sm rounded-lg transition flex items-center gap-2 ${
              showComparison 
                ? 'bg-green-50 text-green-700 border border-green-300' 
                : 'bg-gray-100 text-gray-500 border border-gray-300'
            }`}
          >
            <Eye className="w-4 h-4" />
            {showComparison ? 'Hide Pre-Inspection' : 'Show Pre-Inspection'}
          </button>
        </div>
        
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="Compliant">Compliant</option>
                <option value="Non-compliant">Non-Compliant</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Facility</label>
              <select
                value={filterFacility}
                onChange={(e) => {
                  setFilterFacility(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm bg-white"
              >
                <option value="all">All Facilities</option>
                {getUniqueFacilities().map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Inspector</label>
              <select
                value={filterInspector}
                onChange={(e) => {
                  setFilterInspector(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm bg-white"
              >
                <option value="all">All Inspectors</option>
                {getUniqueInspectors().map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <select
                value={filterDateRange}
                onChange={(e) => {
                  setFilterDateRange(e.target.value);
                  setCurrentPage(1);
                  if (e.target.value !== "custom") {
                    setDateRangeStart("");
                    setDateRangeEnd("");
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm bg-white"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">Last 3 Months</option>
                <option value="custom">Custom Range</option>
              </select>
              {filterDateRange === "custom" && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="date"
                    value={dateRangeStart}
                    onChange={(e) => setDateRangeStart(e.target.value)}
                    className="flex-1 px-3 py-1 border border-gray-300 rounded-lg text-sm"
                  />
                  <span className="text-gray-500 text-sm">to</span>
                  <input
                    type="date"
                    value={dateRangeEnd}
                    onChange={(e) => setDateRangeEnd(e.target.value)}
                    className="flex-1 px-3 py-1 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="mt-3 text-sm text-gray-500">
          Showing {filteredData.length} inspection{filteredData.length !== 1 ? 's' : ''}
          {searchTerm && ` matching "${searchTerm}"`}
        </div>
      </div>

      {/* Grouped Inspections List */}
      <div className="space-y-4">
        {groupKeys.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-lg font-medium text-gray-500">No inspections found</p>
            <p className="text-sm text-gray-400 mt-1">
              {isNationalAdmin() 
                ? "No inspections have been created yet. Click 'New Inspection' to create one." 
                : "Try adjusting your filters or contact your administrator"}
            </p>
            {canCreateInspection() && (
              <button 
                onClick={() => setShowInspectionModal(true)}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create First Inspection
              </button>
            )}
          </div>
        ) : (
          groupKeys.map((groupKey) => {
            const items = groupedData[groupKey];
            const isExpanded = expandedGroups[groupKey] !== false;
            const displayName = getGroupDisplayName(groupKey);
            
            return (
              <div key={groupKey} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div 
                  className="flex items-center justify-between px-6 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition"
                  onClick={() => toggleGroup(groupKey)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">{items.length}</span>
                    <h3 className="font-medium text-gray-700">{displayName}</h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-400">{items.length} inspections</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr className="border-b border-gray-200">
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Facility</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inspector</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          {showComparison && (
                            <th className="px-6 py-3 text-left text-xs font-medium text-green-600 uppercase">Pre-Inspection</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {getPaginatedItems(items).map((i) => {
                          const preInspection = getPreInspection(i.facility_id, i.department_id);
                          const hasPreInspection = preInspection && preInspection.score !== undefined;
                          const preScore = hasPreInspection ? preInspection.score : null;
                          const gap = preScore !== null ? i.score - preScore : null;
                          
                          return (
                            <tr key={i.id} className="hover:bg-gray-50 transition">
                              <td className="px-6 py-4 text-sm text-gray-700">{i.facility_name}</td>
                              <td className="px-6 py-4 text-sm text-gray-500">{i.department}</td>
                              <td className="px-6 py-4 text-sm text-gray-500">{i.inspector}</td>
                              <td className={`px-6 py-4 text-sm font-medium ${getScoreColor(i.score)}`}>
                                {i.score}%
                              </td>
                              <td className="px-6 py-4">
                                {getStatusBadge(i.status)}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {i.date?.split('T')[0] || i.date || 'N/A'}
                              </td>
                              {showComparison && (
                                <td className="px-6 py-4">
                                  {hasPreInspection ? (
                                    <div className="flex flex-col">
                                      <span className={`text-sm font-medium ${getScoreColor(preScore)}`}>
                                        {preScore}%
                                      </span>
                                      {gap !== null && (
                                        <span className={`text-xs ${
                                          gap > 10 ? "text-red-500" :
                                          gap < -10 ? "text-green-600" :
                                          "text-yellow-500"
                                        }`}>
                                          {gap > 0 ? '▲' : '▼'} {Math.abs(Math.round(gap))}%
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-400">—</span>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    
                    {items.length > itemsPerPage && (
                      <div className="px-6 py-3 border-t border-gray-200 flex justify-between items-center">
                        <span className="text-sm text-gray-500">
                          {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, items.length)} of {items.length}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 text-sm"
                          >
                            Previous
                          </button>
                          <span className="px-3 py-1 text-sm text-gray-500">
                            Page {currentPage} of {totalPages(items.length)}
                          </span>
                          <button
                            onClick={() => setCurrentPage(Math.min(totalPages(items.length), currentPage + 1))}
                            disabled={currentPage === totalPages(items.length)}
                            className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 text-sm"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      {showInspectionModal && (
        <InspectionStepper
          user={user}
          onSubmitted={() => {
            handleRefresh();
          }}
          onComplete={() => {
            handleRefresh();
            setShowInspectionModal(false);
          }}
          onClose={() => {
            setShowInspectionModal(false);
            setSelectedFacilityId(null);
          }}
          
        />
      )}

      {showPreInspectionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-2xl shadow-xl w-[900px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
            <PreInspectionForm
              user={user}
              facilityId={selectedFacilityId}
              onComplete={(data) => {
                handleRefresh();
                setShowPreInspectionModal(false);
              }}
              onClose={() => setShowPreInspectionModal(false)}
            />
          </div>
        </div>
      )}

      {showManageStandardsModal && (
        <ManageStandardsModal
          user={user}
          onClose={() => setShowManageStandardsModal(false)}
          onStandardsUpdated={handleRefresh}
        />
      )}
    </Layout>
  );
}
