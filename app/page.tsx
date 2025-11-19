"use client";

import { useState, useEffect, useMemo } from "react";
import {
  loadProjects,
  loadMembers,
  loadCompanies,
  loadGBMs,
  loadAttendance,
  loadAssignments,
  calculateActiveProjects,
  calculateAverageTeamSize,
  calculateProjectsPerCompany,
  calculateDonatedProjectsPercentage,
  calculateTotalMembers,
  calculateAssociatesAndAnalysts,
  calculateActiveMembers,
  calculateGBMAttendancePercentage,
  calculateAverageAttendancePerGBM
} from "../lib/data";
import { Project, Member, Company, GBM, Attendance, Assignment, isSupabaseConfigured } from "../lib/supabase";

const quarters = ["FA23", "FA24", "FA25", "SP23", "SP24", "SP25", "SU25", "WI24", "WI25"];
const tabs = ["Projects", "Members", "Companies", "GBMs"];

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

interface ChartPlaceholderProps {
  title: string;
  height?: string;
}

function ChartPlaceholder({ title, height = "h-96" }: ChartPlaceholderProps) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 shadow-sm ${height}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg h-full flex items-center justify-center">
        <span className="text-gray-400 text-sm">{title}</span>
      </div>
    </div>
  );
}

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

  const toggleQuarter = (quarter: string) => {
    setSelectedQuarters(prev =>
      prev.includes(quarter)
        ? prev.filter(q => q !== quarter)
        : [...prev, quarter]
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "Projects":
        const activeProjectsCount = calculateActiveProjects(projects, selectedQuarters);
        const avgTeamSize = calculateAverageTeamSize(assignments, projects, selectedQuarters);
        const projectsPerCompany = calculateProjectsPerCompany(projects, companies, selectedQuarters);
        const donatedProjectsPct = calculateDonatedProjectsPercentage(projects, selectedQuarters);
        
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Projects Overview</h2>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Performance Indicators</h3>
              <div className="grid grid-cols-4 gap-6 mb-8">
                <KPICard title="Active Projects" value={loading ? "..." : activeProjectsCount} />
                <KPICard title="Avg Team Size" value={loading ? "..." : avgTeamSize > 0 ? avgTeamSize.toFixed(1) : "N/A"} />
                <KPICard title="Projects per Company" value={loading ? "..." : projectsPerCompany.toFixed(1)} />
                <KPICard title="Donated Projects" value={loading ? "..." : `${donatedProjectsPct.toFixed(1)}%`} />
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <ChartPlaceholder title="Projects per Quarter" />
                <ChartPlaceholder title="Top Project Managers" />
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Metrics</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Tech vs Non-Tech Ratio
                  </div>
                  <div className="text-2xl font-bold text-gray-900">-</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Project Status Distribution
                  </div>
                  <div className="text-2xl font-bold text-gray-900">-</div>
                </div>
              </div>
            </div>
          </div>
        );

      case "Members":
        const totalMembersCount = calculateTotalMembers(members);
        const associatesAnalystsCount = calculateAssociatesAndAnalysts(members);
        const activeMembersCount = calculateActiveMembers(members);
        
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Members Overview</h2>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Performance Indicators</h3>
              <div className="grid grid-cols-4 gap-6 mb-8">
                <KPICard title="Total Members" value={loading ? "..." : totalMembersCount} />
                <KPICard title="Associates & Analysts" value={loading ? "..." : associatesAnalystsCount} />
                <KPICard title="Active Members" value={loading ? "..." : activeMembersCount} />
                <KPICard title="Active Associates" value="-" />
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <ChartPlaceholder title="Members by Role" />
                <ChartPlaceholder title="Members by Year" />
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Metrics</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Active Associates by Year
                  </div>
                  <div className="text-2xl font-bold text-gray-900">-</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Recruitment Prediction
                  </div>
                  <div className="text-2xl font-bold text-gray-900">-</div>
                </div>
              </div>
            </div>
          </div>
        );

      case "Companies":
        const totalCompaniesCount = companies.length;
        const avgProjectsPerCompany = calculateProjectsPerCompany(projects, companies, selectedQuarters);
        const donatedPct = calculateDonatedProjectsPercentage(projects, selectedQuarters);
        
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Companies Overview</h2>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Performance Indicators</h3>
              <div className="grid grid-cols-4 gap-6 mb-8">
                <KPICard title="Total Companies" value={loading ? "..." : totalCompaniesCount} />
                <KPICard title="Avg Projects/Company" value={loading ? "..." : avgProjectsPerCompany.toFixed(1)} />
                <KPICard title="Donated %" value={loading ? "..." : `${donatedPct.toFixed(1)}%`} />
                <KPICard title="Project Donated %" value="-" />
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <ChartPlaceholder title="Top 10 Companies by Project Count" />
                <ChartPlaceholder title="Company Engagement Trends" />
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Metrics</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Projects per Company Distribution
                  </div>
                  <div className="text-2xl font-bold text-gray-900">-</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Company Engagement Score
                  </div>
                  <div className="text-2xl font-bold text-gray-900">-</div>
                </div>
              </div>
            </div>
          </div>
        );

      case "GBMs":
        const totalGBMsCount = gbms.length;
        const gbmAttendancePct = calculateGBMAttendancePercentage(attendance);
        const avgAttendancePerGBM = calculateAverageAttendancePerGBM(attendance, gbms);
        
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">General Body Meetings Overview</h2>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Performance Indicators</h3>
              <div className="grid grid-cols-4 gap-6 mb-8">
                <KPICard title="Total GBMs" value={loading ? "..." : totalGBMsCount} />
                <KPICard title="GBM Attendance" value={loading ? "..." : `${gbmAttendancePct.toFixed(1)}%`} />
                <KPICard title="Avg Attendance/GBM" value={loading ? "..." : avgAttendancePerGBM.toFixed(1)} />
                <KPICard title="Attendance Prediction" value="-" />
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <ChartPlaceholder title="GBMs per Quarter" />
                <ChartPlaceholder title="Attendance Trend by GBM" />
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Metrics</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    % of Members Attending GBMs
                  </div>
                  <div className="text-2xl font-bold text-gray-900">-</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Attendance Prediction Model
                  </div>
                  <div className="text-2xl font-bold text-gray-900">-</div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Get unique quarters from the data (memoized to prevent infinite loops)
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
    } else if (availableQuarters.length === 0 && !quartersInitialized && !loading) {
      // Fallback to default quarters if no data available
      setSelectedQuarters(quarters);
      setQuartersInitialized(true);
    }
  }, [availableQuarters, quartersInitialized, loading]);

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">TCG Dashboard</h1>
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

        {/* Filters Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
            Filters
          </h3>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Quarters
            </label>
            <div className="flex flex-wrap gap-2">
              {(quartersInitialized && availableQuarters.length > 0 ? availableQuarters : quarters).map((quarter) => (
                <button
                  key={quarter}
                  onClick={() => toggleQuarter(quarter)}
                  disabled={loading}
                  className={`px-3 py-1 text-sm rounded-md border transition-colors disabled:opacity-50 ${
                    selectedQuarters.includes(quarter)
                      ? "bg-gray-100 border-gray-300 text-gray-900"
                      : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {quarter}
                  {selectedQuarters.includes(quarter) && (
                    <span className="ml-1 text-gray-500">×</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-gray-100 rounded-lg p-1 mb-8 inline-flex">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-md font-medium transition-colors ${
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
        {renderTabContent()}
      </div>
    </div>
  );
}
