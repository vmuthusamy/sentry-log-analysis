# Sentry - AI-Powered Security Log Analysis Platform

A comprehensive TypeScript-based web application for AI-powered security log anomaly detection. Sentry specializes in analyzing security logs, particularly Zscaler NSS feed format, using advanced AI models to identify threats and anomalies with high accuracy and confidence.

## 🚀 Features

### Core Analytics Features
- **Multi-Method Threat Detection**: Traditional ML, Advanced ML ensemble, and AI-powered analysis
- **Real-time Anomaly Detection**: Intelligent threat identification with 0-10 risk scoring
- **SOC Analyst Workflow**: Enhanced anomaly management with status tracking, priorities, and notes
- **Webhook Automation**: Zapier/Make integration for automated threat response workflows
- **Dashboard Analytics**: Comprehensive system monitoring and user activity tracking

### Security & Authentication
- **OAuth Integration**: Secure Replit authentication with Google SSO
- **Session Management**: PostgreSQL-backed secure session storage
- **Role-based Access**: User permissions and system-level access controls
- **Input Validation**: Multi-layer security with SQL injection protection

### File Processing & Analysis
- **Secure Upload System**: Validated .txt/.log file processing with size limits
- **Zscaler NSS Support**: Specialized parser for security log formats
- **Concurrent Processing**: Multi-file analysis with rate limiting
- **Blob Storage Ready**: Scalable file storage architecture

## 🏗️ Architecture

### Frontend Stack
- **React 18** + TypeScript for type-safe development
- **Tailwind CSS** + **Shadcn UI** for modern responsive design
- **Wouter** for client-side routing
- **TanStack React Query** for server state management
- **React Hook Form** + **Zod** for form validation

### Backend Stack
- **Node.js** + **Express.js** RESTful API
- **Drizzle ORM** + **PostgreSQL** for data persistence
- **Passport.js** with OpenID Connect for authentication
- **OpenAI API** + **Google Gemini** for AI analysis
- **Webhook Service** for external integrations

### Database Schema
- **Users**: OAuth profiles and permissions
- **Log Files**: Upload metadata and processing status
- **Anomalies**: Threat detections with analyst workflow
- **Processing Jobs**: Analysis job tracking and metrics
- **Webhook Integrations**: External automation configurations
- **System Metrics**: Performance and usage analytics

## 📋 API Documentation

### Authentication Endpoints
| Method | Endpoint | Description | Protected |
|--------|----------|-------------|-----------|
| `GET` | `/api/login` | Initiate OAuth login flow | ❌ |
| `GET` | `/api/callback` | OAuth callback handler | ❌ |
| `GET` | `/api/logout` | Logout and clear session | ❌ |
| `GET` | `/api/auth/user` | Get current user profile | ✅ |

### File Management Endpoints
| Method | Endpoint | Description | Protected |
|--------|----------|-------------|-----------|
| `POST` | `/api/upload` | Upload log files for analysis | ✅ |
| `GET` | `/api/log-files` | List user's uploaded files | ✅ |
| `GET` | `/api/log-files/:id` | Get specific file details | ✅ |
| `DELETE` | `/api/log-files/:id` | Delete uploaded file | ✅ |
| `POST` | `/api/log-files/:id/reprocess` | Reprocess file with new settings | ✅ |

### Anomaly Detection Endpoints
| Method | Endpoint | Description | Protected |
|--------|----------|-------------|-----------|
| `GET` | `/api/anomalies` | List all user anomalies with filtering | ✅ |
| `GET` | `/api/anomalies/:id` | Get specific anomaly details | ✅ |
| `PATCH` | `/api/anomalies/:id` | Update anomaly (status, priority, notes) | ✅ |
| `POST` | `/api/anomalies/bulk-update` | Bulk update multiple anomalies | ✅ |
| `GET` | `/api/anomalies/log/:logFileId` | Get anomalies for specific log file | ✅ |

### Analytics & Dashboard Endpoints
| Method | Endpoint | Description | Protected |
|--------|----------|-------------|-----------|
| `GET` | `/api/stats` | User dashboard statistics | ✅ |
| `GET` | `/api/processing-jobs` | List analysis job history | ✅ |
| `GET` | `/api/processing-jobs/:id` | Get specific job details | ✅ |

