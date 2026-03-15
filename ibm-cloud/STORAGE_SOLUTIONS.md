# Storage Solutions for Meeting App on IBM Cloud Code Engine

## The Challenge

IBM Cloud Code Engine containers are **ephemeral** - data stored in the container filesystem is lost when containers restart. The SQLite database at `/data/meetings.db` gets wiped out.

## Available Solutions

### Solution 1: IBM Cloud Object Storage (COS) with Sync ⭐ Recommended

Use IBM Cloud Object Storage to persist the database with periodic syncing.

#### Pros
- ✅ Data persists across restarts
- ✅ Automatic backups
- ✅ Low cost (~$0.02/GB/month)
- ✅ Works with existing SQLite code

#### Cons
- ⚠️ Requires COS instance setup
- ⚠️ Sync delay (eventual consistency)
- ⚠️ More complex deployment

#### Implementation

See [COS_SYNC_DEPLOYMENT.md](COS_SYNC_DEPLOYMENT.md) for detailed setup.

**Quick Overview:**
1. Create IBM Cloud Object Storage instance
2. Create bucket for database storage
3. Add sync script to backup/restore database
4. Deploy with COS credentials

**Cost**: ~$0.02/GB/month + minimal API calls

---

### Solution 2: Migrate to PostgreSQL ⭐⭐ Best for Production

Use IBM Cloud Databases for PostgreSQL instead of SQLite.

#### Pros
- ✅ Fully managed database
- ✅ Automatic backups
- ✅ High availability
- ✅ Better for concurrent access
- ✅ Production-grade reliability

#### Cons
- ⚠️ Requires code changes (SQLite → PostgreSQL)
- ⚠️ Higher cost (~$30/month minimum)
- ⚠️ More complex setup

#### Implementation

**1. Create PostgreSQL instance:**
```bash
ibmcloud resource service-instance-create meeting-db \
  databases-for-postgresql standard eu-de \
  -p '{"members_memory_allocation_mb": "1024", "members_disk_allocation_mb": "5120"}'
```

**2. Update backend code:**
- Replace `better-sqlite3` with `pg` (PostgreSQL client)
- Update database queries for PostgreSQL syntax
- Update connection string

**Cost**: Starting at ~$30/month

---

### Solution 3: Accept Ephemeral Storage (Current State)

Keep the current setup and accept data loss on restarts.

#### Pros
- ✅ Simple deployment
- ✅ No additional cost
- ✅ No code changes needed

#### Cons
- ❌ Data lost on container restart
- ❌ Data lost on redeployment
- ❌ Not suitable for production

#### When to Use
- Development/testing environments
- Demo applications
- Temporary data that can be recreated

#### Mitigation Strategies

**1. Export/Import via API:**
```bash
# Before redeployment - export data
curl https://meeting-app-backend.xxx.codeengine.appdomain.cloud/api/meetings > backup.json

# After redeployment - import data
cat backup.json | jq -c '.[]' | while read meeting; do
  curl -X POST https://meeting-app-backend.xxx.codeengine.appdomain.cloud/api/meetings \
    -H "Content-Type: application/json" \
    -d "$meeting"
done
```

**2. Keep min-scale at 1:**
```bash
# Prevents scale-to-zero which would lose data
ibmcloud ce application update --name meeting-app-backend --min-scale 1
```

**3. Document the limitation:**
- Inform users that data is temporary
- Provide export functionality in the UI
- Schedule regular backups via API

---

### Solution 4: Hybrid Approach - COS Backup with Ephemeral Primary

Use ephemeral storage for performance, with periodic backups to COS.

#### Pros
- ✅ Fast database access (local SQLite)
- ✅ Data backed up to COS
- ✅ Relatively simple
- ✅ Low cost

#### Cons
- ⚠️ Data loss between backups
- ⚠️ Manual restore required after restart

#### Implementation

**1. Add backup script to backend:**

```javascript
// backend/src/backup.js
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const s3Client = new S3Client({
  endpoint: process.env.COS_ENDPOINT,
  credentials: {
    accessKeyId: process.env.COS_ACCESS_KEY,
    secretAccessKey: process.env.COS_SECRET_KEY
  },
  region: 'eu-de'
});

async function backupDatabase() {
  const dbPath = process.env.DATABASE_PATH || '/data/meetings.db';
  const dbBuffer = fs.readFileSync(dbPath);
  
  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.COS_BUCKET,
    Key: 'meetings.db',
    Body: dbBuffer
  }));
  
  console.log('Database backed up to COS');
}

async function restoreDatabase() {
  try {
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: process.env.COS_BUCKET,
      Key: 'meetings.db'
    }));
    
    const dbPath = process.env.DATABASE_PATH || '/data/meetings.db';
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    fs.writeFileSync(dbPath, Buffer.concat(chunks));
    
    console.log('Database restored from COS');
  } catch (error) {
    console.log('No backup found, starting with fresh database');
  }
}

// Backup every 5 minutes
setInterval(backupDatabase, 5 * 60 * 1000);

// Restore on startup
restoreDatabase().catch(console.error);

module.exports = { backupDatabase, restoreDatabase };
```

**2. Update server.js:**
```javascript
// At the top of server.js
require('./backup');
```

**3. Deploy with COS credentials:**
```bash
ibmcloud ce application update \
  --name meeting-app-backend \
  --env COS_ENDPOINT=https://s3.eu-de.cloud-object-storage.appdomain.cloud \
  --env COS_BUCKET=meeting-backups \
  --env COS_ACCESS_KEY=<your-key> \
  --env COS_SECRET_KEY=<your-secret>
```

---

## Comparison Table

| Solution | Data Persistence | Cost/Month | Complexity | Production Ready |
|----------|-----------------|------------|------------|------------------|
| **COS Sync** | ✅ Yes (with sync delay) | ~$0.02 | Medium | ✅ Yes |
| **PostgreSQL** | ✅ Yes (immediate) | ~$30+ | High | ✅✅ Best |
| **Ephemeral** | ❌ No | $0 | Low | ❌ No |
| **Hybrid COS** | ⚠️ Partial (backup only) | ~$0.02 | Medium | ⚠️ Limited |

## Recommendation by Use Case

### For Production Applications
→ **Use PostgreSQL** (Solution 2)
- Most reliable
- Best for concurrent users
- Professional support

### For Small Teams / Low Budget
→ **Use COS Sync** (Solution 1)
- Good balance of cost and reliability
- Works with existing code
- Acceptable for small teams

### For Development / Testing
→ **Accept Ephemeral** (Solution 3)
- Simplest setup
- No additional cost
- Document the limitation

### For Demos / Temporary Use
→ **Accept Ephemeral** (Solution 3)
- Quick to deploy
- Data not critical
- Can recreate if needed

## Next Steps

1. **Choose your solution** based on requirements and budget
2. **Follow the implementation guide** for your chosen solution
3. **Test thoroughly** before production use
4. **Document** the storage approach for your team

## Additional Resources

- [IBM Cloud Object Storage Documentation](https://cloud.ibm.com/docs/cloud-object-storage)
- [IBM Cloud Databases for PostgreSQL](https://cloud.ibm.com/docs/databases-for-postgresql)
- [Code Engine Persistent Data Stores](https://cloud.ibm.com/docs/codeengine?topic=codeengine-mount-data-store)

---

**Last Updated**: March 2026  
**Status**: ✅ Multiple Solutions Available