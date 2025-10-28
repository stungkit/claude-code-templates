const { InteractionResponseType } = require('discord-interactions');
const { getComponents, getPopularComponents } = require('../utils/componentsLoader.cjs');
const { createPopularEmbed, createErrorEmbed } = require('../utils/embedBuilder.cjs');

module.exports = async (interaction) => {
  try {
    const type = interaction.data.options.find(opt => opt.name === 'type')?.value;
    const limit = interaction.data.options.find(opt => opt.name === 'limit')?.value || 10;

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
    const popularComponents = getPopularComponents(components, type, limit);

    if (popularComponents.length === 0) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [createErrorEmbed(`No ${type} found.`)],
          flags: 64,
        },
      };
    }

    const embed = createPopularEmbed(popularComponents, type);

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [embed],
      },
    };
  } catch (error) {
    console.error('Error in popular handler:', error);

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [createErrorEmbed('Failed to fetch popular components.')],
        flags: 64,
      },
    };
  }
};
