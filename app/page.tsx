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
  getProjectManagers,
} from "../lib/data";
import { Project, Member, Company, GBM, Attendance, Assignment, isSupabaseConfigured } from "../lib/supabase";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from "recharts";

interface KPICardProps {
  title: string;
  value: string | number;
}

function KPICard({ title, value }: KPICardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        {title}
      </div>
      <div className="text-4xl font-bold text-gray-900">
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
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [showAllAttendance, setShowAllAttendance] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<number>>(new Set());
  
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
  const activeProjects = calculateActiveProjects(projects, ['FA25']);
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
    return getProjectManagers(assignments, projects, members);
  }, [assignments, projects, members]);
  
  const searchFilteredProjects = useMemo(() => {
    // Helper function to convert quarter to sortable number
    const quarterToNumber = (quarter: string): number => {
      const seasonMap: { [key: string]: number } = { 'WI': 0, 'SP': 1, 'SU': 2, 'FA': 3 };
      const season = quarter.substring(0, 2);
      const year = parseInt(quarter.substring(2, 4));
      return year * 4 + (seasonMap[season] || 0);
    };

    let result = filteredProjects;
    
    if (projectSearchQuery.trim()) {
      const query = projectSearchQuery.toLowerCase().trim();
      
      result = result.filter(project => {
        const companyName = project.company_id !== undefined 
          ? (companyMap.get(project.company_id) || '').toLowerCase()
          : '';
        const quarter = (project.quarter_id || '').toLowerCase();
        const pm = (projectManagerMap.get(project.project_id)?.join(', ') || '').toLowerCase();
        const track = (project.track || '').toLowerCase();
        const status = project.dnf ? 'dnf' : (project.status || (project.quarter_id === 'FA25' ? 'ongoing' : 'completed')).toLowerCase();
        const donated = project.donated ? 'yes' : 'no';
        const description = (project.description || '').toLowerCase();
        
        return companyName.includes(query) ||
               quarter.includes(query) ||
               pm.includes(query) ||
               track.includes(query) ||
               status.includes(query) ||
               donated.includes(query) ||
               description.includes(query);
      });
    }
    
    // Sort by quarter descending (FA25 first)
    return result.sort((a, b) => {
      const aNum = quarterToNumber(a.quarter_id);
      const bNum = quarterToNumber(b.quarter_id);
      return bNum - aNum; // Descending order
    });
  }, [filteredProjects, projectSearchQuery, companyMap, projectManagerMap]);


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
    { category: "Business", count: techNonTechMembersForTab.nonTech }
  ];
  const associatesAnalystsData = [
    { category: "Associates", count: associatesAnalysts.associates },
    { category: "Analysts", count: associatesAnalysts.analysts }
  ];
  
  const searchFilteredMembers = useMemo(() => {
    // Helper function to convert quarter to sortable number
    const quarterToNumber = (quarter: string): number => {
      if (!quarter) return -1; // Put members without quarter at the end
      const seasonMap: { [key: string]: number } = { 'WI': 0, 'SP': 1, 'SU': 2, 'FA': 3 };
      const season = quarter.substring(0, 2);
      const year = parseInt(quarter.substring(2, 4));
      return year * 4 + (seasonMap[season] || 0);
    };

    let result = members;
    
    if (memberSearchQuery.trim()) {
      const query = memberSearchQuery.toLowerCase().trim();
      
      result = result.filter(member => {
        const name = (member.name || '').toLowerCase();
        const quarterEntered = (member.quarter_entered || '').toLowerCase();
        const quarterGraduating = (member.quarter_graduating || '').toLowerCase();
        const role = (member.role || '').toLowerCase();
        const track = (member.track || '').toLowerCase();
        const ucsdEmail = (member.ucsd_email || '').toLowerCase();
        const personalEmail = (member.personal_email || '').toLowerCase();
        const status = member.status ? 'active' : 'inactive';
        
        return name.includes(query) ||
               quarterEntered.includes(query) ||
               quarterGraduating.includes(query) ||
               role.includes(query) ||
               track.includes(query) ||
               ucsdEmail.includes(query) ||
               personalEmail.includes(query) ||
               status.includes(query);
      });
    }
    
    // Sort by quarter_entered descending (most recent first)
    return result.sort((a, b) => {
      const aNum = quarterToNumber(a.quarter_entered || '');
      const bNum = quarterToNumber(b.quarter_entered || '');
      return bNum - aNum; // Descending order
    });
  }, [members, memberSearchQuery]);

  // Attendance matrix for members
  const attendanceMatrix = useMemo(() => {
    // Get GBMs for selected quarters
    const filteredGBMs = gbms.filter(g => selectedQuarters.includes(g.quarter_id));
    
    // Sort GBMs by date
    const sortedGBMs = filteredGBMs.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateA - dateB;
    });
    
    // Create attendance map for quick lookup
    const attendanceMap = new Map<string, boolean>();
    attendance.forEach(att => {
      const key = `${att.member_id}-${att.gbm_id}`;
      attendanceMap.set(key, att.status === true);
    });
    
    // Build matrix data
    return members.map(member => {
      const memberAttendance = sortedGBMs.map(gbm => {
        const key = `${member.member_id}-${gbm.gbm_id}`;
        return attendanceMap.get(key) || false;
      });
      
      const totalAttended = memberAttendance.filter(attended => attended).length;
      
      return {
        member,
        attendance: memberAttendance,
        totalAttended
      };
    });
  }, [members, gbms, attendance, selectedQuarters]);

  // Get sorted GBMs for table headers
  const sortedGBMsForHeaders = useMemo(() => {
    const filteredGBMs = gbms.filter(g => selectedQuarters.includes(g.quarter_id));
    return filteredGBMs.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateA - dateB;
    });
  }, [gbms, selectedQuarters]);

  // Filtered attendance matrix based on search
  const searchFilteredAttendanceMatrix = useMemo(() => {
    if (!memberSearchQuery.trim()) {
      return attendanceMatrix;
    }
    
    const query = memberSearchQuery.toLowerCase().trim();
    return attendanceMatrix.filter(row => {
      const name = (row.member.name || '').toLowerCase();
      return name.includes(query);
    });
  }, [attendanceMatrix, memberSearchQuery]);

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
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-8 shadow-md mb-8">
        <div className="text-2xl font-semibold text-blue-900 uppercase tracking-wide mb-6">
          Overview
        </div>
        <div className="grid grid-cols-3 gap-8">
          <div className="bg-white border-l-4 border-blue-500 rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-3">
              Active Projects
            </div>
            <div className="text-4xl font-bold text-gray-900">
              {loading ? "..." : activeProjects}
            </div>
          </div>
          <div className="bg-white border-l-4 border-indigo-500 rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-sm font-semibold text-indigo-600 uppercase tracking-wide mb-3">
              Tech to Business Projects
            </div>
            <div className="text-4xl font-bold text-gray-900">
              {loading ? "..." : `${techNonTechProjects.tech}:${techNonTechProjects.nonTech}`}
            </div>
          </div>
          <div className="bg-white border-l-4 border-blue-500 rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-3">
              Total Lifetime Projects
            </div>
            <div className="text-4xl font-bold text-gray-900">
              {loading ? "..." : totalLifetimeProjects}
            </div>
          </div>
          <div className="bg-white border-l-4 border-indigo-500 rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-sm font-semibold text-indigo-600 uppercase tracking-wide mb-3">
              Participating Members
            </div>
            <div className="text-4xl font-bold text-gray-900">
              {loading ? "..." : participatingMembers}
            </div>
          </div>
          <div className="bg-white border-l-4 border-blue-500 rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-3">
              Tech to Business Members
            </div>
            <div className="text-4xl font-bold text-gray-900">
              {loading ? "..." : `${techNonTechMembers.tech}:${techNonTechMembers.nonTech}`}
            </div>
          </div>
          <div className="bg-white border-l-4 border-indigo-500 rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-sm font-semibold text-indigo-600 uppercase tracking-wide mb-3">
              Average Members per Active Project
            </div>
            <div className="text-4xl font-bold text-gray-900">
              {loading ? "..." : avgMembersPerProject > 0 ? avgMembersPerProject.toFixed(1) : "0"}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="space-y-8 mb-8">
        {/* Projects per Quarter Line Chart */}
        <div className="bg-gradient-to-br from-white to-blue-50 border border-blue-200 rounded-lg p-8 shadow-md">
          <h3 className="text-2xl font-semibold text-blue-900 mb-6">Projects per Quarter</h3>
          <ResponsiveContainer width="100%" height={500}>
            <LineChart data={projectsPerQuarterData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="quarter" 
                stroke="#1f2937"
                tick={{ fill: '#1f2937', fontSize: 18 }}
              />
              <YAxis 
                stroke="#1f2937"
                tick={{ fill: '#1f2937', fontSize: 18 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
                labelStyle={{ fontWeight: 'bold' }}
              />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#3B82F6" 
                strokeWidth={3}
                dot={{ fill: '#3B82F6', r: 5, strokeWidth: 2, stroke: '#fff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Two Bar Charts Side by Side */}
        <div className="grid grid-cols-2 gap-8">
          {/* Top Project Managers */}
          <div className="bg-gradient-to-br from-white to-indigo-50 border border-indigo-200 rounded-lg p-8 shadow-md">
            <h3 className="text-2xl font-semibold text-indigo-900 mb-6">Top Project Managers</h3>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart 
                data={topManagersData}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  type="number"
                  stroke="#1f2937"
                  tick={{ fill: '#1f2937', fontSize: 18 }}
                  allowDecimals={false}
                />
                <YAxis 
                  type="category"
                  dataKey="manager"
                  width={200}
                  stroke="#1f2937"
                  tick={{ fill: '#1f2937', fontSize: 18 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Bar 
                  dataKey="count" 
                  fill="#6366F1"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Projects per Company */}
          <div className="bg-gradient-to-br from-white to-cyan-50 border border-cyan-200 rounded-lg p-8 shadow-md">
            <h3 className="text-2xl font-semibold text-cyan-900 mb-6">Projects per Company</h3>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart 
                data={projectsPerCompanyData}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  type="number"
                  stroke="#1f2937"
                  tick={{ fill: '#1f2937', fontSize: 18 }}
                  ticks={[0, 1, 2, 3, 4, 5, 6]}
                />
                <YAxis 
                  type="category"
                  dataKey="company"
                  width={200}
                  stroke="#1f2937"
                  tick={{ fill: '#1f2937', fontSize: 18 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Bar 
                  dataKey="count" 
                  fill="#06B6D4"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Projects Database Table */}
      <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-lg p-8 shadow-md">
        <h3 className="text-2xl font-semibold text-slate-900 mb-6">Projects Database</h3>
        
        {/* Search Box */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search projects..."
            value={projectSearchQuery}
            onChange={(e) => setProjectSearchQuery(e.target.value)}
            className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-blue-100 to-indigo-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-blue-900 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-blue-900 uppercase tracking-wider">
                  Quarter
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-blue-900 uppercase tracking-wider">
                  PM
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-blue-900 uppercase tracking-wider">
                  Track
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-blue-900 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-blue-900 uppercase tracking-wider">
                  Donated
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-blue-900 uppercase tracking-wider">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-base text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : searchFilteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-base text-gray-500">
                    No projects found
                  </td>
                </tr>
              ) : (
                (showAllProjects ? searchFilteredProjects : searchFilteredProjects.slice(0, 20)).map((project) => (
                  <tr key={project.project_id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                      {project.company_id !== undefined ? (companyMap.get(project.company_id) || 'Unknown') : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                      {project.quarter_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                      {projectManagerMap.get(project.project_id)?.join(', ') || 'Project manager graduated'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                      {project.track ? (
                        project.track.toLowerCase() === 'non-tech' || project.track.toLowerCase() === 'nontech' 
                          ? 'Business' 
                          : project.track.toLowerCase() === 'tech' 
                            ? 'Tech' 
                            : project.track
                      ) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                      {project.dnf ? 'DNF' : (project.status || (project.quarter_id === 'FA25' ? 'Ongoing' : 'Completed'))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                      {project.donated ? 'Yes' : 'No'}
                    </td>
                    <td 
                      className={`px-6 py-4 text-base text-gray-900 max-w-md cursor-pointer hover:bg-gray-100 ${
                        expandedDescriptions.has(project.project_id) ? '' : 'truncate'
                      }`}
                      onClick={() => {
                        const newExpanded = new Set(expandedDescriptions);
                        if (newExpanded.has(project.project_id)) {
                          newExpanded.delete(project.project_id);
                        } else {
                          newExpanded.add(project.project_id);
                        }
                        setExpandedDescriptions(newExpanded);
                      }}
                    >
                      {project.description && project.description !== 'nan' ? project.description : 'No description given'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Show All / Show Less Button */}
        {searchFilteredProjects.length > 20 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setShowAllProjects(!showAllProjects)}
              className="px-6 py-3 text-base font-semibold bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:shadow-lg transition-all"
            >
              {showAllProjects ? 'Show Less' : `Show All (${searchFilteredProjects.length} projects)`}
            </button>
          </div>
        )}
      </div>
    </>
  );

  const renderMembersTab = () => (
    <>
      {/* KPI Cards */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-8 shadow-md mb-8">
        <div className="text-2xl font-semibold text-emerald-900 uppercase tracking-wide mb-6">
          Overview
        </div>
        <div className="grid grid-cols-4 gap-8">
          <div className="bg-white border-l-4 border-emerald-500 rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-sm font-semibold text-emerald-600 uppercase tracking-wide mb-3">
              Current Members
            </div>
            <div className="text-4xl font-bold text-gray-900">
              {loading ? "..." : activeMembers + inactiveMembers}
            </div>
          </div>
          <div className="bg-white border-l-4 border-teal-500 rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-sm font-semibold text-teal-600 uppercase tracking-wide mb-3">
              Active
            </div>
            <div className="text-4xl font-bold text-gray-900">
              {loading ? "..." : activeMembers}
            </div>
          </div>
          <div className="bg-white border-l-4 border-emerald-500 rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-sm font-semibold text-emerald-600 uppercase tracking-wide mb-3">
              Inactive
            </div>
            <div className="text-4xl font-bold text-gray-900">
              {loading ? "..." : inactiveMembers}
            </div>
          </div>
          <div className="bg-white border-l-4 border-teal-500 rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-sm font-semibold text-teal-600 uppercase tracking-wide mb-3">
              Total Lifetime Members
            </div>
            <div className="text-4xl font-bold text-gray-900">
              {loading ? "..." : totalLifetimeMembers}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section - 2x2 Grid */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Attendance per GBM */}
        <div className="bg-gradient-to-br from-white to-emerald-50 border border-emerald-200 rounded-lg p-8 shadow-md">
          <h3 className="text-2xl font-semibold text-emerald-900 mb-6">Attendance per GBM</h3>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={attendancePerGBMData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="date" 
                stroke="#1f2937"
                tick={{ fill: '#1f2937', fontSize: 18 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                stroke="#1f2937"
                tick={{ fill: '#1f2937', fontSize: 18 }}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div style={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '10px'
                      }}>
                        <p style={{ margin: 0, fontWeight: 'bold' }}>{label}</p>
                        <p style={{ margin: '5px 0 0 0', color: '#10B981' }}>
                          count: {payload[0].value}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="attendance" fill="#10B981" />
              <Line 
                type="monotone" 
                dataKey="attendance" 
                stroke="#059669" 
                strokeWidth={3}
                dot={{ fill: '#059669', r: 5, strokeWidth: 2, stroke: '#fff' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Members per Year */}
        <div className="bg-gradient-to-br from-white to-teal-50 border border-teal-200 rounded-lg p-8 shadow-md">
          <h3 className="text-2xl font-semibold text-teal-900 mb-6">New Members per Quarter</h3>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={membersPerQuarterData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="quarter" 
                stroke="#1f2937"
                tick={{ fill: '#1f2937', fontSize: 18 }}
              />
              <YAxis 
                stroke="#1f2937"
                tick={{ fill: '#1f2937', fontSize: 18 }}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div style={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '10px'
                      }}>
                        <p style={{ margin: 0, fontWeight: 'bold' }}>{label}</p>
                        <p style={{ margin: '5px 0 0 0', color: '#14B8A6' }}>
                          count: {payload[0].value}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" fill="#14B8A6" />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#0D9488" 
                strokeWidth={3}
                dot={{ fill: '#0D9488', r: 5, strokeWidth: 2, stroke: '#fff' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Tech vs Business */}
        <div className="bg-gradient-to-br from-white to-emerald-50 border border-emerald-200 rounded-lg p-8 shadow-md">
          <h3 className="text-2xl font-semibold text-emerald-900 mb-6">Tech vs Business</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart 
              data={techNonTechData}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                type="number"
                stroke="#1f2937"
                tick={{ fill: '#1f2937', fontSize: 18 }}
              />
              <YAxis 
                type="category"
                dataKey="category"
                width={120}
                stroke="#1f2937"
                tick={{ fill: '#1f2937', fontSize: 18 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
                labelStyle={{ fontWeight: 'bold' }}
              />
              <Bar 
                dataKey="count" 
                fill="#10B981"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Associates vs Analysts */}
        <div className="bg-gradient-to-br from-white to-teal-50 border border-teal-200 rounded-lg p-8 shadow-md">
          <h3 className="text-2xl font-semibold text-teal-900 mb-6">Associates vs Analysts</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart 
              data={associatesAnalystsData}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                type="number"
                stroke="#1f2937"
                tick={{ fill: '#1f2937', fontSize: 18 }}
              />
              <YAxis 
                type="category"
                dataKey="category"
                width={120}
                stroke="#1f2937"
                tick={{ fill: '#1f2937', fontSize: 18 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
                labelStyle={{ fontWeight: 'bold' }}
              />
              <Bar 
                dataKey="count" 
                fill="#14B8A6"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Members Database Table */}
      <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-lg p-8 shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-semibold text-slate-900">
            {showAttendance ? 'GBM Attendance Tracking' : 'Members Database'}
          </h3>
          <button
            onClick={() => setShowAttendance(!showAttendance)}
            className="px-6 py-3 text-base font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:shadow-lg transition-all"
          >
            {showAttendance ? 'Show Member Data' : 'Show Attendance'}
          </button>
        </div>
        
        {/* Search Box */}
        <div className="mb-6">
          <input
            type="text"
            placeholder={showAttendance ? "Search members..." : "Search members..."}
            value={memberSearchQuery}
            onChange={(e) => setMemberSearchQuery(e.target.value)}
            className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        
        {!showAttendance ? (
          <>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-emerald-100 to-teal-100">
              <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-emerald-900 uppercase tracking-wider">
                  Name
                </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-emerald-900 uppercase tracking-wider">
                  Quarter Entered
                </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-emerald-900 uppercase tracking-wider">
                  Quarter Graduating
                </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-emerald-900 uppercase tracking-wider">
                  Role
                </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-emerald-900 uppercase tracking-wider">
                  Track
                </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-emerald-900 uppercase tracking-wider">
                  UCSD Email
                </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-emerald-900 uppercase tracking-wider">
                  Personal Email
                </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-emerald-900 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                      <td colSpan={8} className="px-6 py-4 text-center text-base text-gray-500">
                    Loading...
                  </td>
                </tr>
                  ) : searchFilteredMembers.length === 0 ? (
                <tr>
                      <td colSpan={8} className="px-6 py-4 text-center text-base text-gray-500">
                    No members found
                  </td>
                </tr>
              ) : (
                    (showAllMembers ? searchFilteredMembers : searchFilteredMembers.slice(0, 20)).map((member) => (
                      <tr key={member.member_id} className="hover:bg-emerald-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                      {member.name || 'N/A'}
                    </td>
                        <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                      {member.quarter_entered || 'N/A'}
                    </td>
                        <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                      {member.quarter_graduating || 'N/A'}
                    </td>
                        <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                      {member.role || 'N/A'}
                    </td>
                        <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                      {member.track || 'N/A'}
                    </td>
                        <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                      {member.ucsd_email || 'N/A'}
                    </td>
                        <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                      {member.personal_email || 'N/A'}
                    </td>
                        <td className="px-6 py-4 whitespace-nowrap text-base">
                          <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
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
            
            {/* Show All / Show Less Button */}
            {searchFilteredMembers.length > 20 && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowAllMembers(!showAllMembers)}
                  className="px-6 py-3 text-base font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:shadow-lg transition-all"
                >
                  {showAllMembers ? 'Show Less' : `Show All (${searchFilteredMembers.length} members)`}
                </button>
      </div>
            )}
          </>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-emerald-100 to-teal-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-emerald-900 uppercase tracking-wider sticky left-0 bg-gradient-to-r from-emerald-100 to-teal-100">
                      Member Name
                    </th>
                    {sortedGBMsForHeaders.map(gbm => {
                      let formattedDate = gbm.gbm_id;
                      if (gbm.date) {
                        try {
                          const dateObj = new Date(gbm.date);
                          formattedDate = dateObj.toISOString().split('T')[0];
                        } catch {
                          formattedDate = gbm.date.split(' ')[0] || gbm.date;
                        }
                      }
                      return (
                        <th key={gbm.gbm_id} className="px-6 py-4 text-center text-sm font-medium text-emerald-900 uppercase tracking-wider whitespace-nowrap">
                          {formattedDate}
                        </th>
                      );
                    })}
                    <th className="px-6 py-4 text-center text-sm font-medium text-emerald-900 uppercase tracking-wider">
                      Total Attended
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={sortedGBMsForHeaders.length + 2} className="px-6 py-4 text-center text-base text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : searchFilteredAttendanceMatrix.length === 0 ? (
                    <tr>
                      <td colSpan={sortedGBMsForHeaders.length + 2} className="px-6 py-4 text-center text-base text-gray-500">
                        No members found
                      </td>
                    </tr>
                  ) : (
                    (showAllAttendance ? searchFilteredAttendanceMatrix : searchFilteredAttendanceMatrix.slice(0, 20)).map((row) => (
                      <tr key={row.member.member_id} className="hover:bg-emerald-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900 font-medium sticky left-0 bg-white">
                          {row.member.name || 'Unknown'}
                        </td>
                        {row.attendance.map((attended, idx) => (
                          <td key={idx} className="px-6 py-4 text-center text-base">
                            {attended ? (
                              <span className="text-green-600 text-xl font-bold">✓</span>
                            ) : (
                              <span className="text-red-600 text-xl font-bold">✗</span>
                            )}
                          </td>
                        ))}
                        <td className="px-6 py-4 text-center text-base text-gray-900 font-semibold">
                          {row.totalAttended}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Show All / Show Less Button for Attendance */}
            {searchFilteredAttendanceMatrix.length > 20 && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowAllAttendance(!showAllAttendance)}
                  className="px-6 py-3 text-base font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:shadow-lg transition-all"
                >
                  {showAllAttendance ? 'Show Less' : `Show All (${searchFilteredAttendanceMatrix.length} members)`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[80%] mx-auto px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-6 mb-2">
            <Image src="/logo.png" alt="TCG Logo" width={120} height={120} className="object-contain" />
            <h1 className="text-5xl font-bold text-gray-900">TCG Dashboard</h1>
          </div>
          {loading && (
            <div className="text-base text-gray-500 flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
              Loading data...
            </div>
          )}
          {!loading && !isSupabaseConfigured() && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="text-yellow-800 text-base">
                <strong>⚠️ Supabase not configured:</strong> Please set up your environment variables in <code>.env.local</code> to connect to your database.
              </div>
            </div>
          )}
        </div>

        {/* Tabs Navigation */}
        <div className="bg-gray-100 rounded-lg p-2 mb-8 inline-flex gap-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            const isProjects = tab === "Projects";
            
            let buttonClasses = "px-8 py-4 rounded-md cursor-pointer text-xl font-bold transition-all ";
            
            if (isActive) {
              buttonClasses += isProjects 
                ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg"
                : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg";
            } else {
              buttonClasses += isProjects
                ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200";
            }
            
            return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
                className={buttonClasses}
            >
              {tab}
            </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === "Projects" && renderProjectsTab()}
        {activeTab === "Members" && renderMembersTab()}
      </div>
    </div>
  );
}
