const { InteractionResponseType } = require('discord-interactions');
const { getComponents, searchComponents } = require('../utils/componentsLoader');
const { createSearchResultsEmbed, createErrorEmbed } = require('../utils/embedBuilder');

module.exports = async (interaction) => {
  try {
    // Get options
    const query = interaction.data.options.find(opt => opt.name === 'query')?.value;
    const type = interaction.data.options.find(opt => opt.name === 'type')?.value || null;

    if (!query) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [createErrorEmbed('Please provide a search query')],
          flags: 64, // Ephemeral
        },
      };
    }

    // Load components
    const components = await getComponents();

    // Search
    const results = searchComponents(components, query, type);

    // Create embed
    const embed = createSearchResultsEmbed(results, query);

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [embed],
      },
    };
  } catch (error) {
    console.error('Error in search handler:', error);

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [createErrorEmbed('Failed to search components. Please try again later.')],
        flags: 64,
      },
    };
  }
};
