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

  // --- NextAuth Tables ---

  // Users table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name VARCHAR(255),
      email VARCHAR(255) UNIQUE,
      emailVerified TIMESTAMP WITH TIME ZONE,
      image TEXT,
      password TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `)

  // Accounts table (for OAuth providers if needed later, but good to have)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS accounts (
      id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      userId VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(255) NOT NULL,
      provider VARCHAR(255) NOT NULL,
      providerAccountId VARCHAR(255) NOT NULL,
      refresh_token TEXT,
      access_token TEXT,
      expires_at BIGINT,
      token_type VARCHAR(255),
      scope TEXT,
      id_token TEXT,
      session_state TEXT,
      
      UNIQUE(provider, providerAccountId)
    )
  `)

  // Sessions table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      sessionToken VARCHAR(255) UNIQUE NOT NULL,
      userId VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires TIMESTAMP WITH TIME ZONE NOT NULL
    )
  `)

  // Verification Tokens table (for passwordless/email magic links)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS verification_tokens (
      identifier VARCHAR(255) NOT NULL,
      token VARCHAR(255) NOT NULL,
      expires TIMESTAMP WITH TIME ZONE NOT NULL,
      
      UNIQUE(identifier, token)
    )
  `)

  // Add user_id column to test_cases if it doesn't exist
  await pool.query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'test_cases' AND column_name = 'user_id'
      ) THEN
        ALTER TABLE test_cases ADD COLUMN user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE;
      END IF;
    END $$;
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_test_cases_user_id ON test_cases(user_id)
  `)

  // Add type column to test_cases if it doesn't exist (WEB or API)
  await pool.query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'test_cases' AND column_name = 'type'
      ) THEN
        ALTER TABLE test_cases ADD COLUMN type VARCHAR(50) DEFAULT 'WEB';
      END IF;
    END $$;
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_test_cases_type ON test_cases(type)
  `)
}

// Close the pool (useful for cleanup)
export async function closePool() {
  if (pool) {
    await pool.end()
    pool = null
  }
}