### Webhook Integration Endpoints
| Method | Endpoint | Description | Protected |
|--------|----------|-------------|-----------|
| `GET` | `/api/webhooks` | List user's webhook integrations | ✅ |
| `POST` | `/api/webhooks` | Create new webhook integration | ✅ |
| `GET` | `/api/webhooks/:id` | Get specific webhook details | ✅ |
| `PATCH` | `/api/webhooks/:id` | Update webhook configuration | ✅ |
| `DELETE` | `/api/webhooks/:id` | Delete webhook integration | ✅ |
| `POST` | `/api/webhooks/:id/test` | Test webhook delivery | ✅ |

### System Health Endpoints
| Method | Endpoint | Description | Protected |
|--------|----------|-------------|-----------|
| `GET` | `/health` | System health check | ❌ |
| `GET` | `/api/health` | API health status | ❌ |

## 🎯 Product Features → API Mapping

### 1. User Authentication & Profile Management
- **Login Flow**: `/api/login` → `/api/callback` → `/api/auth/user`
- **Session Management**: Handled via express-session with PostgreSQL storage
- **User Profile**: `GET /api/auth/user` returns complete OAuth profile

### 2. Log File Upload & Processing
- **File Upload**: `POST /api/upload` with validation and security checks
- **Processing Queue**: Creates processing job via background service
- **File Management**: `GET /api/log-files` for upload history and status
- **Reprocessing**: `POST /api/log-files/:id/reprocess` with different AI models

### 3. AI-Powered Anomaly Detection
- **Analysis Trigger**: Automatic on upload completion
- **Multi-Model Support**: Traditional ML, Advanced ML, OpenAI GPT-4o, Google Gemini
- **Risk Scoring**: 0-10 scale with confidence percentages
- **Result Retrieval**: `GET /api/anomalies` with filtering and pagination

### 4. SOC Analyst Workflow
- **Anomaly Review**: `PATCH /api/anomalies/:id` for status updates
- **Priority Management**: Set critical/high/medium/low priorities
- **Analyst Notes**: Add investigation notes and escalation reasons
- **Bulk Operations**: `POST /api/anomalies/bulk-update` for mass actions

### 5. Webhook Automation System
- **Integration Setup**: `POST /api/webhooks` for Zapier/Make connections
- **Trigger Configuration**: Risk score thresholds, anomaly types, priorities
- **Delivery Tracking**: Success/failure metrics with detailed logging
- **Alert Filtering**: Prevent alert fatigue with precise conditions

### 6. Dashboard Analytics
- **System Statistics**: `GET /api/stats` for logs processed, anomalies found
- **Performance Metrics**: Processing job analytics and AI analysis timing
- **User Activity**: Upload frequency and analysis patterns
- **Webhook Metrics**: Delivery success rates and failure analysis

## 🔧 Frontend UX Routes

### Public Routes
- `/` - Landing page with feature overview
- `/auth` - Login/signup page (redirects to OAuth)

### Protected Application Routes
- `/` - Dashboard overview (post-login)
- `/upload` - File upload interface
- `/analysis` - Anomaly analysis and filtering
- `/history` - Upload and processing history
- `/webhooks` - Webhook integration management
- `/profile` - User account settings

### Component-Level Features
- **Anomaly Details Modal**: Deep-dive analysis with raw log viewing
- **Bulk Selection**: Multi-anomaly operations in analysis table
- **Real-time Updates**: Live processing status and webhook notifications
- **Dark Mode**: Consistent dark theme across all interfaces

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- OpenAI API key (optional - for AI analysis)
- Google Gemini API key (optional - for alternative AI analysis)

### Environment Setup

Create a `.env` file:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/sentry
OPENAI_API_KEY=sk-your-openai-key
GOOGLE_API_KEY=your-google-gemini-key
SESSION_SECRET=your-secure-session-secret
REPL_ID=your-replit-app-id
REPLIT_DOMAINS=your-domain.replit.app
NODE_ENV=development
```

### Installation

1. **Clone the repository**:
```bash
git clone https://github.com/<your-username>/<your-repo-name>.git
cd <your-repo-name>
```

2. **Install dependencies**:
```bash
npm install
```

3. **Set up database**:
```bash
npm run db:push
```

4. **Start development server**:
```bash
npm run dev
```

Access the application at `http://localhost:5000`

### Production Deployment

#### Using Replit Autoscale
1. Connect your GitHub repository to Replit
2. Configure environment variables in Replit Secrets
3. Deploy using Replit's autoscale deployment system

#### Manual Deployment
```bash
npm run build
NODE_ENV=production npm start
```

## 📁 Project Structure

