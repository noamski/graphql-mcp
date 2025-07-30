# Contributing to GraphQL MCP Server

Thank you for your interest in contributing to GraphQL MCP Server! This document provides guidelines and information for contributors.

## 🤝 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Git
- TypeScript knowledge
- Basic understanding of GraphQL and MCP

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/graphql-mcp.git
   cd graphql-mcp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Run tests**
   ```bash
   npm test
   ```

5. **Start development**
   ```bash
   npm run dev
   ```

## 📋 How to Contribute

### Reporting Issues

Before creating an issue, please:

1. **Search existing issues** to avoid duplicates
2. **Use the issue templates** when available
3. **Provide detailed information**:
   - Clear description of the problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (Node version, OS, etc.)
   - Error messages and stack traces

### Suggesting Features

For feature requests:

1. **Check if it aligns** with the project goals
2. **Search existing issues** for similar requests
3. **Provide detailed specification**:
   - Use case and motivation
   - Proposed API or interface
   - Implementation considerations
   - Alternative solutions considered

### Submitting Code Changes

#### 1. Create a Branch

Create a descriptive branch name:
```bash
git checkout -b feature/add-mutation-support
git checkout -b fix/query-validation-bug
git checkout -b docs/improve-readme
```

#### 2. Make Changes

- **Follow existing code style**
- **Write comprehensive tests**
- **Update documentation**
- **Ensure type safety**

#### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run linting
npm run lint

# Run type checking
npm run typecheck

# Test the build
npm run build
```

#### 4. Commit Changes

Use conventional commit messages:
```bash
git commit -m "feat: add mutation execution support"
git commit -m "fix: resolve query validation edge case"
git commit -m "docs: update API reference"
```

#### 5. Submit Pull Request

- **Use the PR template**
- **Link related issues**
- **Provide clear description**
- **Include test evidence**

## 🧪 Testing Guidelines

### Writing Tests

- **Unit tests** for individual functions
- **Integration tests** for component interactions
- **Error case testing** for edge conditions
- **Mock external dependencies**

```typescript
// Example test structure
describe('GraphQLMCPClient', () => {
  describe('executeQuery', () => {
    it('should execute valid queries successfully', async () => {
      // Test implementation
    });

    it('should handle query errors gracefully', async () => {
      // Test implementation
    });
  });
});
```

### Test Requirements

- All new code must have tests
- Maintain or improve code coverage
- Tests must pass in CI/CD
- Performance-sensitive code needs benchmarks

## 🎨 Code Style Guidelines

### TypeScript Standards

- **Strict TypeScript configuration**
- **Explicit return types** for functions
- **No `any` types** without justification
- **Proper error handling**

```typescript
// Good
async function executeQuery(input: QueryInput): Promise<QueryExecutionResult> {
  try {
    // Implementation
  } catch (error) {
    logger.error('Query execution failed:', error);
    throw new Error(`Query failed: ${error.message}`);
  }
}

// Avoid
async function executeQuery(input: any): Promise<any> {
  // Implementation without error handling
}
```

### Formatting

- Use Prettier for code formatting
- 2 spaces for indentation
- Semicolons required
- Single quotes for strings

### Documentation

- **JSDoc comments** for public APIs
- **Inline comments** for complex logic
- **README updates** for new features
- **Type documentation** for complex types

## 🔒 Security Guidelines

### Security Best Practices

- **Validate all inputs** using Zod schemas
- **Sanitize GraphQL queries** before execution
- **Never log sensitive data** (tokens, passwords)
- **Implement rate limiting** considerations
- **Follow OWASP guidelines**

### Security Review

Security-related changes require:
- Detailed security impact analysis
- Additional review from maintainers
- Security testing considerations

## 📖 Documentation Guidelines

### Documentation Types

1. **Code Documentation**
   - JSDoc for functions and classes
   - Type annotations
   - Inline comments for complex logic

2. **User Documentation**
   - README updates
   - API reference
   - Usage examples

3. **Developer Documentation**
   - Architecture decisions
   - Development setup
   - Troubleshooting guides

### Writing Style

- **Clear and concise**
- **Use examples** liberally
- **Keep up-to-date** with code changes
- **Follow markdown standards**

## 🚦 Review Process

### What We Look For

1. **Functionality**
   - Does it work as expected?
   - Are edge cases handled?
   - Is error handling appropriate?

2. **Code Quality**
   - Is it readable and maintainable?
   - Does it follow project conventions?
   - Are types properly defined?

3. **Testing**
   - Are there adequate tests?
   - Do tests cover edge cases?
   - Is coverage maintained?

4. **Documentation**
   - Is public API documented?
   - Are examples provided?
   - Is README updated if needed?

### Review Timeline

- **Initial response**: Within 48 hours
- **Full review**: Within 1 week
- **Follow-up**: Based on complexity

## 🏗️ Project Structure

```
graphql-mcp/
├── src/
│   ├── types.ts           # Type definitions
│   ├── graphql-client.ts  # GraphQL client implementation
│   ├── mcp-server.ts      # MCP server implementation
│   ├── index.ts           # Entry point
│   └── utils/
│       ├── logger.ts      # Logging utilities
│       └── validation.ts  # Validation utilities
├── docs/                  # Documentation
├── examples/              # Usage examples
├── tests/                 # Test files
└── dist/                  # Built output
```

## 🎯 Development Focus Areas

We're particularly interested in contributions in these areas:

1. **Performance Optimization**
   - Query complexity analysis
   - Caching improvements
   - Memory usage optimization

2. **Security Enhancements**
   - Additional validation
   - Security audit tools
   - Rate limiting features

3. **Developer Experience**
   - Better error messages
   - Improved debugging tools
   - Enhanced logging

4. **Documentation**
   - More examples
   - Video tutorials
   - Integration guides

5. **Testing**
   - Integration tests
   - Performance tests
   - End-to-end scenarios

## 📬 Communication

### Getting Help

- **GitHub Discussions** for questions
- **Discord/Slack** for real-time chat (link in README)
- **Email** for security issues

### Staying Updated

- **Watch the repository** for notifications
- **Follow releases** for updates
- **Join mailing list** for announcements

## 🎉 Recognition

Contributors are recognized through:

- **Contributors list** in README
- **Release notes** mentions
- **Special thanks** in documentation
- **Contributor badge** eligibility

Thank you for contributing to GraphQL MCP Server! 🚀