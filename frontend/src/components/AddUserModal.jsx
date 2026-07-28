// frontend/src/components/AddUserModal.jsx
import { useEffect, useState } from "react";
import { 
  X, User, Mail, Lock, UserCircle, Shield, CheckCircle, 
  AlertCircle, UserPlus 
} from "lucide-react";
import { showToast } from "./Toast";

export default function AddUserModal({ isOpen, onClose, onSuccess, user, editingUser, roles }) {
  console.log("📦 AddUserModal rendered with isOpen:", isOpen);
  
  const [formData, setFormData] = useState({
    username: editingUser?.username || "",
    email: editingUser?.email || "",
    first_name: editingUser?.first_name || "",
    last_name: editingUser?.last_name || "",
    password: "",
    role_id: editingUser?.role_id || "",
    is_active: editingUser?.is_active !== undefined ? editingUser.is_active : true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reset form when modal opens or editing user changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        username: editingUser?.username || "",
        email: editingUser?.email || "",
        first_name: editingUser?.first_name || "",
        last_name: editingUser?.last_name || "",
        password: "",
        role_id: editingUser?.role_id || "",
        is_active: editingUser?.is_active !== undefined ? editingUser.is_active : true
      });
      setError("");
    }
  }, [isOpen, editingUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const url = editingUser
      ? `http://127.0.0.1:8000/accounts/users/${editingUser.id}/`
      : "http://127.0.0.1:8000/accounts/users/";
    const method = editingUser ? "PUT" : "POST";

    const dataToSend = { ...formData };
    if (editingUser && !dataToSend.password) {
      delete dataToSend.password;
    }

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${user.token}`
        },
        body: JSON.stringify(dataToSend)
      });

      if (response.ok) {
        showToast(
          editingUser ? "User updated successfully!" : "User created successfully!",
          "success"
        );
        onSuccess();
        onClose();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save user");
        showToast(data.error || "Failed to save user", "error");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      showToast("Network error. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  // If modal is not open, return null early
  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-[100] p-4"
      style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 rounded-t-2xl z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {editingUser ? (
                  <UserCircle className="w-5 h-5" />
                ) : (
                  <UserPlus className="w-5 h-5" />
                )}
                {editingUser ? "Edit User" : "Add New User"}
              </h2>
              <p className="text-green-100 text-sm mt-1">
                {editingUser ? "Update user information" : "Fill in the user details below"}
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

        {/* Body */}
        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Enter username"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm placeholder-gray-400"
                required
                disabled={editingUser}
              />
              {editingUser && (
                <p className="text-xs text-gray-400 mt-1">Username cannot be changed</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm placeholder-gray-400"
              />
            </div>

            {/* First & Last Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="John"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Doe"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm placeholder-gray-400"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Lock className="w-4 h-4 text-gray-400" />
                Password {!editingUser && <span className="text-red-500">*</span>}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingUser ? "Leave blank to keep current" : "Enter password (min 8 characters)"}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm placeholder-gray-400"
                required={!editingUser}
                minLength={8}
              />
              {editingUser && (
                <p className="text-xs text-gray-400 mt-1">Leave blank to keep current password</p>
              )}
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-400" />
                Role <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.role_id}
                onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm bg-white"
                required
              >
                <option value="">Select a role</option>
                {roles && roles.length > 0 ? (
                  roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>No roles available</option>
                )}
              </select>
              {(!roles || roles.length === 0) && (
                <p className="text-xs text-yellow-600 mt-1">
                  ⚠️ No roles found. Please add a role first.
                </p>
              )}
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700 flex items-center gap-1">
                  {formData.is_active ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Active User
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-gray-400" />
                      Inactive User
                    </>
                  )}
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.username.trim() || !formData.role_id}
                className={`flex-1 px-4 py-2 rounded-lg transition text-sm font-medium flex items-center justify-center gap-2 ${
                  loading || !formData.username.trim() || !formData.role_id
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Saving...
                  </>
                ) : (
                  editingUser ? "Update User" : "Create User"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
