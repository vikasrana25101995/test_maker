'use client'

import { useState } from 'react'
import { TestStep, generateStepCode } from '@/lib/testStepTypes'

interface WizardStep {
  id: number
  title: string
  description: string
}

interface TestCaseData {
  statement: string
  framework: string
  language: string
  baseUrl: string
  requiresLogin: boolean
  targetPageUrl: string
  redirectPageUrl: string
  testEmail: string
  testPassword: string
  steps: TestStep[]
  expectedResult: string
}

interface TestCaseGeneratorWizardProps {
  onGenerate: (data: TestCaseData) => void
  onCancel: () => void
  initialData?: Partial<TestCaseData>
}

export default function TestCaseGeneratorWizard({ onGenerate, onCancel, initialData }: TestCaseGeneratorWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<TestCaseData>({
    statement: initialData?.statement || '',
    framework: initialData?.framework || 'playwright',
    language: initialData?.language || 'typescript',
    baseUrl: initialData?.baseUrl || '',
    requiresLogin: initialData?.requiresLogin || false,
    targetPageUrl: initialData?.targetPageUrl || '',
    redirectPageUrl: initialData?.redirectPageUrl || '/login',
    testEmail: initialData?.testEmail || '',
    testPassword: initialData?.testPassword || '',
    steps: initialData?.steps || [],
    expectedResult: initialData?.expectedResult || '',
  })

  const steps: WizardStep[] = [
    { id: 1, title: 'Basic Information', description: 'Framework, language, and test description' },
    { id: 2, title: 'URLs & Authentication', description: 'Base URL and login settings' },
    { id: 3, title: 'Test Steps', description: 'Add detailed test steps with actions' },
    { id: 4, title: 'Expected Result', description: 'Define what should happen' },
    { id: 5, title: 'Review & Generate', description: 'Review and generate test cases' },
  ]

  const updateFormData = (updates: Partial<TestCaseData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  const handleStepChange = (index: number, field: keyof TestStep, value: string) => {
    const newSteps = [...formData.steps]
    newSteps[index] = { ...newSteps[index], [field]: value }
    updateFormData({ steps: newSteps })
  }

  const addStep = () => {
    const newStep: TestStep = {
      id: Date.now().toString(),
      type: 'navigate',
      description: '',
    }
    updateFormData({ steps: [...formData.steps, newStep] })
  }

  const removeStep = (index: number) => {
    const newSteps = formData.steps.filter((_, i) => i !== index)
    updateFormData({ steps: newSteps })
  }

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleGenerate = () => {
    onGenerate(formData)
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Test Framework
              </label>
              <select
                value={formData.framework}
                onChange={(e) => updateFormData({ framework: e.target.value })}
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
                Programming Language
              </label>
              <select
                value={formData.language}
                onChange={(e) => updateFormData({ language: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="typescript">TypeScript</option>
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Test Statement / Description
              </label>
              <textarea
                value={formData.statement}
                onChange={(e) => updateFormData({ statement: e.target.value })}
                placeholder="Describe what you want to test, e.g., 'User should be able to login with valid credentials'"
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Provide a clear description of what the test should verify
              </p>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Base URL
              </label>
              <input
                type="text"
                value={formData.baseUrl}
                onChange={(e) => updateFormData({ baseUrl: e.target.value })}
                placeholder="https://staging.joinsucceed.ai"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Base URL will be prepended to relative URLs in navigate steps
              </p>
            </div>

            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requiresLogin}
                  onChange={(e) => updateFormData({ requiresLogin: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Page requires login/authentication
                </span>
              </label>
            </div>

            {formData.requiresLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Target Page URL (to test)
                  </label>
                  <input
                    type="text"
                    value={formData.targetPageUrl}
                    onChange={(e) => updateFormData({ targetPageUrl: e.target.value })}
                    placeholder="/dashboard or /profile"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Login Page URL
                  </label>
                  <input
                    type="text"
                    value={formData.redirectPageUrl}
                    onChange={(e) => updateFormData({ redirectPageUrl: e.target.value })}
                    placeholder="/login or /auth/login"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Test Email
                    </label>
                    <input
                      type="email"
                      value={formData.testEmail}
                      onChange={(e) => updateFormData({ testEmail: e.target.value })}
                      placeholder="test@example.com"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Test Password
                    </label>
                    <input
                      type="password"
                      value={formData.testPassword}
                      onChange={(e) => updateFormData({ testPassword: e.target.value })}
                      placeholder="password123"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Add test steps with specific actions, URLs, and selectors
              </p>
              <button
                type="button"
                onClick={addStep}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
              >
                + Add Step
              </button>
            </div>

            {formData.steps.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                <p className="text-gray-500 dark:text-gray-400 mb-4">No steps added yet</p>
                <button
                  type="button"
                  onClick={addStep}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Add First Step
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {formData.steps.map((step, index) => (
                  <div key={step.id || index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Step {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeStep(index)}
                        className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded text-sm hover:bg-red-200 dark:hover:bg-red-800"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-3">
                        <select
                          value={step.type}
                          onChange={(e) => handleStepChange(index, 'type', e.target.value)}
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
                            onChange={(e) => handleStepChange(index, 'url', e.target.value)}
                            placeholder={formData.baseUrl ? "/auth/login (will use base URL)" : "https://example.com or /path"}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          />
                        </div>
                      )}

                      {step.type === 'waitForPageLoad' && (
                        <div className="col-span-9">
                          <select
                            value={step.description || 'networkidle'}
                            onChange={(e) => handleStepChange(index, 'description', e.target.value)}
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
                            onChange={(e) => handleStepChange(index, 'selector', e.target.value)}
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
                              onChange={(e) => handleStepChange(index, 'selector', e.target.value)}
                              placeholder="Selector: [data-testid='login-submit'], button[type='submit'], #id, .class"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            />
                          </div>
                          {step.type === 'fill' && (
                            <div className="col-span-4">
                              <input
                                type="text"
                                value={step.value || ''}
                                onChange={(e) => handleStepChange(index, 'value', e.target.value)}
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
                            value={step.description || ''}
                            onChange={(e) => handleStepChange(index, 'description', e.target.value)}
                            placeholder={step.type === 'assert' ? 'Condition: page.url().includes("dashboard")' : 'Custom code: await page.waitForLoadState("networkidle")'}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Expected Result
              </label>
              <textarea
                value={formData.expectedResult}
                onChange={(e) => updateFormData({ expectedResult: e.target.value })}
                placeholder="Describe what should happen when the test passes, e.g., 'User is redirected to dashboard and sees welcome message'"
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Test Summary</h4>
              <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <p><strong>Framework:</strong> {formData.framework}</p>
                <p><strong>Language:</strong> {formData.language}</p>
                <p><strong>Base URL:</strong> {formData.baseUrl || 'Not set'}</p>
                <p><strong>Steps:</strong> {formData.steps.length}</p>
                {formData.requiresLogin && (
                  <>
                    <p><strong>Requires Login:</strong> Yes</p>
                    <p><strong>Target Page:</strong> {formData.targetPageUrl || 'Not set'}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 dark:text-green-200 mb-2">Ready to Generate!</h4>
              <p className="text-sm text-green-800 dark:text-green-300">
                Review your test case details below and click "Generate Test Cases" to create your test files.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <h5 className="font-medium text-gray-900 dark:text-white mb-2">Test Description</h5>
                <p className="text-sm text-gray-600 dark:text-gray-300">{formData.statement || 'Not provided'}</p>
              </div>

              <div>
                <h5 className="font-medium text-gray-900 dark:text-white mb-2">Configuration</h5>
                <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <p>Framework: {formData.framework}</p>
                  <p>Language: {formData.language}</p>
                  <p>Base URL: {formData.baseUrl || 'Not set'}</p>
                </div>
              </div>

              <div>
                <h5 className="font-medium text-gray-900 dark:text-white mb-2">Test Steps ({formData.steps.length})</h5>
                <ol className="list-decimal list-inside text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  {formData.steps.map((step, index) => (
                    <li key={index}>
                      {step.type}: {step.url || step.selector || step.description || 'Not configured'}
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <h5 className="font-medium text-gray-900 dark:text-white mb-2">Expected Result</h5>
                <p className="text-sm text-gray-600 dark:text-gray-300">{formData.expectedResult || 'Not provided'}</p>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Create Test Case - Step {currentStep} of {steps.length}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      currentStep > step.id
                        ? 'bg-green-500 text-white'
                        : currentStep === step.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {currentStep > step.id ? '✓' : step.id}
                  </div>
                  <div className="mt-2 text-xs text-center max-w-[80px]">
                    <p className={`font-medium ${currentStep >= step.id ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                      {step.title}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      currentStep > step.id ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {steps[currentStep - 1].title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {steps[currentStep - 1].description}
            </p>
          </div>

          {renderStepContent()}
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          {currentStep < steps.length ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGenerate}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
            >
              Generate Test Cases
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

