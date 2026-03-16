# Webchat UI Synchronization

This document describes the automatic UI refresh feature that keeps the meeting-app frontend synchronized with changes made through the embedded watsonx Orchestrate webchat.

## Overview

When users create, update, or delete meetings using the embedded webchat agent, the UI automatically refreshes to reflect these changes without requiring manual intervention.

## How It Works

### Architecture

```
User → Webchat → Agent → Backend API → Database
                    ↓
              Event Handler → UI Refresh
```

1. User interacts with the embedded webchat to manage meetings
2. Agent processes the request and calls backend API
3. Agent responds with confirmation message
4. Event handler detects action keywords in the response
5. UI automatically refreshes after 2-second delay

### Implementation Details

#### Event Handler Registration

The event handler is registered using the watsonx Orchestrate webchat API:

```javascript
function onChatLoad(instance) {
    instance.on('receive', function(event, instance) {
        // Handle agent responses
    });
}

window.wxOConfiguration = {
    chatOptions: {
        agentId: "...",
        onLoad: onChatLoad  // Register callback
    }
};
```

#### Message Detection

The handler extracts text from agent responses and checks for action keywords:

**Detected Keywords:**
- `created`, `updated`, `deleted`
- `scheduled`, `removed`, `added`
- `cancelled`, `modified`, `saved`
- `booked`, `meeting has been`
- `successfully`, `confirmed`

#### UI Refresh Mechanism

When an action is detected:
1. Wait 2 seconds (allows backend to process changes)
2. Call `window.loadMeetings()` to refresh data
3. Both calendar and meeting list are updated

## Files Modified

### frontend/index.html

**Lines 152-260**: Webchat configuration with event handlers

Key components:
- `refreshMeetingsUI()` - Function to trigger UI refresh
- `onChatLoad(instance)` - Callback that registers event handlers
- `instance.on('receive', handler)` - Event listener for agent responses

### frontend/js/meetings.js

**Line 8**: Made `loadMeetings()` globally accessible

```javascript
window.loadMeetings = async function loadMeetings() {
    // ... existing code
}
```

## Configuration

### Customizing Refresh Delay

To change the 2-second delay before refresh:

```javascript
// In frontend/index.html, line ~220
setTimeout(refreshMeetingsUI, 2000);  // Change 2000 to desired milliseconds
```

### Adding/Removing Keywords

To modify which agent responses trigger a refresh:

```javascript
// In frontend/index.html, line ~210
const actionKeywords = [
    'created', 'updated', 'deleted',
    // Add or remove keywords here
];
```

## Testing

### Manual Testing

1. Open the meeting app in a browser
2. Open browser console (F12)
3. Open the embedded webchat
4. Create a meeting via chat (e.g., "create a meeting for tomorrow with Ricardo")
5. Observe console logs:
   ```
   ✅ Webchat loaded, instance: [object]
   ✅ Event listener registered successfully
   📨 Agent response received: [event object]
   📝 Extracted text: Your test meeting has been scheduled!
   🔄 Meeting action detected! Refreshing UI in 2 seconds...
   🔄 Refreshing meetings UI...
   ✓ window.loadMeetings() called
   ```
6. Verify the new meeting appears in the calendar and list after 2 seconds

### Manual Refresh

You can manually trigger a refresh from the browser console:

```javascript
window.refreshMeetingsUI()
```

## Troubleshooting

### Event Handler Not Firing

**Symptoms:** No console logs when agent responds

**Solutions:**
1. Check that `onLoad` callback is in `chatOptions`
2. Verify webchat is properly initialized
3. Check browser console for errors

### UI Not Refreshing

**Symptoms:** Console logs appear but UI doesn't update

**Solutions:**
1. Verify `window.loadMeetings` is defined (check console: `typeof window.loadMeetings`)
2. Check network tab for API call to `/api/meetings`
3. Verify backend is responding correctly

### Keywords Not Detected

**Symptoms:** Agent responds but no "Meeting action detected" log

**Solutions:**
1. Check the agent's response text in console logs
2. Add the specific wording used by your agent to `actionKeywords` array
3. Ensure keywords are lowercase in the array

## Performance Considerations

- **Event Handler Overhead:** Minimal - only processes agent responses
- **Refresh Delay:** 2 seconds allows backend processing without excessive waiting
- **API Calls:** Only triggered when meeting actions are detected
- **No Polling:** Uses event-driven approach, no background polling

## Future Enhancements

Potential improvements:
1. **Optimistic UI Updates:** Update UI immediately, then sync with backend
2. **Granular Updates:** Only refresh affected meeting instead of full list
3. **WebSocket Integration:** Real-time updates without polling
4. **Error Handling:** Retry logic if refresh fails
5. **User Notifications:** Toast messages confirming sync

## References

- [watsonx Orchestrate Webchat Events Documentation](https://developer.watson-orchestrate.ibm.com/webchat/events)
- [Message Events API](https://developer.watson-orchestrate.ibm.com/webchat/events#receive)
- [Instance Methods](https://developer.watson-orchestrate.ibm.com/webchat/instance_methods)

## Version History

- **v1.0** (2026-03-16): Initial implementation with event-based UI sync