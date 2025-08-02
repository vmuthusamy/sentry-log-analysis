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

### 7. System Monitoring & Observability
- **Real-time Metrics Dashboard**: Success/failure rates with time range filtering (1h-30d)
- **Error Tracking**: Comprehensive error handling with custom error classes and user notifications
- **Performance Monitoring**: File upload tracking, AI analysis performance by provider
- **Processing Health**: Timeout manager for stuck jobs, rate limiting enforcement
- **Metrics Collection**: Buffered metrics service with periodic database flushing
- **User Experience Tracking**: Analysis view counts, file processing times, system reliability
- **Alert Management**: Rate limit notifications, error recovery suggestions, retry mechanisms

## 🏗️ System Architecture

### Current Implementation (Single Node)

Sentry currently operates as a monolithic full-stack TypeScript application running on a single Node.js process with integrated AI analysis capabilities.

```mermaid
graph TB
    subgraph "Frontend (React)"
        UI[React Components]
        FORMS[Upload Forms]
        DASH[Dashboard Views]
        STATE[React Query State]
    end
    
    subgraph "Backend (Express.js)"
        API[Express Server]
        AUTH[Passport OAuth]
        ROUTES[API Routes]
        MIDDLEWARE[Security Middleware]
    end
    
    subgraph "Services (Synchronous)"
        UPLOAD[Multer File Upload]
        PARSER[Zscaler Log Parser]
        ANALYZER[AI Analysis Service]
        WEBHOOK[Webhook Service]
    end
    
    subgraph "Storage (Local)"
        DB[(PostgreSQL Database)]
        FILES[Local File System]
        SESSIONS[Session Store]
    end
    
    subgraph "External APIs"
        OPENAI[OpenAI GPT-4o]
        GEMINI[Google Gemini]
        ZAPIER[Zapier Webhooks]
    end
    
    UI --> API
    FORMS --> UPLOAD
    DASH --> STATE
    STATE --> ROUTES
    
    API --> AUTH
    API --> MIDDLEWARE
    ROUTES --> UPLOAD
    ROUTES --> ANALYZER
    ROUTES --> WEBHOOK
    
    UPLOAD --> FILES
    UPLOAD --> PARSER
    PARSER --> ANALYZER
    ANALYZER --> OPENAI
    ANALYZER --> GEMINI
    ANALYZER --> DB
    
    AUTH --> SESSIONS
    API --> DB
    WEBHOOK --> ZAPIER
    
    style UI fill:#e3f2fd
    style API fill:#fff3e0
    style ANALYZER fill:#f3e5f5
    style DB fill:#e8f5e8
```

### Current User Flow - Technical Implementation

#### 1. **File Upload Process (Synchronous)**
```
User Selects File → React Validation → API Upload → Multer Processing → Immediate Analysis
```

**Current Technical Flow:**
1. **Frontend**: React form validates file size (≤10MB) and user limit (≤10 files)
2. **Upload**: Multer middleware saves to local `uploads/` directory
3. **Security**: File content validation and security scanning
4. **Processing**: Immediate synchronous analysis starts
5. **Response**: User gets immediate feedback on upload success/failure

#### 2. **Analysis Pipeline (Sequential)**
```
File Upload → Parse Logs → Select AI Model → API Call → Store Results → Return to User
```

**Current Implementation:**
- **Parser**: Synchronous Zscaler NSS log parsing with regex validation
- **AI Selection**: User chooses Traditional ML, Advanced ML, OpenAI, or Skip LLM
- **API Calls**: Sequential calls to OpenAI/Gemini APIs (blocking)
- **Storage**: Direct PostgreSQL insert of anomalies and results
- **Response**: Analysis results returned immediately to frontend

#### 3. **SOC Analyst Workflow (Real-time)**
```
Dashboard Load → Fetch Anomalies → Display Table → Analyst Action → Update Database → Refresh UI
```

**Current Frontend/Backend Interaction:**
- **Frontend**: React Query fetches anomalies with filtering
- **Backend**: Express routes with SQL queries for anomaly management
- **State Management**: Optimistic updates with React Query mutations
- **Real-time**: Polling-based updates (no WebSockets currently)

#### 4. **Webhook System (Synchronous)**
```
Analyst Confirms → Trigger Check → HTTP Request → External API → Response Logging
```

**Current Webhook Implementation:**
- **Trigger**: Database update triggers in-memory webhook check
- **Delivery**: Synchronous HTTP requests to external endpoints
- **Retry**: Basic retry logic with exponential backoff
- **Logging**: Success/failure tracking in PostgreSQL

