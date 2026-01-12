'use client'

import TestCaseGenerator from '@/components/TestCaseGenerator'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            TestMaker
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-4">
            Generate comprehensive test cases from natural language statements
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            Go to Dashboard
          </Link>
        </div>
        <TestCaseGenerator />
      </div>
    </main>
  )
}

