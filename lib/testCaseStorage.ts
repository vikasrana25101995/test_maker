export interface SavedTestCase {
  id: string
  name: string
  description: string
  steps: string[]
  expectedResult: string
  framework: string
  language: string
  statement: string
  requiresLogin: boolean
  targetPageUrl: string
  redirectPageUrl: string
  baseUrl?: string
  tags?: string[]
  type?: 'WEB' | 'API'
  createdAt: string
  updatedAt: string
}

// Use database API instead of localStorage
const API_BASE = '/api/test-cases'

export const testCaseStorage = {
  getAll: async (): Promise<SavedTestCase[]> => {
    if (typeof window === 'undefined') return []
    try {
      const response = await fetch(API_BASE)
      if (!response.ok) {
        throw new Error(`Failed to fetch test cases: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching test cases:', error)
      return []
    }
  },

  getById: async (id: string): Promise<SavedTestCase | null> => {
    if (typeof window === 'undefined') return null
    try {
      const response = await fetch(`${API_BASE}/${id}`)
      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error(`Failed to fetch test case: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching test case:', error)
      return null
    }
  },

  save: async (testCase: Omit<SavedTestCase, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedTestCase> => {
    if (typeof window === 'undefined') {
      throw new Error('Cannot save test case on server side')
    }
    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Failed to save test case: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Error saving test case:', error)
      throw error
    }
  },

  update: async (id: string, updates: Partial<SavedTestCase>): Promise<SavedTestCase | null> => {
    if (typeof window === 'undefined') {
      throw new Error('Cannot update test case on server side')
    }
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })
      if (!response.ok) {
        if (response.status === 404) return null
        const error = await response.json()
        throw new Error(error.error || `Failed to update test case: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Error updating test case:', error)
      throw error
    }
  },

  delete: async (id: string): Promise<boolean> => {
    if (typeof window === 'undefined') {
      throw new Error('Cannot delete test case on server side')
    }
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        if (response.status === 404) return false
        throw new Error(`Failed to delete test case: ${response.statusText}`)
      }
      return true
    } catch (error) {
      console.error('Error deleting test case:', error)
      return false
    }
  },

  saveMultiple: async (testCases: Omit<SavedTestCase, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<SavedTestCase[]> => {
    const saved: SavedTestCase[] = []
    for (const testCase of testCases) {
      try {
        const result = await testCaseStorage.save(testCase)
        saved.push(result)
      } catch (error) {
        console.error('Error saving test case in batch:', error)
        // Continue with other test cases even if one fails
      }
    }
    return saved
  },
}

