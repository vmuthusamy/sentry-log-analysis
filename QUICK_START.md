# Sentry - Quick Start Guide

Get Sentry up and running in minutes! This guide provides the fastest path to deployment.

## 🚀 One-Click Deployment Options

### Option 1: Replit Deployment (Recommended)
1. **Fork this Repl** in Replit
2. **Add your API keys** in the Secrets tab:
   - `OPENAI_API_KEY` or `GOOGLE_API_KEY` (optional, for AI analysis)
3. **Click Deploy** in Replit
4. **Access your app** at the provided URL

### Option 2: Docker Deployment
```bash
# Clone the repository
git clone https://github.com/your-username/sentry.git
cd sentry

# Set up environment
cp .env.example .env
# Edit .env with your database URL and session secret

# Start with Docker Compose
docker-compose up -d

# Access at http://localhost:5000
```

## 🔧 Environment Setup

### Required Environment Variables
```bash
DATABASE_URL=postgresql://user:pass@host:port/database
SESSION_SECRET=your_32_character_random_string
```

### Optional API Keys (for AI Analysis)
```bash
# Add ONE of these for AI-powered analysis:
OPENAI_API_KEY=sk-your-openai-key-here
GOOGLE_API_KEY=your-google-ai-key-here
```

## 📊 How to Use

1. **Sign In** with Google OAuth
2. **Upload Log Files** (.txt or .log format)
3. **Run Analysis**:
   - **Traditional ML**: Fast rule-based detection (no API key needed)
   - **Advanced ML**: Statistical analysis and pattern detection
   - **GenAI Analysis**: AI-powered deep analysis (requires API key)

## 📁 Supported Log Formats

Sentry specializes in **Zscaler NSS** format but works with most log formats:
```
timestamp,sourceIP,action,url,statusCode,category,bytes,userAgent
2024-01-01 10:00:00,192.168.1.100,blocked,malware-site.com,403,Malware,0,curl/7.68.0
```

## 🛡️ Security Features

- **Multi-Method Detection**: Traditional ML + Advanced ML + GenAI
- **Risk Scoring**: 0-10 scale with confidence levels
- **User Isolation**: Each user's data is completely separate
- **API Key Security**: Your keys are encrypted and never shared

## 📈 What You'll See

- **Dashboard**: Real-time overview of threats and anomalies
- **Analysis Results**: Detailed threat breakdowns with explanations
- **Risk Scores**: Clear 0-10 ratings for each detected anomaly
- **Metrics**: Success rates and system performance tracking

## 🔍 Example Analysis Results

Sentry detects:
- ✅ **Malware Access**: Blocked malicious domains
- ✅ **Cryptocurrency Mining**: Suspicious mining activity
- ✅ **Tor/Dark Web**: Anonymous network usage
- ✅ **Data Exfiltration**: Large suspicious transfers
- ✅ **Scanning Activity**: Network reconnaissance attempts

## 💡 Pro Tips

1. **Start with Traditional ML** - Works immediately, no setup required
2. **Add API Keys Later** - Enhance with AI analysis when ready
3. **Upload Sample Files** - Try the example logs in `example-logs/`
4. **Check Metrics** - Monitor system performance and success rates

## 🆘 Need Help?

- **Documentation**: See `README.md` for detailed setup
- **Deployment**: Check `DEPLOYMENT.md` for cloud platforms
- **Issues**: Report bugs on GitHub Issues
- **Examples**: Sample log files in `example-logs/` directory

## 🎯 Next Steps

1. Upload your first log file
2. Try all three analysis methods
3. Explore the dashboard and metrics
4. Set up automated log processing
5. Configure webhooks for real-time alerts

**Ready to secure your infrastructure? Start analyzing logs now!**