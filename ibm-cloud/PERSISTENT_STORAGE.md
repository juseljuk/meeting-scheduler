# Persistent Storage for Meeting App on IBM Cloud Code Engine

## Problem

IBM Cloud Code Engine containers are **ephemeral** - when they restart, scale down, or redeploy, any data stored in the container's filesystem is lost. This means your SQLite database at `/data/meetings.db` gets wiped out on every restart.

## Solution

Use IBM Cloud Code Engine's **persistent volume** feature to mount external storage that survives container restarts.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Backend Container (Ephemeral)                   │
│  - Node.js/Express                                          │
│  - Application code                                         │
│  - Temporary files                                          │
│                                                             │
│  Mount Point: /data                                         │
│       │                                                     │
│       └──────────────────────────────────────────────────┐  │
└──────────────────────────────────────────────────────────┼──┘
                                                            │
                                                            ▼
┌─────────────────────────────────────────────────────────────┐
│         IBM Cloud File Storage (Persistent)                  │
│  - meetings.db (SQLite database)                            │
│  - Survives container restarts                              │
│  - Survives redeployments                                   │
│  - Size: 1GB (configurable)                                 │
└─────────────────────────────────────────────────────────────┘
```

## Deployment with Persistent Storage

### Prerequisites

1. IBM Cloud CLI with Code Engine plugin
2. Logged in to IBM Cloud: `ibmcloud login --sso`
3. Docker installed locally

### Deploy with Persistent Storage

```bash
cd ibm-cloud
chmod +x deploy-with-storage.sh
./deploy-with-storage.sh
```

### What the Script Does

1. **Creates a persistent volume** (if it doesn't exist):
   ```bash
   ibmcloud ce volume create --name meeting-app-storage --size 1G
   ```

2. **Mounts the volume to the backend container**:
   ```bash
   --mount-volume meeting-app-storage=/data
   ```

3. **Database path remains the same**:
   - Environment variable: `DATABASE_PATH=/data/meetings.db`
   - Now `/data` points to persistent storage instead of container filesystem

### Key Differences from Original Deployment

| Aspect | Original (deploy.sh) | With Storage (deploy-with-storage.sh) |
|--------|---------------------|--------------------------------------|
| Volume Creation | ❌ No volume | ✅ Creates persistent volume |
| Volume Mount | ❌ No mount | ✅ Mounts to `/data` |
| Data Persistence | ❌ Lost on restart | ✅ Survives restarts |
| Database Location | Container filesystem | Persistent volume |

## Managing Persistent Storage

### Check Volume Status

```bash
# List all volumes
ibmcloud ce volume list

# Get specific volume details
ibmcloud ce volume get --name meeting-app-storage
```

### Increase Volume Size

```bash
# Update volume size (can only increase, not decrease)
ibmcloud ce volume update --name meeting-app-storage --size 2G
```

### Delete Volume (⚠️ Destroys all data)

```bash
# First, unmount from application
ibmcloud ce application update --name meeting-app-backend --mount-volume-rm meeting-app-storage

# Then delete volume
ibmcloud ce volume delete --name meeting-app-storage --force
```

## Backup and Recovery

### Manual Backup Strategy

Since the database is in a persistent volume, you need to access it through the container:

```bash
# 1. Get a shell in the running container
ibmcloud ce application exec --name meeting-app-backend --interactive --tty

# 2. Inside the container, copy database to a temporary location
cp /data/meetings.db /tmp/meetings-backup.db

# 3. Exit the container
exit

# 4. Use kubectl to copy file out (requires kubectl setup)
# This is complex - see alternative below
```

### Alternative: Automated Backup to Cloud Object Storage

For production, consider implementing automated backups:

1. **Create a backup script** that runs periodically
2. **Upload to IBM Cloud Object Storage**
3. **Schedule using Code Engine Jobs**

Example backup job:

```bash
# Create a backup job that runs daily
ibmcloud ce job create \
  --name meeting-db-backup \
  --image de.icr.io/wxo-demos/meeting-app-backend:v1 \
  --mount-volume meeting-app-storage=/data \
  --env COS_ENDPOINT=https://s3.eu-de.cloud-object-storage.appdomain.cloud \
  --env COS_BUCKET=meeting-backups \
  --command "/bin/sh" \
  --argument "-c" \
  --argument "cp /data/meetings.db /tmp/backup-$(date +%Y%m%d).db && upload-to-cos.sh"

