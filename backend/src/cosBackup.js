const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// Check if COS is configured
const isCOSConfigured = () => {
  return process.env.COS_ENDPOINT && 
         process.env.COS_BUCKET && 
         process.env.COS_ACCESS_KEY && 
         process.env.COS_SECRET_KEY;
};

// Initialize S3 client only if COS is configured
let s3Client = null;
if (isCOSConfigured()) {
  s3Client = new S3Client({
    endpoint: process.env.COS_ENDPOINT,
    credentials: {
      accessKeyId: process.env.COS_ACCESS_KEY,
      secretAccessKey: process.env.COS_SECRET_KEY
    },
    region: 'eu-de',
    forcePathStyle: true
  });
  console.log('✅ COS backup configured');
} else {
  console.log('⚠️  COS backup not configured - running in ephemeral mode');
}

/**
 * Backup database to Cloud Object Storage
 */
async function backupDatabase() {
  if (!s3Client) {
    console.log('COS not configured, skipping backup');
    return;
  }

  try {
    const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/meetings.db');
    
    // Check if database file exists
    if (!fs.existsSync(dbPath)) {
      console.log('Database file not found, skipping backup');
      return;
    }

    const dbBuffer = fs.readFileSync(dbPath);
    const timestamp = new Date().toISOString();
    
    // Upload to COS
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.COS_BUCKET,
      Key: 'meetings.db',
      Body: dbBuffer,
      Metadata: {
        'backup-timestamp': timestamp,
        'backup-size': dbBuffer.length.toString()
      }
    }));
    
    console.log(`✅ Database backed up to COS at ${timestamp} (${dbBuffer.length} bytes)`);
  } catch (error) {
    console.error('❌ Error backing up database to COS:', error.message);
  }
}

/**
 * Restore database from Cloud Object Storage
 */
async function restoreDatabase() {
  if (!s3Client) {
    console.log('COS not configured, skipping restore');
    return false;
  }

  try {
    const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/meetings.db');
    
    // Ensure data directory exists
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    console.log('🔄 Attempting to restore database from COS...');
    
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: process.env.COS_BUCKET,
      Key: 'meetings.db'
    }));
    
    // Read the stream
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const dbBuffer = Buffer.concat(chunks);
    
    // Write to file
    fs.writeFileSync(dbPath, dbBuffer);
    
    const timestamp = response.Metadata?.['backup-timestamp'] || 'unknown';
    console.log(`✅ Database restored from COS (backup from ${timestamp}, ${dbBuffer.length} bytes)`);
    return true;
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      console.log('ℹ️  No backup found in COS, starting with fresh database');
    } else {
      console.error('❌ Error restoring database from COS:', error.message);
    }
    return false;
  }
}

/**
 * Initialize COS backup system
 */
function initializeCOSBackup() {
  if (!s3Client) {
    console.log('⚠️  COS backup disabled - data will be lost on container restart');
    return;
  }

  // Restore database on startup
  restoreDatabase()
    .then((restored) => {
      if (restored) {
        console.log('✅ Database initialization complete with COS restore');
      } else {
        console.log('ℹ️  Database initialization complete (no restore needed)');
      }
    })
    .catch((error) => {
      console.error('❌ Error during database restore:', error);
    });

  // Backup every 5 minutes
  const BACKUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  setInterval(() => {
    backupDatabase().catch(error => {
      console.error('❌ Scheduled backup failed:', error);
    });
  }, BACKUP_INTERVAL);

  console.log(`✅ COS backup scheduled every ${BACKUP_INTERVAL / 1000 / 60} minutes`);

  // Backup on process exit
  process.on('SIGTERM', async () => {
    console.log('📤 Performing final backup before shutdown...');
    await backupDatabase();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('📤 Performing final backup before shutdown...');
    await backupDatabase();
    process.exit(0);
  });
}

module.exports = {
  initializeCOSBackup,
  backupDatabase,
  restoreDatabase,
  isCOSConfigured
};

// Made with Bob
