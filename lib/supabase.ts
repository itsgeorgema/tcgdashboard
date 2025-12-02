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
  project_id: number
  quarter_id: string
  project_manager?: string
  donated?: boolean
  company_id?: number
  name?: string
  description?: string
  dnf?: boolean
  nda?: boolean
  status?: string
  track?: string
}

export interface Member {
  member_id: number
  PID: string | null
  name: string
  quarter_entered: string | null
  quarter_graduating: string | null
  role: string | null
  ucsd_email: string | null
  personal_email: string | null
  track: string | null
  status: boolean       // converting from 0/1 in DB
}


export interface Company {
  company_id: number
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
  project_id: number
  member_id: number
  project_manager: boolean
}
