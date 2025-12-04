"use client";

import { useState, useEffect, useMemo } from "react";
import {
  loadProjects,
  loadMembers,
  loadCompanies,
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
} from "../../lib/data";
import { Project, Member, Company, Assignment, isSupabaseConfigured } from "../../lib/supabase";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

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

export default function ProjectsPage() {
  const [selectedQuarters, setSelectedQuarters] = useState<string[]>([]);
  const [quartersInitialized, setQuartersInitialized] = useState(false);
  
  // Data state
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
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
          assignmentsData
        ] = await Promise.all([
          loadProjects(),
          loadMembers(),
          loadCompanies(),
          loadAssignments()
        ]);
        
        setProjects(projectsData);
        setMembers(membersData);
        setCompanies(companiesData);
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

  const toggleQuarter = (quarter: string) => {
    setSelectedQuarters(prev =>
      prev.includes(quarter)
        ? prev.filter(q => q !== quarter)
        : [...prev, quarter]
    );
  };

  // Get unique quarters from the data
  const availableQuarters = useMemo(() => {
    const quarters = [...new Set(projects.map(p => p.quarter_id))].filter(Boolean).sort();
    return quarters;
  }, [projects]);

  // Initialize selected quarters with available data (only once)
  useEffect(() => {
    if (availableQuarters.length > 0 && !quartersInitialized && !loading) {
      setSelectedQuarters(availableQuarters);
      setQuartersInitialized(true);
    }
  }, [availableQuarters, quartersInitialized, loading]);

  // Calculate metrics
  const activeProjects = calculateActiveProjects(projects, selectedQuarters);
  const totalLifetimeProjects = calculateTotalLifetimeProjects(projects);
  const techNonTechProjects = calculateTechToNonTechProjects(projects, selectedQuarters);
  const participatingMembers = calculateParticipatingMembers(assignments, projects, selectedQuarters);
  const techNonTechMembers = calculateTechToNonTechMembers(members);
  const avgMembersPerProject = calculateAverageTeamSize(assignments, projects, selectedQuarters);
  
  // Chart data
  const projectsPerQuarterData = calculateProjectsPerQuarter(projects, selectedQuarters);
  const topManagersData = calculateTopProjectManagers(assignments, projects, members, selectedQuarters);
  const projectsPerCompanyData = calculateProjectsPerCompanyChart(projects, companies, selectedQuarters);

  // Get filtered projects for table
  const filteredProjects = useMemo(() => {
    return projects.filter(p => selectedQuarters.includes(p.quarter_id));
  }, [projects, selectedQuarters]);

  // Get company names map
  const companyMap = useMemo(() => {
    return new Map(companies.map(c => [c.company_id, c.name || 'Unknown']));
  }, [companies]);

  // Create a map of project_id to project manager names
  const projectManagerMap = useMemo(() => {
    const managerMap = new Map<string, string[]>();
    const memberMap = new Map<string, string>(
      members.map(m => [String(m.member_id), m.name || 'Unknown'])
    );
    
    assignments.forEach(assignment => {
      if (assignment.project_manager === true) {
        const projectId = String(assignment.project_id);
        const memberName = memberMap.get(String(assignment.member_id)) || 'Unknown';
        
        if (!managerMap.has(projectId)) {
          managerMap.set(projectId, []);
        }
        managerMap.get(projectId)!.push(memberName);
      }
    });
    
    return managerMap;
  }, [assignments, members]);


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
          <h1 className="text-4xl font-bold text-[var(--navy-blue)] mb-2">Projects Dashboard</h1>
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
            <h3 className="text-lg font-semibold text-[var(--navy-blue)] mb-4">Projects per Quarter</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={projectsPerQuarterData}>
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
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="var(--navy-blue)" 
                  strokeWidth={2}
                  dot={{ fill: 'var(--navy-blue)', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Two Bar Charts Side by Side */}
          <div className="grid grid-cols-2 gap-6">
            {/* Top Project Managers */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[var(--navy-blue)] mb-4">Top Project Managers</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  data={topManagersData}
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
                    dataKey="manager"
                    width={120}
                    stroke="var(--chart-axis-light)"
                    tick={{ fill: 'var(--chart-axis-light)', fontSize: 12 }}
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

            {/* Projects per Company */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[var(--navy-blue)] mb-4">Projects per Company</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  data={projectsPerCompanyData}
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
                    dataKey="company"
                    width={120}
                    stroke="var(--chart-axis-light)"
                    tick={{ fill: 'var(--chart-axis-light)', fontSize: 12 }}
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
        </div>

        {/* Projects Database Table */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[var(--navy-blue)] mb-4">Projects Database</h3>
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
                        {(project.company_id && companyMap.get(project.company_id)) || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {project.quarter_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {projectManagerMap.get(String(project.project_id))?.join(', ') || 'N/A'}
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
      </div>
    </div>
  );
}

