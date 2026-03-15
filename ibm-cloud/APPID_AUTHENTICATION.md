# IBM App ID Authentication Implementation Guide

This guide provides step-by-step instructions for adding IBM App ID authentication to the meeting-app.

## Overview

IBM App ID provides cloud-based authentication and authorization services with:
- Pre-built login UI widgets
- Social login (Google, Facebook, etc.)
- Username/password authentication
- Multi-factor authentication (MFA)
- User profile management
- Enterprise SSO support

## Prerequisites

- IBM Cloud account
- IBM Cloud CLI installed
- Meeting-app deployed to IBM Cloud Code Engine
- Basic understanding of OAuth 2.0 flow

## Step 1: Create IBM App ID Service

### 1.1 Via IBM Cloud Console

1. Log in to [IBM Cloud Console](https://cloud.ibm.com)
2. Navigate to **Catalog** → **Security and Identity** → **App ID**
3. Configure the service:
   - **Service name**: `meeting-app-appid`
   - **Region**: Same as your Code Engine project (e.g., `eu-de`)
   - **Pricing plan**: Select **Lite** (free tier) or **Graduated tier**
4. Click **Create**

### 1.2 Via IBM Cloud CLI

```bash
# Login to IBM Cloud
ibmcloud login

# Target your resource group
ibmcloud target -g Default

# Create App ID instance
ibmcloud resource service-instance-create meeting-app-appid \
  appid lite eu-de

# Create service credentials
ibmcloud resource service-key-create meeting-app-appid-credentials \
  Manager --instance-name meeting-app-appid
```

## Step 2: Configure App ID

### 2.1 Add Redirect URLs

1. In IBM Cloud Console, open your App ID instance
2. Go to **Manage Authentication** → **Authentication Settings**
3. Add redirect URLs:
   ```
   http://localhost:3000/appid/callback
   https://your-backend-url.codeengine.appdomain.cloud/appid/callback
   ```
4. Add web redirect URLs (for frontend):
   ```
   http://localhost:8080
   https://your-frontend-url.codeengine.appdomain.cloud
   ```

### 2.2 Configure Identity Providers

#### Cloud Directory (Username/Password)
1. Go to **Manage Authentication** → **Cloud Directory**
2. Enable **Cloud Directory**
3. Configure settings:
   - **Allow users to sign up**: Enabled
   - **Email verification**: Enabled (recommended)
   - **Password strength**: Configure as needed
4. Customize email templates (optional)

#### Social Identity Providers (Optional)
1. Go to **Manage Authentication** → **Identity Providers**
2. Enable desired providers (Google, Facebook, etc.)
3. Configure OAuth credentials for each provider

### 2.3 Customize Login Widget (Optional)

1. Go to **Manage Authentication** → **Login Customization**
2. Upload logo and customize colors
3. Configure language settings

## Step 3: Get Service Credentials

### 3.1 Via Console

1. In App ID instance, go to **Service Credentials**
2. Click **New Credential**
3. Name it `meeting-app-credentials`
4. Click **Add**
5. View credentials and note:
   - `clientId`
   - `secret`
   - `oauthServerUrl`
   - `tenantId`

### 3.2 Via CLI

```bash
# Get credentials
ibmcloud resource service-key meeting-app-appid-credentials

# Output will show JSON with credentials
```

## Step 4: Install Backend Dependencies

```bash
cd backend

npm install ibmcloud-appid passport express-session
```

## Step 5: Update Backend Code

### 5.1 Create Auth Configuration File

Create `backend/src/config/appid.js`:

```javascript
module.exports = {
  clientId: process.env.APPID_CLIENT_ID,
  secret: process.env.APPID_SECRET,
  oauthServerUrl: process.env.APPID_OAUTH_SERVER_URL,
  tenantId: process.env.APPID_TENANT_ID,
  redirectUri: process.env.APPID_REDIRECT_URI || 'http://localhost:3000/appid/callback'
};
```

### 5.2 Create Auth Middleware

Create `backend/src/middleware/auth.js`:

```javascript
const passport = require('passport');
const session = require('express-session');
const WebAppStrategy = require('ibmcloud-appid').WebAppStrategy;
const appIdConfig = require('../config/appid');

// Initialize session
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
});

// Configure App ID strategy
passport.use(new WebAppStrategy({
  tenantId: appIdConfig.tenantId,
  clientId: appIdConfig.clientId,
  secret: appIdConfig.secret,
  oauthServerUrl: appIdConfig.oauthServerUrl,
  redirectUri: appIdConfig.redirectUri
}));

// Serialize user
passport.serializeUser((user, cb) => {
  cb(null, user);
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
  res.status(401).json({ error: 'Unauthorized' });
};

module.exports = {
  sessionMiddleware,
  passport,
  isAuthenticated
};
```

### 5.3 Create Auth Routes

Create `backend/src/routes/auth.js`:

```javascript
const express = require('express');
const router = express.Router();
const { passport } = require('../middleware/auth');

/**
 * @swagger
 * /auth/login:
 *   get:
 *     summary: Initiate login flow
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirect to App ID login page
 */
router.get('/login', passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
  successRedirect: '/',
  forceLogin: true
}));

/**
 * @swagger
 * /auth/callback:
 *   get:
 *     summary: OAuth callback endpoint
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirect after successful authentication
 */
router.get('/callback', passport.authenticate(WebAppStrategy.STRATEGY_NAME));

/**
 * @swagger
 * /auth/logout:
 *   get:
 *     summary: Logout user
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
        return res.status(500).json({ error: 'Session destruction failed' });
      }
      res.redirect('/');
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
      user: req.user,
      authenticated: true
    });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

module.exports = router;
```

### 5.4 Update server.js

Modify `backend/src/server.js` to include authentication:

```javascript
// Add after existing imports
const { sessionMiddleware, passport, isAuthenticated } = require('./middleware/auth');
const authRouter = require('./routes/auth');

// Add after existing middleware (before routes)
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

// Add auth routes
app.use('/auth', authRouter);

// Protect API routes (add isAuthenticated middleware)
app.use('/api/meetings', isAuthenticated, meetingsRouter);
```

## Step 6: Update Frontend Code

### 6.1 Create Auth Service

Create `frontend/js/auth.js`:

```javascript
// Auth service for handling authentication
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
  
  // Redirect to login
  login() {
    window.location.href = `${window.app.API_BASE_URL.replace('/api', '')}/auth/login`;
  },
  
  // Logout
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
  }
};
```

### 6.2 Update index.html

Add auth UI elements to `frontend/index.html`:

```html
<!-- Add in header section -->
<div class="auth-section" style="float: right; margin: 10px;">
  <span id="userInfo" style="display: none;">
    Welcome, <span id="userName"></span>
    <button id="logoutBtn" class="btn">Logout</button>
  </span>
  <button id="loginBtn" class="btn" style="display: none;">Login</button>
</div>

<!-- Add before closing </body> tag -->
<script src="js/auth.js"></script>
```

### 6.3 Update app.js

Modify `frontend/js/app.js` to handle authentication:

```javascript
// Add at the beginning of DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication first
    const isAuthenticated = await window.app.auth.checkAuth();
    
    if (isAuthenticated) {
        showAuthenticatedUI();
        initializeEventListeners();
        loadMeetings();
    } else {
        showUnauthenticatedUI();
    }
    
    // Setup auth button listeners
    document.getElementById('loginBtn')?.addEventListener('click', () => {
        window.app.auth.login();
    });
    
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        window.app.auth.logout();
    });
});

function showAuthenticatedUI() {
    const user = window.app.auth.getUser();
    document.getElementById('userInfo').style.display = 'inline';
    document.getElementById('userName').textContent = user.name || user.email || 'User';
    document.getElementById('loginBtn').style.display = 'none';
    document.querySelector('.container').style.display = 'block';
}

function showUnauthenticatedUI() {
    document.getElementById('userInfo').style.display = 'none';
    document.getElementById('loginBtn').style.display = 'inline';
    document.querySelector('.container').style.display = 'none';
}

// Update fetch calls to include credentials
async function loadMeetings() {
    try {
        const response = await fetch(`${API_BASE_URL}/meetings`, {
            credentials: 'include'  // Add this
        });
        // ... rest of code
    } catch (error) {
        if (error.status === 401) {
            window.app.auth.login();
        }
    }
}
```

## Step 7: Configure Environment Variables

### 7.1 Local Development

Create `.env` file in backend directory:

```bash
# App ID Configuration
APPID_CLIENT_ID=your-client-id
APPID_SECRET=your-secret
APPID_OAUTH_SERVER_URL=https://eu-de.appid.cloud.ibm.com/oauth/v4/your-tenant-id
APPID_TENANT_ID=your-tenant-id
APPID_REDIRECT_URI=http://localhost:3000/auth/callback

# Session Secret
SESSION_SECRET=your-random-secret-key-change-this

# Other existing variables
PORT=3000
NODE_ENV=development
```

### 7.2 Code Engine Deployment

Update your deployment script to include App ID credentials:

```bash
# In ibm-cloud/deploy-with-cloudant.sh or similar

# Get App ID credentials
APPID_CREDS=$(ibmcloud resource service-key meeting-app-appid-credentials --output json)
APPID_CLIENT_ID=$(echo $APPID_CREDS | jq -r '.[0].credentials.clientId')
APPID_SECRET=$(echo $APPID_CREDS | jq -r '.[0].credentials.secret')
APPID_OAUTH_URL=$(echo $APPID_CREDS | jq -r '.[0].credentials.oauthServerUrl')
APPID_TENANT_ID=$(echo $APPID_CREDS | jq -r '.[0].credentials.tenantId')

# Update backend with App ID environment variables
ibmcloud ce application update meeting-app-backend \
  --env APPID_CLIENT_ID="$APPID_CLIENT_ID" \
  --env APPID_SECRET="$APPID_SECRET" \
  --env APPID_OAUTH_SERVER_URL="$APPID_OAUTH_URL" \
  --env APPID_TENANT_ID="$APPID_TENANT_ID" \
  --env APPID_REDIRECT_URI="https://your-backend-url/auth/callback" \
  --env SESSION_SECRET="$(openssl rand -base64 32)"
```

## Step 8: Test Authentication

### 8.1 Local Testing

1. Start backend:
   ```bash
   cd backend
   npm start
   ```

2. Open frontend in browser: `http://localhost:8080`

3. Click "Login" button

4. You should be redirected to App ID login page

5. Sign up or login with test credentials

6. After successful login, you should be redirected back to the app

### 8.2 Production Testing

1. Deploy updated code to Code Engine

2. Access your frontend URL

3. Test login flow

4. Verify protected API endpoints require authentication

## Step 9: Advanced Features (Optional)

### 9.1 Add User Roles

Modify `backend/src/middleware/auth.js`:

```javascript
const hasRole = (role) => {
  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const userRoles = req.user.roles || [];
    if (userRoles.includes(role)) {
      return next();
    }
    
    res.status(403).json({ error: 'Forbidden' });
  };
};

module.exports = {
  sessionMiddleware,
  passport,
  isAuthenticated,
  hasRole
};
```

### 9.2 Add User Profile Management

Create `backend/src/routes/profile.js`:

```javascript
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');

router.get('/', isAuthenticated, (req, res) => {
  res.json({
    user: req.user
  });
});

router.put('/', isAuthenticated, async (req, res) => {
  // Update user profile logic
  res.json({ message: 'Profile updated' });
});

module.exports = router;
```

### 9.3 Enable Multi-Factor Authentication

1. In App ID console, go to **Cloud Directory** → **Multi-factor authentication**
2. Enable MFA
3. Configure MFA methods (Email, SMS, TOTP)
4. Users will be prompted for second factor on login

## Troubleshooting

### Common Issues

1. **Redirect URI mismatch**
   - Ensure redirect URIs in App ID match exactly (including protocol and trailing slashes)

2. **CORS errors**
   - Ensure CORS is configured to allow credentials:
     ```javascript
     app.use(cors({
       origin: 'http://localhost:8080',
       credentials: true
     }));
     ```

3. **Session not persisting**
   - Check cookie settings (secure flag in production)
   - Verify session secret is set

4. **401 errors after deployment**
   - Verify all environment variables are set in Code Engine
   - Check App ID redirect URIs include production URLs

### Debug Mode

Enable debug logging:

```javascript
// In server.js
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log('Session:', req.session);
    console.log('User:', req.user);
    console.log('Authenticated:', req.isAuthenticated());
    next();
  });
}
```

## Security Best Practices

1. **Use HTTPS in production** - Always use secure connections
2. **Rotate secrets regularly** - Change session secrets periodically
3. **Enable email verification** - Verify user emails before allowing access
4. **Implement rate limiting** - Prevent brute force attacks
5. **Use strong session secrets** - Generate with `openssl rand -base64 32`
6. **Enable MFA** - Add extra security layer for sensitive operations
7. **Monitor authentication logs** - Review App ID logs regularly

## Cost Considerations

### Lite Plan (Free)
- Up to 1,000 events/month
- Up to 1,000 authorized users
- Cloud Directory authentication
- Social login
- Basic customization

### Graduated Tier (Paid)
- Pay per authentication event
- Unlimited users
- Advanced features (MFA, custom attributes)
- Enterprise SSO
- Premium support

## Next Steps

1. Implement user profile management
2. Add role-based access control (RBAC)
3. Enable social login providers
4. Customize login UI with company branding
5. Set up email templates
6. Configure MFA for admin users
7. Implement audit logging

## Resources

- [IBM App ID Documentation](https://cloud.ibm.com/docs/appid)
- [App ID Node.js SDK](https://github.com/ibm-cloud-security/appid-serversdk-nodejs)
- [App ID Samples](https://github.com/ibm-cloud-security/appid-video-tutorials)
- [OAuth 2.0 Flow](https://oauth.net/2/)

---

**Implementation Time Estimate**: 2-4 hours
**Difficulty Level**: Intermediate
**Maintenance**: Low (managed service)