"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  loadProjects,
  loadMembers,
  loadCompanies,
  loadGBMs,
  loadAttendance,
  loadAssignments,
  calculateActiveProjects,
  calculateTotalLifetimeProjects,
  calculateTechToNonTechProjects,
  calculateParticipatingMembers,
  calculateTechToNonTechMembers,
  calculateAverageTeamSize,
  calculateProjectsPerQuarter,
  calculateTopProjectManagers,
  calculateProjectsPerCompanyChart,
  calculateTotalLifetimeMembers,
  calculateActiveMembersCount,
  calculateInactiveMembersCount,
  calculateAttendancePerGBM,
  calculateNewMembersPerQuarter,
  calculateAssociatesVsAnalysts,
} from "../lib/data";
import { Project, Member, Company, GBM, Attendance, Assignment, isSupabaseConfigured } from "../lib/supabase";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from "recharts";

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

const tabs = ["Projects", "Members"];

export default function Home() {
  const [selectedQuarters, setSelectedQuarters] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("Projects");
  const [quartersInitialized, setQuartersInitialized] = useState(false);
  
  // Data state
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [gbms, setGBMs] = useState<GBM[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  
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
          companiesData,
          gbmsData,
          attendanceData,
          assignmentsData
        ] = await Promise.all([
          loadProjects(),
          loadMembers(),
          loadCompanies(),
          loadGBMs(),
          loadAttendance(),
          loadAssignments()
        ]);
        
        setProjects(projectsData);
        setMembers(membersData);
        setCompanies(companiesData);
        setGBMs(gbmsData);
        setAttendance(attendanceData);
        setAssignments(assignmentsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred while loading data');
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, []);

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

  // Projects tab calculations
  const activeProjects = calculateActiveProjects(projects, selectedQuarters);
  const totalLifetimeProjects = calculateTotalLifetimeProjects(projects);
  const techNonTechProjects = calculateTechToNonTechProjects(projects, selectedQuarters);
  const participatingMembers = calculateParticipatingMembers(assignments, projects, selectedQuarters);
  const techNonTechMembers = calculateTechToNonTechMembers(members);
  const avgMembersPerProject = calculateAverageTeamSize(assignments, projects, selectedQuarters);
  const projectsPerQuarterData = calculateProjectsPerQuarter(projects, selectedQuarters);
  const topManagersData = calculateTopProjectManagers(assignments, projects, members, selectedQuarters);
  const projectsPerCompanyData = calculateProjectsPerCompanyChart(projects, companies, selectedQuarters);
  const filteredProjects = useMemo(() => {
    return projects.filter(p => selectedQuarters.includes(p.quarter_id));
  }, [projects, selectedQuarters]);
  const companyMap = useMemo(() => {
    return new Map(companies.map(c => [c.company_id, c.name || 'Unknown']));
  }, [companies]);

  // Create a map of project_id to project manager names
  const projectManagerMap = useMemo(() => {
    const managerMap = new Map<string, string[]>();

    // Normalize member_id keys to strings
    const memberMap = new Map(
      members.map(m => [String(m.member_id), m.name || 'Unknown'])
    );

    assignments.forEach(assignment => {
      if (assignment.project_manager === true) {

        // Normalize IDs to strings
        const projectId = String(assignment.project_id);
        const memberId = String(assignment.member_id);

        const memberName = memberMap.get(memberId) || 'Unknown';

        if (!managerMap.has(projectId)) {
          managerMap.set(projectId, []);
        }
        managerMap.get(projectId)!.push(memberName);
      }
    });

  return managerMap;
}, [assignments, members]);


  // Members tab calculations
  const totalLifetimeMembers = calculateTotalLifetimeMembers(members);
  const activeMembers = calculateActiveMembersCount(members);
  const inactiveMembers = calculateInactiveMembersCount(members);
  const techNonTechMembersForTab = calculateTechToNonTechMembers(members);
  const associatesAnalysts = calculateAssociatesVsAnalysts(members);
  const attendancePerGBMData = calculateAttendancePerGBM(attendance, gbms, selectedQuarters);
  const membersPerQuarterData = calculateNewMembersPerQuarter(members);
  const techNonTechData = [
    { category: "Tech", count: techNonTechMembersForTab.tech },
    { category: "Non-Tech", count: techNonTechMembersForTab.nonTech }
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

  const renderProjectsTab = () => (
    <>
      {/* KPI Cards */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-8">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Overview
        </div>
        <div className="grid grid-cols-3 gap-6">
          <KPICard title="Total Projects" value={loading ? "..." : activeProjects} />
          <KPICard 
            title="Tech to Non-Tech Projects" 
            value={loading ? "..." : `${techNonTechProjects.tech}:${techNonTechProjects.nonTech}`} 
          />
          <KPICard title="Total Lifetime Projects" value={loading ? "..." : totalLifetimeProjects} />
          <KPICard title="Participating Members" value={loading ? "..." : participatingMembers} />
          <KPICard 
            title="Tech to Non-Tech Members" 
            value={loading ? "..." : `${techNonTechMembers.tech}:${techNonTechMembers.nonTech}`} 
          />
          <KPICard 
            title="Average Members per Active Project" 
            value={loading ? "..." : avgMembersPerProject > 0 ? avgMembersPerProject.toFixed(1) : "0"} 
          />
        </div>
      </div>

      {/* Charts Section */}
      <div className="space-y-6 mb-8">
        {/* Projects per Quarter Line Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Projects per Quarter</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={projectsPerQuarterData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="quarter" 
                stroke="#64748b"
                tick={{ fill: '#64748b' }}
              />
              <YAxis 
                stroke="#64748b"
                tick={{ fill: '#64748b' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#87CEEB" 
                strokeWidth={2}
                dot={{ fill: '#87CEEB', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Two Bar Charts Side by Side */}
        <div className="grid grid-cols-2 gap-6">
          {/* Top Project Managers */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Project Managers</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                data={topManagersData}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  type="number"
                  stroke="#64748b"
                  tick={{ fill: '#64748b' }}
                />
                <YAxis 
                  type="category"
                  dataKey="manager"
                  width={120}
                  stroke="#64748b"
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="#2D3748"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Projects per Company */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Projects per Company</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                data={projectsPerCompanyData}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  type="number"
                  stroke="#64748b"
                  tick={{ fill: '#64748b' }}
                />
                <YAxis 
                  type="category"
                  dataKey="company"
                  width={120}
                  stroke="#64748b"
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="#2D3748"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Projects Database Table */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Projects Database</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quarter
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PM
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Donated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No projects found for selected quarters
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project) => (
                  <tr key={project.project_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {companyMap.get(project.company_id || '') || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {project.quarter_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {projectManagerMap.get(project.project_id)?.join(', ') || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {project.dnf ? 'DNF' : project.status || 'Ongoing'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {project.donated ? 'Yes' : 'No'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-md truncate">
                      {project.description || 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  const renderMembersTab = () => (
    <>
      {/* KPI Cards */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-8">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Overview
        </div>
        <div className="grid grid-cols-4 gap-6">
          <KPICard title="Current Members" value={loading ? "..." : activeMembers + inactiveMembers} />
          <KPICard title="Active" value={loading ? "..." : activeMembers} />
          <KPICard title="Inactive" value={loading ? "..." : inactiveMembers} />
          <KPICard title="Total Lifetime Members" value={loading ? "..." : totalLifetimeMembers} />
        </div>
      </div>

      {/* Charts Section - 2x2 Grid */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Attendance per GBM */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance per GBM</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={attendancePerGBMData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="date" 
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                stroke="#64748b"
                tick={{ fill: '#64748b' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="attendance" fill="#87CEEB" />
              <Line 
                type="monotone" 
                dataKey="attendance" 
                stroke="#2D3748" 
                strokeWidth={2}
                dot={{ fill: '#2D3748', r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Members per Year */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">New Members Per Quarter</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={membersPerQuarterData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="quarter" 
                stroke="#64748b"
                tick={{ fill: '#64748b' }}
              />
              <YAxis 
                stroke="#64748b"
                tick={{ fill: '#64748b' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="count" fill="#87CEEB" />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#2D3748" 
                strokeWidth={2}
                dot={{ fill: '#2D3748', r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Tech vs Non-Tech */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tech vs Non-Tech</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={techNonTechData}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                type="number"
                stroke="#64748b"
                tick={{ fill: '#64748b' }}
              />
              <YAxis 
                type="category"
                dataKey="category"
                stroke="#64748b"
                tick={{ fill: '#64748b' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              />
              <Bar 
                dataKey="count" 
                fill="#2D3748"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Associates vs Analysts */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Associates vs Analysts</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={associatesAnalystsData}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                type="number"
                stroke="#64748b"
                tick={{ fill: '#64748b' }}
              />
              <YAxis 
                type="category"
                dataKey="category"
                stroke="#64748b"
                tick={{ fill: '#64748b' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              />
              <Bar 
                dataKey="count" 
                fill="#2D3748"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Members Database Table */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Members Database</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quarter Entered
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quarter Graduating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Track
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  UCSD Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Personal Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
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
                      {member.quarter_graduating || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {member.role || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {member.track || 'N/A'}
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
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <Image src="/logo.png" alt="TCG Logo" width={48} height={48} className="object-contain" />
            <h1 className="text-4xl font-bold text-gray-900">TCG Dashboard</h1>
          </div>
          {loading && (
            <div className="text-sm text-gray-500 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
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

        {/* Tabs Navigation */}
        <div className="bg-gray-100 rounded-lg p-1 mb-8 inline-flex">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-md cursor-pointer font-medium transition-colors ${
                activeTab === tab
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "Projects" && renderProjectsTab()}
        {activeTab === "Members" && renderMembersTab()}
      </div>
    </div>
  );
}
