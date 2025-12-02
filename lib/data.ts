import { supabase, isSupabaseConfigured, Project, Member, Company, GBM, Attendance, Assignment } from './supabase'

export async function loadProjects(): Promise<Project[]> {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase is not configured. Please set up environment variables.')
    return []
  }
  
  try {
    const { data, error } = await supabase
      .from('project')
      .select('*')
    
    if (error) {
      console.error('Error loading projects:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error loading projects:', error)
    return []
  }
}

export async function loadMembers(): Promise<Member[]> {
  
  if (!isSupabaseConfigured()) return []

  try {
    const { data, error } = await supabase
      .from('member')
      .select('*')

    if (error) {
      console.error('Error loading members:', error)
      return []
    }

    // Enforce proper boolean + default nulls
    return (data || []).map(row => ({
      member_id: row.member_id,
      PID: row.PID ?? null,
      name: row.name,
      quarter_entered: row.quarter_entered ?? null,
      quarter_graduating: row.quarter_graduating ?? null,
      role: row.role ?? null,
      ucsd_email: row.ucsd_email ?? null,
      personal_email: row.personal_email ?? null,
      track: row.track ?? null,
      status: Boolean(row.status)  // Ensures true/false always
    }))
  } catch (error) {
    console.error('Error loading members:', error)
    return []
  }
}


