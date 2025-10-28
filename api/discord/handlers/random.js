const { InteractionResponseType } = require('discord-interactions');
const { getComponents, getRandomComponent } = require('../utils/componentsLoader');
const { createComponentEmbed, createErrorEmbed } = require('../utils/embedBuilder');

module.exports = async (interaction) => {
  try {
    const type = interaction.data.options.find(opt => opt.name === 'type')?.value;

    if (!type) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [createErrorEmbed('Please select a component type')],
          flags: 64,
        },
      };
    }

    const components = await getComponents();
    const randomComponent = getRandomComponent(components, type);

    if (!randomComponent) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [createErrorEmbed(`No ${type} available.`)],
          flags: 64,
        },
      };
    }

    const embed = createComponentEmbed(randomComponent);

    // Add random emoji and custom footer
    embed.title = `🎲 ${embed.title}`;
    embed.footer = { text: 'Use /random again to discover more!' };

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [embed],
      },
    };
  } catch (error) {
    console.error('Error in random handler:', error);

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [createErrorEmbed('Failed to fetch random component.')],
        flags: 64,
      },
    };
  }
};
