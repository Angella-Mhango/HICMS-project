// frontend/src/components/ManageStandardsModal.jsx
import { useState, useEffect } from "react";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Plus,
  Edit2,
  Archive,
  CheckCircle,
  AlertCircle,
  Save,
  Eye,
  EyeOff,
  Layers,
  List,
  ClipboardList,
  Building2,
  FileText,
  Users,
  RotateCcw
} from "lucide-react";
import { showToast } from "./Toast";

const API_BASE = "http://127.0.0.1:8000";

export default function ManageStandardsModal({ user, onClose, onStandardsUpdated }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [standards, setStandards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedStandard, setSelectedStandard] = useState(null);
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  
  // Data from API
  const [facilityTypes, setFacilityTypes] = useState([]);
  const [inspectionTypes, setInspectionTypes] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  // Form states
  const [newStandard, setNewStandard] = useState({ 
    name: "", 
    description: "", 
    ideal_status: "",
    max_score: 5, 
    order: 0,
    category: "general",
    facility_type_id: "",
    inspection_type_id: "",
    is_active: true
  });
  const [newRequirement, setNewRequirement] = useState({ 
    name: "", 
    description: "", 
    max_score: 5, 
    order: 0,
    department_ids: []
  });
  const [newCriterion, setNewCriterion] = useState({ name: "", description: "", points: 1.0, order: 0 });
  
  // Editing states
  const [editingStandardId, setEditingStandardId] = useState(null);
  const [editingRequirementId, setEditingRequirementId] = useState(null);
  const [editingCriterionId, setEditingCriterionId] = useState(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiveType, setArchiveType] = useState("");

  const CATEGORY_OPTIONS = [
    { value: "general", label: "General Information" },
    { value: "building", label: "Building & Infrastructure" },
    { value: "reception", label: "Reception & Waiting Area" },
    { value: "consultation", label: "Consultation Room" },
    { value: "treatment", label: "Treatment/Emergency Room" },
    { value: "dressing", label: "Dressing Room" },
    { value: "staffing", label: "Staffing" },
    { value: "wards", label: "Wards" },
    { value: "maternity", label: "Maternity Services" },
    { value: "pharmacy", label: "Pharmacy" },
    { value: "laboratory", label: "Laboratory" },
    { value: "theatre", label: "Operating Theatre" },
    { value: "dental", label: "Dental Services" },
    { value: "laundry", label: "Laundry Services" },
    { value: "epi", label: "EPI/Immunization" },
    { value: "waste_management", label: "Waste Management" },
    { value: "ipc", label: "Infection Prevention & Control" },
  ];

  const steps = [
    { id: "standards", label: "Standards", icon: Layers },
    { id: "requirements", label: "Requirements", icon: List },
    { id: "criteria", label: "Criteria", icon: ClipboardList }
  ];

  // ============ API CALLS ============
  
  useEffect(() => {
    fetchStandards();
    fetchFacilityTypes();
    fetchInspectionTypes();
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (selectedStandard) {
      const updated = standards.find(s => s.id === selectedStandard.id);
      if (updated) setSelectedStandard(updated);
    }
  }, [standards]);

  const fetchFacilityTypes = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/standards/facility-types/`, {
        headers: { "Authorization": `Token ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setFacilityTypes(Array.isArray(data) ? data : (data.results || []));
      }
    } catch (error) {
      console.error("Error fetching facility types:", error);
    }
  };

  const fetchInspectionTypes = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/standards/inspection-types/`, {
        headers: { "Authorization": `Token ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setInspectionTypes(Array.isArray(data) ? data : (data.results || []));
      }
    } catch (error) {
      console.error("Error fetching inspection types:", error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/standards/departments/`, {
        headers: { "Authorization": `Token ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDepartments(Array.isArray(data) ? data : (data.results || []));
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
      showToast("Failed to load departments", "error");
    }
  };

  const fetchStandards = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/api/standards/admin/`, {
        headers: { "Authorization": `Token ${user.token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        let standardsData = [];
        if (Array.isArray(data)) {
          standardsData = data;
        } else if (data && data.standards && Array.isArray(data.standards)) {
          standardsData = data.standards;
        } else if (data && data.results && Array.isArray(data.results)) {
          standardsData = data.results;
        } else {
          standardsData = [];
        }
        
        setStandards(standardsData);
        console.log("✅ Standards loaded:", standardsData.length);
        
        if (!selectedStandard && standardsData.length > 0) {
          setSelectedStandard(standardsData[0]);
          if (standardsData[0].requirements && standardsData[0].requirements.length > 0) {
            setSelectedRequirement(standardsData[0].requirements[0]);
          }
        }
      } else if (response.status === 403) {
        setError("You don't have permission to manage standards. Admin access required.");
        showToast("Permission denied. Admin access required.", "error");
      } else {
        setError("Failed to load standards");
        showToast("Failed to load standards", "error");
      }
    } catch (error) {
      console.error("Error fetching standards:", error);
      setError("Network error");
      showToast("Network error", "error");
    } finally {
      setLoading(false);
    }
  };

  // ============ NAVIGATION ============
  const goToStep = (stepIndex) => {
    setCurrentStep(stepIndex);
    setError("");
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setError("");
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setError("");
    }
  };

  // ============ TOGGLE FUNCTIONS ============
  const toggleRequirementDepartment = (deptId) => {
    setNewRequirement(prev => ({
      ...prev,
      department_ids: prev.department_ids.includes(deptId)
        ? prev.department_ids.filter(id => id !== deptId)
        : [...prev.department_ids, deptId]
    }));
  };

  // ============ STANDARD CRUD ============
  
  const startEditStandard = (standard) => {
    setEditingStandardId(standard.id);
    setNewStandard({
      name: standard.name || "",
      description: standard.description || "",
      ideal_status: standard.ideal_status || "",
      category: standard.category || "general",
      max_score: standard.max_score || 5,
      order: standard.order || 0,
      facility_type_id: standard.facility_type?.id || "",
      inspection_type_id: standard.inspection_type?.id || "",
      is_active: standard.is_active !== false
    });
    setCurrentStep(0);
  };

  const cancelEditStandard = () => {
    setEditingStandardId(null);
    resetStandardForm();
  };

  const resetStandardForm = () => {
    setNewStandard({
      name: "",
      description: "",
      ideal_status: "",
      max_score: 5,
      order: 0,
      category: "general",
      facility_type_id: "",
      inspection_type_id: "",
      is_active: true
    });
  };

  const handleCreateStandard = async () => {
    if (!newStandard.name.trim()) {
      setError("Standard name is required");
      showToast("Standard name is required", "warning");
      return;
    }
    if (!newStandard.facility_type_id) {
      setError("Please select a facility type");
      showToast("Please select a facility type", "warning");
      return;
    }
    if (!newStandard.inspection_type_id) {
      setError("Please select an inspection type");
      showToast("Please select an inspection type", "warning");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        name: newStandard.name.trim(),
        description: newStandard.description.trim(),
        ideal_status: newStandard.ideal_status.trim(),
        max_score: parseInt(newStandard.max_score) || 5,
        order: parseInt(newStandard.order) || 0,
        category: newStandard.category,
        facility_type_id: parseInt(newStandard.facility_type_id),
        inspection_type_id: parseInt(newStandard.inspection_type_id),
        is_active: newStandard.is_active
      };

      console.log("📤 Creating standard with payload:", JSON.stringify(payload, null, 2));

      const response = await fetch(`${API_BASE}/api/standards/admin/standard/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${user.token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        await fetchStandards();
        resetStandardForm();
        if (onStandardsUpdated) onStandardsUpdated();
        showToast("Standard created successfully!", "success");
      } else {
        console.error("❌ Create standard error:", data);
        setError(data.error || data.message || "Failed to create standard");
        showToast(data.error || data.message || "Failed to create standard", "error");
      }
    } catch (error) {
      console.error("❌ Network error:", error);
      setError("Network error. Please try again.");
      showToast("Network error. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStandard = async () => {
    if (!newStandard.name.trim()) {
      setError("Standard name is required");
      showToast("Standard name is required", "warning");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        name: newStandard.name.trim(),
        description: newStandard.description.trim(),
        ideal_status: newStandard.ideal_status.trim(),
        max_score: parseInt(newStandard.max_score) || 5,
        order: parseInt(newStandard.order) || 0,
        category: newStandard.category,
        facility_type_id: parseInt(newStandard.facility_type_id),
        inspection_type_id: parseInt(newStandard.inspection_type_id),
        is_active: newStandard.is_active
      };

      console.log("📤 Updating standard with payload:", JSON.stringify(payload, null, 2));

      const response = await fetch(`${API_BASE}/api/standards/admin/standard/${editingStandardId}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${user.token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setEditingStandardId(null);
        resetStandardForm();
        await fetchStandards();
        if (onStandardsUpdated) onStandardsUpdated();
        showToast("Standard updated successfully!", "success");
      } else {
        console.error("❌ Update standard error:", data);
        setError(data.error || data.message || "Failed to update standard");
        showToast(data.error || data.message || "Failed to update standard", "error");
      }
    } catch (error) {
      console.error("❌ Network error:", error);
      setError("Network error. Please try again.");
      showToast("Network error. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const archiveStandard = async (standardId) => {
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/api/standards/admin/standard/${standardId}/archive/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${user.token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setShowArchiveConfirm(false);
        setArchiveTarget(null);
        await fetchStandards();
        if (onStandardsUpdated) onStandardsUpdated();
        showToast(data.is_active ? "Standard restored successfully!" : "Standard archived successfully!", "success");
      } else {
        showToast(data.error || "Failed to archive/restore standard", "error");
      }
    } catch (error) {
      setError("Network error");
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  };

  // ============ REQUIREMENT CRUD ============
  
  const startEditRequirement = (req) => {
    setEditingRequirementId(req.id);
    setNewRequirement({
      name: req.name || "",
      description: req.description || "",
      max_score: req.max_score || 5,
      order: req.order || 0,
      department_ids: req.department_ids || []
    });
    setCurrentStep(1);
  };

  const cancelEditRequirement = () => {
    setEditingRequirementId(null);
    resetRequirementForm();
  };

  const resetRequirementForm = () => {
    setNewRequirement({
      name: "",
      description: "",
      max_score: 5,
      order: 0,
      department_ids: []
    });
  };

  const handleCreateRequirement = async () => {
    if (!newRequirement.name.trim()) {
      setError("Requirement name is required");
      showToast("Requirement name is required", "warning");
      return;
    }
    if (!selectedStandard) {
      setError("Please select a standard first");
      showToast("Please select a standard first", "warning");
      return;
    }
    if (newRequirement.department_ids.length === 0) {
      setError("Please select at least one department");
      showToast("Please select at least one department", "warning");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        name: newRequirement.name.trim(),
        description: newRequirement.description.trim(),
        max_score: parseInt(newRequirement.max_score) || 5,
        order: parseInt(newRequirement.order) || 0,
        standard_id: selectedStandard.id,
        department_ids: newRequirement.department_ids.map(id => parseInt(id)),
        criteria: { items: [], max_score: parseInt(newRequirement.max_score) || 5 },
        is_active: true
      };

      console.log("📤 Creating requirement with payload:", JSON.stringify(payload, null, 2));

      const response = await fetch(`${API_BASE}/api/standards/admin/requirement/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${user.token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        resetRequirementForm();
        await fetchStandards();
        if (onStandardsUpdated) onStandardsUpdated();
        showToast("Requirement created successfully!", "success");
      } else {
        console.error("❌ Create requirement error:", data);
        setError(data.error || data.message || "Failed to create requirement");
        showToast(data.error || data.message || "Failed to create requirement", "error");
      }
    } catch (error) {
      console.error("❌ Network error:", error);
      setError("Network error. Please try again.");
      showToast("Network error. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRequirement = async () => {
    if (!newRequirement.name.trim()) {
      setError("Requirement name is required");
      showToast("Requirement name is required", "warning");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        name: newRequirement.name.trim(),
        description: newRequirement.description.trim(),
        max_score: parseInt(newRequirement.max_score) || 5,
        order: parseInt(newRequirement.order) || 0,
        standard_id: selectedStandard.id,
        department_ids: newRequirement.department_ids.map(id => parseInt(id)),
        criteria: selectedRequirement?.criteria || { items: [], max_score: parseInt(newRequirement.max_score) || 5 },
        is_active: true
      };

      console.log("📤 Updating requirement with payload:", JSON.stringify(payload, null, 2));

      const response = await fetch(`${API_BASE}/api/standards/admin/requirement/${editingRequirementId}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${user.token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setEditingRequirementId(null);
        resetRequirementForm();
        await fetchStandards();
        if (onStandardsUpdated) onStandardsUpdated();
        showToast("Requirement updated successfully!", "success");
      } else {
        console.error("❌ Update requirement error:", data);
        setError(data.error || data.message || "Failed to update requirement");
        showToast(data.error || data.message || "Failed to update requirement", "error");
      }
    } catch (error) {
      console.error("❌ Network error:", error);
      setError("Network error. Please try again.");
      showToast("Network error. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const archiveRequirement = async (requirementId) => {
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/api/standards/admin/requirement/${requirementId}/archive/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${user.token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setShowArchiveConfirm(false);
        setArchiveTarget(null);
        await fetchStandards();
        if (onStandardsUpdated) onStandardsUpdated();
        showToast(data.is_active ? "Requirement restored successfully!" : "Requirement archived successfully!", "success");
      } else {
        showToast(data.error || "Failed to archive/restore requirement", "error");
      }
    } catch (error) {
      setError("Network error");
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  };

  // ============ CRITERION CRUD ============
  
  const startEditCriterion = (index) => {
    const criteria = selectedRequirement?.criteria?.items || [];
    const criterion = criteria[index];
    if (!criterion) return;
    
    setEditingCriterionId(index);
    setNewCriterion({
      name: criterion.name || "",
      description: criterion.description || "",
      points: criterion.points || 1.0,
      order: criterion.order || 0
    });
  };

  const cancelEditCriterion = () => {
    setEditingCriterionId(null);
    setNewCriterion({ name: "", description: "", points: 1.0, order: 0 });
  };

  const handleCreateCriterion = async () => {
    if (!newCriterion.name.trim()) {
      setError("Criterion name is required");
      showToast("Criterion name is required", "warning");
      return;
    }
    if (!selectedRequirement) {
      setError("Please select a requirement first");
      showToast("Please select a requirement first", "warning");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const currentCriteria = selectedRequirement.criteria || { items: [], max_score: selectedRequirement.max_score || 5 };
      const currentItems = Array.isArray(currentCriteria.items) ? currentCriteria.items : [];
      
      const updatedCriteria = {
        ...currentCriteria,
        items: [
          ...currentItems,
          {
            name: newCriterion.name.trim(),
            description: newCriterion.description.trim() || "",
            points: parseFloat(newCriterion.points) || 1.0,
            order: parseInt(newCriterion.order) || 0
          }
        ]
      };

      const payload = {
        name: selectedRequirement.name,
        description: selectedRequirement.description || "",
        max_score: selectedRequirement.max_score,
        order: selectedRequirement.order || 0,
        standard_id: selectedStandard.id,
        criteria: updatedCriteria,
        department_ids: selectedRequirement.department_ids || [],
        is_active: selectedRequirement.is_active !== false
      };

      console.log("📤 Adding criterion with payload:", JSON.stringify(payload, null, 2));

      const response = await fetch(`${API_BASE}/api/standards/admin/requirement/${selectedRequirement.id}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${user.token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setNewCriterion({ name: "", description: "", points: 1.0, order: 0 });
        await fetchStandards();
        if (onStandardsUpdated) onStandardsUpdated();
        showToast("Criterion added successfully!", "success");
      } else {
        console.error("❌ Create criterion error:", data);
        setError(data.error || data.message || "Failed to create criterion");
        showToast(data.error || data.message || "Failed to create criterion", "error");
      }
    } catch (error) {
      console.error("❌ Network error:", error);
      setError("Network error. Please try again.");
      showToast("Network error. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCriterion = async () => {
    if (editingCriterionId === null) return;
    
    const criteria = selectedRequirement?.criteria?.items || [];
    const criterion = criteria[editingCriterionId];
    if (!criterion) return;

    setSaving(true);
    setError("");

    try {
      const currentCriteria = selectedRequirement.criteria || { items: [], max_score: selectedRequirement.max_score || 5 };
      const updatedItems = [...(Array.isArray(currentCriteria.items) ? currentCriteria.items : [])];
      
      if (updatedItems[editingCriterionId]) {
        updatedItems[editingCriterionId] = {
          name: newCriterion.name.trim(),
          description: newCriterion.description.trim() || "",
          points: parseFloat(newCriterion.points) || 1.0,
          order: parseInt(newCriterion.order) || 0
        };
      }

      const updatedCriteria = {
        ...currentCriteria,
        items: updatedItems
      };

      const payload = {
        name: selectedRequirement.name,
        description: selectedRequirement.description || "",
        max_score: selectedRequirement.max_score,
        order: selectedRequirement.order || 0,
        standard_id: selectedStandard.id,
        criteria: updatedCriteria,
        department_ids: selectedRequirement.department_ids || [],
        is_active: selectedRequirement.is_active !== false
      };

      console.log("📤 Updating criterion with payload:", JSON.stringify(payload, null, 2));

      const response = await fetch(`${API_BASE}/api/standards/admin/requirement/${selectedRequirement.id}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${user.token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setEditingCriterionId(null);
        setNewCriterion({ name: "", description: "", points: 1.0, order: 0 });
        await fetchStandards();
        if (onStandardsUpdated) onStandardsUpdated();
        showToast("Criterion updated successfully!", "success");
      } else {
        console.error("❌ Update criterion error:", data);
        setError(data.error || data.message || "Failed to update criterion");
        showToast(data.error || data.message || "Failed to update criterion", "error");
      }
    } catch (error) {
      console.error("❌ Network error:", error);
      setError("Network error. Please try again.");
      showToast("Network error. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveCriterion = async (criterionIndex) => {
    const criteria = selectedRequirement?.criteria?.items || [];
    const criterion = criteria[criterionIndex];
    if (!criterion) return;

    setSaving(true);
    setError("");

    try {
      const currentCriteria = selectedRequirement.criteria || { items: [], max_score: selectedRequirement.max_score || 5 };
      const updatedItems = currentCriteria.items.filter((_, idx) => idx !== criterionIndex);

      const updatedCriteria = {
        ...currentCriteria,
        items: updatedItems
      };

      const payload = {
        name: selectedRequirement.name,
        description: selectedRequirement.description || "",
        max_score: selectedRequirement.max_score,
        order: selectedRequirement.order || 0,
        standard_id: selectedStandard.id,
        criteria: updatedCriteria,
        department_ids: selectedRequirement.department_ids || [],
        is_active: selectedRequirement.is_active !== false
      };

      console.log("📤 Removing criterion with payload:", JSON.stringify(payload, null, 2));

      const response = await fetch(`${API_BASE}/api/standards/admin/requirement/${selectedRequirement.id}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${user.token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setShowArchiveConfirm(false);
        setArchiveTarget(null);
        await fetchStandards();
        if (onStandardsUpdated) onStandardsUpdated();
        showToast("Criterion removed successfully!", "success");
      } else {
        console.error("❌ Remove criterion error:", data);
        setError(data.error || data.message || "Failed to remove criterion");
        showToast(data.error || data.message || "Failed to remove criterion", "error");
      }
    } catch (error) {
      console.error("❌ Network error:", error);
      setError("Network error. Please try again.");
      showToast("Network error. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="text-gray-600 mt-4 text-center">Loading standards...</p>
        </div>
      </div>
    );
  }

  const CurrentIcon = steps[currentStep].icon;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-[1000px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 rounded-t-2xl z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <CurrentIcon className="w-5 h-5" />
                Manage Inspection Standards
              </h2>
              <p className="text-green-100 text-sm mt-1">
                {steps[currentStep].label} — Step {currentStep + 1} of {steps.length}
              </p>
            </div>
            <button onClick={onClose} className="text-white hover:text-gray-200 transition">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Stepper Navigation */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between relative">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <button
                    onClick={() => goToStep(index)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                      isActive 
                        ? 'bg-green-600 text-white shadow-lg shadow-green-200' 
                        : isCompleted 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
                    {isCompleted && <CheckCircle className="w-4 h-4 text-green-600" />}
                  </button>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${index < currentStep ? 'bg-green-500' : 'bg-gray-300'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* STEP 1: STANDARDS */}
          {currentStep === 0 && (
            <div>
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  {editingStandardId ? (
                    <>
                      <Edit2 className="w-4 h-4 text-yellow-600" />
                      Edit Standard
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-green-600" />
                      Create Standard
                    </>
                  )}
                  {editingStandardId && (
                    <span className="text-xs text-gray-500 ml-2">(Editing existing standard)</span>
                  )}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Facility Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newStandard.facility_type_id}
                      onChange={(e) => setNewStandard(prev => ({ ...prev, facility_type_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                    >
                      <option value="">Select Facility Type</option>
                      {facilityTypes.map(ft => (
                        <option key={ft.id} value={ft.id}>{ft.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Inspection Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newStandard.inspection_type_id}
                      onChange={(e) => setNewStandard(prev => ({ ...prev, inspection_type_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                    >
                      <option value="">Select Inspection Type</option>
                      {inspectionTypes.map(it => (
                        <option key={it.id} value={it.id}>{it.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Standard Name *"
                      value={newStandard.name}
                      onChange={(e) => setNewStandard({ ...newStandard, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Ideal Status"
                      value={newStandard.ideal_status}
                      onChange={(e) => setNewStandard({ ...newStandard, ideal_status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <textarea
                      placeholder="Description"
                      value={newStandard.description}
                      onChange={(e) => setNewStandard({ ...newStandard, description: e.target.value })}
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 resize-none"
                    />
                  </div>
                  <select
                    value={newStandard.category}
                    onChange={(e) => setNewStandard({ ...newStandard, category: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    {CATEGORY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Max Score"
                    value={newStandard.max_score}
                    onChange={(e) => setNewStandard({ ...newStandard, max_score: parseInt(e.target.value) || 5 })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="flex gap-3 mt-3">
                  {editingStandardId && (
                    <button
                      type="button"
                      onClick={cancelEditStandard}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel Editing
                    </button>
                  )}
                  <button
                    onClick={editingStandardId ? handleUpdateStandard : handleCreateStandard}
                    disabled={saving}
                    className={`px-4 py-2 text-white rounded-lg transition flex items-center gap-2 ${
                      saving 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : editingStandardId 
                          ? 'bg-yellow-600 hover:bg-yellow-700' 
                          : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        {editingStandardId ? (
                          <>
                            <Save className="w-4 h-4" />
                            Update Standard
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            Create Standard
                          </>
                        )}
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-medium text-gray-700">Existing Standards</h3>
                {standards.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No standards created yet</p>
                ) : (
                  standards.map((standard) => (
                    <div key={standard.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition">
                      <div className="flex justify-between items-start">
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => {
                            setSelectedStandard(standard);
                            setCurrentStep(1);
                          }}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{standard.code}</span>
                            <h4 className="font-semibold text-gray-800">{standard.name}</h4>
                            <span className="text-xs text-gray-500">(Order: {standard.order})</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              standard.is_active !== false 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-500'
                            }`}>
                              {standard.is_active !== false ? (
                                <>
                                  <CheckCircle className="w-3 h-3" />
                                  Active
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3 h-3" />
                                  Archived
                                </>
                              )}
                            </span>
                          </div>
                          {standard.description && (
                            <p className="text-sm text-gray-500 mt-1">{standard.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-1">
                            {standard.facility_type && (
                              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                                {standard.facility_type.name}
                              </span>
                            )}
                            {standard.inspection_type && (
                              <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                                {standard.inspection_type.name}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            Max Score: {standard.max_score || 5} | Requirements: {standard.requirements?.length || 0}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEditStandard(standard)}
                            className="text-green-600 hover:text-green-800 px-2 py-1 text-sm rounded hover:bg-green-50 transition"
                            title="Edit Standard"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setArchiveTarget(standard);
                              setArchiveType("standard");
                              setShowArchiveConfirm(true);
                            }}
                            className="text-gray-500 hover:text-gray-700 px-2 py-1 text-sm rounded hover:bg-gray-50 transition"
                            title={standard.is_active !== false ? "Archive Standard" : "Restore Standard"}
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedStandard(standard);
                              setCurrentStep(1);
                            }}
                            className="text-blue-500 hover:text-blue-700 px-2 py-1 text-sm rounded hover:bg-blue-50 transition"
                            title="Manage Requirements"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={nextStep}
                  disabled={!selectedStandard}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition flex items-center gap-2"
                >
                  Next: Requirements
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: REQUIREMENTS */}
          {currentStep === 1 && (
            <div>
              <div className="mb-4 flex items-center gap-4">
                <button
                  onClick={prevStep}
                  className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">
                    Managing requirements for: <span className="font-semibold text-gray-800">{selectedStandard?.name}</span>
                  </p>
                </div>
                <select
                  value={selectedStandard?.id || ""}
                  onChange={(e) => {
                    const standard = standards.find(s => s.id === parseInt(e.target.value));
                    setSelectedStandard(standard);
                    setSelectedRequirement(null);
                    if (standard?.requirements?.length > 0) {
                      setSelectedRequirement(standard.requirements[0]);
                    }
                  }}
                  className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                >
                  {standards.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {selectedStandard && (
                <>
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      {editingRequirementId ? (
                        <>
                          <Edit2 className="w-4 h-4 text-yellow-600" />
                          Edit Requirement
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 text-green-600" />
                          Add Requirement to "{selectedStandard.name}"
                        </>
                      )}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Requirement Name *"
                        value={newRequirement.name}
                        onChange={(e) => setNewRequirement({ ...newRequirement, name: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                      <input
                        type="text"
                        placeholder="Description"
                        value={newRequirement.description}
                        onChange={(e) => setNewRequirement({ ...newRequirement, description: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                      <input
                        type="number"
                        placeholder="Max Score (1-10)"
                        value={newRequirement.max_score}
                        onChange={(e) => setNewRequirement({ ...newRequirement, max_score: parseInt(e.target.value) || 5 })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                      <input
                        type="number"
                        placeholder="Order"
                        value={newRequirement.order}
                        onChange={(e) => setNewRequirement({ ...newRequirement, order: parseInt(e.target.value) || 0 })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div className="mt-3 border-t border-gray-200 pt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Users className="w-4 h-4 text-green-600" />
                        Applies To Departments <span className="text-red-500">*</span>
                      </label>
                      <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto bg-gray-50">
                        {departments.length === 0 ? (
                          <p className="text-gray-400 text-center py-2 text-sm">No departments available</p>
                        ) : (
                          departments.map(dept => {
                            const isChecked = newRequirement.department_ids.includes(dept.id);
                            return (
                              <label
                                key={dept.id}
                                className={`flex items-center gap-2 cursor-pointer p-1.5 rounded transition ${
                                  isChecked ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleRequirementDepartment(dept.id)}
                                  className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                                />
                                <span className="text-sm text-gray-700 flex-1">{dept.name}</span>
                                <span className="text-xs text-gray-400">({dept.code})</span>
                                {isChecked && <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />}
                              </label>
                            );
                          })
                        )}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Selected: <span className="font-medium text-gray-700">{newRequirement.department_ids.length}</span> departments
                      </div>
                    </div>

                    <div className="flex gap-3 mt-3">
                      {editingRequirementId && (
                        <button
                          type="button"
                          onClick={cancelEditRequirement}
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Cancel Editing
                        </button>
                      )}
                      <button
                        onClick={editingRequirementId ? handleUpdateRequirement : handleCreateRequirement}
                        disabled={saving}
                        className={`px-4 py-2 text-white rounded-lg transition flex items-center gap-2 ${
                          saving 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : editingRequirementId 
                              ? 'bg-yellow-600 hover:bg-yellow-700' 
                              : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        {saving ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        ) : (
                          <>
                            {editingRequirementId ? (
                              <>
                                <Save className="w-4 h-4" />
                                Update Requirement
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4" />
                                Add Requirement
                              </>
                            )}
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-700">Current Requirements</h3>
                    {selectedStandard.requirements && selectedStandard.requirements.length > 0 ? (
                      selectedStandard.requirements.map((req) => (
                        <div key={req.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-sm transition">
                          <div className="flex justify-between items-start">
                            <div 
                              className="flex-1 cursor-pointer"
                              onClick={() => {
                                setSelectedRequirement(req);
                                setCurrentStep(2);
                              }}
                            >
                              <p className="font-medium text-gray-800">{req.name}</p>
                              <p className="text-xs text-gray-500">Max Score: {req.max_score} | Order: {req.order}</p>
                              {req.description && (
                                <p className="text-xs text-gray-400 mt-1">{req.description}</p>
                              )}
                              <div className="flex flex-wrap gap-1 mt-1">
                                {req.department_ids?.map(deptId => {
                                  const dept = departments.find(d => d.id === deptId);
                                  return dept ? (
                                    <span key={deptId} className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">
                                      {dept.code}
                                    </span>
                                  ) : null;
                                })}
                              </div>
                              {req.criteria?.items && req.criteria.items.length > 0 && (
                                <p className="text-xs text-green-500 mt-1">
                                  📊 {req.criteria.items.length} criteria
                                </p>
                              )}
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                req.is_active !== false 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-gray-100 text-gray-500'
                              }`}>
                                {req.is_active !== false ? 'Active' : 'Archived'}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => startEditRequirement(req)}
                                className="text-green-600 hover:text-green-800 px-2 py-1 text-sm rounded hover:bg-green-50 transition"
                                title="Edit Requirement"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setArchiveTarget(req);
                                  setArchiveType("requirement");
                                  setShowArchiveConfirm(true);
                                }}
                                className="text-gray-500 hover:text-gray-700 px-2 py-1 text-sm rounded hover:bg-gray-50 transition"
                                title={req.is_active !== false ? "Archive Requirement" : "Restore Requirement"}
                              >
                                <Archive className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedRequirement(req);
                                  setCurrentStep(2);
                                }}
                                className="text-blue-500 hover:text-blue-700 px-2 py-1 text-sm rounded hover:bg-blue-50 transition"
                                title="Manage Criteria"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-400 text-center py-4">No requirements yet</p>
                    )}
                  </div>
                </>
              )}

              <div className="mt-6 flex justify-between">
                <button
                  onClick={prevStep}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={nextStep}
                  disabled={!selectedRequirement}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition flex items-center gap-2"
                >
                  Next: Criteria
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CRITERIA */}
          {currentStep === 2 && (
            <div>
              <div className="mb-4 flex items-center gap-4">
                <button
                  onClick={prevStep}
                  className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">
                    Managing criteria for: <span className="font-semibold text-gray-800">{selectedRequirement?.name}</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    Standard: {selectedStandard?.name}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Standard <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedStandard?.id || ""}
                  onChange={(e) => {
                    const standard = standards.find(s => s.id === parseInt(e.target.value));
                    setSelectedStandard(standard || null);
                    setSelectedRequirement(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                >
                  <option value="">Select a Standard</option>
                  {standards.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {selectedStandard && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Requirement <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedRequirement?.id || ""}
                    onChange={(e) => {
                      const req = selectedStandard?.requirements?.find(r => r.id === parseInt(e.target.value));
                      setSelectedRequirement(req || null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                  >
                    <option value="">Select a Requirement</option>
                    {selectedStandard.requirements?.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                  {selectedStandard.requirements?.length === 0 && (
                    <p className="text-xs text-yellow-600 mt-1">
                      No requirements found. Please add requirements first.
                    </p>
                  )}
                </div>
              )}

              {selectedStandard && selectedRequirement ? (
                <>
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      {editingCriterionId !== null ? (
                        <>
                          <Edit2 className="w-4 h-4 text-yellow-600" />
                          Edit Criterion
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 text-green-600" />
                          Add Criterion to "{selectedRequirement.name}"
                        </>
                      )}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Criterion Name *"
                        value={newCriterion.name}
                        onChange={(e) => setNewCriterion({ ...newCriterion, name: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                      <input
                        type="text"
                        placeholder="Description (optional)"
                        value={newCriterion.description}
                        onChange={(e) => setNewCriterion({ ...newCriterion, description: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                      <input
                        type="number"
                        placeholder="Points (0.1 - 10.0)"
                        value={newCriterion.points}
                        onChange={(e) => setNewCriterion({ ...newCriterion, points: parseFloat(e.target.value) || 1.0 })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        step="0.1"
                      />
                      <input
                        type="number"
                        placeholder="Order"
                        value={newCriterion.order}
                        onChange={(e) => setNewCriterion({ ...newCriterion, order: parseInt(e.target.value) || 0 })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    
                    <div className="flex gap-3 mt-3">
                      {editingCriterionId !== null && (
                        <button
                          type="button"
                          onClick={cancelEditCriterion}
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Cancel Editing
                        </button>
                      )}
                      <button
                        onClick={editingCriterionId !== null ? handleUpdateCriterion : handleCreateCriterion}
                        disabled={saving}
                        className={`px-4 py-2 text-white rounded-lg transition flex items-center gap-2 ${
                          saving 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : editingCriterionId !== null
                              ? 'bg-yellow-600 hover:bg-yellow-700' 
                              : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        {saving ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        ) : (
                          <>
                            {editingCriterionId !== null ? (
                              <>
                                <Save className="w-4 h-4" />
                                Update Criterion
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4" />
                                Add Criterion
                              </>
                            )}
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-700">Current Criteria</h3>
                    {selectedRequirement.criteria?.items && selectedRequirement.criteria.items.length > 0 ? (
                      selectedRequirement.criteria.items.map((criterion, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-3 hover:shadow-sm transition">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-800">{criterion.name}</p>
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                  {criterion.points || 1.0} pts
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">Order: {criterion.order || 0}</p>
                              {criterion.description && (
                                <p className="text-xs text-gray-400 mt-1">{criterion.description}</p>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => startEditCriterion(index)}
                                className="text-green-600 hover:text-green-800 px-2 py-1 text-sm rounded hover:bg-green-50 transition"
                                title="Edit Criterion"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setArchiveTarget(index);
                                  setArchiveType("criterion");
                                  setShowArchiveConfirm(true);
                                }}
                                className="text-gray-500 hover:text-gray-700 px-2 py-1 text-sm rounded hover:bg-gray-50 transition"
                                title="Remove Criterion"
                              >
                                <Archive className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-400 text-center py-4">No criteria yet</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Please select a Standard and then a Requirement</p>
                </div>
              )}

              <div className="mt-6 flex justify-between">
                <button
                  onClick={prevStep}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={() => {
                    setCurrentStep(0);
                    setSelectedRequirement(null);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-3 border-t border-gray-200 rounded-b-2xl flex justify-between items-center">
          <span className="text-xs text-gray-400">
            Step {currentStep + 1} of {steps.length}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            Close
          </button>
        </div>
      </div>

      {/* Archive Confirmation Modal */}
      {showArchiveConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              <Archive className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {archiveType === "standard" && (archiveTarget?.is_active !== false ? "Archive Standard?" : "Restore Standard?")}
                {archiveType === "requirement" && (archiveTarget?.is_active !== false ? "Archive Requirement?" : "Restore Requirement?")}
                {archiveType === "criterion" && "Remove Criterion?"}
              </h3>
              <p className="text-gray-600 mb-4">
                {archiveType === "standard" && (
                  archiveTarget?.is_active !== false 
                    ? `This will archive "${archiveTarget?.name}". It will no longer appear in active lists but can be restored later.`
                    : `This will restore "${archiveTarget?.name}" to active status.`
                )}
                {archiveType === "requirement" && (
                  archiveTarget?.is_active !== false
                    ? `This will archive "${archiveTarget?.name}". It will no longer appear in active lists but can be restored later.`
                    : `This will restore "${archiveTarget?.name}" to active status.`
                )}
                {archiveType === "criterion" && (
                  `This will remove "${selectedRequirement?.criteria?.items[archiveTarget]?.name || 'this criterion'}" from the requirement.`
                )}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowArchiveConfirm(false);
                    setArchiveTarget(null);
                    setArchiveType("");
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (archiveType === "standard" && archiveTarget) {
                      archiveStandard(archiveTarget.id);
                    } else if (archiveType === "requirement" && archiveTarget) {
                      archiveRequirement(archiveTarget.id);
                    } else if (archiveType === "criterion" && typeof archiveTarget === "number") {
                      handleArchiveCriterion(archiveTarget);
                    }
                  }}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    "Confirm"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
