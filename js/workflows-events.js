// Workflows Events - Handles events specific to workflows.html

class WorkflowManager {
    constructor() {
        this.workflowState = {
            steps: [],
            properties: {
                name: '',
                description: '',
                tags: []
            },
            components: {
                agents: [],
                commands: [],
                mcps: []
            }
        };
    }

    async init() {
        try {
            await this.loadComponents();
            this.setupEventListeners();
            this.initializeDragAndDrop();
            this.renderComponentsList();
            console.log('Workflow Builder initialized successfully');
        } catch (error) {
            console.error('Error initializing Workflow Builder:', error);
            this.showError('Failed to load components. Please refresh the page.');
        }
    }

    async loadComponents() {
        this.workflowState.components = await window.dataLoader.loadComponents();
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('componentSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleComponentSearch(e));
        }

        // Canvas actions
        const clearBtn = document.getElementById('clearCanvas');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearWorkflow());
        }

        const generateBtn = document.getElementById('generateWorkflow');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.openPropertiesModal());
        }

        // Properties modal
        const closePropertiesBtn = document.getElementById('closePropertiesModal');
        if (closePropertiesBtn) {
            closePropertiesBtn.addEventListener('click', () => this.closePropertiesModal());
        }

        const savePropertiesBtn = document.getElementById('saveWorkflowProperties');
        if (savePropertiesBtn) {
            savePropertiesBtn.addEventListener('click', () => this.saveAndGenerateWorkflow());
        }

        // Category accordion toggle
        document.querySelectorAll('.category-card-header').forEach(header => {
            header.addEventListener('click', () => {
                header.parentElement.classList.toggle('expanded');
            });
        });

        // Sub-folders toggle
        document.addEventListener('click', (event) => {
            const header = event.target.closest('.tree-node-header');
            if (header) {
                const children = header.nextElementSibling;
                if (children && children.classList.contains('tree-children')) {
                    header.classList.toggle('expanded');
                    children.classList.toggle('expanded');
                }
            }
        });
    }

    renderComponentsList() {
        ['agents', 'commands', 'mcps'].forEach(type => {
            this.renderComponentsListByType(type, this.workflowState.components[type]);
        });
    }

    renderComponentsListByType(type, components) {
        const container = document.getElementById(`${type}-tree`);
        const countElement = document.getElementById(`${type}-count`);
        
        if (!container || !countElement) return;
        
        countElement.textContent = components.length;
        container.innerHTML = '';
        
        const groupedComponents = components.reduce((acc, component) => {
            const category = component.category === 'root' ? 'general' : component.category;
            if (!acc[category]) acc[category] = [];
            acc[category].push(component);
            return acc;
        }, {});
        
        Object.entries(groupedComponents).forEach(([category, categoryComponents]) => {
            const folderElement = this.createTreeFolder(category, categoryComponents, type);
            container.appendChild(folderElement);
        });
    }

    createTreeFolder(category, components, type) {
        const folderElement = document.createElement('div');
        folderElement.className = 'tree-node';
        const folderId = `${type}-${category.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
        
        folderElement.innerHTML = `
            <div class="tree-node-header" data-folder="${folderId}">
                <span class="tree-icon folder-icon">📁</span>
                <span class="tree-label">${category}</span>
                <span class="tree-count">${components.length}</span>
                <span class="tree-arrow">▶</span>
            </div>
            <div class="tree-children" id="${folderId}"></div>
        `;
        
        const childrenContainer = folderElement.querySelector('.tree-children');
        components.forEach(component => {
            const fileElement = this.createTreeFile(component);
            childrenContainer.appendChild(fileElement);
        });
        
        return folderElement;
    }

    createTreeFile(component) {
        const element = document.createElement('div');
        element.className = 'tree-file';
        element.draggable = true;
        element.dataset.componentType = component.type;
        element.dataset.componentName = component.name;
        element.dataset.componentPath = component.path;
        element.dataset.componentCategory = component.category;
        
        const fileIcon = this.getFileIcon(component.type);
        
        element.innerHTML = `
            <div class="tree-file-header">
                <span class="tree-icon file-icon">${fileIcon}</span>
                <span class="tree-file-name">${component.name}</span>
                <div class="tree-file-actions">
                    <button class="tree-action-btn" title="View Details" onclick="showWorkflowComponentDetails('${component.type}', '${component.name}', '${component.path}', '${component.category}')">ℹ️</button>
                    <button class="tree-action-btn" title="Add to Workflow" onclick="addComponentFromButton(event)">➕</button>
                </div>
            </div>
        `;
        
        return element;
    }

    getFileIcon(type) {
        const icons = { 'agent': '📄', 'command': '⚡', 'mcp': '⚙️' };
        return icons[type] || '📄';
    }

    initializeDragAndDrop() {
        const workflowSteps = document.getElementById('workflowSteps');
        if (!workflowSteps) return;

        document.addEventListener('dragstart', (event) => {
            if (event.target.closest('.tree-file')) {
                this.handleDragStart(event);
            }
        });

        workflowSteps.addEventListener('dragover', this.handleDragOver);
        workflowSteps.addEventListener('drop', (e) => this.handleDrop(e));
        workflowSteps.addEventListener('dragenter', (e) => {
            e.target.closest('.drop-zone')?.classList.add('drag-over');
        });
        workflowSteps.addEventListener('dragleave', (e) => {
            e.target.closest('.drop-zone')?.classList.remove('drag-over');
        });
    }

    handleDragStart(event) {
        const treeFile = event.target.closest('.tree-file');
        const componentData = { ...treeFile.dataset };
        event.dataTransfer.setData('application/json', JSON.stringify(componentData));
        event.dataTransfer.effectAllowed = 'copy';
    }

    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }

    handleDrop(event) {
        event.preventDefault();
        event.target.closest('.drop-zone')?.classList.remove('drag-over');
        try {
            const componentData = JSON.parse(event.dataTransfer.getData('application/json'));
            this.addWorkflowStep(componentData);
        } catch (error) {
            console.error('Error handling drop:', error);
        }
    }

    addWorkflowStep(componentData) {
        const step = {
            id: `step_${Date.now()}`,
            type: componentData.componentType,
            name: componentData.componentName,
            path: componentData.componentPath,
            category: componentData.componentCategory,
            description: `Execute ${componentData.componentName}`,
            icon: this.getComponentIcon(componentData.componentType)
        };
        
        this.workflowState.steps.push(step);
        this.renderWorkflowSteps();
        this.updateWorkflowStats();
    }

    getComponentIcon(type) {
        const icons = { 'agent': '🤖', 'command': '⚡', 'mcp': '🔌' };
        return icons[type] || '📦';
    }

    renderWorkflowSteps() {
        const container = document.getElementById('workflowSteps');
        if (!container) return;

        const dropZone = container.querySelector('.drop-zone');
        const existingSteps = container.querySelectorAll('.workflow-step');
        existingSteps.forEach(step => step.remove());

        if (this.workflowState.steps.length > 0) {
            if (dropZone) dropZone.style.display = 'none';
            
            this.workflowState.steps.forEach((step, index) => {
                const stepElement = document.createElement('div');
                stepElement.className = 'workflow-step';
                stepElement.dataset.stepId = step.id;
                stepElement.innerHTML = `
                    <div class="step-number">${index + 1}</div>
                    <div class="step-icon">${step.icon}</div>
                    <div class="step-content">
                        <div class="step-name">${step.name}</div>
                        <div class="step-type">${step.type}</div>
                    </div>
                    <div class="step-actions">
                        <button class="step-action details" onclick="showWorkflowComponentDetails('${step.type}', '${step.name.replace(/'/g, "\'")}', '${step.path.replace(/'/g, "\'")}', '${step.category.replace(/'/g, "\'")}')">ℹ️</button>
                        <button class="step-action remove" onclick="removeWorkflowStep('${step.id}')">🗑️</button>
                    </div>
                `;
                container.appendChild(stepElement);
            });
        } else {
            if (dropZone) dropZone.style.display = 'flex';
        }
    }

    updateWorkflowStats() {
        const stats = { agents: 0, commands: 0, mcps: 0 };
        this.workflowState.steps.forEach(step => {
            const key = step.type + 's';
            if (stats.hasOwnProperty(key)) {
                stats[key]++;
            }
        });

        const agentCount = document.getElementById('agentCount');
        const commandCount = document.getElementById('commandCount');
        const mcpCount = document.getElementById('mcpCount');
        const totalSteps = document.getElementById('totalSteps');

        if (agentCount) agentCount.textContent = stats.agents;
        if (commandCount) commandCount.textContent = stats.commands;
        if (mcpCount) mcpCount.textContent = stats.mcps;
        if (totalSteps) totalSteps.textContent = this.workflowState.steps.length;
    }

    handleComponentSearch(event) {
        const searchTerm = event.target.value.toLowerCase();
        document.querySelectorAll('.tree-file').forEach(file => {
            const match = file.dataset.componentName.toLowerCase().includes(searchTerm);
            file.style.display = match ? '' : 'none';
        });
    }

    clearWorkflow() {
        if (confirm('Are you sure you want to clear the workflow?')) {
            this.workflowState.steps = [];
            this.renderWorkflowSteps();
            this.updateWorkflowStats();
        }
    }

    openPropertiesModal() {
        if (this.workflowState.steps.length === 0) {
            this.showError('Add at least one component to the workflow.');
            return;
        }
        const modal = document.getElementById('propertiesModal');
        if (modal) modal.style.display = 'block';
    }

    closePropertiesModal() {
        const modal = document.getElementById('propertiesModal');
        if (modal) modal.style.display = 'none';
    }

    saveAndGenerateWorkflow() {
        const nameInput = document.getElementById('workflowName');
        const descInput = document.getElementById('workflowDescription');
        const tagsInput = document.getElementById('workflowTags');

        if (nameInput) this.workflowState.properties.name = nameInput.value;
        if (descInput) this.workflowState.properties.description = descInput.value;
        if (tagsInput) {
            this.workflowState.properties.tags = tagsInput.value.split(',').map(t => t.trim());
        }
        
        if (!this.workflowState.properties.name) {
            this.showError('Workflow name is required.');
            return;
        }
        
        this.closePropertiesModal();
        this.generateWorkflow();
    }

    async generateWorkflow() {
        try {
            const workflowHash = await this.generateWorkflowHash();
            const yamlContent = this.generateWorkflowYAML();
            this.showGenerateModal(workflowHash, yamlContent);
        } catch (error) {
            console.error('Error generating workflow:', error);
            this.showError('Failed to generate workflow.');
        }
    }

    async generateWorkflowHash() {
        const dataString = JSON.stringify(this.workflowState);
        const hash = CryptoJS.SHA256(dataString).toString(CryptoJS.enc.Hex).substring(0, 12);
        localStorage.setItem(`workflow_${hash}`, dataString);
        return hash;
    }

    generateWorkflowYAML() {
        return `# Workflow: ${this.workflowState.properties.name}\nsteps:\n` +
               this.workflowState.steps.map((step, i) => 
                   `  - step: ${i+1}\n    type: ${step.type}\n    name: "${step.name}"`
               ).join('\n');
    }

    showGenerateModal(hash, yaml) {
        const commandEl = document.getElementById('workflowCommand');
        const yamlEl = document.getElementById('yamlContent');
        const modal = document.getElementById('generateModal');

        if (commandEl) commandEl.textContent = `npx claude-code-templates@latest --workflow:#${hash}`;
        if (yamlEl) yamlEl.textContent = yaml;
        if (modal) modal.style.display = 'block';

        // Add copy functionality to the buttons in the modal
        const copyCommandBtn = document.getElementById('copyCommand');
        if (copyCommandBtn) {
            copyCommandBtn.onclick = () => copyToClipboard(commandEl.textContent);
        }

        const copyYamlBtn = document.getElementById('copyYaml');
        if (copyYamlBtn) {
            copyYamlBtn.onclick = () => copyToClipboard(yamlEl.textContent);
        }

        const downloadYamlBtn = document.getElementById('downloadYaml');
        if (downloadYamlBtn) {
            downloadYamlBtn.onclick = () => {
                const filename = `${this.workflowState.properties.name.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'workflow'}.yaml`;
                const blob = new Blob([yaml], { type: 'text/yaml' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showNotification('YAML downloaded successfully!', 'success');
            };
        }

        const shareWorkflowBtn = document.getElementById('shareWorkflow');
        if (shareWorkflowBtn) {
            shareWorkflowBtn.onclick = () => {
                const shareUrl = `${window.location.origin}/workflows.html?workflow=${hash}`;
                navigator.clipboard.writeText(shareUrl).then(() => {
                    showNotification('Share URL copied to clipboard!', 'success');
                }).catch(err => {
                    console.error('Failed to copy share URL: ', err);
                    showNotification('Failed to copy share URL', 'error');
                });
            };
        }
    }

    showError(message) {
        showNotification(message, 'error');
    }
}

// Global functions for workflow events (called from onclick)
function showWorkflowComponentDetails(type, name, path, category) {
    const component = window.dataLoader.findComponent(name, type);
    if (component) {
        showComponentModal(component);
    } else {
        console.warn('Component not found:', type, name);
    }
}

function addComponentFromButton(event) {
    const treeFile = event.target.closest('.tree-file');
    const componentData = { ...treeFile.dataset };
    if (window.workflowManager) {
        window.workflowManager.addWorkflowStep(componentData);
    }
}

function removeWorkflowStep(stepId) {
    if (window.workflowManager) {
        window.workflowManager.workflowState.steps = 
            window.workflowManager.workflowState.steps.filter(step => step.id !== stepId);
        window.workflowManager.renderWorkflowSteps();
        window.workflowManager.updateWorkflowStats();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.workflowManager = new WorkflowManager();
    window.workflowManager.init();
});