import { NextRequest, NextResponse } from 'next/server'
import { getPool, initDatabase } from '@/lib/db'
import { generateTestCode } from '@/lib/testCodeGenerator'
import { generateStepCode, TestStep } from '@/lib/testStepTypes'
import { SavedTestCase } from '@/lib/testCaseStorage'
import { auth } from '@/auth'

// Initialize database on first request
let dbInitialized = false

async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initDatabase()
    dbInitialized = true
  }
}

// Helper function to generate test code from test case data
function generateTestFileContent(
  name: string,
  description: string,
  steps: any[],
  expectedResult: string,
  framework: string,
  language: string,
  baseUrl?: string
): string {
  // Check if steps contain structured steps (first step is JSON string)
  let stepCodes: string[] = []

  if (steps && steps.length > 0) {
    const firstStep = steps[0]
    // Check if first step is a JSON string containing structured steps
    if (typeof firstStep === 'string' && firstStep.trim().startsWith('[')) {
      try {
        const structuredSteps: TestStep[] = JSON.parse(firstStep)
        // Generate code for each structured step
        stepCodes = structuredSteps.map((step, index) =>
          generateStepCode(step, framework, language, index, baseUrl)
        )
      } catch {
        // Not valid JSON, treat as regular steps
        stepCodes = steps.filter((s: string) => s && s.trim())
      }
    } else {
      // Regular string steps
      stepCodes = steps.filter((s: string) => s && s.trim())
    }
  }

  // Generate test code
  const testCode = generateTestCode(
    {
      name,
      description,
      steps: stepCodes,
      expectedResult,
    },
    framework,
    language
  )

  // Add imports if needed
  const getImports = (fw: string, lang: string): string => {
    if (fw === 'playwright') {
      if (lang === 'python') {
        return `import pytest\nfrom playwright.sync_api import Page, expect`
      } else {
        return `import { test, expect } from '@playwright/test'`
      }
    } else if (fw === 'selenium') {
      if (lang === 'python') {
        return `from selenium import webdriver\nfrom selenium.webdriver.common.by import By\nfrom selenium.webdriver.support.ui import WebDriverWait\nfrom selenium.webdriver.support import expected_conditions as EC`
      } else if (lang === 'java') {
        return `import org.openqa.selenium.WebDriver;\nimport org.openqa.selenium.chrome.ChromeDriver;\nimport org.junit.Test;\nimport static org.junit.Assert.assertTrue;`
      } else {
        if (lang === 'typescript') {
          return `import { Builder, By, until } from 'selenium-webdriver'\nimport { expect } from 'chai'`
        } else {
          return `const { Builder, By, until } = require('selenium-webdriver');\nconst { expect } = require('chai');`
        }
      }
    } else if (fw === 'cypress') {
      return `// Cypress commands are available globally`
    } else if (fw === 'jest') {
      return `// Jest globals are available`
    } else if (fw === 'mocha') {
      return `const { expect } = require('chai')`
    } else if (fw === 'vitest') {
      return `import { describe, it, expect } from 'vitest'`
    }
    return ''
  }

  // Check if testCode already includes imports
  const hasImports = testCode.includes('import ') || testCode.includes('require(')
  const imports = hasImports ? '' : getImports(framework, language)
  return imports ? `${imports}\n\n${testCode}` : testCode
}

// GET - Fetch all test cases
export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized()

    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const pool = getPool()
    const result = await pool.query(`
      SELECT 
        id,
        name,
        description,
        steps,
        expected_result as "expectedResult",
        framework,
        language,
        statement,
        requires_login as "requiresLogin",
        target_page_url as "targetPageUrl",
        redirect_page_url as "redirectPageUrl",
        base_url as "baseUrl",
        tags,
        generated_code as "generatedCode",
        type,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM test_cases
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [session.user.id])

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching test cases:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorDetails = errorMessage.includes('DATABASE_URL')
      ? 'Database connection not configured. Please set DATABASE_URL in .env.local'
      : errorMessage

    return NextResponse.json(
      { error: 'Failed to fetch test cases', details: errorDetails },
      { status: 500 }
    )
  }
}

// POST - Create a new test case
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized()

    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const pool = getPool()
    const body = await request.json()

    const {
      name,
      description,
      steps,
      expectedResult,
      framework,
      language,
      statement,
      requiresLogin = false,
      targetPageUrl,
      redirectPageUrl,
      baseUrl,
      tags = [],
      type = 'WEB',
    } = body

    // Generate ID
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    const now = new Date().toISOString()

    // Generate test code file content
    const generatedCode = generateTestFileContent(
      name,
      description || '',
      steps || [],
      expectedResult || '',
      framework,
      language,
      baseUrl
    )

    const result = await pool.query(
      `
      INSERT INTO test_cases (
        id, name, description, steps, expected_result, framework, language,
        statement, requires_login, target_page_url, redirect_page_url, base_url, tags,
        generated_code, created_at, updated_at, user_id, type
      )
      VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14, $15, $16, $17, $18)
      RETURNING 
        id,
        name,
        description,
        steps,
        expected_result as "expectedResult",
        framework,
        language,
        statement,
        requires_login as "requiresLogin",
        target_page_url as "targetPageUrl",
        redirect_page_url as "redirectPageUrl",
        base_url as "baseUrl",
        tags,
        generated_code as "generatedCode",
        created_at as "createdAt",
        updated_at as "updatedAt",
        type
      `,
      [
        id,
        name,
        description,
        JSON.stringify(steps), // JSONB column - stringify array to ensure proper JSON format
        expectedResult,
        framework,
        language,
        statement,
        requiresLogin,
        targetPageUrl,
        redirectPageUrl,
        baseUrl,
        JSON.stringify(tags), // JSONB column - stringify array to ensure proper JSON format
        generatedCode,
        now,
        now,
        session.user.id,
        type
      ]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('Error creating test case:', error)
    return NextResponse.json(
      { error: 'Failed to create test case', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

