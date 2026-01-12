'use client'

import { useState } from 'react'
import Link from 'next/link'
import { testCaseStorage } from '@/lib/testCaseStorage'
import { generateTestCode as generateCode } from '@/lib/testCodeGenerator'
import TestRunner from './TestRunner'
import { TestStep, generateStepCode } from '@/lib/testStepTypes'

interface TestCase {
  name: string
  description: string
  steps: string[]
  expectedResult: string
}

export default function TestCaseGenerator() {
  const [statement, setStatement] = useState('')
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testFramework, setTestFramework] = useState('playwright')
  const [programmingLanguage, setProgrammingLanguage] = useState('typescript')
  const [requiresLogin, setRequiresLogin] = useState(false)
  const [targetPageUrl, setTargetPageUrl] = useState('')
  const [redirectPageUrl, setRedirectPageUrl] = useState('/login')
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!statement.trim()) {
      setError('Please enter a statement to generate test cases')
      return
    }

    setLoading(true)
    setError(null)
    setTestCases([])

    try {
      const response = await fetch('/api/generate-tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          statement,
          framework: testFramework,
          language: programmingLanguage,
          requiresLogin,
          targetPageUrl,
          redirectPageUrl,
        }),
      })

      if (!response.ok) {
        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to generate test cases')
        } else {
          // Handle HTML error responses
          const text = await response.text()
          throw new Error(`Server error (${response.status}): ${response.statusText}. Please check your API configuration.`)
        }
      }

      const data = await response.json()
      setTestCases(data.testCases || [])
      
      // Show warning if API key is not configured
      if (data.warning) {
        setError(data.warning)
        setTimeout(() => setError(null), 5000)
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else if (typeof err === 'string') {
        setError(err)
      } else {
        setError('An error occurred while generating test cases. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAll = async () => {
    if (testCases.length === 0) {
      setError('No test cases to save')
      return
    }

    try {
      const saved = await testCaseStorage.saveMultiple(
        testCases.map(tc => ({
          name: tc.name,
          description: tc.description,
          steps: tc.steps,
          expectedResult: tc.expectedResult,
          framework: testFramework,
          language: programmingLanguage,
          statement,
          requiresLogin,
          targetPageUrl,
          redirectPageUrl,
          tags: [],
        }))
      )
      setSavedMessage(`Successfully saved ${saved.length} test case(s)!`)
      setTimeout(() => setSavedMessage(null), 3000)
      
      // Dispatch custom event to notify dashboard to refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('testCasesSaved'))
      }
    } catch (err) {
      console.error('Error saving test cases:', err)
      setError('Failed to save test cases')
    }
  }

  const handleCopy = (testCase: TestCase) => {
    const testCode = generateTestCode(testCase)
    navigator.clipboard.writeText(testCode)
  }

  const generateTestCode = (testCase: TestCase): string => {
    return generateCode(testCase, testFramework, programmingLanguage)
  }

  const getFileExtension = (): string => {
    const extensions: Record<string, string> = {
      typescript: 'ts',
      javascript: 'js',
      python: 'py',
      java: 'java',
    }
    return extensions[programmingLanguage] || 'txt'
  }

  const handleDownloadAll = () => {
    if (testCases.length === 0) {
      setError('No test cases to download')
      return
    }

    // Generate all test code
    const allTestCode = testCases
      .map((tc, index) => {
        const code = generateTestCode(tc)
        return `// Test Case ${index + 1}: ${tc.name}\n// ${tc.description}\n\n${code}\n\n`
      })
      .join('\n')

    // Create file content
    const fileContent = `// Generated Test Cases\n// Framework: ${testFramework}\n// Language: ${programmingLanguage}\n// Generated: ${new Date().toISOString()}\n\n${allTestCode}`

    // Download as file
    const blob = new Blob([fileContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `test-cases-${Date.now()}.${getFileExtension()}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadJSON = () => {
    if (testCases.length === 0) {
      setError('No test cases to download')
      return
    }

    const jsonData = {
      metadata: {
        framework: testFramework,
        language: programmingLanguage,
        statement,
        requiresLogin,
        targetPageUrl,
        redirectPageUrl,
        generatedAt: new Date().toISOString(),
      },
      testCases: testCases.map((tc, index) => ({
        id: `TC_${index + 1}`,
        name: tc.name,
        description: tc.description,
        steps: tc.steps,
        expectedResult: tc.expectedResult,
        generatedCode: generateTestCode(tc),
      })),
    }

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `test-cases-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadSingle = (testCase: TestCase, index: number) => {
    const testCode = generateTestCode(testCase)
    const fileContent = `// ${testCase.name}\n// ${testCase.description}\n\n${testCode}`

    const blob = new Blob([fileContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${testCase.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.${getFileExtension()}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-end mb-4">
        <Link
          href="/dashboard"
          className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors font-medium"
        >
          View Dashboard
        </Link>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 mb-8">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Test Framework
          </label>
          <select
            value={testFramework}
            onChange={(e) => setTestFramework(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="playwright">Playwright</option>
            <option value="selenium">Selenium</option>
            <option value="cypress">Cypress</option>
            <option value="jest">Jest</option>
            <option value="mocha">Mocha</option>
            <option value="vitest">Vitest</option>
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Programming Language
          </label>
          <select
            value={programmingLanguage}
            onChange={(e) => setProgrammingLanguage(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="typescript">TypeScript</option>
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Enter Statement or Description
          </label>
          <textarea
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            placeholder="e.g., User should be able to view dashboard after login"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={6}
          />
        </div>

        <div className="mb-6">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={requiresLogin}
              onChange={(e) => setRequiresLogin(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Page requires login/authentication
            </span>
          </label>
        </div>

        {requiresLogin && (
          <>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Page URL (to test)
              </label>
              <input
                type="text"
                value={targetPageUrl}
                onChange={(e) => setTargetPageUrl(e.target.value)}
                placeholder="e.g., /dashboard, /profile, /settings"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Redirect Page URL (if not authenticated)
              </label>
              <input
                type="text"
                value={redirectPageUrl}
                onChange={(e) => setRedirectPageUrl(e.target.value)}
                placeholder="e.g., /login, /auth/login"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                This is where unauthenticated users should be redirected
              </p>
            </div>
          </>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </>
          ) : (
            'Generate Test Cases'
          )}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {savedMessage && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-800 dark:text-green-200">{savedMessage}</p>
          </div>
        )}
      </div>

      {testCases.length > 0 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Generated Test Cases ({testCases.length})
            </h2>
            <div className="flex gap-2">
              <TestRunner 
                testCases={testCases} 
                framework={testFramework} 
                language={programmingLanguage} 
              />
              <button
                onClick={handleDownloadAll}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm"
                title="Download all test cases as code file"
              >
                Download All (.{getFileExtension()})
              </button>
              <button
                onClick={handleDownloadJSON}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium text-sm"
                title="Download all test cases as JSON"
              >
                Download JSON
              </button>
              <button
                onClick={handleSaveAll}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium text-sm"
              >
                Save to Dashboard
              </button>
            </div>
          </div>
          {testCases.map((testCase, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {testCase.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {testCase.description}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(testCase)}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm font-medium"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => handleDownloadSingle(testCase, index)}
                    className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-lg transition-colors text-sm font-medium"
                  >
                    Download
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-400 mb-2">
                  Test Steps:
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-gray-600 dark:text-gray-300">
                  {testCase.steps.map((step, stepIndex) => (
                    <li key={stepIndex}>{step}</li>
                  ))}
                </ol>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-400 mb-2">
                  Expected Result:
                </h4>
                <p className="text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-3 rounded">
                  {testCase.expectedResult}
                </p>
              </div>

              <div className="mt-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-400 mb-2">
                  Generated Code:
                </h4>
                <pre className="bg-gray-900 dark:bg-black text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{generateTestCode(testCase)}</code>
                </pre>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

