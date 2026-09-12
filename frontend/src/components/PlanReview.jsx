import { useEffect, useState } from "react";

import { showToast } from "./Toast";



export default function PlanReview({ user, onChanged }) {

  const [plans, setPlans] = useState([]);
  const [reviewTab, setReviewTab] = useState("submitted");

  const [inspectors, setInspectors] = useState([]);

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");

  const headers = { Authorization: `Token ${user.token}`, "Content-Type": "application/json" };

  const load = async () => {

    try {

      const [a, b] = await Promise.all([

        fetch("http://127.0.0.1:8000/inspections/facility/plans/review/", { headers }),

        fetch("http://127.0.0.1:8000/inspections/schedules/options/", { headers })

      ]);

      if (!a.ok || !b.ok) throw new Error("Unable to load requested plans");

      setPlans(await a.json()); setInspectors((await b.json()).inspectors); setError("");

    } catch (e) { setError(e.message); }

  };

  useEffect(() => { load(); }, [user.token]);

  const change = (id, field, value) => setPlans(rows => rows.map(p => p.id === id ? { ...p, [field]: value } : p));

  const save = async (plan, action) => {

    setBusy(true);

    try {

      const res = await fetch("http://127.0.0.1:8000/inspections/facility/plans/review/", {

        method: "PATCH", headers, body: JSON.stringify({ ...plan, action })

      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Unable to update plan");

      showToast(action === "approve" ? "Plan approved and removed from pending approval. Open Approved plans to assign an inspector." : "Plan updated", "success");

      if (action === "approve") {
        setPlans(rows => rows.map(row => row.id === plan.id ? { ...row, status: "approved" } : row));
      }
      await load(); onChanged();

    } catch (e) { showToast(e.message, "error"); } finally { setBusy(false); }

  };

  return <section className="space-y-4 rounded-xl border bg-white p-5">

    <h2 className="text-lg font-semibold">QA inspection requests</h2>

    {error && <p role="alert" className="text-red-600">{error}</p>}

    <div className="flex gap-3" aria-label="Plan review status">
      <button type="button" aria-pressed={reviewTab === "submitted"} onClick={() => setReviewTab("submitted")} className={`rounded-lg px-4 py-2 ${reviewTab === "submitted" ? "bg-green-700 text-white" : "border text-gray-700"}`}>
        Pending approval ({plans.filter(plan => plan.status === "submitted").length})
      </button>
      <button type="button" aria-pressed={reviewTab === "approved"} onClick={() => setReviewTab("approved")} className={`rounded-lg px-4 py-2 ${reviewTab === "approved" ? "bg-green-700 text-white" : "border text-gray-700"}`}>
        Approved plans ({plans.filter(plan => plan.status === "approved").length})
      </button>
    </div>
    {!error && !plans.some(plan => plan.status === reviewTab) && <p>{reviewTab === "submitted" ? "No plans awaiting approval." : "No approved plans available for assignment."}</p>}

    {plans.filter(plan => plan.status === reviewTab).map(plan => <article key={plan.id} className="space-y-3 rounded-lg border p-4">

      <h3 className="font-semibold">{plan.facility_name} ? {plan.status === "submitted" ? "Pending approval" : "Approved"}</h3>

      <p className="text-sm">Departments: {plan.department_names.join(", ")} ? Focal person: {plan.focal_person || "Not provided"}</p>

      <label className="block">Title<input className="block w-full rounded border p-2" disabled={plan.status === "approved"} value={plan.title} onChange={e => change(plan.id, "title", e.target.value)} /></label>

      <label className="block">Scope<textarea className="block w-full rounded border p-2" disabled={plan.status === "approved"} value={plan.description} onChange={e => change(plan.id, "description", e.target.value)} /></label>

      {plan.status === "submitted" ? <>

        <label className="inline-block mr-4">Start date<input type="date" className="block border p-2" value={plan.preparation_date} onChange={e => change(plan.id, "preparation_date", e.target.value)} /></label>

        <label className="inline-block">End date<input type="date" className="block border p-2" value={plan.end_date || plan.preparation_date} onChange={e => change(plan.id, "end_date", e.target.value)} /></label>

        <div className="flex gap-3"><button disabled={busy} className="rounded border px-4 py-2" onClick={() => save(plan, "save")}>Save changes</button><button disabled={busy} className="rounded bg-green-700 px-4 py-2 text-white" onClick={() => save(plan, "approve")}>Approve plan</button></div>

      </> : <div className="flex flex-wrap items-center gap-3">

        <p>Assigned: {plan.schedules[0]?.assigned_inspector_name || "Unassigned"}</p>

        <select aria-label="Inspector" className="rounded border p-2" value={plan.inspector_id || ""} onChange={e => change(plan.id, "inspector_id", e.target.value)}><option value="">Select inspector</option>{inspectors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select>

        <button disabled={busy || !plan.inspector_id} className="rounded bg-green-700 px-4 py-2 text-white disabled:opacity-50" onClick={() => save(plan, "assign")}>Assign inspector</button>

      </div>}

    </article>)}

  </section>;

}