# Schedule to run daily at 2 AM
ibmcloud ce subscription cron create \
  --name daily-backup \
  --destination meeting-db-backup \
  --schedule "0 2 * * *"
```

## Migration from Existing Deployment

If you already have a deployment without persistent storage:

### Step 1: Export Current Data (if any)

```bash
# Get current meetings via API
curl https://meeting-app-backend.xxx.codeengine.appdomain.cloud/api/meetings > meetings-backup.json
```

### Step 2: Deploy with Persistent Storage

```bash
cd ibm-cloud
./deploy-with-storage.sh
```

### Step 3: Restore Data (if needed)

```bash
# Import meetings via API
curl -X POST https://meeting-app-backend.xxx.codeengine.appdomain.cloud/api/meetings \
  -H "Content-Type: application/json" \
  -d @meetings-backup.json
```

## Troubleshooting

### Volume Mount Fails

**Error**: `Failed to mount volume`

**Solution**:
```bash
# Check if volume exists
ibmcloud ce volume list

# Verify volume is in same project
ibmcloud ce project current

# Recreate volume if needed
ibmcloud ce volume delete --name meeting-app-storage --force
ibmcloud ce volume create --name meeting-app-storage --size 1G
```

### Database Permission Errors

**Error**: `SQLITE_CANTOPEN: unable to open database file`

**Solution**: The volume should have correct permissions by default, but if issues occur:

```bash
# Update Dockerfile to ensure proper permissions
RUN mkdir -p /data && chmod 777 /data
```

### Volume Full

**Error**: `SQLITE_FULL: database or disk is full`

**Solution**:
```bash
# Check current size
ibmcloud ce volume get --name meeting-app-storage

# Increase size
ibmcloud ce volume update --name meeting-app-storage --size 2G

# Restart application to apply changes
ibmcloud ce application update --name meeting-app-backend --image de.icr.io/wxo-demos/meeting-app-backend:v1
```

### Data Not Persisting

**Checklist**:
1. ✅ Volume is created: `ibmcloud ce volume list`
2. ✅ Volume is mounted: `ibmcloud ce application get --name meeting-app-backend | grep mount`
3. ✅ DATABASE_PATH points to mounted volume: `/data/meetings.db`
4. ✅ Application has write permissions to `/data`

## Cost Considerations

### IBM Cloud Code Engine Volume Pricing

- **Storage**: ~$0.10 per GB per month
- **1GB volume**: ~$0.10/month
- **5GB volume**: ~$0.50/month

### Cost Optimization

```bash
# Start with minimal size
ibmcloud ce volume create --name meeting-app-storage --size 1G

# Monitor usage
ibmcloud ce application logs --name meeting-app-backend | grep "database"

# Scale up only when needed
ibmcloud ce volume update --name meeting-app-storage --size 2G
```

## Alternative Solutions

### Option 1: IBM Cloud Databases for PostgreSQL

For production workloads, consider migrating to a managed database:

**Pros**:
- Automatic backups
- High availability
- Better scalability
- Professional support

**Cons**:
- Higher cost (~$30/month minimum)
- Requires code changes (SQLite → PostgreSQL)

### Option 2: Cloud Object Storage with Periodic Sync

Store database in COS and sync periodically:

**Pros**:
- Very low cost
- Easy backups
- Good for read-heavy workloads

**Cons**:
- Sync complexity
- Potential data loss between syncs
- Not suitable for high-write workloads

### Option 3: Keep Ephemeral (Current State)

For development/testing only:

**Pros**:
- No additional cost
- Simple setup

**Cons**:
- ❌ Data lost on restart
- ❌ Not suitable for production

## Best Practices

1. **Always use persistent storage for production**
2. **Implement regular backups** (even with persistent storage)
3. **Monitor volume usage** to prevent running out of space
4. **Test disaster recovery** procedures regularly
5. **Consider database migration** to managed service for critical applications

## Summary

✅ **Use `deploy-with-storage.sh`** instead of `deploy.sh` for production deployments

✅ **Persistent volume** ensures data survives container restarts

✅ **1GB storage** is sufficient for most small team applications

✅ **Monitor and backup** regularly for production use

---

**Last Updated**: March 2026  
**Version**: 1.0  
**Status**: ✅ Production Ready with Persistent Storage