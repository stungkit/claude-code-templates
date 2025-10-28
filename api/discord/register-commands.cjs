/**
 * Script to register Discord slash commands
 * Run with: node api/discord/register-commands.js
 *
 * Make sure to set these environment variables:
 * - DISCORD_APP_ID
 * - DISCORD_BOT_TOKEN
 * - DISCORD_GUILD_ID (optional, for guild-specific commands)
 */

require('dotenv').config();
const axios = require('axios');

const DISCORD_APP_ID = process.env.DISCORD_APP_ID;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!DISCORD_APP_ID || !DISCORD_BOT_TOKEN) {
  console.error('❌ Missing required environment variables:');
  console.error('   DISCORD_APP_ID and DISCORD_BOT_TOKEN are required');
  process.exit(1);
}

// Define commands
const commands = [
  {
    name: 'search',
    description: 'Search for components by keyword',
    options: [
      {
        name: 'query',
        description: 'Search keyword (e.g., "security", "testing", "database")',
        type: 3, // STRING
        required: true,
      },
      {
        name: 'type',
        description: 'Filter by component type',
        type: 3, // STRING
        required: false,
        choices: [
          { name: '🤖 Agents', value: 'agents' },
          { name: '⚡ Commands', value: 'commands' },
          { name: '🔌 MCPs', value: 'mcps' },
          { name: '⚙️ Settings', value: 'settings' },
          { name: '🪝 Hooks', value: 'hooks' },
          { name: '📋 Templates', value: 'templates' },
          { name: '🧩 Plugins', value: 'plugins' },
        ],
      },
    ],
  },
  {
    name: 'info',
    description: 'Get detailed information about a specific component',
    options: [
      {
        name: 'name',
        description: 'Component name (e.g., "frontend-developer", "security-audit")',
        type: 3, // STRING
        required: true,
      },
      {
        name: 'type',
        description: 'Component type (optional, helps find exact match)',
        type: 3, // STRING
        required: false,
        choices: [
          { name: '🤖 Agents', value: 'agents' },
          { name: '⚡ Commands', value: 'commands' },
          { name: '🔌 MCPs', value: 'mcps' },
          { name: '⚙️ Settings', value: 'settings' },
          { name: '🪝 Hooks', value: 'hooks' },
          { name: '📋 Templates', value: 'templates' },
          { name: '🧩 Plugins', value: 'plugins' },
        ],
      },
    ],
  },
  {
    name: 'install',
    description: 'Get the installation command for a component',
    options: [
      {
        name: 'name',
        description: 'Component name to install',
        type: 3, // STRING
        required: true,
      },
      {
        name: 'type',
        description: 'Component type (optional)',
        type: 3, // STRING
        required: false,
        choices: [
          { name: '🤖 Agents', value: 'agents' },
          { name: '⚡ Commands', value: 'commands' },
          { name: '🔌 MCPs', value: 'mcps' },
          { name: '⚙️ Settings', value: 'settings' },
          { name: '🪝 Hooks', value: 'hooks' },
          { name: '📋 Templates', value: 'templates' },
          { name: '🧩 Plugins', value: 'plugins' },
        ],
      },
    ],
  },
  {
    name: 'popular',
    description: 'View the most popular components by download count',
    options: [
      {
        name: 'type',
        description: 'Component type to filter by',
        type: 3, // STRING
        required: true,
        choices: [
          { name: '🤖 Agents', value: 'agents' },
          { name: '⚡ Commands', value: 'commands' },
          { name: '🔌 MCPs', value: 'mcps' },
          { name: '⚙️ Settings', value: 'settings' },
          { name: '🪝 Hooks', value: 'hooks' },
          { name: '📋 Templates', value: 'templates' },
          { name: '🧩 Plugins', value: 'plugins' },
        ],
      },
      {
        name: 'limit',
        description: 'Number of results to show (default: 10)',
        type: 4, // INTEGER
        required: false,
        min_value: 5,
        max_value: 20,
      },
    ],
  },
  {
    name: 'random',
    description: 'Discover a random component',
    options: [
      {
        name: 'type',
        description: 'Component type to pick from',
        type: 3, // STRING
        required: true,
        choices: [
          { name: '🤖 Agents', value: 'agents' },
          { name: '⚡ Commands', value: 'commands' },
          { name: '🔌 MCPs', value: 'mcps' },
          { name: '⚙️ Settings', value: 'settings' },
          { name: '🪝 Hooks', value: 'hooks' },
          { name: '📋 Templates', value: 'templates' },
          { name: '🧩 Plugins', value: 'plugins' },
        ],
      },
    ],
  },
];

async function registerCommands() {
  try {
    console.log('📦 Registering Discord slash commands...\n');

    // Determine API endpoint
    let url;
    if (DISCORD_GUILD_ID) {
      // Guild-specific (faster for testing)
      url = `https://discord.com/api/v10/applications/${DISCORD_APP_ID}/guilds/${DISCORD_GUILD_ID}/commands`;
      console.log(`   Registering to guild: ${DISCORD_GUILD_ID}`);
    } else {
      // Global (takes up to 1 hour)
      url = `https://discord.com/api/v10/applications/${DISCORD_APP_ID}/commands`;
      console.log('   Registering globally (may take up to 1 hour)');
    }

    const response = await axios.put(url, commands, {
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`\n✅ Successfully registered ${response.data.length} commands!\n`);

    console.log('📝 Registered commands:');
    response.data.forEach((cmd, index) => {
      console.log(`   ${index + 1}. /${cmd.name} - ${cmd.description}`);
    });

    console.log('\n🎉 Registration complete!\n');
    console.log('💡 Next steps:');
    console.log('   1. Set DISCORD_PUBLIC_KEY in your Vercel environment variables');
    console.log('   2. Deploy to Vercel');
    console.log('   3. Set Interactions Endpoint URL in Discord Developer Portal:');
    console.log('      https://your-domain.vercel.app/api/discord/interactions\n');
  } catch (error) {
    console.error('\n❌ Error registering commands:', error.response?.data || error.message);

    if (error.response?.status === 401) {
      console.error('\n💡 Tip: Check that your DISCORD_BOT_TOKEN is correct');
    }

    if (error.response?.status === 404) {
      console.error('\n💡 Tip: Check that your DISCORD_APP_ID is correct');
    }

    process.exit(1);
  }
}

registerCommands();
