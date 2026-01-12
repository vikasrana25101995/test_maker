import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TestMaker - Generate Test Cases from Statements',
  description: 'AI-powered tool to generate test cases from natural language statements',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

