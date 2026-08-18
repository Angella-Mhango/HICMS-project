// frontend/src/components/AddDepartmentModal.jsx
import { useState, useEffect } from "react";
import {
  X,
  Building2,
  Plus,
  CheckCircle,
  AlertCircle,
  Layers
} from "lucide-react";
import useModalExperience from "./useModalExperience";

export default function AddDepartmentModal({ isOpen, onClose, onSuccess, user }) {
  useModalExperience(isOpen, onClose);
  const [formData, setFormData] = useState({
    name: "",
    facility_id: ""
  });
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Fetch facilities when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchFacilities();
    }
  }, [isOpen]);

  const fetchFacilities = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/facilities/api/", {
        headers: { "Authorization": `Token ${user.token}` }
      });
      const data = await response.json();
      setFacilities(data);
    } catch (error) {
      console.error("Error fetching facilities:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    if (!formData.name.trim()) {
      setError("Department name is required");
      setLoading(false);
      return;
    }
    if (!formData.facility_id) {
      setError("Please select a facility");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/facilities/departments/create/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${user.token}`
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          facility_id: parseInt(formData.facility_id)
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage("Department added successfully!");
        setTimeout(() => {
          onSuccess();
          onClose();
          setFormData({
            name: "",
            facility_id: ""
          });
          setSuccessMessage("");
        }, 1500);
      } else {
        setError(data.error || data.message || "Failed to add department");
      }
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError("");
    setSuccessMessage("");
    setFormData({
      name: "",
      facility_id: ""
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
    >
      <div role="dialog" aria-modal="true" aria-labelledby="add-department-title" className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 id="add-department-title" className="text-xl font-bold text-white">Add New Department</h2>
                <p className="text-green-100 text-sm">Add a department to an existing facility</p>
              </div>
            </div>
            <button type="button" onClick={handleClose} aria-label="Close dialog" className="rounded-lg p-1 text-white transition hover:bg-white/10">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              {successMessage}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Facility Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Facility <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building2 className="w-4 h-4 text-gray-400" />
                </div>
                <select
                  name="facility_id"
                  value={formData.facility_id}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white"
                  required
                >
                  <option value="">Select a facility</option>
                  {facilities.map(facility => (
                    <option key={facility.id} value={facility.id}>
                      {facility.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Department Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Layers className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter department name (e.g., Emergency, Pharmacy, Maternity)"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add Department
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
