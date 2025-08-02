# Contributing to Sentry

Thank you for your interest in contributing to Sentry! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/<your-repo-name>.git
   cd <your-repo-name>
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Set up your development environment following the README.md instructions

## Development Workflow

### Branch Naming

Use descriptive branch names with prefixes:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test improvements

Example: `feature/enhanced-anomaly-detection`

### Code Style

- Use TypeScript throughout the project
- Follow existing code formatting (Prettier configuration)
- Use meaningful variable and function names
- Add JSDoc comments for complex functions
- Follow the existing architecture patterns

### Testing

Before submitting a pull request:
1. Test your changes thoroughly
2. Ensure the application builds without errors:
   ```bash
   npm run build
   ```
3. Test with sample log files in the `example-logs/` directory
4. Verify database migrations work correctly

### Commit Messages

Use conventional commit format:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Test additions or modifications
- `chore:` - Maintenance tasks

Example: `feat: add support for JSON log format parsing`

## Pull Request Process

1. Ensure your fork is up to date with the main repository
2. Create a new branch for your changes
3. Make your changes and commit them with descriptive messages
4. Push your branch to your fork
5. Create a pull request with:
   - Clear title and description
   - Reference to any related issues
   - Screenshots for UI changes
   - Testing instructions

### Pull Request Template

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Refactoring

## Testing
- [ ] Tested locally
- [ ] Tested with sample log files
- [ ] No TypeScript errors
- [ ] Application builds successfully

## Screenshots (if applicable)
Add screenshots for UI changes.

## Related Issues
Closes #issue_number
```

## Code Review Process

All submissions require review. The review process includes:
1. Code quality and style review
2. Security considerations
3. Performance impact assessment
4. Testing coverage evaluation

## Areas for Contribution

### High Priority
- Additional log format parsers
- Enhanced anomaly detection algorithms
- Performance optimizations
- Security improvements
- Documentation improvements

### Medium Priority
- UI/UX enhancements
- Additional dashboard features
- Export/import functionality
- API rate limiting
- Caching improvements

### Low Priority
- Code refactoring
- Additional test coverage
- Accessibility improvements
- Internationalization

## Reporting Issues

When reporting issues, please include:
1. Clear description of the problem
2. Steps to reproduce
3. Expected vs actual behavior
4. Environment details (OS, Node.js version, etc.)
5. Relevant log files or error messages
6. Screenshots if applicable

Use the GitHub issue templates when available.

## Security

For security-related issues:
1. Do NOT create public GitHub issues
2. Email security concerns to: security@logguard.com
3. Include detailed information about the vulnerability
4. Allow reasonable time for response before public disclosure

## Documentation

When contributing:
- Update relevant documentation
- Add JSDoc comments for new functions
- Update API documentation for new endpoints
- Include usage examples where helpful

## Development Environment

### Required Tools
- Node.js 18+
- PostgreSQL 14+
- Git
- Code editor with TypeScript support

### Recommended Setup
- VS Code with TypeScript extensions
- PostgreSQL client (pgAdmin, DBeaver, etc.)
- API testing tool (Postman, Insomnia, etc.)
- Git GUI client (optional)

### Environment Variables
Copy `.env.example` to `.env` and configure:
- Database connection
- OpenAI API key
- Session secret

## Community Guidelines

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Follow the code of conduct
- Stay focused on project goals

## Recognition

Contributors will be recognized in:
- Project README
- Release notes for significant contributions
- GitHub contributors section

## Questions?

- Check existing issues and discussions
- Ask in GitHub Discussions
- Review documentation thoroughly
- Contact maintainers if needed

Thank you for contributing to Sentry!