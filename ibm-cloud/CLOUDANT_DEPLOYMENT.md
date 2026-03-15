# Cloudant Deployment Guide for Meeting App

## Overview

This guide explains how to deploy the meeting app using **IBM Cloudant** (managed CouchDB) for data persistence on IBM Cloud Code Engine.

## Why Cloudant?

✅ **Fully Managed** - No database administration required  
✅ **Automatic Backups** - Built-in backup and recovery  
✅ **High Availability** - 99.99% SLA on standard plans  
✅ **Scalable** - Handles growing data automatically  
✅ **Zero Data Loss** - Data persists across container restarts  
✅ **Free Tier Available** - Lite plan for development/testing  

## Architecture

```
┌─────────────────────────────────────┐
│   Backend Container (Stateless)     │
│   - Node.js/Express                 │
│   - Cloudant SDK                    │
│   - No local database               │
└────────────┬────────────────────────┘
             │ HTTPS API Calls
             ▼
┌─────────────────────────────────────┐
│   IBM Cloudant (Managed CouchDB)    │
│   - meetings database               │
│   - Automatic replication           │
│   - Built-in backups                │
│   - 99.99% uptime SLA               │
└─────────────────────────────────────┘
```

## Quick Start

### Prerequisites

1. IBM Cloud account
2. IBM Cloud CLI installed
3. Logged in: `ibmcloud login --sso`

### Deploy with Cloudant

```bash
cd ibm-cloud
chmod +x deploy-with-cloudant.sh
./deploy-with-cloudant.sh
```

The script will:
1. Create Cloudant instance (if needed)
2. Generate service credentials
3. Build and push Docker images
4. Deploy backend with Cloudant credentials
5. Deploy frontend

## Manual Setup

### Step 1: Create Cloudant Instance

```bash
# Create Cloudant instance (Lite plan - free)
ibmcloud resource service-instance-create meeting-app-cloudant \
  cloudantnosqldb lite eu-de

# Or Standard plan (production)
ibmcloud resource service-instance-create meeting-app-cloudant \
  cloudantnosqldb standard eu-de
```

### Step 2: Create Service Credentials

```bash
# Create credentials with IAM authentication
ibmcloud resource service-key-create meeting-app-cloudant-credentials Manager \
  --instance-name meeting-app-cloudant \
  --parameters '{"IAM":true}'

# Get credentials
ibmcloud resource service-key meeting-app-cloudant-credentials --output json
```

### Step 3: Deploy Application

```bash
# Set environment variables
export CLOUDANT_URL="https://xxx.cloudantnosqldb.appdomain.cloud"
export CLOUDANT_APIKEY="your-api-key"

# Deploy backend with Cloudant
ibmcloud ce application create \
  --name meeting-app-backend \
  --image de.icr.io/wxo-demos/meeting-app-backend:v1 \
  --port 3000 \
  --env CLOUDANT_URL="${CLOUDANT_URL}" \
  --env CLOUDANT_APIKEY="${CLOUDANT_APIKEY}"
```

## How It Works

### Database Adapter

The application uses a **database adapter** that automatically detects and uses Cloudant when configured:

```javascript
// Checks for Cloudant credentials
if (process.env.CLOUDANT_URL && process.env.CLOUDANT_APIKEY) {
  // Use Cloudant
} else {
  // Fall back to SQLite
}
```

### Automatic Database Creation

On first startup, the application:
1. Connects to Cloudant
2. Creates `meetings` database (if not exists)
3. Creates indexes for efficient queries
4. Ready to handle requests

### Data Model

Cloudant documents are compatible with the SQLite schema:

```json
{
  "_id": "1710518400000",
  "_rev": "1-abc123",
  "title": "Customer Meeting",
  "description": "Quarterly review",
  "start_datetime": "2026-03-15T10:00:00",
  "end_datetime": "2026-03-15T11:00:00",
  "location": "Helsinki Office",
  "attendees": "Ricardo, Jukka",
  "customer": "Acme Corp",
  "is_onsite": 1,
  "country": "Finland",
  "created_at": "2026-03-15T08:00:00.000Z",
  "updated_at": "2026-03-15T08:00:00.000Z"
}
```

## Cloudant Plans Comparison

| Feature | Lite (Free) | Standard |
|---------|-------------|----------|
| **Cost** | $0/month | ~$75/month base |
| **Storage** | 1 GB | Unlimited |
| **Throughput** | 20 reads/sec, 10 writes/sec | Provisioned (scalable) |
| **Backups** | Manual only | Automatic daily |
| **SLA** | None | 99.99% uptime |
| **Best For** | Development, testing | Production |

## Monitoring

### Check Database Status

```bash
# Get Cloudant dashboard URL
ibmcloud resource service-instance meeting-app-cloudant --output json | jq -r '.dashboard_url'

# Open in browser to view:
# - Database size
# - Document count
# - Request metrics
# - Replication status
```

### Check Application Health

```bash
# Health endpoint shows database type
curl https://meeting-app-backend.xxx.codeengine.appdomain.cloud/health

# Response:
{
  "status": "healthy",
  "database": "cloudant",
  "cosBackup": "disabled"
}
```

### View Application Logs

```bash
# Real-time logs
ibmcloud ce application logs --name meeting-app-backend --follow

# Look for:
# ✅ Cloudant client initialized
# ✅ Cloudant database 'meetings' exists
# ✅ Database ready: cloudant
```

## Backup and Recovery

