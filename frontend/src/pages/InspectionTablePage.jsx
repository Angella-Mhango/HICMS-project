import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import InspectionStepper from "../components/InspectionStepper";
import { Search, Plus, RefreshCw, FileText } from "lucide-react";

export default function InspectionTablePage({ user, onLogout }) {
  const [inspections, setInspections] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showInspectionStepper, setShowInspectionStepper] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/inspections/api/", { headers: { Authorization: `Token ${user.token}` } });
      setInspections(response.ok ? await response.json() : []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const rows = useMemo(() => {
    const term = search.toLowerCase();
    return inspections.filter(item => !term || [item.facility_name, item.department, item.inspector, item.status, item.date].some(value => String(value || "").toLowerCase().includes(term)));
  }, [inspections, search]);
  return <Layout user={user} onLogout={onLogout}>
    <div className="flex flex-wrap justify-between gap-4 mb-6"><div><h1 className="text-2xl font-semibold text-gray-700 flex gap-2 items-center"><FileText className="w-6 h-6 text-green-600" />Inspections</h1><p className="text-sm text-gray-500 mt-1">Single inspection data table</p></div><div className="flex gap-3"><button onClick={load} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 flex gap-2 items-center"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />Refresh</button><button onClick={() => setShowInspectionStepper(true)} className="px-4 py-2 rounded-lg bg-green-600 text-white flex gap-2 items-center"><Plus className="w-4 h-4" />New Inspection</button></div></div>
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"><div className="p-4 border-b border-gray-200"><label className="relative block max-w-xl"><Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search inspections" className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm" /></label><p className="mt-2 text-sm text-gray-500">Showing {rows.length} of {inspections.length} inspections</p></div><div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs text-gray-500 uppercase">Facility</th><th className="px-6 py-3 text-left text-xs text-gray-500 uppercase">Department</th><th className="px-6 py-3 text-left text-xs text-gray-500 uppercase">Inspector</th><th className="px-6 py-3 text-left text-xs text-gray-500 uppercase">Score</th><th className="px-6 py-3 text-left text-xs text-gray-500 uppercase">Status</th><th className="px-6 py-3 text-left text-xs text-gray-500 uppercase">Date</th></tr></thead><tbody className="divide-y divide-gray-100">{rows.map(item => <tr key={item.id} className="hover:bg-gray-50"><td className="px-6 py-4 text-sm">{item.facility_name}</td><td className="px-6 py-4 text-sm">{item.department || "—"}</td><td className="px-6 py-4 text-sm">{item.inspector || "—"}</td><td className="px-6 py-4 text-sm">{item.score}%</td><td className={`px-6 py-4 text-sm ${item.status === "Compliant" ? "text-green-700" : "text-red-700"}`}>{item.status}</td><td className="px-6 py-4 text-sm">{item.date?.split("T")[0] || "—"}</td></tr>)}</tbody></table>{!loading && rows.length === 0 && <p className="p-10 text-center text-gray-500">No inspections found.</p>}</div></div>
    {showInspectionStepper && <InspectionStepper user={user} onSubmitted={load} onComplete={load} onClose={() => setShowInspectionStepper(false)} />}
  </Layout>;
}