```
your-repo-name/
├── client/                     # React frontend application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── dashboard/      # Dashboard-specific components
│   │   │   ├── webhooks/       # Webhook management UI
│   │   │   └── ui/             # Shadcn UI components
│   │   ├── pages/              # Application pages/routes
│   │   ├── hooks/              # Custom React hooks
│   │   └── lib/                # Client utilities and helpers
├── server/                     # Express backend application
│   ├── services/               # Business logic services
│   │   ├── anomaly-detector.ts # AI-powered analysis engine
│   │   ├── log-parser.ts       # Zscaler NSS log parser
│   │   ├── webhook-service.ts  # External integration handler
│   │   └── metrics-service.ts  # Analytics and tracking
│   ├── middleware/             # Express middleware
│   ├── routes/                 # Modular API route handlers
│   ├── db.ts                   # Database connection setup
│   ├── storage.ts              # Data access layer (ORM)
│   └── index.ts                # Application entry point
├── shared/                     # Shared TypeScript schemas
│   ├── schema.ts               # Drizzle database schemas
│   └── types.ts                # Shared type definitions
├── uploads/                    # Temporary file storage
└── terraform/                  # Infrastructure as code (GCP)
```

## 🔍 AI Analysis Capabilities

### Threat Detection Types
- **Cryptocurrency Mining**: Detection of mining-related traffic and domains
- **Tor/Dark Web Access**: Anonymous network usage patterns
- **Data Exfiltration**: Unusual upload volumes and suspicious destinations
- **Command & Control**: C2 communication patterns and beaconing
- **Privilege Escalation**: Unusual permission changes and access attempts
- **Geographic Anomalies**: Impossible travel and suspicious locations
- **Time-based Anomalies**: Off-hours activity and unusual timing patterns
- **Authentication Failures**: Brute force and credential stuffing attempts

### Analysis Methods
1. **Traditional Detection**: Rule-based pattern matching for known threats
2. **Advanced ML**: Multi-model ensemble with statistical analysis
3. **AI-Powered**: OpenAI GPT-4o and Google Gemini for contextual analysis
4. **Behavioral Analysis**: User behavior profiling and deviation detection

## 🔒 Security Features

### Input Security
- **File Validation**: Type, size, and content validation for uploads
- **SQL Injection Protection**: Parameterized queries and input sanitization
- **Rate Limiting**: Per-user API rate limits and concurrent processing controls
- **Input Sanitization**: Zod schema validation for all API endpoints

### Authentication Security
- **OAuth 2.0**: Secure authentication via Replit's OpenID Connect provider
- **Session Security**: HTTP-only cookies with secure flags
- **CSRF Protection**: Built-in protection against cross-site request forgery
- **Session Storage**: PostgreSQL-backed session persistence

### Infrastructure Security
- **Environment Isolation**: Secure environment variable management
- **Database Security**: Connection pooling and prepared statements
- **HTTPS Enforcement**: TLS encryption for all communications
- **Audit Logging**: Comprehensive security event tracking

## 📊 Monitoring & Analytics

### System Metrics
- **Processing Performance**: Analysis job timing and throughput
- **AI Model Usage**: Token consumption and response times
- **Webhook Delivery**: Success rates and failure analysis
- **User Activity**: Upload patterns and analysis frequency

### Error Handling
- **Graceful Degradation**: Fallback options when AI services are unavailable
- **Retry Logic**: Automatic retry for transient failures
- **Error Logging**: Structured logging with correlation IDs
- **User Feedback**: Clear error messages and resolution guidance

## 🤝 Contributing

1. Fork the repository on GitHub
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Add tests for new features
- Update documentation for API changes
- Ensure LSP diagnostics pass before committing

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: Report bugs and request features via GitHub Issues
- **Discussions**: Community support and development discussions
- **Documentation**: This README and inline code comments

## 🙏 Acknowledgments

- **OpenAI** for GPT-4o model capabilities and comprehensive API
- **Google** for Gemini AI model access and documentation
- **Replit** for the development platform and deployment infrastructure
- **Zscaler** for NSS feed format documentation and security insights
- **Open Source Community** for the excellent tools and libraries that make this project possible

## 🚦 CI/CD & Quality Assurance

