# LogGuard - AI-Powered Log Anomaly Detection System

A comprehensive TypeScript-based web application for AI-powered security log anomaly detection, specializing in analyzing Zscaler NSS feed format logs using OpenAI's GPT-4o model.

## Features

- **AI-Powered Analysis**: Uses OpenAI GPT-4o for intelligent threat detection and anomaly scoring
- **Secure Authentication**: Session-based user authentication with PostgreSQL session storage
- **File Upload & Processing**: Secure upload of .txt and .log files with validation and processing
- **Real-time Dashboard**: Comprehensive analytics dashboard with upload, analysis, history, and overview sections
- **Risk Scoring**: 0-10 scale risk assessment with confidence levels and detailed threat analysis
- **Log Format Support**: Specialized parser for Zscaler NSS feed format (comma and tab-separated)

## Tech Stack

### Frontend
- **React 18** with TypeScript for type-safe component development
- **Tailwind CSS** + **Shadcn UI** for modern, responsive design
- **Wouter** for lightweight client-side routing
- **TanStack React Query** for server state management and caching
- **React Hook Form** + **Zod** for type-safe form validation

### Backend
- **Node.js** + **Express.js** for RESTful API development
- **TypeScript** throughout for type safety
- **Passport.js** with local strategy for authentication
- **Multer** for secure file upload handling
- **OpenAI API** integration for AI-powered log analysis

### Database & Storage
- **PostgreSQL** with Neon serverless driver
- **Drizzle ORM** for type-safe database operations
- **Express-session** with PostgreSQL session store
- **Connect-pg-simple** for session persistence

### AI & Analysis
- **OpenAI GPT-4o** for advanced log analysis and threat detection
- **Custom Log Parser** for Zscaler NSS feed format
- **Risk Scoring Algorithm** with confidence levels
- **Pattern Recognition** for various attack types and anomalies

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- OpenAI API key

### Environment Variables

Create a `.env` file with the following variables:

```env
DATABASE_URL=your_postgresql_connection_string
OPENAI_API_KEY=your_openai_api_key
SESSION_SECRET=your_session_secret_key
NODE_ENV=development
```

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/logguard.git
cd logguard
```

2. Install dependencies:
```bash
npm install
```

3. Set up the database:
```bash
npm run db:push
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

### Production Deployment

#### Environment Setup
- Set `NODE_ENV=production`
- Configure production database URL
- Set up proper session secrets
- Configure CORS for your domain

#### Build and Deploy
```bash
npm run build
npm start
```

## Project Structure

```
logguard/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Client utilities
├── server/                 # Backend Express application
│   ├── services/           # Business logic services
│   │   ├── anomaly-detector.ts
│   │   └── log-parser.ts
│   ├── auth.ts            # Authentication setup
│   ├── db.ts              # Database connection
│   ├── routes.ts          # API routes
│   └── storage.ts         # Data access layer
├── shared/                # Shared TypeScript schemas
└── uploads/               # Temporary file storage
```

## API Documentation

### Authentication Endpoints
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/user` - Get current user

### Log Management Endpoints
- `POST /api/upload` - Upload log files
- `GET /api/log-files` - Get user's log files
- `GET /api/log-files/:id` - Get specific log file

### Anomaly Detection Endpoints
- `GET /api/anomalies` - Get user's anomalies
- `GET /api/anomalies/log/:logFileId` - Get anomalies for specific log file
- `PUT /api/anomalies/:id/status` - Update anomaly status

### Analytics Endpoints
- `GET /api/stats` - Get user's dashboard statistics

## AI Analysis Capabilities

The system analyzes logs for:

- **Authentication Anomalies**: Unusual login patterns, failed authentication attempts
- **Geographic Anomalies**: Suspicious location-based access patterns
- **Traffic Anomalies**: Abnormal data volumes, unusual destinations
- **Behavioral Anomalies**: Deviations from normal user patterns
- **Threat Signatures**: Known attack patterns and indicators
- **Time-based Anomalies**: Activities outside normal hours
- **Privilege Escalations**: Unusual permission changes or access attempts

## Log Format Support

### Zscaler NSS Feed Format
The system supports both comma-separated and tab-separated Zscaler NSS logs with fields including:
- Timestamp
- User information
- Source/Destination IPs
- URLs and domains
- Traffic volumes
- Security classifications
- Response codes

## Security Features

- **Secure File Upload**: Type and size validation, temporary storage
- **Session Management**: HTTP-only cookies, secure session storage
- **Input Validation**: Zod schemas for all API inputs
- **Authentication**: Secure password hashing with scrypt
- **Database Security**: Parameterized queries via Drizzle ORM

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -am 'Add your feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues and questions:
- Create an issue on GitHub
- Contact: support@logguard.com

## Acknowledgments

- OpenAI for GPT-4o model capabilities
- Zscaler for NSS feed format documentation
- The open-source community for the excellent tools and libraries used