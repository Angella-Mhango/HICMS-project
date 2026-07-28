// frontend/src/pages/Rankings.jsx
import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { getFacilityRanking } from "../services/mcmApi";

export default function Rankings({ user, onLogout }) {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRankings();
  }, []);

  const fetchRankings = async () => {
    try {
      const data = await getFacilityRanking();
      setRanking(data);
    } catch (error) {
      console.error("Error fetching rankings:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <h1 className="text-2xl font-semibold text-gray-700 mb-6">Facility Rankings</h1>

      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Facility</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Average Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ranking.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-400">
                    No ranking data available
                  </td>
                </tr>
              ) : (
                ranking.map((facility, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-bold text-gray-700">#{idx + 1}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{facility.facility}</td>
                    <td className="px-6 py-4 text-sm font-medium text-green-600">{facility.average_score}%</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        facility.average_score >= 80 ? 'bg-green-100 text-green-700' :
                        facility.average_score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {facility.average_score >= 80 ? 'Compliant' :
                         facility.average_score >= 60 ? 'Partial' : 'Non-Compliant'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}