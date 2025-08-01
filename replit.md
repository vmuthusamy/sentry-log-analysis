# LogGuard - AI-Powered Log Anomaly Detection

## Overview

LogGuard is a comprehensive TypeScript-based web application designed for AI-powered security log anomaly detection. The system specializes in analyzing security logs (particularly Zscaler NSS feed format) using OpenAI's GPT-4o model to identify potential threats and suspicious activities. The application provides a complete workflow from log upload and processing to anomaly detection, risk scoring, and dashboard analytics with user authentication and session management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript for type safety and modern component development
- **Styling**: Tailwind CSS for utility-first styling with Shadcn UI component library for consistent, accessible UI components
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management, caching, and data fetching
- **Form Handling**: React Hook Form with Zod validation for type-safe form management

### Backend Architecture
- **Runtime**: Node.js with Express.js framework for RESTful API development
- **Language**: TypeScript throughout for type safety and better developer experience
- **Authentication**: Passport.js with local strategy for user authentication and session-based auth
- **Session Management**: Express-session with PostgreSQL session store for persistent sessions
- **Rate Limiting**: Custom in-memory rate limiter with automatic cleanup and per-user tracking
- **File Processing**: Enhanced Multer middleware with comprehensive security validation
  - File size limits (50MB max)
  - File type and MIME type validation
  - Filename length and character restrictions
  - Automatic cleanup on validation failures
- **Error Handling**: Production-ready error handling middleware with structured logging
- **API Structure**: RESTful endpoints with comprehensive rate limiting and validation
- **Analysis Endpoints**: 
  - `/api/process-logs/:id` - AI-powered analysis with configurable models
  - `/api/analyze-advanced-ml/:id` - Advanced ML analysis with multi-model ensemble
  - `/api/analyze-traditional/:id` - Traditional ML analysis (no LLM required)
  - Support for hybrid, advanced ML, and LLM-free detection modes

### Data Storage Architecture
- **Primary Database**: PostgreSQL with Neon serverless driver for scalable cloud deployment
- **ORM**: Drizzle ORM for type-safe database operations and schema management
- **Schema Design**: 
  - Users table for authentication and user management
  - LogFiles table for tracking uploaded files and processing status
  - Anomalies table for storing detected threats with risk scores and AI analysis
  - ProcessingJobs table for tracking background processing tasks
- **Session Storage**: PostgreSQL-based session store using connect-pg-simple

### AI/ML Integration
- **Multi-Modal Analysis**: Comprehensive approach supporting traditional, advanced ML, and AI-powered detection
- **Primary AI Models**: OpenAI GPT-4o and Google Gemini for advanced log analysis
- **Advanced ML System**: Multi-model ensemble with statistical analysis, behavioral profiling, network analysis, time series detection, and ensemble learning
- **Traditional ML System**: Rule-based detection with pattern matching and statistical analysis (no LLM required)
- **Skip LLM Option**: Complete traditional or advanced ML analysis without external AI services
- **Advanced ML Capabilities**:
  - Z-score anomaly detection with isolation forest algorithms
  - User behavior profiling and deviation analysis 
  - Network scanning detection and traffic pattern analysis
  - Time series spike detection with statistical modeling
  - Ensemble learning with weighted consensus across multiple models
  - Sequence anomaly detection with sliding window analysis
- **Traditional Detection**: Cryptocurrency mining, Tor/Dark web access, blocked traffic analysis, suspicious categories
- **Risk Scoring**: Comprehensive 0-10 scale risk assessment with 75-95% confidence levels
- **Detection Methods**: Rule-based triggers, statistical modeling, machine learning ensemble, and AI-powered analysis

### Log Processing Pipeline
- **Parser**: Specialized Zscaler NSS feed format parser supporting both comma and tab-separated formats
- **Validation**: File type validation, size limits (100MB), and format verification
- **Processing**: Asynchronous log processing with progress tracking and error handling
- **Storage**: Raw log data preservation with structured metadata extraction

