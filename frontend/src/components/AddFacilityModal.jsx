// frontend/src/components/AddFacilityModal.jsx
import { useState } from "react";
import {
  X,
  Building2,
  MapPin,
  Globe,
  CheckCircle,
  AlertCircle,
  Plus
} from "lucide-react";
import useModalExperience from "./useModalExperience";

export default function AddFacilityModal({ isOpen, onClose, onSuccess, user }) {
  useModalExperience(isOpen, onClose);
  const [formData, setFormData] = useState({
    name: "",
    facility_type: "Public",
    region: "",
    district: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const regionOptions = ["Central Region", "Southern Region", "Northern Region"];
  
  const districtOptions = {
    "Central Region": ["Lilongwe", "Dowa", "Dedza", "Ntchisi", "Nkhotakota", "Salima", "Mchinji", "Kasungu", "Ntcheu"],
    "Southern Region": ["Blantyre", "Zomba", "Machinga", "Mangochi", "Balaka", "Mulanje", "Thyolo", "Chiradzulu", "Phalombe", "Nsanje", "Chikwawa", "Neno"],
    "Northern Region": ["Mzuzu", "Karonga", "Rumphi", "Chitipa", "Nkhata Bay", "Likoma", "Mzimba"]
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const handleRegionChange = (e) => {
    const region = e.target.value;
    setFormData(prev => ({ ...prev, region: region, district: "" }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    if (!formData.name.trim()) {
      setError("Facility name is required");
      setLoading(false);
      return;
    }
    if (!formData.region) {
      setError("Please select a region");
      setLoading(false);
      return;
    }
    if (!formData.district) {
      setError("Please select a district");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/facilities/api/create/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${user.token}`
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          facility_type: formData.facility_type,
          region: formData.region,
          district: formData.district
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage("Facility added successfully!");
        setTimeout(() => {
          onSuccess();
          onClose();
          setFormData({
            name: "",
            facility_type: "Public",
            region: "",
            district: ""
          });
          setSuccessMessage("");
        }, 1500);
      } else {
        setError(data.error || data.message || "Failed to add facility");
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
      facility_type: "Public",
      region: "",
      district: ""
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
    >
      <div role="dialog" aria-modal="true" aria-labelledby="add-facility-title" className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 id="add-facility-title" className="text-xl font-bold text-white">Add New Facility</h2>
                <p className="text-green-100 text-sm">Fill in the facility details below</p>
              </div>
            </div>
            <button type="button" onClick={handleClose} aria-label="Close dialog" className="rounded-lg p-1 text-white transition hover:bg-white/10">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Facility Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building2 className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter facility name"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Facility Type
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="facility_type"
                    value="Public"
                    checked={formData.facility_type === "Public"}
                    onChange={handleChange}
                    className="w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-gray-700 text-sm">Public</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="facility_type"
                    value="Private"
                    checked={formData.facility_type === "Private"}
                    onChange={handleChange}
                    className="w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-gray-700 text-sm">Private</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Region <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Globe className="w-4 h-4 text-gray-400" />
                </div>
                <select
                  name="region"
                  value={formData.region}
                  onChange={handleRegionChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white"
                  required
                >
                  <option value="">Select Region</option>
                  {regionOptions.map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                District <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="w-4 h-4 text-gray-400" />
                </div>
                <select
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                  required
                  disabled={!formData.region}
                >
                  <option value="">{!formData.region ? "Select region first" : "Select District"}</option>
                  {formData.region && districtOptions[formData.region]?.map(district => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
              </div>
            </div>

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
                    Add Facility
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
