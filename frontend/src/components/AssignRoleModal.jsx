import { useState, useEffect } from "react";
import { 
  X, Shield, User, CheckCircle, AlertCircle, 
  UserCheck, UserX, Users 
} from "lucide-react";
import { showToast } from "../components/Toast";
import useModalExperience from "./useModalExperience";

export default function AssignRoleModal({ isOpen, onClose, onSuccess, user, selectedUser, roles }) {
  useModalExperience(isOpen && Boolean(selectedUser), onClose);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (selectedUser && selectedUser.role_id) {
      setSelectedRoleId(selectedUser.role_id);
    } else {
      setSelectedRoleId("");
    }
  }, [selectedUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!selectedRoleId) {
      setError("Please select a role");
      showToast("Please select a role", "warning");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:8000/accounts/users/${selectedUser.id}/assign-role/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${user.token}`
        },
        body: JSON.stringify({ role_id: parseInt(selectedRoleId) })
      });

      if (response.ok) {
        const roleName = roles.find(r => r.id === parseInt(selectedRoleId))?.name || "Role";
        showToast(
          `${roleName} role assigned to ${selectedUser.username} successfully!`,
          "success"
        );
        onSuccess();
        onClose();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to assign role");
        showToast(data.error || "Failed to assign role", "error");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      showToast("Network error. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !selectedUser) return null;

  // Find current role name
  const currentRole = roles.find(r => r.id === selectedUser.role_id);
  const selectedRole = roles.find(r => r.id === parseInt(selectedRoleId));

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
    >
      <div role="dialog" aria-modal="true" aria-label="Assign role" className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl">
        
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 rounded-t-2xl z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Assign Role to User
              </h2>
              <p className="text-green-100 text-sm mt-1">
                Select a role for <span className="font-semibold">{selectedUser.username}</span>
              </p>
            </div>
            <button 
              onClick={onClose}
              className="text-white hover:text-gray-200 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* User Information */}
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700">
                  {selectedUser.first_name} {selectedUser.last_name}
                </p>
                <p className="text-xs text-gray-500">@{selectedUser.username}</p>
                {selectedUser.email && (
                  <p className="text-xs text-gray-400 truncate">{selectedUser.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Current Role Display */}
          {currentRole && (
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Current Role:</span>
                <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <UserCheck className="w-4 h-4 text-green-600" />
                  {currentRole.name}
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                Select Role <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm bg-white"
                required
              >
                <option value="">Choose a role</option>
                {roles.filter((role) => role.is_active !== false || role.id === selectedUser.role_id).map((role) => (
                  <option key={role.id} value={role.id} disabled={role.is_active === false}>
                    {role.name}{role.is_active === false ? " (Archived)" : ""}
                  </option>
                ))}
              </select>
              {selectedRole && selectedRoleId && (
                <p className="text-xs text-gray-400 mt-1">
                  {selectedRole.description || `Assign ${selectedRole.name} role to this user`}
                </p>
              )}
            </div>

            {/* Role Change Warning */}
            {currentRole && selectedRoleId && parseInt(selectedRoleId) !== selectedUser.role_id && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-green-700">
                      <span className="font-medium">Changing role:</span> This will replace the current 
                      <span className="font-medium"> {currentRole.name}</span> role with 
                      <span className="font-medium"> {selectedRole.name}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedRoleId}
                className={`flex-1 px-4 py-2 rounded-lg transition text-sm font-medium flex items-center justify-center gap-2 ${
                  loading || !selectedRoleId
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Assigning...
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    Assign Role
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
