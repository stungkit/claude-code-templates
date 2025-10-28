const axios = require('axios');

// Cache for components data
let cachedComponents = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get components data (cached)
 */
async function getComponents() {
  const now = Date.now();

  // Return cache if valid
  if (cachedComponents && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedComponents;
  }

  // Fetch fresh data
  try {
    const componentsUrl = process.env.COMPONENTS_API_URL || 'https://aitmpl.com/components.json';
    const response = await axios.get(componentsUrl, {
      timeout: 10000,
    });

    cachedComponents = response.data;
    cacheTimestamp = now;

    console.log('✅ Components data loaded');
    return cachedComponents;
  } catch (error) {
    console.error('❌ Error loading components:', error.message);

    // Return stale cache if available
    if (cachedComponents) {
      console.log('⚠️  Returning stale cache');
      return cachedComponents;
    }

    throw new Error('Failed to load components data');
  }
}

/**
 * Search components
 */
function searchComponents(components, query, type = null) {
  const results = [];
  const lowerQuery = query.toLowerCase();

  const typesToSearch = type
    ? [type]
    : ['agents', 'commands', 'mcps', 'settings', 'hooks', 'templates', 'plugins'];

  for (const componentType of typesToSearch) {
    const componentList = components[componentType] || [];

    for (const component of componentList) {
      const matchesName = component.name.toLowerCase().includes(lowerQuery);
      const matchesCategory = component.category?.toLowerCase().includes(lowerQuery);
      const matchesContent = component.content?.toLowerCase().includes(lowerQuery);
      const matchesDescription = component.description?.toLowerCase().includes(lowerQuery);

      if (matchesName || matchesCategory || matchesContent || matchesDescription) {
        results.push({
          ...component,
          type: componentType,
          score: calculateRelevanceScore(component, lowerQuery),
        });
      }
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Calculate relevance score
 */
function calculateRelevanceScore(component, query) {
  let score = 0;

  if (component.name.toLowerCase() === query) {
    score += 100;
  }

  if (component.name.toLowerCase().startsWith(query)) {
    score += 50;
  }

  if (component.name.toLowerCase().includes(query)) {
    score += 20;
  }

  if (component.category?.toLowerCase().includes(query)) {
    score += 10;
  }

  score += Math.min(component.downloads || 0, 50);

  return score;
}

/**
 * Get component by name
 */
function getComponentByName(components, name, type) {
  const componentList = components[type] || [];
  const component = componentList.find(c => c.name === name);

  if (component) {
    return { ...component, type };
  }

  return null;
}

/**
 * Get random component
 */
function getRandomComponent(components, type) {
  const componentList = components[type] || [];

  if (componentList.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * componentList.length);
  return {
    ...componentList[randomIndex],
    type,
  };
}

/**
 * Get popular components
 */
function getPopularComponents(components, type, limit = 10) {
  const componentList = components[type] || [];

  const sorted = [...componentList].sort((a, b) => {
    return (b.downloads || 0) - (a.downloads || 0);
  });

  return sorted.slice(0, limit).map(comp => ({
    ...comp,
    type,
  }));
}

module.exports = {
  getComponents,
  searchComponents,
  getComponentByName,
  getRandomComponent,
  getPopularComponents,
};