### Automatic Backups (Standard Plan)

Cloudant Standard plan includes:
- Daily automatic backups
- 14-day retention
- Point-in-time recovery
- Cross-region replication (optional)

### Manual Backup (Lite Plan)

```bash
# Export all meetings via API
curl https://meeting-app-backend.xxx.codeengine.appdomain.cloud/api/meetings > backup.json

# Restore by importing each meeting
cat backup.json | jq -c '.[]' | while read meeting; do
  curl -X POST https://meeting-app-backend.xxx.codeengine.appdomain.cloud/api/meetings \
    -H "Content-Type: application/json" \
    -d "$meeting"
done
```

## Migration from SQLite

### Export from SQLite

If you have existing data in SQLite:

```bash
# 1. Export meetings from current deployment
curl https://meeting-app-backend.xxx.codeengine.appdomain.cloud/api/meetings > meetings-export.json
```

### Deploy with Cloudant

```bash
# 2. Deploy with Cloudant
cd ibm-cloud
./deploy-with-cloudant.sh
```

### Import to Cloudant

```bash
# 3. Import meetings to new deployment
cat meetings-export.json | jq -c '.[]' | while read meeting; do
  curl -X POST https://meeting-app-backend-new.xxx.codeengine.appdomain.cloud/api/meetings \
    -H "Content-Type: application/json" \
    -d "$meeting"
done
```

## Troubleshooting

### Cloudant Connection Errors

**Error**: `Failed to initialize Cloudant`

**Solutions**:
```bash
# 1. Verify credentials are set
ibmcloud ce application get --name meeting-app-backend | grep CLOUDANT

# 2. Test credentials manually
curl -u "apikey:${CLOUDANT_APIKEY}" "${CLOUDANT_URL}/_all_dbs"

# 3. Recreate credentials
ibmcloud resource service-key-delete meeting-app-cloudant-credentials -f
ibmcloud resource service-key-create meeting-app-cloudant-credentials Manager \
  --instance-name meeting-app-cloudant --parameters '{"IAM":true}'
```

### Database Not Created

**Error**: `Database 'meetings' not found`

**Solution**:
```bash
# Check application logs
ibmcloud ce application logs --name meeting-app-backend

# Look for initialization errors
# The app should automatically create the database on startup
```

### Falling Back to SQLite

**Symptom**: Health endpoint shows `"database": "sqlite"`

**Cause**: Cloudant credentials not configured

**Solution**:
```bash
# Update application with Cloudant credentials
ibmcloud ce application update \
  --name meeting-app-backend \
  --env CLOUDANT_URL="https://xxx.cloudantnosqldb.appdomain.cloud" \
  --env CLOUDANT_APIKEY="your-api-key"
```

## Cost Optimization

### Development/Testing

Use **Lite plan** (free):
- 1 GB storage
- 20 reads/sec, 10 writes/sec
- Perfect for small teams
- No credit card required

### Production

Use **Standard plan** with right-sized capacity:

```bash
# Start with minimal capacity
# 100 reads/sec, 50 writes/sec ≈ $75/month

# Scale up as needed
# Monitor usage in Cloudant dashboard
# Adjust capacity based on actual traffic
```

### Cost Comparison

| Solution | Monthly Cost | Data Loss Risk | Complexity |
|----------|--------------|----------------|------------|
| **Cloudant Lite** | $0 | None | Low |
| **Cloudant Standard** | ~$75+ | None | Low |
| **COS Backup** | ~$0.02 | Up to 5 min | Medium |
| **PostgreSQL** | ~$30+ | None | High |

## Best Practices

### 1. Use IAM Authentication

Always use IAM API keys (not legacy credentials):
```bash
--parameters '{"IAM":true}'
```

### 2. Create Indexes

The app automatically creates indexes, but you can add more:
```javascript
// In cloudantDatabase.js
await cloudantClient.postIndex({
  db: DB_NAME,
  index: { fields: ['customer'] },
  name: 'customer-index'
});
```

### 3. Monitor Usage

Check Cloudant dashboard regularly:
- Storage usage
- Request rates
- Error rates
- Replication lag

### 4. Enable Replication (Production)

For high availability:
```bash
# Set up continuous replication to backup instance
# Via Cloudant dashboard or API
```

### 5. Regular Backups

Even with automatic backups, export data periodically:
```bash
# Weekly backup script
curl https://meeting-app-backend.xxx.codeengine.appdomain.cloud/api/meetings \
  > backups/meetings-$(date +%Y%m%d).json
```

## Advantages Over Other Solutions

### vs SQLite + COS Backup
- ✅ Zero data loss (no 5-minute window)
- ✅ No backup/restore complexity
- ✅ Better for concurrent access
- ✅ Automatic scaling

### vs PostgreSQL
- ✅ Lower cost for small workloads
- ✅ Simpler setup
- ✅ No schema migrations needed
- ✅ Built-in replication

### vs Ephemeral Storage
- ✅ Data persists across restarts
- ✅ Production-ready
- ✅ Automatic backups
- ✅ High availability

## Summary

✅ **Use Cloudant for production** - Best balance of cost, reliability, and simplicity

✅ **Lite plan for development** - Free tier perfect for testing

✅ **Zero code changes** - Automatic detection and fallback to SQLite

✅ **Fully managed** - No database administration required

---

**Last Updated**: March 2026  
**Status**: ✅ Production Ready  
**Recommended For**: All production deployments