### Current Frontend Architecture

#### React Component Structure
```
src/
├── components/
│   ├── dashboard/
│   │   ├── upload-section.tsx     # File upload with drag-drop
│   │   ├── anomaly-table.tsx      # Data grid with filtering
│   │   └── stats-cards.tsx        # Dashboard metrics
│   ├── webhooks/
│   │   ├── webhook-form.tsx       # Integration setup
│   │   └── webhook-list.tsx       # Management interface
│   └── ui/                        # Shadcn components
├── pages/
│   ├── Dashboard.tsx              # Main app interface
│   ├── Analysis.tsx               # Anomaly review page
│   └── Landing.tsx                # Public homepage
└── lib/
    ├── queryClient.ts             # API request handling
    └── utils.ts                   # Helper functions
```

#### State Management Pattern
- **Server State**: TanStack React Query for API data
- **Form State**: React Hook Form with Zod validation
- **UI State**: Local component state with useState
- **Authentication**: Replit OAuth with session-based auth

### Current Backend Architecture

#### Express.js Server Structure
```
server/
├── routes/
│   ├── auth.ts                    # OAuth endpoints
│   ├── upload.ts                  # File upload handling
│   ├── anomalies.ts               # Anomaly CRUD operations
│   └── webhooks.ts                # Integration management
├── services/
│   ├── anomaly-detector.ts        # AI analysis orchestration
│   ├── log-parser.ts              # Zscaler log processing
│   ├── webhook-service.ts         # External API calls
│   └── security-validator.ts      # File security checks
├── middleware/
│   ├── auth.ts                    # Session validation
│   ├── rate-limiter.ts            # Request throttling
│   └── file-validator.ts          # Upload validation
└── storage.ts                     # Database operations
```

#### Processing Flow (Synchronous)
1. **Request**: Express route receives API call
2. **Middleware**: Authentication, rate limiting, validation
3. **Service**: Business logic processing (blocking)
4. **Database**: Direct PostgreSQL operations
5. **Response**: Immediate result return to client

### Current Limitations & Bottlenecks

#### Performance Constraints
- **File Processing**: Blocks request thread during analysis
- **AI Calls**: Sequential API calls create latency spikes
- **Concurrent Users**: Limited by single Node.js process
- **File Storage**: Local filesystem not suitable for scaling

#### Scaling Challenges
- **Memory Usage**: All processing happens in main thread
- **Session Affinity**: PostgreSQL sessions tie users to specific instance
- **Error Recovery**: Process crashes affect all users
- **Resource Limits**: Single server resource constraints

### Future Architecture & Scaling Improvements

#### Proposed Distributed Architecture

```mermaid
graph TB
    subgraph "Load Balancer Tier"
        LB[NGINX/CloudFlare]
    end
    
    subgraph "API Tier (Horizontal Scale)"
        API1[API Server 1]
        API2[API Server 2]
        API3[API Server 3]
    end
    
    subgraph "Queue Infrastructure"
        REDIS[(Redis Cluster)]
        BULL[Bull Queue Manager]
        subgraph "Message Queues"
            Q1[File Processing Queue]
            Q2[Analysis Queue]
            Q3[Webhook Queue]
            Q4[Notification Queue]
        end
    end
    
    subgraph "Worker Tier (Auto-Scale)"
        subgraph "File Workers"
            FW1[File Worker 1]
            FW2[File Worker 2]
        end
        subgraph "Analysis Workers"
            AW1[Analysis Worker 1]
            AW2[Analysis Worker 2]
            AW3[Analysis Worker 3]
        end
        subgraph "Webhook Workers"
            WW1[Webhook Worker 1]
            WW2[Webhook Worker 2]
        end
    end
    
    subgraph "Storage Tier"
        PG[(PostgreSQL Cluster)]
        BLOB[Object Storage<br/>AWS S3/GCS]
        CACHE[Redis Cache]
    end
    
    subgraph "AI Services"
        OPENAI_API[OpenAI API]
        GEMINI_API[Google Gemini API]
        ML_SERVICE[Custom ML Service]
    end
    
    LB --> API1
    LB --> API2
    LB --> API3
    
    API1 --> REDIS
    API2 --> REDIS
    API3 --> REDIS
    
    REDIS --> Q1
    REDIS --> Q2
    REDIS --> Q3
    REDIS --> Q4
    
    Q1 --> FW1
    Q1 --> FW2
    Q2 --> AW1
    Q2 --> AW2
    Q2 --> AW3
    Q3 --> WW1
    Q3 --> WW2
    
    FW1 --> BLOB
    FW2 --> BLOB
    AW1 --> OPENAI_API
    AW2 --> GEMINI_API
    AW3 --> ML_SERVICE
    
    API1 --> PG
    API2 --> PG
    API3 --> PG
    API1 --> CACHE
    API2 --> CACHE
    API3 --> CACHE
    
    style LB fill:#ffebee
    style REDIS fill:#fff3e0
    style PG fill:#e8f5e8
    style BLOB fill:#f3e5f5
```

