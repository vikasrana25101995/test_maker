interface TestCase {
  name: string
  description: string
  steps: string[]
  expectedResult: string
}

export function generateTestCode(
  testCase: TestCase,
  framework: string,
  language: string
): string {
  const steps = testCase.steps.map(step => `    ${step}`).join('\n')
  const needsE2E = ['playwright', 'selenium', 'cypress'].includes(framework)

  // Helper function to safely format expectedResult
  // If it looks like a valid expression, use it; otherwise use a placeholder
  const formatExpectedResult = (expectedResult: string): string => {
    if (!expectedResult || expectedResult.trim() === '') {
      return 'true'
    }

    // Check if it's already a valid expression (starts with common patterns)
    const trimmed = expectedResult.trim()
    const isValidExpression =
      trimmed.startsWith('true') ||
      trimmed.startsWith('false') ||
      trimmed.startsWith('page.') ||
      trimmed.startsWith('driver.') ||
      trimmed.startsWith('cy.') ||
      trimmed.startsWith('await ') ||
      trimmed.startsWith('expect(') ||
      trimmed.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*\s*[!=<>]/) || // variable comparison
      trimmed.match(/^['"`]/) // string literal

    if (isValidExpression) {
      return trimmed
    }

    // If it's descriptive text, use a placeholder
    return 'true'
  }

  const safeExpectedResult = formatExpectedResult(testCase.expectedResult)

  if (language === 'python') {
    if (framework === 'playwright') {
      return `import pytest
from playwright.sync_api import Page, expect

def test_${testCase.name.toLowerCase().replace(/\s+/g, '_')}(page: Page):
    """${testCase.description}"""
${steps}
    # Expected: ${testCase.expectedResult}
    expect(${safeExpectedResult})`
    } else if (framework === 'selenium') {
      return `from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def test_${testCase.name.toLowerCase().replace(/\s+/g, '_')}():
    """${testCase.description}"""
    driver = webdriver.Chrome()
    try:
${steps}
        # Expected: ${testCase.expectedResult}
        assert ${safeExpectedResult}
    finally:
        driver.quit()`
    } else {
      return `def test_${testCase.name.toLowerCase().replace(/\s+/g, '_')}():
    """${testCase.description}"""
${steps}
    # Expected: ${testCase.expectedResult}
    assert ${safeExpectedResult}`
    }
  } else if (language === 'java') {
    if (framework === 'selenium') {
      return `import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.junit.Test;
import static org.junit.Assert.assertTrue;

public class ${testCase.name.replace(/\s+/g, '')}Test {
    @Test
    public void test${testCase.name.replace(/\s+/g, '')}() {
        // ${testCase.description}
        WebDriver driver = new ChromeDriver();
        try {
${steps}
            // Expected: ${testCase.expectedResult}
            assertTrue(${safeExpectedResult});
        } finally {
            driver.quit();
        }
    }
}`
    } else {
      return `@Test
public void test${testCase.name.replace(/\s+/g, '')}() {
    // ${testCase.description}
${steps}
    // Expected: ${testCase.expectedResult}
    assertTrue(${safeExpectedResult});
}`
    }
  } else {
    // TypeScript/JavaScript
    if (framework === 'playwright') {
      return `import { test, expect } from '@playwright/test'

test('${testCase.description}', async ({ page }) => {
${steps}
  // Expected: ${testCase.expectedResult}
  expect(${safeExpectedResult}).toBeTruthy()
})`
    } else if (framework === 'selenium') {
      if (language === 'typescript') {
        // Clean description - remove newlines and escape quotes
        const cleanDesc = testCase.description
          .replace(/\n/g, ' ')
          .replace(/'/g, "\\'")
          .substring(0, 200)
        const cleanName = testCase.name.replace(/'/g, "\\'")

        return `import { Builder, By, until } from 'selenium-webdriver'
import { expect } from 'chai'

describe('${cleanName}', () => {
  it('${cleanDesc}', async () => {
    const driver = await new Builder().forBrowser('chrome').build()
    try {
${steps}
      // Expected: ${testCase.expectedResult}
      expect(${safeExpectedResult}).to.be.true
    } finally {
      await driver.quit()
    }
  })
})`
      } else {
        return `const { Builder, By, until } = require('selenium-webdriver')
const { expect } = require('chai')

describe('${testCase.name}', () => {
  it('${testCase.description}', async () => {
    const driver = await new Builder().forBrowser('chrome').build()
    try {
${steps}
      // Expected: ${testCase.expectedResult}
      expect(${safeExpectedResult}).to.be.true
    } finally {
      await driver.quit()
    }
  })
})`
      }
    } else if (framework === 'cypress') {
      return `describe('${testCase.name}', () => {
  it('${testCase.description}', () => {
${steps}
    // Expected: ${testCase.expectedResult}
    expect(${safeExpectedResult}).to.be.true
  })
})`
    } else if (framework === 'jest') {
      return `describe('${testCase.name}', () => {
  it('${testCase.description}', async () => {
${steps}
    // Expected: ${testCase.expectedResult}
    // Note: assertions are handled within steps for API calls
    if ('${testCase.expectedResult}' && '${testCase.expectedResult}' !== 'true') {
       expect(${safeExpectedResult}).toBe(true)
    }
  })
})`
    } else if (framework === 'mocha') {
      return `describe('${testCase.name}', () => {
  it('${testCase.description}', () => {
${steps}
    // Expected: ${testCase.expectedResult}
    expect(${safeExpectedResult}).to.be.true
  })
})`
    } else if (framework === 'vitest') {
      return `import { describe, it, expect } from 'vitest'

describe('${testCase.name}', () => {
  it('${testCase.description}', () => {
${steps}
    // Expected: ${testCase.expectedResult}
    expect(${safeExpectedResult}).toBe(true)
  })
})`
    } else {
      return `// ${testCase.name}\n// ${testCase.description}\n${testCase.steps.join('\n')}\n// Expected: ${testCase.expectedResult}`
    }
  }
}

