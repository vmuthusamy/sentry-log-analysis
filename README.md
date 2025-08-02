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
git clone https://github.com/your-username/sentry-log-analysis.git
cd sentry-log-analysis
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
sentry/
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

- **Issues**: [GitHub Issues](https://github.com/your-username/sentry-log-analysis/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/sentry-log-analysis/discussions)
- **Documentation**: This README and inline code comments

## 🙏 Acknowledgments

- **OpenAI** for GPT-4o model capabilities and comprehensive API
- **Google** for Gemini AI model access and documentation
- **Replit** for the development platform and deployment infrastructure
- **Zscaler** for NSS feed format documentation and security insights
- **Open Source Community** for the excellent tools and libraries that make this project possible

---

**Built with ❤️ using TypeScript, React, and AI-powered security analysis**