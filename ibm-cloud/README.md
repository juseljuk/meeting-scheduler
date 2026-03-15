# IBM Cloud Code Engine Deployment Guide

## Prerequisites

1. **IBM Cloud Account**: Active IBM Cloud account with Code Engine access
2. **IBM Cloud CLI**: Installed and configured
3. **Container Registry Plugin**: Installed for IBM Cloud CLI
4. **Docker**: Installed and running locally

## Setup Steps

### 1. Install IBM Cloud CLI

If not already installed:

```bash
# macOS
curl -fsSL https://clis.cloud.ibm.com/install/osx | sh

# Linux
curl -fsSL https://clis.cloud.ibm.com/install/linux | sh

# Windows
# Download from: https://github.com/IBM-Cloud/ibm-cloud-cli-release/releases/
```

### 2. Install Required Plugins

```bash
# Install Container Registry plugin
ibmcloud plugin install container-registry

# Install Code Engine plugin
ibmcloud plugin install code-engine

# Verify installations
ibmcloud plugin list
```

### 3. Login to IBM Cloud

```bash
# Login with SSO (if using federated ID)
ibmcloud login --sso

# Or login with username/password
ibmcloud login

# Select your account and region when prompted
```

### 4. Configure Container Registry

The deployment script will automatically:
- Login to IBM Cloud Container Registry using `ibmcloud cr login`
- Create registry secret in Code Engine for pulling private images
- Authenticate Docker with the registry

**Important**: Configuration is now stored in a separate `config.sh` file for security.

### 5. Setup Deployment Configuration

1. **Copy the configuration template**:
   ```bash
   cd ibm-cloud
   cp config.sh.example config.sh
   ```

2. **Edit `config.sh` with your settings**:
   ```bash
   nano config.sh  # or use your preferred editor
   ```

   Update these variables:
   ```bash
   PROJECT_NAME="ce-wxo-related"        # Your Code Engine project name
   REGION="eu-de"                       # Your preferred region (us-south, eu-de, etc.)
   REGISTRY_NAMESPACE="wxo-demos"       # Your Container Registry namespace
   BACKEND_IMAGE="meeting-app-backend"  # Backend image name
   FRONTEND_IMAGE="meeting-app-frontend" # Frontend image name
   VERSION="v1"                         # Image version tag
   
   # For Cloudant deployments, also set:
   CLOUDANT_URL="https://your-instance.cloudantnosqldb.appdomain.cloud"
   CLOUDANT_APIKEY="your-api-key-here"
   ```

3. **Important**: The `config.sh` file is in `.gitignore` and will not be committed to version control, keeping your credentials safe.

### 6. Run Deployment

```bash
cd ibm-cloud
chmod +x deploy.sh
./deploy.sh
```

The script will:
1. Verify IBM Cloud login
2. Set target region
3. Login to Container Registry
4. Build Docker images locally
5. Tag and push images to IBM Cloud Container Registry
6. Create/select Code Engine project
7. Create registry secret for image pulling
8. Deploy backend application
9. Get backend URL
10. Deploy frontend application with backend URL as environment variable
11. Display both application URLs

## Authentication Details

### Container Registry Authentication

The script uses `ibmcloud cr login` which:
- Authenticates Docker with IBM Cloud Container Registry
- Creates a temporary token for pushing images
- Token is valid for the current session
- No need for manual `docker login`

### Registry Secret for Code Engine

The deployment creates a registry secret (`icr-secret`) that allows Code Engine to pull private images:

```bash
ibmcloud ce registry create --name icr-secret \
  --server de.icr.io \
  --username iamapikey \
  --password <api-key>
```

This secret is automatically used when deploying applications with `--registry-secret icr-secret`.

### Manual Authentication (if needed)

If you need to authenticate manually:

```bash
# Login to IBM Cloud
ibmcloud login --sso

# Set target region
ibmcloud target -r eu-de

# Login to Container Registry
ibmcloud cr login

# Verify authentication
docker images
```

## Troubleshooting

### UNAUTHORIZED Error

If you get "UNAUTHORIZED, authorization required":

1. **Ensure you're logged in to IBM Cloud:**
   ```bash
   ibmcloud login
   ```

2. **Login to Container Registry:**
   ```bash
   ibmcloud cr login
   ```

3. **Verify your namespace exists:**
   ```bash
   ibmcloud cr namespace-list
   ```

