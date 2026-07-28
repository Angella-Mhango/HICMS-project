// frontend/src/components/Sidebar.jsx
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Hospital,
  Search,
  CheckCircle,
  BarChart3,
  Settings,
  AlertTriangle,
  Calendar,
  CalendarDays,
  Trophy,
  LogOut,
  User,
  ClipboardList,
  Shield,
  FileText,
  ClipboardCheck,
  Clock,
  FileCheck,
  Bell,
  TrendingUp,
  Users,
  Building2,
  MapPin,
  Globe,
  Award
} from "lucide-react";

export default function Sidebar({ role, onLogout, isOpen }) {
  // Navigation items based on role
  const getNavItems = () => {
    // NATIONAL ADMIN - Full access
    if (role === "national_admin") {
      return [
        { name: "Overview", path: "/dashboard", icon: LayoutDashboard },
        { name: "Facilities", path: "/facilities", icon: Hospital },
        { name: "Inspections", path: "/inspections", icon: Search },
        { name: "Compliance", path: "/compliance", icon: CheckCircle },
        { name: "Schedule", path: "/gantt-chart", icon: CalendarDays },
        { name: "Reports", path: "/reports", icon: BarChart3 },
        { name: "User Management", path: "/users", icon: Users },
        { name: "Administration", path: "/administration", icon: Settings },
        { name: "Alerts", path: "/alerts", icon: AlertTriangle },
      ];
    }

    // REGIONAL ADMIN
    if (role === "regional_admin") {
      return [
        { name: "Overview", path: "/dashboard", icon: LayoutDashboard },
        { name: "Facilities", path: "/facilities", icon: Hospital },
        { name: "Inspections", path: "/inspections", icon: Search },
        { name: "Compliance", path: "/compliance", icon: CheckCircle },
        { name: "Schedule", path: "/gantt-chart", icon: CalendarDays },
        { name: "Reports", path: "/reports", icon: BarChart3 },
        { name: "User Management", path: "/users", icon: Users },
        { name: "Alerts", path: "/alerts", icon: AlertTriangle },
      ];
    }

    // DISTRICT ADMIN
    if (role === "district_admin") {
      return [
        { name: "Overview", path: "/dashboard", icon: LayoutDashboard },
        { name: "Facilities", path: "/facilities", icon: Hospital },
        { name: "Inspections", path: "/inspections", icon: Search },
        { name: "Compliance", path: "/compliance", icon: CheckCircle },
        { name: "Reports", path: "/reports", icon: BarChart3 },
        { name: "User Management", path: "/users", icon: Users },
        { name: "Alerts", path: "/alerts", icon: AlertTriangle },
      ];
    }

    // FACILITY ADMIN
    if (role === "facility_admin") {
      return [
        { name: "Overview", path: "/dashboard", icon: LayoutDashboard },
        { name: "Facility", path: "/facilities", icon: Hospital },
        { name: "Inspections", path: "/inspections", icon: Search },
        { name: "Compliance", path: "/compliance", icon: CheckCircle },
        { name: "Reports", path: "/reports", icon: BarChart3 },
        { name: "User Management", path: "/users", icon: Users },
        { name: "Alerts", path: "/alerts", icon: AlertTriangle },
      ];
    }

    // FACILITY QA
    if (role === "facility_qa") {
      return [
        { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
        { name: "Inspection Planning", path: "/inspection-planning", icon: Calendar },
        { name: "Pre-Inspection", path: "/pre-inspection", icon: ClipboardCheck },
        { name: "Inspection Reports", path: "/inspection-reports", icon: FileCheck },
        { name: "Compliance", path: "/compliance", icon: CheckCircle },
        { name: "Schedule", path: "/national-schedule", icon: CalendarDays },
        { name: "Reports", path: "/reports", icon: BarChart3 },
        { name: "Notifications", path: "/alerts", icon: Bell },
      ];
    }

    // NATIONAL INSPECTOR
    if (role === "national_inspector") {
      return [
        { name: "Overview", path: "/dashboard", icon: LayoutDashboard },
        { name: "My Inspections", path: "/my-inspections", icon: Search },
        { name: "Schedule", path: "/gantt-chart", icon: CalendarDays },
        { name: "Facilities", path: "/facilities", icon: Hospital },
        { name: "Reports", path: "/reports", icon: BarChart3 },
      ];
    }

    // DISTRICT SUPERVISOR
    if (role === "district_supervisor") {
      return [
        { name: "Overview", path: "/dashboard", icon: LayoutDashboard },
        { name: "Compliance", path: "/compliance", icon: CheckCircle },
        { name: "Inspections", path: "/inspections", icon: Search },
        { name: "Rankings", path: "/rankings", icon: Trophy },
        { name: "Reports", path: "/reports", icon: BarChart3 },
        { name: "Facilities", path: "/facilities", icon: Hospital },
        { name: "Alerts", path: "/alerts", icon: AlertTriangle },
      ];
    }

    // ADMIN (legacy)
    if (role === "admin") {
      return [
        { name: "Overview", path: "/dashboard", icon: LayoutDashboard },
        { name: "Facilities", path: "/facilities", icon: Hospital },
        { name: "Inspections", path: "/inspections", icon: Search },
        { name: "Compliance", path: "/compliance", icon: CheckCircle },
        { name: "Schedule", path: "/gantt-chart", icon: CalendarDays },
        { name: "Reports", path: "/reports", icon: BarChart3 },
        { name: "Administration", path: "/administration", icon: Settings },
        { name: "Alerts", path: "/alerts", icon: AlertTriangle },
      ];
    }

    // INSPECTOR (legacy)
    if (role === "inspector") {
      return [
        { name: "Overview", path: "/dashboard", icon: LayoutDashboard },
        { name: "My Inspections", path: "/my-inspections", icon: Search },
        { name: "Facilities", path: "/facilities", icon: Hospital },
      ];
    }

    // SUPERVISOR (legacy)
    if (role === "supervisor") {
      return [
        { name: "Overview", path: "/dashboard", icon: LayoutDashboard },
        { name: "Compliance", path: "/compliance", icon: CheckCircle },
        { name: "Rankings", path: "/rankings", icon: Trophy },
        { name: "Reports", path: "/reports", icon: BarChart3 },
        { name: "Facilities", path: "/facilities", icon: Hospital },
      ];
    }

    // Default fallback
    return [
      { name: "Overview", path: "/dashboard", icon: LayoutDashboard },
      { name: "Facilities", path: "/facilities", icon: Hospital },
    ];
  };

  const navItems = getNavItems();

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-gradient-to-b from-gray-900 to-gray-800 text-white shadow-xl z-50 transition-all duration-300 ease-in-out ${
        isOpen ? "w-64" : "w-20"
      }`}
    >
      {/* Logo Section */}
      <div className={`flex items-center ${isOpen ? "px-6" : "px-4"} py-6 border-b border-gray-700`}>
        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-2.5 shadow-lg shadow-green-900/30 flex-shrink-0">
          <Shield className="w-7 h-7 text-white" />
        </div>
        {isOpen && (
          <div className="ml-3">
            <h1 className="text-xl font-bold text-white tracking-tight">HICMS</h1>
            <p className="text-xs text-gray-400 capitalize">
              {role === "facility_qa" ? "Facility QA" : 
               role === "national_admin" ? "National Admin" :
               role === "regional_admin" ? "Regional Admin" :
               role === "district_admin" ? "District Admin" :
               role === "facility_admin" ? "Facility Admin" :
               role === "national_inspector" ? "National Inspector" :
               role === "district_supervisor" ? "District Supervisor" :
               role || "User"}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="mt-6 px-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => 
                  `flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-900/20"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  } ${!isOpen ? "justify-center" : ""}`
                }
                title={!isOpen ? item.name : ""}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${({ isActive }) => isActive ? "text-white" : "text-gray-400"}`} />
                {isOpen && <span className="text-sm font-medium">{item.name}</span>}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* User Info & Logout */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700 bg-gray-900/50">
        {isOpen ? (
          <>
            <div className="mb-3 px-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-300" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white capitalize">
                    {role === "facility_qa" ? "Facility QA" : 
                     role === "national_admin" ? "National Admin" :
                     role === "regional_admin" ? "Regional Admin" :
                     role === "district_admin" ? "District Admin" :
                     role === "facility_admin" ? "Facility Admin" :
                     role === "national_inspector" ? "National Inspector" :
                     role === "district_supervisor" ? "District Supervisor" :
                     role || "User"}
                  </p>
                  <p className="text-xs text-gray-400">Logged in</p>
                </div>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </>
        ) : (
          <button
            onClick={onLogout}
            className="flex justify-center w-full px-2 py-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>
    </aside>
  );
}
