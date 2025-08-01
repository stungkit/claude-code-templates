const inquirer = require('inquirer');
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const ora = require('ora');
const { detectProject } = require('./utils');
const { getTemplateConfig, TEMPLATES_CONFIG } = require('./templates');
const { createPrompts, interactivePrompts } = require('./prompts');
const { copyTemplateFiles, runPostInstallationValidation } = require('./file-operations');
const { getHooksForLanguage, getMCPsForLanguage } = require('./hook-scanner');
const { installAgents } = require('./agents');
const { runCommandStats } = require('./command-stats');
const { runHookStats } = require('./hook-stats');
const { runMCPStats } = require('./mcp-stats');
const { runAnalytics } = require('./analytics');
const { runHealthCheck } = require('./health-check');
const { trackingService } = require('./tracking-service');

async function showMainMenu() {
  console.log('');
  
  const initialChoice = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'What would you like to do?',
    choices: [
      {
        name: '📊 Analytics Dashboard - Monitor your Claude Code usage and sessions',
        value: 'analytics',
        short: 'Analytics Dashboard'
      },
      {
        name: '💬 Chats Dashboard - View and analyze your Claude conversations',
        value: 'chats',
        short: 'Chats Dashboard'
      },
      {
        name: '⚙️ Project Setup - Configure Claude Code for your project',
        value: 'setup',
        short: 'Project Setup'
      },
      {
        name: '🔍 Health Check - Verify your Claude Code setup and configuration',
        value: 'health',
        short: 'Health Check'
      }
    ],
    default: 'analytics'
  }]);
  
  if (initialChoice.action === 'analytics') {
    console.log(chalk.blue('📊 Launching Claude Code Analytics Dashboard...'));
    trackingService.trackAnalyticsDashboard({ page: 'dashboard', source: 'interactive_menu' });
    await runAnalytics({});
    return;
  }
  
  if (initialChoice.action === 'chats') {
    console.log(chalk.blue('💬 Launching Claude Code Chats Dashboard...'));
    trackingService.trackAnalyticsDashboard({ page: 'agents', source: 'interactive_menu' });
    await runAnalytics({ openTo: 'agents' });
    return;
  }
  
  if (initialChoice.action === 'health') {
    console.log(chalk.blue('🔍 Running Health Check...'));
    const healthResult = await runHealthCheck();
    
    // Track health check usage
    trackingService.trackHealthCheck({
      setup_recommended: healthResult.runSetup,
      issues_found: healthResult.issues || 0
    });
    
    if (healthResult.runSetup) {
      console.log(chalk.blue('⚙️  Starting Project Setup...'));
      // Continue with setup flow
      return await createClaudeConfig({});
    } else {
      console.log(chalk.green('👍 Health check completed. Returning to main menu...'));
      return await showMainMenu();
    }
  }
  
  // Continue with setup if user chose 'setup'
  console.log(chalk.blue('⚙️  Setting up Claude Code configuration...'));
  return await createClaudeConfig({ setupFromMenu: true });
}

