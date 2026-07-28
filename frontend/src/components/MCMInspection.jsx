// frontend/src/components/MCMInspection.jsx
import React, { useState, useEffect } from 'react';
import { getInspectionTypes, getChecklistCategories, getChecklistItems, submitMCMInspection } from '../services/mcmApi';

const MCMInspection = () => {
    const [inspectionTypes, setInspectionTypes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [checklistItems, setChecklistItems] = useState([]);
    const [facilities, setFacilities] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        facility_id: '',
        facility_name: '',
        department_id: '',
        inspector: localStorage.getItem('username') || '',
        mcm_inspection_type: '',
        facility_type: '',
        notes: '',
    });

    // Get auth token
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchInitialData();
        fetchFacilities();
    }, []);

    useEffect(() => {
        if (formData.facility_id) {
            fetchDepartments(formData.facility_id);
            // Get facility type from selected facility
            const selectedFacility = facilities.find(f => f.id === parseInt(formData.facility_id));
            if (selectedFacility) {
                setFormData(prev => ({
                    ...prev,
                    facility_name: selectedFacility.name,
                    facility_type: selectedFacility.facility_type
                }));
            }
        }
    }, [formData.facility_id]);

    useEffect(() => {
        if (formData.mcm_inspection_type && formData.facility_type) {
            fetchChecklistItems();
        }
    }, [formData.mcm_inspection_type, formData.facility_type]);

    const fetchFacilities = async () => {
        try {
            const response = await fetch("http://127.0.0.1:8000/facilities/api/", {
                headers: { "Authorization": `Token ${token}` }
            });
            const data = await response.json();
            // Handle both array and object response
            const facilitiesArray = Array.isArray(data) ? data : data.results || [];
            setFacilities(facilitiesArray);
        } catch (error) {
            console.error('Error fetching facilities:', error);
            alert('Failed to load facilities');
        }
    };

    const fetchDepartments = async (facilityId) => {
        try {
            const response = await fetch(`http://127.0.0.1:8000/facilities/${facilityId}/departments/`, {
                headers: { "Authorization": `Token ${token}` }
            });
            const data = await response.json();
            // Handle both array and object response
            let departmentsArray = [];
            if (Array.isArray(data)) {
                departmentsArray = data;
            } else if (data.departments && Array.isArray(data.departments)) {
                departmentsArray = data.departments;
            } else if (data.results && Array.isArray(data.results)) {
                departmentsArray = data.results;
            }
            setDepartments(departmentsArray);
            // Reset department selection when facility changes
            setFormData(prev => ({ ...prev, department_id: '' }));
        } catch (error) {
            console.error('Error fetching departments:', error);
            setDepartments([]);
        }
    };

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [types, categoriesData] = await Promise.all([
                getInspectionTypes(),
                getChecklistCategories()
            ]);
            setInspectionTypes(types);
            setCategories(categoriesData);
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Failed to load inspection data. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const fetchChecklistItems = async () => {
        setLoading(true);
        try {
            const params = {
                inspection_type: formData.mcm_inspection_type,
                facility_type: formData.facility_type
            };
            const items = await getChecklistItems(params);
            setChecklistItems(items);
            
            // Initialize answers for all items
            const initialAnswers = {};
            items.forEach(item => {
                initialAnswers[item.id] = { result: '', notes: '' };
            });
            setAnswers(initialAnswers);
        } catch (error) {
            console.error('Error fetching checklist:', error);
            alert('Failed to load checklist items.');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleAnswerChange = (itemId, field, value) => {
        setAnswers({
            ...answers,
            [itemId]: { ...answers[itemId], [field]: value }
        });
    };

    const calculateScore = () => {
        const totalItems = Object.keys(answers).length;
        if (totalItems === 0) return 0;
        const compliantItems = Object.values(answers).filter(a => a.result === 'COMPLIANT').length;
        return Math.round((compliantItems / totalItems) * 100);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.department_id) {
            alert('Please select a department');
            return;
        }
        
        // Validate required answers
        const unanswered = Object.entries(answers).filter(([_, answer]) => !answer.result);
        if (unanswered.length > 0) {
            alert(`Please answer ${unanswered.length} unanswered checklist items before submitting.`);
            return;
        }
        
        setSubmitting(true);

        const score = calculateScore();
        const answersList = Object.entries(answers).map(([itemId, answer]) => ({
            checklist_item_id: parseInt(itemId),
            result: answer.result,
            notes: answer.notes,
            score: answer.result === 'COMPLIANT' ? 1 : 0
        }));

        const submissionData = {
            facility_name: formData.facility_name,
            department_id: parseInt(formData.department_id),
            inspector: formData.inspector,
            mcm_inspection_type: formData.mcm_inspection_type,
            facility_type: formData.facility_type,
            notes: formData.notes,
            score: score,
            max_score: 100,
            answers: answersList
        };

        try {
            const response = await submitMCMInspection(submissionData);
            if (response.success) {
                alert(`✅ Inspection submitted successfully!\nScore: ${score}%`);
                // Reset form
                setFormData({
                    facility_id: '',
                    facility_name: '',
                    department_id: '',
                    inspector: localStorage.getItem('username') || '',
                    mcm_inspection_type: '',
                    facility_type: '',
                    notes: '',
                });
                setDepartments([]);
                setAnswers({});
                setChecklistItems([]);
                setSelectedCategory(null);
            } else {
                alert('❌ Failed to submit inspection');
            }
        } catch (error) {
            console.error('Error submitting inspection:', error);
            alert('❌ Error submitting inspection. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const getFilteredItems = () => {
        if (!selectedCategory) return checklistItems;
        return checklistItems.filter(item => item.category_id === selectedCategory);
    };

    if (loading && checklistItems.length === 0 && inspectionTypes.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-gray-500">Loading Compliance Inspection System...</div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="bg-green-600 px-6 py-4">
                    <h1 className="text-2xl font-bold text-white">Compliance Inspection</h1>
                    <p className="text-green-100 text-sm">Standardized Compliance Checklist</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Facility Selection - Dropdown */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Facility *
                            </label>
                            <select
                                name="facility_id"
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                                value={formData.facility_id}
                                onChange={handleInputChange}
                            >
                                <option value="">Select Facility</option>
                                {facilities.map(facility => (
                                    <option key={facility.id} value={facility.id}>
                                        {facility.name} ({facility.facility_type} - {facility.district})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Department Selection - Dropdown (depends on facility) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Department *
                            </label>
                            <select
                                name="department_id"
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                                value={formData.department_id}
                                onChange={handleInputChange}
                                disabled={!formData.facility_id}
                            >
                                <option value="">Select Department</option>
                                {Array.isArray(departments) && departments.map(dept => (
                                    <option key={dept.id} value={dept.id}>
                                        {dept.name}
                                    </option>
                                ))}
                            </select>
                            {formData.facility_id && (!departments || departments.length === 0) && (
                                <p className="text-xs text-red-500 mt-1">No departments found for this facility</p>
                            )}
                        </div>

                        {/* Facility Type - Auto-populated, read-only */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Facility Type
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                                value={formData.facility_type}
                                disabled
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Inspector Name *
                            </label>
                            <input
                                type="text"
                                name="inspector"
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                                value={formData.inspector}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Inspection Type *
                            </label>
                            <select
                                name="mcm_inspection_type"
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                                value={formData.mcm_inspection_type}
                                onChange={handleInputChange}
                            >
                                <option value="">Select Inspection Type</option>
                                {inspectionTypes.map(type => (
                                    <option key={type.id} value={type.name}>
                                        {type.name}: {type.description}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Additional Notes
                        </label>
                        <textarea
                            name="notes"
                            rows="3"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                            value={formData.notes}
                            onChange={handleInputChange}
                            placeholder="Any additional observations or comments..."
                        />
                    </div>

                    {/* Checklist Section */}
                    {checklistItems.length > 0 && (
                        <>
                            <div className="border-t pt-4">
                                <h2 className="text-lg font-semibold text-gray-800 mb-3">
                                    Inspection Checklist
                                </h2>
                                
                                {/* Category Filter */}
                                {categories.length > 0 && (
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Filter by Category
                                        </label>
                                        <select
                                            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md"
                                            value={selectedCategory || ''}
                                            onChange={(e) => setSelectedCategory(e.target.value || null)}
                                        >
                                            <option value="">All Categories</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>
                                                    {cat.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Score Preview */}
                                <div className="bg-gray-50 p-3 rounded-lg mb-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-700">
                                            Current Score:
                                        </span>
                                        <span className={`text-lg font-bold ${
                                            calculateScore() >= 80 ? 'text-green-600' : 
                                            calculateScore() >= 60 ? 'text-yellow-600' : 'text-red-600'
                                        }`}>
                                            {calculateScore()}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                        <div
                                            className={`h-2 rounded-full transition-all ${
                                                calculateScore() >= 80 ? 'bg-green-600' : 
                                                calculateScore() >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                                            }`}
                                            style={{ width: `${calculateScore()}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Checklist Items */}
                                <div className="space-y-4 max-h-96 overflow-y-auto">
                                    {getFilteredItems().map((item) => (
                                        <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                        {item.item_code}
                                                    </span>
                                                    <p className="mt-2 text-gray-800">{item.description}</p>
                                                    {item.ideal_status && (
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Ideal: {item.ideal_status}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Compliance Status
                                                    </label>
                                                    <select
                                                        className="w-full px-3 py-1 border border-gray-300 rounded-md"
                                                        value={answers[item.id]?.result || ''}
                                                        onChange={(e) => handleAnswerChange(item.id, 'result', e.target.value)}
                                                        required
                                                    >
                                                        <option value="">Select Status</option>
                                                        <option value="COMPLIANT">✅ Compliant</option>
                                                        <option value="PARTIAL">⚠️ Partially Compliant</option>
                                                        <option value="NON_COMPLIANT">❌ Non-Compliant</option>
                                                        <option value="NOT_APPLICABLE">N/A - Not Applicable</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Inspector Notes
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="w-full px-3 py-1 border border-gray-300 rounded-md"
                                                        placeholder="Optional notes..."
                                                        value={answers[item.id]?.notes || ''}
                                                        onChange={(e) => handleAnswerChange(item.id, 'notes', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
                                >
                                    {submitting ? 'Submitting...' : 'Submit Inspection'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => window.history.back()}
                                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </>
                    )}

                    {formData.mcm_inspection_type && formData.facility_type && checklistItems.length === 0 && !loading && (
                        <div className="text-center py-8 text-gray-500">
                            No checklist items found for this inspection type and facility.
                            Please check your selection or contact administrator.
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default MCMInspection;