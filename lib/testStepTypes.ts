export interface TestStep {
  id: string
  type: 'navigate' | 'click' | 'fill' | 'wait' | 'waitForPageLoad' | 'verifyElement' | 'assert' | 'custom' | 'api_call'
  url?: string
  selector?: string
  value?: string
  action?: string
  description: string
  method?: string
  headers?: string
  body?: string
  expectedStatus?: string
}

export const stepTemplates = {
  navigate: {
    type: 'navigate' as const,
    description: 'Navigate to URL',
    placeholder: 'https://example.com',
  },
  click: {
    type: 'click' as const,
    description: 'Click element',
    placeholder: '[data-testid="login-submit"]',
  },
  fill: {
    type: 'fill' as const,
    description: 'Fill input field',
    placeholder: '[data-testid="login-email"]',
  },
  wait: {
    type: 'wait' as const,
    description: 'Wait for element',
    placeholder: '[data-testid="loading"]',
  },
  waitForPageLoad: {
    type: 'waitForPageLoad' as const,
    description: 'Wait for page to load',
    placeholder: 'networkidle or load',
  },
  verifyElement: {
    type: 'verifyElement' as const,
    description: 'Verify element exists',
    placeholder: '[data-testid="login-email"]',
  },
  assert: {
    type: 'assert' as const,
    description: 'Assert condition',
    placeholder: 'Page title contains "Dashboard"',
  },
  custom: {
    type: 'custom' as const,
    description: 'Custom code',
    placeholder: 'await page.waitForLoadState("networkidle")',
  },
  api_call: {
    type: 'api_call' as const,
    description: 'Make API Call',
    placeholder: 'GET https://api.example.com',
  },
}

