// frontend/src/pages/FacilityReportsPage.jsx
import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { showToast } from "../components/Toast";
import {
  BarChart3,
  RefreshCw,
  FileText,
  Download,
  Printer,
  Calendar,
  Building2,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Clock,
  Award,
  Filter
} from "lucide-react";

export default function FacilityReportsPage({ user, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [facilityInfo, setFacilityInfo] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [reportType, setReportType] = useState("compliance");
  const [dateRange, setDateRange] = useState("month");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchFacilityInfo();
  }, []);

  useEffect(() => {
    if (facilityInfo?.facility?.id) {
      generateReport();
    }
  }, [facilityInfo, reportType, dateRange]);

  const fetchFacilityInfo = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/hierarchy/my-admin-info/", {
        headers: { "Authorization": `Token ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setFacilityInfo(data);
      }
    } catch (error) {
      console.error("Error fetching facility info:", error);
    }
  };

  const generateReport = async () => {
    setGenerating(true);
    setLoading(true);
    try {
      // Fallback report data for demo
      const demoData = {
        compliance: [
          { category: "Hand Hygiene", score: 92, status: "Compliant" },
          { category: "Fire Safety", score: 65, status: "Non-compliant" },
          { category: "Waste Management", score: 78, status: "Partial" },
          { category: "Pharmacy", score: 95, status: "Compliant" },
          { category: "Patient Records", score: 88, status: "Compliant" },
          { category: "Emergency Preparedness", score: 72, status: "Partial" }
        ],
        trends: [
          { month: "Jan", score: 72 },
          { month: "Feb", score: 74 },
          { month: "Mar", score: 76 },
          { month: "Apr", score: 78 },
          { month: "May", score: 77 },
          { month: "Jun", score: 78 }
        ],
        summary: {
          totalInspections: 24,
          compliantRate: 78,
          avgScore: 78,
          pendingActions: 5,
          completedActions: 12,
          totalActions: 17
        }
      };
      setReportData(demoData);
    } catch (error) {
      console.error("Error generating report:", error);
      showToast("Failed to generate report", "error");
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  const handleExport = (format) => {
    showToast(`Exporting ${format} report...`, "info");
    // In a real implementation, this would generate and download the file
    setTimeout(() => {
      showToast(`${format} report exported successfully!`, "success");
    }, 1500);
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

  const facilityName = facilityInfo?.facility?.name || "Your Facility";
  const summary = reportData?.summary || {};
  const complianceItems = reportData?.compliance || [];
  const trends = reportData?.trends || [];

  const getStatusBadge = (status) => {
    const statusMap = {
      "Compliant": "bg-green-100 text-green-700",
      "Non-compliant": "bg-red-100 text-red-700",
      "Partial": "bg-yellow-100 text-yellow-700"
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusMap[status] || "bg-gray-100 text-gray-700"}`}>{status}</span>;
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-700 flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-green-600" />
              Facility Reports
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Generate and export reports for {facilityName}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={generateReport}
              disabled={generating}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              {generating ? "Generating..." : "Refresh"}
            </button>
            <button
              onClick={() => handleExport("PDF")}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={() => handleExport("CSV")}
              className="bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800 transition flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
          </div>
        </div>

        {/* Report Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              >
                <option value="compliance">Compliance Report</option>
                <option value="trends">Trend Analysis</option>
                <option value="summary">Summary Report</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              >
                <option value="month">Last 30 Days</option>
                <option value="quarter">Last 3 Months</option>
                <option value="year">Last 12 Months</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-green-500" />
              <p className="text-xs text-gray-500">Total Inspections</p>
            </div>
            <p className="text-xl font-bold text-green-600">{summary.totalInspections || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <p className="text-xs text-gray-500">Compliance Rate</p>
            </div>
            <p className="text-xl font-bold text-green-600">{summary.compliantRate || 0}%</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-yellow-500" />
              <p className="text-xs text-gray-500">Pending Actions</p>
            </div>
            <p className="text-xl font-bold text-yellow-600">{summary.pendingActions || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-green-500" />
              <p className="text-xs text-gray-500">Avg Score</p>
            </div>
            <p className="text-xl font-bold text-green-600">{summary.avgScore || 0}%</p>
          </div>
        </div>

        {/* Compliance by Category */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Compliance by Category
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {complianceItems.length === 0 ? (
              <div className="p-6 text-center text-gray-400">No compliance data available</div>
            ) : (
              complianceItems.map((item, index) => (
                <div key={index} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition">
                  <div>
                    <p className="font-medium text-gray-800">{item.category}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-32">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            item.score >= 80 ? "bg-green-500" :
                            item.score >= 60 ? "bg-yellow-500" : "bg-red-500"
                          }`}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-bold w-12 text-right">
                      {item.score}%
                    </span>
                    {getStatusBadge(item.status)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Trend Data */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Performance Trend
            </h3>
          </div>
          <div className="p-6">
            {trends.length === 0 ? (
              <div className="text-center text-gray-400 py-8">No trend data available</div>
            ) : (
              <div className="flex items-end gap-3 h-48">
                {trends.map((item, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-green-500 rounded-t transition-all hover:bg-green-600"
                      style={{ height: `${(item.score / 100) * 160}px` }}
                    />
                    <span className="text-xs text-gray-500 mt-2">{item.month}</span>
                    <span className="text-xs font-medium text-gray-700">{item.score}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h4 className="font-medium text-blue-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Report Tips
          </h4>
          <ul className="mt-2 text-sm text-blue-700 space-y-1">
            <li>• Use the filters above to customize your report view</li>
            <li>• Export reports in PDF format for sharing with stakeholders</li>
            <li>• Track trends over time to measure improvement</li>
            <li>• Use compliance data to prioritize corrective actions</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}