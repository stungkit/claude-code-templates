---
sidebar_position: 2
---

# Framework-Specific Setup

While the interactive setup is recommended, you can also quickly configure `claude-code-templates` for specific languages and frameworks using direct commands.

## Framework-Specific Quick Setup

Use the `--language` and `--framework` flags to directly set up your project:

```bash
# React + TypeScript project
npx claude-code-templates --language javascript-typescript --framework react --yes

# Python + Django project
npx claude-code-templates --language python --framework django --yes
```

The `--yes` flag will skip all prompts and use default configurations, making the setup process fully automated.

## Interactive Setup (Recommended)

Even when you know your framework, running the tool without specific flags is often the best approach:

```bash
cd my-react-app
npx claude-code-templates
# The tool will auto-detect React and suggest optimal configuration
```

This method allows the tool to intelligently detect your project's environment and offer tailored suggestions, ensuring the best possible setup for your Claude Code workflow.
