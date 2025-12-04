"use client";

import { useState, useEffect, useMemo } from "react";
import {
  loadProjects,
  loadMembers,
  loadGBMs,
  loadAttendance,
  calculateTotalLifetimeMembers,
  calculateActiveMembersCount,
  calculateInactiveMembersCount,
  calculateTechToNonTechMembers,
  calculateAttendancePerGBM,
  calculateNewMembersPerQuarter,
  calculateAssociatesVsAnalysts,
} from "../../lib/data";
import { Project, Member, GBM, Attendance, isSupabaseConfigured } from "../../lib/supabase";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line } from "recharts";

interface KPICardProps {
  title: string;
  value: string | number;
}

function KPICard({ title, value }: KPICardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        {title}
      </div>
      <div className="text-2xl font-bold text-gray-900">
        {value}
      </div>
    </div>
  );
}

export default function MembersPage() {
  
  const [selectedQuarters, setSelectedQuarters] = useState<string[]>([]);
  const [quartersInitialized, setQuartersInitialized] = useState(false);
  
  // Data state
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [gbms, setGBMs] = useState<GBM[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  
  
  // Loading state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data on component mount
  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [
          projectsData,
          membersData,
          gbmsData,
          attendanceData
        ] = await Promise.all([
          loadProjects(),
          loadMembers(),
          loadGBMs(),
          loadAttendance()
        ]);
        
        setProjects(projectsData);
        setMembers(membersData);
        setGBMs(gbmsData);
        setAttendance(attendanceData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred while loading data');
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, []);

  
  const toggleQuarter = (quarter: string) => {
    setSelectedQuarters(prev =>
      prev.includes(quarter)
        ? prev.filter(q => q !== quarter)
        : [...prev, quarter]
    );
  };

  // Get unique quarters from the data
  const availableQuarters = useMemo(() => {
    const quarters = [...new Set([
      ...projects.map(p => p.quarter_id),
      ...gbms.map(g => g.quarter_id)
    ])].filter(Boolean).sort();
    return quarters;
  }, [projects, gbms]);

  // Initialize selected quarters with available data (only once)
  useEffect(() => {
    if (availableQuarters.length > 0 && !quartersInitialized && !loading) {
      setSelectedQuarters(availableQuarters);
      setQuartersInitialized(true);
    }
  }, [availableQuarters, quartersInitialized, loading]);

  // Calculate metrics
  const totalLifetimeMembers = calculateTotalLifetimeMembers(members);
  const activeMembers = calculateActiveMembersCount(members);
  const inactiveMembers = calculateInactiveMembersCount(members);
  const techNonTechMembers = calculateTechToNonTechMembers(members);
  const associatesAnalysts = calculateAssociatesVsAnalysts(members);
  
  // Chart data
  const attendancePerGBMData = calculateAttendancePerGBM(attendance, gbms, selectedQuarters);
  const membersPerQuarterData = calculateNewMembersPerQuarter(members);
  const techNonTechData = [
    { category: "Tech", count: techNonTechMembers.tech },
    { category: "Non-Tech", count: techNonTechMembers.nonTech }
  ];
  const associatesAnalystsData = [
    { category: "Associates", count: associatesAnalysts.associates },
    { category: "Analysts", count: associatesAnalysts.analysts }
  ];

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-lg max-w-md w-full">
          <div className="text-red-600 text-center">
            <h2 className="text-xl font-semibold mb-2">Error Loading Data</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--cream)]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[var(--navy-blue)] mb-2">Members Dashboard</h1>
          {loading && (
            <div className="text-sm text-gray-500 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--navy-blue)] mr-2"></div>
              Loading data...
            </div>
          )}
          {!loading && !isSupabaseConfigured() && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="text-yellow-800 text-sm">
                <strong>⚠️ Supabase not configured:</strong> Please set up your environment variables in <code>.env.local</code> to connect to your database.
              </div>
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Overview
            </div>
            <div className="space-y-4">
              <KPICard title="Active Members" value={loading ? "..." : activeMembers} />
              <KPICard title="Total Lifetime Members" value={loading ? "..." : totalLifetimeMembers} />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Overview
            </div>
            <div className="space-y-4">
              <KPICard title="Active Members" value={loading ? "..." : activeMembers} />
              <KPICard title="Inactive Members" value={loading ? "..." : inactiveMembers} />
            </div>
          </div>
        </div>

        {/* Charts Section - 2x2 Grid */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Attendance per GBM */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--navy-blue)] mb-4">Attendance per GBM</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={attendancePerGBMData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis 
                  dataKey="date" 
                  stroke="var(--chart-axis-light)"
                  tick={{ fill: 'var(--chart-axis-light)', fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  stroke="var(--chart-axis-light)"
                  tick={{ fill: 'var(--chart-axis-light)' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--white)', 
                    border: '1px solid var(--chart-grid)',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="attendance" fill="var(--navy-blue-medium)" />
                <Line 
                  type="monotone" 
                  dataKey="attendance" 
                  stroke="var(--navy-blue)" 
                  strokeWidth={2}
                  dot={{ fill: 'var(--navy-blue)', r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Members per Quarter */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--navy-blue)] mb-4">Members per Quarter</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={membersPerQuarterData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis 
                  dataKey="quarter" 
                  stroke="var(--chart-axis-light)"
                  tick={{ fill: 'var(--chart-axis-light)' }}
                />
                <YAxis 
                  stroke="var(--chart-axis-light)"
                  tick={{ fill: 'var(--chart-axis-light)' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--white)', 
                    border: '1px solid var(--chart-grid)',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="count" fill="var(--navy-blue-medium)" />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="var(--navy-blue)" 
                  strokeWidth={2}
                  dot={{ fill: 'var(--navy-blue)', r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Tech vs Non-Tech */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--navy-blue)] mb-4">Tech vs Non-Tech</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={techNonTechData}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis 
                  type="number"
                  stroke="var(--chart-axis-light)"
                  tick={{ fill: 'var(--chart-axis-light)' }}
                />
                <YAxis 
                  type="category"
                  dataKey="category"
                  stroke="var(--chart-axis-light)"
                  tick={{ fill: 'var(--chart-axis-light)' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--white)', 
                    border: '1px solid var(--chart-grid)',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="var(--navy-blue-medium)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Associates vs Analysts */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--navy-blue)] mb-4">Associates vs Analysts</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={associatesAnalystsData}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis 
                  type="number"
                  stroke="var(--chart-axis-light)"
                  tick={{ fill: 'var(--chart-axis-light)' }}
                />
                <YAxis 
                  type="category"
                  dataKey="category"
                  stroke="var(--chart-axis-light)"
                  tick={{ fill: 'var(--chart-axis-light)' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--white)', 
                    border: '1px solid var(--chart-grid)',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="var(--navy-blue-medium)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Members Database Table */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">s
          <h3 className="text-lg font-semibold text-[var(--navy-blue)] mb-4">Members Database</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UCSD Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Personal Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No members found
                    </td>
                  </tr>
                ) : (
                  members.map((member) => (
                    <tr key={member.member_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.quarter_entered || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.role || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.ucsd_email || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.personal_email || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          member.status 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {member.status ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
