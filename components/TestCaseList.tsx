'use client'

import { useState, useMemo } from 'react'
import { SavedTestCase } from '@/lib/testCaseStorage'
import { generateTestCode } from '@/lib/testCodeGenerator'
import BrowserTestRunner from './BrowserTestRunner'

interface TestCaseListProps {
  testCases: SavedTestCase[]
  onEdit: (testCase: SavedTestCase) => void
  onDelete: (id: string) => void
  onView: (testCase: SavedTestCase) => void
}

export default function TestCaseList({ testCases, onEdit, onDelete, onView }: TestCaseListProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [runningTestCase, setRunningTestCase] = useState<SavedTestCase | null>(null)

  // Get all unique tags from all test cases
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    testCases.forEach(tc => {
      if (tc.tags && tc.tags.length > 0) {
        tc.tags.forEach(tag => tagSet.add(tag))
      }
    })
    return Array.from(tagSet).sort()
  }, [testCases])

  // Filter test cases based on selected tags
  const filteredTestCases = useMemo(() => {
    if (selectedTags.length === 0) {
      return testCases
    }
    return testCases.filter(tc => {
      if (!tc.tags || tc.tags.length === 0) return false
      return selectedTags.every(tag => tc.tags!.includes(tag))
    })
  }, [testCases, selectedTags])

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }
  const getFileExtension = (language: string): string => {
    const extensions: Record<string, string> = {
      typescript: 'ts',
      javascript: 'js',
      python: 'py',
      java: 'java',
    }
    return extensions[language] || 'js'
  }

  const handleDownload = async (testCase: SavedTestCase) => {
    try {
      const response = await fetch('/api/download-test-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testCases: [{
            name: testCase.name,
            description: testCase.description,
            steps: testCase.steps,
            expectedResult: testCase.expectedResult,
            framework: testCase.framework,
            language: testCase.language,
          }],
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        alert(`❌ Error: ${data.error || 'Failed to download test file'}`)
        return
      }

      // Get filename from Content-Disposition header or generate it
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `${testCase.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.test.${getFileExtension(testCase.language)}`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Failed to download test file'}`)
    }
  }

  const handleDownloadAll = async () => {
    if (testCases.length === 0) return

    try {
      const response = await fetch('/api/download-test-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testCases: testCases.map(tc => ({
            name: tc.name,
            description: tc.description,
            steps: tc.steps,
            expectedResult: tc.expectedResult,
            framework: tc.framework,
            language: tc.language,
          })),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        alert(`❌ Error: ${data.error || 'Failed to download test files'}`)
        return
      }

      const data = await response.json()

      if (data.files && data.files.length > 0) {
        // Download each file
        for (const file of data.files) {
          const blob = new Blob([file.content], { type: 'text/plain' })
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = file.filename
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
          // Small delay between downloads to avoid browser blocking
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
    } catch (error) {
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Failed to download test files'}`)
    }
  }

  const getImports = (framework: string, language: string): string => {
    if (framework === 'playwright') {
      if (language === 'python') {
        return `import pytest\nfrom playwright.sync_api import Page, expect`
      } else {
        return `import { test, expect } from '@playwright/test'`
      }
    } else if (framework === 'selenium') {
      if (language === 'python') {
        return `from selenium import webdriver\nfrom selenium.webdriver.common.by import By\nfrom selenium.webdriver.support.ui import WebDriverWait\nfrom selenium.webdriver.support import expected_conditions as EC`
      } else if (language === 'java') {
        return `import org.openqa.selenium.WebDriver;\nimport org.openqa.selenium.chrome.ChromeDriver;\nimport org.junit.Test;\nimport static org.junit.Assert.assertTrue;`
      } else {
        return `const { Builder, By, until } = require('selenium-webdriver');\nconst { expect } = require('chai');`
      }
    } else if (framework === 'cypress') {
      return `// Cypress commands are available globally`
    } else if (framework === 'jest') {
      return `// Jest globals are available`
    } else if (framework === 'mocha') {
      return `const { expect } = require('chai')`
    } else if (framework === 'vitest') {
      return `import { describe, it, expect } from 'vitest'`
    }
    return ''
  }
  if (testCases.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
        <svg
          className="mx-auto h-16 w-16 text-gray-400 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
          No test cases yet
        </h3>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          Get started by adding a test case. You can:
        </p>
        <div className="mt-6 space-y-3 text-left max-w-md mx-auto">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 flex items-center justify-center text-sm font-medium">1</span>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Click <strong className="text-gray-900 dark:text-white">"+ Add Example"</strong> button above to add a sample test case
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center text-sm font-medium">2</span>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Click <strong className="text-gray-900 dark:text-white">"+ Create Test Case"</strong> to create a new test case manually
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 flex items-center justify-center text-sm font-medium">3</span>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Go to the <strong className="text-gray-900 dark:text-white">Generator</strong> page to generate test cases from natural language, then click <strong className="text-gray-900 dark:text-white">"Save to Dashboard"</strong> to save them here
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {testCases.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-4">
            <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Download Test Files
            </h3>
            <button
              onClick={handleDownloadAll}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium text-sm"
            >
              Download All Test Files
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Download all test cases as test files. Save them to your <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">tests/</code> directory and run with <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">npm run test:selenium</code> or the appropriate command for your framework.
          </p>
        </div>
      )}

      {allTags.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Filter by Tags:
            </h3>
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {tag}
                {selectedTags.includes(tag) && (
                  <span className="ml-1">✓</span>
                )}
              </button>
            ))}
          </div>
          {selectedTags.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Showing {filteredTestCases.length} of {testCases.length} test case(s) matching selected tags
            </p>
          )}
        </div>
      )}

      {filteredTestCases.length === 0 && testCases.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No test cases match the selected tags. Try selecting different tags or clear the filter.
          </p>
        </div>
      ) : (
        filteredTestCases.map((testCase) => (
          <div
            key={testCase.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {testCase.name}
                  </h3>
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                    {testCase.framework}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded">
                    {testCase.language}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-2">{testCase.description}</p>
                {testCase.tags && testCase.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {testCase.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Created: {new Date(testCase.createdAt).toLocaleDateString()}
                  {testCase.updatedAt !== testCase.createdAt && (
                    <span className="ml-2">
                      • Updated: {new Date(testCase.updatedAt).toLocaleDateString()}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => onView(testCase)}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm font-medium"
                >
                  View
                </button>
                <button
                  onClick={() => setRunningTestCase(testCase)}
                  className="px-3 py-1.5 bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 text-green-700 dark:text-green-300 rounded-lg transition-colors text-sm font-medium"
                  title="Run test case in browser"
                >
                  Run
                </button>
                <button
                  onClick={() => handleDownload(testCase)}
                  className="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900 hover:bg-indigo-200 dark:hover:bg-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-lg transition-colors text-sm font-medium"
                  title="Download test file"
                >
                  Download
                </button>
                <button
                  onClick={() => onEdit(testCase)}
                  className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-lg transition-colors text-sm font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(testCase.id)}
                  className="px-3 py-1.5 bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 text-red-700 dark:text-red-300 rounded-lg transition-colors text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      {runningTestCase && (
        <BrowserTestRunner
          testCase={runningTestCase}
          onClose={() => setRunningTestCase(null)}
        />
      )}
    </div>
  )
}

