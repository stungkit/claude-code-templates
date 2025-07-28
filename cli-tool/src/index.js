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
    await runAnalytics({});
    return;
  }
  
  if (initialChoice.action === 'chats') {
    console.log(chalk.blue('💬 Launching Claude Code Chats Dashboard...'));
    await runAnalytics({ openTo: 'agents' });
    return;
  }
  
  if (initialChoice.action === 'health') {
    console.log(chalk.blue('🔍 Running Health Check...'));
    const healthResult = await runHealthCheck();
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
    await runAnalytics(options);
    return;
  }
  
  // Handle chats/agents dashboard
  if (options.chats || options.agents) {
    await runAnalytics({ ...options, openTo: 'agents' });
    return;
  }
  
  // Handle health check
  let shouldRunSetup = false;
  if (options.healthCheck || options.health || options.check || options.verify) {
    const healthResult = await runHealthCheck();
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
    // Use defaults
    const selectedLanguage = options.language || projectInfo.detectedLanguage || 'common';
    
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
  console.log(chalk.blue('🌐 View all available templates at: https://davila7.github.io/claude-code-templates/'));
  console.log(chalk.blue('📖 Read the complete documentation at: https://davila7.github.io/claude-code-templates/docu/'));
  
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
  
  // Run post-installation validation
  if (!options.dryRun) {
    await runPostInstallationValidation(targetDir, templateConfig);
  }
}

module.exports = { createClaudeConfig, showMainMenu };