### Security Architecture
- **Authentication**: Local strategy with secure password hashing using scrypt
- **Session Security**: HTTP-only cookies with secure flags in production
- **Rate Limiting**: Comprehensive rate limiting system with in-memory storage
  - File uploads: 10 per 15 minutes per user
  - AI analysis requests: 20 per 5 minutes (resource-intensive operations)
  - General API calls: 100 per 15 minutes per user
  - Login attempts: 5 per 15 minutes (brute force protection)
- **File Security**: Multi-layer file validation and size protection
  - Maximum file size: 50MB (protection against 1GB+ uploads)
  - Maximum log entries: 100,000 per file (performance protection)
  - File type validation: Only .txt and .log files with MIME type checking
  - Filename sanitization: Alphanumeric characters and safe symbols only
  - Automatic file cleanup on validation failures
- **Input Validation**: Zod schemas for API request validation and type checking
- **Error Handling**: Comprehensive error handling with user-friendly messages
  - Custom error classes for different failure types
  - Detailed logging for debugging while hiding sensitive information in production
  - Graceful degradation with helpful user guidance

## External Dependencies

### Core Infrastructure
- **Database**: PostgreSQL (configured for Neon serverless deployment)
- **AI Service**: OpenAI API with GPT-4o model access
- **Session Storage**: PostgreSQL-based session persistence

### Development and Build Tools
- **Build System**: Vite for fast development and optimized production builds
- **TypeScript**: Full TypeScript support with strict configuration
- **Package Manager**: npm with lock file for dependency consistency

### Third-Party Services Integration
- **OpenAI API**: Primary AI service for log analysis and anomaly detection
- **Neon Database**: Serverless PostgreSQL provider for cloud deployment
- **Replit**: Development environment integration with specific plugins and banners

### UI and Styling Libraries
- **Radix UI**: Headless UI components for accessibility and consistency
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Lucide React**: Icon library for consistent iconography

### Authentication and Security
- **Passport.js**: Authentication middleware with local strategy
- **Express Session**: Session management with PostgreSQL store
- **Crypto**: Node.js crypto module for secure password hashing

## Repository and Deployment

### GitHub Repository
- **Repository Name**: LogGuard - AI-Powered Log Anomaly Detection System
- **Documentation**: Comprehensive README.md with installation and usage instructions
- **Example Data**: Sample Zscaler NSS log files in example-logs/ directory
- **Deployment Guide**: Detailed DEPLOYMENT.md for GCP, Azure, and AWS deployment
- **Contributing Guidelines**: CONTRIBUTING.md for development workflow and standards
- **License**: MIT License for open-source distribution

### Production Security Features
- **Rate Limiting**: Enterprise-grade rate limiting to prevent abuse and resource exhaustion
- **File Upload Security**: Multi-layer validation to prevent malicious file uploads
- **Error Handling**: Production-ready error handling with security-conscious information disclosure
- **Input Validation**: Comprehensive input sanitization and validation at all entry points
- **Resource Protection**: Memory and processing limits to prevent system overload

### Deployment Ready Features
- **Multi-cloud Support**: Ready for deployment on GCP Cloud Run, Azure Container Instances, or AWS ECS
- **Production Configuration**: Environment variables, security headers, and scaling configurations
- **Database Migration**: Drizzle ORM schema management and migration support
- **Monitoring**: Health check endpoints and structured logging for production monitoring
- **Security Hardening**: Rate limiting, file validation, and comprehensive error handling
- **Metrics Tracking**: Real-time success/failure metrics with performance monitoring

## Recent Updates and Bug Fixes

### Processing Concurrency Protection (January 31, 2025)
- **Critical Performance Protection**: Implemented 3-file concurrent processing limit per user to prevent system overload
- **Resource Management**: Added `getActiveProcessingJobsCount()` method to track active processing jobs in real-time
- **Analysis Time Tracking**: Enhanced all detection methods (Traditional ML, Advanced ML, AI) with comprehensive timing measurement
- **Database Schema Updates**: Added analysis_time_ms, detection_method, anomalies_found, log_entries_processed columns to processing_jobs table
- **Enhanced Error Handling**: Clear user-friendly messages when processing limits are reached (HTTP 429 responses)
- **Processing Job Lifecycle**: Proper job creation with "processing" status, then completion with results and timing data
- **Frontend Integration**: All analysis buttons now handle processing limit errors with helpful user guidance

