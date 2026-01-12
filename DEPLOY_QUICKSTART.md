# Quick Deployment Guide

This is a quick reference for deploying TestMaker. For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Prerequisites

- PostgreSQL database (required)
- OpenAI API key (optional)
- Node.js 18+ (for local builds)

## Required Environment Variables

```env
DATABASE_URL=postgresql://user:pass@host:port/database
OPENAI_API_KEY=your_key_here  # Optional
NEXTAUTH_URL=https://your-domain.com  # Optional (if using auth)
NEXTAUTH_SECRET=your_secret_here  # Optional (if using auth)
```

## Option 1: Vercel (Fastest - Recommended)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) and import repository
3. Add environment variables in project settings
4. Deploy!
5. Run database initialization (connect to DB and run SQL from `lib/db.ts`)

## Option 2: Docker

```bash
# Build
docker build -t testmaker .

# Run
docker run -p 3000:3000 \
  -e DATABASE_URL="your_database_url" \
  -e OPENAI_API_KEY="your_key" \
  testmaker

# Or use docker-compose
docker-compose up -d
```

## Option 3: Railway

1. Go to [railway.app](https://railway.app)
2. New Project → Add PostgreSQL + Add GitHub Repo
3. Set environment variables
4. Deploy

## Database Initialization

After deployment, initialize the database:

```bash
# If you have SSH access
npm run db:init

# Or connect to database directly and run SQL from lib/db.ts
# Or use a migration service
```

## Build Test

Test your build locally:

```bash
npm run build
npm start
```

## Need Help?

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions for all platforms.
