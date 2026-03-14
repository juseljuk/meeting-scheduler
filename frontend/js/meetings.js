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
    
    // Get selected participants
    const selectedParticipants = Array.from(document.querySelectorAll('input[name="participant"]:checked'))
        .map(checkbox => checkbox.value);
    
    if (selectedParticipants.length === 0) {
        window.app.showNotification('Please select at least one participant', 'error');
        return;
    }
    
    // Convert dates to datetime format (full day: 00:00:00 to 23:59:59)
    const startDate = formData.get('start_date');
    const endDate = formData.get('end_date');
    
    const meetingData = {
        title: formData.get('title'),
        customer: formData.get('customer'),
        description: formData.get('description'),
        start_datetime: `${startDate}T00:00:00`,
        end_datetime: `${endDate}T23:59:59`,
        location: formData.get('location'),
        attendees: selectedParticipants.join(', '),
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
    
    // Filter by selected participant
    const filteredMeetings = window.app.filterMeetingsByParticipant(meetings);
    
    if (filteredMeetings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No meetings found</h3>
                <p>No meetings for the selected participant</p>
            </div>
        `;
        return;
    }
    
    // Sort by start date (upcoming first)
    const sortedMeetings = [...filteredMeetings].sort((a, b) =>
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
    
    container.innerHTML = upcomingMeetings.map(meeting => {
        // Format date range
        const startDate = new Date(meeting.start_datetime);
        const endDate = new Date(meeting.end_datetime);
        const dateRange = formatDateRange(startDate, endDate);
        
        // Get participants
        const participants = meeting.attendees ? meeting.attendees.split(',').map(p => p.trim()) : [];
        
        return `
            <div class="meeting-card ${meeting.is_onsite ? 'onsite' : ''}"
                 onclick="window.app.openEditMeetingModal(${JSON.stringify(meeting).replace(/"/g, '"')})">
                <h3>${escapeHtml(meeting.title)}</h3>
                ${meeting.customer ? `<div class="customer">👤 ${escapeHtml(meeting.customer)}</div>` : ''}
                <div class="time">📅 ${dateRange}</div>
                ${participants.length > 0 ? `<div class="participants">👥 ${participants.map(p => escapeHtml(p)).join(', ')}</div>` : ''}
                ${meeting.location ? `<div class="location">📍 ${escapeHtml(meeting.location)}</div>` : ''}
                <span class="badge ${meeting.is_onsite ? 'onsite' : 'remote'}">
                    ${meeting.is_onsite ? '🏢 On-site' : '💻 Remote'}
                    ${meeting.country ? ` - ${escapeHtml(meeting.country)}` : ''}
                </span>
            </div>
        `;
    }).join('');
}

// Format date range for display
function formatDateRange(startDate, endDate) {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const startStr = startDate.toLocaleDateString('en-US', options);
    const endStr = endDate.toLocaleDateString('en-US', options);
    
    if (startStr === endStr) {
        return startStr;
    }
    return `${startStr} - ${endStr}`;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Made with Bob
