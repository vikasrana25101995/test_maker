'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { testCaseStorage, SavedTestCase } from '@/lib/testCaseStorage'
import TestCaseList from '@/components/TestCaseList'
import TestCaseModal from '@/components/TestCaseModal'
import { ApiTestModal } from '@/components/ApiTestModal'
import { generateStepCode, TestStep } from '@/lib/testStepTypes'

export default function Dashboard() {
  const [testCases, setTestCases] = useState<SavedTestCase[]>([])
  const [selectedTestCase, setSelectedTestCase] = useState<SavedTestCase | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isApiModalOpen, setIsApiModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setMounted(true)
    loadTestCases()

    // Listen for window focus (when user switches back to this tab)
    const handleFocus = () => {
      loadTestCases()
    }

    // Listen for page visibility (when user navigates to this page)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadTestCases()
      }
    }

    // Listen for custom event when test cases are saved in the same tab
    const handleTestCasesSaved = () => {
      loadTestCases()
    }

    // Listen for pageshow event (handles back/forward navigation)
    const handlePageShow = () => {
      loadTestCases()
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('pageshow', handlePageShow)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('testCasesSaved', handleTestCasesSaved as EventListener)

    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('pageshow', handlePageShow)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('testCasesSaved', handleTestCasesSaved as EventListener)
    }
  }, [])

  const loadTestCases = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/test-cases')
      if (response.status === 401) {
        window.location.href = '/login'
        return
      }
      if (!response.ok) throw new Error('Failed to fetch')

      const loaded = await response.json()
      console.log('Loaded test cases:', loaded.length, loaded)
      setTestCases(loaded)
    } catch (error) {
      console.error('Error loading test cases:', error)
      setTestCases([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setSelectedTestCase(null)
    setIsEditing(false)
    setIsModalOpen(true)
  }

  const handleCreateApi = () => {
    setIsApiModalOpen(true)
  }

  const handleEdit = (testCase: SavedTestCase) => {
    setSelectedTestCase(testCase)
    setIsEditing(true)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this test case?')) {
      const success = await testCaseStorage.delete(id)
      if (success) {
        loadTestCases()
      } else {
        alert('Failed to delete test case')
      }
    }
  }

  const handleView = (testCase: SavedTestCase) => {
    setSelectedTestCase(testCase)
    setIsEditing(false)
    setIsModalOpen(true)
  }

  const handleSave = async (testCaseData: Partial<SavedTestCase>) => {
    try {
      if (isEditing && selectedTestCase) {
        await testCaseStorage.update(selectedTestCase.id, testCaseData)
      } else {
        await testCaseStorage.save(testCaseData as Omit<SavedTestCase, 'id' | 'createdAt' | 'updatedAt'>)
      }
      loadTestCases()
      setIsModalOpen(false)
    } catch (error) {
      console.error('Error saving test case:', error)
    }
  }

  const handleSaveApi = async (testCaseData: any) => {
    try {
      await testCaseStorage.save(testCaseData)
      loadTestCases()
      setIsApiModalOpen(false)
    } catch (error) {
      console.error('Error saving API test case:', error)
      alert('Failed to save API test case. Please try again.')
    }
  }

  const handleSignOut = async () => {
    // We need to use NextAuth signOut, but since this is a client component, 
    // we can use a server action or just redirect for now if we don't have the client lib set up fully
    // Or strictly rely on server-side signOut.
    // Ideally we should import { signOut } from 'next-auth/react' but I haven't set up SessionProvider.
    // So I will just redirect to a server action or API route that handles sign out, or use a form.
    // Let's use a simple form submit to a server action if possible, or just link to /api/auth/signout
    window.location.href = '/api/auth/signout'
  }

  if (!mounted) return null

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Test Cases Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Manage and view your test cases
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleSignOut}
              className="px-6 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors font-medium"
            >
              Sign Out
            </button>
            <button
              onClick={handleCreateApi}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
            >
              + API Test
            </button>
            <button
              onClick={handleCreate}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              + Web Test
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">Loading your test cases...</p>
          </div>
        ) : (
          <TestCaseList
            testCases={testCases}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
          />
        )}

        {isModalOpen && (
          <TestCaseModal
            testCase={selectedTestCase}
            isEditing={isEditing}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSave}
          />
        )}

        {isApiModalOpen && (
          <ApiTestModal
            isOpen={isApiModalOpen}
            onClose={() => setIsApiModalOpen(false)}
            onSave={handleSaveApi}
          />
        )}
      </div>
    </main>
  )
}

