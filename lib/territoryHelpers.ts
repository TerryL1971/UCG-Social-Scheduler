// lib/territoryHelpers.ts

import { createClient } from '@/lib/supabase'

/**
 * Get territories that a salesperson has been approved to access
 * @param userId - The user's ID (optional, will fetch current user if not provided)
 * @returns Array of territory IDs the user has access to
 */
export async function getApprovedTerritories(userId?: string): Promise<string[]> {
  const supabase = createClient()
  
  try {
    // Get user ID if not provided
    let targetUserId = userId
    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      targetUserId = user.id
    }

    // Fetch all territory assignments for this user
    const { data, error } = await supabase
      .from('profile_territories')
      .select('territory_id')
      .eq('profile_id', targetUserId)

    if (error) {
      console.error('Error fetching approved territories:', error)
      return []
    }

    return data?.map(pt => pt.territory_id) || []
  } catch (err) {
    console.error('Error in getApprovedTerritories:', err)
    return []
  }
}

/**
 * Get full territory details for territories a user has access to
 * @param userId - The user's ID (optional, will fetch current user if not provided)
 * @returns Array of territory objects with id and name
 */
export async function getApprovedTerritoriesWithDetails(userId?: string): Promise<Array<{id: string, name: string}>> {
  const supabase = createClient()
  
  try {
    // Get user ID if not provided
    let targetUserId = userId
    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      targetUserId = user.id
    }

    // Fetch territory assignments with territory details
    const { data, error } = await supabase
      .from('profile_territories')
      .select(`
        territory_id,
        territories (
          id,
          name
        )
      `)
      .eq('profile_id', targetUserId)

    if (error) {
      console.error('Error fetching approved territories with details:', error)
      return []
    }

    // Extract and format territory data
    return data?.map(pt => {
      const territory = Array.isArray(pt.territories) ? pt.territories[0] : pt.territories
      return {
        id: territory.id,
        name: territory.name
      }
    }) || []
  } catch (err) {
    console.error('Error in getApprovedTerritoriesWithDetails:', err)
    return []
  }
}

/**
 * Check if a user has access to a specific territory
 * @param territoryId - The territory ID to check
 * @param userId - The user's ID (optional, will fetch current user if not provided)
 * @returns Boolean indicating if user has access
 */
export async function hasAccessToTerritory(territoryId: string, userId?: string): Promise<boolean> {
  const supabase = createClient()
  
  try {
    // Get user ID if not provided
    let targetUserId = userId
    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false
      targetUserId = user.id
    }

    // Check if assignment exists
    const { data, error } = await supabase
      .from('profile_territories')
      .select('id')
      .eq('profile_id', targetUserId)
      .eq('territory_id', territoryId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" which is expected
      console.error('Error checking territory access:', error)
      return false
    }

    return !!data
  } catch (err) {
    console.error('Error in hasAccessToTerritory:', err)
    return false
  }
}