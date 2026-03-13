// Global app namespace
window.app = window.app || {};

// API Configuration
// For production, use the backend URL directly (will be injected via environment variable)
window.app.API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : (window.BACKEND_URL || 'https://meeting-app-backend.27bat83a6dow.eu-de.codeengine.appdomain.cloud') + '/api';

// Global state
window.app.currentMeetingId = null;
window.app.allMeetings = [];

// Expose for backward compatibility
const API_BASE_URL = window.app.API_BASE_URL;
let currentMeetingId = null;
let allMeetings = [];

// DOM Elements
const modal = document.getElementById('meetingModal');
const modalTitle = document.getElementById('modalTitle');
const meetingForm = document.getElementById('meetingForm');
const newMeetingBtn = document.getElementById('newMeetingBtn');
const refreshBtn = document.getElementById('refreshBtn');
const closeBtn = document.querySelector('.close');
const cancelBtn = document.getElementById('cancelBtn');
const deleteBtn = document.getElementById('deleteBtn');
const onsiteCheckbox = document.getElementById('is_onsite');
const countryGroup = document.getElementById('countryGroup');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadMeetings();
});

// Event Listeners
function initializeEventListeners() {
    newMeetingBtn.addEventListener('click', openNewMeetingModal);
    refreshBtn.addEventListener('click', loadMeetings);
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    deleteBtn.addEventListener('click', deleteMeeting);
    meetingForm.addEventListener('submit', saveMeeting);
    
    // Show/hide country field based on onsite checkbox
    onsiteCheckbox.addEventListener('change', (e) => {
        countryGroup.style.display = e.target.checked ? 'block' : 'none';
        if (!e.target.checked) {
            document.getElementById('country').value = '';
        }
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}

// Modal functions
function openNewMeetingModal() {
    currentMeetingId = null;
    modalTitle.textContent = 'New Meeting';
    deleteBtn.style.display = 'none';
    meetingForm.reset();
    countryGroup.style.display = 'none';
    
    // Set default start time to now
    const now = new Date();
    now.setMinutes(0);
    document.getElementById('start_datetime').value = formatDateTimeLocal(now);
    
    // Set default end time to 1 hour from now
    const endTime = new Date(now.getTime() + 60 * 60 * 1000);
    document.getElementById('end_datetime').value = formatDateTimeLocal(endTime);
    
    modal.style.display = 'block';
}

function openEditMeetingModal(meeting) {
    currentMeetingId = meeting.id;
    modalTitle.textContent = 'Edit Meeting';
    deleteBtn.style.display = 'block';
    
    // Populate form
    document.getElementById('title').value = meeting.title || '';
    document.getElementById('customer').value = meeting.customer || '';
    document.getElementById('description').value = meeting.description || '';
    document.getElementById('start_datetime').value = formatDateTimeLocal(new Date(meeting.start_datetime));
    document.getElementById('end_datetime').value = formatDateTimeLocal(new Date(meeting.end_datetime));
    document.getElementById('location').value = meeting.location || '';
    document.getElementById('attendees').value = meeting.attendees || '';
    document.getElementById('is_onsite').checked = meeting.is_onsite === 1;
    document.getElementById('country').value = meeting.country || '';
    
    countryGroup.style.display = meeting.is_onsite === 1 ? 'block' : 'none';
    
    modal.style.display = 'block';
}

function closeModal() {
    modal.style.display = 'none';
    meetingForm.reset();
    currentMeetingId = null;
}

// Helper function to format datetime for input
function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Format date for display
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Show notification
function showNotification(message, type = 'success') {
    // Simple alert for now - can be enhanced with a toast library
    if (type === 'error') {
        alert('Error: ' + message);
    } else {
        console.log(message);
    }
}

// Export functions for use in other modules
window.app = {
    API_BASE_URL,
    allMeetings,
    openEditMeetingModal,
    formatDateTime,
    showNotification,
    loadMeetings: () => loadMeetings()
};

// Made with Bob
