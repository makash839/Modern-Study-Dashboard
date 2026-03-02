// Data Structure
let studyData = {
    subjects: [],
    revisions: []
};

// Load data from localStorage
function loadData() {
    const saved = localStorage.getItem('studyData');
    if (saved) {
        studyData = JSON.parse(saved);
    }
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('studyData', JSON.stringify(studyData));
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    updateUI();
    displayCurrentDate();
    setupEventListeners();
});

// Display current date
function displayCurrentDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-US', options);
}

// Setup Event Listeners
function setupEventListeners() {
    // Add Subject Modal
    document.getElementById('addSubjectBtn').addEventListener('click', () => {
        document.getElementById('subjectModal').classList.add('active');
    });
    
    document.getElementById('closeModal').addEventListener('click', () => {
        document.getElementById('subjectModal').classList.remove('active');
    });
    
    document.getElementById('saveSubject').addEventListener('click', addSubject);
    
    // Add Topic Modal
    document.getElementById('closeTopicModal').addEventListener('click', () => {
        document.getElementById('topicModal').classList.remove('active');
    });
    
    document.getElementById('saveTopic').addEventListener('click', addTopic);
}

// Add Subject
function addSubject() {
    const name = document.getElementById('subjectName').value.trim();
    if (!name) {
        alert('Please enter a subject name!');
        return;
    }
    
    const subject = {
        id: Date.now(),
        name: name,
        topics: [],
        createdAt: new Date().toISOString()
    };
    
    studyData.subjects.push(subject);
    saveData();
    updateUI();
    
    document.getElementById('subjectName').value = '';
    document.getElementById('subjectModal').classList.remove('active');
}

// Delete Subject
function deleteSubject(subjectId) {
    if (confirm('Are you sure you want to delete this subject?')) {
        studyData.subjects = studyData.subjects.filter(s => s.id !== subjectId);
        studyData.revisions = studyData.revisions.filter(r => r.subjectId !== subjectId);
        saveData();
        updateUI();
    }
}

// Open Add Topic Modal
function openTopicModal(subjectId) {
    document.getElementById('currentSubjectId').value = subjectId;
    document.getElementById('topicModal').classList.add('active');
}

// Add Topic
function addTopic() {
    const topicName = document.getElementById('topicName').value.trim();
    const subjectId = parseInt(document.getElementById('currentSubjectId').value);
    
    if (!topicName) {
        alert('Please enter a topic name!');
        return;
    }
    
    const subject = studyData.subjects.find(s => s.id === subjectId);
    if (!subject) return;
    
    const topic = {
        id: Date.now(),
        name: topicName,
        status: 'pending', // pending, started, completed
        startedAt: null,
        completedAt: null
    };
    
    subject.topics.push(topic);
    saveData();
    updateUI();
    
    document.getElementById('topicName').value = '';
    document.getElementById('topicModal').classList.remove('active');
}

// Start Topic
function startTopic(subjectId, topicId) {
    const subject = studyData.subjects.find(s => s.id === subjectId);
    const topic = subject.topics.find(t => t.id === topicId);
    
    topic.status = 'started';
    topic.startedAt = new Date().toISOString();
    
    saveData();
    updateUI();
}

// Finish Topic
function finishTopic(subjectId, topicId) {
    const subject = studyData.subjects.find(s => s.id === subjectId);
    const topic = subject.topics.find(t => t.id === topicId);
    
    topic.status = 'completed';
    topic.completedAt = new Date().toISOString();
    
    // Add to ARS Revision Schedule (1-3-7-15-30 days)
    scheduleRevisions(subjectId, topicId, topic.name, subject.name);
    
    saveData();
    updateUI();
}

// ARS Revision Schedule
function scheduleRevisions(subjectId, topicId, topicName, subjectName) {
    const today = new Date();
    const intervals = [1, 3, 7, 15, 30]; // ARS intervals in days
    
    intervals.forEach(days => {
        const revisionDate = new Date(today);
        revisionDate.setDate(revisionDate.getDate() + days);
        
        studyData.revisions.push({
            id: Date.now() + days,
            subjectId,
            topicId,
            subjectName,
            topicName,
            dueDate: revisionDate.toISOString(),
            completed: false,
            interval: days
        });
    });
}

