// frontend/src/App.jsx
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import InspectorDashboard from "./pages/InspectorDashboard";
import SupervisorDashboard from "./pages/SupervisorDashboard";
import UserManagement from "./pages/UserManagement";
import FacilitiesPage from "./pages/FacilitiesPage";
import ReportsPage from "./pages/ReportsPage";
import MCMInspection from "./components/MCMInspection";
import AlertsPage from "./pages/AlertsPage";
import InspectionTablePage from "./pages/InspectionTablePage";
import ManageInspectionsPage from "./pages/ManageInspectionsPage";
import MyInspections from "./pages/MyInspections";
import Rankings from "./pages/Rankings";
import AdministrationPage from "./pages/AdministrationPage";
import ComplianceMonitoring from "./pages/ComplianceMonitoring";
import GanttChartPage from "./pages/GanttChartPage";
import ToastContainer from "./components/ToastContainer";

// New Facility QA Pages
import InspectionPlanningPage from "./pages/InspectionPlanningPage";
import NationalSchedulePage from "./pages/NationalSchedulePage";
import PreInspectionPage from "./pages/PreInspectionPage";

function App() {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    const role = localStorage.getItem("role");
    return token ? { token, username, role } : null;
  });

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    setUser(null);
  };

  if (!user) {
    return <LoginPage setUser={setUser} />;
  }

  // Normalize role for comparison
  const role = user.role?.toLowerCase() || '';

  // Get the appropriate dashboard route based on role
  const getDashboardRoute = () => {
    switch(role) {
      case "national_admin":
      case "regional_admin":
      case "district_admin":
      case "facility_admin":
      case "admin":
        return "/dashboard";
      case "national_inspector":
      case "inspector":
        return "/inspector-dashboard";
      case "district_supervisor":
      case "supervisor":
        return "/supervisor-dashboard";
      case "facility_qa":
        return "/qa-dashboard";
      default:
        return "/dashboard";
    }
  };

  // Check if user is an admin type
  const isAdmin = ["national_admin", "regional_admin", "district_admin", "facility_admin", "admin"].includes(role);
  
  // Check if user is an inspector type
  const isInspector = ["inspector", "national_inspector"].includes(role);
  
  // Check if user is a supervisor type
  const isSupervisor = ["supervisor", "district_supervisor"].includes(role);
  
  // Check if user is facility QA
  const isFacilityQA = role === "facility_qa";

  return (
    <BrowserRouter>
      <Routes>
        {/* ADMIN ROUTES - National, Regional, District, Facility Admin */}
        {isAdmin && (
          <>
            <Route path="/" element={<AdminDashboard user={user} onLogout={handleLogout} />} />
            <Route path="/dashboard" element={<AdminDashboard user={user} onLogout={handleLogout} />} />
            <Route path="/users" element={<UserManagement user={user} onLogout={handleLogout} />} />
            <Route path="/facilities" element={<FacilitiesPage user={user} onLogout={handleLogout} />} />
            <Route path="/reports" element={<ReportsPage user={user} onLogout={handleLogout} />} />
            <Route path="/alerts" element={<AlertsPage user={user} onLogout={handleLogout} />} />
            <Route path="/administration" element={<AdministrationPage user={user} onLogout={handleLogout} />} />
            <Route path="/inspections" element={<InspectionTablePage user={user} onLogout={handleLogout} />} />
            <Route path="/manage-inspections" element={<ManageInspectionsPage user={user} onLogout={handleLogout} />} />
            <Route path="/mcm-inspection" element={<MCMInspection user={user} onLogout={handleLogout} />} />
            <Route path="/compliance" element={<ComplianceMonitoring user={user} onLogout={handleLogout} />} />
            <Route path="/compliance-monitoring" element={<ComplianceMonitoring user={user} onLogout={handleLogout} />} />
            <Route path="/hierarchy" element={<UserManagement user={user} onLogout={handleLogout} />} />
            <Route path="/gantt-chart" element={<GanttChartPage user={user} onLogout={handleLogout} />} />
          </>
        )}

        {/* INSPECTOR ROUTES - Both inspector and national_inspector */}
        {isInspector && (
          <>
            <Route path="/" element={<InspectorDashboard user={user} onLogout={handleLogout} />} />
            <Route path="/dashboard" element={<InspectorDashboard user={user} onLogout={handleLogout} />} />
            <Route path="/inspector-dashboard" element={<InspectorDashboard user={user} onLogout={handleLogout} />} />
            <Route path="/mcm-inspection" element={<MCMInspection user={user} onLogout={handleLogout} />} />
            <Route path="/my-inspections" element={<MyInspections user={user} onLogout={handleLogout} />} />
            <Route path="/facilities" element={<FacilitiesPage user={user} onLogout={handleLogout} />} />
            <Route path="/alerts" element={<AlertsPage user={user} onLogout={handleLogout} />} />
            <Route path="/reports" element={<ReportsPage user={user} onLogout={handleLogout} />} />
            <Route path="/inspections" element={<InspectionTablePage user={user} onLogout={handleLogout} />} />
            <Route path="/compliance" element={<ComplianceMonitoring user={user} onLogout={handleLogout} />} />
            <Route path="/gantt-chart" element={<GanttChartPage user={user} onLogout={handleLogout} />} />
          </>
        )}

        {/* SUPERVISOR ROUTES - Both supervisor and district_supervisor */}
        {isSupervisor && (
          <>
            <Route path="/" element={<SupervisorDashboard user={user} onLogout={handleLogout} />} />
            <Route path="/dashboard" element={<SupervisorDashboard user={user} onLogout={handleLogout} />} />
            <Route path="/supervisor-dashboard" element={<SupervisorDashboard user={user} onLogout={handleLogout} />} />
            <Route path="/compliance" element={<ComplianceMonitoring user={user} onLogout={handleLogout} />} />
            <Route path="/rankings" element={<Rankings user={user} onLogout={handleLogout} />} />
            <Route path="/reports" element={<ReportsPage user={user} onLogout={handleLogout} />} />
            <Route path="/facilities" element={<FacilitiesPage user={user} onLogout={handleLogout} />} />
            <Route path="/alerts" element={<AlertsPage user={user} onLogout={handleLogout} />} />
            <Route path="/inspections" element={<InspectionTablePage user={user} onLogout={handleLogout} />} />
          </>
        )}

        {/* FACILITY QA ROUTES */}
        {isFacilityQA && (
          <>
            <Route path="/" element={<AdminDashboard user={user} onLogout={handleLogout} />} />
            <Route path="/dashboard" element={<AdminDashboard user={user} onLogout={handleLogout} />} />
            <Route path="/qa-dashboard" element={<AdminDashboard user={user} onLogout={handleLogout} />} />
            <Route path="/inspection-planning" element={<InspectionPlanningPage user={user} onLogout={handleLogout} />} />
            <Route path="/pre-inspection" element={<PreInspectionPage user={user} onLogout={handleLogout} />} />
            <Route path="/inspection-reports" element={<ReportsPage user={user} onLogout={handleLogout} />} />
            <Route path="/corrective-actions" element={<ComplianceMonitoring user={user} onLogout={handleLogout} />} />
            <Route path="/compliance" element={<ComplianceMonitoring user={user} onLogout={handleLogout} />} />
            <Route path="/national-schedule" element={<NationalSchedulePage user={user} onLogout={handleLogout} />} />
            <Route path="/reports" element={<ReportsPage user={user} onLogout={handleLogout} />} />
            <Route path="/alerts" element={<AlertsPage user={user} onLogout={handleLogout} />} />
            <Route path="/facilities" element={<FacilitiesPage user={user} onLogout={handleLogout} />} />
          </>
        )}

        {/* Fallback route - redirect to appropriate dashboard based on role */}
        <Route path="*" element={<Navigate to={getDashboardRoute()} replace />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
