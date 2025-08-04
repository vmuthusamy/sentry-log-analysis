# MacBook Local Development Setup

## Prerequisites

### 1. Install Required Software
```bash
# Install Node.js (18+ required)
# Visit https://nodejs.org or use Homebrew:
brew install node

# Install PostgreSQL
brew install postgresql@14
brew services start postgresql@14

# Verify installations
node --version  # Should be 18+
npm --version   # Should be 8+
psql --version  # Should be 14+
```

### 2. Clone and Setup Project
```bash
# Clone the repository
git clone https://github.com/vmuthusamy/sentry-log-analysis.git
cd sentry-log-analysis

# Install dependencies
npm install
```

## Database Setup

### 3. Create Local PostgreSQL Database
```bash
# Create database user
createuser -s sentry_user

# Create database
createdb -O sentry_user sentry_development

# Set password (optional)
psql -c "ALTER USER sentry_user WITH PASSWORD 'your_password';"
```

### 4. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your local settings:
```

**Required `.env` variables for local development:**
```bash
# Database - Update with your local PostgreSQL details
DATABASE_URL=postgresql://sentry_user:your_password@localhost:5432/sentry_development

# Session Security - Generate a random 32+ character string
SESSION_SECRET=your_super_secure_random_session_secret_here_min_32_chars

# Replit Auth - REQUIRED for OAuth (even locally)
REPL_ID=your_repl_id
REPLIT_DOMAINS=localhost:5000
ISSUER_URL=https://replit.com/oidc

# Optional - Development settings
NODE_ENV=development
PORT=5000
```

### 5. Database Schema Setup
```bash
# Push database schema
npm run db:push

# This will create all required tables:
# - users, sessions, log_files, anomalies, processing_jobs, etc.
```

## Authentication Setup (Critical)

### 6. Replit OAuth Configuration
**⚠️ IMPORTANT**: This app uses Replit's OAuth for authentication. Even for local development, you need:

1. **Get Replit OAuth credentials**:
   - Go to your Replit account settings
   - Generate OAuth app with callback URL: `http://localhost:5000/api/callback`
   - Copy the REPL_ID

2. **Add to `.env`**:
   ```bash
   REPL_ID=your_actual_repl_id_here
   REPLIT_DOMAINS=localhost:5000
   ```

**Without valid Replit OAuth setup, authentication will not work locally.**

## Running the Application

### 7. Start Development Server
```bash
# Start the application
npm run dev

# Application will be available at:
# http://localhost:5000
```

### 8. Verify Setup
Visit `http://localhost:5000` and check:
- ✅ Landing page loads
- ✅ "Login with Replit" button works
- ✅ Health check: `http://localhost:5000/api/health`

## Troubleshooting

### Common Issues:

1. **Database Connection Error**:
   ```bash
   # Check PostgreSQL is running
   brew services list | grep postgresql
   
   # Start PostgreSQL if not running
   brew services start postgresql@14
   
   # Verify DATABASE_URL in .env is correct
   ```

2. **Authentication Not Working**:
   - Verify REPL_ID is correct in `.env`
   - Ensure REPLIT_DOMAINS includes your local URL
   - Check OAuth app callback URL is set to `http://localhost:5000/api/callback`

3. **Port Already in Use**:
   ```bash
   # Kill process on port 5000
   lsof -ti:5000 | xargs kill -9
   
   # Or change PORT in .env
   PORT=3000
   ```

4. **Missing Dependencies**:
   ```bash
   # Clear and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

## Development Workflow

### File Structure Overview:
```
├── client/           # React frontend
├── server/           # Express.js backend
├── shared/           # Shared TypeScript types/schemas
├── uploads/          # Local file storage
└── .env             # Your local environment variables
```

### Available Scripts:
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run db:push      # Update database schema
npm run check        # TypeScript type checking
```

## Next Steps

Once setup is complete:
1. Create a test account via OAuth
2. Upload sample log files from `example-logs/`
3. Test anomaly detection features
4. Explore webhook integrations

**Your local development environment is ready! 🚀**