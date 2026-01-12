import { NextRequest, NextResponse } from 'next/server'
import { generateTestCode } from '@/lib/testCodeGenerator'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { testCases, framework, language } = body

    if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
      return NextResponse.json(
        { error: 'Test cases are required' },
        { status: 400 }
      )
    }

    // Get file extension
    const getExtension = (lang: string): string => {
      const extensions: Record<string, string> = {
        typescript: 'ts',
        javascript: 'js',
        python: 'py',
        java: 'java',
      }
      return extensions[lang] || 'js'
    }

    // Get imports based on framework and language
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
          // Use import for TypeScript, require for JavaScript
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

    // Process each test case
    const files: Array<{ filename: string; content: string }> = []

    for (const testCase of testCases) {
      const testCode = generateTestCode(
        {
          name: testCase.name,
          description: testCase.description,
          steps: testCase.steps,
          expectedResult: testCase.expectedResult,
        },
        testCase.framework || framework,
        testCase.language || language
      )

      // Check if testCode already includes imports (for TypeScript Selenium, etc.)
      const hasImports = testCode.includes('import ') || testCode.includes('require(')
      const imports = hasImports ? '' : getImports(testCase.framework || framework, testCase.language || language)
      const fileContent = imports ? `${imports}\n\n${testCode}` : testCode

      // Create safe filename
      const safeName = testCase.name
        .replace(/[^a-z0-9]/gi, '-')
        .toLowerCase()
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      const extension = getExtension(testCase.language || language)
      const filename = `${safeName}.test.${extension}`

      files.push({ filename, content: fileContent })
    }

    // If single file, return it directly for download
    if (files.length === 1) {
      const file = files[0]
      return new NextResponse(file.content, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="${file.filename}"`,
        },
      })
    }

    // Multiple files - return as JSON for client to handle
    return NextResponse.json({
      success: true,
      files,
    })
  } catch (error) {
    console.error('Error generating test file:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate test file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