async function createClaudeConfig(options = {}) {
  const targetDir = options.directory || process.cwd();
  
  // Handle individual component installation
  if (options.agent) {
    await installIndividualAgent(options.agent, targetDir, options);
    return;
  }
  
  if (options.command) {
    await installIndividualCommand(options.command, targetDir, options);
    return;
  }
  
  if (options.mcp) {
    await installIndividualMCP(options.mcp, targetDir, options);
    return;
  }
  
  // Handle command stats analysis (both singular and plural)
  if (options.commandStats || options.commandsStats) {
    await runCommandStats(options);
    return;
  }
  
  // Handle hook stats analysis (both singular and plural)
  if (options.hookStats || options.hooksStats) {
    await runHookStats(options);
    return;
  }
  
  // Handle MCP stats analysis (both singular and plural)
  if (options.mcpStats || options.mcpsStats) {
    await runMCPStats(options);
    return;
  }
  
  // Handle analytics dashboard
  if (options.analytics) {
    trackingService.trackAnalyticsDashboard({ page: 'dashboard', source: 'command_line' });
    await runAnalytics(options);
    return;
  }
  
  // Handle chats/agents dashboard
  if (options.chats || options.agents) {
    trackingService.trackAnalyticsDashboard({ page: 'agents', source: 'command_line' });
    await runAnalytics({ ...options, openTo: 'agents' });
    return;
  }
  
  // Handle health check
  let shouldRunSetup = false;
  if (options.healthCheck || options.health || options.check || options.verify) {
    const healthResult = await runHealthCheck();
    
    // Track health check usage
    trackingService.trackHealthCheck({
      setup_recommended: healthResult.runSetup,
      issues_found: healthResult.issues || 0,
      source: 'command_line'
    });
    
    if (healthResult.runSetup) {
      console.log(chalk.blue('⚙️  Starting Project Setup...'));
      shouldRunSetup = true;
    } else {
      console.log(chalk.green('👍 Health check completed. Returning to main menu...'));
      return await showMainMenu();
    }
  }
  
  // Add initial choice prompt (only if no specific options are provided and not continuing from health check or menu)
  if (!shouldRunSetup && !options.setupFromMenu && !options.yes && !options.language && !options.framework && !options.dryRun) {
    return await showMainMenu();
  } else {
    console.log(chalk.blue('🚀 Setting up Claude Code configuration...'));
  }
  
  console.log(chalk.gray(`Target directory: ${targetDir}`));
  
  // Detect existing project
  const spinner = ora('Detecting project type...').start();
  const projectInfo = await detectProject(targetDir);
  spinner.succeed('Project detection complete');
  
  let config;
  if (options.yes) {
    // Use defaults - prioritize --template over --language for backward compatibility
    const selectedLanguage = options.template || options.language || projectInfo.detectedLanguage || 'common';
    
    // Check if selected language is coming soon
    if (selectedLanguage && TEMPLATES_CONFIG[selectedLanguage] && TEMPLATES_CONFIG[selectedLanguage].comingSoon) {
      console.log(chalk.red(`❌ ${selectedLanguage} is not available yet. Coming soon!`));
      console.log(chalk.yellow('Available languages: common, javascript-typescript, python'));
      return;
    }
    const availableHooks = getHooksForLanguage(selectedLanguage);
    const defaultHooks = availableHooks.filter(hook => hook.checked).map(hook => hook.id);
    const availableMCPs = getMCPsForLanguage(selectedLanguage);
    const defaultMCPs = availableMCPs.filter(mcp => mcp.checked).map(mcp => mcp.id);
    
    config = {
      language: selectedLanguage,
      framework: options.framework || projectInfo.detectedFramework || 'none',
      features: [],
      hooks: defaultHooks,
      mcps: defaultMCPs
    };
  } else {
    // Interactive prompts with back navigation
    config = await interactivePrompts(projectInfo, options);
  }
  
  // Check if user confirmed the setup
  if (config.confirm === false) {
    console.log(chalk.yellow('⏹️  Setup cancelled by user.'));
    return;
  }

  // Handle analytics option from onboarding
  if (config.analytics) {
    console.log(chalk.blue('📊 Launching Claude Code Analytics Dashboard...'));
    await runAnalytics(options);
    return;
  }
  
  // Get template configuration
  const templateConfig = getTemplateConfig(config);
  
  // Add selected hooks to template config
  if (config.hooks) {
    templateConfig.selectedHooks = config.hooks;
    templateConfig.language = config.language; // Ensure language is available for hook filtering
  }
  
  // Add selected MCPs to template config
  if (config.mcps) {
    templateConfig.selectedMCPs = config.mcps;
    templateConfig.language = config.language; // Ensure language is available for MCP filtering
  }
  
  // Install selected agents
  if (config.agents && config.agents.length > 0) {
    console.log(chalk.blue('🤖 Installing Claude Code agents...'));
    await installAgents(config.agents, targetDir);
  }
  
  if (options.dryRun) {
    console.log(chalk.yellow('🔍 Dry run - showing what would be copied:'));
    templateConfig.files.forEach(file => {
      console.log(chalk.gray(`  - ${file.source} → ${file.destination}`));
    });
    return;
  }
  
  // Copy template files
  const copySpinner = ora('Copying template files...').start();
  try {
    const result = await copyTemplateFiles(templateConfig, targetDir, options);
    if (result === false) {
      copySpinner.info('Setup cancelled by user');
      return; // Exit early if user cancelled
    }
    copySpinner.succeed('Template files copied successfully');
  } catch (error) {
    copySpinner.fail('Failed to copy template files');
    throw error;
  }
  
  // Show success message
  console.log(chalk.green('✅ Claude Code configuration setup complete!'));
  console.log(chalk.cyan('📚 Next steps:'));
  console.log(chalk.white('  1. Review the generated CLAUDE.md file'));
  console.log(chalk.white('  2. Customize the configuration for your project'));
  console.log(chalk.white('  3. Start using Claude Code with: claude'));
  console.log('');
  console.log(chalk.blue('🌐 View all available templates at: https://aitmpl.com/'));
  console.log(chalk.blue('📖 Read the complete documentation at: https://aitmpl.com/docu/'));
  
  if (config.language !== 'common') {
    console.log(chalk.yellow(`💡 Language-specific features for ${config.language} have been configured`));
  }
  
  if (config.framework !== 'none') {
    console.log(chalk.yellow(`🎯 Framework-specific commands for ${config.framework} are available`));
  }
  
  if (config.hooks && config.hooks.length > 0) {
    console.log(chalk.magenta(`🔧 ${config.hooks.length} automation hooks have been configured`));
  }
  
  if (config.mcps && config.mcps.length > 0) {
    console.log(chalk.blue(`🔧 ${config.mcps.length} MCP servers have been configured`));
  }

  // Track successful template installation
  if (!options.agent && !options.command && !options.mcp) {
    trackingService.trackTemplateInstallation(config.language, config.framework, {
      installation_method: options.setupFromMenu ? 'interactive_menu' : 'command_line',
      dry_run: options.dryRun || false,
      hooks_count: config.hooks ? config.hooks.length : 0,
      mcps_count: config.mcps ? config.mcps.length : 0,
      project_detected: !!options.detectedProject
    });
  }
  
  // Run post-installation validation
  if (!options.dryRun) {
    await runPostInstallationValidation(targetDir, templateConfig);
  }
}

