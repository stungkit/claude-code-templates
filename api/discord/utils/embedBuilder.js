const componentTypes = {
  agents: {
    icon: '🤖',
    color: 0xFF6B6B,
    description: 'AI specialists for different domains',
  },
  commands: {
    icon: '⚡',
    color: 0x4ECDC4,
    description: 'Custom slash commands for workflows',
  },
  mcps: {
    icon: '🔌',
    color: 0x95E1D3,
    description: 'Model Context Protocol integrations',
  },
  settings: {
    icon: '⚙️',
    color: 0xF9CA24,
    description: 'Claude Code configuration files',
  },
  hooks: {
    icon: '🪝',
    color: 0x6C5CE7,
    description: 'Event-driven automation triggers',
  },
  templates: {
    icon: '📋',
    color: 0xA8E6CF,
    description: 'Complete project configurations',
  },
  plugins: {
    icon: '🧩',
    color: 0xFFD93D,
    description: 'Component bundles and plugins',
  },
};

/**
 * Extract description from content
 */
function extractDescription(content) {
  if (!content) return null;

  const withoutFrontmatter = content.replace(/^---[\s\S]*?---\n/m, '');
  const paragraphs = withoutFrontmatter
    .split('\n\n')
    .map(p => p.trim())
    .filter(p => p && !p.startsWith('#'));

  if (paragraphs.length === 0) return null;

  let description = paragraphs[0];
  if (description.length > 200) {
    description = description.substring(0, 197) + '...';
  }

  return description;
}

/**
 * Create component embed
 */
function createComponentEmbed(component) {
  const typeConfig = componentTypes[component.type];
  const icon = typeConfig?.icon || '📦';
  const color = typeConfig?.color || 0x00D9FF;

  const description = extractDescription(component.content || component.description);

  const embed = {
    title: `${icon} ${component.name}`,
    description: description || 'No description available',
    color: color,
    fields: [
      {
        name: 'Type',
        value: `\`${component.type}\``,
        inline: true,
      },
      {
        name: 'Category',
        value: component.category || 'N/A',
        inline: true,
      },
      {
        name: 'Downloads',
        value: `${component.downloads || 0}`,
        inline: true,
      },
    ],
    footer: {
      text: 'Use /install to get the installation command',
    },
    timestamp: new Date().toISOString(),
  };

  if (component.url) {
    embed.url = component.url;
  }

  return embed;
}

/**
 * Create search results embed
 */
function createSearchResultsEmbed(results, query) {
  const limitedResults = results.slice(0, 10);

  const embed = {
    title: `🔍 Search Results for "${query}"`,
    description: `Found ${results.length} result(s)`,
    color: 0x00D9FF,
    fields: [],
    footer: {
      text: 'Use /info <name> for details',
    },
    timestamp: new Date().toISOString(),
  };

  limitedResults.forEach((component, index) => {
    const typeConfig = componentTypes[component.type];
    const icon = typeConfig?.icon || '📦';

    embed.fields.push({
      name: `${index + 1}. ${icon} ${component.name}`,
      value: `**Type:** ${component.type} | **Category:** ${component.category || 'N/A'} | **Downloads:** ${component.downloads || 0}`,
      inline: false,
    });
  });

  if (results.length === 0) {
    embed.description = `No results found for "${query}"`;
  }

  return embed;
}

/**
 * Create popular components embed
 */
function createPopularEmbed(components, type) {
  const typeConfig = componentTypes[type];
  const icon = typeConfig?.icon || '📦';
  const color = typeConfig?.color || 0x00D9FF;

  const embed = {
    title: `${icon} Popular ${type.charAt(0).toUpperCase() + type.slice(1)}`,
    description: `Top ${components.length} most downloaded ${type}`,
    color: color,
    fields: [],
    footer: {
      text: 'Use /info <name> for more details',
    },
    timestamp: new Date().toISOString(),
  };

  components.forEach((component, index) => {
    embed.fields.push({
      name: `${index + 1}. ${component.name}`,
      value: `**Downloads:** ${component.downloads || 0} | **Category:** ${component.category || 'N/A'}`,
      inline: false,
    });
  });

  return embed;
}

/**
 * Create installation embed
 */
function createInstallEmbed(component) {
  const typeConfig = componentTypes[component.type];
  const icon = typeConfig?.icon || '📦';

  let flagName = component.type;
  if (flagName === 'templates') flagName = 'template';

  const installCommand = `npx claude-code-templates@latest --${flagName} ${component.name}`;

  const embed = {
    title: `${icon} Install ${component.name}`,
    description: 'Copy and paste this command in your terminal:',
    color: 0x00D9FF,
    fields: [
      {
        name: 'Installation Command',
        value: `\`\`\`bash\n${installCommand}\n\`\`\``,
        inline: false,
      },
    ],
    footer: {
      text: 'Visit aitmpl.com for more components',
    },
    timestamp: new Date().toISOString(),
  };

  return embed;
}

/**
 * Create error embed
 */
function createErrorEmbed(message) {
  return {
    title: '❌ Error',
    description: message,
    color: 0xFF0000,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  createComponentEmbed,
  createSearchResultsEmbed,
  createPopularEmbed,
  createInstallEmbed,
  createErrorEmbed,
};
