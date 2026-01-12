"use client";

import { useState } from "react";
import { generateTestCode } from "@/lib/testCodeGenerator";

interface TestCase {
  name: string;
  description: string;
  steps: string[];
  expectedResult: string;
}

interface TestRunnerProps {
  testCases: TestCase[];
  framework: string;
  language: string;
}

export default function TestRunner({
  testCases,
  framework,
  language,
}: TestRunnerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState(framework);

  const getRunCommand = () => {
    const commands: Record<string, string> = {
      playwright:
        language === "python" ? "pytest tests/ -v" : "npx playwright test",
      selenium:
        language === "python"
          ? "pytest tests/ -v"
          : language === "java"
          ? "mvn test"
          : "npm run test:selenium",
      cypress: "npx cypress run",
      jest: "npm run test:jest",
      mocha: "npm run test:mocha",
      vitest: "npm run test:vitest",
    };
    return commands[selectedFramework] || "npm run test:jest";
  };

  const getSetupInstructions = () => {
    if (selectedFramework === "playwright") {
      if (language === "python") {
        return `# Install Playwright for Python
pip install pytest-playwright
playwright install

# Run tests
${getRunCommand()}`;
      } else {
        return `# Install Playwright
npm install -D @playwright/test
npx playwright install

# Run tests
${getRunCommand()}`;
      }
    } else if (selectedFramework === "selenium") {
      if (language === "python") {
        return `# Install Selenium for Python
pip install selenium pytest

# Install ChromeDriver (or use webdriver-manager)
pip install webdriver-manager

# Run tests
${getRunCommand()}`;
      } else if (language === "java") {
        return `# Add to pom.xml
<dependency>
    <groupId>org.seleniumhq.selenium</groupId>
    <artifactId>selenium-java</artifactId>
    <version>4.15.0</version>
</dependency>

# Run tests
${getRunCommand()}`;
      } else {
        return `# Install Selenium and Mocha
npm install selenium-webdriver
npm install -D mocha @types/mocha chai @types/chai

# Create tests directory (if it doesn't exist)
mkdir -p tests

# Run tests
${getRunCommand()}

# Note: ChromeDriver is automatically managed by Selenium 4+`;
      }
    } else if (selectedFramework === "cypress") {
      return `# Install Cypress
npm install -D cypress

# Run tests
${getRunCommand()}`;
    } else if (selectedFramework === "jest") {
      return `# Install Jest
npm install -D jest @types/jest

# Add to package.json
"scripts": {
  "test": "jest"
}

# Run tests
${getRunCommand()}`;
    } else if (selectedFramework === "mocha") {
      return `# Install Mocha
npm install -D mocha chai @types/mocha @types/chai

# Run tests
${getRunCommand()}

# Note: Test scripts are already added to package.json`;
    } else if (selectedFramework === "vitest") {
      return `# Install Vitest
npm install -D vitest

# Add to package.json
"scripts": {
  "test": "vitest"
}

# Run tests
${getRunCommand()}`;
    }
    return "See framework documentation for setup instructions";
  };

  const generateCompleteTestFile = () => {
    const fileExtension =
      language === "python" ? "py" : language === "java" ? "java" : "ts";
    const imports = getImports();
    const allTests = testCases
      .map((tc, index) => {
        const code = generateTestCode(tc, selectedFramework, language);
        return `// Test Case ${index + 1}: ${tc.name}\n// ${
          tc.description
        }\n\n${code}\n\n`;
      })
      .join("\n");

    return `${imports}\n\n${allTests}`;
  };

  const getImports = () => {
    if (selectedFramework === "playwright") {
      if (language === "python") {
        return `import pytest\nfrom playwright.sync_api import Page, expect`;
      } else {
        return `import { test, expect } from '@playwright/test'`;
      }
    } else if (selectedFramework === "selenium") {
      if (language === "python") {
        return `from selenium import webdriver\nfrom selenium.webdriver.common.by import By\nfrom selenium.webdriver.support.ui import WebDriverWait\nfrom selenium.webdriver.support import expected_conditions as EC`;
      } else if (language === "java") {
        return `import org.openqa.selenium.WebDriver;\nimport org.openqa.selenium.chrome.ChromeDriver;\nimport org.junit.Test;\nimport static org.junit.Assert.assertTrue;`;
      } else {
        return `import { Builder, By, until } from 'selenium-webdriver'`;
      }
    } else if (selectedFramework === "cypress") {
      return `// Cypress commands are available globally`;
    } else if (selectedFramework === "jest") {
      return `// Jest globals are available`;
    } else if (selectedFramework === "mocha") {
      return `const { expect } = require('chai')`;
    } else if (selectedFramework === "vitest") {
      return `import { describe, it, expect } from 'vitest'`;
    }
    return "";
  };

  const handleDownloadTestFile = () => {
    const fileContent = generateCompleteTestFile();
    const extension =
      language === "python" ? "py" : language === "java" ? "java" : "ts";
    const blob = new Blob([fileContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-file.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium text-sm"
      >
        Run Tests
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Run Test Cases
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Test Framework
            </label>
            <select
              value={selectedFramework}
              onChange={(e) => setSelectedFramework(e.target.value)}
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Setup Instructions
            </h3>
            <pre className="bg-gray-900 dark:bg-black text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{getSetupInstructions()}</code>
            </pre>
            <button
              onClick={() =>
                navigator.clipboard.writeText(getSetupInstructions())
              }
              className="mt-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm"
            >
              Copy Setup Instructions
            </button>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Run Command
            </h3>
            <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg">
              <code className="text-gray-900 dark:text-gray-100 font-mono">
                {getRunCommand()}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(getRunCommand())}
                className="ml-4 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
              >
                Copy
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Complete Test File
            </h3>
            <pre className="bg-gray-900 dark:bg-black text-green-400 p-4 rounded-lg overflow-x-auto text-sm max-h-96">
              <code>{generateCompleteTestFile()}</code>
            </pre>
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleDownloadTestFile}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
              >
                Download Test File
              </button>
              <button
                onClick={() =>
                  navigator.clipboard.writeText(generateCompleteTestFile())
                }
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm"
              >
                Copy Test File
              </button>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
              Quick Start Steps:
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-300 text-sm">
              <li>Copy the setup instructions above</li>
              <li>Run the setup commands in your terminal</li>
              <li>
                Download the test file and save it in your tests directory
              </li>
              <li>
                Run the test command:{" "}
                <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">
                  {getRunCommand()}
                </code>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
