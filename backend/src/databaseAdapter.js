const { isCloudantConfigured, initCloudantDatabase, cloudantMeetingQueries } = require('./cloudantDatabase');
const { db: sqliteDb, initDatabase: initSQLiteDatabase, meetingQueries: sqliteMeetingQueries } = require('./database');

let useCloudant = false;
let meetingQueries = null;

/**
 * Initialize the appropriate database based on configuration
 */
async function initDatabase() {
  if (isCloudantConfigured()) {
    console.log('🔄 Initializing Cloudant database...');
    const success = await initCloudantDatabase();
    
    if (success) {
      useCloudant = true;
      meetingQueries = cloudantMeetingQueries;
      console.log('✅ Using Cloudant for persistence');
      return;
    } else {
      console.log('⚠️  Cloudant initialization failed, falling back to SQLite');
    }
  }

  // Fall back to SQLite
  console.log('🔄 Using SQLite database...');
  initSQLiteDatabase();
  useCloudant = false;
  meetingQueries = {
    getAll: () => sqliteMeetingQueries.getAll.all(),
    getById: (id) => sqliteMeetingQueries.getById.get(id),
    create: (meeting) => {
      const info = sqliteMeetingQueries.create.run(
        meeting.title,
        meeting.description,
        meeting.start_datetime,
        meeting.end_datetime,
        meeting.location,
        meeting.attendees,
        meeting.customer,
        meeting.is_onsite,
        meeting.country
      );
      return info;
    },
    update: (id, meeting) => {
      const info = sqliteMeetingQueries.update.run(
        meeting.title,
        meeting.description,
        meeting.start_datetime,
        meeting.end_datetime,
        meeting.location,
        meeting.attendees,
        meeting.customer,
        meeting.is_onsite,
        meeting.country,
        id
      );
      return info;
    },
    delete: (id) => {
      const info = sqliteMeetingQueries.delete.run(id);
      return info;
    }
  };
  console.log('✅ Using SQLite for persistence');
}

/**
 * Get database type
 */
function getDatabaseType() {
  return useCloudant ? 'cloudant' : 'sqlite';
}

/**
 * Get meeting queries (works with both SQLite and Cloudant)
 */
function getMeetingQueries() {
  if (!meetingQueries) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return meetingQueries;
}

module.exports = {
  initDatabase,
  getDatabaseType,
  getMeetingQueries,
  isCloudant: () => useCloudant
};

// Made with Bob
