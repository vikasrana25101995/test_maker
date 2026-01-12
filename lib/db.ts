import { Pool } from 'pg'

// Create a connection pool
let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set. Please add it to your .env.local file.')
    }
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  }
  return pool
}

// Initialize database schema
export async function initDatabase() {
  const pool = getPool()
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS test_cases (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(500) NOT NULL,
      description TEXT,
      steps JSONB NOT NULL,
      expected_result TEXT,
      framework VARCHAR(50) NOT NULL,
      language VARCHAR(50) NOT NULL,
      statement TEXT,
      requires_login BOOLEAN DEFAULT FALSE,
      target_page_url TEXT,
      redirect_page_url TEXT,
      base_url TEXT,
      tags JSONB DEFAULT '[]'::jsonb,
      generated_code TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `)

  // Create index for faster queries
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_test_cases_created_at ON test_cases(created_at DESC)
  `)
  
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_test_cases_framework ON test_cases(framework)
  `)

  // Add generated_code column if it doesn't exist (migration for existing databases)
  await pool.query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'test_cases' AND column_name = 'generated_code'
      ) THEN
        ALTER TABLE test_cases ADD COLUMN generated_code TEXT;
      END IF;
    END $$;
  `)

  // Create test_executions table to store test run results
  await pool.query(`
    CREATE TABLE IF NOT EXISTS test_executions (
      id VARCHAR(255) PRIMARY KEY,
      test_case_id VARCHAR(255) NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
      status VARCHAR(50) NOT NULL,
      started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      completed_at TIMESTAMP WITH TIME ZONE,
      duration_ms INTEGER,
      total_steps INTEGER NOT NULL,
      passed_steps INTEGER DEFAULT 0,
      failed_steps INTEGER DEFAULT 0,
      error_message TEXT,
      step_results JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `)

  // Create indexes for test_executions
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_test_executions_test_case_id ON test_executions(test_case_id)
  `)
  
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_test_executions_started_at ON test_executions(started_at DESC)
  `)
  
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_test_executions_status ON test_executions(status)
  `)
}

// Close the pool (useful for cleanup)
export async function closePool() {
  if (pool) {
    await pool.end()
    pool = null
  }
}