#### Future User Flow Improvements

##### 1. **Asynchronous File Processing**
```
User Upload → Queue Job → Background Processing → User Notification → Analysis Results
```

##### 2. **Parallel AI Analysis**
```
File → Multiple Workers → Concurrent AI Calls → Result Aggregation → Risk Scoring
```

##### 3. **Real-time SOC Dashboard**
```
WebSocket Connection → Live Updates → Instant Notifications → Collaborative Features
```

##### 4. **Scalable Webhook System**
```
Event → Queue → Worker Pool → Rate-Limited Delivery → Retry Logic → Success Tracking
```

#### Scaling Migration Strategy

##### Phase 1: Queue Implementation
- Implement Redis-backed job queues
- Move file processing to background workers
- Add job status tracking for users

##### Phase 2: Horizontal Scaling
- Stateless API servers with JWT tokens
- Load balancer configuration
- Database connection pooling

##### Phase 3: Microservices
- Split analysis engine into separate service
- Dedicated webhook service
- Event-driven architecture

### Production Deployment Options

#### Current Deployment (Replit)
```
Single Instance: Replit → PostgreSQL → Local Storage
```

#### Cloud-Native Migration (Recommended)
```
Frontend: Vercel/Netlify → CDN distribution
API: GCP Cloud Run → Auto-scaling containers
Queue: GCP Cloud Tasks → Managed job processing  
Database: GCP Cloud SQL → Managed PostgreSQL
Storage: GCP Cloud Storage → Object storage
AI: Vertex AI → Managed ML services
```

#### Container Orchestration (Enterprise)
```
Frontend: Docker → Kubernetes pods
API: Docker → Kubernetes deployment
Workers: Docker → Kubernetes jobs
Database: Kubernetes StatefulSet
Queue: Redis Kubernetes operator
```

### Enhanced Security & Defensive Measures

#### Additional REST API Protections (Future Implementation)

**Input Validation & Sanitization**
- Request payload size limits (prevent large JSON attacks)
- Parameter type validation with strict schemas
- Path traversal protection for file operations
- Request header validation and Content-Type enforcement

**API Security Hardening**
- CORS configuration with specific allowed origins
- API versioning strategy for breaking changes
- Request timeout enforcement (30s default, 2min for AI analysis)
- Response rate limiting per endpoint type

**Enhanced Authentication & Authorization**
- JWT token rotation with refresh mechanism
- Role-based access control (Admin, Analyst, Viewer)
- API key management for service-to-service calls
- Session hijacking prevention with IP validation

**Anomaly Data Protection**
- Cross-user data access prevention with ownership checks
- Status transition validation (prevent invalid state changes)
- Bulk operation limits (max 100 anomalies per request)
- Audit logging for all sensitive operations

**Webhook Security Enhancements**
- Webhook URL validation and domain allowlisting
- Cryptographic signature verification (HMAC-SHA256)
- Delivery timeout controls with circuit breakers
- Per-integration rate limiting and retry policies

### Multi-Format Log Support Architecture

#### Current Limitation
The system currently supports only Zscaler NSS feed format with fixed parsing rules and field positions.

#### Proposed Multi-Parser System

**Parser Abstraction Layer**
```typescript
interface LogParser {
  formatName: string;
  version: string;
  detect(content: string): { confidence: number; format: string };
  parse(content: string): LogEntry[];
  validate(entry: LogEntry): ValidationResult;
  getSchema(): LogSchema;
}

class ParserRegistry {
  private parsers: Map<string, LogParser> = new Map();
  
  register(parser: LogParser): void;
  detect(content: string): LogParser | null;
  getSupportedFormats(): string[];
}
```

