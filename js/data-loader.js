// Data Loader - Handles loading component data from various sources
class DataLoader {
    constructor() {
        this.componentsData = null;
        this.fullComponentsData = null; // Store full data for accurate counts
        this.templatesData = null; // Deprecated - templates now in components.json
        this.loadingStates = {
            components: false
        };
        this.cache = new Map();
        this.TIMEOUT_MS = 8000; // 8 seconds timeout
        this.ITEMS_PER_PAGE = 50; // Lazy loading batch size
    }

    // Load all components at once (simplified approach)
    async loadAllComponents() {
        try {
            this.loadingStates.components = true;
            this.showLoadingState('components', true);
            
            const cacheKey = 'all_components';
            if (this.cache.has(cacheKey)) {
                this.showLoadingState('components', false);
                this.loadingStates.components = false;
                return this.cache.get(cacheKey);
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);
            
            const response = await fetch('components.json', {
                signal: controller.signal,
                headers: {
                    'Cache-Control': 'max-age=300' // 5 minutes cache
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const allData = await response.json();
            
            // Store both full and component data
            this.fullComponentsData = allData;
            this.componentsData = allData;
            
            this.cache.set(cacheKey, allData);
            
            this.showLoadingState('components', false);
            this.loadingStates.components = false;
            
            return this.componentsData;
        } catch (error) {
            this.showLoadingState('components', false);
            this.loadingStates.components = false;
            
            if (error.name === 'AbortError') {
                console.error('Components loading timed out after', this.TIMEOUT_MS + 'ms');
                this.showError('Loading timed out. Using fallback data.');
            } else {
                console.error('Error loading components:', error);
                this.showError('Failed to load components. Using fallback data.');
            }
            
            return this.getFallbackComponentData();
        }
    }
    
    // Load components with lazy loading and timeout (kept for backward compatibility)
    async loadComponents(page = 1, itemsPerPage = this.ITEMS_PER_PAGE) {
        try {
            this.loadingStates.components = true;
            this.showLoadingState('components', true);
            
            const cacheKey = `components_${page}_${itemsPerPage}`;
            if (this.cache.has(cacheKey)) {
                this.showLoadingState('components', false);
                this.loadingStates.components = false;
                return this.cache.get(cacheKey);
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);
            
            const response = await fetch('components.json', {
                signal: controller.signal,
                headers: {
                    'Cache-Control': 'max-age=300' // 5 minutes cache
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const fullData = await response.json();
            
            // Store full data for accurate counts (only on first load)
            if (page === 1) {
                this.fullComponentsData = fullData;
            }
            
            // Apply pagination to reduce memory usage
            const paginatedData = this.paginateComponents(fullData, page, itemsPerPage);
            
            // Store full data for templates if it exists
            if (fullData.templates && page === 1) {
                paginatedData.templates = fullData.templates; // Templates don't need pagination
            }
            
            this.cache.set(cacheKey, paginatedData);
            this.componentsData = paginatedData;
            
            this.showLoadingState('components', false);
            this.loadingStates.components = false;
            
            return this.componentsData;
        } catch (error) {
            this.showLoadingState('components', false);
            this.loadingStates.components = false;
            
            if (error.name === 'AbortError') {
                console.error('Components loading timed out after', this.TIMEOUT_MS + 'ms');
                this.showError('Loading timed out. Using fallback data.');
            } else {
                console.error('Error loading components:', error);
                this.showError('Failed to load components. Using fallback data.');
            }
            
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

    // Load templates - now using components.json data (templates deprecated)
    async loadTemplates() {
        try {
            // Templates are now included in components.json as 'templates' section
            // This method is kept for backward compatibility
            if (this.componentsData && this.componentsData.templates) {
                this.templatesData = { templates: this.componentsData.templates };
                return this.templatesData;
            }
            
            // If components aren't loaded yet, try to load them
            if (!this.componentsData) {
                await this.loadComponents();
                if (this.componentsData && this.componentsData.templates) {
                    this.templatesData = { templates: this.componentsData.templates };
                    return this.templatesData;
                }
            }
            
            // Return empty if no templates in components.json
            console.warn('No templates found in components.json');
            this.templatesData = {};
            return this.templatesData;
        } catch (error) {
            console.error('Error loading templates from components:', error);
            this.templatesData = {};
            return this.templatesData;
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
    
    // Paginate components data to reduce memory usage
    paginateComponents(fullData, page, itemsPerPage) {
        const paginatedData = {
            agents: [],
            commands: [],
            mcps: [],
            templates: [] // Include templates in pagination structure
        };
        
        ['agents', 'commands', 'mcps'].forEach(type => {
            if (fullData[type]) {
                const startIndex = (page - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                paginatedData[type] = fullData[type].slice(startIndex, endIndex);
            }
        });
        
        // Templates don't need pagination - include all if available
        if (fullData.templates) {
            paginatedData.templates = fullData.templates;
        }
        
        return paginatedData;
    }
    
    // Show loading states
    showLoadingState(type, isLoading) {
        const loadingElement = document.getElementById(`${type}-loading`);
        const contentElement = document.getElementById(`${type}-content`);
        
        if (loadingElement && contentElement) {
            if (isLoading) {
                loadingElement.style.display = 'flex';
                contentElement.style.opacity = '0.5';
            } else {
                loadingElement.style.display = 'none';
                contentElement.style.opacity = '1';
            }
        }
        
        // Also update any loading spinners in the UI
        const spinners = document.querySelectorAll('.loading-spinner');
        spinners.forEach(spinner => {
            spinner.style.display = isLoading ? 'block' : 'none';
        });
    }
    
    // Show error messages
    showError(message) {
        // Try to use existing notification system
        if (window.showNotification) {
            window.showNotification(message, 'error', 5000);
        } else {
            console.warn(message);
            // Create simple toast notification
            const toast = document.createElement('div');
            toast.className = 'error-toast';
            toast.textContent = message;
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #f85149;
                color: white;
                padding: 12px 16px;
                border-radius: 6px;
                z-index: 1000;
                font-size: 14px;
                max-width: 300px;
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 5000);
        }
    }
    
    // Load more components (no longer needed but kept for compatibility)
    async loadMoreComponents(page) {
        // All components are now loaded at once, so this method returns null
        console.log('loadMoreComponents called but not needed - all data loaded initially');
        return null;
    }
    
    // Get the total counts from full data for accurate filter counts
    getTotalCounts() {
        if (this.fullComponentsData) {
            return {
                agents: this.fullComponentsData.agents ? this.fullComponentsData.agents.length : 0,
                commands: this.fullComponentsData.commands ? this.fullComponentsData.commands.length : 0,
                mcps: this.fullComponentsData.mcps ? this.fullComponentsData.mcps.length : 0,
                templates: this.fullComponentsData.templates ? this.fullComponentsData.templates.length : 0
            };
        }
        
        // Fallback to current loaded data
        return {
            agents: this.componentsData?.agents?.length || 0,
            commands: this.componentsData?.commands?.length || 0,
            mcps: this.componentsData?.mcps?.length || 0,
            templates: this.componentsData?.templates?.length || 0
        };
    }
}

// Global instance
window.dataLoader = new DataLoader();