### Continuous Integration Status
![CI Pipeline](https://img.shields.io/badge/CI-GitHub%20Actions-blue)
![Build Status](https://img.shields.io/badge/build-ready-brightgreen)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Node.js](https://img.shields.io/badge/Node.js-20.x-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)

### Production Instance Status
🟢 **Production**: Available via Replit Deployment - **Ready**  
🔧 **Development**: Running on Replit workspace - **Active**  
📊 **Health Checks**: Built-in application health monitoring  
📈 **Analytics**: Integrated anomaly detection and reporting

### Test Coverage & Quality Metrics
- **Unit Test Coverage**: Comprehensive test suite for storage and anomaly detection
- **Integration Test Coverage**: Full API endpoint validation with real database testing
- **Security Scan**: Automated npm audit and dependency vulnerability checks
- **Performance Tests**: Concurrent processing limits and resource optimization
- **Code Quality**: TypeScript strict mode with ESLint code standards

### Automated Quality Gates
- ✅ **TypeScript Compilation**: Strict type checking with zero compilation errors
- ✅ **Code Quality**: ESLint static analysis and formatting standards
- ✅ **Unit Tests**: Storage layer and anomaly detection service validation
- ✅ **Integration Tests**: Complete API endpoint testing with database
- ✅ **Security Scan**: npm audit for dependency vulnerabilities
- ✅ **Build Verification**: Application compiles and bundles successfully
- ✅ **Container Ready**: Docker build compatibility verification

> **Note**: To enable full CI/CD for your GitHub repository, see [GitHub Setup Guide](GITHUB_SETUP.md) for configuration instructions.

## 🔒 Security Threat Model

### Executive Summary
Sentry processes sensitive security log data and requires comprehensive threat mitigation across multiple attack vectors. This threat model identifies primary risks and implemented countermeasures.

### 1. Data Protection Threats

#### **Threat**: Unauthorized Log Data Access
- **Risk Level**: 🔴 **Critical**
- **Attack Vector**: Database breach, session hijacking, privilege escalation
- **Impact**: Exposure of sensitive security logs containing user activity, network traffic, authentication events
- **Mitigations**:
  - PostgreSQL with encrypted connections (TLS 1.3)
  - Row-level security policies restricting user data access
  - Session-based authentication with HTTP-only secure cookies
  - Replit OAuth integration with token validation
  - Database connection pooling with credential rotation

#### **Threat**: Log Data Tampering/Injection
- **Risk Level**: 🟠 **High**
- **Attack Vector**: Malicious log file uploads, SQL injection via log content
- **Impact**: Data corruption, system compromise, false analysis results
- **Mitigations**:
  - Multi-layer file validation (MIME type, size, content inspection)
  - Parameterized queries via Drizzle ORM (prevents SQL injection)
  - Log content sanitization before storage
  - File upload restrictions (50MB limit, .txt/.log extensions only)
  - Virus scanning on uploaded files

### 2. Application Security Threats

#### **Threat**: Authentication Bypass
- **Risk Level**: 🔴 **Critical**
- **Attack Vector**: Session manipulation, token forgery, OAuth vulnerabilities
- **Impact**: Unauthorized access to user accounts and sensitive data
- **Mitigations**:
  - Replit OAuth 2.0 with PKCE (Proof Key for Code Exchange)
  - Session token rotation and expiry (7-day TTL)
  - CSRF protection via SameSite cookie attributes
  - Rate limiting on authentication endpoints (5 attempts/15 min)
  - Account lockout mechanisms

#### **Threat**: Cross-Site Scripting (XSS)
- **Risk Level**: 🟡 **Medium**
- **Attack Vector**: Malicious content in log files, user input fields
- **Impact**: Session hijacking, data theft, malicious code execution
- **Mitigations**:
  - Content Security Policy (CSP) headers
  - DOMPurify sanitization for all user content
  - React's built-in XSS protection
  - Input validation via Zod schemas
  - Output encoding for log data display

#### **Threat**: API Abuse & Rate Limiting Bypass
- **Risk Level**: 🟠 **High**
- **Attack Vector**: Automated attacks, resource exhaustion, cost amplification
- **Impact**: Service degradation, excessive AI API costs, data exposure
- **Mitigations**:
  - Multi-tier rate limiting (file uploads: 10/15min, AI analysis: 20/5min)
  - Concurrent processing limits (3 files per user)
  - Request size validation and timeouts
  - AI API cost monitoring and circuit breakers
  - DDoS protection via cloud infrastructure

### 3. Infrastructure Security Threats

#### **Threat**: Container/Deployment Compromise
- **Risk Level**: 🟠 **High**
- **Attack Vector**: Container escape, supply chain attacks, misconfiguration
- **Impact**: Full system compromise, data breach, service disruption
- **Mitigations**:
  - Minimal container images (Node.js Alpine base)
  - Regular security updates and vulnerability scanning
  - Read-only container filesystem where possible
  - Environment variable security (no secrets in code)
  - Health checks and automatic recovery mechanisms

#### **Threat**: Dependency Vulnerabilities
- **Risk Level**: 🟡 **Medium**
- **Attack Vector**: Known CVEs in npm packages, supply chain compromise
- **Impact**: Remote code execution, data theft, service disruption
- **Mitigations**:
  - Automated dependency scanning (Snyk, npm audit)
  - Regular dependency updates and security patches
  - Dependency pinning and lock file verification
  - Security-focused package selection and minimal dependencies

### 4. AI/ML Security Threats

#### **Threat**: AI Model Manipulation
- **Risk Level**: 🟡 **Medium**
- **Attack Vector**: Prompt injection, adversarial inputs, model poisoning
- **Impact**: False analysis results, data leakage via model responses
- **Mitigations**:
  - Input sanitization before AI processing
  - Output validation and anomaly detection
  - Multiple detection methods (not solely AI-dependent)
  - AI response parsing and validation
  - Fallback to traditional detection methods

#### **Threat**: External AI Service Compromise
- **Risk Level**: 🟡 **Medium**
- **Attack Vector**: OpenAI/Google API compromise, man-in-the-middle attacks
- **Impact**: Data exposure, service disruption, false analysis results
- **Mitigations**:
  - API key rotation and secure storage
  - TLS encryption for all external API calls
  - Circuit breaker patterns for API failures
  - Data anonymization before external processing
  - Multiple AI provider options

### 5. Webhook Security Threats

#### **Threat**: Webhook URL Exploitation
- **Risk Level**: 🟠 **High**
- **Attack Vector**: Malicious webhook endpoints, data exfiltration
- **Impact**: Sensitive anomaly data sent to attacker-controlled endpoints
- **Mitigations**:
  - Webhook URL validation and allowlist patterns
  - Payload encryption for sensitive data
  - Webhook delivery authentication (signatures)
  - Rate limiting on webhook triggers
  - User consent and transparency for data sharing

### Security Controls Summary

| Control Category | Implementation | Effectiveness |
|------------------|----------------|---------------|
| **Authentication** | OAuth 2.0 + Session Management | 🟢 High |
| **Authorization** | Role-based access + Row-level security | 🟢 High |
| **Data Encryption** | TLS 1.3 + Encrypted storage | 🟢 High |
| **Input Validation** | Multi-layer validation + Sanitization | 🟢 High |
| **Rate Limiting** | Tiered limits + Concurrent controls | 🟢 High |
| **Monitoring** | Audit logging + Security metrics | 🟡 Medium |
| **Incident Response** | Automated alerts + Manual procedures | 🟡 Medium |

### Compliance & Regulatory Considerations
- **GDPR**: User consent for data processing, right to deletion, data minimization
- **SOC 2**: Access controls, encryption, audit logging, incident response
- **ISO 27001**: Risk management, security policies, continuous monitoring
- **HIPAA** (if applicable): Healthcare data protection, access logs, encryption

### Security Monitoring & Incident Response
- Real-time security event monitoring via system metrics
- Automated anomaly detection in application behavior
- Security incident escalation procedures
- Regular security assessments and penetration testing
- Vulnerability disclosure and patch management process

## 📸 Application Interface

### Core Features Overview

**🏠 Dashboard Interface**
- Real-time anomaly detection statistics and trends
- Upload history with processing status indicators
- Risk score distribution charts and analytics
- Recent activity feed with filtered anomaly alerts

**📤 File Upload System**
- Drag-and-drop interface supporting multiple log files
- Analysis method selection: Traditional ML, Advanced ML, AI-Powered
- Real-time upload progress with file validation
- Batch processing with concurrent file handling

**🔍 Analysis Method Selection**
- **Traditional ML**: Rule-based pattern detection for crypto mining, Tor access, auth failures
- **Advanced ML**: Statistical modeling with behavioral analysis and time-series detection
- **AI-Powered**: OpenAI GPT-4o and Google Gemini integration for sophisticated threat analysis

**📊 Anomaly Analysis Results**
- Comprehensive results dashboard with risk scoring (1-10 scale)
- Confidence levels and detailed threat descriptions
- Filtering by risk score, anomaly type, and detection method
- Analyst workflow tools for status updates and priority management

**🔗 Webhook Integration Management**
- Zapier and Make.com integration setup
- Custom trigger conditions with risk score thresholds
- Delivery statistics and success/failure tracking
- Test webhook functionality with real-time validation

**⚙️ User Settings & Security**
- Replit OAuth profile management
- API key configuration for external services
- Security preferences and access controls
- Audit trail for user actions and anomaly updates

> **Note**: Screenshots are available in the live application. Deploy to Replit to explore the full interface with real-time data processing.

---

**Built with ❤️ using TypeScript, React, and AI-powered security analysis**