**Supported Log Formats (Planned)**
- **Zscaler NSS**: Current implementation (Web, Firewall, DNS logs)
- **Palo Alto Networks**: PAN-OS traffic and threat logs
- **Fortinet FortiGate**: Security event logs
- **Cisco ASA**: Firewall and VPN logs
- **AWS CloudTrail**: API activity logs
- **Azure Security Center**: Security alert logs
- **Generic Syslog**: RFC3164/RFC5424 compliant logs
- **Custom CSV/JSON**: User-defined format specifications

**Implementation Components**

**Frontend Enhancements**
- Format detection and selection UI
- Format-specific upload validation
- Dynamic field mapping interface
- Format preview with sample parsing

**Backend Parser System**
```typescript
// Auto-detection pipeline
const detectionPipeline = [
  new ZscalerDetector(),
  new PaloAltoDetector(), 
  new FortiGateDetector(),
  new SyslogDetector(),
  new GenericDetector()
];

// Format-specific processing
class LogProcessingService {
  async processFile(file: File): Promise<ProcessingResult> {
    const parser = await this.detectFormat(file);
    const entries = await parser.parse(file.content);
    const validated = await this.validateEntries(entries, parser);
    return this.analyzeEntries(validated, parser.getSchema());
  }
}
```

**AI Model Adaptations**
- Format-specific analysis prompts for OpenAI/Gemini
- Schema-aware anomaly detection algorithms
- Format-specific risk scoring models
- Contextual field interpretation

**Database Schema Extensions**
```sql
-- Log format tracking
ALTER TABLE log_files ADD COLUMN format_name VARCHAR(50);
ALTER TABLE log_files ADD COLUMN format_version VARCHAR(20);
ALTER TABLE log_files ADD COLUMN parser_metadata JSONB;

-- Format-specific anomaly context
ALTER TABLE anomalies ADD COLUMN log_format VARCHAR(50);
ALTER TABLE anomalies ADD COLUMN format_specific_data JSONB;
```

**Configuration Management**
- Parser plugin system for easy format additions
- Format-specific configuration files
- Field mapping customization per organization
- Format validation rule management

#### Implementation Complexity: **Medium-High**

**Phase 1: Parser Infrastructure (4-6 weeks)**
- Abstract parser interface implementation
- Auto-detection mechanism
- Plugin architecture for new formats

**Phase 2: Core Format Support (6-8 weeks)**
- Palo Alto Networks parser
- Fortinet FortiGate parser
- Generic Syslog parser

**Phase 3: Advanced Features (4-6 weeks)**
- Custom format definitions
- Field mapping interface
- Format-specific AI prompts

**Benefits**
- **Market Expansion**: Support for diverse security infrastructure
- **Vendor Flexibility**: Reduce dependency on single log source
- **Enterprise Adoption**: Multi-vendor environment compatibility
- **Competitive Advantage**: Comprehensive log format coverage

**Technical Challenges**
- **Performance**: Parser selection and processing overhead
- **Maintenance**: Multiple parser codebases to maintain
- **AI Training**: Format-specific model optimization
- **Testing**: Comprehensive format validation across vendors

## 🔄 System Data Flow Diagram

### File Upload → Analysis → SOC Workflow Process

```mermaid
graph TD
    A[👤 User] -->|Upload Log File| B[🔐 Authentication Check]
    B -->|Valid Session| C[📏 File Validation]
    B -->|Invalid| Z1[❌ Auth Error]
    
    C -->|Size ≤10MB & Count ≤10| D[🔍 Security Scan]
    C -->|Validation Failed| Z2[❌ File Error]
    
    D -->|Clean File| E[📝 Parse Zscaler Logs]
    D -->|Security Risk| Z3[❌ Security Error]
    
    E -->|Structured Data| F{🧠 Analysis Method}
    
    F -->|Traditional| G[📊 Rule-Based Detection]
    F -->|Advanced ML| H[🤖 ML Ensemble Pipeline]
    F -->|AI-Powered| I[🎯 OpenAI/Gemini Analysis]
    F -->|Skip LLM| J[📋 Basic Processing]
    
    G --> K[📊 Risk Scoring 0-10]
    H --> K
    I --> K
    J --> K
    
    K -->|Risk Score + Confidence| L[💾 Store Anomalies]
    L --> M{🚨 Alert Triggers}
    
    M -->|High Risk ≥7| N[📢 Generate Alert]
    M -->|Medium Risk 4-6| O[⚠️ Queue for Review]
    M -->|Low Risk <4| P[📝 Log Only]
    
    N --> Q[👨‍💼 SOC Analyst Dashboard]
    O --> Q
    
    Q --> R{🔍 Analyst Actions}
    
    R -->|Confirm Threat| S[🚩 Mark as Confirmed]
    R -->|False Positive| T[✅ Mark as Benign]
    R -->|Needs Investigation| U[🔎 Set Investigating]
    R -->|Add Context| V[📝 Add Notes/Tags]
    
    S --> W{🔗 Webhook Configured}
    T --> X[📊 Update Statistics]
    U --> Y[⏰ Set Reminder]
    V --> Q
    
    W -->|Yes| AA[🌐 Trigger Webhook]
    W -->|No| AB[📧 Internal Alert]
    
    AA --> AC{🔧 Automation Platform}
    AC -->|Zapier| AD[⚡ Zapier Workflow]
    AC -->|Custom| AE[🔗 Custom Endpoint]
    AC -->|Slack| AF[💬 Slack Notification]
    AC -->|Email| AG[📧 Email Alert]
    
    AD --> AH[🎯 External Action]
    AE --> AH
    AF --> AH
    AG --> AH
    
    style A fill:#e1f5fe
    style Q fill:#fff3e0
    style AA fill:#f3e5f5
    style AH fill:#e8f5e8
```