// Calculate Time Estimates
function calculateEstimates() {
    let totalTopics = 0;
    let completedTopics = 0;
    let startedTopics = 0;
    
    studyData.subjects.forEach(subject => {
        totalTopics += subject.topics.length;
        completedTopics += subject.topics.filter(t => t.status === 'completed').length;
        startedTopics += subject.topics.filter(t => t.status === 'started').length;
    });
    
    const remainingTopics = totalTopics - completedTopics;
    
    // Average calculation based on completed topics
    let avgDaysPerTopic = 3; // Default estimate
    
    if (completedTopics > 0) {
        let totalDays = 0;
        studyData.subjects.forEach(subject => {
            subject.topics.filter(t => t.status === 'completed').forEach(topic => {
                const start = new Date(topic.startedAt);
                const end = new Date(topic.completedAt);
                const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                totalDays += days || 1;
            });
        });
        avgDaysPerTopic = Math.ceil(totalDays / completedTopics);
    }
    
    const estimatedDays = remainingTopics * avgDaysPerTopic;
    
    return {
        totalTopics,
        completedTopics,
        startedTopics,
        estimatedDays
    };
}

// Get Today's Revisions
function getTodayRevisions() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return studyData.revisions.filter(r => {
        const dueDate = new Date(r.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === today.getTime() && !r.completed;
    });
}

// Mark Revision as Complete
function completeRevision(revisionId) {
    const revision = studyData.revisions.find(r => r.id === revisionId);
    if (revision) {
        revision.completed = true;
        saveData();
        updateUI();
    }
}

// Update UI
function updateUI() {
    updateStats();
    updateTodoList();
    updateSubjectsGrid();
    updateOverallProgress();
}

// Update Stats
function updateStats() {
    const estimates = calculateEstimates();
    const todayRevisions = getTodayRevisions();
    
    document.getElementById('totalTopics').textContent = estimates.totalTopics;
    document.getElementById('completedTopics').textContent = estimates.completedTopics;
    document.getElementById('estimatedTime').textContent = `${estimates.estimatedDays} days`;
    document.getElementById('todayRevisions').textContent = todayRevisions.length;
}

// Update To-Do List
function updateTodoList() {
    const container = document.getElementById('todoList');
    const todayRevisions = getTodayRevisions();
    
    if (todayRevisions.length === 0) {
        container.innerHTML = '<p class="empty-state">No revisions scheduled for today! 🎉</p>';
        return;
    }
    
    container.innerHTML = todayRevisions.map(r => `
        <div class="todo-item">
            <div class="todo-info">
                <h4>${r.topicName}</h4>
                <p>${r.subjectName} • Revision Day ${r.interval}</p>
            </div>
            <button class="revision-badge" onclick="completeRevision(${r.id})">
                <i class="fas fa-check"></i> Mark Done
            </button>
        </div>
    `).join('');
}

// Update Subjects Grid
function updateSubjectsGrid() {
    const container = document.getElementById('subjectsGrid');
    
    if (studyData.subjects.length === 0) {
        container.innerHTML = '<p class="empty-state">Click "Add Subject" to start tracking your studies!</p>';
        return;
    }
    
    container.innerHTML = studyData.subjects.map(subject => {
        const totalTopics = subject.topics.length;
        const completedTopics = subject.topics.filter(t => t.status === 'completed').length;
        const progress = totalTopics > 0 ? (completedTopics / totalTopics * 100).toFixed(0) : 0;
        
        return `
            <div class="subject-card">
                <div class="subject-header">
                    <h3><i class="fas fa-book"></i> ${subject.name}</h3>
                    <div class="subject-actions">
                        <button class="icon-btn" onclick="openTopicModal(${subject.id})" title="Add Topic">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="icon-btn" onclick="deleteSubject(${subject.id})" title="Delete Subject">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                
                <div class="subject-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <p class="progress-text">${completedTopics}/${totalTopics} topics • ${progress}%</p>
                </div>
                
                <div class="topics-list">
                    ${subject.topics.length === 0 ? 
                        '<p class="empty-state">No topics yet. Add one!</p>' : 
                        subject.topics.map(topic => `
                            <div class="topic-item ${topic.status}">
                                <div class="topic-checkbox">
                                    <input type="checkbox" class="checkbox" ${topic.status === 'completed' ? 'checked disabled' : ''}>
                                    <span>${topic.name}</span>
                                </div>
                                <div class="topic-status">
                                    ${topic.status === 'pending' ? 
                                        `<button class="status-btn start" onclick="startTopic(${subject.id}, ${topic.id})">Start</button>` : 
                                        topic.status === 'started' ? 
                                        `<button class="status-btn finish" onclick="finishTopic(${subject.id}, ${topic.id})">Finish</button>` :
                                        '<span style="color: #10b981; font-weight: 600;">✓ Done</span>'
                                    }
                                </div>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        `;
    }).join('');
}

// Update Overall Progress
function updateOverallProgress() {
    const estimates = calculateEstimates();
    const progress = estimates.totalTopics > 0 ? 
        (estimates.completedTopics / estimates.totalTopics * 100).toFixed(0) : 0;
    
    document.getElementById('overallProgress').style.width = `${progress}%`;
    document.getElementById('progressPercent').textContent = progress;
}