// Individual component installation functions
async function installIndividualAgent(agentName, targetDir, options) {
  console.log(chalk.blue(`🤖 Installing agent: ${agentName}`));
  
  try {
    // Support both category/agent-name and direct agent-name formats
    let githubUrl;
    if (agentName.includes('/')) {
      // Category/agent format: deep-research-team/academic-researcher
      githubUrl = `https://raw.githubusercontent.com/davila7/claude-code-templates/main/cli-tool/components/agents/${agentName}.md`;
    } else {
      // Direct agent format: api-security-audit
      githubUrl = `https://raw.githubusercontent.com/davila7/claude-code-templates/main/cli-tool/components/agents/${agentName}.md`;
    }
    
    console.log(chalk.gray(`📥 Downloading from GitHub (main branch)...`));
    
    const response = await fetch(githubUrl);
    if (!response.ok) {
      if (response.status === 404) {
        console.log(chalk.red(`❌ Agent "${agentName}" not found`));
        await showAvailableAgents();
        return;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const agentContent = await response.text();
    
    // Create .claude/agents directory if it doesn't exist
    const agentsDir = path.join(targetDir, '.claude', 'agents');
    await fs.ensureDir(agentsDir);
    
    // Write the agent file - preserve folder structure if it exists
    let targetFile;
    if (agentName.includes('/')) {
      const [category, filename] = agentName.split('/');
      const categoryDir = path.join(agentsDir, category);
      await fs.ensureDir(categoryDir);
      targetFile = path.join(categoryDir, `${filename}.md`);
    } else {
      targetFile = path.join(agentsDir, `${agentName}.md`);
    }
    
    await fs.writeFile(targetFile, agentContent, 'utf8');
    
    console.log(chalk.green(`✅ Agent "${agentName}" installed successfully!`));
    console.log(chalk.cyan(`📁 Installed to: ${path.relative(targetDir, targetFile)}`));
    console.log(chalk.cyan(`📦 Downloaded from: ${githubUrl}`));
    
    // Track successful agent installation
    trackingService.trackDownload('agent', agentName, {
      installation_type: 'individual_component',
      target_directory: path.relative(process.cwd(), targetDir),
      source: 'github_main'
    });
    
  } catch (error) {
    console.log(chalk.red(`❌ Error installing agent: ${error.message}`));
  }
}

async function installIndividualCommand(commandName, targetDir, options) {
  console.log(chalk.blue(`⚡ Installing command: ${commandName}`));
  
  try {
    // Download command directly from GitHub
    const githubUrl = `https://raw.githubusercontent.com/davila7/claude-code-templates/main/cli-tool/components/commands/${commandName}.md`;
    console.log(chalk.gray(`📥 Downloading from GitHub (main branch)...`));
    
    const response = await fetch(githubUrl);
    if (!response.ok) {
      if (response.status === 404) {
        console.log(chalk.red(`❌ Command "${commandName}" not found`));
        console.log(chalk.yellow('Available commands: check-file, generate-tests'));
        return;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const commandContent = await response.text();
    
    // Create .claude/commands directory if it doesn't exist
    const commandsDir = path.join(targetDir, '.claude', 'commands');
    await fs.ensureDir(commandsDir);
    
    // Write the command file
    const targetFile = path.join(commandsDir, `${commandName}.md`);
    await fs.writeFile(targetFile, commandContent, 'utf8');
    
    console.log(chalk.green(`✅ Command "${commandName}" installed successfully!`));
    console.log(chalk.cyan(`📁 Installed to: ${path.relative(targetDir, targetFile)}`));
    console.log(chalk.cyan(`📦 Downloaded from: ${githubUrl}`));
    
    // Track successful command installation
    trackingService.trackDownload('command', commandName, {
      installation_type: 'individual_command',
      target_directory: path.relative(process.cwd(), targetDir),
      source: 'github_main'
    });
    
  } catch (error) {
    console.log(chalk.red(`❌ Error installing command: ${error.message}`));
  }
}

async function installIndividualMCP(mcpName, targetDir, options) {
  console.log(chalk.blue(`🔌 Installing MCP: ${mcpName}`));
  
  try {
    // Download MCP directly from GitHub
    const githubUrl = `https://raw.githubusercontent.com/davila7/claude-code-templates/main/cli-tool/components/mcps/${mcpName}.json`;
    console.log(chalk.gray(`📥 Downloading from GitHub (main branch)...`));
    
    const response = await fetch(githubUrl);
    if (!response.ok) {
      if (response.status === 404) {
        console.log(chalk.red(`❌ MCP "${mcpName}" not found`));
        console.log(chalk.yellow('Available MCPs: web-fetch, filesystem-access, github-integration, memory-integration, mysql-integration, postgresql-integration, deepgraph-react, deepgraph-nextjs, deepgraph-typescript, deepgraph-vue'));
        return;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const mcpConfigText = await response.text();
    const mcpConfig = JSON.parse(mcpConfigText);
    
    // Check if .mcp.json exists in target directory
    const targetMcpFile = path.join(targetDir, '.mcp.json');
    let existingConfig = {};
    
    if (await fs.pathExists(targetMcpFile)) {
      existingConfig = await fs.readJson(targetMcpFile);
      console.log(chalk.yellow('📝 Existing .mcp.json found, merging configurations...'));
    }
    
    // Merge configurations with deep merge for mcpServers
    const mergedConfig = {
      ...existingConfig,
      ...mcpConfig
    };
    
    // Deep merge mcpServers specifically to avoid overwriting existing servers
    if (existingConfig.mcpServers && mcpConfig.mcpServers) {
      mergedConfig.mcpServers = {
        ...existingConfig.mcpServers,
        ...mcpConfig.mcpServers
      };
    }
    
    // Write the merged configuration
    await fs.writeJson(targetMcpFile, mergedConfig, { spaces: 2 });
    
    console.log(chalk.green(`✅ MCP "${mcpName}" installed successfully!`));
    console.log(chalk.cyan(`📁 Configuration merged into: ${path.relative(targetDir, targetMcpFile)}`));
    console.log(chalk.cyan(`📦 Downloaded from: ${githubUrl}`));
    
    // Track successful MCP installation
    trackingService.trackDownload('mcp', mcpName, {
      installation_type: 'individual_mcp',
      merged_with_existing: existingConfig !== null,
      servers_count: Object.keys(mergedConfig.mcpServers || {}).length,
      source: 'github_main'
    });
    
  } catch (error) {
    console.log(chalk.red(`❌ Error installing MCP: ${error.message}`));
  }
}

// Helper functions to extract language/framework from agent content
function extractLanguageFromAgent(content, agentName) {
  // Try to determine language from agent content or filename
  if (agentName.includes('react') || content.includes('React')) return 'javascript-typescript';
  if (agentName.includes('django') || content.includes('Django')) return 'python';
  if (agentName.includes('fastapi') || content.includes('FastAPI')) return 'python';
  if (agentName.includes('flask') || content.includes('Flask')) return 'python';
  if (agentName.includes('rails') || content.includes('Rails')) return 'ruby';
  if (agentName.includes('api-security') || content.includes('API security')) return 'javascript-typescript';
  if (agentName.includes('database') || content.includes('database')) return 'javascript-typescript';
  
  // Default to javascript-typescript for general agents
  return 'javascript-typescript';
}

function extractFrameworkFromAgent(content, agentName) {
  // Try to determine framework from agent content or filename
  if (agentName.includes('react') || content.includes('React')) return 'react';
  if (agentName.includes('django') || content.includes('Django')) return 'django';
  if (agentName.includes('fastapi') || content.includes('FastAPI')) return 'fastapi';
  if (agentName.includes('flask') || content.includes('Flask')) return 'flask';
  if (agentName.includes('rails') || content.includes('Rails')) return 'rails';
  
  // For general agents, return none to install the base template
  return 'none';
}

/**
 * Fetch available agents dynamically from GitHub repository
 */
async function getAvailableAgentsFromGitHub() {
  try {
    const response = await fetch('https://api.github.com/repos/davila7/claude-code-templates/contents/cli-tool/components/agents');
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const contents = await response.json();
    const agents = [];
    
    for (const item of contents) {
      if (item.type === 'file' && item.name.endsWith('.md')) {
        // Direct agent file
        agents.push({
          name: item.name.replace('.md', ''),
          path: item.name.replace('.md', ''),
          category: 'root'
        });
      } else if (item.type === 'dir') {
        // Category directory, fetch its contents
        try {
          const categoryResponse = await fetch(`https://api.github.com/repos/davila7/claude-code-templates/contents/cli-tool/components/agents/${item.name}`);
          if (categoryResponse.ok) {
            const categoryContents = await categoryResponse.json();
            for (const categoryItem of categoryContents) {
              if (categoryItem.type === 'file' && categoryItem.name.endsWith('.md')) {
                agents.push({
                  name: categoryItem.name.replace('.md', ''),
                  path: `${item.name}/${categoryItem.name.replace('.md', '')}`,
                  category: item.name
                });
              }
            }
          }
        } catch (error) {
          console.warn(`Warning: Could not fetch category ${item.name}:`, error.message);
        }
      }
    }
    
    return agents;
  } catch (error) {
    console.warn('Warning: Could not fetch agents from GitHub, using fallback list');
    // Fallback to basic list if GitHub API fails
    return [
      { name: 'api-security-audit', path: 'api-security-audit', category: 'root' },
      { name: 'database-optimization', path: 'database-optimization', category: 'root' },
      { name: 'react-performance-optimization', path: 'react-performance-optimization', category: 'root' }
    ];
  }
}

/**
 * Show available agents organized by category
 */
async function showAvailableAgents() {
  console.log(chalk.yellow('\n📋 Available Agents:'));
  console.log(chalk.gray('Use format: category/agent-name or just agent-name for root level\n'));
  console.log(chalk.gray('⏳ Fetching latest agents from GitHub...\n'));
  
  const agents = await getAvailableAgentsFromGitHub();
  
  // Group agents by category
  const groupedAgents = agents.reduce((acc, agent) => {
    const category = agent.category === 'root' ? '🤖 General Agents' : `📁 ${agent.category}`;
    if (!acc[category]) acc[category] = [];
    acc[category].push(agent);
    return acc;
  }, {});
  
  // Display agents by category
  Object.entries(groupedAgents).forEach(([category, categoryAgents]) => {
    console.log(chalk.cyan(category));
    categoryAgents.forEach(agent => {
      console.log(chalk.gray(`  • ${agent.path}`));
    });
    console.log('');
  });
  
  console.log(chalk.blue('Examples:'));
  console.log(chalk.gray('  cct --agent api-security-audit'));
  console.log(chalk.gray('  cct --agent deep-research-team/academic-researcher'));
  console.log('');
}

module.exports = { createClaudeConfig, showMainMenu };