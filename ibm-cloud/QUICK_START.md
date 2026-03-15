# Quick Start: Deploy with Persistent Storage

## TL;DR - Production Deployment

```bash
# 1. Login to IBM Cloud
ibmcloud login --sso

# 2. Deploy with persistent storage
cd ibm-cloud
chmod +x deploy-with-storage.sh
./deploy-with-storage.sh
```

Your data will now survive container restarts! 🎉

## What's the Difference?

### ❌ Old Way (deploy.sh)
```bash
./deploy.sh
```
- ❌ Data lost on container restart
- ❌ Data lost on redeployment
- ❌ Not suitable for production
- ✅ Good for testing only

### ✅ New Way (deploy-with-storage.sh)
```bash
./deploy-with-storage.sh
```
- ✅ Data persists across restarts
- ✅ Data persists across redeployments
- ✅ Production ready
- ✅ Only ~$0.10/month for 1GB storage

## How It Works

```
┌─────────────────────────────────────┐
│   Backend Container (Ephemeral)     │
│   - Application code                │
│   - Temporary files                 │
│                                     │
│   /data → Mounted Volume            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Persistent Volume (Survives!)     │
│   - meetings.db                     │
│   - Size: 1GB                       │
└─────────────────────────────────────┘
```

## First Time Setup

1. **Edit configuration** in `deploy-with-storage.sh`:
   ```bash
   PROJECT_NAME="ce-wxo-related"      # Your project name
   REGION="eu-de"                     # Your region
   REGISTRY_NAMESPACE="wxo-demos"     # Your namespace
   ```

2. **Run deployment**:
   ```bash
   ./deploy-with-storage.sh
   ```

3. **Access your app**:
   - Frontend: `https://meeting-app-frontend.xxx.codeengine.appdomain.cloud`
   - Backend: `https://meeting-app-backend.xxx.codeengine.appdomain.cloud`

## Updating Your App

After making code changes:

```bash
cd ibm-cloud
./deploy-with-storage.sh
```

The script will:
- Rebuild images
- Push to registry
- Update applications
- **Keep your data intact** ✅

## Verify Persistent Storage

```bash
# Check volume exists
ibmcloud ce volume list

# Check volume is mounted
ibmcloud ce application get --name meeting-app-backend | grep mount

# Should show: meeting-app-storage mounted at /data
```

## Troubleshooting

### Data Still Lost?

1. **Verify volume is mounted**:
   ```bash
   ibmcloud ce application get --name meeting-app-backend --output json | grep -A 5 "volumeMounts"
   ```

2. **Check logs**:
   ```bash
   ibmcloud ce application logs --name meeting-app-backend --follow
   ```

3. **Verify DATABASE_PATH**:
   ```bash
   ibmcloud ce application get --name meeting-app-backend | grep DATABASE_PATH
   # Should show: DATABASE_PATH=/data/meetings.db
   ```

### Volume Full?

```bash
# Check current size
ibmcloud ce volume get --name meeting-app-storage

# Increase size (can only increase, not decrease)
ibmcloud ce volume update --name meeting-app-storage --size 2G
```

## Cost

| Resource | Cost |
|----------|------|
| 1GB Persistent Volume | ~$0.10/month |
| Backend (0.5 vCPU, 1GB RAM) | Free tier covers most usage |
| Frontend (0.25 vCPU, 0.5GB RAM) | Free tier covers most usage |

**Total**: ~$0.10/month for persistent storage

## Migration from Old Deployment

If you already deployed with `deploy.sh`:

1. **Export current data** (if any):
   ```bash
   curl https://meeting-app-backend.xxx.codeengine.appdomain.cloud/api/meetings > backup.json
   ```

2. **Deploy with storage**:
   ```bash
   ./deploy-with-storage.sh
   ```

3. **Restore data** (if needed):
   ```bash
   # Import each meeting via API
   cat backup.json | jq -c '.[]' | while read meeting; do
     curl -X POST https://meeting-app-backend.xxx.codeengine.appdomain.cloud/api/meetings \
       -H "Content-Type: application/json" \
       -d "$meeting"
   done
   ```

## Next Steps

- 📖 Read [PERSISTENT_STORAGE.md](PERSISTENT_STORAGE.md) for detailed documentation
- 📖 Read [DEPLOYMENT.md](../DEPLOYMENT.md) for complete deployment guide
- 🔍 Monitor your app: `ibmcloud ce application logs --name meeting-app-backend --follow`
- 📊 Check volume usage: `ibmcloud ce volume get --name meeting-app-storage`

## Summary

✅ **Always use `deploy-with-storage.sh` for production**

✅ **Your data will survive container restarts**

✅ **Only ~$0.10/month additional cost**

✅ **No code changes required**

---

**Questions?** See [PERSISTENT_STORAGE.md](PERSISTENT_STORAGE.md) for detailed troubleshooting.