export async function loadCompanies(): Promise<Company[]> {
  if (!isSupabaseConfigured()) return []
  
  try {
    const { data, error } = await supabase
      .from('company')
      .select('*')
    
    if (error) {
      console.error('Error loading companies:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error loading companies:', error)
    return []
  }
}

export async function loadGBMs(): Promise<GBM[]> {
  if (!isSupabaseConfigured()) return []
  
  try {
    const { data, error } = await supabase
      .from('gbm')
      .select('*')
    
    if (error) {
      console.error('Error loading GBMs:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error loading GBMs:', error)
    return []
  }
}

export async function loadAttendance(): Promise<Attendance[]> {
  if (!isSupabaseConfigured()) return []
  
  try {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
    
    if (error) {
      console.error('Error loading attendance:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error loading attendance:', error)
    return []
  }
}

export async function loadAssignments(): Promise<Assignment[]> {
  if (!isSupabaseConfigured()) return []
  
  try {
    const { data, error } = await supabase
      .from('assignment')
      .select('*')
    
    if (error) {
      console.error('Error loading assignments:', error)
      return []
    }
    
    // Ensure proper type conversion
    const assignments = (data || []).map(row => ({
      assignment_id: row.assignment_id,
      project_id: Number(row.project_id),
      member_id: Number(row.member_id),
      project_manager: Boolean(row.project_manager)
    }))
    
    console.log('Loaded assignments:', {
      total: assignments.length,
      withPM: assignments.filter(a => a.project_manager === true).length,
      sample: assignments.slice(0, 3)
    })
    
    return assignments
  } catch (error) {
    console.error('Error loading assignments:', error)
    return []
  }
}

// Helper functions for calculating metrics
export function calculateActiveProjects(projects: Project[], selectedQuarters: string[]): number {
  return projects.filter(p => selectedQuarters.includes(p.quarter_id)).length
}

export function calculateAverageTeamSize(assignments: Assignment[], projects: Project[], selectedQuarters: string[]): number {
  const filteredProjects = projects.filter(p => selectedQuarters.includes(p.quarter_id))
  const projectIds = filteredProjects.map(p => p.project_id)
  
  if (projectIds.length === 0) return 0
  
  const projectTeamSizes = projectIds.map(projectId => 
    assignments.filter(a => a.project_id === projectId).length
  )
  
  const totalMembers = projectTeamSizes.reduce((sum, size) => sum + size, 0)
  return projectIds.length > 0 ? totalMembers / projectIds.length : 0
}

export function calculateProjectsPerCompany(projects: Project[], companies: Company[], selectedQuarters: string[]): number {
  const filteredProjects = projects.filter(p => selectedQuarters.includes(p.quarter_id))
  return companies.length > 0 ? filteredProjects.length / companies.length : 0
}

export function calculateDonatedProjectsPercentage(projects: Project[], selectedQuarters: string[]): number {
  const filteredProjects = projects.filter(p => selectedQuarters.includes(p.quarter_id))
  if (filteredProjects.length === 0) return 0
  
  const donatedCount = filteredProjects.filter(p => p.donated === true).length
  return (donatedCount / filteredProjects.length) * 100
}

export function calculateTotalMembers(members: Member[]): number {
  return members.length
}

export function calculateAssociatesAndAnalysts(members: Member[]): number {
  return members.filter(m => 
    m.role?.toLowerCase().includes('associate') || 
    m.role?.toLowerCase().includes('analyst')
  ).length
}

export function calculateActiveMembers(members: Member[]): number {
  return members.filter(m => m.status === true).length
}

export function calculateGBMAttendancePercentage(attendance: Attendance[]): number {
  if (attendance.length === 0) return 0
  
  const attendedCount = attendance.filter(a => a.status === true).length
  return (attendedCount / attendance.length) * 100
}

export function calculateAverageAttendancePerGBM(attendance: Attendance[], gbms: GBM[]): number {
  if (gbms.length === 0) return 0
  
  const gbmAttendanceCounts = gbms.map(gbm => 
    attendance.filter(a => a.gbm_id === gbm.gbm_id && a.status === true).length
  )
  
  const totalAttendance = gbmAttendanceCounts.reduce((sum, count) => sum + count, 0)
  return totalAttendance / gbms.length
}

// New calculation functions for projects page
export function calculateTotalLifetimeProjects(projects: Project[]): number {
  return projects.length
}

export function calculateTechToNonTechProjects(projects: Project[], selectedQuarters: string[]): { tech: number; nonTech: number } {
  const filteredProjects = projects.filter(p => selectedQuarters.includes(p.quarter_id))
  
  let techCount = 0
  let nonTechCount = 0
  
  filteredProjects.forEach(project => {
    const track = (project.track || '').trim().toLowerCase()
    
    if (track === 'tech') {
      techCount++
    } else {
      nonTechCount++
    }
  })
  
  return { tech: techCount, nonTech: nonTechCount }
}

export function calculateParticipatingMembers(assignments: Assignment[], projects: Project[], selectedQuarters: string[]): number {
  const uniqueMemberIds = new Set(assignments.map(a => a.member_id))
  return uniqueMemberIds.size
}

export function calculateTechToNonTechMembers(
  members: Member[]
): { tech: number; nonTech: number } {

  let tech = 0
  let nonTech = 0

  members.forEach(member => {
    const track = (member.track || '').trim().toLowerCase()

    if (track === 'tech') {
      tech++
    } else {
      nonTech++
    }
  })

  return { tech, nonTech }
}


export function calculateProjectsPerQuarter(projects: Project[], selectedQuarters: string[]): { quarter: string; count: number }[] {
  // Define all quarters to display
  const allQuarters = ['SU23', 'FA23', 'WI24', 'SP24', 'SU24', 'FA24', 'WI25', 'SP25', 'SU25', 'FA25']
  
  const filteredProjects = projects.filter(p => selectedQuarters.includes(p.quarter_id))
  const quarterCounts: { [key: string]: number } = {}
  
  filteredProjects.forEach(project => {
    const quarter = project.quarter_id
    quarterCounts[quarter] = (quarterCounts[quarter] || 0) + 1
  })
  
  // Return all quarters in chronological order with their counts (0 if no projects)
  return allQuarters.map(quarter => ({
    quarter,
    count: quarterCounts[quarter] || 0
  }))
}

export function calculateTopProjectManagers(assignments: Assignment[], projects: Project[], members: Member[], selectedQuarters: string[]): { manager: string; count: number }[] {
  const filteredProjects = projects.filter(p => selectedQuarters.includes(p.quarter_id))
  const projectIds = new Set(filteredProjects.map(p => p.project_id))
  const memberMap = new Map<number, string>(
    members.map(m => [m.member_id, m.name || 'Unknown'])
  )
  const managerCounts: { [key: string]: number } = {}
  
  assignments.forEach(assignment => {
    if (assignment.project_manager === true && projectIds.has(assignment.project_id)) {
      const managerName = memberMap.get(assignment.member_id) || 'Unknown'
      managerCounts[managerName] = (managerCounts[managerName] || 0) + 1
    }
  })
  
  return Object.entries(managerCounts)
    .map(([manager, count]) => ({ manager, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

export function calculateProjectsPerCompanyChart(projects: Project[], companies: Company[], selectedQuarters: string[]): { company: string; count: number }[] {
  const filteredProjects = projects.filter(p => selectedQuarters.includes(p.quarter_id))
  const companyMap = new Map(companies.map(c => [c.company_id, c.name || 'Unknown']))
  const companyCounts: { [key: string]: number } = {}
  
  filteredProjects.forEach(project => {
    const companyName = project.company_id !== undefined 
      ? (companyMap.get(project.company_id) || 'Unknown')
      : 'Unknown'
    companyCounts[companyName] = (companyCounts[companyName] || 0) + 1
  })
  
  return Object.entries(companyCounts)
    .map(([company, count]) => ({ company, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

// Members page calculation functions
export function calculateTotalLifetimeMembers(members: Member[]): number {
  return members.length
}

export function calculateActiveMembersCount(members: Member[]): number {
  return members.filter(m => m.status === true).length
}

export function calculateInactiveMembersCount(members: Member[]): number {
  return members.filter(m => m.status === false).length
}

export function calculateAttendancePerGBM(attendance: Attendance[], gbms: GBM[], selectedQuarters: string[]): { gbm_id: string; date: string; attendance: number }[] {
  const filteredGBMs = gbms.filter(g => selectedQuarters.includes(g.quarter_id))
  
  return filteredGBMs.map(gbm => {
    const attendedCount = attendance.filter(a => 
      a.gbm_id === gbm.gbm_id && a.status === true
    ).length
    
    // Format date to only show date portion (YYYY-MM-DD), not time
    let formattedDate = gbm.gbm_id
    if (gbm.date) {
      try {
        const dateObj = new Date(gbm.date)
        formattedDate = dateObj.toISOString().split('T')[0]
      } catch {
        formattedDate = gbm.date.split(' ')[0] || gbm.date
      }
    }
    
    return {
      gbm_id: gbm.gbm_id,
      date: formattedDate,
      attendance: attendedCount
    }
  }).sort((a, b) => a.date.localeCompare(b.date))
}

export function calculateNewMembersPerQuarter(members: Member[]): { quarter: string; count: number }[] {
  const quarterCounts: { [quarter: string]: number } = {}

  members.forEach(member => {
    let quarter = member.quarter_entered;

    // Skip unknown/invalid quarters
    if (!quarter || typeof quarter !== "string") {
      return;
    }
    
    quarter = quarter.trim();
    
    // Skip "Unknown" entries
    if (quarter === "Unknown") {
      return;
    }

    quarterCounts[quarter] = (quarterCounts[quarter] || 0) + 1;
  });

  // Helper function to convert quarter to sortable value
  const getQuarterValue = (quarter: string): number => {
    // Expected format: FA22, WI23, SP23, etc.
    const match = quarter.match(/^(FA|WI|SP|SU)(\d{2})$/);
    if (!match) return 999999; // Invalid format goes to end
    
    const [, season, year] = match;
    const yearNum = parseInt(year, 10);
    
    // Map seasons to order within a year
    const seasonOrder: { [key: string]: number } = {
      'WI': 0, // Winter (starts year)
      'SP': 1, // Spring
      'SU': 2, // Summer
      'FA': 3  // Fall
    };
    
    // Calculate sortable value: year * 10 + season order
    return yearNum * 10 + (seasonOrder[season] ?? 9);
  };

  return Object.entries(quarterCounts)
    .map(([quarter, count]) => ({ quarter, count }))
    .sort((a, b) => {
      return getQuarterValue(a.quarter) - getQuarterValue(b.quarter);
    });
}



export function calculateAssociatesVsAnalysts(members: Member[]): { associates: number; analysts: number } {
  let associates = 0
  let analysts = 0
  
  members.forEach(member => {
    const role = (member.role || '').toLowerCase()
    // Check for analyst first, otherwise count as associate
    if (role.includes('analyst')) {
      analysts++
    } else {
      associates++
    }
  })
  
  return { associates, analysts }
}

export function getProjectManagers(assignments: Assignment[], projects: Project[], members: Member[]): Map<number, string[]> {
  // Create a map of project_id to project manager names
  // This follows the merge logic: projects + assignments (on project_id) + members (on member_id)
  // where assignment.project_manager === true
  
  const managerMap = new Map<number, string[]>()
  
  // Create a member lookup map (member_id -> name)
  const memberMap = new Map<number, string>()
  members.forEach(member => {
    memberMap.set(member.member_id, member.name || 'Unknown')
  })
  
  // Create a set of valid project IDs
  const projectIds = new Set(projects.map(p => p.project_id))
  
  // Debug logging
  console.log('getProjectManagers debug:', {
    totalAssignments: assignments.length,
    totalMembers: members.length,
    totalProjects: projects.length,
    pmAssignments: assignments.filter(a => a.project_manager === true).length,
    sampleAssignment: assignments[0],
    sampleMember: members[0],
    sampleProject: projects[0]
  })
  
  // Iterate through assignments and find project managers
  assignments.forEach(assignment => {
    // Check if this assignment is for a project manager
    if (assignment.project_manager === true) {
      const projectId = assignment.project_id
      const memberId = assignment.member_id
      
      // Only include if the project exists
      if (projectIds.has(projectId)) {
        const memberName = memberMap.get(memberId)
        
        if (memberName) {
          if (!managerMap.has(projectId)) {
            managerMap.set(projectId, [])
          }
          managerMap.get(projectId)!.push(memberName)
          console.log(`Found PM: ${memberName} for project ${projectId}`)
        } else {
          console.log(`No member found for member_id: ${memberId}`)
        }
      } else {
        console.log(`Project ${projectId} not in valid project IDs`)
      }
    }
  })
  
  console.log('Total PMs found:', managerMap.size)
  console.log('PM Map:', Array.from(managerMap.entries()))
  
  return managerMap
}

export function buildMemberNetwork(assignments: Assignment[], projects: Project[], members: Member[], selectedQuarters: string[]): { nodes: Array<{ id: string; name: string; group: number }>; links: Array<{ source: string; target: string; value: number }> } {
  // Filter projects by selected quarters
  const filteredProjects = projects.filter(p => selectedQuarters.includes(p.quarter_id))
  
  // Convert project IDs to strings for comparison (handle both string and number types)
  const projectIds = new Set(filteredProjects.map(p => String(p.project_id)))
  
  // Create member name map (convert IDs to strings)
  const memberNameMap = new Map<string, string>()
  members.forEach(m => {
    const memberId = String(m.member_id)
    memberNameMap.set(memberId, m.name || `Member ${memberId}`)
  })
  
  // Get all members who worked on projects in selected quarters
  const memberProjects = new Map<string, Set<string>>() // member_id -> Set of project_ids
  
  assignments.forEach(assignment => {
    const projectId = String(assignment.project_id)
    const memberId = String(assignment.member_id)
    
    if (projectIds.has(projectId)) {
      if (!memberProjects.has(memberId)) {
        memberProjects.set(memberId, new Set())
      }
      memberProjects.get(memberId)!.add(projectId)
    }
  })
  
  // Build nodes (members)
  const nodes: Array<{ id: string; name: string; group: number }> = []
  const memberIds = Array.from(memberProjects.keys())
  
  memberIds.forEach(memberId => {
    nodes.push({
      id: memberId,
      name: memberNameMap.get(memberId) || `Member ${memberId}`,
      group: 1
    })
  })
  
  // Build links (connections between members who worked on same projects)
  const links: Array<{ source: string; target: string; value: number }> = []
  const connectionCounts = new Map<string, number>() // "member1-member2" -> count
  
  // For each project, connect all members who worked on it
  filteredProjects.forEach(project => {
    const projectId = String(project.project_id)
    const projectMembers = assignments
      .filter(a => String(a.project_id) === projectId)
      .map(a => String(a.member_id))
      .filter((id, index, arr) => arr.indexOf(id) === index) // Remove duplicates
    
    // Create connections between all pairs of members on this project
    for (let i = 0; i < projectMembers.length; i++) {
      for (let j = i + 1; j < projectMembers.length; j++) {
        const member1 = projectMembers[i]
        const member2 = projectMembers[j]
        const key = [member1, member2].sort().join('-')
        connectionCounts.set(key, (connectionCounts.get(key) || 0) + 1)
      }
    }
  })
  
  // Convert connection counts to links
  connectionCounts.forEach((value, key) => {
    const [source, target] = key.split('-')
    links.push({ source, target, value })
  })
  
  // Debug logging
  console.log('Network Data:', {
    nodes: nodes.length,
    links: links.length,
    assignments: assignments.length,
    filteredProjects: filteredProjects.length,
    selectedQuarters
  })
  
  return { nodes, links }
}
