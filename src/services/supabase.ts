import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const supabaseService = {
  async getProjects() {
    const { data, error } = await supabase
      .from('projects')
      .select('*')

    if (error) throw error
    return data
  },

  async createProject(project: any) {
    const { data, error } = await supabase
      .from('projects')
      .insert([project])
      .select()

    if (error) throw error
    return data?.[0]
  },

  async updateProject(id: string, updates: any) {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()

    if (error) throw error
    return data?.[0]
  },

  async deleteProject(id: string) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async getMaterials() {
    const { data, error } = await supabase
      .from('materials')
      .select('*')

    if (error) throw error
    return data
  },

  async getCrew() {
    const { data, error } = await supabase
      .from('crew_members')
      .select('*')

    if (error) throw error
    return data
  },

  async getEquipment() {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')

    if (error) throw error
    return data
  },
}