### Key Process Flows

#### 1. **File Upload Security Pipeline**
```
User Upload → Authentication → File Limits (10MB/10 files) → Security Scan → Processing Queue
```

#### 2. **Multi-Tier Analysis Engine**
```
Raw Logs → Parser → [Traditional|ML|AI|Skip] → Risk Scoring → Anomaly Detection
```

#### 3. **SOC Analyst Workflow**
```
Alert Generation → Analyst Review → [Confirm|Investigate|Dismiss] → Action/Webhook
```

#### 4. **Automated Response System**
```
Confirmed Threat → Webhook Trigger → [Zapier|Custom|Slack|Email] → External Action
```

### Security Checkpoints

- 🔐 **Authentication**: Session-based user verification
- 📏 **File Limits**: 10MB per file, 10 files per user maximum
- 🛡️ **Security Scan**: Malware and injection attack prevention
- 🔍 **Content Validation**: Zscaler NSS format verification
- ⚡ **Rate Limiting**: Upload and API request throttling

### SOC Analyst Workflow States

| Status | Description | Available Actions |
|--------|-------------|-------------------|
| `new` | Newly detected anomaly | Confirm, Investigate, Dismiss |
| `investigating` | Under analyst review | Confirm, Dismiss, Add Notes |
| `confirmed` | Verified threat | Archive, Trigger Webhooks |
| `false_positive` | Benign activity | Archive, Update ML Model |
| `archived` | Completed investigation | View Only |

### Webhook Integration Triggers

- **High Risk Anomalies** (Risk Score ≥ 7): Immediate webhook trigger
- **Confirmed Threats**: SOC analyst confirmation triggers automation
- **Bulk Operations**: Mass updates can trigger batch notifications
- **Custom Filters**: User-defined criteria for webhook activation

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
git clone https://github.com/vmuthusamy/sentry-log-analysis.git
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
sentry-log-analysis/
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
- **Unit Test Coverage**: Comprehensive test suite for storage, anomaly detection, file upload validation, and user file limits
- **Integration Test Coverage**: Full API endpoint validation with real database testing and file upload limit enforcement
- **File Upload Security Tests**: Validation of 10MB file size limits and 10 files per user limits with comprehensive error handling
- **Security Scan**: Automated npm audit and dependency vulnerability checks
- **Performance Tests**: Concurrent processing limits and resource optimization
- **Code Quality**: TypeScript strict mode with ESLint code standards

### Automated Quality Gates
- ✅ **TypeScript Compilation**: Strict type checking with zero compilation errors
- ✅ **Code Quality**: ESLint static analysis and formatting standards
- ✅ **Unit Tests**: Storage layer, anomaly detection, file upload limits, and user file count validation
- ✅ **Integration Tests**: Complete API endpoint testing with database and file upload limit enforcement
- ✅ **File Upload Security Tests**: 10MB file size limits and 10 files per user limit validation
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

## 🚀 Potential Improvements

### Algorithm Enhancement Considerations

Our current anomaly detection system provides a solid foundation, but there are several opportunities for improvement based on industry best practices and emerging techniques.

#### Current Implementation Analysis

**Our Existing Approach:**
- Simple rule-based detection with static thresholds
- Traditional ML detector with basic pattern matching
- Advanced ML ensemble with statistical models
- AI-first strategy with graceful fallback hierarchy

#### Enhancement Options & Tradeoffs

