# Sentry - AI-Powered Log Anomaly Detection

## Overview

Sentry is a TypeScript-based web application for AI-powered security log anomaly detection. It analyzes security logs, specifically Zscaler NSS feed format, using OpenAI's GPT-4o model to identify threats. The system handles log upload, processing, anomaly detection, risk scoring, and dashboard analytics with user authentication. Sentry aims to provide a comprehensive solution for proactive security threat identification with high confidence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript.
- **Styling**: Tailwind CSS with Shadcn UI.
- **Routing**: Wouter.
- **State Management**: TanStack React Query for server state.
- **Form Handling**: React Hook Form with Zod validation.
- **UI/UX**: Features color-coded badges, icons, and a consistent design across the application. Google SSO integration with a beautiful landing page, authentication header, and avatar support.

### Backend Architecture
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript.
- **Authentication**: Passport.js with local strategy and session-based authentication (HTTP-only cookies, secure flags). Google SSO integrated via Replit's OpenID Connect provider.
- **Session Management**: Express-session with PostgreSQL session store.
- **Rate Limiting**: Custom in-memory rate limiter per user (e.g., 10 file uploads/15 min, 20 AI analysis requests/5 min, 100 general API calls/15 min, 5 login attempts/15 min).
- **File Processing**: Enhanced Multer middleware with security validation (max 50MB, .txt/.log types, filename restrictions).
- **Error Handling**: Production-ready middleware with structured logging and user-friendly messages.
- **API Structure**: RESTful endpoints with comprehensive rate limiting and validation.
- **Security**: Password hashing using scrypt, Zod schemas for API validation, multi-layer file validation.
- **Concurrency Protection**: Limits concurrent file processing to 3 files per user to prevent system overload.

### Data Storage Architecture
- **Primary Database**: PostgreSQL with Neon serverless driver.
- **ORM**: Drizzle ORM for type-safe operations.
- **Schema Design**: Tables for Users, LogFiles, Anomalies, and ProcessingJobs.
- **Session Storage**: PostgreSQL-based.

### AI/ML Integration
- **Multi-Modal Analysis**: Supports traditional, advanced ML, and AI-powered detection.
- **Primary AI Models**: OpenAI GPT-4o and Google Gemini for log analysis.
- **Advanced ML System**: Multi-model ensemble (statistical, behavioral, network, time series, ensemble learning).
- **Traditional ML System**: Rule-based detection and pattern matching.
- **Skip LLM Option**: Allows analysis without external AI services.
- **Log Processing**: Specialized Zscaler NSS feed parser (comma/tab-separated), validation, asynchronous processing, and raw log data preservation.
- **Batch Processing**: Increased batch processing to 100 logs per batch for AI analysis, reducing API calls and processing time.
- **Risk Scoring**: 0-10 scale risk assessment with 75-95% confidence levels.
- **Detection Methods**: Rule-based, statistical modeling, ML ensemble, AI-powered.

## External Dependencies

### Core Infrastructure
- **Database**: PostgreSQL (Neon serverless deployment).
- **AI Service**: OpenAI API.

### Development and Build Tools
- **Build System**: Vite.
- **TypeScript**: Full support.
- **Package Manager**: npm.

### Third-Party Services Integration
- **OpenAI API**: Primary AI service.
- **Neon Database**: Serverless PostgreSQL provider.
- **Replit**: Development environment integration (specific plugins/banners, OpenID Connect).

### UI and Styling Libraries
- **Radix UI**: Headless UI components.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.

### Authentication and Security
- **Passport.js**: Authentication middleware.
- **Express Session**: Session management.
- **Crypto**: Node.js module for password hashing.