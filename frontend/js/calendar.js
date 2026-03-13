// Calendar functionality using FullCalendar

let calendar;

// Initialize calendar when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeCalendar();
});

function initializeCalendar() {
    const calendarEl = document.getElementById('calendar');
    
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        height: 'auto',
        events: [],
        eventClick: function(info) {
            // Find the meeting data
            const meetingId = parseInt(info.event.id);
            const meeting = window.app.allMeetings.find(m => m.id === meetingId);
            
            if (meeting) {
                window.app.openEditMeetingModal(meeting);
            }
        },
        dateClick: function(info) {
            // Open new meeting modal with selected date
            openNewMeetingModal();
            
            // Set the start date to the clicked date at 9 AM
            const startDate = new Date(info.date);
            startDate.setHours(9, 0, 0, 0);
            document.getElementById('start_datetime').value = formatDateTimeLocal(startDate);
            
            // Set end date to 1 hour later
            const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
            document.getElementById('end_datetime').value = formatDateTimeLocal(endDate);
        },
        eventDidMount: function(info) {
            // Add custom class based on meeting type
            const meeting = window.app.allMeetings.find(m => m.id === parseInt(info.event.id));
            if (meeting) {
                if (meeting.is_onsite) {
                    info.el.classList.add('fc-event-onsite');
                } else {
                    info.el.classList.add('fc-event-remote');
                }
            }
        }
    });
    
    calendar.render();
}

// Update calendar with meetings
function updateCalendar(meetings) {
    if (!calendar) return;
    
    // Convert meetings to FullCalendar events
    const events = meetings.map(meeting => ({
        id: meeting.id.toString(),
        title: meeting.customer 
            ? `${meeting.title} (${meeting.customer})`
            : meeting.title,
        start: meeting.start_datetime,
        end: meeting.end_datetime,
        backgroundColor: meeting.is_onsite ? '#48bb78' : '#667eea',
        borderColor: meeting.is_onsite ? '#38a169' : '#5568d3',
        extendedProps: {
            description: meeting.description,
            location: meeting.location,
            attendees: meeting.attendees,
            customer: meeting.customer,
            is_onsite: meeting.is_onsite,
            country: meeting.country
        }
    }));
    
    // Remove all events and add new ones
    calendar.removeAllEvents();
    calendar.addEventSource(events);
}

// Helper function (duplicate from app.js for calendar module)
function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Made with Bob
