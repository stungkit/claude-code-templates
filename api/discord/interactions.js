const { verifyKey } = require('discord-interactions');
const { InteractionType, InteractionResponseType } = require('discord-interactions');

// Import command handlers
const searchHandler = require('./handlers/search');
const infoHandler = require('./handlers/info');
const installHandler = require('./handlers/install');
const popularHandler = require('./handlers/popular');
const randomHandler = require('./handlers/random');

// Command handlers mapping
const commandHandlers = {
  search: searchHandler,
  info: infoHandler,
  install: installHandler,
  popular: popularHandler,
  random: randomHandler,
};

/**
 * Vercel serverless function for Discord interactions
 */
module.exports = async (req, res) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  const rawBody = JSON.stringify(req.body);

  // Verify request is from Discord
  const publicKey = process.env.DISCORD_PUBLIC_KEY;

  if (!publicKey) {
    console.error('DISCORD_PUBLIC_KEY not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const isValidRequest = verifyKey(rawBody, signature, timestamp, publicKey);

  if (!isValidRequest) {
    console.error('Invalid request signature');
    return res.status(401).json({ error: 'Invalid request signature' });
  }

  const interaction = req.body;

  // Handle PING (Discord verification)
  if (interaction.type === InteractionType.PING) {
    console.log('📡 Discord PING received');
    return res.status(200).json({
      type: InteractionResponseType.PONG,
    });
  }

  // Handle application commands
  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const commandName = interaction.data.name;
    console.log(`🔹 Command received: /${commandName}`);

    const handler = commandHandlers[commandName];

    if (!handler) {
      console.error(`Unknown command: ${commandName}`);
      return res.status(200).json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: '❌ Unknown command',
          flags: 64, // Ephemeral
        },
      });
    }

    try {
      // Execute command handler
      const response = await handler(interaction);
      return res.status(200).json(response);
    } catch (error) {
      console.error(`Error executing ${commandName}:`, error);

      return res.status(200).json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: '❌ An error occurred while processing your command.',
          flags: 64, // Ephemeral
        },
      });
    }
  }

  // Unknown interaction type
  console.warn('Unknown interaction type:', interaction.type);
  return res.status(400).json({ error: 'Unknown interaction type' });
};
