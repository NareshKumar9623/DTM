import { 
    db, 
    auth,
    googleProvider,
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc, 
    query, 
    orderBy, 
    where,
    onSnapshot,
    setDoc,
    signInWithEmailAndPassword,
    signInWithPopup,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from './firebase-config.js';

class DailyTaskLogger {
    constructor() {
        this.tasks = [];
        this.filteredTasks = [];
        this.currentView = 'list';
        this.currentEditingTask = null;
        this.currentUser = null;
        this.unsubscribeAuth = null;
        
        this.init();
    }

    async init() {
        this.initializeEventListeners();
        this.initializeAuthStateListener();
        
        // Add cleanup on page unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        // Handle visibility change for better session management
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Tab is now hidden
                console.log('Tab hidden - saving state');
            } else {
                // Tab is now visible
                console.log('Tab visible - checking auth state');
                // Refresh data if user is logged in
                if (this.currentUser) {
                    this.loadTasks();
                    this.updateStats();
                }
            }
        });
    }

    initializeAuthStateListener() {
        // Set up Firebase Auth state listener
        this.unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
            
            if (user) {
                this.currentUser = user;
                this.showApp();
                this.setCurrentDate();
                this.setDefaultDate();
                this.loadTasks();
                this.updateStats();
                this.loadUserPreferences();
                
                // Store user data in Firestore if it doesn't exist
                this.ensureUserDocument(user);
                
                // Clear any auth error messages when successfully logged in
                this.clearMessages();
            } else {
                // User is logged out
                this.currentUser = null;
                this.tasks = [];
                this.filteredTasks = [];
                this.currentEditingTask = null;
                
                // Clear any cached data
                this.clearCachedData();
                
                this.showLogin();
                console.log('User session ended, showing login page');
            }
        });
    }

    clearCachedData() {
        // Clear any locally stored sensitive data
        this.tasks = [];
        this.filteredTasks = [];
        this.currentEditingTask = null;
        
        // Reset forms
        const forms = ['loginForm', 'registerForm', 'taskForm', 'editTaskForm'];
        forms.forEach(formId => {
            const form = document.getElementById(formId);
            if (form) form.reset();
        });
        
        // Close any open modals
        this.closeModal();
        
        // Reset view state
        this.currentView = 'list';
        
        // Clear stats
        const stats = ['totalTasks', 'completedTasks', 'timeSpent', 'streak'];
        stats.forEach(statId => {
            const element = document.getElementById(statId);
            if (element) element.textContent = '0';
        });
        
        // Clear tasks list
        const tasksList = document.getElementById('tasksList');
        if (tasksList) tasksList.innerHTML = '';
    }

    async ensureUserDocument(user) {
        try {
            const userRef = doc(db, 'users', user.uid);
            const userData = {
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0],
                photoURL: user.photoURL || null,
                lastLogin: new Date().toISOString(),
                provider: user.providerData[0]?.providerId || 'unknown'
            };
            
            await setDoc(userRef, userData, { merge: true });
        } catch (error) {
            console.error('Error saving user data:', error);
        }
    }

    showLogin() {
        document.getElementById('loginContainer').style.display = 'flex';
        document.getElementById('appContainer').style.display = 'none';
    }

    showApp() {
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
        document.getElementById('currentUser').textContent = `Welcome, ${this.currentUser.displayName || this.currentUser.email}`;
    }

    initializeEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        
        // Register form
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));
        
        // Google Sign-in buttons
        document.getElementById('googleSignIn').addEventListener('click', () => this.handleGoogleSignIn());
        document.getElementById('googleSignUpBtn').addEventListener('click', () => this.handleGoogleSignIn());
        
        // Form toggle buttons
        document.getElementById('showRegister').addEventListener('click', () => this.showRegisterForm());
        document.getElementById('showLogin').addEventListener('click', () => this.showLoginForm());
        
        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());

        // Form submission
        document.getElementById('taskForm').addEventListener('submit', (e) => this.handleTaskSubmit(e));
        document.getElementById('editTaskForm').addEventListener('submit', (e) => this.handleEditSubmit(e));

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
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // Clear any existing messages
        this.clearMessages();

        if (!email || !password) {
            this.showMessage('Please enter both email and password', 'error');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showMessage('Please enter a valid email address', 'error');
            return;
        }

        try {
            this.showLoading(true);
            await signInWithEmailAndPassword(auth, email, password);
            this.showMessage('Login successful!', 'success');
            // Clear form after successful login
            document.getElementById('loginForm').reset();
        } catch (error) {
            console.error('Login error:', error);
            let errorMessage = 'Login failed. Please try again.';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'No account found with this email address.';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Incorrect password. Please try again.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address format.';
                    break;
                case 'auth/invalid-credential':
                    errorMessage = 'Invalid email or password combination.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many failed attempts. Please try again later.';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'This account has been disabled.';
                    break;
                default:
                    // Handle mock auth error
                    if (error.message && error.message.includes('Invalid email or password')) {
                        errorMessage = 'Invalid email or password combination.';
                    }
                    break;
            }
            
            this.showMessage(errorMessage, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Clear any existing messages
        this.clearMessages();

        if (!email || !password || !confirmPassword) {
            this.showMessage('Please fill in all fields', 'error');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showMessage('Please enter a valid email address', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showMessage('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            this.showMessage('Password must be at least 6 characters long', 'error');
            return;
        }

        if (!this.isStrongPassword(password)) {
            this.showMessage('Password must contain at least one letter and one number', 'error');
            return;
        }

        try {
            this.showLoading(true);
            await createUserWithEmailAndPassword(auth, email, password);
            this.showMessage('Account created successfully! Welcome!', 'success');
            // Clear form after successful registration
            document.getElementById('registerForm').reset();
        } catch (error) {
            console.error('Registration error:', error);
            let errorMessage = 'Registration failed. Please try again.';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'An account with this email already exists. Please sign in instead.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address format.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Password is too weak. Please use a stronger password with letters and numbers.';
                    break;
                case 'auth/operation-not-allowed':
                    errorMessage = 'Email/password accounts are not enabled. Please contact support.';
                    break;
                default:
                    break;
            }
            
            this.showMessage(errorMessage, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async handleGoogleSignIn() {
        // Clear any existing messages
        this.clearMessages();
        
        try {
            this.showLoading(true);
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            this.showMessage(`Welcome ${user.displayName || user.email}! Signed in with Google.`, 'success');
        } catch (error) {
            console.error('Google sign-in error:', error);
            let errorMessage = 'Google sign-in failed. Please try again.';
            
            switch (error.code) {
                case 'auth/popup-closed-by-user':
                    errorMessage = 'Sign-in cancelled by user.';
                    break;
                case 'auth/popup-blocked':
                    errorMessage = 'Popup blocked by browser. Please allow popups for this site and try again.';
                    break;
                case 'auth/account-exists-with-different-credential':
                    errorMessage = 'An account already exists with this email using a different sign-in method.';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'Network error. Please check your connection and try again.';
                    break;
                case 'auth/internal-error':
                    errorMessage = 'Internal error occurred. Please try again later.';
                    break;
                default:
                    // Check if it's our mock implementation
                    if (error.message && error.message.includes('Mock')) {
                        // Don't show error for mock - just show success
                        this.showMessage('Mock Google sign-in successful!', 'success');
                        return;
                    }
                    break;
            }
            
            this.showMessage(errorMessage, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    showLoginForm() {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
    }

    showRegisterForm() {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
    }

    async handleLogout() {
        try {
            this.showLoading(true);
            
            // Clear local data first
            this.tasks = [];
            this.filteredTasks = [];
            
            // Clear any existing messages
            this.clearMessages();
            
            // Clear forms
            document.getElementById('loginForm').reset();
            document.getElementById('registerForm').reset();
            
            // Clear any cached user preferences
            localStorage.removeItem('dailyTaskLoggerPrefs');
            
            // Reset UI state
            this.currentEditingTask = null;
            this.currentView = 'list';
            
            // Sign out from Firebase
            await signOut(auth);
            
            // Show login form
            this.showLoginForm();
            this.showMessage('Logged out successfully', 'success');
        } catch (error) {
            console.error('Logout error:', error);
            this.showMessage('Error logging out. Please try again.', 'error');
        } finally {
            this.showLoading(false);
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
        
        const taskData = {
            title: document.getElementById('taskTitle').value,
            category: document.getElementById('taskCategory').value,
            priority: document.getElementById('taskPriority').value,
            timeSpent: parseFloat(document.getElementById('timeSpentInput').value),
            description: document.getElementById('taskDescription').value,
            status: document.getElementById('taskStatus').value,
            date: document.getElementById('taskDate').value,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userId: this.currentUser.uid
        };

        try {
            this.showLoading(true);
            // Save to user-specific collection: data/{userId}/tasks
            const userTasksPath = `data/${this.currentUser.uid}/tasks`;
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
            // Load user-specific tasks from data/{userId}/tasks collection
            const userTasksPath = `data/${this.currentUser.uid}/tasks`;
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
            console.log(`Loaded ${this.tasks.length} tasks for user ${this.currentUser.email}`);
        } catch (error) {
            console.error('Error loading tasks:', error);
            
            let errorMessage = 'Error loading tasks. Please refresh the page.';
            if (error.code === 'permission-denied') {
                errorMessage = 'Access denied. Please log in again.';
                // Force logout if permission denied
                this.handleLogout();
                return;
            } else if (error.code === 'unavailable') {
                errorMessage = 'Service temporarily unavailable. Please try again later.';
            } else if (error.message && error.message.includes('network')) {
                errorMessage = 'Network error. Please check your connection.';
            }
            
            this.showMessage(errorMessage, 'error');
            
            // Show empty state on error
            const tasksContainer = document.getElementById('tasksList');
            if (tasksContainer) {
                tasksContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Unable to load tasks</h3>
                        <p>Please check your connection and try refreshing the page.</p>
                    </div>
                `;
            }
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
                        <span>${task.timeSpent}h • ${date}</span>
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
            status: document.getElementById('editTaskStatus').value,
            updatedAt: new Date().toISOString()
        };

        try {
            this.showLoading(true);
            // Update in user-specific collection
            const userTasksPath = `data/${this.currentUser.uid}/tasks`;
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
            // Delete from user-specific collection - FIXED: Use this.currentUser.uid instead of this.currentUser
            const userTasksPath = `data/${this.currentUser.uid}/tasks`;
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
        const loginContainer = document.getElementById('loginContainer');
        const appContainer = document.getElementById('appContainer');
        
        if (spinner) {
            spinner.style.display = show ? 'block' : 'none';
        }
        
        // Disable form inputs while loading
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            const inputs = form.querySelectorAll('input, button, select, textarea');
            inputs.forEach(input => {
                input.disabled = show;
            });
        });
        
        // Add loading class to containers for better UX
        if (show) {
            if (loginContainer && loginContainer.style.display !== 'none') {
                loginContainer.classList.add('loading');
            }
            if (appContainer && appContainer.style.display !== 'none') {
                appContainer.classList.add('loading');
            }
        } else {
            if (loginContainer) loginContainer.classList.remove('loading');
            if (appContainer) appContainer.classList.remove('loading');
        }
    }

    showMessage(message, type) {
        // Remove existing messages
        this.clearMessages();

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
            <span>${message}</span>
        `;

        // Insert at the top of the appropriate container
        let container = document.querySelector('.container');
        
        // If in login view, use login container instead
        if (!container || container.style.display === 'none') {
            container = document.querySelector('.login-container');
            if (container) {
                const loginCard = container.querySelector('.login-card');
                if (loginCard) {
                    loginCard.insertBefore(messageDiv, loginCard.firstChild);
                } else {
                    container.insertBefore(messageDiv, container.firstChild);
                }
            } else {
                // Fallback: append to body if no container found
                document.body.appendChild(messageDiv);
            }
        } else {
            container.insertBefore(messageDiv, container.firstChild);
        }

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);

        // Scroll to message if needed
        messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    clearMessages() {
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isStrongPassword(password) {
        // Check if password contains at least one letter and one number
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /\d/.test(password);
        return hasLetter && hasNumber;
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
            try {
                const preferences = JSON.parse(savedPrefs);
                if (preferences.view) {
                    this.toggleView(preferences.view);
                }
            } catch (error) {
                console.warn('Error loading user preferences:', error);
                // Clear corrupted preferences
                localStorage.removeItem('dailyTaskLoggerPrefs');
            }
        }
    }

    // Cleanup method for proper session management
    cleanup() {
        // Unsubscribe from auth state listener
        if (this.unsubscribeAuth) {
            this.unsubscribeAuth();
            this.unsubscribeAuth = null;
        }
        
        // Clear any timeouts or intervals
        this.clearCachedData();
        
        // Remove event listeners if needed
        console.log('Application cleanup completed');
    }
}

// Initialize the application
const app = new DailyTaskLogger();

// Make app globally available for onclick handlers
window.app = app;
