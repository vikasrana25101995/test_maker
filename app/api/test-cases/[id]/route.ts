import { NextRequest, NextResponse } from 'next/server'
import { getPool, initDatabase } from '@/lib/db'
import { generateTestCode } from '@/lib/testCodeGenerator'
import { generateStepCode, TestStep } from '@/lib/testStepTypes'

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

// GET - Fetch a single test case by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbInitialized()
    const { id } = await params
    const pool = getPool()
    const result = await pool.query(
      `
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
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM test_cases
      WHERE id = $1
      `,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Test case not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching test case:', error)
    return NextResponse.json(
      { error: 'Failed to fetch test case', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PUT - Update a test case
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbInitialized()
    const { id } = await params
    const pool = getPool()
    const body = await request.json()

    // First, fetch the current test case to get all values for code generation
    const currentResult = await pool.query(
      `SELECT name, description, steps, expected_result, framework, language, base_url FROM test_cases WHERE id = $1`,
      [id]
    )

    if (currentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Test case not found' }, { status: 404 })
    }

    const current = currentResult.rows[0]

    const {
      name,
      description,
      steps,
      expectedResult,
      framework,
      language,
      statement,
      requiresLogin,
      targetPageUrl,
      redirectPageUrl,
      baseUrl,
      tags,
    } = body

    // Use updated values or fall back to current values
    const finalName = name !== undefined ? name : current.name
    const finalDescription = description !== undefined ? description : current.description
    const finalSteps = steps !== undefined ? steps : current.steps
    const finalExpectedResult = expectedResult !== undefined ? expectedResult : current.expected_result
    const finalFramework = framework !== undefined ? framework : current.framework
    const finalLanguage = language !== undefined ? language : current.language
    const finalBaseUrl = baseUrl !== undefined ? baseUrl : current.base_url

    // Regenerate test code if any code-affecting fields changed
    const codeAffectingFieldsChanged = 
      name !== undefined || 
      description !== undefined || 
      steps !== undefined || 
      expectedResult !== undefined || 
      framework !== undefined || 
      language !== undefined || 
      baseUrl !== undefined

    let generatedCode = null
    if (codeAffectingFieldsChanged) {
      // Ensure finalSteps is an array
      const stepsArray = Array.isArray(finalSteps) 
        ? finalSteps 
        : (typeof finalSteps === 'string' ? JSON.parse(finalSteps || '[]') : finalSteps)
      
      generatedCode = generateTestFileContent(
        finalName,
        finalDescription || '',
        stepsArray,
        finalExpectedResult || '',
        finalFramework,
        finalLanguage,
        finalBaseUrl
      )
    }

    // Build dynamic update query
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      values.push(name)
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`)
      values.push(description)
    }
    if (steps !== undefined) {
      updates.push(`steps = $${paramIndex++}::jsonb`)
      // Ensure steps is properly formatted as JSON
      const stepsValue = Array.isArray(steps) ? JSON.stringify(steps) : steps
      values.push(stepsValue)
    }
    if (expectedResult !== undefined) {
      updates.push(`expected_result = $${paramIndex++}`)
      values.push(expectedResult)
    }
    if (framework !== undefined) {
      updates.push(`framework = $${paramIndex++}`)
      values.push(framework)
    }
    if (language !== undefined) {
      updates.push(`language = $${paramIndex++}`)
      values.push(language)
    }
    if (statement !== undefined) {
      updates.push(`statement = $${paramIndex++}`)
      values.push(statement)
    }
    if (requiresLogin !== undefined) {
      updates.push(`requires_login = $${paramIndex++}`)
      values.push(requiresLogin)
    }
    if (targetPageUrl !== undefined) {
      updates.push(`target_page_url = $${paramIndex++}`)
      values.push(targetPageUrl)
    }
    if (redirectPageUrl !== undefined) {
      updates.push(`redirect_page_url = $${paramIndex++}`)
      values.push(redirectPageUrl)
    }
    if (baseUrl !== undefined) {
      updates.push(`base_url = $${paramIndex++}`)
      values.push(baseUrl)
    }
    if (tags !== undefined) {
      updates.push(`tags = $${paramIndex++}::jsonb`)
      // Ensure tags is properly formatted as JSON
      const tagsValue = Array.isArray(tags) ? JSON.stringify(tags) : tags
      values.push(tagsValue)
    }
    if (generatedCode !== null) {
      updates.push(`generated_code = $${paramIndex++}`)
      values.push(generatedCode)
    }

    // Always update the updated_at timestamp
    updates.push(`updated_at = NOW()`)

    if (updates.length === 1) {
      // Only updated_at was set, nothing to update
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    values.push(id)

    const result = await pool.query(
      `
      UPDATE test_cases
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
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
        updated_at as "updatedAt"
      `,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Test case not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error updating test case:', error)
    return NextResponse.json(
      { error: 'Failed to update test case', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a test case
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const pool = getPool()
    const result = await pool.query('DELETE FROM test_cases WHERE id = $1 RETURNING id', [id])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Test case not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error('Error deleting test case:', error)
    return NextResponse.json(
      { error: 'Failed to delete test case', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

