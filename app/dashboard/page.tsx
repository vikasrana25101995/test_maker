'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { testCaseStorage, SavedTestCase } from '@/lib/testCaseStorage'
import TestCaseList from '@/components/TestCaseList'
import TestCaseModal from '@/components/TestCaseModal'
import { generateStepCode, TestStep } from '@/lib/testStepTypes'

export default function Dashboard() {
  const [testCases, setTestCases] = useState<SavedTestCase[]>([])
  const [selectedTestCase, setSelectedTestCase] = useState<SavedTestCase | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [mounted, setMounted] = useState(false)

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
      const loaded = await testCaseStorage.getAll()
      console.log('Loaded test cases:', loaded.length, loaded)
      setTestCases(loaded)
    } catch (error) {
      console.error('Error loading test cases:', error)
      setTestCases([])
    }
  }

  const handleCreate = () => {
    setSelectedTestCase(null)
    setIsEditing(false)
    setIsModalOpen(true)
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
      alert('Failed to save test case. Please try again.')
    }
  }

  const handleAddExample = async () => {
    try {
      // Example test case with structured steps
      const structuredSteps: TestStep[] = [
        { id: '1', type: 'navigate', url: 'https://staging.joinsucceed.ai/auth/login', description: 'Navigate to login page' },
        { id: '2', type: 'waitForPageLoad', description: 'networkidle' },
        { id: '3', type: 'verifyElement', selector: "input[name='email'], input[type='email']", description: 'Verify email field exists' },
        { id: '4', type: 'verifyElement', selector: "input[name='password'], input[type='password']", description: 'Verify password field exists' },
        { id: '5', type: 'verifyElement', selector: "button[type='submit']", description: 'Verify submit button exists' },
        { id: '6', type: 'fill', selector: "input[name='email'], input[type='email']", value: 'test@example.com', description: 'Fill email field' },
        { id: '7', type: 'fill', selector: "input[name='password'], input[type='password']", value: 'password123', description: 'Fill password field' },
        { id: '8', type: 'click', selector: "button[type='submit']", description: 'Click submit button' },
      ]
      
      // Generate code for each step
      const stepCodes = structuredSteps.map(step => generateStepCode(step, 'selenium', 'typescript'))
      
      // Store structured steps as JSON first, then the generated code
      const steps = [JSON.stringify(structuredSteps), ...stepCodes]
      
      const exampleTestCase: Omit<SavedTestCase, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'Login Page Verification',
        description: 'Verify that login page loads correctly and email, password, and submit button elements are present',
        steps: steps,
        expectedResult: 'User is successfully authenticated and redirected to the dashboard',
        framework: 'selenium',
        language: 'typescript',
        statement: 'Verify login page loads and all required elements (email, password, submit button) are present',
        requiresLogin: false,
        targetPageUrl: 'https://staging.joinsucceed.ai/auth/login',
        redirectPageUrl: 'https://staging.joinsucceed.ai/',
        tags: ['login', 'ui', 'smoke'],
      }
      
      const saved = await testCaseStorage.save(exampleTestCase)
      console.log('Saved example test case:', saved)
      await loadTestCases()
      
      // Dispatch custom event to notify other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('testCasesSaved'))
      }
    } catch (error) {
      console.error('Error adding example test case:', error)
      alert('Failed to add example test case. Please try again.')
    }
  }

  if (!mounted) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Test Cases Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Manage and view all your test cases
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Test Cases Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Manage and view all your test cases
            </p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/"
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors font-medium"
            >
              Generator
            </Link>
            <button
              onClick={() => loadTestCases()}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors font-medium"
              title="Refresh test cases"
            >
              🔄 Refresh
            </button>
            <button
              onClick={handleAddExample}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
            >
              + Add Example
            </button>
            <button
              onClick={handleCreate}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              + Create Test Case
            </button>
          </div>
        </div>

        <TestCaseList
          testCases={testCases}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={handleView}
        />

        {isModalOpen && (
          <TestCaseModal
            testCase={selectedTestCase}
            isEditing={isEditing}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSave}
          />
        )}
      </div>
    </main>
  )
}

