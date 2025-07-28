---
sidebar_position: 1
---

# Claude Code Templates

**Claude Code Templates** is a powerful Command Line Interface (CLI) tool designed to streamline the setup, configuration, and monitoring of your Claude Code projects. It provides a comprehensive stack of internal tools to ensure the correct and efficient utilization of Claude Code within your development workflow.

## Key Functionalities

The core functionality of `claude-code-templates` revolves around these key areas:

```bash
npx claude-code-templates@latest
```

### 🚀 Project Setup & Configuration
Automated project configuration and optimization:
- **Framework Detection**: Automatically identifies your project type (e.g., React, Vue, Angular, Django, FastAPI) and suggests optimal configurations.
- **CLAUDE.md Generation**: Creates a customized `CLAUDE.md` file with project-specific instructions and best practices.
- **Command Configuration**: Sets up pre-configured development, build, and test commands tailored to your stack.
- **Agent Installation**: Installs specialized Claude Code agents for framework-specific assistance.
- **Workflow Optimization**: Implements Claude Code-specific enhancements and best practices for an optimized development workflow.

### 📊 Real-time Analytics Dashboard & Agent Chats Manager
Complementary monitoring and analysis tools:
- **Live Session Tracking**: Monitor active Claude Code conversations and their status in real-time.
- **Usage Statistics**: Gain insights into total sessions, token usage, and project activity trends.
- **Conversation History**: Access complete session logs with export capabilities (CSV/JSON).
- **Performance Metrics**: Track Claude Code agent performance and identify optimization opportunities.
- **Web Interface**: Access a clean, terminal-style dashboard at `http://localhost:3333` for real-time monitoring.

### 🔍 Comprehensive Health Check
Environment and configuration validation:
- **System Requirements Verification**: Validates your operating system, Node.js version, memory, and network connectivity.
- **Claude Code Setup Validation**: Checks Claude Code installation, authentication, and permissions.
- **Project Configuration Analysis**: Analyzes your project structure and configuration files for potential issues.
- **Custom Commands & Hooks Validation**: Verifies the integrity and availability of your custom slash commands and automation hooks.
- **Overall Health Score**: Provides an overall system health percentage with actionable recommendations for improvements.

## Quick Start

### 1. Interactive Project Setup (Main Use Case)
```bash
cd your-project-directory
npx claude-code-templates
# This will guide you through an interactive setup for project configuration and template installation.
```

### 2. Launch Real-time Analytics Dashboard
```bash
npx claude-code-templates --chats
# This will launch the real-time monitoring dashboard, accessible at http://localhost:3333.
```

### 3. Run Comprehensive Health Check
```bash
npx claude-code-templates --health
# This command performs a comprehensive system validation and provides optimization recommendations.
```

## Technical Architecture

Built with modern Node.js technologies:
- **CLI Framework**: Commander.js for robust command-line interface management.
- **File Operations**: `fs-extra` for enhanced file system operations.
- **Template Engine**: Custom template processing and generation for dynamic project setups.
- **Analytics Server**: Express.js with WebSocket support for real-time data streaming (optional).
- **Monitoring**: Chokidar for efficient file system watching (primarily for analytics).

## Documentation

- **[Project Setup & Configuration](./project-setup/interactive-setup)** - Detailed guide on setting up your projects.
- **[Analytics Dashboard](./analytics/overview)** - Explore real-time monitoring and analysis tools.
- **[Health Check](./health-check/overview)** - Understand system validation and optimization.
-   **[Core Concepts](/docs/project-setup/what-gets-installed)** - Dive into the underlying structure and components.
- **[Usage Examples](./usage-examples/interactive-setup)** - Practical examples of how to use the CLI.
- **[CLI Options](./cli-options)** - A complete reference of all available command-line options.
- **[Safety Features](./safety-features)** - Learn about the built-in safeguards.
- **[Contributing](./contributing)** - Guidelines for contributing to the project.
- **[Support](./support)** - Where to find help and report issues.
