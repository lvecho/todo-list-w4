// Todo List Application - Vanilla JavaScript
// Data layer with localStorage persistence

class TodoApp {
    constructor() {
        this.tasks = [];
        this.currentFilter = 'all';
        this.storage = new StorageManager();
        this.init();
    }

    init() {
        this.loadTasks();
        this.bindEvents();
        this.render();
    }

    bindEvents() {
        // Task form submission
        const taskForm = document.getElementById('task-form');
        const taskInput = document.getElementById('task-input');
        
        taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = taskInput.value.trim();
            if (text) {
                this.addTask(text);
                taskInput.value = '';
            }
        });

        // Filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
                this.updateFilterButtons();
                this.render();
            });
        });

        // Clear completed button
        const clearCompletedBtn = document.getElementById('clear-completed');
        clearCompletedBtn.addEventListener('click', () => {
            this.clearCompleted();
        });

        // Task list delegation for task actions
        const taskList = document.getElementById('task-list');
        taskList.addEventListener('click', (e) => {
            const taskItem = e.target.closest('.task-item');
            if (!taskItem) return;

            const taskId = taskItem.dataset.id;

            if (e.target.type === 'checkbox') {
                this.toggleTask(taskId);
            } else if (e.target.classList.contains('task-item__btn--delete')) {
                this.deleteTask(taskId);
            } else if (e.target.classList.contains('task-item__btn--edit')) {
                this.startInlineEdit(taskId);
            }
        });

        // Double-click for inline editing
        taskList.addEventListener('dblclick', (e) => {
            const taskItem = e.target.closest('.task-item');
            if (!taskItem) return;
            
            const taskId = taskItem.dataset.id;
            if (e.target.classList.contains('task-item__text')) {
                this.startInlineEdit(taskId);
            }
        });
    }

    addTask(text) {
        const task = TaskModel.create(text);
        this.tasks.push(task);
        this.saveTasks();
        this.render();
    }

    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            task.updatedAt = new Date().toISOString();
            this.saveTasks();
            this.render();
        }
    }

    deleteTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;

        const confirmMessage = `Are you sure you want to delete this task?\n\n"${task.text.substring(0, 50)}${task.text.length > 50 ? '...' : ''}"`;
        
        if (confirm(confirmMessage)) {
            this.tasks = this.tasks.filter(t => t.id !== id);
            this.saveTasks();
            this.render();
            this.showSuccess('Task deleted successfully');
        }
    }

    startInlineEdit(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;

        const taskItem = document.querySelector(`[data-id="${id}"]`);
        const textElement = taskItem.querySelector('.task-item__text');
        
        if (taskItem.querySelector('.task-item__edit-input')) return; // Already editing

        // Create edit input
        const editInput = document.createElement('input');
        editInput.type = 'text';
        editInput.className = 'task-item__edit-input';
        editInput.value = task.text;
        editInput.maxLength = 500;
        
        // Replace text with input
        textElement.style.display = 'none';
        textElement.parentNode.insertBefore(editInput, textElement.nextSibling);
        editInput.focus();
        editInput.select();

        const finishEdit = (save) => {
            if (save) {
                const newText = editInput.value.trim();
                if (newText && newText !== task.text) {
                    const sanitizedText = DataValidator.sanitizeInput(newText);
                    if (sanitizedText.length <= 500) {
                        task.text = sanitizedText;
                        task.updatedAt = new Date().toISOString();
                        this.saveTasks();
                    } else {
                        this.showError('Task text must be 500 characters or less.');
                    }
                }
            }
            
            editInput.remove();
            textElement.style.display = '';
            this.render();
        };

        // Event listeners for save/cancel
        editInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                finishEdit(true);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                finishEdit(false);
            }
        });

        editInput.addEventListener('blur', () => {
            finishEdit(true);
        });
    }

    clearCompleted() {
        const completedCount = this.tasks.filter(t => t.completed).length;
        if (completedCount === 0) return;

        if (confirm(`Delete ${completedCount} completed task(s)?`)) {
            this.tasks = this.tasks.filter(t => !t.completed);
            this.saveTasks();
            this.render();
        }
    }

    setFilter(filter) {
        this.currentFilter = filter;
    }

    getFilteredTasks() {
        switch (this.currentFilter) {
            case 'active':
                return this.tasks.filter(t => !t.completed);
            case 'completed':
                return this.tasks.filter(t => t.completed);
            default:
                return this.tasks;
        }
    }

    updateFilterButtons() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.classList.toggle('filter-btn--active', btn.dataset.filter === this.currentFilter);
        });
    }

    loadTasks() {
        try {
            this.tasks = this.storage.getTasks();
        } catch (error) {
            console.error('Failed to load tasks:', error);
            this.tasks = [];
        }
    }

    saveTasks() {
        try {
            this.storage.saveTasks(this.tasks);
        } catch (error) {
            console.error('Failed to save tasks:', error);
            // Show user-friendly error message
            this.showError('Failed to save tasks. Storage may be full.');
        }
    }

    render() {
        this.renderTasks();
        this.renderStats();
        this.renderProgress();
        this.renderEmptyState();
        this.renderClearButton();
    }

    renderTasks() {
        const taskList = document.getElementById('task-list');
        const filteredTasks = this.getFilteredTasks();

        taskList.innerHTML = filteredTasks.map(task => `
            <li class="task-item ${task.completed ? 'task-item--completed' : ''}" data-id="${task.id}">
                <input 
                    type="checkbox" 
                    class="task-item__checkbox" 
                    ${task.completed ? 'checked' : ''}
                >
                <span class="task-item__text ${task.completed ? 'task-item__text--completed' : ''}">
                    ${DataValidator.escapeHtml(task.text)}
                </span>
                <div class="task-item__actions">
                    <button class="task-item__btn task-item__btn--edit" title="Edit task">Edit</button>
                    <button class="task-item__btn task-item__btn--delete" title="Delete task">Delete</button>
                </div>
            </li>
        `).join('');
    }

    renderStats() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(t => t.completed).length;

        document.getElementById('total-tasks').textContent = 
            `${totalTasks} ${totalTasks === 1 ? 'task' : 'tasks'}`;
        document.getElementById('completed-tasks').textContent = 
            `${completedTasks} completed`;
    }

    renderProgress() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(t => t.completed).length;
        const percentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');

        progressFill.style.width = `${percentage}%`;
        progressText.textContent = `${percentage}% complete`;
    }

    renderEmptyState() {
        const emptyState = document.getElementById('empty-state');
        const filteredTasks = this.getFilteredTasks();
        
        emptyState.classList.toggle('task-list__empty--show', filteredTasks.length === 0);
    }

    renderClearButton() {
        const clearBtn = document.getElementById('clear-completed');
        const completedCount = this.tasks.filter(t => t.completed).length;
        clearBtn.disabled = completedCount === 0;
    }

    showError(message) {
        this.showToast(`Error: ${message}`, 'error');
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showToast(message, type = 'info') {
        // Remove existing toast
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.textContent = message;

        // Add to page
        document.body.appendChild(toast);

        // Show with animation
        setTimeout(() => toast.classList.add('toast--show'), 10);

        // Remove after delay
        setTimeout(() => {
            toast.classList.remove('toast--show');
            setTimeout(() => {
                if (toast.parentNode) toast.remove();
            }, 300);
        }, 3000);
    }
}

