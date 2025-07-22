import { 
    db, 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc, 
    query, 
    orderBy, 
    where,
    onSnapshot
} from './firebase-config.js';

class DailyTaskLogger {
    constructor() {
        this.tasks = [];
        this.filteredTasks = [];
        this.currentView = 'list';
        this.currentEditingTask = null;
        this.currentUser = null;
        
        this.init();
    }

    async init() {
        this.initializeAuthStateListener();
        this.initializeEventListeners();
    }

    initializeAuthStateListener() {
        // For simplified authentication, we'll check login status manually
        // In a real app, you'd use Firebase Auth here
        
        // Check if user is already logged in (simplified)
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUser = savedUser;
            this.showApp();
            this.setCurrentDate();
            this.setDefaultDate();
            this.loadTasks();
            this.updateStats();
            this.loadUserPreferences();
        } else {
            this.showLogin();
        }
    }

    showLogin() {
        document.getElementById('loginContainer').style.display = 'flex';
        document.getElementById('appContainer').style.display = 'none';
    }

    showApp() {
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
        document.getElementById('currentUser').textContent = `Welcome, ${this.currentUser}`;
    }

    initializeEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        
        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());

        // Form submission
        document.getElementById('taskForm').addEventListener('submit', (e) => this.handleTaskSubmit(e));
        document.getElementById('editTaskForm').addEventListener('submit', (e) => this.handleEditSubmit(e));

        // Time calculation for main form
        document.getElementById('startTime').addEventListener('change', () => this.calculateTimeSpent());
        document.getElementById('endTime').addEventListener('change', () => this.calculateTimeSpent());
        
        // Time calculation for edit form
        document.getElementById('editStartTime').addEventListener('change', () => this.calculateEditTimeSpent());
        document.getElementById('editEndTime').addEventListener('change', () => this.calculateEditTimeSpent());

        // Search and filters
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e.target.value));
        document.getElementById('filterCategory').addEventListener('change', (e) => this.applyFilters());
        document.getElementById('filterStatus').addEventListener('change', (e) => this.applyFilters());
        document.getElementById('filterDate').addEventListener('change', (e) => this.applyFilters());

        // View toggle
        document.getElementById('listView').addEventListener('click', () => this.toggleView('list'));
        document.getElementById('cardView').addEventListener('click', () => this.toggleView('card'));

        // Modal controls
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelEdit').addEventListener('click', () => this.closeModal());

        // Export functionality
        document.getElementById('exportBtn').addEventListener('click', () => this.exportTasks());

        // Close modal when clicking outside
        document.getElementById('editModal').addEventListener('click', (e) => {
            if (e.target.id === 'editModal') {
                this.closeModal();
            }
        });
    }

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!username || !password) {
            this.showMessage('Please enter both username and password', 'error');
            return;
        }

        // Check if Firebase is initialized
        if (!db) {
            this.showMessage('Firebase not configured. This application requires Firebase setup for production use.', 'error');
            return;
        }

        try {
            this.showLoading(true);
            
            console.log('Attempting login for username:', username);
            
            // Check if user exists in users collection
            const usersQuery = query(
                collection(db, 'users'), 
                where('username', '==', username)
            );
            
            console.log('Querying users collection...');
            const userSnapshot = await getDocs(usersQuery);
            console.log('Query completed. Empty:', userSnapshot.empty);
            
            if (userSnapshot.empty) {
                console.log('No user found with username:', username);
                this.showMessage('User not found. Please check your username.', 'error');
                return;
            }

            // Validate password
            let validUser = null;
            userSnapshot.forEach((doc) => {
                const userData = doc.data();
                console.log('Found user data:', userData);
                if (userData.password === password) {
                    validUser = userData;
                    console.log('Password validated successfully');
                } else {
                    console.log('Password mismatch');
                }
            });

            if (!validUser) {
                this.showMessage('Invalid password. Please try again.', 'error');
                return;
            }
            
            // Store current user info
            this.currentUser = username;
            localStorage.setItem('currentUser', username);
            
            // Show app directly (simplified auth)
            this.showApp();
            this.setCurrentDate();
            this.setDefaultDate();
            await this.loadTasks();
            this.updateStats();
            this.loadUserPreferences();
            
            this.showMessage('Login successful!', 'success');
            
        } catch (error) {
            console.error('Login error:', error);
            if (error.message.includes('Firebase not initialized')) {
                this.showMessage('Firebase configuration required. Please set up Firebase for production deployment.', 'error');
            } else {
                this.showMessage(`Login failed: ${error.message}`, 'error');
            }
        } finally {
            this.showLoading(false);
        }
    }

    async handleLogout() {
        try {
            this.currentUser = null;
            this.tasks = [];
            this.filteredTasks = [];
            localStorage.removeItem('currentUser');
            
            // Clear the login form
            document.getElementById('loginForm').reset();
            
            this.showLogin();
            this.showMessage('Logged out successfully', 'success');
        } catch (error) {
            console.error('Logout error:', error);
            this.showMessage('Error logging out', 'error');
        }
    }

    setCurrentDate() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', options);
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('taskDate').value = today;
    }

    async handleTaskSubmit(e) {
        e.preventDefault();
        
        if (!this.currentUser) {
            this.showMessage('Please log in to add tasks', 'error');
            return;
        }
        
        const formData = new FormData(e.target);
        const taskData = {
            title: document.getElementById('taskTitle').value,
            category: document.getElementById('taskCategory').value,
            priority: document.getElementById('taskPriority').value,
            timeSpent: parseFloat(document.getElementById('timeSpentInput').value),
            startTime: document.getElementById('startTime').value || null,
            endTime: document.getElementById('endTime').value || null,
            description: document.getElementById('taskDescription').value,
            status: document.getElementById('taskStatus').value,
            date: document.getElementById('taskDate').value,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            username: this.currentUser
        };

        try {
            this.showLoading(true);
            // Save to user-specific collection: data/{username}/tasks
            const userTasksPath = `data/${this.currentUser}/tasks`;
            await addDoc(collection(db, userTasksPath), taskData);
            this.showMessage('Task added successfully!', 'success');
            e.target.reset();
            this.setDefaultDate();
            await this.loadTasks();
            this.updateStats();
        } catch (error) {
            console.error('Error adding task:', error);
            this.showMessage('Error adding task. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async loadTasks() {
        if (!this.currentUser) {
            return;
        }

        try {
            this.showLoading(true);
            // Load user-specific tasks from data/{username}/tasks collection
            const userTasksPath = `data/${this.currentUser}/tasks`;
            const tasksQuery = query(collection(db, userTasksPath), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(tasksQuery);
            
            this.tasks = [];
            querySnapshot.forEach((doc) => {
                this.tasks.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            this.filteredTasks = [...this.tasks];
            this.renderTasks();
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.showMessage('Error loading tasks. Please refresh the page.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    renderTasks() {
        const tasksContainer = document.getElementById('tasksList');
        
        if (this.filteredTasks.length === 0) {
            tasksContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <h3>No tasks found</h3>
                    <p>Start by adding your first daily task above.</p>
                </div>
            `;
            return;
        }

        const tasksHTML = this.filteredTasks.map(task => this.createTaskHTML(task)).join('');
        tasksContainer.innerHTML = tasksHTML;

        // Add event listeners to task action buttons
        this.addTaskEventListeners();
    }

    createTaskHTML(task) {
        const date = new Date(task.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        return `
            <div class="task-item fade-in" data-task-id="${task.id}">
                <div class="task-header">
                    <div>
                        <div class="task-title">${task.title}</div>
                        <div class="task-meta">
                            <span class="task-category">${task.category}</span>
                            <span class="task-priority ${task.priority}">${task.priority}</span>
                            <span class="task-status ${task.status}">${task.status.replace('-', ' ')}</span>
                        </div>
                    </div>
                </div>
                
                ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                
                <div class="task-footer">
                    <div class="task-time">
                        <i class="fas fa-clock"></i>
                        <span>${task.timeSpent}h • ${date}${task.startTime && task.endTime ? ` • ${task.startTime} - ${task.endTime}` : ''}</span>
                    </div>
                    <div class="task-actions">
                        <button class="btn btn-small btn-edit" onclick="app.editTask('${task.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-small btn-delete" onclick="app.deleteTask('${task.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    addTaskEventListeners() {
        // Event listeners are handled via onclick attributes in the HTML for simplicity
        // This could be refactored to use proper event delegation if needed
    }

    async editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        this.currentEditingTask = task;

        // Populate edit form
        document.getElementById('editTaskId').value = task.id;
        document.getElementById('editTaskTitle').value = task.title;
        document.getElementById('editTaskCategory').value = task.category;
        document.getElementById('editTaskDescription').value = task.description || '';
        document.getElementById('editTaskPriority').value = task.priority;
        document.getElementById('editTimeSpent').value = task.timeSpent;
        document.getElementById('editStartTime').value = task.startTime || '';
        document.getElementById('editEndTime').value = task.endTime || '';
        document.getElementById('editTaskStatus').value = task.status;

        this.openModal();
    }

    async handleEditSubmit(e) {
        e.preventDefault();

        if (!this.currentUser) {
            this.showMessage('Please log in to edit tasks', 'error');
            return;
        }

        const taskId = document.getElementById('editTaskId').value;
        const updatedData = {
            title: document.getElementById('editTaskTitle').value,
            category: document.getElementById('editTaskCategory').value,
            description: document.getElementById('editTaskDescription').value,
            priority: document.getElementById('editTaskPriority').value,
            timeSpent: parseFloat(document.getElementById('editTimeSpent').value),
            startTime: document.getElementById('editStartTime').value || null,
            endTime: document.getElementById('editEndTime').value || null,
            status: document.getElementById('editTaskStatus').value,
            updatedAt: new Date().toISOString()
        };

        try {
            this.showLoading(true);
            // Update in user-specific collection
            const userTasksPath = `data/${this.currentUser}/tasks`;
            const taskRef = doc(db, userTasksPath, taskId);
            await updateDoc(taskRef, updatedData);
            this.showMessage('Task updated successfully!', 'success');
            this.closeModal();
            await this.loadTasks();
            this.updateStats();
        } catch (error) {
            console.error('Error updating task:', error);
            this.showMessage('Error updating task. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async deleteTask(taskId) {
        if (!this.currentUser) {
            this.showMessage('Please log in to delete tasks', 'error');
            return;
        }

        if (!confirm('Are you sure you want to delete this task?')) {
            return;
        }

        try {
            this.showLoading(true);
            // Delete from user-specific collection
            const userTasksPath = `data/${this.currentUser}/tasks`;
            await deleteDoc(doc(db, userTasksPath, taskId));
            this.showMessage('Task deleted successfully!', 'success');
            await this.loadTasks();
            this.updateStats();
        } catch (error) {
            console.error('Error deleting task:', error);
            this.showMessage('Error deleting task. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    handleSearch(searchTerm) {
        const filtered = this.tasks.filter(task => 
            task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
        this.filteredTasks = filtered;
        this.renderTasks();
    }

    applyFilters() {
        const categoryFilter = document.getElementById('filterCategory').value;
        const statusFilter = document.getElementById('filterStatus').value;
        const dateFilter = document.getElementById('filterDate').value;

        let filtered = [...this.tasks];

        // Apply category filter
        if (categoryFilter) {
            filtered = filtered.filter(task => task.category === categoryFilter);
        }

        // Apply status filter
        if (statusFilter) {
            filtered = filtered.filter(task => task.status === statusFilter);
        }

        // Apply date filter
        if (dateFilter) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            filtered = filtered.filter(task => {
                const taskDate = new Date(task.date);
                taskDate.setHours(0, 0, 0, 0);
                
                switch (dateFilter) {
                    case 'today':
                        return taskDate.getTime() === today.getTime();
                    case 'yesterday':
                        const yesterday = new Date(today);
                        yesterday.setDate(yesterday.getDate() - 1);
                        return taskDate.getTime() === yesterday.getTime();
                    case 'week':
                        const weekAgo = new Date(today);
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        return taskDate >= weekAgo;
                    case 'month':
                        const monthAgo = new Date(today);
                        monthAgo.setMonth(monthAgo.getMonth() - 1);
                        return taskDate >= monthAgo;
                    default:
                        return true;
                }
            });
        }

        this.filteredTasks = filtered;
        this.renderTasks();
    }

    toggleView(view) {
        this.currentView = view;
        const tasksContainer = document.getElementById('tasksList');
        const listBtn = document.getElementById('listView');
        const cardBtn = document.getElementById('cardView');

        if (view === 'card') {
            tasksContainer.classList.add('card-view');
            cardBtn.classList.add('active');
            listBtn.classList.remove('active');
        } else {
            tasksContainer.classList.remove('card-view');
            listBtn.classList.add('active');
            cardBtn.classList.remove('active');
        }

        this.saveUserPreferences();
    }

    updateStats() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(task => task.status === 'completed').length;
        const totalTimeSpent = this.tasks.reduce((total, task) => total + task.timeSpent, 0);
        const streak = this.calculateStreak();

        document.getElementById('totalTasks').textContent = totalTasks;
        document.getElementById('completedTasks').textContent = completedTasks;
        document.getElementById('timeSpent').textContent = `${totalTimeSpent.toFixed(1)}h`;
        document.getElementById('streak').textContent = streak;
    }

    calculateStreak() {
        // Calculate consecutive days with tasks
        const taskDates = [...new Set(this.tasks.map(task => task.date))].sort().reverse();
        let streak = 0;
        const today = new Date().toISOString().split('T')[0];
        
        for (let i = 0; i < taskDates.length; i++) {
            const expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() - i);
            const expectedDateStr = expectedDate.toISOString().split('T')[0];
            
            if (taskDates[i] === expectedDateStr) {
                streak++;
            } else {
                break;
            }
        }
        
        return streak;
    }

    openModal() {
        document.getElementById('editModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        document.getElementById('editModal').style.display = 'none';
        document.body.style.overflow = 'auto';
        this.currentEditingTask = null;
    }

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        spinner.style.display = show ? 'block' : 'none';
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
            <span>${message}</span>
        `;

        // Insert at the top of the appropriate container
        // Use login container if login is visible, otherwise use app container
        const loginContainer = document.getElementById('loginContainer');
        const appContainer = document.querySelector('.container');
        
        let targetContainer;
        if (loginContainer && loginContainer.style.display !== 'none') {
            targetContainer = loginContainer;
        } else if (appContainer) {
            targetContainer = appContainer;
        } else {
            // Fallback to body if neither container is found
            targetContainer = document.body;
        }
        
        targetContainer.insertBefore(messageDiv, targetContainer.firstChild);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }

    exportTasks() {
        const dataStr = JSON.stringify(this.tasks, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `daily-tasks-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.showMessage('Tasks exported successfully!', 'success');
    }

    saveUserPreferences() {
        const preferences = {
            view: this.currentView
        };
        localStorage.setItem('dailyTaskLoggerPrefs', JSON.stringify(preferences));
    }

    loadUserPreferences() {
        const savedPrefs = localStorage.getItem('dailyTaskLoggerPrefs');
        if (savedPrefs) {
            const preferences = JSON.parse(savedPrefs);
            if (preferences.view) {
                this.toggleView(preferences.view);
            }
        }
    }

    calculateTimeSpent() {
        const startTime = document.getElementById('startTime').value;
        const endTime = document.getElementById('endTime').value;
        
        if (startTime && endTime) {
            const start = new Date(`2000-01-01T${startTime}:00`);
            const end = new Date(`2000-01-01T${endTime}:00`);
            
            if (end > start) {
                const diffMs = end - start;
                const diffHours = diffMs / (1000 * 60 * 60);
                document.getElementById('timeSpentInput').value = diffHours.toFixed(1);
            }
        }
    }

    calculateEditTimeSpent() {
        const startTime = document.getElementById('editStartTime').value;
        const endTime = document.getElementById('editEndTime').value;
        
        if (startTime && endTime) {
            const start = new Date(`2000-01-01T${startTime}:00`);
            const end = new Date(`2000-01-01T${endTime}:00`);
            
            if (end > start) {
                const diffMs = end - start;
                const diffHours = diffMs / (1000 * 60 * 60);
                document.getElementById('editTimeSpent').value = diffHours.toFixed(1);
            }
        }
    }
}

// Initialize the application
const app = new DailyTaskLogger();

// Make app globally available for onclick handlers
window.app = app;
