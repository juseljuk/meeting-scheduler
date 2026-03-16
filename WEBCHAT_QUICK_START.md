# Quick Start: Embed Meeting Manager Agent (No Security)
## Simple Webchat Integration for Testing

> ⚠️ **WARNING**: This approach disables security and should **ONLY** be used for local testing/development. Never use this in production!

## Overview

This guide shows you how to quickly embed the meeting-manager agent into your frontend for testing purposes, skipping the security configuration. Perfect for rapid prototyping and local development.

## Prerequisites

- watsonx Orchestrate instance
- Meeting-manager agent created and deployed
- IBM watsonx Orchestrate ADK installed

## Step 1: Configure Security (Choose Your Approach)

For testing, you have two options:

### Option A: Disable Security (Simplest for Testing)

Use IBM's security configuration script to disable security:

1. **Download the security script** from the [IBM documentation](https://developer.watson-orchestrate.ibm.com/agents/integrate_agents)

2. **Run the script**:
```bash
# Make it executable
chmod +x wxo-security-helper.sh

# Run the script
./wxo-security-helper.sh
```

3. **Follow the prompts**:
   - Enter your Service instance URL (from Settings > API details in watsonx Orchestrate UI)
   - Enter your API key
   - Choose option **2** to "Turn OFF embedded chat security"
   - Confirm by typing "yes"

> 📝 **Note**: This makes your agent publicly accessible without authentication. Only do this in a test environment!

### Option B: Skip Security Configuration (Developer Edition Only)

If you're using **watsonx Orchestrate Developer Edition**, security may not be enforced. You can try generating the embed script directly without configuring security.

## Step 2: Generate Embed Script

Generate the webchat embed script without security:

```bash
# Generate embed script for draft environment
orchestrate channels webchat embed \
  --agent-name meeting_manager \
  --env draft \
  > orchestrate/webchat-embed-simple.html
```

This will output something like:

```html
<script>
  window.watsonxOrchestrate = {
    integrationID: 'your-integration-id-here',
    region: 'us-south',
    serviceInstanceID: 'your-service-instance-id',
    onLoad: function(instance) {
      instance.render();
    }
  };
</script>
<script src="https://web-chat.global.assistant.watson.appdomain.cloud/versions/latest/WatsonxOrchestrate.min.js"></script>
```

## Step 3: Add to Your Frontend

### Option A: Simple Integration (Minimal Changes)

Just add the script to your `frontend/index.html` before the closing `</body>` tag:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <!-- Your existing head content -->
</head>
<body>
    <!-- Your existing body content -->
    
    <!-- Webchat Integration - Add this before </body> -->
    <script>
      window.watsonxOrchestrate = {
        integrationID: 'your-integration-id-here',
        region: 'us-south',
        serviceInstanceID: 'your-service-instance-id',
        
        // Customize appearance
        showLauncher: true,
        hideCloseButton: false,
        
        // Position
        launcherConfig: {
          position: 'bottom-right',
          size: 'default'
        },
        
        // Branding
        headerConfig: {
          title: 'Meeting Assistant',
          subtitle: 'Ask me to manage your meetings'
        },
        
        onLoad: function(instance) {
          instance.render();
          console.log('Webchat loaded successfully!');
        }
      };
    </script>
    <script src="https://web-chat.global.assistant.watson.appdomain.cloud/versions/latest/WatsonxOrchestrate.min.js"></script>
</body>
</html>
```

### Option B: With UI Synchronization

If you want the chat to trigger UI updates, add event handlers:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <!-- Your existing head content -->
</head>
<body>
    <!-- Your existing body content -->
    
    <!-- Webchat Integration with Event Handlers -->
    <script>
      window.watsonxOrchestrate = {
        integrationID: 'your-integration-id-here',
        region: 'us-south',
        serviceInstanceID: 'your-service-instance-id',
        
        showLauncher: true,
        hideCloseButton: false,
        
        launcherConfig: {
          position: 'bottom-right',
          size: 'default',
          label: 'Chat with Meeting Assistant'
        },
        
        headerConfig: {
          title: 'Meeting Assistant',
          subtitle: 'Powered by watsonx Orchestrate'
        },
        
        onLoad: function(instance) {
          instance.render();
          console.log('Webchat loaded!');
          
          // Listen for agent responses
          instance.on('receive', function(event) {
            console.log('Agent response:', event);
            
            // Check if agent mentioned creating/updating/deleting a meeting
            const text = event.data.output.generic?.[0]?.text || '';
            
            if (text.includes('created') || 
                text.includes('updated') || 
                text.includes('deleted')) {
              
              // Refresh the UI after a short delay
              setTimeout(function() {
                console.log('Refreshing UI...');
                
                // Trigger refresh button click
                const refreshBtn = document.getElementById('refreshBtn');
                if (refreshBtn) {
                  refreshBtn.click();
                }
                
                // Or refresh calendar directly
                if (window.calendar) {
                  window.calendar.refetchEvents();
                }
              }, 1000);
            }
          });
        }
      };
    </script>
    <script src="https://web-chat.global.assistant.watson.appdomain.cloud/versions/latest/WatsonxOrchestrate.min.js"></script>
</body>
</html>
```

## Step 4: Test It!

1. **Start your backend** (if not already running):
   ```bash
   cd backend
   npm start
   ```

2. **Start your frontend** (if using local development):
   ```bash
   cd frontend
   # If using a simple HTTP server:
   python -m http.server 8080
   # Or:
   npx serve .
   ```

3. **Open in browser**:
   ```
   http://localhost:8080
   ```

4. **Test the chat**:
   - Click the chat launcher button (bottom-right)
   - Try these commands:
     - "Show me all meetings"
     - "Create a meeting tomorrow with Acme Corp"
     - "List meetings for next week"
     - "Delete meeting #123"

## Customization Options

### Change Position

```javascript
launcherConfig: {
  position: 'bottom-left',  // or 'bottom-right', 'top-left', 'top-right'
  size: 'small'             // or 'default', 'large'
}
```

### Change Colors

```javascript
window.watsonxOrchestrate = {
  // ... other config
  carbonTheme: 'g10',  // Light theme (default)
  // or 'g90' for dark theme
  // or 'g100' for darkest theme
}
```

### Custom Launcher Button

```javascript
launcherConfig: {
  position: 'bottom-right',
  size: 'default',
  label: 'Need help?',
  icon: 'https://your-domain.com/custom-icon.svg'
}
```

### Hide Launcher (Always Open)

```javascript
window.watsonxOrchestrate = {
  // ... other config
  showLauncher: false,
  openChatByDefault: true
}
```

## Complete Example

Here's a complete, copy-paste ready example:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meeting Scheduler with AI Assistant</title>
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>📅 Meeting Scheduler</h1>
            <p>Manage meetings via forms or chat with our AI assistant!</p>
        </header>
        
        <main>
            <!-- Your existing meeting app UI -->
            <button id="refreshBtn">🔄 Refresh</button>
            <div id="calendar"></div>
            <div id="meetingsList"></div>
        </main>
    </div>
    
    <!-- Your existing scripts -->
    <script src="js/app.js"></script>
    <script src="js/meetings.js"></script>
    <script src="js/calendar.js"></script>
    
    <!-- Webchat Integration -->
    <script>
      window.watsonxOrchestrate = {
        // Replace these with your actual values from the embed command
        integrationID: 'your-integration-id-here',
        region: 'us-south',
        serviceInstanceID: 'your-service-instance-id',
        
        // Appearance
        showLauncher: true,
        carbonTheme: 'g10',
        
        // Position
        launcherConfig: {
          position: 'bottom-right',
          size: 'default',
          label: '💬 Chat with Meeting Assistant'
        },
        
        // Header
        headerConfig: {
          title: 'Meeting Assistant',
          subtitle: 'I can help you manage meetings'
        },
        
        // Initialize
        onLoad: function(instance) {
          instance.render();
          console.log('✅ Webchat loaded successfully!');
          
          // Listen for responses
          instance.on('receive', function(event) {
            const text = event.data.output.generic?.[0]?.text || '';
            console.log('Agent said:', text);
            
            // Auto-refresh UI when agent performs actions
            if (text.match(/created|updated|deleted|scheduled/i)) {
              setTimeout(function() {
                console.log('🔄 Refreshing UI...');
                document.getElementById('refreshBtn')?.click();
                window.calendar?.refetchEvents();
              }, 1000);
            }
          });
          
          // Optional: Send welcome message
          instance.send({
            input: {
              text: 'Hello! I can help you manage meetings. Try asking me to "show all meetings" or "create a meeting tomorrow".'
            },
            context: {
              skip_user_input: true
            }
          });
        }
      };
    </script>
    <script src="https://web-chat.global.assistant.watson.appdomain.cloud/versions/latest/WatsonxOrchestrate.min.js"></script>
</body>
</html>
```

## Troubleshooting

### Chat doesn't appear

1. **Check browser console** for errors
2. **Verify integration ID** is correct
3. **Check agent is deployed**:
   ```bash
   orchestrate agents list --env draft
   ```

### Agent doesn't respond

1. **Test agent directly**:
   ```bash
   orchestrate agents chat --name meeting_manager --env draft
   ```

2. **Check toolkit is imported**:
   ```bash
   orchestrate toolkits list
   ```

3. **Verify backend is running** and accessible

### UI doesn't refresh

1. **Check event handler** is registered
2. **Verify refresh button** exists with id="refreshBtn"
3. **Check browser console** for JavaScript errors

## Next Steps

Once you've tested and confirmed everything works:

1. **Enable Security**: Follow the full [WEBCHAT_EMBED_PLAN.md](WEBCHAT_EMBED_PLAN.md) to add JWT authentication
2. **Deploy to Live**: Deploy agent to live environment for production use
3. **Custom Styling**: Add custom CSS to match your branding
4. **Advanced Features**: Add context sharing, rich responses, etc.

## Quick Reference

### Useful Commands

```bash
# List agents
orchestrate agents list --env draft

# Test agent in CLI
orchestrate agents chat --name meeting_manager --env draft

# Generate embed script
orchestrate channels webchat embed --agent-name meeting_manager --env draft

# Configure security (use IBM's bash script)
# Download from: https://developer.watson-orchestrate.ibm.com/agents/integrate_agents
./wxo-security-helper.sh
```

### Test Phrases

Try these in the chat:
- "Show me all meetings"
- "Create a meeting tomorrow at 2pm with Acme Corp"
- "List meetings for next week"
- "Update meeting #123 to be on Friday"
- "Delete meeting #456"
- "Schedule a demo with Ricardo and Jukka in Helsinki"

## Security Warning

⚠️ **Remember**: This setup has **NO SECURITY**. Anyone who can access your application can use the agent. This is fine for:
- ✅ Local development
- ✅ Internal testing
- ✅ Proof of concept demos

But **NOT** for:
- ❌ Production environments
- ❌ Public-facing applications
- ❌ Applications with sensitive data

When you're ready for production, follow the complete security setup in [WEBCHAT_EMBED_PLAN.md](WEBCHAT_EMBED_PLAN.md).

## Summary

You've now embedded the meeting-manager agent into your frontend! 🎉

**What you can do:**
- ✅ Chat with the agent to manage meetings
- ✅ Use natural language commands
- ✅ See UI updates when agent performs actions
- ✅ Test the dual interface (forms + chat)

**What's next:**
- 🔒 Add security for production use
- 🎨 Customize appearance and branding
- 📊 Add analytics and monitoring
- 🌍 Add multi-language support