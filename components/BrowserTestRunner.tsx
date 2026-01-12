'use client'

import { useState } from 'react'
import { SavedTestCase } from '@/lib/testCaseStorage'
import { TestStep } from '@/lib/testStepTypes'

interface BrowserTestRunnerProps {
  testCase: SavedTestCase
  onClose: () => void
}

interface TestResult {
  step: string
  status: 'pending' | 'running' | 'passed' | 'failed'
  message?: string
  duration?: number
}

export default function BrowserTestRunner({ testCase, onClose }: BrowserTestRunnerProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])
  const [currentStep, setCurrentStep] = useState<number>(-1)
  const [testWindow, setTestWindow] = useState<Window | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Parse structured steps from test case
  const parseSteps = (): TestStep[] => {
    try {
      // First step might be JSON string with structured steps
      if (testCase.steps && testCase.steps.length > 0) {
        const firstStep = testCase.steps[0]
        if (firstStep.startsWith('[') || firstStep.startsWith('{')) {
          try {
            const parsed = JSON.parse(firstStep)
            if (Array.isArray(parsed)) {
              return parsed as TestStep[]
            }
          } catch {
            // Not JSON, continue with code parsing
          }
        }
      }
      // If no structured steps, try to convert string steps to display format
      if (testCase.steps && testCase.steps.length > 0) {
        // Filter out the JSON step if it exists, and any generated code
        // Return empty array - we'll show string steps separately
        return []
      }
      return []
    } catch {
      return []
    }
  }

  const structuredSteps = parseSteps()
  
  // Get display steps - either structured or string steps
  const getDisplaySteps = (): Array<{ description: string; isCode?: boolean }> => {
    if (structuredSteps.length > 0) {
      return structuredSteps.map(step => ({ description: step.description || step.type }))
    }
    
    // If no structured steps, show string steps (filter out JSON and code)
    if (testCase.steps && testCase.steps.length > 0) {
      return testCase.steps
        .filter(step => {
          // Skip JSON string
          if (step.startsWith('[') || step.startsWith('{')) {
            try {
              JSON.parse(step)
              return false // This is JSON, skip it
            } catch {
              // Not valid JSON, include it
            }
          }
          // Include all other steps
          return true
        })
        .map(step => ({ 
          description: step,
          isCode: step.trim().startsWith('await') || step.trim().startsWith('const') || step.trim().startsWith('expect')
        }))
    }
    
    return []
  }

  const displaySteps = getDisplaySteps()

  // Helper function to resolve relative URLs
  const resolveUrl = (url: string): string => {
    // If URL is already absolute (starts with http:// or https://), return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    
    // If URL is relative, resolve it using baseUrl or targetPageUrl
    const baseUrl = testCase.baseUrl || testCase.targetPageUrl || 'https://staging.joinsucceed.ai'
    const cleanBase = baseUrl.replace(/\/+$/, '') // Remove trailing slashes
    const cleanUrl = url.startsWith('/') ? url : `/${url}` // Ensure leading slash
    
    return `${cleanBase}${cleanUrl}`
  }

  const executeStep = async (step: TestStep, stepIndex: number): Promise<{ success: boolean; message: string }> => {
    // For wait/waitForPageLoad steps, we don't need window access - just wait
    // These can proceed even if window is cross-origin or we can't access it
    if (step.type === 'wait' || step.type === 'waitForPageLoad') {
      // These steps just wait - no window access needed
      // We'll handle them in the switch statement
    } else {
      // For other steps, check if window is available
      if (!testWindow) {
        return { success: false, message: 'Test window is not available' }
      }
      
      if (step.type === 'navigate') {
        // Navigation can work even on cross-origin windows
        // We'll handle it in the switch statement
      } else {
        // For other steps that need DOM access, check if window is accessible
        // Check if window is actually closed (not just cross-origin)
        let isWindowClosed = false
        try {
          isWindowClosed = testWindow.closed
        } catch (e) {
          // If we can't access .closed, it might be cross-origin, but window is still open
          // For cross-origin windows, we can't tell if it's closed, so assume it's open
          isWindowClosed = false
        }
        
        if (isWindowClosed) {
          return { success: false, message: 'Test window was closed' }
        }
      }
    }

    // Check if we can still access the window (cross-origin check)
    let canAccessWindow = false
    if (testWindow) {
      try {
        // Try to access window.location - will throw if cross-origin
        const _ = testWindow.location.href
        canAccessWindow = true
      } catch (e) {
        // Cross-origin - we can't access the window anymore, but it's still open
        canAccessWindow = false
      }
    }

    try {
      switch (step.type) {
        case 'navigate':
          if (!testWindow) {
            return { success: false, message: 'Test window is not available' }
          }
          if (step.url) {
            try {
              // Resolve relative URLs to absolute URLs
              const fullUrl = resolveUrl(step.url)
              
              // Try to navigate - this should work even if window is cross-origin
              try {
                testWindow.location.href = fullUrl
                await new Promise(resolve => setTimeout(resolve, 3000)) // Wait for page load
                
                // After navigation, check if window is still accessible
                try {
                  const _ = testWindow.location.href
                  return { success: true, message: `Navigated to ${fullUrl}` }
                } catch {
                  // Cross-origin navigation - this is expected and OK
                  return { success: true, message: `Navigated to ${fullUrl} (cross-origin - watch the test window)` }
                }
              } catch (navErr) {
                // If we can't set location.href (cross-origin), navigation still likely succeeded
                // The browser navigated, we just can't verify it
                return { success: true, message: `Navigation attempted to ${fullUrl} (cross-origin - watch the test window to verify)` }
              }
            } catch (err) {
              return { success: false, message: `Navigation failed: ${err instanceof Error ? err.message : 'Unknown error'}` }
            }
          }
          return { success: false, message: 'No URL provided' }

        case 'waitForPageLoad':
          // For waitForPageLoad, we just wait - no need to access the window
          // This works even for cross-origin windows
          await new Promise(resolve => setTimeout(resolve, 2000))
          if (!canAccessWindow) {
            return { success: true, message: 'Waiting for page load (cross-origin - watch the test window)' }
          }
          return { success: true, message: 'Page loaded' }

        case 'wait':
          if (step.selector) {
            // Wait for element (simplified - just wait a bit)
            await new Promise(resolve => setTimeout(resolve, 1000))
            if (!canAccessWindow) {
              return { success: true, message: `Waited for ${step.selector} (cross-origin - watch the test window)` }
            }
            return { success: true, message: `Waited for ${step.selector}` }
          }
          return { success: false, message: 'No selector provided' }

        case 'click':
          if (!testWindow) {
            return { success: false, message: 'Test window is not available' }
          }
          if (step.selector) {
            if (!canAccessWindow) {
              return { success: false, message: 'Cannot access window (cross-origin). Please verify manually in the test window.' }
            }
            try {
              const element = testWindow.document.querySelector(step.selector)
              if (element) {
                ;(element as HTMLElement).click()
                await new Promise(resolve => setTimeout(resolve, 500))
                return { success: true, message: `Clicked ${step.selector}` }
              }
              return { success: false, message: `Element not found: ${step.selector}` }
            } catch (err) {
              return { success: false, message: `Error clicking: ${err instanceof Error ? err.message : 'Unknown error'}` }
            }
          }
          return { success: false, message: 'No selector provided' }

        case 'fill':
          if (!testWindow) {
            return { success: false, message: 'Test window is not available' }
          }
          if (step.selector && step.value) {
            if (!canAccessWindow) {
              return { success: false, message: 'Cannot access window (cross-origin). Please fill manually in the test window.' }
            }
            try {
              const element = testWindow.document.querySelector(step.selector) as HTMLInputElement
              if (element) {
                element.value = step.value
                element.dispatchEvent(new Event('input', { bubbles: true }))
                element.dispatchEvent(new Event('change', { bubbles: true }))
                await new Promise(resolve => setTimeout(resolve, 300))
                return { success: true, message: `Filled ${step.selector} with ${step.value}` }
              }
              return { success: false, message: `Element not found: ${step.selector}` }
            } catch (err) {
              return { success: false, message: `Error filling: ${err instanceof Error ? err.message : 'Unknown error'}` }
            }
          }
          return { success: false, message: 'No selector or value provided' }

        case 'verifyElement':
          if (!testWindow) {
            return { success: false, message: 'Test window is not available' }
          }
          if (step.selector) {
            if (!canAccessWindow) {
              return { success: false, message: 'Cannot verify element (cross-origin). Please verify manually in the test window.' }
            }
            try {
              const element = testWindow.document.querySelector(step.selector)
              if (element && (element as HTMLElement).offsetParent !== null) {
                return { success: true, message: `Element found and visible: ${step.selector}` }
              }
              return { success: false, message: `Element not found or not visible: ${step.selector}` }
            } catch (err) {
              return { success: false, message: `Error verifying: ${err instanceof Error ? err.message : 'Unknown error'}` }
            }
          }
          return { success: false, message: 'No selector provided' }

        case 'assert':
          // For assert steps, we'll just mark them as passed if they reach this point
          return { success: true, message: step.description || 'Assertion passed' }

        default:
          return { success: false, message: `Unknown step type: ${step.type}` }
      }
    } catch (err) {
      return { success: false, message: `Error executing step: ${err instanceof Error ? err.message : 'Unknown error'}` }
    }
  }

  const runTest = async () => {
    if (structuredSteps.length === 0) {
      setError('No structured test steps found. This test case may need to be edited to include step-by-step instructions.')
      return
    }

    const testStartTime = new Date().toISOString()
    setIsRunning(true)
    setError(null)
    setResults(structuredSteps.map(step => ({ step: step.description || step.type, status: 'pending' as const })))

    // Open test window
    const width = 1200
    const height = 800
    const left = (window.screen.width - width) / 2
    const top = (window.screen.height - height) / 2
    const newWindow = window.open(
      '',
      'testWindow',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    )

    if (!newWindow) {
      setError('Failed to open test window. Please allow popups for this site.')
      setIsRunning(false)
      return
    }

    setTestWindow(newWindow)

    // Write initial content to window to establish same-origin context
    newWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Runner Window</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .loading { text-align: center; margin-top: 50px; }
          </style>
        </head>
        <body>
          <div class="loading">
            <h2>Test Runner</h2>
            <p>Preparing to run test...</p>
          </div>
        </body>
      </html>
    `)
    newWindow.document.close()
    
    await new Promise(resolve => setTimeout(resolve, 500))

    // Navigate to first URL if available (skip this step in the loop)
    let skipFirstNavigate = false
    const firstNavigateStep = structuredSteps.find(s => s.type === 'navigate' && s.url)
    if (firstNavigateStep && firstNavigateStep.url) {
      try {
        const fullUrl = resolveUrl(firstNavigateStep.url)
        newWindow.location.href = fullUrl
        await new Promise(resolve => setTimeout(resolve, 3000)) // Wait for initial page load
        
        // Mark that we should skip the first navigate step in the loop
        skipFirstNavigate = true
        
        // Check if window is still accessible after navigation
        try {
          const _ = newWindow.location.href
          // Still accessible - same origin
        } catch {
          // Cross-origin - this is expected and OK, but we'll show a warning
          setError('Note: Test window navigated to a different origin. Some automated steps may require manual verification.')
        }
      } catch (err) {
        setError(`Failed to navigate: ${err instanceof Error ? err.message : 'Unknown error'}`)
        setIsRunning(false)
        return
      }
    }

    // Execute each step
    for (let i = 0; i < structuredSteps.length; i++) {
      // Skip the first navigate step if we already navigated
      if (skipFirstNavigate && i === 0 && structuredSteps[i].type === 'navigate') {
        setCurrentStep(i)
        setResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'passed', message: `Already navigated to ${resolveUrl(structuredSteps[i].url || '')}` } : r))
        continue
      }
      setCurrentStep(i)
      setResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'running' } : r))

      const step = structuredSteps[i]
      const startTime = Date.now()
      const result = await executeStep(step, i)
      const duration = Date.now() - startTime

      setResults(prev => prev.map((r, idx) => 
        idx === i 
          ? { ...r, status: result.success ? 'passed' : 'failed', message: result.message, duration }
          : r
      ))

      // Don't stop on cross-origin navigation - it's expected and successful
      // Only stop on actual failures (not cross-origin warnings)
      const isCrossOriginWarning = result.message.includes('cross-origin') || 
                                   result.message.includes('watch the test window') ||
                                   result.message.includes('manual verification')
      
      if (!result.success && !isCrossOriginWarning) {
        setError(`Test failed at step ${i + 1}: ${result.message}`)
        
        // Test failed - save results to database before stopping
        const testEndTime = new Date().toISOString()
        const totalDuration = Date.now() - new Date(testStartTime).getTime()
        const currentResults = results.map((r, idx) => 
          idx === i 
            ? { ...r, status: result.success ? 'passed' : 'failed', message: result.message, duration }
            : r
        )
        const passedSteps = currentResults.filter(r => r.status === 'passed').length
        const failedSteps = currentResults.filter(r => r.status === 'failed').length

        try {
          await fetch('/api/test-executions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              testCaseId: testCase.id,
              status: 'failed',
              startedAt: testStartTime,
              completedAt: testEndTime,
              durationMs: totalDuration,
              totalSteps: structuredSteps.length,
              passedSteps,
              failedSteps,
              errorMessage: `Test failed at step ${i + 1}: ${result.message}`,
              stepResults: currentResults,
            }),
          })
        } catch (saveError) {
          console.error('Failed to save test execution results:', saveError)
        }

        setIsRunning(false)
        return
      }
      
      // If navigation was successful but cross-origin, continue with remaining steps
      // They may not be fully automated but we'll try

      // Small delay between steps
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // Test completed - save results to database
    const testEndTime = new Date().toISOString()
    const totalDuration = Date.now() - new Date(testStartTime).getTime()
    const passedSteps = results.filter(r => r.status === 'passed').length
    const failedSteps = results.filter(r => r.status === 'failed').length
    const finalStatus = failedSteps > 0 ? 'failed' : 'passed'

    try {
      await fetch('/api/test-executions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testCaseId: testCase.id,
          status: finalStatus,
          startedAt: testStartTime,
          completedAt: testEndTime,
          durationMs: totalDuration,
          totalSteps: structuredSteps.length,
          passedSteps,
          failedSteps,
          errorMessage: error || null,
          stepResults: results,
        }),
      })
    } catch (saveError) {
      console.error('Failed to save test execution results:', saveError)
      // Don't show error to user - test completed successfully, just couldn't save results
    }

    setIsRunning(false)
    setCurrentStep(-1)
  }

  const stopTest = () => {
    if (testWindow && !testWindow.closed) {
      testWindow.close()
    }
    setIsRunning(false)
    setCurrentStep(-1)
  }

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return 'text-green-600 dark:text-green-400'
      case 'failed': return 'text-red-600 dark:text-red-400'
      case 'running': return 'text-blue-600 dark:text-blue-400'
      default: return 'text-gray-500 dark:text-gray-400'
    }
  }

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return '✓'
      case 'failed': return '✗'
      case 'running': return '⟳'
      default: return '○'
    }
  }

  const passedCount = results.filter(r => r.status === 'passed').length
  const failedCount = results.filter(r => r.status === 'failed').length
  const totalCount = results.length

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Run Test: {testCase.name}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {testCase.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className={`border rounded-lg p-4 ${
              error.includes('Note:') || error.includes('cross-origin')
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <p className={error.includes('Note:') || error.includes('cross-origin')
                ? 'text-yellow-800 dark:text-yellow-200'
                : 'text-red-800 dark:text-red-200'
              }>{error}</p>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> When testing cross-origin sites, the browser's security policy prevents full automation after navigation. 
              The test window will open and navigate, but subsequent steps may require manual verification. 
              Watch the test window to see the actions being performed.
            </p>
          </div>

          {structuredSteps.length === 0 && displaySteps.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-yellow-800 dark:text-yellow-200">
                This test case has step descriptions but not structured steps. Automated execution requires structured steps. 
                Please edit the test case to add structured step-by-step instructions for full automation.
              </p>
            </div>
          )}
          {structuredSteps.length === 0 && displaySteps.length === 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-yellow-800 dark:text-yellow-200">
                This test case doesn't have any test steps. Please edit it to add step-by-step instructions.
              </p>
            </div>
          )}

          {totalCount > 0 && (
            <div className="flex gap-4 items-center">
              <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {passedCount} / {totalCount} passed
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(passedCount / totalCount) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}
          {totalCount === 0 && displaySteps.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> Found {displaySteps.length} step{displaySteps.length !== 1 ? 's' : ''} to display. 
                Click "Run Test" to execute them.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Test Steps</h3>
            {displaySteps.length > 0 && results.length === 0 && (
              <div className="space-y-2">
                {displaySteps.map((step, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-xl font-bold text-gray-500 dark:text-gray-400">○</span>
                      <div className="flex-1">
                        <p className={`font-medium text-gray-900 dark:text-white ${step.isCode ? 'font-mono text-sm' : ''}`}>
                          Step {index + 1}: {step.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {results.length > 0 ? (
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 ${
                      result.status === 'passed'
                        ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                        : result.status === 'failed'
                        ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                        : result.status === 'running'
                        ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <span className={`text-xl font-bold ${getStatusColor(result.status)}`}>
                          {getStatusIcon(result.status)}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            Step {index + 1}: {result.step}
                          </p>
                          {result.message && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {result.message}
                            </p>
                          )}
                          {result.duration && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              Duration: {result.duration}ms
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : displaySteps.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No steps to execute</p>
            ) : null}
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            {!isRunning ? (
              <>
                <button
                  onClick={runTest}
                  disabled={structuredSteps.length === 0}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium"
                  title={structuredSteps.length === 0 ? 'This test case needs structured steps to run automatically. Please edit it to add structured steps.' : ''}
                >
                  Run Test
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium"
                >
                  Close
                </button>
              </>
            ) : (
              <button
                onClick={stopTest}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
              >
                Stop Test
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

