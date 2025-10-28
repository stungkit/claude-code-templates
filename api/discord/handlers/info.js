const { InteractionResponseType } = require('discord-interactions');
const { getComponents, getComponentByName, searchComponents } = require('../utils/componentsLoader');
const { createComponentEmbed, createErrorEmbed } = require('../utils/embedBuilder');

module.exports = async (interaction) => {
  try {
    const name = interaction.data.options.find(opt => opt.name === 'name')?.value;
    const type = interaction.data.options.find(opt => opt.name === 'type')?.value || null;

    if (!name) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [createErrorEmbed('Please provide a component name')],
          flags: 64,
        },
      };
    }

    const components = await getComponents();

    let component = null;

    if (type) {
      component = getComponentByName(components, name, type);
    } else {
      const allTypes = ['agents', 'commands', 'mcps', 'settings', 'hooks', 'templates', 'plugins'];

      for (const componentType of allTypes) {
        component = getComponentByName(components, name, componentType);
        if (component) break;
      }
    }

    if (!component) {
      const searchResults = searchComponents(components, name, type);

      if (searchResults.length > 0) {
        const suggestions = searchResults
          .slice(0, 5)
          .map((r, i) => `${i + 1}. **${r.name}** (${r.type})`)
          .join('\n');

        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [
              createErrorEmbed(
                `Component "${name}" not found. Did you mean:\n${suggestions}`
              ),
            ],
            flags: 64,
          },
        };
      }

      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [
            createErrorEmbed(
              `Component "${name}" not found. Use \`/search\` to find available components.`
            ),
          ],
          flags: 64,
        },
      };
    }

    const embed = createComponentEmbed(component);

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [embed],
      },
    };
  } catch (error) {
    console.error('Error in info handler:', error);

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [createErrorEmbed('Failed to fetch component information.')],
        flags: 64,
      },
    };
  }
};
