// frontend/src/components/InspectionStepper.jsx
import { useState, useEffect, useRef } from "react";
import {
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  AlertCircle,
  ClipboardList,
  Send,
  Clock,
  FileText,
  Award,
  Camera,
  Trash2,
  ChevronDown
} from "lucide-react";
import { showToast } from "./Toast";

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

export default function InspectionStepper({ user, onComplete, onClose, onSubmitted, initialFacilityId, preInspectionId }) {
  const [standards, setStandards] = useState([]);
  const [answers, setAnswers] = useState({});
  const [images, setImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [currentStandardIndex, setCurrentStandardIndex] = useState(0);
  const [currentRequirementIndex, setCurrentRequirementIndex] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState(null);
  
  // Facility and Department selection
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState("");
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [inspectionTypes, setInspectionTypes] = useState([]);
  const [selectedInspectionType, setSelectedInspectionType] = useState("");
  const [showStandardDropdown, setShowStandardDropdown] = useState(false);
  const [facilityTypeId, setFacilityTypeId] = useState(null);
  const [inspectorName, setInspectorName] = useState("");
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingStandards, setLoadingStandards] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setInspectorName(user?.username || "");
    fetchFacilities();
    fetchInspectionTypes();
  }, []);

  // Fetch facilities on mount
  const fetchFacilities = async () => {
    try {
      setLoading(true);
      console.log("📡 Fetching facilities...");
      const response = await fetch(`${API_BASE}/facilities/api/`, {
        headers: { "Authorization": `Token ${user.token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Facilities loaded:", data.length);
        setFacilities(Array.isArray(data) ? data : []);
      } else {
        console.error("❌ Failed to fetch facilities:", response.status);
        setFacilities([]);
        showToast("Failed to load facilities", "error");
      }
    } catch (error) {
      console.error("❌ Error fetching facilities:", error);
      setFacilities([]);
      showToast("Error loading facilities", "error");
    } finally {
      setLoading(false);
    }
  };


  const fetchInspectionTypes = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/standards/inspection-types/`, {
        headers: { "Authorization": `Token ${user.token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setInspectionTypes(Array.isArray(data) ? data : []);
      } else {
        setInspectionTypes([]);
        showToast("Failed to load inspection types", "error");
      }
    } catch (error) {
      console.error("Error fetching inspection types:", error);
      setInspectionTypes([]);
      showToast("Error loading inspection types", "error");
    }
  };
  // When facility is selected, fetch departments
  const handleFacilityChange = async (facilityId) => {
    console.log("🏥 Facility selected:", facilityId);
    setSelectedFacility(facilityId);
    setSelectedDepartment("");
    setSelectedInspectionType("");
    setDepartments([]);
    setStandards([]);
    setAnswers({});
    setImages({});
    setCurrentStandardIndex(0);
    setCurrentRequirementIndex(0);
    setError("");
    setFacilityTypeId(null);
    
    if (!facilityId) return;
    
    const selectedFacility = facilities.find(f => f.id.toString() === facilityId);
    let selectedFacilityTypeId = null;
    if (selectedFacility) {
      if (selectedFacility.facility_type_id) {
        selectedFacilityTypeId = selectedFacility.facility_type_id;
      } else if (selectedFacility.facility_type) {
        selectedFacilityTypeId = selectedFacility.facility_type.id || selectedFacility.facility_type;
      }
      setFacilityTypeId(selectedFacilityTypeId);
    }
    
    setLoadingDepartments(true);
    
    try {
      console.log("📡 Fetching departments for facility:", facilityId);
      const deptResponse = await fetch(`${API_BASE}/facilities/${facilityId}/departments/`, {
        headers: { "Authorization": `Token ${user.token}` }
      });
      
      if (deptResponse.ok) {
        const deptData = await deptResponse.json();
        const depts = Array.isArray(deptData) ? deptData : (deptData.departments || []);
        console.log("✅ Departments loaded:", depts.length);
        setDepartments(depts);
        
        if (depts.length > 0) {
          setLoadingDepartments(false);
        } else {
          setError("No departments found for this facility");
          showToast("No departments found for this facility", "warning");
          setLoadingDepartments(false);
        }
      } else {
        console.error("❌ Failed to fetch departments:", deptResponse.status);
        setError("Failed to load departments");
        showToast("Failed to load departments", "error");
        setLoadingDepartments(false);
      }
    } catch (error) {
      console.error("❌ Error in handleFacilityChange:", error);
      setError("Error loading facility data");
      showToast("Error loading facility data", "error");
      setLoadingDepartments(false);
    }
  };

  // Helper function to extract criteria items from requirement
  const getCriteriaItems = (requirement) => {
    if (!requirement) return null;
    
    const rawCriteria = requirement.criteria;
    console.log(`🔍 Parsing criteria for requirement ${requirement.id}:`, rawCriteria);
    
    // If no criteria object at all
    if (!rawCriteria) {
      console.warn(`� ️ No criteria object found for requirement ${requirement.id}`);
      return null;
    }
    
    let items = [];
    
    // Check if criteria has items array
    if (rawCriteria.items && Array.isArray(rawCriteria.items)) {
      items = rawCriteria.items;
    }
    // Check if criteria is an array
    else if (Array.isArray(rawCriteria)) {
      items = rawCriteria;
    }
    // Check if criteria is an object with key-value pairs
    else if (typeof rawCriteria === 'object') {
      const keys = Object.keys(rawCriteria);
      if (keys.length > 0 && !keys.includes('items') && !keys.includes('max_score')) {
        items = keys.map(key => ({
          name: key,
          points: rawCriteria[key] || 1
        }));
      }
    }
    
    // If no items found, return null (don't use default fallback)
    if (items.length === 0) {
      console.warn(`� ️ No criteria items found for requirement ${requirement.id}`);
      return null;
    }
    
    // Ensure each criterion has a name and points
    items = items.map(item => ({
      name: item.name || item,
      points: item.points || 1
    }));
    
    console.log(`📊 Final criteria for ${requirement.name}:`, items);
    return items;
  };

  // Fetch standards based on selected facility, facility department, and inspection type
  const fetchStandards = async (departmentId = selectedDepartment, inspectionTypeId = selectedInspectionType) => {
    if (!selectedFacility || !departmentId || !inspectionTypeId) {
      setStandards([]);
      setAnswers({});
      setImages({});
      setLoadingDepartments(false);
      setLoadingStandards(false);
      return;
    }

    try {
      setLoadingStandards(true);
      const params = new URLSearchParams({
        facility_id: selectedFacility,
        department_id: departmentId,
        inspection_type_id: inspectionTypeId,
      });
      const url = `${API_BASE}/api/standards/?${params.toString()}`;

      console.log("Fetching standards from:", url);
      
      const response = await fetch(url, {
        headers: { "Authorization": `Token ${user.token}` }
      });
      
      if (!response.ok) {
        console.error("❌ Failed to fetch standards:", response.status);
        setStandards([]);
        setLoadingStandards(false);
        setLoadingDepartments(false);
        return;
      }
      
      const data = await response.json();
      console.log("✅ Standards raw data:", JSON.stringify(data, null, 2));
      
      let standardsData = [];
      if (Array.isArray(data)) {
        standardsData = data;
      } else if (data && data.standards && Array.isArray(data.standards)) {
        standardsData = data.standards;
      } else {
        standardsData = [];
      }

      standardsData = onlyActiveStandards(standardsData);
      
      console.log("📊 Standards parsed:", standardsData.length);
      
      setStandards(standardsData);
      
      if (standardsData.length === 0) {
        setError("No standards found for this facility, department, and inspection type");
        showToast("No standards found for this department", "info");
      } else {
        setError("");
        showToast(`Loaded ${standardsData.length} standards`, "success");
      }
      
      // Initialize answers and images
      const initialAnswers = {};
      const initialImages = {};
      
      let hasCriteria = false;
      
      standardsData.forEach(standard => {
        if (standard.requirements && Array.isArray(standard.requirements)) {
          standard.requirements.forEach(req => {
            initialAnswers[req.id] = {
              criteria_scores: {},
              comment: ""
            };
            initialImages[req.id] = [];
            
            // Get criteria items - will return null if no criteria
            const criteriaItems = getCriteriaItems(req);
            
            if (criteriaItems) {
              hasCriteria = true;
              criteriaItems.forEach(criterion => {
                const name = criterion.name || criterion;
                initialAnswers[req.id].criteria_scores[name] = false;
              });
            }
          });
        }
      });
      
      // If no criteria found anywhere, show a message
      if (!hasCriteria && standardsData.length > 0) {
        setError("� ️ No criteria defined for these requirements. Please add criteria in Manage Standards.");
        showToast("No criteria defined. Please add criteria in Manage Standards.", "warning");
      }
      
      setAnswers(initialAnswers);
      setImages(initialImages);
      setLoadingStandards(false);
      setLoadingDepartments(false);
      
    } catch (error) {
      console.error("❌ Error fetching standards:", error);
      setStandards([]);
      setLoadingStandards(false);
      setLoadingDepartments(false);
      setError("Failed to load standards");
      showToast("Failed to load standards", "error");
    }
  };

  // When department is selected, fetch standards if inspection type is already selected
  const handleDepartmentChange = async (deptId) => {
    console.log("Department selected:", deptId);
    setSelectedDepartment(deptId);
    setError("");
    setStandards([]);
    setAnswers({});
    setImages({});
    setCurrentStandardIndex(0);
    setCurrentRequirementIndex(0);

    if (deptId && selectedInspectionType) {
      await fetchStandards(deptId, selectedInspectionType);
    }
  };

  const handleInspectionTypeChange = async (inspectionTypeId) => {
    setSelectedInspectionType(inspectionTypeId);
    setError("");
    setStandards([]);
    setAnswers({});
    setImages({});
    setCurrentStandardIndex(0);
    setCurrentRequirementIndex(0);

    if (selectedDepartment && inspectionTypeId) {
      await fetchStandards(selectedDepartment, inspectionTypeId);
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
    if (!requirement) return 0;
    
    const criteriaItems = getCriteriaItems(requirement);
    if (!criteriaItems) return 0;
    
    let score = 0;
    criteriaItems.forEach(criterion => {
      const name = criterion.name || criterion;
      if (answer.criteria_scores[name]) {
        score += criterion.points || 1;
      }
    });
    return Math.round(score);
  };

  const getRequirementPossibleScore = (reqId) => {
    const requirement = getRequirementById(reqId);
    if (!requirement) return 0;

    const criteriaItems = getCriteriaItems(requirement);
    if (criteriaItems && criteriaItems.length > 0) {
      return Math.round(criteriaItems.reduce((total, criterion) => total + (Number(criterion.points) || 1), 0));
    }

    return Number(requirement.max_score) || 0;
  };

  const getRequirementById = (reqId) => {
    for (const standard of standards) {
      if (standard.requirements && Array.isArray(standard.requirements)) {
        const req = standard.requirements.find(r => r.id === reqId);
        if (req) return req;
      }
    }
    return null;
  };

  const isRequirementComplete = (reqId) => {
    const answer = answers[reqId];
    // Unchecked criteria represent a score of zero, so they must remain valid
    // responses; otherwise an inspection could only ever be submitted at 100%.
    if (!answer || !answer.criteria_scores) return false;
    const requirement = getRequirementById(reqId);
    if (!requirement) return false;
    
    const criteriaItems = getCriteriaItems(requirement);
    return Boolean(criteriaItems && criteriaItems.length > 0);
  };

  const isRequirementPartial = (reqId) => {
    const answer = answers[reqId];
    if (!answer) return false;
    const requirement = getRequirementById(reqId);
    if (!requirement) return false;
    
    const criteriaItems = getCriteriaItems(requirement);
    if (!criteriaItems || criteriaItems.length === 0) return false;
    
    const checkedCount = Object.values(answer.criteria_scores).filter(v => v).length;
    return checkedCount > 0 && checkedCount < criteriaItems.length;
  };

  const getTotalRequirements = () => {
    let total = 0;
    standards.forEach(s => {
      if (s.requirements && Array.isArray(s.requirements)) {
        total += s.requirements.length;
      }
    });
    return total;
  };

  const getCompletedRequirements = () => {
    let completed = 0;
    standards.forEach(s => {
      if (s.requirements && Array.isArray(s.requirements)) {
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
      if (s.requirements && Array.isArray(s.requirements)) {
        total += s.requirements.length;
      }
    });
    return total;
  };

  const getCurrentStepNumber = () => {
    let step = 0;
    for (let i = 0; i < currentStandardIndex; i++) {
      if (standards[i] && standards[i].requirements && Array.isArray(standards[i].requirements)) {
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
      if (prevStandard && prevStandard.requirements && Array.isArray(prevStandard.requirements)) {
        setCurrentRequirementIndex(prevStandard.requirements.length - 1);
      }
    }
  };

  const selectStandard = (index) => {
    setCurrentStandardIndex(index);
    setCurrentRequirementIndex(0);
    setShowStandardDropdown(false);
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    if (onComplete) onComplete(successData);
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedFacility) {
      setError("Please select a facility");
      showToast("Please select a facility", "warning");
      return;
    }

    if (!selectedDepartment) {
      setError("Please select a department");
      showToast("Please select a department", "warning");
      return;
    }

    if (!selectedInspectionType) {
      setError("Please select an inspection type");
      showToast("Please select an inspection type", "warning");
      return;
    }

    const allComplete = standards.every(standard => 
      standard.requirements && Array.isArray(standard.requirements) &&
      standard.requirements.every(req => isRequirementComplete(req.id))
    );

    if (!allComplete) {
      setError("Please complete all requirements before submitting");
      showToast("Please complete all requirements before submitting", "warning");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const facility = facilities.find(f => f.id.toString() === selectedFacility);
      const facilityName = facility ? facility.name : "";
      const inspectionType = inspectionTypes.find(type => type.id.toString() === selectedInspectionType);

      const responses = [];
      Object.keys(answers).forEach(reqId => {
        const answer = answers[reqId];
        const score = calculateRequirementScore(parseInt(reqId));
        responses.push({
          requirement_id: parseInt(reqId),
          score: score,
          max_score_possible: getRequirementPossibleScore(parseInt(reqId)),
          comments: answer.comment || ""
        });
      });

      const response = await fetch(`${API_BASE}/inspections/submit-standards/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${user.token}`
        },
        body: JSON.stringify({
          facility_name: facilityName,
          facility_id: parseInt(selectedFacility),
          department_id: parseInt(selectedDepartment),
          inspection_type_id: parseInt(selectedInspectionType),
          inspector: inspectorName || user.username,
          visit_type: "Follow-up",
          responses: responses,
          pre_inspection_id: preInspectionId || null
        })
      });

      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await response.json()
        : { error: await response.text() };

      if (response.ok) {
        setSuccessData(data);
        setShowSuccessModal(true);
        if (onSubmitted) onSubmitted(data);
        showToast("Inspection submitted successfully!", "success");
      } else {
        const message = data.error || `Failed to submit inspection (${response.status})`;
        setError(message);
        showToast(message, "error");
      }
    } catch (error) {
      console.error("Error submitting inspection:", error);
      setError("Network error. Please try again.");
      showToast("Network error. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading inspection form...</p>
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
  const selectedFacilityObj = facilities.find(f => f.id.toString() === selectedFacility);
  const criteriaItems = currentReq ? getCriteriaItems(currentReq) : null;
  const hasCriteria = criteriaItems && criteriaItems.length > 0;

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
                  Inspection
                </h2>
                <p className="text-green-100 text-sm">
                  {selectedFacilityObj?.name || "Select Facility"}
                </p>
                {inspectorName && (
                  <p className="text-green-100 text-xs mt-1">Inspector: {inspectorName}</p>
                )}
              </div>
              <button onClick={onClose} className="text-white hover:text-gray-200 transition">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          {standards.length > 0 && (
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
          )}

          {/* Facility, Department & Standard Selection */}
          <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Facility *</label>
                <select
                  value={selectedFacility}
                  onChange={(e) => handleFacilityChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm bg-white"
                >
                  <option value="">Select Facility</option>
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Department *</label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm bg-white"
                  disabled={!selectedFacility || departments.length === 0 || loadingDepartments}
                >
                  <option value="">{loadingDepartments ? "Loading..." : "Select Department"}</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
                {selectedFacility && departments.length === 0 && !loadingDepartments && (
                  <p className="text-xs text-green-600 mt-1">No departments found for this facility</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Inspection Type *</label>
                <select
                  value={selectedInspectionType}
                  onChange={(e) => handleInspectionTypeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm bg-white"
                  disabled={!selectedFacility || !selectedDepartment || inspectionTypes.length === 0}
                >
                  <option value="">Select Type</option>
                  {inspectionTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>


              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Standard</label>
                <button
                  onClick={() => setShowStandardDropdown(!showStandardDropdown)}
                  className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition text-sm"
                  disabled={!selectedFacility || !selectedDepartment || !selectedInspectionType || standards.length === 0 || loadingStandards}
                >
                  <span className="text-gray-700 truncate">
                    {loadingStandards ? "Loading..." : 
                     currentStandard ? currentStandard.name : 
                     standards.length > 0 ? "Select Standard" : 
                     selectedFacility && selectedDepartment && selectedInspectionType ? "No standards available" : "Select facility, department, and type"}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showStandardDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showStandardDropdown && standards.length > 0 && (
                  <div className="absolute mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto w-[calc(25%-8px)]">
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
                {selectedFacility && selectedDepartment && selectedInspectionType && departments.length > 0 && standards.length === 0 && !loadingStandards && (
                  <p className="text-xs text-green-600 mt-1">No standards found for this department and inspection type.</p>
                )}
              </div>
            </div>
            {!selectedFacility && (
              <p className="text-xs text-green-600 mt-2">Please select a facility to begin inspection</p>
            )}
            {error && (
              <p className="text-xs text-red-600 mt-2">{error}</p>
            )}
          </div>

          {/* Requirement Content */}
          {selectedFacility ? (
            standards.length > 0 ? (
              currentReq && currentStandard ? (
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
                        Max Score: {currentReq.max_score || 0} points
                      </span>
                      {isComplete && (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Complete
                        </span>
                      )}
                      {isPartial && !isComplete && (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Partially Complete
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Criteria Checkboxes */}
                  {hasCriteria ? (
                    <div className="space-y-2 mb-4">
                      {criteriaItems.map((criterion, idx) => {
                        const name = criterion.name || criterion;
                        const isChecked = answers[currentReq.id]?.criteria_scores[name] || false;
                        const points = criterion.points || 1;
                        
                        return (
                          <label key={idx} className={`flex items-center gap-3 cursor-pointer p-2.5 rounded-lg transition ${
                            isChecked ? 'bg-green-50 border border-green-200' : 'hover:bg-gray-50 border border-transparent'
                          }`}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleCriterionToggle(currentReq.id, name)}
                              className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                            />
                            <span className="text-sm text-gray-700 flex-1">{name}</span>
                            <span className="text-xs text-gray-400">{points} pts</span>
                            {isChecked && <CheckCircle className="w-4 h-4 text-green-600" />}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 text-center">
                      <AlertCircle className="w-5 h-5 text-green-600 mx-auto mb-2" />
                      <p className="text-sm text-green-700 font-medium">No Criteria Defined</p>
                      <p className="text-xs text-green-600">
                        This requirement doesn't have any criteria configured.
                        Please add criteria in the Manage Standards section.
                      </p>
                    </div>
                  )}

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
              )
            ) : (
              <div className="p-12 text-center">
                <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600">
                  {loadingStandards ? "Loading standards..." : "No Standards Available"}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {loadingStandards ? "Please wait..." : "No inspection standards have been configured for this facility, department, and inspection type."}
                </p>
                {!loadingStandards && (
                  <p className="text-xs text-gray-400 mt-1">
                    Please contact your administrator to add standards.
                  </p>
                )}
              </div>
            )
          ) : (
            <div className="p-12 text-center">
              <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600">Select a Facility to Begin</h3>
              <p className="text-sm text-gray-400 mt-1">Please select a facility and department to start the inspection</p>
            </div>
          )}

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 px-6 py-3 border-t border-gray-200 rounded-b-2xl flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Award className="w-4 h-4" />
              <span>
                {selectedFacility && standards.length > 0 
                  ? `${completedRequirements} of ${totalRequirements} completed` 
                  : selectedFacility 
                    ? "Select department to begin" 
                    : "Select facility to begin"}
              </span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedFacility || !selectedDepartment || !selectedInspectionType || standards.length === 0}
              className={`px-6 py-2 rounded-lg transition flex items-center gap-2 ${
                submitting || !selectedFacility || !selectedDepartment || !selectedInspectionType || standards.length === 0
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
                  Submit Inspection
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
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Inspection Submitted! 🎉</h3>
            <p className="text-gray-600 mb-4">
              Your inspection has been saved successfully.
            </p>
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-2">
                <span className="text-sm text-gray-500">Score</span>
                <span className={`text-xl font-bold ${
                  successData.score >= 80 ? "text-green-600" :
                  successData.score >= 50 ? "text-green-600" : "text-red-600"
                }`}>
                  {successData.score}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Status</span>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                  successData.score >= 80 ? "bg-green-100 text-green-700" :
                  successData.score >= 50 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}>
                  {successData.score >= 80 ? "Compliant" :
                   successData.score >= 50 ? "Partially Compliant" : "Non-Compliant"}
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






