---
sidebar_position: 3
---

# Advanced Options

`claude-code-templates` provides several advanced command-line options for more granular control over its behavior.

```bash
# Preview installation without making changes
npx claude-code-templates --dry-run

# Skip all prompts and use defaults
npx claude-code-templates --yes

# Install to custom directory
npx claude-code-templates --directory /path/to/project

# Run comprehensive system health check
npx claude-code-templates --health-check
npx claude-code-templates --health
npx claude-code-templates --check
npx claude-code-templates --verify

# Analyze existing commands 
npx claude-code-templates --commands-stats

# Analyze automation hooks
npx claude-code-templates --hooks-stats

# Analyze MCP server configurations 
npx claude-code-templates --mcps-stats

# Launch real-time analytics dashboard
npx claude-code-templates --analytics
npx cct --analytics
```

For a complete list of options and their descriptions, refer to the [CLI Options](/docs/cli-options) documentation.