##### **Option 1: Enhanced Statistical Baseline (Low Risk, High ROI)**

**Implementation:**
- Isolation Forest for outlier detection
- Z-score analysis with sliding windows
- User Entity Behavioral Analytics (UEBA)
- Dynamic threshold adjustment

**Pros:**
- **Performance**: 1000x faster than deep learning models
- **Accuracy**: Classical ML often outperforms deep learning for log anomaly detection
- **Interpretability**: Easy to explain why alerts triggered
- **Resource efficient**: Minimal computational overhead
- **Training speed**: Nearly instant model updates

**Cons:**
- **Manual feature engineering**: Requires domain expertise to define meaningful features
- **Limited pattern recognition**: May miss complex attack sequences
- **Static rules**: Less adaptive to sophisticated attack evolution

**Implementation Complexity:** Low (2-3 weeks)  
**Maintenance Burden:** Low

##### **Option 2: Advanced ML Ensemble (Medium Risk, Medium ROI)**

**Implementation:**
- One-Class SVM for boundary learning
- DBSCAN for clustering irregular patterns
- LSTM for sequential pattern recognition
- Multi-model voting system

**Pros:**
- **Comprehensive coverage**: Catches both statistical and behavioral anomalies
- **Adaptive learning**: Models evolve with new attack patterns
- **Reduced false positives**: Ensemble voting improves precision
- **Temporal awareness**: LSTM captures attack sequences

**Cons:**
- **Complexity**: Higher implementation and maintenance overhead
- **Training requirements**: Needs significant historical data
- **Computational cost**: 5-10x more resource intensive
- **Hyperparameter tuning**: Requires ongoing optimization

**Implementation Complexity:** Medium (4-6 weeks)  
**Maintenance Burden:** Medium

##### **Option 3: Deep Learning Pipeline (High Risk, Variable ROI)**

**Implementation:**
- Transformer models for semantic log analysis
- Autoencoders for reconstruction-based detection
- CNNs for structured pattern recognition
- Real-time inference pipeline

**Pros:**
- **Sophisticated detection**: Identifies complex, novel attack patterns
- **Semantic understanding**: Processes natural language in logs
- **Adaptive learning**: Continuously improves from new data
- **Research edge**: State-of-the-art capabilities

**Cons:**
- **Resource intensive**: 100x computational overhead
- **Data requirements**: Needs massive labeled datasets
- **Black box**: Difficult to explain detection decisions
- **Training complexity**: Weeks/months for initial model development
- **Maintenance overhead**: Requires ML engineering expertise

**Implementation Complexity:** High (8-12 weeks)  
**Maintenance Burden:** High

#### Current System vs Industry Best Practices

**Strengths (Aligned with Standards):**
- Multi-layered approach with traditional → advanced ML → AI hierarchy
- Fallback strategy with graceful degradation when AI fails
- Risk scoring on 0-10 scale matching industry norms
- Batch processing for efficient high-volume log handling
- Real-time capability for immediate threat detection

**Improvement Opportunities:**
- **Static thresholds**: Need dynamic baseline adjustment
- **Limited behavioral analysis**: Missing user/entity profiling
- **Basic feature extraction**: Could benefit from advanced log parsing
- **No temporal analysis**: Missing sequence pattern detection
- **Limited adaptability**: Rules don't evolve with new threats

#### Recommended Implementation Strategy

**Phase 1: Quick Wins (Immediate - 2 weeks)**
1. **Dynamic thresholding**: Replace static risk scores with adaptive baselines
2. **Enhanced feature extraction**: Add IP geolocation, temporal patterns, user behavior
3. **Improved rule engine**: Add cryptocurrency mining, IoT botnet, fileless attack patterns

**Phase 2: Statistical Enhancement (1 month)**
1. **Isolation Forest integration**: Add unsupervised outlier detection
2. **User behavioral baselines**: Track normal patterns per user/IP
3. **Time-series analysis**: Detect periodic and burst anomalies
4. **False positive reduction**: Implement contextual filtering

**Phase 3: Advanced Capabilities (2-3 months)**
1. **LSTM sequence detection**: Identify multi-step attack patterns
2. **Graph-based analysis**: Network relationship modeling
3. **Ensemble voting**: Combine multiple detection methods
4. **Continuous learning**: Auto-update models from analyst feedback

This phased approach prioritizes practical improvements with proven ROI while maintaining flexibility to add more sophisticated techniques as needed. The key is starting with statistical enhancements that provide immediate value before investing in complex deep learning approaches.

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