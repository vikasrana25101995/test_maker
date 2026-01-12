'use client'

import { useState, useEffect } from 'react'
import { SavedTestCase } from '@/lib/testCaseStorage'
import { generateTestCode } from '@/lib/testCodeGenerator'
import { TestStep, stepTemplates, generateStepCode } from '@/lib/testStepTypes'

interface TestCaseModalProps {
  testCase: SavedTestCase | null
  isEditing: boolean
  onClose: () => void
  onSave: (testCaseData: Partial<SavedTestCase>) => void
}

export default function TestCaseModal({ testCase, isEditing, onClose, onSave }: TestCaseModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    steps: [''] as string[],
    structuredSteps: [] as TestStep[],
    expectedResult: '',
    framework: 'playwright',
    language: 'typescript',
    statement: '',
    requiresLogin: false,
    targetPageUrl: '',
    redirectPageUrl: '/login',
    baseUrl: '',
    tags: [] as string[],
  })
  const [newTag, setNewTag] = useState('')
  
  const [useStructuredSteps, setUseStructuredSteps] = useState(true)

  useEffect(() => {
    if (testCase) {
      // Try to parse structured steps
      let parsedSteps: TestStep[] = []
      let useStructured = false
      let regularSteps: string[] = []
      
      if (testCase.steps.length > 0) {
        // Check if first step is JSON (structured steps)
        const firstStep = testCase.steps[0].trim()
        if (firstStep.startsWith('[') || firstStep.startsWith('{"')) {
          try {
            const parsed = JSON.parse(testCase.steps[0])
            if (Array.isArray(parsed)) {
              if (parsed.length > 0 && parsed[0].type) {
                // It's structured steps with data
                parsedSteps = parsed
                useStructured = true
                // Regular steps are the rest (code steps after JSON)
                regularSteps = testCase.steps.slice(1).filter(s => s.trim())
              } else {
                // Empty structured steps array - structured mode but no steps yet
                parsedSteps = []
                useStructured = true
                regularSteps = testCase.steps.slice(1).filter(s => s.trim())
              }
            } else {
              // Not an array, use all as regular steps
              regularSteps = testCase.steps.filter(s => s.trim())
            }
          } catch {
            // Not JSON, use all as regular steps
            regularSteps = testCase.steps.filter(s => s.trim())
          }
        } else {
          // No JSON, use all as regular steps
          regularSteps = testCase.steps.filter(s => s.trim())
        }
      }
      
      // If no steps at all, provide empty array/string
      if (regularSteps.length === 0 && parsedSteps.length === 0) {
        regularSteps = ['']
      }
      
      setFormData({
        name: testCase.name,
        description: testCase.description,
        steps: regularSteps,
        structuredSteps: parsedSteps,
        expectedResult: testCase.expectedResult,
        framework: testCase.framework,
        language: testCase.language,
        statement: testCase.statement,
        requiresLogin: testCase.requiresLogin,
        targetPageUrl: testCase.targetPageUrl,
        redirectPageUrl: testCase.redirectPageUrl,
        baseUrl: testCase.baseUrl || '',
        tags: testCase.tags || [],
      })
      setUseStructuredSteps(useStructured)
    } else {
      // Reset form when no test case
      setFormData({
        name: '',
        description: '',
        steps: [''],
        structuredSteps: [],
        expectedResult: '',
        framework: 'playwright',
        language: 'typescript',
        statement: '',
        requiresLogin: false,
        targetPageUrl: '',
        redirectPageUrl: '/login',
        baseUrl: '',
        tags: [],
      })
      setUseStructuredSteps(true)
    }
  }, [testCase])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    let steps: string[] = []
    
    if (useStructuredSteps) {
      if (formData.structuredSteps.length > 0) {
        // Convert structured steps to code
        const stepCodes = formData.structuredSteps.map((step, index) => {
          return generateStepCode(step, formData.framework, formData.language, index, formData.baseUrl)
        })
        // Save structured data as JSON first, then code
        steps = [JSON.stringify(formData.structuredSteps), ...stepCodes]
      } else {
        // Structured steps mode but no steps - save empty JSON array to indicate mode
        steps = ['[]']
      }
    } else {
      // Regular steps mode
      steps = formData.steps.filter(step => step.trim() !== '')
      if (steps.length === 0) {
        steps = ['']
      }
    }
    
    onSave({
      ...formData,
      steps,
    })
  }

  const handleStepChange = (index: number, value: string) => {
    const newSteps = [...formData.steps]
    newSteps[index] = value
    setFormData({ ...formData, steps: newSteps })
  }

  const handleStructuredStepChange = (index: number, field: keyof TestStep, value: string) => {
    const newSteps = [...formData.structuredSteps]
    newSteps[index] = { ...newSteps[index], [field]: value }
    setFormData({ ...formData, structuredSteps: newSteps })
  }

  const addStep = () => {
    if (useStructuredSteps) {
      const newStep: TestStep = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type: 'navigate',
        description: '',
      }
      setFormData({ ...formData, structuredSteps: [...formData.structuredSteps, newStep] })
    } else {
      // Ensure steps array exists and add new step
      const currentSteps = formData.steps.length > 0 ? formData.steps : ['']
      setFormData({ ...formData, steps: [...currentSteps, ''] })
    }
  }

  const removeStep = (index: number) => {
    if (useStructuredSteps) {
      const newSteps = formData.structuredSteps.filter((_, i) => i !== index)
      setFormData({ ...formData, structuredSteps: newSteps })
    } else {
      const newSteps = formData.steps.filter((_, i) => i !== index)
      setFormData({ ...formData, steps: newSteps.length > 0 ? newSteps : [''] })
    }
  }

  const getGeneratedCode = () => {
    if (useStructuredSteps && formData.structuredSteps.length > 0) {
      const stepCodes = formData.structuredSteps.map((step, index) => {
        return generateStepCode(step, formData.framework, formData.language, index, formData.baseUrl)
      })
      return generateTestCode({
        name: formData.name,
        description: formData.description,
        steps: stepCodes,
        expectedResult: formData.expectedResult,
      }, formData.framework, formData.language)
    } else if (formData.steps.some(s => s.trim())) {
      return generateTestCode({
        name: formData.name,
        description: formData.description,
        steps: formData.steps.filter(s => s.trim()),
        expectedResult: formData.expectedResult,
      }, formData.framework, formData.language)
    }
    return ''
  }

  const generatedCode = getGeneratedCode()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Test Case' : testCase ? 'View Test Case' : 'Create Test Case'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Framework
              </label>
              <select
                value={formData.framework}
                onChange={(e) => setFormData({ ...formData, framework: e.target.value })}
                disabled={!isEditing && !!testCase}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="playwright">Playwright</option>
                <option value="selenium">Selenium</option>
                <option value="cypress">Cypress</option>
                <option value="jest">Jest</option>
                <option value="mocha">Mocha</option>
                <option value="vitest">Vitest</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Language
              </label>
              <select
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                disabled={!isEditing && !!testCase}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="typescript">TypeScript</option>
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Test Case Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={!isEditing && !!testCase}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={!isEditing && !!testCase}
              required
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Test Steps
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useStructuredSteps}
                    onChange={(e) => setUseStructuredSteps(e.target.checked)}
                    disabled={!isEditing && !!testCase}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Use structured steps (with URLs & selectors)</span>
                </label>
              </div>
            </div>

            {useStructuredSteps ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Base URL (optional - will be prepended to navigate URLs)
                  </label>
                  <input
                    type="text"
                    value={formData.baseUrl}
                    onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                    disabled={!isEditing && !!testCase}
                    placeholder="https://staging.joinsucceed.ai"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {formData.structuredSteps.length > 0 ? (
                  <div className="space-y-3">
                    {formData.structuredSteps.map((step, index) => (
                    <div key={step.id || index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                      <div className="grid grid-cols-12 gap-2 mb-2">
                        <div className="col-span-3">
                          <select
                            value={step.type}
                            onChange={(e) => handleStructuredStepChange(index, 'type', e.target.value)}
                            disabled={!isEditing && !!testCase}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          >
                            <option value="navigate">Navigate</option>
                            <option value="waitForPageLoad">Wait for Page Load</option>
                            <option value="verifyElement">Verify Element</option>
                            <option value="fill">Fill</option>
                            <option value="click">Click</option>
                            <option value="wait">Wait for Element</option>
                            <option value="assert">Assert</option>
                            <option value="custom">Custom</option>
                          </select>
                        </div>
                        {step.type === 'navigate' && (
                          <div className="col-span-9">
                            <input
                              type="text"
                              value={step.url || ''}
                              onChange={(e) => handleStructuredStepChange(index, 'url', e.target.value)}
                              disabled={!isEditing && !!testCase}
                              placeholder="/auth/login or https://example.com"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            />
                          </div>
                        )}
                        {step.type === 'waitForPageLoad' && (
                          <div className="col-span-9">
                            <select
                              value={step.action || step.description || 'networkidle'}
                              onChange={(e) => handleStructuredStepChange(index, 'action', e.target.value)}
                              disabled={!isEditing && !!testCase}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            >
                              <option value="networkidle">Network Idle (recommended)</option>
                              <option value="load">Load</option>
                              <option value="domcontentloaded">DOM Content Loaded</option>
                            </select>
                          </div>
                        )}
                        {step.type === 'verifyElement' && (
                          <div className="col-span-9">
                            <input
                              type="text"
                              value={step.selector || ''}
                              onChange={(e) => handleStructuredStepChange(index, 'selector', e.target.value)}
                              disabled={!isEditing && !!testCase}
                              placeholder="Selector: [data-testid='login-email'], input[name='email'], button[type='submit']"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            />
                          </div>
                        )}
                        {(step.type === 'click' || step.type === 'fill' || step.type === 'wait') && (
                          <>
                            <div className="col-span-5">
                              <input
                                type="text"
                                value={step.selector || ''}
                                onChange={(e) => handleStructuredStepChange(index, 'selector', e.target.value)}
                                disabled={!isEditing && !!testCase}
                                placeholder="Selector: [data-testid='login-submit'], button[type='submit'], #id, .class"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                              />
                            </div>
                            {step.type === 'fill' && (
                              <div className="col-span-4">
                                <input
                                  type="text"
                                  value={step.value || ''}
                                  onChange={(e) => handleStructuredStepChange(index, 'value', e.target.value)}
                                  disabled={!isEditing && !!testCase}
                                  placeholder="Value to fill"
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                />
                              </div>
                            )}
                          </>
                        )}
                        {(step.type === 'assert' || step.type === 'custom') && (
                          <div className="col-span-9">
                            <input
                              type="text"
                              value={step.action || step.description || ''}
                              onChange={(e) => handleStructuredStepChange(index, 'action', e.target.value)}
                              disabled={!isEditing && !!testCase}
                              placeholder={step.type === 'assert' ? 'Condition: page.url().includes("dashboard")' : 'Custom code: await page.waitForLoadState("networkidle")'}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            />
                          </div>
                        )}
                      </div>
                      {/* Description field for all step types */}
                      <div className="mt-2">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Step Description (optional)
                        </label>
                        <input
                          type="text"
                          value={step.description || ''}
                          onChange={(e) => handleStructuredStepChange(index, 'description', e.target.value)}
                          disabled={!isEditing && !!testCase}
                          placeholder={
                            step.type === 'waitForPageLoad' 
                              ? 'e.g., Wait for dashboard to fully load'
                              : step.type === 'assert'
                              ? 'e.g., Verify user is redirected to dashboard'
                              : step.type === 'custom'
                              ? 'e.g., Custom wait for API response'
                              : 'e.g., Navigate to login page, Click submit button, etc.'
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        />
                      </div>
                      {(isEditing || !testCase) && (
                        <button
                          type="button"
                          onClick={() => removeStep(index)}
                          className="mt-2 px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded text-sm hover:bg-red-200 dark:hover:bg-red-800"
                        >
                          Remove Step
                        </button>
                      )}
                    </div>
                  ))}
                  {(isEditing || !testCase) && (
                    <button
                      type="button"
                      onClick={addStep}
                      className="w-full px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 font-medium"
                    >
                      + Add Step
                    </button>
                  )}
                  </div>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">No structured steps found.</p>
                    {(isEditing || !testCase) && (
                      <button
                        type="button"
                        onClick={addStep}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                      >
                        Add First Step
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {formData.steps.map((step, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={step}
                      onChange={(e) => handleStepChange(index, e.target.value)}
                      disabled={!isEditing && !!testCase}
                      placeholder={`Step ${index + 1} - Enter code manually`}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    {(isEditing || !testCase) && (
                      <button
                        type="button"
                        onClick={() => removeStep(index)}
                        className="px-3 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                {(isEditing || !testCase) && (
                  <button
                    type="button"
                    onClick={addStep}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    + Add Step
                  </button>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Expected Result
            </label>
            <textarea
              value={formData.expectedResult}
              onChange={(e) => setFormData({ ...formData, expectedResult: e.target.value })}
              disabled={!isEditing && !!testCase}
              required
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags (for categorization)
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium"
                >
                  {tag}
                  {(isEditing || !testCase) && (
                    <button
                      type="button"
                      onClick={() => {
                        const newTags = formData.tags.filter((_, i) => i !== index)
                        setFormData({ ...formData, tags: newTags })
                      }}
                      className="ml-1 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </span>
              ))}
            </div>
            {(isEditing || !testCase) && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const trimmedTag = newTag.trim()
                      if (trimmedTag && !formData.tags.includes(trimmedTag)) {
                        setFormData({ ...formData, tags: [...formData.tags, trimmedTag] })
                        setNewTag('')
                      }
                    }
                  }}
                  placeholder="Add a tag and press Enter"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    const trimmedTag = newTag.trim()
                    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
                      setFormData({ ...formData, tags: [...formData.tags, trimmedTag] })
                      setNewTag('')
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Add Tag
                </button>
              </div>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Add tags to categorize your test cases (e.g., "login", "api", "ui", "smoke")
            </p>
          </div>

          {generatedCode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Generated Test Code
              </label>
              <pre className="bg-gray-900 dark:bg-black text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{generatedCode}</code>
              </pre>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(generatedCode)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                >
                  Copy Code
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      // Use the same logic as handleSubmit to convert structured steps
                      let steps: string[] = []
                      
    if (useStructuredSteps && formData.structuredSteps.length > 0) {
      // Convert structured steps to code
      const stepCodes = formData.structuredSteps.map((step, index) => {
        return generateStepCode(step, formData.framework, formData.language, index, formData.baseUrl)
      })
                        // Save structured data as JSON first, then code
                        steps = [JSON.stringify(formData.structuredSteps), ...stepCodes]
                      } else {
                        steps = formData.steps.filter(step => step.trim() !== '')
                      }

                      const response = await fetch('/api/download-test-file', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          testCases: [{
                            name: formData.name,
                            description: formData.description,
                            steps: steps,
                            expectedResult: formData.expectedResult,
                            framework: formData.framework,
                            language: formData.language,
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
                      const getFileExtension = (lang: string): string => {
                        const extensions: Record<string, string> = {
                          typescript: 'ts',
                          javascript: 'js',
                          python: 'py',
                          java: 'java',
                        }
                        return extensions[lang] || 'js'
                      }
                      
                      let filename = `${formData.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.test.${getFileExtension(formData.language)}`
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
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm"
                >
                  Download Test File
                </button>
              </div>
            </div>
          )}

          {(isEditing || !testCase) && (
            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                {testCase ? 'Update' : 'Create'}
              </button>
            </div>
          )}
        </form>

      </div>
    </div>
  )
}

