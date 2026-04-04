import { supabase } from './supabase'
import { toCamelCase, toSnakeCase } from './supabaseCore'
import type { CrewMember } from '@/types'

// ===== CREW =====

export async function fetchCrew(orgId: string): Promise<CrewMember[]> {
  try {
    const { data, error } = await supabase
      .from('crew_members')
      .select(`
        *,
        crew_certifications (
          id,
          label,
          expiry_date
        )
      `)
      .eq('org_id', orgId)

    if (error) throw error

    return (data || []).map(member => {
      const camelMember = toCamelCase(member) as Record<string, unknown>

      // Map crew_certifications to certs
      const crewCerts = camelMember.crewCertifications as Array<Record<string, unknown>> | undefined;
      camelMember.certs = (crewCerts || []).map((cert) => ({
        certId: cert.id,
        label: cert.label,
        expiry: cert.expiryDate
      }))
      delete camelMember.crewCertifications

      // Parse JSONB fields
      if (typeof camelMember.skills === 'string') {
        camelMember.skills = JSON.parse(camelMember.skills as string)
      }
      if (typeof camelMember.availability === 'string') {
        camelMember.availability = JSON.parse(camelMember.availability as string)
      }
      if (typeof camelMember.bookedDates === 'string') {
        camelMember.bookedDates = JSON.parse(camelMember.bookedDates as string)
      }

      return camelMember as unknown as CrewMember
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('fetchCrew error:', message)
    return []
  }
}

export async function createCrewMember(member: Omit<CrewMember, 'id'>, id: string, orgId: string): Promise<CrewMember | null> {
  try {
    const { certs, ...memberData } = member
    const snakeData = toSnakeCase(memberData as unknown as Record<string, unknown>) as Record<string, unknown>
    snakeData.id = id
    snakeData.org_id = orgId
    snakeData.skills = memberData.skills // Keep as array
    snakeData.availability = memberData.availability // Keep as object
    snakeData.booked_dates = memberData.bookedDates // Convert to snake_case

    const { data, error } = await supabase
      .from('crew_members')
      .insert([snakeData])
      .select()
      .single()

    if (error) throw error

    const crewMember = toCamelCase(data) as Record<string, unknown>
    crewMember.certs = []

    // Insert certifications if provided
    if (certs && certs.length > 0) {
      const certData = certs.map(cert => ({
        crew_id: crewMember.id as string,
        label: cert.label,
        expiry_date: cert.expiry
      }))

      const { data: certResults, error: certError } = await supabase
        .from('crew_certifications')
        .insert(certData)
        .select()

      if (certError) throw certError

      crewMember.certs = (certResults || []).map((cert: Record<string, unknown>) => ({
        certId: cert.id,
        label: cert.label,
        expiry: cert.expiry_date
      }))
    }

    return crewMember as unknown as CrewMember
  } catch (err: unknown) {
    console.error('createCrewMember error:', err)
    return null
  }
}

export async function updateCrewMember(id: string, updates: Partial<CrewMember>): Promise<CrewMember | null> {
  try {
    const { certs, ...updateData } = updates
    const snakeData = toSnakeCase(updateData as unknown as Record<string, unknown>) as Record<string, unknown>
    if (updateData.skills) {
      snakeData.skills = updateData.skills
    }
    if (updateData.availability) {
      snakeData.availability = updateData.availability
    }
    if (updateData.bookedDates) {
      snakeData.booked_dates = updateData.bookedDates
    }

    const { data, error } = await supabase
      .from('crew_members')
      .update(snakeData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    const crewMember = toCamelCase(data) as Record<string, unknown>
    crewMember.certs = []

    // If certs were updated, delete old ones and insert new
    if (certs !== undefined) {
      await supabase.from('crew_certifications').delete().eq('crew_id', id)

      if (certs.length > 0) {
        const certData = certs.map(cert => ({
          crew_id: id,
          label: cert.label,
          expiry_date: cert.expiry
        }))

        const { data: certResults, error: certError } = await supabase
          .from('crew_certifications')
          .insert(certData)
          .select()

        if (certError) throw certError

        crewMember.certs = (certResults || []).map((cert: Record<string, unknown>) => ({
          certId: cert.id,
          label: cert.label,
          expiry: cert.expiry_date
        }))
      }
    }

    return crewMember as unknown as CrewMember
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('updateCrewMember error:', message)
    return null
  }
}

export async function deleteCrewMember(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('crew_members')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('deleteCrewMember error:', message)
    return false
  }
}
