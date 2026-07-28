// frontend/src/services/mcmApi.js
// This uses fetch API - no axios required

const API_BASE_URL = 'http://127.0.0.1:8000/inspections';

// Get auth token from localStorage (set by your existing login)
const getToken = () => localStorage.getItem('token');

const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Token ${getToken()}`
});

// Handle response errors
const handleResponse = async (response) => {
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
};

// MCM API Functions
export const getInspectionTypes = async () => {
    const response = await fetch(`${API_BASE_URL}/inspection-types/`, {
        headers: getHeaders()
    });
    return handleResponse(response);
};

export const getChecklistCategories = async () => {
    const response = await fetch(`${API_BASE_URL}/checklist-categories/`, {
        headers: getHeaders()
    });
    return handleResponse(response);
};

export const getChecklistItems = async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/checklist-items/${queryString ? `?${queryString}` : ''}`;
    const response = await fetch(url, {
        headers: getHeaders()
    });
    return handleResponse(response);
};

export const submitMCMInspection = async (data) => {
    const response = await fetch(`${API_BASE_URL}/submit-inspection/`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
    });
    return handleResponse(response);
};

export const getMCMDashboardStats = async () => {
    const response = await fetch(`${API_BASE_URL}/dashboard/`, {
        headers: getHeaders()
    });
    return handleResponse(response);
};

export const getComplianceTrends = async () => {
    const response = await fetch(`${API_BASE_URL}/compliance-trends/`, {
        headers: getHeaders()
    });
    return handleResponse(response);
};

export const getFacilityRanking = async () => {
    const response = await fetch(`${API_BASE_URL}/facility-ranking/`, {
        headers: getHeaders()
    });
    return handleResponse(response);
};