// Task Model
class TaskModel {
    static create(text) {
        const sanitizedText = DataValidator.sanitizeInput(text);
        if (!DataValidator.validateTaskText(sanitizedText)) {
            throw new Error('Invalid task text');
        }

        return {
            id: this.generateId(),
            text: sanitizedText,
            completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

// Storage Manager - handles localStorage operations
class StorageManager {
    constructor() {
        this.storageKey = 'todoapp_tasks';
        this.version = '1.0';
        this.versionKey = 'todoapp_version';
    }

    getTasks() {
        try {
            this.checkStorageAvailable();
            this.handleMigration();

            const data = localStorage.getItem(this.storageKey);
            if (!data) return [];

            const tasks = JSON.parse(data);
            return Array.isArray(tasks) ? tasks : [];
        } catch (error) {
            console.error('Error loading tasks from storage:', error);
            throw new Error('Failed to load tasks');
        }
    }

    saveTasks(tasks) {
        try {
            this.checkStorageAvailable();
            
            if (!Array.isArray(tasks)) {
                throw new Error('Tasks must be an array');
            }

            const data = JSON.stringify(tasks);
            
            // Check if we'll exceed quota
            this.checkStorageQuota(data);
            
            localStorage.setItem(this.storageKey, data);
            localStorage.setItem(this.versionKey, this.version);
        } catch (error) {
            if (error.name === 'QuotaExceededError' || error.code === 22) {
                throw new Error('Storage quota exceeded. Please clear some tasks.');
            }
            console.error('Error saving tasks to storage:', error);
            throw new Error('Failed to save tasks');
        }
    }

    clearTasks() {
        try {
            this.checkStorageAvailable();
            localStorage.removeItem(this.storageKey);
        } catch (error) {
            console.error('Error clearing tasks from storage:', error);
            throw new Error('Failed to clear tasks');
        }
    }

    checkStorageAvailable() {
        if (!this.isLocalStorageAvailable()) {
            throw new Error('localStorage is not available');
        }
    }

    isLocalStorageAvailable() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    checkStorageQuota(data) {
        // Rough estimate of storage usage
        const currentUsage = JSON.stringify(localStorage).length;
        const newDataSize = data.length;
        const estimatedTotal = currentUsage + newDataSize;

        // Most browsers allow 5-10MB, we'll be conservative
        const maxSize = 5 * 1024 * 1024; // 5MB
        
        if (estimatedTotal > maxSize * 0.9) { // 90% threshold
            throw new Error('Approaching storage quota limit');
        }
    }

    handleMigration() {
        const currentVersion = localStorage.getItem(this.versionKey);
        
        if (!currentVersion) {
            // First time user or legacy data
            localStorage.setItem(this.versionKey, this.version);
        }
        
        // Future migration logic would go here
        // if (currentVersion !== this.version) { ... }
    }

    getStorageInfo() {
        try {
            const data = localStorage.getItem(this.storageKey);
            const size = data ? data.length : 0;
            const taskCount = data ? JSON.parse(data).length : 0;
            
            return {
                size: size,
                taskCount: taskCount,
                sizeFormatted: this.formatBytes(size)
            };
        } catch (error) {
            return { size: 0, taskCount: 0, sizeFormatted: '0 B' };
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Data Validator - handles input sanitization and validation
class DataValidator {
    static sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        
        // Remove HTML tags and trim whitespace
        return input
            .replace(/<[^>]*>/g, '')
            .trim();
    }

    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    static validateTaskText(text) {
        if (!text || typeof text !== 'string') return false;
        if (text.length === 0 || text.length > 500) return false;
        
        // Check for potentially malicious patterns
        const dangerousPatterns = [
            /<script/i,
            /javascript:/i,
            /vbscript:/i,
            /onload=/i,
            /onerror=/i
        ];
        
        return !dangerousPatterns.some(pattern => pattern.test(text));
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        new TodoApp();
    } catch (error) {
        console.error('Failed to initialize Todo App:', error);
        document.body.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #dc3545;">
                <h1>Error</h1>
                <p>Failed to load the Todo application. Please check console for details.</p>
            </div>
        `;
    }
});

// Export for testing (if module system available)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TodoApp, TaskModel, StorageManager, DataValidator };
}