4. **Create namespace if needed:**
   ```bash
   ibmcloud cr namespace-add your-namespace
   ```

5. **Check your IAM permissions:**
   - You need "Writer" or "Manager" role for Container Registry
   - Check in IBM Cloud Console → Manage → Access (IAM)

### Common Issues

**Issue**: "No such namespace"
```bash
# Solution: Create the namespace
ibmcloud cr namespace-add your-namespace
```

**Issue**: "Insufficient permissions"
```bash
# Solution: Check IAM roles
# Go to IBM Cloud Console → Manage → Access (IAM)
# Ensure you have Container Registry Writer role
```

**Issue**: "Region not set"
```bash
# Solution: Set target region
ibmcloud target -r us-south
```

## Architecture in IBM Cloud Code Engine

### Frontend-Backend Communication

The application uses **direct API communication** instead of a reverse proxy:

1. **Backend Deployment**:
   - Deployed as a Code Engine application
   - Exposes REST API on port 3000
   - CORS enabled for cross-origin requests
   - Public URL: `https://meeting-app-backend.xxx.codeengine.appdomain.cloud`

2. **Frontend Deployment**:
   - Deployed as a Code Engine application
   - Nginx serves static files on port 80
   - Backend URL injected via environment variable
   - Public URL: `https://meeting-app-frontend.xxx.codeengine.appdomain.cloud`

3. **Environment Variable Injection**:
   - `BACKEND_URL` environment variable passed to frontend container
   - Container startup script runs `envsubst` on `index.html`
   - Replaces `${BACKEND_URL}` placeholder with actual backend URL
   - JavaScript reads `window.BACKEND_URL` for API calls

4. **Why Direct Communication?**:
   - ✅ Simpler architecture (no nginx proxy configuration)
   - ✅ More reliable (no DNS resolution issues)
   - ✅ Better debugging (clear error messages)
   - ✅ CORS already enabled on backend
   - ✅ Easier to maintain and update

### Container Images

Both applications use Alpine Linux base images for minimal size:

- **Backend**: `node:18-alpine` (~180MB)
  - Node.js runtime
  - SQLite database
  - Express.js API

- **Frontend**: `nginx:alpine` (~40MB)
  - Nginx web server
  - Static HTML/CSS/JS files
  - Environment variable substitution

## Deployment Process

The `deploy.sh` script performs these steps:

1. ✅ Verify IBM Cloud login
2. ✅ Set target region
3. ✅ Login to Container Registry
4. ✅ Build Docker images locally
5. ✅ Tag images for IBM Cloud Registry
6. ✅ Push images to registry
7. ✅ Create/select Code Engine project
8. ✅ Create registry secret for private image pulling
9. ✅ Deploy backend application
10. ✅ Get backend URL
11. ✅ Deploy frontend application with backend URL
12. ✅ Display application URLs

## Post-Deployment

After successful deployment, the script will output:

```
🎉 Deployment complete!
📱 Access your application at: https://meeting-app-frontend.xxx.codeengine.appdomain.cloud
🔧 Backend API available at: https://meeting-app-backend.xxx.codeengine.appdomain.cloud
```

### Verify Deployment

```bash
# List Code Engine applications
ibmcloud ce application list

# Get application details
ibmcloud ce application get --name meeting-app-backend
ibmcloud ce application get --name meeting-app-frontend

# View logs
ibmcloud ce application logs --name meeting-app-backend
```

## Updating the Application

To update after making changes:

```bash
# Rebuild and redeploy
cd ibm-cloud
./deploy.sh
```

The script will:
- Build new images with updated code
- Push to registry
- Update existing Code Engine applications

## Cost Considerations

- **Container Registry**: Free tier includes 500MB storage
- **Code Engine**: Pay-per-use pricing
  - Free tier: 100,000 vCPU-seconds and 200,000 GB-seconds per month
  - Applications scale to zero when not in use

## Security Best Practices

1. **Use IAM API Keys** for CI/CD pipelines
2. **Enable vulnerability scanning** in Container Registry
3. **Set up HTTPS** for production (Code Engine provides this by default)
4. **Use secrets** for sensitive configuration
5. **Implement authentication** before production deployment

## Additional Resources

- [IBM Cloud Code Engine Documentation](https://cloud.ibm.com/docs/codeengine)
- [IBM Cloud Container Registry Documentation](https://cloud.ibm.com/docs/Registry)
- [IBM Cloud CLI Reference](https://cloud.ibm.com/docs/cli)