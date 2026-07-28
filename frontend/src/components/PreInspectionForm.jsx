// frontend/src/components/PreInspectionForm.jsx
import { useState, useEffect, useRef } from "react";
import {
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  AlertCircle,
  Building2,
  ClipboardList,
  Send,
  Clock,
  FileText,
  Award,
  Camera,
  Trash2,
  ChevronDown
} from "lucide-react";
import { showToast } from "./Toast";  // âœ… This is correct - Toast is in the same folder (components)

const API_BASE = "http://127.0.0.1:8000";

const onlyActiveStandards = (items) => {
  return (items || [])
    .filter((standard) => standard?.is_active !== false)
    .map((standard) => ({
      ...standard,
      requirements: (standard.requirements || []).filter((req) => req?.is_active !== false),
    }))
    .filter((standard) => standard.requirements.length > 0);
};

export default function PreInspectionForm({ user, facilityId, onComplete, onClose }) {
  const [standards, setStandards] = useState([]);
  const [answers, setAnswers] = useState({});
  const [images, setImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [currentStandardIndex, setCurrentStandardIndex] = useState(0);
  const [currentRequirementIndex, setCurrentRequirementIndex] = useState(0);
  const [facilityInfo, setFacilityInfo] = useState({ name: "", department: "", facility_type_id: null });
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [inspectionTypes, setInspectionTypes] = useState([]);
  const [selectedInspectionType, setSelectedInspectionType] = useState("");
  const [loadingStandards, setLoadingStandards] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [showStandardDropdown, setShowStandardDropdown] = useState(false);
  const [facilityTypeId, setFacilityTypeId] = useState(null);
  const fileInputRef = useRef(null);

  const getCriteriaItems = (requirement) => {
    if (!requirement) return [];
    if (Array.isArray(requirement.criteria_items)) return requirement.criteria_items;
    if (requirement.criteria && Array.isArray(requirement.criteria.items)) return requirement.criteria.items;
    if (Array.isArray(requirement.criteria)) return requirement.criteria;
    return [];
  };

  useEffect(() => {
    // âœ… Guard: Only fetch if facilityId is valid
    if (facilityId && facilityId > 0) {
      fetchAllData();
    } else {
      setError("No facility selected or invalid facility ID");
      setLoading(false);
      showToast("Invalid facility ID", "error");
    }
  }, [facilityId]);

  const fetchAllData = async () => {
    setLoading(true);
    setError("");
    try {
      const facility = await fetchFacilityInfo();
      const depts = await fetchDepartments();
      const types = await fetchInspectionTypes();

      if (depts?.length && types?.length) {
        const match = await findFirstStandardsMatch(facility?.facility_type_id, depts, types);
        const departmentId = match?.departmentId || depts[0].id;
        const inspectionTypeId = match?.inspectionTypeId || types[0].id;

        setSelectedDepartment(departmentId);
        setSelectedInspectionType(inspectionTypeId);

        if (match?.standards?.length) {
          loadStandardsIntoForm(match.standards);
        } else {
          await fetchRequirements(facility?.facility_type_id, departmentId, inspectionTypeId);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load data. Please try again.");
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchFacilityInfo = async () => {
    // âœ… Guard: Don't fetch if facilityId is invalid
    if (!facilityId || facilityId <= 0) {
      console.warn("âš ï¸ Invalid facility ID, skipping facility fetch");
      return;
    }
    
    try {
      console.log("ðŸ“¡ Fetching facility info for ID:", facilityId);
      const response = await fetch(`${API_BASE}/facilities/api/${facilityId}/`, {
        headers: { "Authorization": `Token ${user.token}` }
      });
      
      if (response.ok) {
        const facility = await response.json();
        console.log("âœ… Facility found:", facility);
        setFacilityInfo({ 
          name: facility.name, 
          department: "",
          facility_type_id: facility.facility_type_id
        });
        setFacilityTypeId(facility.facility_type_id);
        return facility;
      } else {
        console.error("âŒ Failed to fetch facility:", response.status);
        setError(`Facility with ID ${facilityId} not found`);
      }
    } catch (error) {
      console.error("Error fetching facility info:", error);
      setError("Could not load facility information");
    }
  };

  const fetchDepartments = async () => {
    // âœ… Guard: Don't fetch if facilityId is invalid
    if (!facilityId || facilityId <= 0) {
      console.warn("âš ï¸ Invalid facility ID, skipping departments fetch");
      return;
    }
    
    try {
      console.log("ðŸ“¡ Fetching departments for facility:", facilityId);
      const response = await fetch(`${API_BASE}/facilities/${facilityId}/departments/`, {
        headers: { "Authorization": `Token ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Handle both array and object response
        const depts = Array.isArray(data) ? data : (data.departments || []);
        console.log("âœ… Departments loaded:", depts.length);
        setDepartments(depts);
        if (depts.length > 0) {
          setSelectedDepartment(depts[0].id);
        }
        return depts;
      } else {
        console.error("âŒ Failed to fetch departments:", response.status);
        setDepartments([]);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
      setDepartments([]);
    }
  };


  const fetchInspectionTypes = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/standards/inspection-types/`, {
        headers: { "Authorization": `Token ${user.token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const types = Array.isArray(data) ? data : [];
        setInspectionTypes(types);
        return types;
      }

      setInspectionTypes([]);
      return [];
    } catch (error) {
      console.error("Error fetching inspection types:", error);
      setInspectionTypes([]);
      return [];
    }
  };

  const buildStandardsUrl = (facilityTypeOverride, departmentOverride, inspectionTypeOverride) => {
    let url = `${API_BASE}/api/standards/?`;
    const params = new URLSearchParams();

    const effectiveFacilityTypeId = facilityTypeOverride || facilityTypeId;
    const effectiveDepartmentId = departmentOverride || selectedDepartment;
    const effectiveInspectionTypeId = inspectionTypeOverride || selectedInspectionType;

    if (facilityId) {
      params.append('facility_id', facilityId);
    } else if (effectiveFacilityTypeId) {
      params.append('facility_type_id', effectiveFacilityTypeId);
    }
    if (effectiveDepartmentId) {
      params.append('department_id', effectiveDepartmentId);
    }
    if (effectiveInspectionTypeId) {
      params.append('inspection_type_id', effectiveInspectionTypeId);
    }

    return `${url}${params.toString()}`;
  };

  const fetchStandardsData = async (facilityTypeOverride, departmentOverride, inspectionTypeOverride) => {
    const response = await fetch(buildStandardsUrl(facilityTypeOverride, departmentOverride, inspectionTypeOverride), {
      headers: { "Authorization": `Token ${user.token}` }
    });

    if (!response.ok) return [];

    const data = await response.json();
    if (Array.isArray(data)) return onlyActiveStandards(data);
    if (data && Array.isArray(data.standards)) return onlyActiveStandards(data.standards);
    return [];
  };

  const findFirstStandardsMatch = async (facilityTypeOverride, depts, types) => {
    for (const type of types) {
      for (const dept of depts) {
        const standardsData = await fetchStandardsData(facilityTypeOverride, dept.id, type.id);
        if (standardsData.length > 0) {
          return {
            departmentId: dept.id,
            inspectionTypeId: type.id,
            standards: standardsData,
          };
        }
      }
    }
    return null;
  };

  const loadStandardsIntoForm = (standardsData) => {
    setStandards(standardsData);

    const initialAnswers = {};
    const initialImages = {};
    standardsData.forEach(standard => {
      if (standard.requirements) {
        standard.requirements.forEach(req => {
          initialAnswers[req.id] = {
            criteria_scores: {},
            comment: ""
          };
          initialImages[req.id] = [];
          const criteriaItems = getCriteriaItems(req);
          if (criteriaItems.length > 0) {
            criteriaItems.forEach(criterion => {
              initialAnswers[req.id].criteria_scores[criterion.name] = false;
            });
          }
        });
      }
    });
    setAnswers(initialAnswers);
    setImages(initialImages);
    setCurrentStandardIndex(0);
    setCurrentRequirementIndex(0);
  };

  const fetchRequirements = async (facilityTypeOverride, departmentOverride, inspectionTypeOverride) => {
    try {
      console.log("Fetching pre-inspection requirements...");
      setLoadingStandards(true);
      const url = buildStandardsUrl(facilityTypeOverride, departmentOverride, inspectionTypeOverride);
      console.log("ðŸ“¡ Fetching from:", url);
      
      const response = await fetch(url, {
        headers: { "Authorization": `Token ${user.token}` }
      });
      
      console.log("ðŸ“¡ Response status:", response.status);
      
      if (!response.ok) {
        console.error("âŒ Failed to load requirements:", response.status);
        setError("Failed to load inspection requirements");
        showToast("Failed to load inspection requirements", "error");
        return;
      }
      
      const data = await response.json();
      console.log("âœ… Data loaded:", data);
      
      // âœ… FIX: Handle both array and object responses
      let standardsData = [];
      if (Array.isArray(data)) {
        standardsData = data;
      } else if (data && data.standards && Array.isArray(data.standards)) {
        standardsData = data.standards;
      } else {
        console.warn("âš ï¸ Unexpected data format:", data);
        standardsData = [];
      }

      standardsData = onlyActiveStandards(standardsData);
      
      if (standardsData.length === 0) {
        setError("No standards available for pre-inspection");
        setStandards([]);
        showToast("No standards available", "info");
        setLoadingStandards(false);
        return;
      }
      
      loadStandardsIntoForm(standardsData);
      setLoadingStandards(false);
      
    } catch (error) {
      console.error("âŒ Error fetching requirements:", error);
      setError("Network error. Please check your connection.");
      showToast("Network error", "error");
      setLoadingStandards(false);
    }
  };


  const handleDepartmentChange = async (departmentId) => {
    setSelectedDepartment(departmentId);
    setStandards([]);
    setAnswers({});
    setImages({});
    setCurrentStandardIndex(0);
    setCurrentRequirementIndex(0);
    setError("");

    if (departmentId && selectedInspectionType) {
      await fetchRequirements(facilityTypeId, departmentId, selectedInspectionType);
    }
  };

  const handleInspectionTypeChange = async (inspectionTypeId) => {
    setSelectedInspectionType(inspectionTypeId);
    setStandards([]);
    setAnswers({});
    setImages({});
    setCurrentStandardIndex(0);
    setCurrentRequirementIndex(0);
    setError("");

    if (selectedDepartment && inspectionTypeId) {
      await fetchRequirements(facilityTypeId, selectedDepartment, inspectionTypeId);
    }
  };
  const handleCriterionToggle = (reqId, criterionName) => {
    setAnswers(prev => ({
      ...prev,
      [reqId]: {
        ...prev[reqId],
        criteria_scores: {
          ...prev[reqId].criteria_scores,
          [criterionName]: !prev[reqId].criteria_scores[criterionName]
        }
      }
    }));
  };

  const handleCommentChange = (reqId, comment) => {
    setAnswers(prev => ({
      ...prev,
      [reqId]: {
        ...prev[reqId],
        comment: comment
      }
    }));
  };

  const handleImageUpload = (reqId, event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => ({
          ...prev,
          [reqId]: [...(prev[reqId] || []), reader.result]
        }));
      };
      reader.readAsDataURL(file);
    }
    event.target.value = '';
  };

  const handleRemoveImage = (reqId, index) => {
    setImages(prev => ({
      ...prev,
      [reqId]: prev[reqId].filter((_, i) => i !== index)
    }));
  };

  const calculateRequirementScore = (reqId) => {
    const answer = answers[reqId];
    if (!answer) return 0;
    const requirement = getRequirementById(reqId);
    const criteriaItems = getCriteriaItems(requirement);
    return criteriaItems.reduce((score, criterion) => {
      return score + (answer.criteria_scores[criterion.name] ? (Number(criterion.points) || 1) : 0);
    }, 0);
  };

  const getRequirementPossibleScore = (reqId) => {
    const requirement = getRequirementById(reqId);
    if (!requirement) return 0;
    const criteriaItems = getCriteriaItems(requirement);
    if (criteriaItems.length > 0) {
      return criteriaItems.reduce((total, criterion) => total + (Number(criterion.points) || 1), 0);
    }
    return Number(requirement.max_score) || 0;
  };

  const getRequirementById = (reqId) => {
    for (const standard of standards) {
      if (standard.requirements) {
        const req = standard.requirements.find(r => r.id === reqId);
        if (req) return req;
      }
    }
    return null;
  };

  const isRequirementComplete = (reqId) => {
    const answer = answers[reqId];
    if (!answer) return false;
    const requirement = getRequirementById(reqId);
    if (!requirement) return false;
    const criteria = getCriteriaItems(requirement);
    if (criteria.length === 0) return false;
    const checkedCount = Object.values(answer.criteria_scores).filter(v => v).length;
    return checkedCount === criteria.length;
  };

  const isRequirementPartial = (reqId) => {
    const answer = answers[reqId];
    if (!answer) return false;
    const checkedCount = Object.values(answer.criteria_scores).filter(v => v).length;
    const requirement = getRequirementById(reqId);
    if (!requirement) return false;
    const criteria = getCriteriaItems(requirement);
    if (criteria.length === 0) return false;
    return checkedCount > 0 && checkedCount < criteria.length;
  };

  const getTotalRequirements = () => {
    let total = 0;
    standards.forEach(s => {
      if (s.requirements) total += s.requirements.length;
    });
    return total;
  };

  const getCompletedRequirements = () => {
    let completed = 0;
    standards.forEach(s => {
      if (s.requirements) {
        s.requirements.forEach(req => {
          if (isRequirementComplete(req.id)) completed++;
        });
      }
    });
    return completed;
  };

  const getCurrentRequirement = () => {
    if (!standards.length) return null;
    const standard = standards[currentStandardIndex];
    if (!standard) return null;
    if (!standard.requirements || standard.requirements.length === 0) return null;
    return standard.requirements[currentRequirementIndex] || null;
  };

  const getCurrentStandard = () => {
    return standards[currentStandardIndex] || null;
  };

  const getTotalSteps = () => {
    let total = 0;
    standards.forEach(s => {
      if (s.requirements) total += s.requirements.length;
    });
    return total;
  };

  const getCurrentStepNumber = () => {
    let step = 0;
    for (let i = 0; i < currentStandardIndex; i++) {
      if (standards[i] && standards[i].requirements) {
        step += standards[i].requirements.length;
      }
    }
    step += currentRequirementIndex + 1;
    return step;
  };

  const goToNextRequirement = () => {
    const currentStandard = getCurrentStandard();
    if (!currentStandard) return;
    
    if (currentRequirementIndex < currentStandard.requirements.length - 1) {
      setCurrentRequirementIndex(currentRequirementIndex + 1);
    } else if (currentStandardIndex < standards.length - 1) {
      setCurrentStandardIndex(currentStandardIndex + 1);
      setCurrentRequirementIndex(0);
    }
    setError("");
  };

  const goToPreviousRequirement = () => {
    if (currentRequirementIndex > 0) {
      setCurrentRequirementIndex(currentRequirementIndex - 1);
    } else if (currentStandardIndex > 0) {
      setCurrentStandardIndex(currentStandardIndex - 1);
      const prevStandard = standards[currentStandardIndex - 1];
      if (prevStandard && prevStandard.requirements) {
        setCurrentRequirementIndex(prevStandard.requirements.length - 1);
      }
    }
  };

  const selectStandard = (index) => {
    setCurrentStandardIndex(index);
    setCurrentRequirementIndex(0);
    setShowStandardDropdown(false);
  };

  const handleSubmit = async () => {
    if (!selectedDepartment) {
      setError("Please select a department");
      showToast("Please select a department", "warning");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const formattedAnswers = {};
      Object.keys(answers).forEach(reqId => {
        const answer = answers[reqId];
        const score = calculateRequirementScore(parseInt(reqId));
        formattedAnswers[reqId] = {
          score: score,
          max_score_possible: getRequirementPossibleScore(parseInt(reqId)),
          comment: answer.comment || "",
          criteria_scores: answer.criteria_scores,
          images: images[reqId] || []
        };
      });

      const response = await fetch(`${API_BASE}/inspections/pre-inspection/${facilityId}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${user.token}`
        },
        body: JSON.stringify({
          department_id: parseInt(selectedDepartment),
          inspection_type_id: parseInt(selectedInspectionType),
          answers: formattedAnswers,
          notes: ""
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSuccessData(data);
        setShowSuccessModal(true);
        showToast("Pre-inspection submitted successfully!", "success");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to save pre-inspection");
        showToast(errorData.error || "Failed to save pre-inspection", "error");
      }
    } catch (error) {
      console.error("Error submitting pre-inspection:", error);
      setError("Network error. Please try again.");
      showToast("Network error. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    if (onComplete) onComplete(successData);
    onClose();
  };

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto p-4">
        <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="text-gray-600 mt-4 text-center">Loading inspection requirements...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div 
        className="fixed inset-0 flex items-center justify-center z-50"
        style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)' }}
      >
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 text-center">{error}</p>
          <button 
            onClick={() => {
              setError("");
              setLoading(true);
              fetchAllData();
            }} 
            className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            Retry
          </button>
          <button 
            onClick={onClose}
            className="mt-2 w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!standards || standards.length === 0) {
    return (
      <div 
        className="fixed inset-0 flex items-center justify-center z-50"
        style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)' }}
      >
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 text-center">No Standards Available</h3>
          <p className="text-gray-500 text-center mt-2 text-sm">
            No inspection standards have been configured for this facility type and department.
          </p>
          <p className="text-gray-400 text-center mt-1 text-xs">
            Please contact your administrator to add standards.
          </p>
          <button 
            onClick={onClose}
            className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const currentReq = getCurrentRequirement();
  const currentStandard = getCurrentStandard();
  const totalSteps = getTotalSteps();
  const currentStep = getCurrentStepNumber();
  const isComplete = currentReq ? isRequirementComplete(currentReq.id) : false;
  const isPartial = currentReq ? isRequirementPartial(currentReq.id) : false;
  const completedRequirements = getCompletedRequirements();
  const totalRequirements = getTotalRequirements();

  return (
    <>
      {/* Main Modal */}
      <div 
        className="fixed inset-0 flex items-center justify-center z-50 overflow-y-auto p-4"
        style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)' }}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-[750px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
          
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 rounded-t-2xl z-10">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  Pre-Inspection
                </h2>
                <p className="text-green-100 text-sm">
                  {facilityInfo.name || "Select Facility"} â€¢ Step {currentStep} of {totalSteps || 1}
                </p>
              </div>
              <button onClick={onClose} className="text-white hover:text-gray-200 transition">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="px-6 pt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Overall Progress</span>
              <span>{totalRequirements > 0 ? Math.round((completedRequirements / totalRequirements) * 100) : 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${totalRequirements > 0 ? (completedRequirements / totalRequirements) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          {/* Department & Standard Selection */}
          <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-500" />
                <select
                  value={selectedDepartment}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedInspectionType}
                  onChange={(e) => handleInspectionTypeChange(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                  disabled={!selectedDepartment || inspectionTypes.length === 0}
                >
                  <option value="">Select Inspection Type</option>
                  {inspectionTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>
              <div className="relative flex-1">
                <button
                  onClick={() => setShowStandardDropdown(!showStandardDropdown)}
                  className="w-full flex items-center justify-between px-3 py-1.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition text-sm"
                  disabled={!selectedDepartment || !selectedInspectionType || !standards.length || loadingStandards}
                >
                  <span className="text-gray-700">
                    {loadingStandards ? "Loading standards..." : currentStandard ? currentStandard.name : "Select Standard"}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showStandardDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showStandardDropdown && standards.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                    {standards.map((standard, index) => (
                      <button
                        key={standard.id}
                        onClick={() => selectStandard(index)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-green-50 transition flex items-center justify-between ${
                          currentStandardIndex === index ? 'bg-green-50 text-green-700' : 'text-gray-700'
                        }`}
                      >
                        <span>{standard.name}</span>
                        {currentStandardIndex === index && <CheckCircle className="w-4 h-4 text-green-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Requirement Content */}
          {currentReq && currentStandard ? (
            <div className="p-6">
              <div className="mb-4">
                <div className="flex items-center gap-2 text-sm text-green-600 mb-1">
                  <FileText className="w-4 h-4" />
                  <span>{currentStandard.name}</span>
                  <span className="text-gray-300">|</span>
                  <span className="text-gray-500">Requirement {currentRequirementIndex + 1} of {currentStandard.requirements.length}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {currentReq.name}
                </h3>
                <p className="text-sm text-gray-500">{currentReq.description}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-gray-400">
                    Criteria: {getCriteriaItems(currentReq).length}
                  </span>
                  {isComplete && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Complete
                    </span>
                  )}
                  {isPartial && !isComplete && (
                    <span className="text-xs text-yellow-600 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Partially Complete
                    </span>
                  )}
                </div>
              </div>

              {/* Criteria Checkboxes */}
              <div className="space-y-2 mb-4">
                {getCriteriaItems(currentReq).map((criterion, idx) => {
                  const isChecked = answers[currentReq.id]?.criteria_scores[criterion.name] || false;
                  
                  return (
                    <label key={idx} className={`flex items-center gap-3 cursor-pointer p-2.5 rounded-lg transition ${
                      isChecked ? 'bg-green-50 border border-green-200' : 'hover:bg-gray-50 border border-transparent'
                    }`}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleCriterionToggle(currentReq.id, criterion.name)}
                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700 flex-1">{criterion.name}</span>
                      <span className="text-xs text-gray-400">{criterion.points || 0} pts</span>
                      {isChecked && <CheckCircle className="w-4 h-4 text-green-600" />}
                    </label>
                  );
                })}
              </div>

              {/* Comment & Image Upload */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes / Evidence
                  </label>
                  <input
                    type="text"
                    placeholder="Add observations or evidence notes (optional)"
                    value={answers[currentReq.id]?.comment || ""}
                    onChange={(e) => handleCommentChange(currentReq.id, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 placeholder-gray-400"
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Evidence Photos
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition text-sm text-gray-600"
                    >
                      <Camera className="w-4 h-4" />
                      Add Photo
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(currentReq.id, e)}
                      className="hidden"
                    />
                  </div>
                  {images[currentReq.id]?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {images[currentReq.id].map((img, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={img}
                            alt={`Evidence ${index + 1}`}
                            className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            onClick={() => handleRemoveImage(currentReq.id, index)}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Requirement Navigation */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={goToPreviousRequirement}
                    disabled={currentStep === 1}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition flex items-center gap-1 text-sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <span className="text-xs text-gray-400">
                    {currentStep} of {totalSteps}
                  </span>
                </div>
                <button
                  onClick={goToNextRequirement}
                  disabled={currentStep === totalSteps}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 text-sm ${
                    currentStep === totalSteps
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {error && (
                <div className="mt-3 text-sm text-red-600 flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No requirements available for this standard</p>
            </div>
          )}

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 px-6 py-3 border-t border-gray-200 rounded-b-2xl flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Award className="w-4 h-4" />
              <span>{completedRequirements} of {totalRequirements} completed</span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedDepartment || !selectedInspectionType || totalRequirements === 0}
              className={`px-6 py-2 rounded-lg transition flex items-center gap-2 ${
                submitting || !selectedDepartment || !selectedInspectionType || totalRequirements === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Pre-Inspection
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && successData && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-[60]"
          style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)' }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Pre-Inspection Submitted! ðŸŽ‰</h3>
            <p className="text-gray-600 mb-4">
              Your pre-inspection has been saved successfully.
            </p>
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-2">
                <span className="text-sm text-gray-500">Score</span>
                <span className={`text-xl font-bold ${
                  successData.percentage >= 80 ? "text-green-600" :
                  successData.percentage >= 50 ? "text-yellow-600" : "text-red-600"
                }`}>
                  {successData.percentage}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Status</span>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                  successData.percentage >= 80 ? "bg-green-100 text-green-700" :
                  successData.percentage >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                }`}>
                  {successData.percentage >= 80 ? "Excellent" :
                   successData.percentage >= 50 ? "Good" : "Needs Improvement"}
                </span>
              </div>
            </div>
            <button
              onClick={handleSuccessClose}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </>
  );
}