export function generateStepCode(step: TestStep, framework: string, language: string = 'typescript', stepIndex?: number, baseUrl?: string): string {
  const indent = '      '
  // Generate unique variable name for verifyElement steps to avoid duplicate declarations
  // Use stepIndex if provided, otherwise use a hash of step ID or timestamp
  const elementVarName = stepIndex !== undefined
    ? `element${stepIndex}`
    : `element${step.id ? step.id.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8) : Math.random().toString(36).substring(2, 10)}`

  // Helper to get full URL
  const getFullUrl = (url: string): string => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    const base = baseUrl || 'https://staging.joinsucceed.ai'
    // Remove trailing slash from base and leading slash from url to avoid double slashes
    const cleanBase = base.replace(/\/+$/, '')
    const cleanUrl = url.startsWith('/') ? url : `/${url}`
    return `${cleanBase}${cleanUrl}`
  }

  if (step.type === 'api_call') {
    const method = step.method || 'GET'
    const url = step.url || ''
    const headers = step.headers ? JSON.parse(step.headers) : {}
    const body = step.body ? JSON.parse(step.body) : null
    const expectedStatus = step.expectedStatus || '200'

    if (framework === 'jest') {
      const dbIndent = '    '
      let code = `${dbIndent}const response = await fetch('${url}', {\n`
      code += `${dbIndent}  method: '${method}',\n`
      if (Object.keys(headers).length > 0) {
        code += `${dbIndent}  headers: ${JSON.stringify(headers)},\n`
      }
      if (body) {
        code += `${dbIndent}  body: JSON.stringify(${JSON.stringify(body)}),\n`
      }
      code += `${dbIndent}})\n`
      code += `${dbIndent}expect(response.status).toBe(${expectedStatus})`
      return code
    }
    return `// API Call: ${method} ${url}`
  }

  if (framework === 'selenium') {
    if (language === 'typescript') {
      if (step.type === 'navigate' && step.url) {
        const fullUrl = getFullUrl(step.url)
        return `${indent}await driver.get('${fullUrl}')`
      } else if (step.type === 'click' && step.selector) {
        const byMethod = step.selector.startsWith('#')
          ? `By.id('${step.selector.substring(1)}')`
          : step.selector.startsWith('.')
            ? `By.className('${step.selector.substring(1)}')`
            : `By.css('${step.selector}')`
        return `${indent}await driver.findElement(${byMethod}).click()`
      } else if (step.type === 'fill' && step.selector && step.value) {
        const byMethod = step.selector.startsWith('#')
          ? `By.id('${step.selector.substring(1)}')`
          : step.selector.startsWith('.')
            ? `By.className('${step.selector.substring(1)}')`
            : `By.css('${step.selector}')`
        return `${indent}await driver.findElement(${byMethod}).sendKeys('${step.value}')`
      } else if (step.type === 'wait' && step.selector) {
        const byMethod = step.selector.startsWith('#')
          ? `By.id('${step.selector.substring(1)}')`
          : step.selector.startsWith('.')
            ? `By.className('${step.selector.substring(1)}')`
            : `By.css('${step.selector}')`
        return `${indent}await driver.wait(until.elementLocated(${byMethod}), 10000)`
      } else if (step.type === 'waitForPageLoad') {
        return `${indent}await driver.wait(async () => await driver.executeScript('return document.readyState') === 'complete', 10000)`
      } else if (step.type === 'verifyElement' && step.selector) {
        const byMethod = step.selector.startsWith('#')
          ? `By.id('${step.selector.substring(1)}')`
          : step.selector.startsWith('.')
            ? `By.className('${step.selector.substring(1)}')`
            : `By.css('${step.selector}')`
        return `${indent}const ${elementVarName} = await driver.findElement(${byMethod})\n${indent}expect(await ${elementVarName}.isDisplayed()).to.be.true`
      } else if (step.type === 'assert' && (step.action || step.description)) {
        const condition = step.action || step.description
        return `${indent}expect(${condition}).to.be.true`
      } else if (step.type === 'custom' && (step.action || step.description)) {
        const code = step.action || step.description
        return `${indent}${code}`
      }
    } else {
      // JavaScript
      if (step.type === 'navigate' && step.url) {
        const fullUrl = getFullUrl(step.url)
        return `${indent}await driver.get('${fullUrl}')`
      } else if (step.type === 'click' && step.selector) {
        const byMethod = step.selector.startsWith('#')
          ? `By.id('${step.selector.substring(1)}')`
          : step.selector.startsWith('.')
            ? `By.className('${step.selector.substring(1)}')`
            : `By.css('${step.selector}')`
        return `${indent}await driver.findElement(${byMethod}).click()`
      } else if (step.type === 'fill' && step.selector && step.value) {
        const byMethod = step.selector.startsWith('#')
          ? `By.id('${step.selector.substring(1)}')`
          : step.selector.startsWith('.')
            ? `By.className('${step.selector.substring(1)}')`
            : `By.css('${step.selector}')`
        return `${indent}await driver.findElement(${byMethod}).sendKeys('${step.value}')`
      } else if (step.type === 'wait' && step.selector) {
        const byMethod = step.selector.startsWith('#')
          ? `By.id('${step.selector.substring(1)}')`
          : step.selector.startsWith('.')
            ? `By.className('${step.selector.substring(1)}')`
            : `By.css('${step.selector}')`
        return `${indent}await driver.wait(until.elementLocated(${byMethod}), 10000)`
      } else if (step.type === 'waitForPageLoad') {
        return `${indent}await driver.wait(async () => await driver.executeScript('return document.readyState') === 'complete', 10000)`
      } else if (step.type === 'verifyElement' && step.selector) {
        const byMethod = step.selector.startsWith('#')
          ? `By.id('${step.selector.substring(1)}')`
          : step.selector.startsWith('.')
            ? `By.className('${step.selector.substring(1)}')`
            : `By.css('${step.selector}')`
        return `${indent}const ${elementVarName} = await driver.findElement(${byMethod})\n${indent}expect(await ${elementVarName}.isDisplayed()).to.be.true`
      } else if (step.type === 'assert' && (step.action || step.description)) {
        const condition = step.action || step.description
        return `${indent}expect(${condition}).to.be.true`
      } else if (step.type === 'custom' && (step.action || step.description)) {
        const code = step.action || step.description
        return `${indent}${code}`
      }
    }
  } else if (framework === 'playwright') {
    if (step.type === 'navigate' && step.url) {
      const fullUrl = getFullUrl(step.url)
      return `${indent}await page.goto('${fullUrl}')`
    } else if (step.type === 'click' && step.selector) {
      return `${indent}await page.click('${step.selector}')`
    } else if (step.type === 'fill' && step.selector && step.value) {
      return `${indent}await page.fill('${step.selector}', '${step.value}')`
    } else if (step.type === 'wait' && step.selector) {
      return `${indent}await page.waitForSelector('${step.selector}')`
    } else if (step.type === 'waitForPageLoad') {
      const loadState = step.action || step.description || 'networkidle'
      return `${indent}await page.waitForLoadState('${loadState}')`
    } else if (step.type === 'verifyElement' && step.selector) {
      return `${indent}await expect(page.locator('${step.selector}')).toBeVisible()`
    } else if (step.type === 'assert' && (step.action || step.description)) {
      const condition = step.action || step.description
      return `${indent}expect(${condition}).toBeTruthy()`
    } else if (step.type === 'custom' && (step.action || step.description)) {
      const code = step.action || step.description
      return `${indent}${code}`
    }
  } else if (framework === 'cypress') {
    if (step.type === 'navigate' && step.url) {
      const fullUrl = getFullUrl(step.url)
      return `${indent}cy.visit('${fullUrl}')`
    } else if (step.type === 'click' && step.selector) {
      return `${indent}cy.get('${step.selector}').click()`
    } else if (step.type === 'fill' && step.selector && step.value) {
      return `${indent}cy.get('${step.selector}').type('${step.value}')`
    } else if (step.type === 'wait' && step.selector) {
      return `${indent}cy.get('${step.selector}', { timeout: 10000 })`
    } else if (step.type === 'waitForPageLoad') {
      return `${indent}cy.wait(1000) // Wait for page load`
    } else if (step.type === 'verifyElement' && step.selector) {
      return `${indent}cy.get('${step.selector}').should('be.visible')`
    } else if (step.type === 'assert' && (step.action || step.description)) {
      const condition = step.action || step.description
      return `${indent}expect(${condition}).to.be.true`
    } else if (step.type === 'custom' && (step.action || step.description)) {
      const code = step.action || step.description
      return `${indent}${code}`
    }
  }

  return `${indent}// ${step.description}`
}

