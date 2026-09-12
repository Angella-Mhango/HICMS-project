import { useEffect, useState } from "react";
import { Plus, Edit2, Archive, CheckCircle, EyeOff, AlertCircle, ChevronRight } from "lucide-react";
import ManageStandardsModal from "../components/ManageStandardsModal";
import { showToast } from "../components/Toast";

const API_BASE = "http://127.0.0.1:8000";

export default function ManageInspectionsPage({ user }) {
  const [standards, setStandards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState(null);

  useEffect(() => {
    fetchStandards();
  }, []);

  const getCriteriaItems = (requirement) => {
    if (!requirement) return [];
    if (Array.isArray(requirement.criteria_items)) return requirement.criteria_items;
    if (requirement.criteria && Array.isArray(requirement.criteria.items)) return requirement.criteria.items;
    if (Array.isArray(requirement.criteria)) return requirement.criteria;
    return [];
  };

  const fetchStandards = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/api/standards/admin/`, {
        headers: { Authorization: `Token ${user.token}` }
      });

      if (!response.ok) throw new Error("Failed to load standards");

      const data = await response.json();
      let standardsData = [];

      if (Array.isArray(data)) {
        standardsData = data;
      } else if (data && Array.isArray(data.standards)) {
        standardsData = data.standards;
      } else if (data && Array.isArray(data.results)) {
        standardsData = data.results;
      }

      setStandards(standardsData);
    } catch (err) {
      console.error(err);
      setError("Unable to load standards right now.");
      showToast("Unable to load standards right now.", "error");
    } finally {
      setLoading(false);
    }
  };

  const archiveStandard = async (standardId) => {
    const target = standards.find((item) => item.id === standardId);
    const confirmed = window.confirm(
      target?.is_active === false
        ? `Restore "${target?.name || "this standard"}"?`
        : `Archive "${target?.name || "this standard"}"?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`${API_BASE}/api/standards/admin/standard/${standardId}/archive/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${user.token}`
        }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to archive standard");

      await fetchStandards();
      showToast(data.is_active ? "Standard restored successfully." : "Standard archived successfully.", "success");
    } catch (err) {
      console.error(err);
      showToast(err.message || "Unable to archive standard.", "error");
    }
  };

  const archiveRequirement = async (requirementId) => {
    const target = standards
      .flatMap((standard) => (standard.requirements || []).map((req) => ({ ...req, standardId: standard.id })))
      .find((req) => req.id === requirementId);

    const confirmed = window.confirm(
      target?.is_active === false
        ? `Restore "${target?.name || "this requirement"}"?`
        : `Archive "${target?.name || "this requirement"}"?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`${API_BASE}/api/standards/admin/requirement/${requirementId}/archive/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${user.token}`
        }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to archive requirement");

      await fetchStandards();
      showToast(data.is_active ? "Requirement restored successfully." : "Requirement archived successfully.", "success");
    } catch (err) {
      console.error(err);
      showToast(err.message || "Unable to archive requirement.", "error");
    }
  };

  const removeCriterion = async (requirementId, criterionIndex) => {
    const requirement = standards
      .flatMap((standard) => (standard.requirements || []).map((req) => ({ ...req, standardId: standard.id })))
      .find((req) => req.id === requirementId);

    if (!requirement) return;

    const confirmed = window.confirm("Remove this criterion from the requirement?");
    if (!confirmed) return;

    try {
      const currentCriteria = requirement.criteria || { items: [], max_score: requirement.max_score || 5 };
      const updatedItems = (currentCriteria.items || []).filter((_, index) => index !== criterionIndex);
      const updatedCriteria = { ...currentCriteria, items: updatedItems };

      const payload = {
        name: requirement.name,
        description: requirement.description || "",
        max_score: requirement.max_score,
        order: requirement.order || 0,
        standard_id: requirement.standardId,
        criteria: updatedCriteria,
        department_ids: requirement.department_ids || [],
        is_active: requirement.is_active !== false
      };

      const response = await fetch(`${API_BASE}/api/standards/admin/requirement/${requirementId}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${user.token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to remove criterion");

      await fetchStandards();
      showToast("Criterion removed successfully.", "success");
    } catch (err) {
      console.error(err);
      showToast(err.message || "Unable to remove criterion.", "error");
    }
  };

  const openModal = (action = null) => {
    setModalAction(action);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalAction(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Manage Standards</h1>
            <p className="mt-1 text-sm text-gray-500">
              Review inspection standards, add new ones, and manage the requirements and criteria attached to each standard.
            </p>
          </div>
          <button
            onClick={() => openModal(null)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            Add Standard
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[12rem] items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-green-600" />
              <p className="mt-3 text-sm text-gray-500">Loading standards...</p>
            </div>
          </div>
        ) : standards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-medium text-gray-700">No standards available yet.</p>
            <p className="mt-2 text-sm text-gray-500">Start by adding your first standard.</p>
            <button
              onClick={() => openModal(null)}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              <Plus className="h-4 w-4" />
              Add Standard
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {standards.map((standard) => {
              const requirements = Array.isArray(standard.requirements) ? standard.requirements : [];

              return (
                <div key={standard.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-gray-900">{standard.name}</h2>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                          standard.is_active !== false ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          {standard.is_active !== false ? <CheckCircle className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          {standard.is_active !== false ? "Active" : "Archived"}
                        </span>
                      </div>
                      {standard.description && <p className="mt-2 text-sm text-gray-600">{standard.description}</p>}
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                        {standard.facility_type?.name && <span className="rounded-full bg-green-50 px-2.5 py-1 text-green-700">{standard.facility_type.name}</span>}
                        {standard.inspection_type?.name && <span className="rounded-full bg-green-50 px-2.5 py-1 text-green-700">{standard.inspection_type.name}</span>}
                        <span className="rounded-full bg-gray-100 px-2.5 py-1">Max Score: {standard.max_score || 5}</span>
                        <span className="rounded-full bg-gray-100 px-2.5 py-1">{requirements.length} requirement{requirements.length === 1 ? "" : "s"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openModal({ type: "standard", id: standard.id })}
                        className="rounded-lg border border-green-200 p-2 text-green-700 transition hover:bg-green-50"
                        title="Edit Standard"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => archiveStandard(standard.id)}
                        className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50"
                        title={standard.is_active !== false ? "Archive Standard" : "Restore Standard"}
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openModal({ type: "requirement", standardId: standard.id })}
                        className="rounded-lg border border-green-200 px-3 py-2 text-sm font-medium text-green-700 transition hover:bg-green-50"
                      >
                        Add Requirement
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-700">Requirements & Criteria</h3>
                      <button
                        onClick={() => openModal({ type: "criterion", standardId: standard.id, requirementId: requirements[0]?.id || null })}
                        className="text-sm font-medium text-green-700 hover:text-green-800"
                      >
                        Add Criteria
                      </button>
                    </div>

                    {requirements.length > 0 ? (
                      <div className="mt-3 space-y-3">
                        {requirements.map((requirement) => {
                          const criteria = getCriteriaItems(requirement);
                          return (
                            <div key={requirement.id} className="rounded-lg border border-gray-200 bg-white p-3">
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div className="flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-medium text-gray-800">{requirement.name}</p>
                                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                      requirement.is_active !== false ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                                    }`}>
                                      {requirement.is_active !== false ? "Active" : "Archived"}
                                    </span>
                                  </div>
                                  {requirement.description && <p className="mt-1 text-sm text-gray-500">{requirement.description}</p>}
                                  <p className="mt-1 text-xs text-gray-400">Max Score: {requirement.max_score || 5} · Order: {requirement.order || 0}</p>

                                  {criteria.length > 0 ? (
                                    <div className="mt-3">
                                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Criteria</p>
                                      <div className="mt-2 space-y-2">
                                        {criteria.map((criterion, index) => (
                                          <div key={`${requirement.id}-${index}`} className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-2.5 py-2">
                                            <div className="min-w-0">
                                              <p className="text-sm font-medium text-gray-700">{criterion.name}</p>
                                              {criterion.description && <p className="text-xs text-gray-400">{criterion.description}</p>}
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className="rounded-full bg-green-100 px-2 py-1 text-[11px] font-medium text-green-700">
                                                {criterion.points || 1.0} pts
                                              </span>
                                              <button
                                                onClick={() => openModal({ type: "criterion", standardId: standard.id, requirementId: requirement.id, criterionIndex: index })}
                                                className="rounded p-1 text-green-700 hover:bg-green-100"
                                                title="Edit Criterion"
                                              >
                                                <Edit2 className="h-3.5 w-3.5" />
                                              </button>
                                              <button
                                                onClick={() => removeCriterion(requirement.id, index)}
                                                className="rounded p-1 text-gray-600 hover:bg-gray-100"
                                                title="Remove Criterion"
                                              >
                                                <Archive className="h-3.5 w-3.5" />
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="mt-2 text-sm text-gray-400">No criteria added yet.</p>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => openModal({ type: "requirement", standardId: standard.id, id: requirement.id })}
                                    className="rounded-lg border border-green-200 p-2 text-green-700 transition hover:bg-green-50"
                                    title="Edit Requirement"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => archiveRequirement(requirement.id)}
                                    className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50"
                                    title={requirement.is_active !== false ? "Archive Requirement" : "Restore Requirement"}
                                  >
                                    <Archive className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => openModal({ type: "criterion", standardId: standard.id, requirementId: requirement.id })}
                                    className="rounded-lg border border-green-200 p-2 text-green-700 transition hover:bg-green-50"
                                    title="Add Criteria"
                                  >
                                    <ChevronRight className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-gray-400">No requirements added yet for this standard.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <ManageStandardsModal
          user={user}
          initialAction={modalAction}
          onClose={closeModal}
          onStandardsUpdated={fetchStandards}
        />
      )}
    </div>
  );
}
