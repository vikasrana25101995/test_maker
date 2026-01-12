# TestMaker

A Next.js application that generates comprehensive test cases from natural language statements using AI.

## Features

- 🤖 AI-powered test case generation
- 📝 Support for multiple test frameworks (Jest, Mocha, Vitest)
- 💻 Support for multiple programming languages (TypeScript, JavaScript, Python, Java)
- 🎨 Modern, responsive UI with dark mode support
- 📋 Copy generated test code to clipboard
- ⚡ Fast and efficient

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- PostgreSQL database (local or cloud-hosted)
- OpenAI API key (optional, for AI-powered generation)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd TestMakeer
```

2. Install dependencies:
```bash
npm install
```

3. Set up PostgreSQL database:
   - Install PostgreSQL locally, or use a cloud service like Supabase, Railway, or Neon
   - Create a new database for the application:
     ```bash
     # If using local PostgreSQL:
     createdb testmaker
     # Or using psql:
     psql -U postgres
     CREATE DATABASE testmaker;
     ```

4. Set up environment variables:
Create a `.env.local` file in the root directory:
```env
# OpenAI API Key (optional - for AI-powered generation)
OPENAI_API_KEY=your_openai_api_key_here

# PostgreSQL Database Connection
# Format: postgresql://username:password@host:port/database
# Example for local: postgresql://postgres:password@localhost:5432/testmaker
# Example for Supabase: postgresql://user:pass@host:5432/dbname?sslmode=require
DATABASE_URL=postgresql://postgres:password@localhost:5432/testmaker
```

5. Initialize the database:
```bash
npm run db:init
```

This will create the necessary tables in your PostgreSQL database.

Note: The app will work without an API key, but will use a basic fallback test case generator.

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Select your preferred test framework (Jest, Mocha, or Vitest)
2. Select your programming language (TypeScript, JavaScript, Python, or Java)
3. Enter a statement or description of what you want to test
4. Click "Generate Test Cases"
5. Review the generated test cases and copy the code as needed

## Example Statements

- "User should be able to login with valid credentials and receive a JWT token"
- "Shopping cart should calculate total price correctly including tax"
- "API endpoint should return 404 when resource is not found"
- "Form validation should prevent submission with empty required fields"

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **PostgreSQL** - Database for storing test cases
- **OpenAI API** - AI-powered test case generation

## Project Structure

```
TestMakeer/
├── app/
│   ├── api/
│   │   └── generate-tests/
│   │       └── route.ts      # API endpoint for test generation
│   ├── globals.css            # Global styles
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Main page
├── components/
│   └── TestCaseGenerator.tsx  # Main component
├── package.json
├── tsconfig.json
└── README.md
```

## Deployment

The application can be deployed to various platforms. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy Options

**Vercel** (Recommended):
1. Push code to GitHub
2. Import project on [vercel.com](https://vercel.com)
3. Add environment variables
4. Deploy

**Docker**:
```bash
docker build -t testmaker .
docker run -p 3000:3000 \
  -e DATABASE_URL="your_database_url" \
  -e OPENAI_API_KEY="your_key" \
  testmaker
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for more deployment options (Railway, Render, AWS, GCP, etc.).

## License

MIT

