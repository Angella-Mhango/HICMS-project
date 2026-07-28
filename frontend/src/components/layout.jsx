// frontend/src/components/Layout.jsx
import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function Layout({ children, user, onLogout }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar 
        role={user?.role} 
        onLogout={onLogout} 
        isOpen={isSidebarOpen}
      />

      {/* Main Content Area */}
      <div className={`transition-all duration-300 ease-in-out ${isSidebarOpen ? "ml-64" : "ml-20"}`}>
        <Header 
          user={user} 
          onLogout={onLogout}
          onSidebarToggle={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
        />
        
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}