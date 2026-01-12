import { NextRequest, NextResponse } from 'next/server'
import { getPool, initDatabase } from '@/lib/db'

let dbInitialized = false

async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initDatabase()
    dbInitialized = true
  }
}

// POST - Save a new test execution result
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized()
    const pool = getPool()
    const body = await request.json()

    const {
      testCaseId,
      status,
      startedAt,
      completedAt,
      durationMs,
      totalSteps,
      passedSteps,
      failedSteps,
      errorMessage,
      stepResults,
    } = body

    if (!testCaseId) {
      return NextResponse.json(
        { error: 'testCaseId is required' },
        { status: 400 }
      )
    }

    // Generate ID
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)

    const result = await pool.query(
      `
      INSERT INTO test_executions (
        id, test_case_id, status, started_at, completed_at, duration_ms,
        total_steps, passed_steps, failed_steps, error_message, step_results
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING 
        id,
        test_case_id as "testCaseId",
        status,
        started_at as "startedAt",
        completed_at as "completedAt",
        duration_ms as "durationMs",
        total_steps as "totalSteps",
        passed_steps as "passedSteps",
        failed_steps as "failedSteps",
        error_message as "errorMessage",
        step_results as "stepResults",
        created_at as "createdAt"
      `,
      [
        id,
        testCaseId,
        status || 'completed',
        startedAt || new Date().toISOString(),
        completedAt || new Date().toISOString(),
        durationMs || null,
        totalSteps || 0,
        passedSteps || 0,
        failedSteps || 0,
        errorMessage || null,
        JSON.stringify(stepResults || []),
      ]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('Error saving test execution:', error)
    return NextResponse.json(
      { 
        error: 'Failed to save test execution', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// GET - Fetch test executions (optionally filtered by test_case_id)
export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized()
    const pool = getPool()
    const { searchParams } = new URL(request.url)
    const testCaseId = searchParams.get('testCaseId')

    let query = `
      SELECT 
        id,
        test_case_id as "testCaseId",
        status,
        started_at as "startedAt",
        completed_at as "completedAt",
        duration_ms as "durationMs",
        total_steps as "totalSteps",
        passed_steps as "passedSteps",
        failed_steps as "failedSteps",
        error_message as "errorMessage",
        step_results as "stepResults",
        created_at as "createdAt"
      FROM test_executions
    `
    const params: string[] = []

    if (testCaseId) {
      query += ` WHERE test_case_id = $1`
      params.push(testCaseId)
    }

    query += ` ORDER BY started_at DESC LIMIT 100`

    const result = await pool.query(query, params.length > 0 ? params : undefined)

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching test executions:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch test executions', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

