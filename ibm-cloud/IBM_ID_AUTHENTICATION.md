# IBM ID (w3id) Authentication Implementation Guide

This guide provides step-by-step instructions for adding IBM ID (w3id) authentication to the meeting-app, allowing users to login with their IBM corporate credentials.

## Overview

IBM ID (also known as w3id) is IBM's enterprise Single Sign-On (SSO) system that allows IBM employees and authorized partners to authenticate using their IBM credentials. This is implemented through IBM App ID's SAML 2.0 enterprise identity provider integration.

**Key Benefits:**
- Users login with their existing IBM ID credentials
- No separate password management needed
- Enterprise-grade security
- Automatic user provisioning
- Access to IBM employee directory information

## Prerequisites

- IBM Cloud account
- IBM Cloud CLI installed
- Meeting-app deployed to IBM Cloud Code Engine
- **IBM ID federation approval** (requires IBM internal approval process)
- Access to IBM App ID service

## Architecture Overview

```
User → Frontend → Backend → IBM App ID → IBM w3id (SAML) → IBM ID Authentication
                                ↓
                          User Profile & Tokens
```

## Step 1: Create IBM App ID Service

### 1.1 Via IBM Cloud Console

1. Log in to [IBM Cloud Console](https://cloud.ibm.com)
2. Navigate to **Catalog** → **Security and Identity** → **App ID**
3. Configure the service:
   - **Service name**: `meeting-app-appid`
   - **Region**: Same as your Code Engine project (e.g., `eu-de`)
   - **Pricing plan**: Select **Graduated tier** (required for SAML)
4. Click **Create**

**Note:** The Lite plan does NOT support SAML/enterprise identity providers. You must use the Graduated tier for IBM ID integration.

### 1.2 Via IBM Cloud CLI

```bash
# Login to IBM Cloud
ibmcloud login

# Target your resource group
ibmcloud target -g Default

# Create App ID instance with Graduated tier
ibmcloud resource service-instance-create meeting-app-appid \
  appid graduated-tier eu-de

# Create service credentials
ibmcloud resource service-key-create meeting-app-appid-credentials \
  Manager --instance-name meeting-app-appid
```

## Step 2: Request IBM ID Federation

### 2.1 Submit Federation Request

IBM ID integration requires approval from IBM's identity management team:

1. Open a ticket with IBM's w3id team through internal channels
2. Provide the following information:
   - **Application Name**: Meeting Scheduler App
   - **Business Justification**: Internal meeting management for IBM employees
   - **App ID Tenant ID**: (from your App ID instance)
   - **Callback URLs**: Your App ID callback URLs
   - **Requested Attributes**: email, name, employee ID, department (optional)

3. Wait for approval (typically 3-5 business days)

### 2.2 Obtain SAML Metadata

Once approved, you'll receive:
- SAML metadata URL or XML file
- Entity ID
- SSO URL
- Certificate for signature verification

## Step 3: Configure IBM App ID for SAML

### 3.1 Add SAML Identity Provider

1. In IBM Cloud Console, open your App ID instance
2. Go to **Manage Authentication** → **Identity Providers** → **SAML 2.0 Federation**
3. Click **Add SAML IdP**

### 3.2 Configure SAML Settings

**Basic Configuration:**
```
Name: IBM ID (w3id)
Entity ID: https://w3id.sso.ibm.com/auth/sps/samlidp2/saml20
SSO URL: https://w3id.sso.ibm.com/auth/sps/samlidp2/saml20/login
```

**Metadata Configuration:**
- Upload the SAML metadata XML file provided by IBM w3id team
- Or enter the metadata URL if provided

**Attribute Mapping:**
Map SAML attributes to App ID user attributes:
```
SAML Attribute          → App ID Attribute
emailAddress            → email
cn (Common Name)        → name
uid (User ID)           → preferred_username
serialNumber            → employee_id
```

**Advanced Settings:**
- **Sign authentication requests**: Enabled
- **Encrypt assertions**: Enabled (recommended)
- **Name ID format**: Email address
- **Binding**: HTTP-POST

### 3.3 Configure Redirect URLs

1. Go to **Manage Authentication** → **Authentication Settings**
2. Add redirect URLs:
   ```
   http://localhost:3000/ibmid/callback
   https://your-backend-url.codeengine.appdomain.cloud/ibmid/callback
   ```
3. Add web redirect URLs:
   ```
   http://localhost:8080
   https://your-frontend-url.codeengine.appdomain.cloud
   ```

### 3.4 Disable Other Identity Providers (Optional)

If you want IBM ID to be the only login method:
1. Go to **Identity Providers**
2. Disable **Cloud Directory** (username/password)
3. Disable **Social** providers (Google, Facebook, etc.)

## Step 4: Get Service Credentials

### Via Console

1. In App ID instance, go to **Service Credentials**
2. Click **New Credential**
3. Name it `meeting-app-credentials`
4. Click **Add**
5. View credentials and note:
   - `clientId`
   - `secret`
   - `oauthServerUrl`
   - `tenantId`
   - `managementUrl`

## Step 5: Install Backend Dependencies

```bash
cd backend

npm install ibmcloud-appid passport passport-saml express-session
```

## Step 6: Update Backend Code

### 6.1 Create Auth Configuration

Create `backend/src/config/appid.js`:

```javascript
module.exports = {
  clientId: process.env.APPID_CLIENT_ID,
  secret: process.env.APPID_SECRET,
  oauthServerUrl: process.env.APPID_OAUTH_SERVER_URL,
  tenantId: process.env.APPID_TENANT_ID,
  redirectUri: process.env.APPID_REDIRECT_URI || 'http://localhost:3000/ibmid/callback',
  
  // IBM ID specific configuration
  ibmIdEnabled: process.env.IBM_ID_ENABLED === 'true',
  ibmIdOnly: process.env.IBM_ID_ONLY === 'true', // Force IBM ID login only
};
```

### 6.2 Create Auth Middleware

Create `backend/src/middleware/auth.js`:

```javascript
const passport = require('passport');
const session = require('express-session');
const WebAppStrategy = require('ibmcloud-appid').WebAppStrategy;
const appIdConfig = require('../config/appid');

// Initialize session with secure settings
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000, // 8 hours (typical IBM work day)
    sameSite: 'lax'
  }
});

// Configure App ID strategy with IBM ID support
passport.use(new WebAppStrategy({
  tenantId: appIdConfig.tenantId,
  clientId: appIdConfig.clientId,
  secret: appIdConfig.secret,
  oauthServerUrl: appIdConfig.oauthServerUrl,
  redirectUri: appIdConfig.redirectUri
}));

// Serialize user - store IBM ID info
passport.serializeUser((user, cb) => {
  // Extract IBM-specific attributes
  const userData = {
    id: user.sub || user.id,
    email: user.email,
    name: user.name,
    employeeId: user.employee_id,
    department: user.department,
    identityProvider: user.identities?.[0]?.provider || 'ibmid',
    attributes: user
  };
  cb(null, userData);
});

// Deserialize user
passport.deserializeUser((user, cb) => {
  cb(null, user);
});

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ 
    error: 'Unauthorized',
    message: 'Please login with your IBM ID'
  });
};

// Middleware to check if user is IBM employee
const isIBMEmployee = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const user = req.user;
  const isIBM = user.email?.endsWith('@ibm.com') || 
                user.identityProvider === 'ibmid' ||
                user.employeeId;
  
  if (isIBM) {
    return next();
  }
  
  res.status(403).json({ 
    error: 'Forbidden',
    message: 'Access restricted to IBM employees'
  });
};

module.exports = {
  sessionMiddleware,
  passport,
  isAuthenticated,
  isIBMEmployee
};
```

### 6.3 Create Auth Routes

Create `backend/src/routes/auth.js`:

```javascript
const express = require('express');
const router = express.Router();
const { passport } = require('../middleware/auth');
const WebAppStrategy = require('ibmcloud-appid').WebAppStrategy;
const appIdConfig = require('../config/appid');

/**
 * @swagger
 * /auth/ibmid:
 *   get:
 *     summary: Initiate IBM ID login flow
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirect to IBM ID login page
 */
router.get('/ibmid', passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
  successRedirect: '/',
  forceLogin: true,
  // Force SAML IdP (IBM ID)
  allowCreateNewAnonymousUser: false,
  allowAnonymousLogin: false
}));

/**
 * @swagger
 * /auth/callback:
 *   post:
 *     summary: SAML callback endpoint (POST binding)
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirect after successful authentication
 */
router.post('/callback', 
  passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
    failureRedirect: '/login-failed'
  }),
  (req, res) => {
    // Successful authentication
    res.redirect(process.env.FRONTEND_URL || '/');
  }
);

/**
 * @swagger
 * /auth/callback:
 *   get:
 *     summary: OAuth callback endpoint (GET binding)
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirect after successful authentication
 */
router.get('/callback', 
  passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
    failureRedirect: '/login-failed'
  }),
  (req, res) => {
    res.redirect(process.env.FRONTEND_URL || '/');
  }
);

/**
 * @swagger
 * /auth/logout:
 *   get:
 *     summary: Logout user and clear session
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirect to home page
 */
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction failed:', err);
      }
      // Redirect to IBM ID logout (optional)
      if (appIdConfig.ibmIdEnabled) {
        res.redirect('https://w3id.sso.ibm.com/pkmslogout');
      } else {
        res.redirect('/');
      }
    });
  });
});

/**
 * @swagger
 * /auth/user:
 *   get:
 *     summary: Get current user info
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: User information
 *       401:
 *         description: Not authenticated
 */
router.get('/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        employeeId: req.user.employeeId,
        department: req.user.department,
        identityProvider: req.user.identityProvider
      },
      authenticated: true,
      provider: 'ibmid'
    });
  } else {
    res.status(401).json({ 
      authenticated: false,
      message: 'Please login with your IBM ID'
    });
  }
});

/**
 * @swagger
 * /auth/login-failed:
 *   get:
 *     summary: Login failure page
 *     tags: [Authentication]
 */
router.get('/login-failed', (req, res) => {
  res.status(401).json({
    error: 'Authentication failed',
    message: 'Unable to authenticate with IBM ID. Please try again or contact support.'
  });
});

module.exports = router;
```

### 6.4 Update server.js

Modify `backend/src/server.js`:

```javascript
// Add after existing imports
const { sessionMiddleware, passport, isAuthenticated, isIBMEmployee } = require('./middleware/auth');
const authRouter = require('./routes/auth');

// Add after existing middleware (before routes)
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

// Add auth routes
app.use('/auth', authRouter);

// Protect API routes - require IBM employee authentication
app.use('/api/meetings', isAuthenticated, isIBMEmployee, meetingsRouter);

// Optional: Add user info to all API responses
app.use('/api', (req, res, next) => {
  if (req.isAuthenticated()) {
    res.locals.user = req.user;
  }
  next();
});
```

## Step 7: Update Frontend Code

### 7.1 Create Auth Service

Create `frontend/js/auth.js`:

```javascript
// IBM ID Auth service
window.app.auth = {
  currentUser: null,
  
  // Check if user is authenticated
  async checkAuth() {
    try {
      const response = await fetch(`${window.app.API_BASE_URL.replace('/api', '')}/auth/user`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        this.currentUser = data.user;
        return data.authenticated;
      }
      return false;
    } catch (error) {
      console.error('Auth check failed:', error);
      return false;
    }
  },
  
  // Redirect to IBM ID login
  loginWithIBMId() {
    window.location.href = `${window.app.API_BASE_URL.replace('/api', '')}/auth/ibmid`;
  },
  
  // Logout from IBM ID
  async logout() {
    try {
      window.location.href = `${window.app.API_BASE_URL.replace('/api', '')}/auth/logout`;
    } catch (error) {
      console.error('Logout failed:', error);
    }
  },
  
  // Get current user
  getUser() {
    return this.currentUser;
  },
  
  // Check if user is IBM employee
  isIBMEmployee() {
    if (!this.currentUser) return false;
    return this.currentUser.email?.endsWith('@ibm.com') || 
           this.currentUser.employeeId || 
           this.currentUser.identityProvider === 'ibmid';
  }
};
```

### 7.2 Update index.html

Add IBM ID branding to `frontend/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meeting Scheduler - IBM Internal</title>
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <header>
        <div class="header-content">
            <h1>Meeting Scheduler</h1>
            <div class="auth-section">
                <span id="userInfo" style="display: none;">
                    <span class="ibm-badge">IBM</span>
                    Welcome, <span id="userName"></span>
                    <button id="logoutBtn" class="btn btn-secondary">Logout</button>
                </span>
                <button id="loginBtn" class="btn btn-primary" style="display: none;">
                    <span class="ibm-logo">🔐</span> Login with IBM ID
                </button>
            </div>
        </div>
    </header>

    <div class="login-screen" id="loginScreen" style="display: none;">
        <div class="login-container">
            <h2>IBM Meeting Scheduler</h2>
            <p>This application is for IBM employees only.</p>
            <p>Please login with your IBM ID (w3id) credentials.</p>
            <button id="ibmIdLoginBtn" class="btn btn-primary btn-large">
                <span class="ibm-logo">🔐</span> Login with IBM ID
            </button>
            <p class="login-help">
                Need help? Contact <a href="mailto:support@ibm.com">IT Support</a>
            </p>
        </div>
    </div>

    <div class="container" id="mainContent" style="display: none;">
        <!-- Existing meeting scheduler content -->
    </div>

    <script src="js/auth.js"></script>
    <script src="js/app.js"></script>
    <script src="js/meetings.js"></script>
    <script src="js/calendar.js"></script>
</body>
</html>
```

### 7.3 Update app.js

Modify `frontend/js/app.js`:

```javascript
// Initialize app with IBM ID authentication
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication first
    const isAuthenticated = await window.app.auth.checkAuth();
    
    if (isAuthenticated && window.app.auth.isIBMEmployee()) {
        showAuthenticatedUI();
        initializeEventListeners();
        loadMeetings();
    } else if (isAuthenticated && !window.app.auth.isIBMEmployee()) {
        showAccessDenied();
    } else {
        showLoginScreen();
    }
    
    // Setup auth button listeners
    document.getElementById('loginBtn')?.addEventListener('click', () => {
        window.app.auth.loginWithIBMId();
    });
    
    document.getElementById('ibmIdLoginBtn')?.addEventListener('click', () => {
        window.app.auth.loginWithIBMId();
    });
    
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        window.app.auth.logout();
    });
});

function showAuthenticatedUI() {
    const user = window.app.auth.getUser();
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
    document.getElementById('userInfo').style.display = 'inline-flex';
    document.getElementById('userName').textContent = user.name || user.email || 'User';
    document.getElementById('loginBtn').style.display = 'none';
    
    // Show employee ID if available
    if (user.employeeId) {
        console.log('IBM Employee ID:', user.employeeId);
    }
}

function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('userInfo').style.display = 'none';
    document.getElementById('loginBtn').style.display = 'inline-block';
}

function showAccessDenied() {
    document.getElementById('loginScreen').innerHTML = `
        <div class="login-container">
            <h2>Access Denied</h2>
            <p>This application is restricted to IBM employees only.</p>
            <p>Your account does not have the required permissions.</p>
            <button onclick="window.app.auth.logout()" class="btn btn-secondary">
                Logout
            </button>
        </div>
    `;
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainContent').style.display = 'none';
}

// Update fetch calls to include credentials and handle 401
async function loadMeetings() {
    try {
        const response = await fetch(`${API_BASE_URL}/meetings`, {
            credentials: 'include'
        });
        
        if (response.status === 401) {
            window.app.auth.loginWithIBMId();
            return;
        }
        
        if (response.status === 403) {
            showAccessDenied();
            return;
        }
        
        // ... rest of code
    } catch (error) {
        console.error('Error loading meetings:', error);
        showNotification('Failed to load meetings', 'error');
    }
}
```

### 7.4 Add IBM Styling

Add to `frontend/css/styles.css`:

```css
/* IBM ID Authentication Styles */
.login-screen {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: linear-gradient(135deg, #0f62fe 0%, #001d6c 100%);
}

.login-container {
    background: white;
    padding: 3rem;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    text-align: center;
    max-width: 400px;
}

.login-container h2 {
    color: #161616;
    margin-bottom: 1rem;
}

.login-container p {
    color: #525252;
    margin-bottom: 1.5rem;
}

.btn-large {
    padding: 1rem 2rem;
    font-size: 1.1rem;
    width: 100%;
}

.ibm-logo {
    margin-right: 0.5rem;
}

.ibm-badge {
    background: #0f62fe;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: bold;
    margin-right: 0.5rem;
}

.login-help {
    margin-top: 2rem;
    font-size: 0.9rem;
    color: #525252;
}

.login-help a {
    color: #0f62fe;
    text-decoration: none;
}

.login-help a:hover {
    text-decoration: underline;
}

.auth-section {
    display: flex;
    align-items: center;
    gap: 1rem;
}

#userInfo {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
}
```

## Step 8: Configure Environment Variables

### 8.1 Local Development

Create `.env` file in backend directory:

```bash
# App ID Configuration
APPID_CLIENT_ID=your-client-id
APPID_SECRET=your-secret
APPID_OAUTH_SERVER_URL=https://eu-de.appid.cloud.ibm.com/oauth/v4/your-tenant-id
APPID_TENANT_ID=your-tenant-id
APPID_REDIRECT_URI=http://localhost:3000/auth/callback

# IBM ID Configuration
IBM_ID_ENABLED=true
IBM_ID_ONLY=true

# Session Configuration
SESSION_SECRET=your-random-secret-key-change-this

# Frontend URL
FRONTEND_URL=http://localhost:8080

# Other existing variables
PORT=3000
NODE_ENV=development
```

### 8.2 Code Engine Deployment

Update deployment script:

```bash
#!/bin/bash

# Get App ID credentials
APPID_CREDS=$(ibmcloud resource service-key meeting-app-appid-credentials --output json)
APPID_CLIENT_ID=$(echo $APPID_CREDS | jq -r '.[0].credentials.clientId')
APPID_SECRET=$(echo $APPID_CREDS | jq -r '.[0].credentials.secret')
APPID_OAUTH_URL=$(echo $APPID_CREDS | jq -r '.[0].credentials.oauthServerUrl')
APPID_TENANT_ID=$(echo $APPID_CREDS | jq -r '.[0].credentials.tenantId')

# Get backend URL
BACKEND_URL=$(ibmcloud ce app get meeting-app-backend -o json | jq -r '.status.url')
FRONTEND_URL=$(ibmcloud ce app get meeting-app-frontend -o json | jq -r '.status.url')

# Update backend with IBM ID configuration
ibmcloud ce application update meeting-app-backend \
  --env APPID_CLIENT_ID="$APPID_CLIENT_ID" \
  --env APPID_SECRET="$APPID_SECRET" \
  --env APPID_OAUTH_SERVER_URL="$APPID_OAUTH_URL" \
  --env APPID_TENANT_ID="$APPID_TENANT_ID" \
  --env APPID_REDIRECT_URI="$BACKEND_URL/auth/callback" \
  --env IBM_ID_ENABLED="true" \
  --env IBM_ID_ONLY="true" \
  --env FRONTEND_URL="$FRONTEND_URL" \
  --env SESSION_SECRET="$(openssl rand -base64 32)" \
  --env NODE_ENV="production"

echo "✅ IBM ID authentication configured"
echo "Backend URL: $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
echo "Callback URL: $BACKEND_URL/auth/callback"
```

## Step 9: Testing

### 9.1 Local Testing

1. Ensure you have IBM VPN access (if required)
2. Start backend: `cd backend && npm start`
3. Open frontend: `http://localhost:8080`
4. Click "Login with IBM ID"
5. You'll be redirected to IBM w3id login
6. Enter your IBM credentials (w3id)
7. Complete any MFA challenges
8. You should be redirected back to the app

### 9.2 Production Testing

1. Deploy to Code Engine
2. Access frontend URL
3. Test IBM ID login flow
4. Verify user info is correctly populated
5. Test logout flow

## Step 10: Advanced Configuration

### 10.1 Attribute Mapping

Request additional IBM attributes in your federation setup:

```javascript
// In backend/src/middleware/auth.js
passport.serializeUser((user, cb) => {
  const userData = {
    id: user.sub,
    email: user.email,
    name: user.name,
    employeeId: user.employee_id,
    department: user.department,
    location: user.location,
    manager: user.manager,
    costCenter: user.cost_center,
    division: user.division
  };
  cb(null, userData);
});
```

### 10.2 Role-Based Access Control

Implement RBAC based on IBM attributes:

```javascript
// In backend/src/middleware/auth.js
const hasRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const userRole = req.user.department || req.user.division;
    if (allowedRoles.includes(userRole)) {
      return next();
    }
    
    res.status(403).json({ error: 'Insufficient permissions' });
  };
};

// Usage
app.use('/api/admin', isAuthenticated, hasRole(['IT', 'Management']), adminRouter);
```

### 10.3 Session Timeout

Configure appropriate session timeout for IBM security policies:

```javascript
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    sameSite: 'strict'
  },
  rolling: true // Reset expiry on activity
});
```

## Troubleshooting

### Common Issues

1. **SAML Response Validation Failed**
   - Verify SAML metadata is correctly configured
   - Check certificate validity
   - Ensure clock synchronization between servers

2. **Redirect URI Mismatch**
   - Verify callback URLs in App ID match exactly
   - Check for trailing slashes
   - Ensure HTTPS in production

3. **User Attributes Not Populated**
   - Verify attribute mapping in App ID
   - Check SAML assertion contains expected attributes
   - Review federation agreement with w3id team

4. **Session Not Persisting**
   - Check cookie settings (secure flag in production)
   - Verify session secret is set
   - Check for CORS issues with credentials

5. **Access Denied for Valid IBM Employees**
   - Verify email domain check logic
   - Check employee ID attribute mapping
   - Review identity provider configuration

### Debug Mode

Enable detailed logging:

```javascript
// In server.js
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log('=== Auth Debug ===');
    console.log('Session ID:', req.sessionID);
    console.log('Authenticated:', req.isAuthenticated());
    console.log('User:', JSON.stringify(req.user, null, 2));
    console.log('Session:', JSON.stringify(req.session, null, 2));
    console.log('================');
    next();
  });
}
```

## Security Considerations

1. **Use HTTPS Only** - IBM ID requires secure connections
2. **Validate Email Domain** - Always verify @ibm.com domain
3. **Session Security** - Use secure, httpOnly cookies
4. **CSRF Protection** - Implement CSRF tokens for state-changing operations
5. **Audit Logging** - Log all authentication events
6. **Regular Security Reviews** - Follow IBM security policies
7. **Data Privacy** - Handle employee data per IBM privacy policies

## Compliance

### IBM Security Requirements

- **Data Residency**: Ensure data stays in approved regions
- **Encryption**: Use TLS 1.2+ for all communications
- **Audit Trails**: Maintain logs for 90 days minimum
- **Access Reviews**: Quarterly access reviews required
- **Incident Response**: Follow IBM incident response procedures

### GDPR Compliance

- Obtain consent for data processing
- Provide data export functionality
- Implement right to be forgotten
- Document data processing activities

## Cost Considerations

### IBM App ID Graduated Tier

- **Base Cost**: ~$0.50 per 1,000 authentications
- **SAML Support**: Included in Graduated tier
- **Additional Features**: MFA, custom attributes, advanced security

### Estimated Monthly Cost

- 100 users × 20 logins/month = 2,000 authentications
- Cost: ~$1.00/month
- Plus IBM Cloud infrastructure costs

## Support and Resources

### Internal IBM Resources

- **w3id Support**: Open ticket via IBM internal support portal
- **App ID Documentation**: [IBM Cloud Docs](https://cloud.ibm.com/docs/appid)
- **Security Guidelines**: IBM Security Standards Portal
- **Identity Management**: Contact IBM Identity & Access Management team

### External Resources

- [SAML 2.0 Specification](https://docs.oasis-open.org/security/saml/v2.0/)
- [OAuth 2.0 Framework](https://oauth.net/2/)
- [IBM App ID SDK](https://github.com/ibm-cloud-security/appid-serversdk-nodejs)

## Next Steps

1. Submit IBM ID federation request
2. Configure App ID with SAML
3. Implement backend authentication
4. Update frontend with IBM branding
5. Test with IBM credentials
6. Deploy to production
7. Monitor authentication metrics
8. Conduct security review

---

**Implementation Time Estimate**: 1-2 weeks (including federation approval)
**Difficulty Level**: Advanced
**Maintenance**: Low (managed service)
**IBM Approval Required**: Yes