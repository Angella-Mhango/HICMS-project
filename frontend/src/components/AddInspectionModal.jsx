import { useState, useEffect } from "react";

export default function AddInspectionModal({ isOpen, onClose, onSuccess, user, initialInspector }) {
  const [formData, setFormData] = useState({
    facility_id: "",
    department_id: "",
    inspector: initialInspector || user?.username || "",
    visit_type: "",
    score: "",
    notes: ""
  });
  const [facilities, setFacilities] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchFacilities();
      // Reset form when modal opens
      setFormData({
        facility_id: "",
        department_id: "",
        inspector: initialInspector || user?.username || "",
        visit_type: "",
        score: "",
        notes: ""
      });
      setDepartments([]);
      setError("");
    }
  }, [isOpen, user]);

  const fetchFacilities = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/facilities/api/", {
        headers: { "Authorization": `Token ${user?.token}` }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setFacilities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching facilities:", err);
      setError("Failed to load facilities");
    }
  };

  const handleFacilityChange = async (e) => {
    const facilityId = e.target.value;
    setFormData({ ...formData, facility_id: facilityId, department_id: "" });
    setDepartments([]);
    
    // Fetch departments for selected facility
    if (facilityId) {
      try {
        const response = await fetch(`http://127.0.0.1:8000/facilities/${facilityId}/departments/`, {
          headers: { "Authorization": `Token ${user?.token}` }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        // The API returns departments in the 'departments' array
        const departmentsList = data.departments || [];
        setDepartments(departmentsList);
      } catch (error) {
        console.error("Error fetching departments:", error);
        setDepartments([]);
      }
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validation
    if (!formData.facility_id) {
      setError("Please select a facility");
      setLoading(false);
      return;
    }
    
    if (!formData.department_id) {
      setError("Please select a department");
      setLoading(false);
      return;
    }
    
    if (!formData.visit_type) {
      setError("Please select a visit type");
      setLoading(false);
      return;
    }
    
    if (!formData.score) {
      setError("Please enter a score");
      setLoading(false);
      return;
    }

    // Get the facility name from selected facility
    const selectedFacility = facilities.find(f => f.id.toString() === formData.facility_id);
    const facilityName = selectedFacility ? selectedFacility.name : "";

    try {
      const response = await fetch("http://127.0.0.1:8000/inspections/api/create/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${user?.token}`
        },
        body: JSON.stringify({
          facility_name: facilityName,
          department_id: parseInt(formData.department_id),
          inspector: formData.inspector,
          visit_type: formData.visit_type,
          score: parseInt(formData.score),
          notes: formData.notes || ""
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert("Inspection created successfully!");
        onSuccess();
        onClose();
      } else {
        setError(data.error || "Failed to create inspection");
      }
    } catch (err) {
      console.error("Network error:", err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">New Inspection</h2>
              <p className="text-green-100 text-sm">Fill in the details to create a new inspection record</p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 text-center">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Facility Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Facility <span className="text-red-500">*</span>
                </label>
                <select
                  name="facility_id"
                  value={formData.facility_id}
                  onChange={handleFacilityChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a facility</option>
                  {facilities.map(facility => (
                    <option key={facility.id} value={facility.id}>
                      {facility.name} ({facility.facility_type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  name="department_id"
                  value={formData.department_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                  disabled={!formData.facility_id}
                >
                  <option value="">Select a department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                {formData.facility_id && departments.length === 0 && (
                  <p className="text-xs text-yellow-600 mt-1">
                    No departments found. Please add departments to this facility first.
                  </p>
                )}
              </div>

              {/* Inspector Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Inspector Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="inspector"
                  value={formData.inspector}
                  onChange={handleChange}
                  placeholder="Enter inspector name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Visit Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Visit Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="visit_type"
                  value={formData.visit_type}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                >
                  <option value="">Select visit type</option>
                  <option value="Baseline">Baseline</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Observation">Observation</option>
                  <option value="Edit">Edit</option>
                </select>
              </div>

              {/* Score */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Score (0-100) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="score"
                  value={formData.score}
                  onChange={handleChange}
                  placeholder="Enter score"
                  min="0"
                  max="100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Additional notes (optional)"
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            {/* Form Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  "Create Inspection"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}