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
- **File Processing**: Multer middleware for handling file uploads with validation for .txt and .log files
- **API Structure**: RESTful endpoints for user management, file uploads, log processing, and anomaly retrieval

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
- **Primary Model**: OpenAI GPT-4o for advanced log analysis and anomaly detection
- **Analysis Approach**: Individual log entry analysis with pattern recognition for:
  - Unusual login attempts and geographic anomalies
  - Suspicious file access patterns and privilege escalations
  - Abnormal traffic volumes and destinations
  - Known attack signatures and threat indicators
  - Time-based anomalies and user behavior deviations
- **Risk Scoring**: Comprehensive 0-10 scale risk assessment with confidence levels
- **Response Format**: Structured JSON responses with anomaly types, descriptions, and recommendations

### Log Processing Pipeline
- **Parser**: Specialized Zscaler NSS feed format parser supporting both comma and tab-separated formats
- **Validation**: File type validation, size limits (100MB), and format verification
- **Processing**: Asynchronous log processing with progress tracking and error handling
- **Storage**: Raw log data preservation with structured metadata extraction

### Security Architecture
- **Authentication**: Local strategy with secure password hashing using scrypt
- **Session Security**: HTTP-only cookies with secure flags in production
- **Input Validation**: Zod schemas for API request validation and type checking
- **File Security**: Restricted file upload types and size limits with temporary file storage

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

### Deployment Ready Features
- **Multi-cloud Support**: Ready for deployment on GCP Cloud Run, Azure Container Instances, or AWS ECS
- **Production Configuration**: Environment variables, security headers, and scaling configurations
- **Database Migration**: Drizzle ORM schema management and migration support
- **Monitoring**: Health check endpoints and structured logging for production monitoring