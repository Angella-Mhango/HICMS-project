// frontend/src/services/hierarchyApi.js

const API_BASE = "http://127.0.0.1:8000";

export const getHierarchyLevels = async (token) => {
  const response = await fetch(`${API_BASE}/hierarchy/levels/`, {
    headers: { "Authorization": `Token ${token}` }
  });
  return response.json();
};

export const getCurrentAdminInfo = async (token) => {
  const response = await fetch(`${API_BASE}/hierarchy/my-admin-info/`, {
    headers: { "Authorization": `Token ${token}` }
  });
  return response.json();
};

export const getAdminsByLevel = async (token, levelName) => {
  const response = await fetch(`${API_BASE}/hierarchy/admins/${levelName}/`, {
    headers: { "Authorization": `Token ${token}` }
  });
  return response.json();
};

export const createAdmin = async (token, adminData) => {
  const response = await fetch(`${API_BASE}/hierarchy/create-admin/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Token ${token}`
    },
    body: JSON.stringify(adminData)
  });
  return response.json();
};

export const deleteAdmin = async (token, adminId) => {
  const response = await fetch(`${API_BASE}/hierarchy/delete-admin/${adminId}/`, {
    method: "DELETE",
    headers: { "Authorization": `Token ${token}` }
  });
  return response.json();
};

export const getHierarchySummary = async (token) => {
  const response = await fetch(`${API_BASE}/hierarchy/summary/`, {
    headers: { "Authorization": `Token ${token}` }
  });
  return response.json();
};