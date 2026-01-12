import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Lazy initialization - only create client when API key is available
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return null
  }
  return new OpenAI({ apiKey })
}

interface TestCase {
  name: string
  description: string
  steps: string[]
  expectedResult: string
}

export async function POST(request: NextRequest) {
  let statement = ''
  let framework = 'jest'
  let language = 'typescript'
  let requiresLogin = false
  let targetPageUrl = ''
  let redirectPageUrl = '/login'

  try {
    const body = await request.json()
    statement = body.statement || ''
    framework = body.framework || 'jest'
    language = body.language || 'typescript'
    requiresLogin = body.requiresLogin || false
    targetPageUrl = body.targetPageUrl || ''
    redirectPageUrl = body.redirectPageUrl || '/login'

    if (!statement) {
      return NextResponse.json(
        { error: 'Statement is required' },
        { status: 400 }
      )
    }

    const openai = getOpenAIClient()
    
    if (!openai) {
      // Fallback: Generate test cases without AI
      return NextResponse.json({
        testCases: generateFallbackTestCases(
          statement, 
          framework, 
          language, 
          requiresLogin, 
          targetPageUrl, 
          redirectPageUrl
        ),
      })
    }

    let authContext = ''
    if (requiresLogin) {
      authContext = `\n\nAuthentication Context:
- The page requires login/authentication
- Target page URL: ${targetPageUrl || 'not specified'}
- Redirect page URL (if not authenticated): ${redirectPageUrl}
- Generate test cases that include:
  1. Testing redirect to login page when not authenticated
  2. Testing successful access after login
  3. Testing authentication flow and session management
  4. Use Playwright or similar E2E testing patterns for navigation and redirects`

      if (targetPageUrl) {
        authContext += `\n- Include steps to navigate to "${targetPageUrl}" and verify redirect behavior`
      }
    }

    const prompt = `Generate comprehensive test cases based on the following statement. 
Return the response as a JSON object with a "testCases" property containing an array of test case objects. Each test case should have:
- name: A concise test case name
- description: A detailed description of what is being tested
- steps: An array of test steps as strings (each step should be actual code statements, not just comments)
- expectedResult: The expected outcome as a string

Statement: "${statement}"
Test Framework: ${framework}
Programming Language: ${language}${authContext}

Generate 3-5 test cases covering positive, negative, and edge cases. 
${requiresLogin ? `For authentication tests, include ${framework}-style navigation steps for redirects and login flows.` : ''}
Return ONLY valid JSON object with this structure: {"testCases": [...]}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a test case generation expert. Generate comprehensive test cases in JSON format.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    })

    const responseContent = completion.choices[0]?.message?.content

    if (!responseContent) {
      throw new Error('No response from AI')
    }

    // Parse the JSON response
    let parsedResponse
    try {
      parsedResponse = JSON.parse(responseContent)
    } catch (parseError) {
      // If parsing fails, try to extract JSON from markdown code blocks
      const jsonMatch = responseContent.match(/```(?:json)?\s*(\{.*\})\s*```/s)
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[1])
      } else {
        throw new Error('Failed to parse AI response')
      }
    }

    // Handle both direct array and object with testCases property
    let testCases: TestCase[] = []
    if (Array.isArray(parsedResponse)) {
      testCases = parsedResponse
    } else if (parsedResponse.testCases && Array.isArray(parsedResponse.testCases)) {
      testCases = parsedResponse.testCases
    } else {
      // Fallback if structure is unexpected
      testCases = generateFallbackTestCases(
        statement, 
        framework, 
        language, 
        requiresLogin, 
        targetPageUrl, 
        redirectPageUrl
      )
    }

    return NextResponse.json({ testCases })
  } catch (error) {
    console.error('Error generating test cases:', error)
    
    // Always return JSON, even on error
    if (error instanceof Error && error.message.includes('OPENAI_API_KEY')) {
      // Fallback to basic test case generation when API key is missing
      return NextResponse.json({
        testCases: generateFallbackTestCases(
          statement, 
          framework, 
          language, 
          requiresLogin, 
          targetPageUrl, 
          redirectPageUrl
        ),
        warning: 'OpenAI API key not configured. Using fallback test case generation.',
      })
    }
    
    // Fallback to basic test case generation for other errors
    return NextResponse.json({
      testCases: generateFallbackTestCases(
        statement, 
        framework, 
        language, 
        requiresLogin, 
        targetPageUrl, 
        redirectPageUrl
      ),
      error: error instanceof Error ? error.message : 'An error occurred',
    })
  }
}

function generateFallbackTestCases(
  statement: string,
  framework: string,
  language: string,
  requiresLogin: boolean = false,
  targetPageUrl: string = '',
  redirectPageUrl: string = '/login'
): TestCase[] {
  if (requiresLogin && targetPageUrl) {
    // Generate authentication-focused test cases
    return [
      {
        name: 'Redirect to Login When Not Authenticated',
        description: `Test that unauthenticated users are redirected to ${redirectPageUrl} when accessing ${targetPageUrl}`,
        steps: [
          `await page.goto('${targetPageUrl}')`,
          `await page.waitForURL('**${redirectPageUrl}**')`,
          `expect(page.url()).toContain('${redirectPageUrl}')`,
        ],
        expectedResult: `User should be redirected to ${redirectPageUrl}`,
      },
      {
        name: 'Access Page After Login',
        description: `Test that authenticated users can access ${targetPageUrl} after login`,
        steps: [
          `await page.goto('${redirectPageUrl}')`,
          `await page.fill('input[name="email"]', 'test@example.com')`,
          `await page.fill('input[name="password"]', 'password123')`,
          `await page.click('button[type="submit"]')`,
          `await page.waitForURL('**${targetPageUrl}**')`,
          `expect(page.url()).toContain('${targetPageUrl}')`,
        ],
        expectedResult: `User should be able to access ${targetPageUrl} after successful login`,
      },
      {
        name: 'Maintain Session After Login',
        description: `Test that user session is maintained when navigating to ${targetPageUrl}`,
        steps: [
          `// Assume user is already logged in`,
          `await page.goto('${targetPageUrl}')`,
          `await page.waitForLoadState('networkidle')`,
          `expect(page.url()).toContain('${targetPageUrl}')`,
          `// Verify user is still authenticated`,
        ],
        expectedResult: 'User session should be maintained and page should be accessible',
      },
      {
        name: 'Handle Invalid Credentials',
        description: `Test that invalid login credentials prevent access to ${targetPageUrl}`,
        steps: [
          `await page.goto('${redirectPageUrl}')`,
          `await page.fill('input[name="email"]', 'invalid@example.com')`,
          `await page.fill('input[name="password"]', 'wrongpassword')`,
          `await page.click('button[type="submit"]')`,
          `await page.waitForSelector('.error-message')`,
          `expect(page.url()).toContain('${redirectPageUrl}')`,
        ],
        expectedResult: 'User should not be able to access protected page with invalid credentials',
      },
    ]
  }

  // Basic fallback test case generation without AI
  return [
    {
      name: 'Positive Case',
      description: `Test that ${statement.toLowerCase()}`,
      steps: [
        `// Setup: Prepare test data`,
        `// Action: Execute the functionality`,
        `// Assert: Verify the result`,
      ],
      expectedResult: 'The functionality should work as expected',
    },
    {
      name: 'Negative Case',
      description: `Test error handling for ${statement.toLowerCase()}`,
      steps: [
        `// Setup: Prepare invalid test data`,
        `// Action: Execute with invalid input`,
        `// Assert: Verify error is handled properly`,
      ],
      expectedResult: 'Appropriate error should be thrown or handled',
    },
    {
      name: 'Edge Case',
      description: `Test edge cases for ${statement.toLowerCase()}`,
      steps: [
        `// Setup: Prepare edge case data`,
        `// Action: Execute with edge case input`,
        `// Assert: Verify edge case is handled`,
      ],
      expectedResult: 'Edge case should be handled correctly',
    },
  ]
}

