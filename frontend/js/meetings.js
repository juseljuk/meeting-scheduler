// Meeting API functions

// Load all meetings
async function loadMeetings() {
    try {
        const response = await fetch(`${window.app.API_BASE_URL}/meetings`);
        
        if (!response.ok) {
            throw new Error('Failed to load meetings');
        }
        
        const meetings = await response.json();
        window.app.allMeetings = meetings;
        
        // Update both calendar and list
        updateCalendar(meetings);
        renderMeetingsList(meetings);
        
    } catch (error) {
        console.error('Error loading meetings:', error);
        window.app.showNotification('Failed to load meetings', 'error');
    }
}

// Save meeting (create or update)
async function saveMeeting(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const meetingData = {
        title: formData.get('title'),
        customer: formData.get('customer'),
        description: formData.get('description'),
        start_datetime: formData.get('start_datetime'),
        end_datetime: formData.get('end_datetime'),
        location: formData.get('location'),
        attendees: formData.get('attendees'),
        is_onsite: formData.get('is_onsite') ? 1 : 0,
        country: formData.get('country')
    };
    
    try {
        const url = currentMeetingId 
            ? `${window.app.API_BASE_URL}/meetings/${currentMeetingId}`
            : `${window.app.API_BASE_URL}/meetings`;
        
        const method = currentMeetingId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(meetingData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to save meeting');
        }
        
        closeModal();
        await loadMeetings();
        window.app.showNotification(
            currentMeetingId ? 'Meeting updated successfully' : 'Meeting created successfully'
        );
        
    } catch (error) {
        console.error('Error saving meeting:', error);
        window.app.showNotification('Failed to save meeting', 'error');
    }
}

// Delete meeting
async function deleteMeeting() {
    if (!currentMeetingId) return;
    
    if (!confirm('Are you sure you want to delete this meeting?')) {
        return;
    }
    
    try {
        const response = await fetch(
            `${window.app.API_BASE_URL}/meetings/${currentMeetingId}`,
            { method: 'DELETE' }
        );
        
        if (!response.ok) {
            throw new Error('Failed to delete meeting');
        }
        
        closeModal();
        await loadMeetings();
        window.app.showNotification('Meeting deleted successfully');
        
    } catch (error) {
        console.error('Error deleting meeting:', error);
        window.app.showNotification('Failed to delete meeting', 'error');
    }
}

// Render meetings list
function renderMeetingsList(meetings) {
    const container = document.getElementById('meetingsList');
    
    if (!meetings || meetings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No meetings scheduled</h3>
                <p>Click "New Meeting" to create your first meeting</p>
            </div>
        `;
        return;
    }
    
    // Sort by start date (upcoming first)
    const sortedMeetings = [...meetings].sort((a, b) => 
        new Date(a.start_datetime) - new Date(b.start_datetime)
    );
    
    // Filter to show only upcoming meetings
    const now = new Date();
    const upcomingMeetings = sortedMeetings.filter(m => 
        new Date(m.end_datetime) >= now
    );
    
    if (upcomingMeetings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No upcoming meetings</h3>
                <p>All meetings are in the past</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = upcomingMeetings.map(meeting => `
        <div class="meeting-card ${meeting.is_onsite ? 'onsite' : ''}" 
             onclick="window.app.openEditMeetingModal(${JSON.stringify(meeting).replace(/"/g, '"')})">
            <h3>${escapeHtml(meeting.title)}</h3>
            ${meeting.customer ? `<div class="customer">👤 ${escapeHtml(meeting.customer)}</div>` : ''}
            <div class="time">🕒 ${window.app.formatDateTime(meeting.start_datetime)}</div>
            ${meeting.location ? `<div class="location">📍 ${escapeHtml(meeting.location)}</div>` : ''}
            <span class="badge ${meeting.is_onsite ? 'onsite' : 'remote'}">
                ${meeting.is_onsite ? '🏢 On-site' : '💻 Remote'}
                ${meeting.country ? ` - ${escapeHtml(meeting.country)}` : ''}
            </span>
        </div>
    `).join('');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Made with Bob
