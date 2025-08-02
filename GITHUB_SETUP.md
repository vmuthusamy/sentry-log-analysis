# GitHub Repository Setup Guide

This guide explains how to set up the CI/CD pipeline when deploying Sentry to your own GitHub repository.

## Setting Up CI/CD Pipeline

### 1. Update Repository URLs

After forking or creating your repository, update the following files:

#### Update README.md badges:
```markdown
### Continuous Integration Status
[![CI Pipeline](https://github.com/YOUR_USERNAME/YOUR_REPO_NAME/actions/workflows/ci-simple.yml/badge.svg)](https://github.com/YOUR_USERNAME/YOUR_REPO_NAME/actions/workflows/ci-simple.yml)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/YOUR_USERNAME/YOUR_REPO_NAME)
```

Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your actual GitHub username and repository name.

### 2. Enable GitHub Actions

1. Go to your repository on GitHub
2. Click on the **Actions** tab
3. GitHub will automatically detect the workflow files in `.github/workflows/`
4. Enable Actions for your repository

### 3. Configure Secrets (Optional)

For enhanced security scanning, add these secrets in your repository settings:

#### Repository Settings > Secrets and variables > Actions:

- `SNYK_TOKEN`: Your Snyk authentication token (optional)
- `CODECOV_TOKEN`: Your Codecov upload token (optional)

### 4. Available Workflows

#### **ci-simple.yml** (Recommended)
- Minimal dependencies
- TypeScript compilation check
- Application build verification
- Security audit
- Works out-of-the-box

#### **ci.yml** (Full Featured)
- Complete test suite
- Database integration tests
- Code coverage reporting
- Security scanning with external tools

### 5. Workflow Triggers

Both workflows automatically run on:
- Push to `main` or `develop` branches
- Pull requests to `main` branch

### 6. Local Testing

Before pushing, test locally:

```bash
# TypeScript check
npm run check

# Build application
npm run build

# Security audit
npm audit
```

### 7. Monitoring Build Status

- Check the **Actions** tab in your GitHub repository
- Green checkmarks indicate successful builds
- Red X marks indicate failed builds with detailed logs

### 8. Customizing the Pipeline

Edit `.github/workflows/ci-simple.yml` to:
- Add additional Node.js versions
- Include more test steps
- Add deployment stages
- Configure notifications

### Example Repository URLs

If your repository is at `https://github.com/johnsmith/sentry-security-logs`, update the README.md:

```markdown
### Continuous Integration Status
[![CI Pipeline](https://github.com/johnsmith/sentry-security-logs/actions/workflows/ci-simple.yml/badge.svg)](https://github.com/johnsmith/sentry-security-logs/actions/workflows/ci-simple.yml)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/johnsmith/sentry-security-logs)
```

Replace both instances of `johnsmith/sentry-security-logs` with your actual `username/repository-name`.

### Troubleshooting

**Build failing?**
1. Check the Actions tab for detailed error logs
2. Ensure all required dependencies are in package.json
3. Verify Node.js version compatibility
4. Check for TypeScript compilation errors

**Missing badges?**
1. Ensure workflows have run at least once
2. Verify the repository and workflow names in badge URLs
3. Make sure Actions are enabled for your repository

## Status Indicators

- 🟢 **Passing**: All checks successful
- 🟡 **Pending**: Build in progress
- 🔴 **Failing**: Build encountered errors
- ⚪ **No Status**: No recent builds

The CI/CD pipeline ensures code quality and helps catch issues before deployment to production.