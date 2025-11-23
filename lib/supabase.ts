import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return process.env.NEXT_PUBLIC_SUPABASE_URL && 
         process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co' &&
         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && 
         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'placeholder-key'
}

// Database types based on your schema
export interface Project {
  project_id: string
  quarter_id: string
  project_manager?: string
  donated?: boolean
  company_id?: string
  name?: string
  description?: string
  dnf?: boolean
  nda?: boolean
  status?: string
}

export interface Member {
  member_id: string
  role?: string
  status?: boolean
  year?: string
  name?: string
  email?: string
}

export interface Company {
  company_id: string
  name?: string
}

export interface GBM {
  gbm_id: string
  quarter_id: string
  date?: string
}

export interface Attendance {
  attendance_id: string
  gbm_id: string
  member_id: string
  status: boolean
}

export interface Assignment {
  assignment_id?: string
  project_id: string
  member_id: string
  project_manager?: boolean
}