### Analysis Time and Performance Features
- **Precise Timing**: Millisecond-accurate analysis time tracking from start to completion
- **Multiple Formats**: Returns both analysisTimeMs (exact) and analysisTimeSec (rounded to 2 decimal places)
- **Processing Metadata**: Complete tracking of anomalies found, log entries processed, and detection methods used
- **Performance Metrics**: Integration with metrics service for success/failure tracking with timing data
- **Concurrency Safety**: Prevents system resource exhaustion from multiple simultaneous file uploads

### Cross-User Data Isolation Bug Fix (January 31, 2025)
- **Critical Issue Resolved**: Fixed cross-user data contamination in metrics and statistics where new users saw cached data from previous users
- **Enhanced Query Caching**: Updated React Query configuration to clear all cached data on login/logout/register operations  
- **Stale Time Reduction**: Changed from infinite caching (staleTime: Infinity) to fresh data requests (staleTime: 0) to prevent stale cross-user data
- **Session Isolation**: Implemented comprehensive cache clearing in authentication mutations to ensure complete user data separation
- **Debug Logging**: Added user ID tracking in stats endpoint for verification and monitoring
- **Data Security**: Each user now sees only their own logs, anomalies, and statistics without any cross-contamination

### Frontend Cache Management Improvements
- Login: Clears all cached data before setting new user data
- Registration: Clears all cached data before setting new user data  
- Logout: Clears all cached data after logout
- Reduced cache lifetime (gcTime: 2 minutes) to prevent persistent cross-user data

This comprehensive update ensures system stability under load while providing detailed performance tracking and maintaining complete data privacy between user sessions.

### Detection Method Category Display (January 31, 2025)
- **User-Friendly Categories**: Added clear detection method categories (Traditional, Advanced, GenAI) to analysis results display
- **Visual Enhancement**: Color-coded badges with icons for each detection method:
  - Traditional: Blue badges with Database icon for rule-based detection methods
  - Advanced: Purple badges with BarChart3 icon for ML ensemble and statistical analysis  
  - GenAI: Green badges with Brain icon for AI-powered analysis (OpenAI/Gemini)
- **Category Mapping**: Automatic conversion from technical method names to user-friendly categories
  - traditional_ml/traditional → Traditional
  - advanced_ml → Advanced  
  - openai/gemini/ai → GenAI
- **Enhanced Export**: CSV exports now include detectionCategory column with clear category names
- **UI Consistency**: Standardized color scheme and iconography across detection method displays

### Google Authentication Integration (January 31, 2025)
- **OAuth Implementation**: Complete Google SSO integration using Replit's OpenID Connect provider
- **Authentication Flow**: Seamless login/logout flow with automatic session management
- **User Interface Updates**:
  - Beautiful landing page for unauthenticated users with Google sign-in
  - Authentication header with user profile display and dropdown menu
  - Avatar support with profile images and initials fallback
  - Clean logout flow redirecting through Replit's OpenID endpoint
- **Database Schema Migration**: Updated users table for OAuth fields (firstName, lastName, profileImageUrl)
- **Session Management**: PostgreSQL-based session storage with automatic cleanup
- **Security Features**: 
  - Token refresh handling for expired sessions
  - Protected route authentication middleware
  - Session persistence across browser sessions
- **Frontend Architecture**: 
  - Removed legacy username/password authentication 
  - Integrated useAuth hook for authentication state management
  - Conditional routing based on authentication status
- **Backend Integration**: 
  - Complete Replit Auth setup with passport.js strategies
  - User upsert functionality for OAuth user creation/updates
  - Auth middleware for protected API endpoints