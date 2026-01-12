# Deployment Guide

This guide covers deploying the TestMaker application to various platforms.

## Prerequisites

- PostgreSQL database (required)
- OpenAI API key (optional, for AI-powered generation)
- Node.js 18+ installed (for local builds)

## Environment Variables

Before deploying, ensure you have the following environment variables configured:

```env
# Required: PostgreSQL Database Connection
DATABASE_URL=postgresql://username:password@host:port/database

# Optional: OpenAI API Key (for AI-powered test generation)
OPENAI_API_KEY=your_openai_api_key_here

# Optional: NextAuth.js configuration (if using authentication)
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your_secret_key_here
```

## Deployment Options

### 1. Vercel (Recommended for Next.js)

Vercel is the easiest way to deploy a Next.js application.

#### Steps:

1. **Install Vercel CLI** (optional, for local deployment):
   ```bash
   npm i -g vercel
   ```

2. **Deploy via Vercel Dashboard**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add environment variables in the project settings
   - Deploy!

3. **Deploy via CLI**:
   ```bash
   vercel
   ```
   Follow the prompts to link your project and set environment variables.

4. **Configure Environment Variables**:
   In your Vercel project settings, add:
   - `DATABASE_URL` - Your PostgreSQL connection string
   - `OPENAI_API_KEY` - (Optional) Your OpenAI API key
   - `NEXTAUTH_URL` - Your Vercel deployment URL
   - `NEXTAUTH_SECRET` - A random secret (generate with `openssl rand -base64 32`)

5. **Initialize Database**:
   After deployment, run the database initialization:
   ```bash
   # SSH into your deployment or use Vercel CLI
   vercel env pull
   npm run db:init
   ```
   
   Or connect to your database directly and run the initialization script.

#### Database Setup for Vercel:

Since Vercel doesn't support running scripts directly, you'll need to:
- Option 1: Use a migration tool like Prisma or run SQL manually
- Option 2: Create a one-time API route to initialize the database
- Option 3: Use a database migration service

### 2. Docker Deployment

Deploy using Docker for containerized environments (Docker, Kubernetes, AWS ECS, etc.).

#### Build Docker Image:

```bash
# Set DOCKER_BUILD env var for standalone output
export DOCKER_BUILD=true

# Build the image
docker build -t testmaker:latest .

# Run the container
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:port/db" \
  -e OPENAI_API_KEY="your_key" \
  testmaker:latest
```

#### Using Docker Compose:

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://testmaker:password@db:5432/testmaker
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - NEXTAUTH_URL=http://localhost:3000
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=testmaker
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=testmaker
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

Run with:
```bash
docker-compose up -d
# Initialize database
docker-compose exec app npm run db:init
```

### 3. Railway

Railway provides easy PostgreSQL + Node.js deployments.

#### Steps:

1. Go to [railway.app](https://railway.app)
2. Create a new project
3. Add a PostgreSQL database
4. Add your Next.js app
5. Connect your GitHub repository
6. Set environment variables:
   - `DATABASE_URL` (automatically set from PostgreSQL service)
   - `OPENAI_API_KEY`
   - `NEXTAUTH_URL` (your Railway app URL)
   - `NEXTAUTH_SECRET`

7. Deploy and initialize database:
   ```bash
   # Connect to Railway CLI
   railway link
   railway run npm run db:init
   ```

### 4. Render

Render provides simple deployment for Next.js apps.

#### Steps:

1. Go to [render.com](https://render.com)
2. Create a new Web Service
3. Connect your GitHub repository
4. Configure:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
5. Add environment variables
6. Add a PostgreSQL database
7. Link the database to your web service
8. Deploy

### 5. AWS (Elastic Beanstalk, ECS, or EC2)

#### Using AWS Elastic Beanstalk:

1. Install EB CLI:
   ```bash
   pip install awsebcli
   ```

2. Initialize EB:
   ```bash
   eb init
   ```

3. Create environment:
   ```bash
   eb create testmaker-env
   ```

4. Set environment variables:
   ```bash
   eb setenv DATABASE_URL="your_database_url" OPENAI_API_KEY="your_key"
   ```

5. Deploy:
   ```bash
   eb deploy
   ```

#### Using AWS ECS with Docker:

1. Build and push Docker image to ECR
2. Create ECS task definition
3. Set environment variables in task definition
4. Create and deploy ECS service

### 6. Google Cloud Platform (Cloud Run)

#### Steps:

1. Build Docker image:
   ```bash
   export DOCKER_BUILD=true
   docker build -t gcr.io/PROJECT_ID/testmaker .
   ```

2. Push to GCR:
   ```bash
   gcloud auth configure-docker
   docker push gcr.io/PROJECT_ID/testmaker
   ```

3. Deploy to Cloud Run:
   ```bash
   gcloud run deploy testmaker \
     --image gcr.io/PROJECT_ID/testmaker \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars DATABASE_URL="your_database_url"
   ```

## Post-Deployment Checklist

After deploying, ensure:

- [ ] Database is initialized (`npm run db:init`)
- [ ] Environment variables are set correctly
- [ ] Application builds successfully
- [ ] Database connection is working
- [ ] API endpoints are accessible
- [ ] Static assets are loading correctly

## Database Migration

If you need to run database migrations after deployment, you can:

1. **SSH into your deployment** (if supported) and run:
   ```bash
   npm run db:init
   ```

2. **Connect directly to your database** and run the SQL from `lib/db.ts`

3. **Create a migration API route** (one-time use):
   ```typescript
   // app/api/migrate/route.ts
   import { initDatabase } from '@/lib/db'
   import { NextResponse } from 'next/server'
   
   export async function POST(request: NextRequest) {
     const authHeader = request.headers.get('authorization')
     if (authHeader !== `Bearer ${process.env.MIGRATION_TOKEN}`) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
     }
     
     await initDatabase()
     return NextResponse.json({ success: true })
   }
   ```

## Troubleshooting

### Build Fails

- Check Node.js version (requires 18+)
- Verify all dependencies are in `package.json`
- Check for TypeScript errors: `npm run lint`

### Database Connection Issues

- Verify `DATABASE_URL` format
- Check database firewall rules
- Ensure SSL mode is correct for production databases
- Test connection from deployment environment

### Environment Variables Not Working

- Restart the deployment after setting variables
- Check variable names (case-sensitive)
- Verify no trailing spaces in values

### Performance Issues

- Enable Next.js caching
- Use a connection pooler (PgBouncer) for PostgreSQL
- Enable CDN for static assets
- Monitor database query performance

## Security Considerations

1. **Never commit `.env` files** to version control
2. **Use strong secrets** for production (generate with `openssl rand -base64 32`)
3. **Enable HTTPS** for all deployments
4. **Restrict database access** to deployment IPs only
5. **Use environment-specific variables** (different values for dev/staging/prod)
6. **Enable database SSL** in production

## Monitoring

Consider setting up:
- Application performance monitoring (APM)
- Error tracking (Sentry, LogRocket)
- Database monitoring
- Uptime monitoring
- Log aggregation

## Support

For issues or questions:
- Check application logs
- Review database connection logs
- Verify environment variables
- Test locally with production-like setup
