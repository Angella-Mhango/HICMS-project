import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { Link } from "react-router-dom";
import AddFacilityModal from "../components/AddFacilityModal";
import AddDepartmentModal from "../components/AddDepartmentModal";

export default function FacilitiesPage({ user, onLogout }) {
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);

  useEffect(() => {
    fetchFacilities();
  }, []);

  const fetchFacilities = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/facilities/api/", {
        headers: { "Authorization": `Token ${user.token}` }
      });
      const data = await response.json();
      setFacilities(data);
    } catch (error) {
      console.error("Error fetching facilities:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async (facilityId) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/facilities/${facilityId}/departments/`, {
        headers: { "Authorization": `Token ${user.token}` }
      });
      const data = await response.json();
      setDepartments(data.departments || data);
    } catch (error) {
      console.error("Error fetching departments:", error);
      setDepartments([]);
    }
  };

  const handleFacilityClick = async (facility) => {
    setSelectedFacility(facility);
    await fetchDepartments(facility.id);
  };

  const handleRefresh = () => {
    fetchFacilities();
    if (selectedFacility) {
      fetchDepartments(selectedFacility.id);
    }
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
      {/* Header - Same style as Admin Dashboard */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-700">Facilities Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage healthcare facilities and departments</p>
      </div>

      {/* Stats Cards - Same as Admin Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-md p-5">
          <p className="text-sm text-gray-500">Total Facilities</p>
          <p className="text-2xl font-semibold text-green-600">{facilities.length}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-5">
          <p className="text-sm text-gray-500">Total Departments</p>
          <p className="text-2xl font-semibold text-green-600">
            {facilities.reduce((sum, f) => sum + (f.department_count || 0), 0)}
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-5">
          <p className="text-sm text-gray-500">Public Facilities</p>
          <p className="text-2xl font-semibold text-green-600">
            {facilities.filter(f => f.facility_type === 'Public').length}
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-5">
          <p className="text-sm text-gray-500">Private Facilities</p>
          <p className="text-2xl font-semibold text-green-600">
            {facilities.filter(f => f.facility_type === 'Private').length}
          </p>
        </div>
      </div>

      {/* Quick Actions - Same as Admin Dashboard */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setShowFacilityModal(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
        >
          + Add Facility
        </button>
        <button
          onClick={() => setShowDepartmentModal(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
        >
          + Add Department
        </button>
      </div>

      {/* Two Column Layout - Same card style as Admin Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Facilities List Card */}
        <div className="bg-white rounded-2xl shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-700">All Facilities</h3>
              <span className="text-sm text-gray-500">{facilities.length} total</span>
            </div>
          </div>
          <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
            {facilities.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No facilities found. Click "Add Facility" to create one.
              </div>
            ) : (
              facilities.map((facility) => (
                <div
                  key={facility.id}
                  onClick={() => handleFacilityClick(facility)}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-all ${
                    selectedFacility?.id === facility.id 
                      ? 'bg-green-50 border-l-4 border-green-500' 
                      : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{facility.name}</h4>
                      <p className="text-sm text-gray-500 mt-1">
                        <span className={`inline-flex items-center gap-1`}>
                          <span className={`w-2 h-2 rounded-full ${
                            facility.facility_type === 'Public' ? 'bg-green-500' : 'bg-green-500'
                          }`}></span>
                          {facility.facility_type || 'N/A'}
                        </span>
                        <span className="mx-2">•</span>
                        {facility.district || 'N/A'}
                        <span className="mx-2">•</span>
                        {facility.region || 'N/A'}
                      </p>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {facility.department_count || 0} dept
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Departments List Card */}
        <div className="bg-white rounded-2xl shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-700">
              {selectedFacility ? `${selectedFacility.name} - Departments` : "Select a Facility"}
            </h3>
            {selectedFacility && (
              <p className="text-sm text-gray-500 mt-1">
                Total Departments: {departments.length}
              </p>
            )}
          </div>
          <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
            {!selectedFacility ? (
              <div className="p-8 text-center text-gray-400">
                Click on a facility to view its departments
              </div>
            ) : departments.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No departments found. Click "Add Department" to add one.
              </div>
            ) : (
              departments.map((dept) => (
                <div key={dept.id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-green-500"></div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800">{dept.name}</h4>
                      <p className="text-xs text-gray-400 mt-1">Department ID: {dept.id}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddFacilityModal
        isOpen={showFacilityModal}
        onClose={() => setShowFacilityModal(false)}
        onSuccess={handleRefresh}
        user={user}
      />

      <AddDepartmentModal
        isOpen={showDepartmentModal}
        onClose={() => setShowDepartmentModal(false)}
        onSuccess={handleRefresh}
        user={user}
      />
    </Layout>
  );
}