// Data Loader - Handles loading component data from various sources
class DataLoader {
    constructor() {
        this.componentsData = null;
        this.templatesData = null;
    }

    // Load components from components.json
    async loadComponents() {
        try {
            const response = await fetch('components.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.componentsData = await response.json();
            return this.componentsData;
        } catch (error) {
            console.error('Error loading components:', error);
            return this.getFallbackComponentData();
        }
    }

    // Get fallback component data when components.json is unavailable
    getFallbackComponentData() {
        return {
            agents: [
                { name: 'code-reviewer', path: 'development/code-reviewer', category: 'development', type: 'agent', content: 'AI-powered code reviewer that analyzes your code for best practices, security issues, and optimization opportunities.' },
                { name: 'documentation-writer', path: 'development/documentation-writer', category: 'development', type: 'agent', content: 'Generates comprehensive documentation for your codebase, including API docs, README files, and inline comments.' },
                { name: 'bug-hunter', path: 'development/bug-hunter', category: 'development', type: 'agent', content: 'Specialized in finding and fixing bugs through systematic code analysis and testing.' },
                { name: 'security-auditor', path: 'security/security-auditor', category: 'security', type: 'agent', content: 'Performs security audits on your code to identify vulnerabilities and security best practices.' },
                { name: 'performance-optimizer', path: 'optimization/performance-optimizer', category: 'optimization', type: 'agent', content: 'Analyzes and optimizes code performance, identifying bottlenecks and suggesting improvements.' }
            ],
            commands: [
                { name: 'git-setup', path: 'development/git-setup', category: 'development', type: 'command', content: 'Sets up Git repository with best practices, including .gitignore, hooks, and workflow configurations.' },
                { name: 'project-init', path: 'development/project-init', category: 'development', type: 'command', content: 'Initializes new projects with proper structure, dependencies, and configuration files.' },
                { name: 'docker-setup', path: 'devops/docker-setup', category: 'devops', type: 'command', content: 'Creates Docker configurations including Dockerfile, docker-compose, and container optimization.' },
                { name: 'test-runner', path: 'testing/test-runner', category: 'testing', type: 'command', content: 'Sets up comprehensive testing frameworks and runs automated test suites.' },
                { name: 'build-pipeline', path: 'devops/build-pipeline', category: 'devops', type: 'command', content: 'Configures CI/CD pipelines for automated building, testing, and deployment.' }
            ],
            mcps: [
                { name: 'database-connector', path: 'database/database-connector', category: 'database', type: 'mcp', content: 'Connects to various databases and provides query and management capabilities.' },
                { name: 'api-client', path: 'api/api-client', category: 'api', type: 'mcp', content: 'HTTP client for interacting with REST APIs and web services.' },
                { name: 'file-manager', path: 'system/file-manager', category: 'system', type: 'mcp', content: 'File system operations including reading, writing, and organizing files.' },
                { name: 'redis-cache', path: 'database/redis-cache', category: 'database', type: 'mcp', content: 'Redis caching implementation for improved application performance.' },
                { name: 'email-service', path: 'communication/email-service', category: 'communication', type: 'mcp', content: 'Email sending and management service with template support.' }
            ]
        };
    }

    // Load templates data for the main index page
    async loadTemplates() {
        try {
            const GITHUB_CONFIG = {
                owner: 'davila7',
                repo: 'claude-code-templates',
                branch: 'main',
                templatesPath: 'cli-tool/src/templates.js'
            };

            const url = `https://raw.githubusercontent.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/${GITHUB_CONFIG.templatesPath}?t=${Date.now()}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const templateFileContent = await response.text();
            this.templatesData = this.parseTemplatesConfig(templateFileContent);
            return this.templatesData;
        } catch (error) {
            console.error('Error loading templates:', error);
            throw error;
        }
    }

    // Parse the templates.js file content to extract TEMPLATES_CONFIG
    parseTemplatesConfig(fileContent) {
        try {
            const configMatch = fileContent.match(/const TEMPLATES_CONFIG = ({[\s\S]*?});/);
            if (!configMatch) {
                throw new Error('TEMPLATES_CONFIG not found in file');
            }
            
            let configString = configMatch[1];
            configString = configString.replace(/'/g, '"');
            configString = configString.replace(/(\w+):/g, '"$1":');
            configString = configString.replace(/,(\s*[}\]])/g, '$1');
            
            const config = JSON.parse(configString);
            return this.transformTemplatesData(config);
        } catch (error) {
            console.error('Error parsing templates config:', error);
            throw error;
        }
    }

    // Transform templates data to a unified format
    transformTemplatesData(config) {
        const unified = {};
        
        Object.entries(config).forEach(([category, items]) => {
            unified[category] = Object.entries(items).map(([key, template]) => ({
                id: key,
                name: template.name,
                description: template.description || '',
                type: 'template',
                category: category,
                folderPath: template.folderPath || '',
                content: template.description || '',
                files: template.files || [],
                ...template
            }));
        });

        return unified;
    }

    // Get all components as a flat array
    getAllComponents() {
        if (!this.componentsData) return [];
        
        const allComponents = [];
        ['agents', 'commands', 'mcps'].forEach(type => {
            if (this.componentsData[type]) {
                allComponents.push(...this.componentsData[type]);
            }
        });
        
        return allComponents;
    }

    // Find component by name and type
    findComponent(name, type) {
        if (!this.componentsData) return null;
        
        const typeKey = type + 's';
        if (!this.componentsData[typeKey]) return null;
        
        return this.componentsData[typeKey].find(component => component.name === name);
    }

    // Get components by type
    getComponentsByType(type) {
        if (!this.componentsData) return [];
        
        const typeKey = type + 's';
        return this.componentsData[typeKey] || [];
    }
}

// Global instance
window.dataLoader = new DataLoader();