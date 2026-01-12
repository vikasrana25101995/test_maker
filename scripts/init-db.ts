/**
 * Database initialization script
 * Run this once to set up the database schema
 * 
 * Usage: npm run db:init
 */

// Load environment variables from .env.local
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') })

import { initDatabase, closePool } from '../lib/db'

async function main() {
  try {
    console.log('Initializing database...')
    await initDatabase()
    console.log('✅ Database initialized successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error initializing database:', error)
    process.exit(1)
  } finally {
    await closePool()
  }
}

main()

