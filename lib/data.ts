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
    
    return data || []
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
    
    return data || []
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
