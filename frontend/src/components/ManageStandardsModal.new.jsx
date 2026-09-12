import { useEffect, useState } from "react";
import { X, Plus, Edit2, AlertCircle, Save } from "lucide-react";
import { showToast } from "./Toast";

const API_BASE = "http://127.0.0.1:8000";

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
  { value: "ipc", label: "Infection Prevention & Control" }
];

export default function ManageStandardsModal({ user, onClose, onStandardsUpdated, initialAction = null }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("standard");
  const [standards, setStandards] = useState([]);
  const [facilityTypes, setFacilityTypes] = useState([]);
  const [inspectionTypes, setInspectionTypes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedStandard, setSelectedStandard] = useState(null);
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const [editingStandardId, setEditingStandardId] = useState(null);
  const [editingRequirementId, setEditingRequirementId] = useState(null);
  const [editingCriterionIndex, setEditingCriterionIndex] = useState(null);

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

  const [newCriterion, setNewCriterion] = useState({
    name: "",
    description: "",
    points: 1.0,
    order: 0
  });

  const getCriteriaItems = (requirement) => {
    if (!requirement) return [];
    if (Array.isArray(requirement.criteria_items)) return requirement.criteria_items;
    if (requirement.criteria && Array.isArray(requirement.criteria.items)) return requirement.criteria.items;
    if (Array.isArray(requirement.criteria)) return requirement.criteria;
    return [];
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
    setEditingStandardId(null);
  };

  const resetRequirementForm = () => {
    setNewRequirement({
      name: "",
      description: "",
      max_score: 5,
      order: 0,
      department_ids: []
    });
    setEditingRequirementId(null);
  };

  const resetCriterionForm = () => {
    setNewCriterion({ name: "", description: "", points: 1.0, order: 0 });
    setEditingCriterionIndex(null);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchStandards(), fetchFacilityTypes(), fetchInspectionTypes(), fetchDepartments()]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!initialAction) {
      setActiveTab("standard");
      return;
    }

    if (initialAction.type === "standard") setActiveTab("standard");
    else if (initialAction.type === "requirement") setActiveTab("requirement");
    else if (initialAction.type === "criterion") setActiveTab("criterion");
  }, [initialAction]);

  useEffect(() => {
    if (!standards.length) return;

    const targetStandard = initialAction?.type === "standard"
      ? standards.find((item) => item.id === initialAction.id) || standards[0]
      : standards.find((item) => item.id === initialAction?.standardId) || standards[0];

    if (targetStandard) {
      setSelectedStandard(targetStandard);

      if (initialAction?.type === "standard" && initialAction.id) {
        const standard = standards.find((item) => item.id === initialAction.id);
        if (standard) {
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
        }
      }

      if (initialAction?.type === "requirement" && initialAction.id) {
        const requirement = (targetStandard.requirements || []).find((item) => item.id === initialAction.id);
        if (requirement) {
          setSelectedRequirement(requirement);
          setEditingRequirementId(requirement.id);
          setNewRequirement({
            name: requirement.name || "",
            description: requirement.description || "",
            max_score: requirement.max_score || 5,
            order: requirement.order || 0,
            department_ids: requirement.department_ids || []
          });
        }
      }

      if (initialAction?.type === "criterion" && initialAction.requirementId) {
        const requirement = (targetStandard.requirements || []).find((item) => item.id === initialAction.requirementId);
        if (requirement) {
          setSelectedRequirement(requirement);
          const criteria = getCriteriaItems(requirement);
          if (initialAction.criterionIndex !== undefined && initialAction.criterionIndex !== null && criteria[initialAction.criterionIndex]) {
            const criterion = criteria[initialAction.criterionIndex];
            setNewCriterion({
              name: criterion.name || "",
              description: criterion.description || "",
              points: criterion.points || 1.0,
              order: criterion.order || 0
            });
            setEditingCriterionIndex(initialAction.criterionIndex);
          } else {
            resetCriterionForm();
          }
        }
      }
    }
  }, [standards, initialAction]);

  const fetchStandards = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/standards/admin/`, {
        headers: { Authorization: `Token ${user.token}` }
      });
      if (!response.ok) throw new Error("Failed to load standards");
      const data = await response.json();
      let standardsData = [];
      if (Array.isArray(data)) standardsData = data;
      else if (data && Array.isArray(data.standards)) standardsData = data.standards;
      else if (data && Array.isArray(data.results)) standardsData = data.results;
      setStandards(standardsData);
      return standardsData;
    } catch (err) {
      console.error(err);
      setError("Unable to load standards.");
      showToast("Unable to load standards.", "error");
      return [];
    }
  };

  const fetchFacilityTypes = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/standards/facility-types/`, {
        headers: { Authorization: `Token ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setFacilityTypes(Array.isArray(data) ? data : data.results || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchInspectionTypes = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/standards/inspection-types/`, {
        headers: { Authorization: `Token ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setInspectionTypes(Array.isArray(data) ? data : data.results || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/standards/departments/`, {
        headers: { Authorization: `Token ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDepartments(Array.isArray(data) ? data : data.results || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleRequirementDepartment = (deptId) => {
    setNewRequirement((prev) => ({
      ...prev,
      department_ids: prev.department_ids.includes(deptId)
        ? prev.department_ids.filter((id) => id !== deptId)
        : [...prev.department_ids, deptId]
    }));
  };

  const handleCreateStandard = async () => {
    if (!newStandard.name.trim()) {
      setError("Standard name is required.");
      showToast("Standard name is required.", "warning");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: newStandard.name.trim(),
        description: newStandard.description.trim(),
        ideal_status: newStandard.ideal_status.trim(),
        max_score: parseInt(newStandard.max_score, 10) || 5,
        order: parseInt(newStandard.order, 10) || 0,
        category: newStandard.category,
        facility_type_id: parseInt(newStandard.facility_type_id, 10),
        inspection_type_id: parseInt(newStandard.inspection_type_id, 10),
        is_active: newStandard.is_active
      };
      const response = await fetch(`${API_BASE}/api/standards/admin/standard/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Token ${user.token}` },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.message || "Failed to create standard");
      await fetchStandards();
      resetStandardForm();
      if (onStandardsUpdated) await onStandardsUpdated();
      showToast("Standard created successfully.", "success");
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to create standard.");
      showToast(err.message || "Unable to create standard.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStandard = async () => {
    if (!editingStandardId) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: newStandard.name.trim(),
        description: newStandard.description.trim(),
        ideal_status: newStandard.ideal_status.trim(),
        max_score: parseInt(newStandard.max_score, 10) || 5,
        order: parseInt(newStandard.order, 10) || 0,
        category: newStandard.category,
        facility_type_id: parseInt(newStandard.facility_type_id, 10),
        inspection_type_id: parseInt(newStandard.inspection_type_id, 10),
        is_active: newStandard.is_active
      };
      const response = await fetch(`${API_BASE}/api/standards/admin/standard/${editingStandardId}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Token ${user.token}` },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.message || "Failed to update standard");
      await fetchStandards();
      resetStandardForm();
      if (onStandardsUpdated) await onStandardsUpdated();
      showToast("Standard updated successfully.", "success");
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to update standard.");
      showToast(err.message || "Unable to update standard.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRequirement = async () => {
    if (!newRequirement.name.trim()) {
      setError("Requirement name is required.");
      showToast("Requirement name is required.", "warning");
      return;
    }
    if (!selectedStandard) {
      setError("Please select a standard first.");
      showToast("Please select a standard first.", "warning");
      return;
    }
    if (newRequirement.department_ids.length === 0) {
      setError("Please select at least one department.");
      showToast("Please select at least one department.", "warning");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: newRequirement.name.trim(),
        description: newRequirement.description.trim(),
        max_score: parseInt(newRequirement.max_score, 10) || 5,
        order: parseInt(newRequirement.order, 10) || 0,
        standard_id: selectedStandard.id,
        department_ids: newRequirement.department_ids.map((id) => parseInt(id, 10)),
        criteria: { items: [], max_score: parseInt(newRequirement.max_score, 10) || 5 },
        is_active: true
      };
      const response = await fetch(`${API_BASE}/api/standards/admin/requirement/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Token ${user.token}` },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.message || "Failed to create requirement");
      await fetchStandards();
      resetRequirementForm();
      if (onStandardsUpdated) await onStandardsUpdated();
      showToast("Requirement created successfully.", "success");
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to create requirement.");
      showToast(err.message || "Unable to create requirement.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRequirement = async () => {
    if (!editingRequirementId || !selectedStandard) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: newRequirement.name.trim(),
        description: newRequirement.description.trim(),
        max_score: parseInt(newRequirement.max_score, 10) || 5,
        order: parseInt(newRequirement.order, 10) || 0,
        standard_id: selectedStandard.id,
        department_ids: newRequirement.department_ids.map((id) => parseInt(id, 10)),
        criteria: selectedRequirement?.criteria || { items: [], max_score: parseInt(newRequirement.max_score, 10) || 5 },
        is_active: selectedRequirement?.is_active !== false
      };
      const response = await fetch(`${API_BASE}/api/standards/admin/requirement/${editingRequirementId}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Token ${user.token}` },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.message || "Failed to update requirement");
      await fetchStandards();
      resetRequirementForm();
      if (onStandardsUpdated) await onStandardsUpdated();
      showToast("Requirement updated successfully.", "success");
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to update requirement.");
      showToast(err.message || "Unable to update requirement.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCriterion = async () => {
    if (!newCriterion.name.trim()) {
      setError("Criterion name is required.");
      showToast("Criterion name is required.", "warning");
      return;
    }
    if (!selectedRequirement || !selectedStandard) {
      setError("Please select a requirement first.");
      showToast("Please select a requirement first.", "warning");
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
            order: parseInt(newCriterion.order, 10) || 0
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
      const response = await fetch(`${API_BASE}/api/standards/admin/requirement/${selectedRequirement.id}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Token ${user.token}` },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.message || "Failed to create criterion");
      await fetchStandards();
      resetCriterionForm();
      if (onStandardsUpdated) await onStandardsUpdated();
      showToast("Criterion added successfully.", "success");
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to create criterion.");
      showToast(err.message || "Unable to create criterion.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCriterion = async () => {
    if (editingCriterionIndex === null || !selectedRequirement || !selectedStandard) return;
    setSaving(true);
    setError("");
    try {
      const currentCriteria = selectedRequirement.criteria || { items: [], max_score: selectedRequirement.max_score || 5 };
      const updatedItems = [...(Array.isArray(currentCriteria.items) ? currentCriteria.items : [])];
      updatedItems[editingCriterionIndex] = {
        name: newCriterion.name.trim(),
        description: newCriterion.description.trim() || "",
        points: parseFloat(newCriterion.points) || 1.0,
        order: parseInt(newCriterion.order, 10) || 0
      };
      const updatedCriteria = { ...currentCriteria, items: updatedItems };
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
      const response = await fetch(`${API_BASE}/api/standards/admin/requirement/${selectedRequirement.id}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Token ${user.token}` },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.message || "Failed to update criterion");
      await fetchStandards();
      resetCriterionForm();
      if (onStandardsUpdated) await onStandardsUpdated();
      showToast("Criterion updated successfully.", "success");
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to update criterion.");
      showToast(err.message || "Unable to update criterion.", "error");
    } finally {
      setSaving(false);
    }
  };

  const tabClass = (tab) =>
    `rounded-full px-3 py-1.5 text-sm font-medium transition ${
      activeTab === tab ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Manage Inspection Standards</h2>
            <p className="text-sm text-gray-500">Add and update standards, requirements, and criteria.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4">
          <div className="mb-4 flex flex-wrap gap-2">
            <button onClick={() => setActiveTab("standard")} className={tabClass("standard")}>Standard</button>
            <button onClick={() => setActiveTab("requirement")} className={tabClass("requirement")}>Requirement</button>
            <button onClick={() => setActiveTab("criterion")} className={tabClass("criterion")}>Criterion</button>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[12rem] items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-green-600" />
                <p className="mt-2 text-sm text-gray-500">Loading form data...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {activeTab === "standard" && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">{editingStandardId ? "Edit Standard" : "Add Standard"}</h3>
                    {editingStandardId && <button onClick={resetStandardForm} className="text-sm text-gray-500 hover:text-gray-700">Cancel edit</button>}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="md:col-span-2"><label className="mb-1 block text-sm font-medium text-gray-700">Standard Name</label><input value={newStandard.name} onChange={(e) => setNewStandard({ ...newStandard, name: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Standard name" /></div>
                    <div className="md:col-span-2"><label className="mb-1 block text-sm font-medium text-gray-700">Ideal Status</label><input value={newStandard.ideal_status} onChange={(e) => setNewStandard({ ...newStandard, ideal_status: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Ideal status" /></div>
                    <div className="md:col-span-2"><label className="mb-1 block text-sm font-medium text-gray-700">Description</label><textarea value={newStandard.description} onChange={(e) => setNewStandard({ ...newStandard, description: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2" rows="3" placeholder="Description" /></div>
                    <div><label className="mb-1 block text-sm font-medium text-gray-700">Facility Type</label><select value={newStandard.facility_type_id} onChange={(e) => setNewStandard({ ...newStandard, facility_type_id: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2"><option value="">Select facility type</option>{facilityTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
                    <div><label className="mb-1 block text-sm font-medium text-gray-700">Inspection Type</label><select value={newStandard.inspection_type_id} onChange={(e) => setNewStandard({ ...newStandard, inspection_type_id: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2"><option value="">Select inspection type</option>{inspectionTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
                    <div><label className="mb-1 block text-sm font-medium text-gray-700">Category</label><select value={newStandard.category} onChange={(e) => setNewStandard({ ...newStandard, category: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2">{CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
                    <div><label className="mb-1 block text-sm font-medium text-gray-700">Max Score</label><input type="number" value={newStandard.max_score} onChange={(e) => setNewStandard({ ...newStandard, max_score: parseInt(e.target.value, 10) || 5 })} className="w-full rounded-lg border border-gray-300 px-3 py-2" /></div>
                    <div><label className="mb-1 block text-sm font-medium text-gray-700">Order</label><input type="number" value={newStandard.order} onChange={(e) => setNewStandard({ ...newStandard, order: parseInt(e.target.value, 10) || 0 })} className="w-full rounded-lg border border-gray-300 px-3 py-2" /></div>
                    <div className="flex items-center gap-2"><input id="standard-active" type="checkbox" checked={newStandard.is_active} onChange={(e) => setNewStandard({ ...newStandard, is_active: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-green-600" /><label htmlFor="standard-active" className="text-sm text-gray-700">Active</label></div>
                  </div>
                  <div className="mt-4 flex justify-end"><button onClick={editingStandardId ? handleUpdateStandard : handleCreateStandard} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60">{saving ? <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" /> : <Save className="h-4 w-4" />}{editingStandardId ? "Update Standard" : "Create Standard"}</button></div>
                </div>
              )}

              {activeTab === "requirement" && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">{editingRequirementId ? "Edit Requirement" : "Add Requirement"}</h3>
                    {editingRequirementId && <button onClick={resetRequirementForm} className="text-sm text-gray-500 hover:text-gray-700">Cancel edit</button>}
                  </div>
                  <div className="mb-3"><label className="mb-1 block text-sm font-medium text-gray-700">Standard</label><select value={selectedStandard?.id || ""} onChange={(e) => { const standard = standards.find((item) => item.id === Number(e.target.value)); setSelectedStandard(standard || null); setSelectedRequirement(null); }} className="w-full rounded-lg border border-gray-300 px-3 py-2"><option value="">Select a standard</option>{standards.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="md:col-span-2"><label className="mb-1 block text-sm font-medium text-gray-700">Requirement Name</label><input value={newRequirement.name} onChange={(e) => setNewRequirement({ ...newRequirement, name: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Requirement name" /></div>
                    <div className="md:col-span-2"><label className="mb-1 block text-sm font-medium text-gray-700">Description</label><textarea value={newRequirement.description} onChange={(e) => setNewRequirement({ ...newRequirement, description: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2" rows="3" placeholder="Description" /></div>
                    <div><label className="mb-1 block text-sm font-medium text-gray-700">Max Score</label><input type="number" value={newRequirement.max_score} onChange={(e) => setNewRequirement({ ...newRequirement, max_score: parseInt(e.target.value, 10) || 5 })} className="w-full rounded-lg border border-gray-300 px-3 py-2" /></div>
                    <div><label className="mb-1 block text-sm font-medium text-gray-700">Order</label><input type="number" value={newRequirement.order} onChange={(e) => setNewRequirement({ ...newRequirement, order: parseInt(e.target.value, 10) || 0 })} className="w-full rounded-lg border border-gray-300 px-3 py-2" /></div>
                  </div>
                  <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3"><p className="mb-2 text-sm font-medium text-gray-700">Apply to departments</p><div className="max-h-40 space-y-2 overflow-y-auto">{departments.map((dept) => <label key={dept.id} className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-gray-50"><input type="checkbox" checked={newRequirement.department_ids.includes(dept.id)} onChange={() => toggleRequirementDepartment(dept.id)} className="h-4 w-4 rounded border-gray-300 text-green-600" /><span className="text-sm text-gray-700">{dept.name}</span></label>)}</div></div>
                  <div className="mt-4 flex justify-end"><button onClick={editingRequirementId ? handleUpdateRequirement : handleCreateRequirement} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60">{saving ? <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" /> : <Save className="h-4 w-4" />}{editingRequirementId ? "Update Requirement" : "Create Requirement"}</button></div>
                </div>
              )}

              {activeTab === "criterion" && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-semibold text-gray-800">{editingCriterionIndex !== null ? "Edit Criterion" : "Add Criterion"}</h3>{editingCriterionIndex !== null && <button onClick={resetCriterionForm} className="text-sm text-gray-500 hover:text-gray-700">Cancel edit</button>}</div>
                  <div className="mb-3"><label className="mb-1 block text-sm font-medium text-gray-700">Standard</label><select value={selectedStandard?.id || ""} onChange={(e) => { const standard = standards.find((item) => item.id === Number(e.target.value)); setSelectedStandard(standard || null); setSelectedRequirement(null); resetCriterionForm(); }} className="w-full rounded-lg border border-gray-300 px-3 py-2"><option value="">Select a standard</option>{standards.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
                  <div className="mb-3"><label className="mb-1 block text-sm font-medium text-gray-700">Requirement</label><select value={selectedRequirement?.id || ""} onChange={(e) => { const requirement = selectedStandard?.requirements?.find((item) => item.id === Number(e.target.value)) || null; setSelectedRequirement(requirement); resetCriterionForm(); }} className="w-full rounded-lg border border-gray-300 px-3 py-2" disabled={!selectedStandard}><option value="">Select a requirement</option>{(selectedStandard?.requirements || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
                  <div className="grid gap-3 md:grid-cols-2"><div className="md:col-span-2"><label className="mb-1 block text-sm font-medium text-gray-700">Criterion Name</label><input value={newCriterion.name} onChange={(e) => setNewCriterion({ ...newCriterion, name: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Criterion name" /></div><div className="md:col-span-2"><label className="mb-1 block text-sm font-medium text-gray-700">Description</label><textarea value={newCriterion.description} onChange={(e) => setNewCriterion({ ...newCriterion, description: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2" rows="3" placeholder="Optional description" /></div><div><label className="mb-1 block text-sm font-medium text-gray-700">Points</label><input type="number" step="0.1" value={newCriterion.points} onChange={(e) => setNewCriterion({ ...newCriterion, points: parseFloat(e.target.value) || 1.0 })} className="w-full rounded-lg border border-gray-300 px-3 py-2" /></div><div><label className="mb-1 block text-sm font-medium text-gray-700">Order</label><input type="number" value={newCriterion.order} onChange={(e) => setNewCriterion({ ...newCriterion, order: parseInt(e.target.value, 10) || 0 })} className="w-full rounded-lg border border-gray-300 px-3 py-2" /></div></div>
                  <div className="mt-4 flex justify-end"><button onClick={editingCriterionIndex !== null ? handleUpdateCriterion : handleCreateCriterion} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60">{saving ? <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" /> : <Save className="h-4 w-4" />}{editingCriterionIndex !== null ? "Update Criterion" : "Create Criterion"}</button></div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
