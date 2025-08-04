# Sentry - AI-Powered Log Anomaly Detection

## Overview
Sentry is a TypeScript-based web application designed for AI-powered security log anomaly detection. It specializes in analyzing security logs, particularly in Zscaler NSS feed format, utilizing large language models like OpenAI's GPT-4o to identify potential threats. The system provides a comprehensive solution covering log upload, processing, anomaly detection, risk scoring, and dashboard analytics, all supported by robust user authentication. Sentry's core purpose is to deliver proactive and high-confidence identification of security threats.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with React and TypeScript, using Wouter for routing and TanStack React Query for server state management. Styling is handled by Tailwind CSS with Shadcn UI components. Form handling uses React Hook Form with Zod for validation. The UI/UX features color-coded badges, icons, and a consistent design, including Google SSO integration with a dedicated landing page, authentication header, and avatar support.

### Backend Architecture
The backend is developed with Node.js and Express.js in TypeScript. Authentication is managed via Passport.js using a local strategy and session-based authentication (HTTP-only, secure cookies), with Google SSO integrated via Replit's OpenID Connect provider. Session management uses express-session with a PostgreSQL session store. Custom in-memory rate limiting is implemented per user for various actions (e.g., file uploads, AI analysis requests, general API calls, login attempts). File processing leverages enhanced Multer middleware with security validation (max 50MB, .txt/.log types, filename restrictions). The API is RESTful with comprehensive rate limiting and validation. Security measures include password hashing using scrypt, Zod schemas for API validation, and multi-layer file validation. Concurrency is limited to 3 concurrent file processing jobs per user.

### Data Storage Architecture
The primary database is PostgreSQL, deployed via Neon serverless driver with local development database provisioning support. Drizzle ORM is used for type-safe operations. The schema includes tables for Users, LogFiles, Anomalies, and ProcessingJobs, with session data also stored in PostgreSQL. Local development environment configured with PostgreSQL database and automated schema migration.

### AI/ML Integration
The system supports multi-modal analysis, including traditional, advanced ML, and AI-powered detection. Primary AI models are OpenAI GPT-4o and Google Gemini for log analysis. An advanced ML system incorporates a multi-model ensemble (statistical, behavioral, network, time series, ensemble learning), alongside a traditional rule-based detection and pattern matching system. An option to skip LLM analysis is available. Log processing includes a specialized Zscaler NSS feed parser, validation, asynchronous processing, and raw log data preservation. Batch processing for AI analysis is increased to 100 logs per batch. Risk scoring is on a 0-10 scale with 75-95% confidence levels, using detection methods such as rule-based, statistical modeling, ML ensemble, and AI-powered approaches.

### Webhook Integration System
Webhook integration is designed for external automation, primarily with Zapier but supporting other providers like Make and custom endpoints. It includes configurable trigger conditions (risk score, anomaly types, priority, keywords) to mitigate alert fatigue. Webhooks automatically trigger when anomalies match analyst-defined criteria, sending rich JSON payloads with anomaly details, log context, user information, and metadata. The system provides built-in webhook testing, delivery confirmation, and failure handling, and is designed for easy extension to other automation platforms.

## External Dependencies

### Core Infrastructure
- **Database**: PostgreSQL (Neon serverless deployment).
- **AI Service**: OpenAI API.

### Development and Build Tools
- **Build System**: Vite.
- **Package Manager**: npm.

### Third-Party Services Integration
- **OpenAI API**: Primary AI service.
- **Neon Database**: Serverless PostgreSQL provider.
- **Replit**: Development environment integration.

### UI and Styling Libraries
- **Radix UI**: Headless UI components.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.

### Authentication and Security
- **Passport.js**: Authentication middleware.
- **Express Session**: Session management.
- **Crypto**: Node.js module for password hashing.