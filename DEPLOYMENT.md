# Meeting Scheduler - Complete Deployment Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Local Development](#local-development)
4. [IBM Cloud Deployment](#ibm-cloud-deployment)
5. [Troubleshooting](#troubleshooting)
6. [Maintenance](#maintenance)

## Overview

The Meeting Scheduler is a containerized web application designed for small teams to schedule and share customer meetings with travel information. The application consists of:

- **Backend**: Node.js/Express REST API with SQLite database
- **Frontend**: HTML5/JavaScript SPA with FullCalendar integration
- **Deployment**: Docker containers on IBM Cloud Code Engine

### Key Features
- 📅 Interactive calendar with multiple views (month/week/day)
- ✏️ Full CRUD operations for meetings
- 👥 Customer tracking and association
- 🏢 On-site/remote meeting designation
- 🌍 Country field for international meetings
- 📱 Responsive design for mobile and desktop
- 🔄 Auto-scaling in cloud deployment

## Architecture

### Application Components

```
┌─────────────────────────────────────────────────────────────┐
│                         User Browser                         │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Frontend (Nginx + Static Files)                 │
│  - HTML5/CSS3/JavaScript                                     │
│  - FullCalendar.js                                          │
│  - Environment variable injection                            │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS (Direct API Calls)
                         │ CORS Enabled
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend (Node.js/Express)                       │
│  - REST API endpoints                                        │
│  - SQLite database                                          │
│  - CORS middleware                                          │
└─────────────────────────────────────────────────────────────┘
```

### Communication Flow

1. **Frontend Initialization**:
   - Container starts with `BACKEND_URL` environment variable
   - Startup script runs `envsubst` to inject URL into HTML
   - JavaScript reads `window.BACKEND_URL` for API calls

2. **API Communication**:
   - Frontend makes direct HTTPS calls to backend
   - No reverse proxy or nginx forwarding
   - CORS headers allow cross-origin requests

3. **Data Flow**:
   ```
   User Action → Frontend JS → HTTP Request → Backend API → SQLite DB
                                                    ↓
   UI Update ← Frontend JS ← JSON Response ← Backend API ← SQLite DB
   ```

### Technology Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Backend Runtime | Node.js | 18+ | JavaScript runtime |
| Backend Framework | Express.js | 4.x | REST API framework |
| Database | SQLite3 | 3.x | Embedded database |
| Frontend Server | Nginx | Alpine | Static file serving |
| Frontend Framework | Vanilla JS | ES6+ | UI logic |
| Calendar Library | FullCalendar | 6.x | Calendar interface |
| Container Runtime | Docker | 20+ | Containerization |
| Cloud Platform | IBM Cloud Code Engine | - | Serverless containers |

## Local Development

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (optional, for non-Docker development)
- Git

### Quick Start with Docker Compose

1. **Clone and start**:
   ```bash
   git clone <repository-url>
   cd meeting-app
   docker-compose up --build
   ```

2. **Access the application**:
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:3000
   - Health check: http://localhost:3000/health

3. **Stop the application**:
   ```bash
   docker-compose down
   ```

### Development without Docker

#### Backend

```bash
cd backend
npm install
npm run dev  # Uses nodemon for auto-reload
```

#### Frontend

```bash
cd frontend
python -m http.server 8080
# or
npx http-server -p 8080
```

### Database Management

The SQLite database is stored in `data/meetings.db` (gitignored).

**Reset database**:
```bash
rm -rf data/meetings.db
docker-compose restart backend
```

**Backup database**:
```bash
cp data/meetings.db data/meetings.db.backup
```

## IBM Cloud Deployment

⚠️ **IMPORTANT**: For production deployments, use `deploy-with-storage.sh` to enable persistent storage. The database will survive container restarts. See [Persistent Storage Guide](ibm-cloud/PERSISTENT_STORAGE.md) for details.

### Prerequisites

1. **IBM Cloud Account**: Active account with Code Engine access
2. **IBM Cloud CLI**: Installed and configured
3. **Required Plugins**:
   ```bash
   ibmcloud plugin install code-engine
   ibmcloud plugin install container-registry
   ```

### Initial Setup

1. **Login to IBM Cloud**:
   ```bash
   ibmcloud login --sso
   ```

2. **Create Container Registry namespace** (first time only):
   ```bash
   ibmcloud cr namespace-add <your-namespace>
   ```

3. **Configure deployment**:
   
   Copy and edit the configuration file:
   ```bash
   cd ibm-cloud
   cp config.sh.example config.sh
   nano config.sh  # Edit with your values
   ```
   
   Update these settings in `config.sh`:
   ```bash
   PROJECT_NAME="ce-wxo-related"      # Your project name
   REGION="eu-de"                     # Your region
   REGISTRY_NAMESPACE="wxo-demos"     # Your namespace
   
   # For Cloudant deployments:
   CLOUDANT_URL="https://your-instance.cloudantnosqldb.appdomain.cloud"
   CLOUDANT_APIKEY="your-api-key-here"
   ```
   
   **Note**: `config.sh` is in `.gitignore` to protect your credentials.

### Deployment Process

#### Option 1: With Persistent Storage (Recommended for Production)

1. **Run deployment script with persistent storage**:
   ```bash
   cd ibm-cloud
   chmod +x deploy-with-storage.sh
   ./deploy-with-storage.sh
   ```

   This creates a persistent volume that survives container restarts.

#### Option 2: Without Persistent Storage (Development/Testing Only)

1. **Run basic deployment script**:
   ```bash
   cd ibm-cloud
   chmod +x deploy.sh
   ./deploy.sh
   ```

   ⚠️ **Warning**: Data will be lost when containers restart.

2. **Deployment steps** (automated):
   - ✅ Verify IBM Cloud authentication
   - ✅ Set target region
   - ✅ Login to Container Registry
   - ✅ Build backend Docker image
   - ✅ Build frontend Docker image
   - ✅ Tag images for IBM Cloud Registry
   - ✅ Push images to registry
   - ✅ Create/select Code Engine project
   - ✅ Create registry secret for image pulling
   - ✅ Deploy backend application
   - ✅ Retrieve backend URL
   - ✅ Deploy frontend with backend URL
   - ✅ Display application URLs

3. **Access deployed application**:
   
   The script outputs:
   ```
   ✅ Backend deployed at: https://meeting-app-backend.xxx.codeengine.appdomain.cloud
   ✅ Frontend deployed at: https://meeting-app-frontend.xxx.codeengine.appdomain.cloud
   ```

### Deployment Configuration

#### Backend Application

```yaml
Name: meeting-app-backend
Image: de.icr.io/<namespace>/meeting-app-backend:v1
Port: 3000
CPU: 0.5 vCPU
Memory: 1 GB
Min Scale: 1
Max Scale: 3
Environment:
  - NODE_ENV=production
  - DATABASE_PATH=/data/meetings.db
```

#### Frontend Application

```yaml
Name: meeting-app-frontend
Image: de.icr.io/<namespace>/meeting-app-frontend:v1
Port: 80
CPU: 0.25 vCPU
Memory: 0.5 GB
Min Scale: 1
Max Scale: 3
Environment:
  - BACKEND_URL=https://meeting-app-backend.xxx.codeengine.appdomain.cloud
```

### Updating Deployed Application

After making code changes:

```bash
# Option 1: Run full deployment script
cd ibm-cloud
./deploy.sh

# Option 2: Manual update
cd backend
docker build -t de.icr.io/<namespace>/meeting-app-backend:v1 .
docker push de.icr.io/<namespace>/meeting-app-backend:v1

cd ../frontend
docker build -t de.icr.io/<namespace>/meeting-app-frontend:v1 .
docker push de.icr.io/<namespace>/meeting-app-frontend:v1

# Code Engine will automatically pull new images
```

## Troubleshooting

### Local Development Issues

#### Port Already in Use

```bash
# Check what's using the port
lsof -i :3000  # or :8080

# Change ports in docker-compose.yml
ports:
  - "3001:3000"  # Backend
  - "8081:80"    # Frontend
```

#### Database Locked

```bash
# Stop all containers
docker-compose down

# Remove database
rm -rf data/meetings.db

# Restart
docker-compose up --build
```

#### CORS Errors

The backend has CORS enabled by default. If you encounter CORS issues:

1. Check `backend/src/server.js` - CORS middleware should be present
2. Verify frontend is making requests to correct backend URL
3. Check browser console for specific CORS error messages

### IBM Cloud Deployment Issues

#### UNAUTHORIZED Error

```bash
# Re-authenticate
ibmcloud login --sso
ibmcloud cr login

# Verify namespace exists
ibmcloud cr namespace-list

# Create if needed
ibmcloud cr namespace-add <your-namespace>
```

#### Image Pull Errors

```bash
# Verify registry secret exists
ibmcloud ce registry list

# Recreate if needed
ibmcloud ce registry delete --name icr-secret
# Then run deploy.sh again
```

#### Application Not Starting

```bash
# Check application logs
ibmcloud ce application logs --name meeting-app-backend
ibmcloud ce application logs --name meeting-app-frontend

# Check application status
ibmcloud ce application get --name meeting-app-backend
ibmcloud ce application get --name meeting-app-frontend
```

#### Frontend Can't Reach Backend

1. **Verify backend is running**:
   ```bash
   curl https://meeting-app-backend.xxx.codeengine.appdomain.cloud/health
   ```

2. **Check frontend environment variable**:
   ```bash
   ibmcloud ce application get --name meeting-app-frontend --output json | grep -A 5 "env"
   ```

3. **Verify BACKEND_URL is set correctly**:
   - Should be the full backend URL with https://
   - Should not be empty or undefined

4. **Check browser console**:
   - Look for the actual API URL being called
   - Check for CORS errors
   - Verify network requests in DevTools

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `EADDRINUSE` | Port already in use | Change port or stop conflicting process |
| `UNAUTHORIZED` | Not logged in to registry | Run `ibmcloud cr login` |
| `No such namespace` | Registry namespace doesn't exist | Create with `ibmcloud cr namespace-add` |
| `502 Bad Gateway` | Backend not reachable | Check backend URL and CORS configuration |
| `Failed to load meetings` | API connection issue | Verify BACKEND_URL environment variable |

## Maintenance

### Monitoring

#### Check Application Health

```bash
# Backend health
curl https://meeting-app-backend.xxx.codeengine.appdomain.cloud/health

# Frontend (should return HTML)
curl https://meeting-app-frontend.xxx.codeengine.appdomain.cloud
```

#### View Logs

```bash
# Real-time logs
ibmcloud ce application logs --name meeting-app-backend --follow

# Recent logs
ibmcloud ce application logs --name meeting-app-backend --tail 100
```

#### Check Resource Usage

```bash
# Application details
ibmcloud ce application get --name meeting-app-backend
ibmcloud ce application get --name meeting-app-frontend

# List all applications
ibmcloud ce application list
```

### Scaling

Applications auto-scale between min and max instances based on load.

**Adjust scaling**:
```bash
# Update backend scaling
ibmcloud ce application update \
  --name meeting-app-backend \
  --min-scale 2 \
  --max-scale 5

# Update frontend scaling
ibmcloud ce application update \
  --name meeting-app-frontend \
  --min-scale 1 \
  --max-scale 5
```

### Backup and Recovery

#### Database Backup

Since SQLite is embedded, database persistence depends on your deployment:

**Local Development**:
```bash
# Backup
cp data/meetings.db backups/meetings-$(date +%Y%m%d).db

# Restore
cp backups/meetings-20240320.db data/meetings.db
docker-compose restart backend
```

**IBM Cloud Code Engine**:
- ⚠️ **IMPORTANT**: Use `deploy-with-storage.sh` for production deployments
- The original `deploy.sh` has ephemeral storage (data lost on restart)
- With persistent volume (recommended):
  ```bash
  cd ibm-cloud
  ./deploy-with-storage.sh
  ```
- See [ibm-cloud/PERSISTENT_STORAGE.md](ibm-cloud/PERSISTENT_STORAGE.md) for details
- Alternative: Migrate to IBM Cloud Databases (PostgreSQL) for enterprise use

#### Application Backup

```bash
# Export current configuration
ibmcloud ce application get --name meeting-app-backend --output json > backup-backend.json
ibmcloud ce application get --name meeting-app-frontend --output json > backup-frontend.json

# Tag and backup images
docker tag de.icr.io/<namespace>/meeting-app-backend:v1 \
           de.icr.io/<namespace>/meeting-app-backend:backup-$(date +%Y%m%d)
docker push de.icr.io/<namespace>/meeting-app-backend:backup-$(date +%Y%m%d)
```

### Cost Optimization

#### IBM Cloud Code Engine Pricing

- **Free Tier**: 100,000 vCPU-seconds and 200,000 GB-seconds per month
- **Scale to Zero**: Applications can scale to 0 when not in use
- **Container Registry**: Free tier includes 500MB storage

**Optimize costs**:
```bash
# Set min-scale to 0 for development
ibmcloud ce application update \
  --name meeting-app-frontend \
  --min-scale 0

# Reduce max-scale for low-traffic apps
ibmcloud ce application update \
  --name meeting-app-backend \
  --max-scale 2
```

### Security Best Practices

1. **Authentication**: Current version has no authentication
   - Suitable for internal team use only
   - Add authentication before exposing publicly

2. **HTTPS**: Enabled by default in Code Engine
   - All traffic is encrypted
   - Certificates managed automatically

3. **API Keys**: Use IAM API keys for CI/CD
   ```bash
   ibmcloud iam api-key-create code-engine-deploy \
     -d "API key for deployment" \
     --file api-key.json
   ```

4. **Secrets Management**: Use Code Engine secrets for sensitive data
   ```bash
   ibmcloud ce secret create --name db-credentials \
     --from-literal username=admin \
     --from-literal password=secret
   ```

5. **Container Scanning**: Enable vulnerability scanning
   ```bash
   ibmcloud cr vulnerability-assessment <image>
   ```

## Additional Resources

- [IBM Cloud Code Engine Documentation](https://cloud.ibm.com/docs/codeengine)
- [IBM Cloud Container Registry Documentation](https://cloud.ibm.com/docs/Registry)
- [Docker Documentation](https://docs.docker.com/)
- [Express.js Documentation](https://expressjs.com/)
- [FullCalendar Documentation](https://fullcalendar.io/docs)

## Support

For issues and questions:
1. Check this documentation
2. Review application logs
3. Check the main README.md
4. Open an issue on the repository

---

**Last Updated**: March 2026  
**Version**: 1.0  
**Deployment Status**: ✅ Production Ready