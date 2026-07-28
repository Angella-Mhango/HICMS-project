// frontend/src/pages/ReportsPage.jsx
import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { getComplianceTrends, getFacilityRanking, getMCMDashboardStats } from "../services/mcmApi";
import {
  Activity,
  BarChart3,
  CheckCircle,
  Download,
  FileText,
  MapPin,
  Printer,
  RefreshCw,
  TrendingUp,
  XCircle
} from "lucide-react";

export default function ReportsPage({ user, onLogout }) {
  const [reportType, setReportType] = useState("compliance");
  const [dateRange, setDateRange] = useState("month");
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [facilities, setFacilities] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [stats, setStats] = useState({});
  const [currentAdmin, setCurrentAdmin] = useState(null);
  
  // MCM specific state
  const [mcmTrends, setMcmTrends] = useState([]);
  const [mcmRanking, setMcmRanking] = useState([]);
  const [mcmStats, setMcmStats] = useState(null);

  // Fetch data when component loads
  useEffect(() => {
    fetchCurrentAdmin();
  }, []);

  useEffect(() => {
    if (currentAdmin !== null) {
      fetchFacilities();
      fetchInspections();
      fetchStats();
      fetchMCMData();
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

  const scopeFacilities = (items) => {
    if (!currentAdmin || currentAdmin.level === 'national') return items;
    if (currentAdmin.level === 'regional' && currentAdmin.region) {
      return items.filter(item => item.region_id === currentAdmin.region.id || item.region === currentAdmin.region.name);
    }
    if (currentAdmin.level === 'district' && currentAdmin.district) {
      return items.filter(item => item.district_id === currentAdmin.district.id || item.district === currentAdmin.district.name);
    }
    if (currentAdmin.level === 'facility' && currentAdmin.facility) {
      return items.filter(item => item.id === currentAdmin.facility.id || item.name === currentAdmin.facility.name);
    }
    return [];
  };

  const scopeInspections = (items) => {
    if (!currentAdmin || currentAdmin.level === 'national') return items;
    if (currentAdmin.level === 'regional' && currentAdmin.region) {
      return items.filter(item => item.region_id === currentAdmin.region.id || item.region === currentAdmin.region.name);
    }
    if (currentAdmin.level === 'district' && currentAdmin.district) {
      return items.filter(item => item.district_id === currentAdmin.district.id || item.district === currentAdmin.district.name);
    }
    if (currentAdmin.level === 'facility' && currentAdmin.facility) {
      return items.filter(item => item.facility_id === currentAdmin.facility.id || item.facility_name === currentAdmin.facility.name);
    }
    return [];
  };

  const fetchFacilities = async () => {
    try {
      let url = "http://127.0.0.1:8000/facilities/api/";
      const params = new URLSearchParams();
      
      if (currentAdmin) {
        if (currentAdmin.level === 'regional' && currentAdmin.region) {
          params.append("region_id", currentAdmin.region.id);
        } else if (currentAdmin.level === 'district' && currentAdmin.district) {
          params.append("district_id", currentAdmin.district.id);
        } else if (currentAdmin.level === 'facility' && currentAdmin.facility) {
          params.append("facility_id", currentAdmin.facility.id);
        }
      }
      
      if (params.toString()) {
        url += "?" + params.toString();
      }
      
      const response = await fetch(url, {
        headers: { "Authorization": `Token ${user.token}` }
      });
      
      if (response.ok) {
        let data = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
          data = [];
        }
        setFacilities(scopeFacilities(data));
      } else {
        setFacilities([]);
      }
    } catch (error) {
      console.error("Error fetching facilities:", error);
      setFacilities([]);
    }
  };

  const fetchInspections = async () => {
    try {
      let url = "http://127.0.0.1:8000/inspections/api/filtered/";
      const params = new URLSearchParams();
      
      if (currentAdmin) {
        if (currentAdmin.level === 'regional' && currentAdmin.region) {
          params.append("region_id", currentAdmin.region.id);
        } else if (currentAdmin.level === 'district' && currentAdmin.district) {
          params.append("district_id", currentAdmin.district.id);
        } else if (currentAdmin.level === 'facility' && currentAdmin.facility) {
          params.append("facility_id", currentAdmin.facility.id);
        }
      }
      
      if (params.toString()) {
        url += "?" + params.toString();
      }
      
      console.log("Fetching inspections from:", url);
      
      const response = await fetch(url, {
        headers: { "Authorization": `Token ${user.token}` }
      });
      
      let data = [];
      if (response.ok) {
        data = await response.json();
        if (!Array.isArray(data)) {
          data = [];
        }
      }

      setInspections(scopeInspections(data));
    } catch (error) {
      console.error("Error fetching inspections:", error);
      setInspections([]);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/inspections/dashboard/", {
        headers: { "Authorization": `Token ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchMCMData = async () => {
    try {
      const [trends, ranking, statsData] = await Promise.all([
        getComplianceTrends(),
        getFacilityRanking(),
        getMCMDashboardStats()
      ]);
      setMcmTrends(trends || []);
      setMcmRanking(ranking || []);
      setMcmStats(statsData || null);
    } catch (error) {
      console.error("Error fetching MCM data:", error);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    
    try {
      let data = [];
      
      if (reportType === "compliance") {
        const facilityMap = {};
        inspections.forEach(inspection => {
          if (!facilityMap[inspection.facility_name]) {
            facilityMap[inspection.facility_name] = {
              facility: inspection.facility_name,
              total: 0,
              compliant: 0,
              nonCompliant: 0,
              totalScore: 0
            };
          }
          facilityMap[inspection.facility_name].total++;
          facilityMap[inspection.facility_name].totalScore += inspection.score;
          if (inspection.status === "Compliant") {
            facilityMap[inspection.facility_name].compliant++;
          } else {
            facilityMap[inspection.facility_name].nonCompliant++;
          }
        });
        
        data = Object.values(facilityMap).map(f => ({
          ...f,
          complianceRate: f.total > 0 ? Math.round((f.compliant / f.total) * 100) : 0,
          avgScore: f.total > 0 ? Math.round(f.totalScore / f.total) : 0
        }));
        
      } else if (reportType === "performance") {
        const deptMap = {};
        inspections.forEach(inspection => {
          const key = `${inspection.department} (${inspection.facility_name})`;
          if (!deptMap[key]) {
            deptMap[key] = {
              department: inspection.department,
              facility: inspection.facility_name,
              total: 0,
              totalScore: 0,
              compliant: 0
            };
          }
          deptMap[key].total++;
          deptMap[key].totalScore += inspection.score;
          if (inspection.status === "Compliant") {
            deptMap[key].compliant++;
          }
        });
        
        data = Object.values(deptMap).map(d => ({
          ...d,
          avgScore: d.total > 0 ? Math.round(d.totalScore / d.total) : 0,
          complianceRate: d.total > 0 ? Math.round((d.compliant / d.total) * 100) : 0
        })).sort((a, b) => b.avgScore - a.avgScore);
        
      } else if (reportType === "facility") {
        data = facilities.map(facility => {
          const facilityInspections = inspections.filter(i => i.facility_name === facility.name);
          const totalScore = facilityInspections.reduce((sum, i) => sum + i.score, 0);
          const compliant = facilityInspections.filter(i => i.status === "Compliant").length;
          
          return {
            facility: facility.name,
            type: facility.facility_type || 'N/A',
            district: facility.district || 'N/A',
            region: facility.region || 'N/A',
            totalInspections: facilityInspections.length,
            avgScore: facilityInspections.length > 0 ? Math.round(totalScore / facilityInspections.length) : 0,
            complianceRate: facilityInspections.length > 0 ? Math.round((compliant / facilityInspections.length) * 100) : 0
          };
        }).sort((a, b) => b.avgScore - a.avgScore);
        
      } else if (reportType === "inspector") {
        const inspectorMap = {};
        inspections.forEach(inspection => {
          if (!inspectorMap[inspection.inspector]) {
            inspectorMap[inspection.inspector] = {
              inspector: inspection.inspector,
              total: 0,
              totalScore: 0,
              compliant: 0
            };
          }
          inspectorMap[inspection.inspector].total++;
          inspectorMap[inspection.inspector].totalScore += inspection.score;
          if (inspection.status === "Compliant") {
            inspectorMap[inspection.inspector].compliant++;
          }
        });
        
        data = Object.values(inspectorMap).map(i => ({
          ...i,
          avgScore: i.total > 0 ? Math.round(i.totalScore / i.total) : 0,
          complianceRate: i.total > 0 ? Math.round((i.compliant / i.total) * 100) : 0
        })).sort((a, b) => b.avgScore - a.avgScore);
      }
      
      setReportData(data);
      
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Error generating report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!reportData || reportData.length === 0) {
      alert("No data to export. Please generate a report first.");
      return;
    }
    
    const headers = Object.keys(reportData[0]);
    const csvRows = [];
    csvRows.push(headers.join(","));
    
    for (const row of reportData) {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      });
      csvRows.push(values.join(","));
    }
    
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    if (!reportData || reportData.length === 0) {
      alert("No data to export. Please generate a report first.");
      return;
    }

    const printWindow = window.open('', '_blank');
    const reportTitle = getReportTitle();
    const headers = Object.keys(reportData[0]);
    
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportTitle} - HICMS</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #22c55e; padding-bottom: 10px; }
          .title { color: #166534; font-size: 24px; font-weight: bold; margin: 0; }
          .subtitle { color: #4b5563; font-size: 12px; margin-top: 5px; }
          .date { color: #6b7280; font-size: 11px; text-align: right; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #22c55e; color: white; padding: 10px; text-align: left; font-size: 12px; }
          td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
          tr:nth-child(even) { background-color: #f9fafb; }
          .footer { text-align: center; margin-top: 30px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; }
          .summary { margin-top: 20px; padding: 10px; background-color: #f0fdf4; border-radius: 5px; }
          @media print { body { margin: 0; padding: 15px; } button { display: none; } th { background-color: #22c55e !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">HICMS - Healthcare Inspection System</h1>
          <p class="subtitle">${reportTitle}</p>
        </div>
        <div class="date">Generated: ${new Date().toLocaleString()}</div>
        <table>
          <thead><tr>
    `;
    
    headers.forEach(header => {
      const formattedHeader = header.replace(/([A-Z])/g, ' $1').trim();
      htmlContent += `<th>${formattedHeader}</th>`;
    });
    
    htmlContent += `</tr></thead><tbody>`;
    
    reportData.forEach(row => {
      htmlContent += `<tr>`;
      headers.forEach(header => {
        let value = row[header];
        if (typeof value === 'number' && value.toString().includes('.')) {
          value = value.toFixed(1);
        }
        htmlContent += `<td>${value}</td>`;
      });
      htmlContent += `</tr>`;
    });
    
    htmlContent += `
          </tbody>
        </table>
        <div class="summary">
          <strong>Report Summary:</strong><br>
          Total Records: ${reportData.length}<br>
          Generated from HICMS Compliance Monitoring System
        </div>
        <div class="footer">This report is system-generated from HICMS. For any queries, contact system administrator.</div>
        <div style="text-align: center; margin-top: 20px;">
          <button onclick="window.print(); setTimeout(() => window.close(), 100)" style="background-color: #22c55e; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">Print / Save as PDF</button>
        </div>
        <script>setTimeout(() => { window.print(); }, 500);</script>
      </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const getReportTitle = () => {
    switch(reportType) {
      case "compliance": return "Compliance Report";
      case "performance": return "Department Performance Report";
      case "facility": return "Facility Summary Report";
      case "inspector": return "Inspector Activity Report";
      default: return "Report";
    }
  };

  const getPageSubtitle = () => {
    if (!currentAdmin) return "View and generate reports";
    if (currentAdmin.level === 'regional') {
      return `View and generate reports for ${currentAdmin.region?.name} region`;
    }
    if (currentAdmin.level === 'district') {
      return `View and generate reports for ${currentAdmin.district?.name} district`;
    }
    if (currentAdmin.level === 'facility') {
      return `View and generate reports for ${currentAdmin.facility?.name}`;
    }
    return "View and generate reports";
  };

  if (!currentAdmin && loading) {
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
        <div className="flex items-center gap-3">
          <FileText className="w-7 h-7 text-green-600" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-700">Reports</h1>
            <p className="text-sm text-gray-500 mt-1">{getPageSubtitle()}</p>
          </div>
        </div>
        <button
          onClick={() => {
            fetchInspections();
            fetchFacilities();
          }}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Scope Indicator */}
      {currentAdmin && currentAdmin.level !== 'national' && (
        <div className="mb-4 bg-green-50 rounded-lg p-3 border border-green-200 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-green-600" />
          <p className="text-sm text-green-800">
            <span className="font-semibold">Current scope:</span> Showing reports for your {currentAdmin.level} scope
          </p>
        </div>
      )}

      {/* MCM Compliance Overview Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-700">Compliance Overview</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-green-500" />
              <p className="text-xs text-gray-500">Total Inspections</p>
            </div>
            <p className="text-xl font-bold text-green-600">{inspections.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <p className="text-xs text-gray-500">Compliance Rate</p>
            </div>
            <p className="text-xl font-bold text-green-600">
              {inspections.length > 0 ? Math.round((inspections.filter(i => i.status === "Compliant").length / inspections.length) * 100) : 0}%
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-green-500" />
              <p className="text-xs text-gray-500">Average Score</p>
            </div>
            <p className="text-xl font-bold text-green-600">
              {inspections.length > 0 ? Math.round(inspections.reduce((sum, i) => sum + i.score, 0) / inspections.length) : 0}%
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-red-500" />
              <p className="text-xs text-gray-500">Non-Compliant</p>
            </div>
            <p className="text-xl font-bold text-red-600">{inspections.filter(i => i.status === "Non-compliant").length}</p>
          </div>
        </div>
      </div>

      {/* Report Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
            >
              <option value="compliance">Compliance Report</option>
              <option value="performance">Department Performance Report</option>
              <option value="facility">Facility Summary Report</option>
              <option value="inspector">Inspector Activity Report</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
            >
              <option value="all">All Time</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last 3 Months</option>
              <option value="year">Last 12 Months</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={generateReport}
              disabled={loading}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {loading ? "Generating..." : "Generate Report"}
            </button>
          </div>
        </div>

        {reportData && reportData.length > 0 && (
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button onClick={exportToCSV} className="bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800 transition flex items-center gap-2">
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button onClick={exportToPDF} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2">
              <Printer className="w-4 h-4" />
              PDF
            </button>
          </div>
        )}
      </div>

      {/* Report Preview Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-700">{getReportTitle()}</h3>
          </div>
          <p className="text-sm text-gray-500 mt-1">Generated on: {new Date().toLocaleString()}</p>
        </div>
        
        <div className="p-6">
          {!reportData ? (
            <div className="text-center py-12">
              <BarChart3 className="w-14 h-14 text-green-500 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No report generated yet</p>
              <p className="text-sm text-gray-400">Select a report type and click "Generate Report"</p>
            </div>
          ) : reportData.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No data available for this report in your scope</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    {Object.keys(reportData[0]).map((key) => (
                      <th key={key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reportData.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition">
                      {Object.values(row).map((value, i) => (
                        <td key={i} className="px-4 py-3 text-sm text-gray-700">
                          {typeof value === 'number' && value.toString().includes('.') ? value.toFixed(1) : value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
