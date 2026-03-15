const { CloudantV1 } = require('@ibm-cloud/cloudant');
const { IamAuthenticator } = require('ibm-cloud-sdk-core');

// Check if Cloudant is configured
const isCloudantConfigured = () => {
  return process.env.CLOUDANT_URL && process.env.CLOUDANT_APIKEY;
};

let cloudantClient = null;
let meetingsDb = null;
// Allow database name to be configured via environment variable
const DB_NAME = process.env.CLOUDANT_DB_NAME || 'meetings';

// Initialize Cloudant client
if (isCloudantConfigured()) {
  try {
    const authenticator = new IamAuthenticator({
      apikey: process.env.CLOUDANT_APIKEY,
    });

    cloudantClient = CloudantV1.newInstance({
      authenticator: authenticator,
      serviceUrl: process.env.CLOUDANT_URL,
    });

    console.log('✅ Cloudant client initialized');
    console.log(`📊 Database name: ${DB_NAME}`);
  } catch (error) {
    console.error('❌ Error initializing Cloudant:', error.message);
  }
} else {
  console.log('⚠️  Cloudant not configured - using SQLite');
}

/**
 * Initialize Cloudant database
 */
async function initCloudantDatabase() {
  if (!cloudantClient) {
    return false;
  }

  try {
    // Check if database exists
    try {
      await cloudantClient.getDatabaseInformation({ db: DB_NAME });
      console.log(`✅ Cloudant database '${DB_NAME}' exists`);
    } catch (error) {
      if (error.status === 404) {
        // Create database if it doesn't exist
        await cloudantClient.putDatabase({ db: DB_NAME });
        console.log(`✅ Cloudant database '${DB_NAME}' created`);
      } else {
        throw error;
      }
    }

    // Create indexes for efficient queries
    await createIndexes();
    
    meetingsDb = DB_NAME;
    return true;
  } catch (error) {
    console.error('❌ Error initializing Cloudant database:', error.message);
    return false;
  }
}

/**
 * Create indexes for efficient queries
 */
async function createIndexes() {
  try {
    // Index for querying by start_datetime
    await cloudantClient.postIndex({
      db: DB_NAME,
      index: {
        fields: ['start_datetime']
      },
      name: 'start-datetime-index',
      type: 'json'
    });

    console.log('✅ Cloudant indexes created');
  } catch (error) {
    // Index might already exist
    if (error.status !== 409) {
      console.error('⚠️  Error creating indexes:', error.message);
    }
  }
}

/**
 * Convert SQLite-style meeting to Cloudant document
 */
function toCloudantDoc(meeting) {
  const doc = { ...meeting };
  
  // Convert id to _id for Cloudant
  if (doc.id) {
    doc._id = doc.id.toString();
    delete doc.id;
  }
  
  // Ensure timestamps are ISO strings
  if (doc.created_at && !(doc.created_at instanceof Date)) {
    doc.created_at = new Date(doc.created_at).toISOString();
  }
  if (doc.updated_at && !(doc.updated_at instanceof Date)) {
    doc.updated_at = new Date(doc.updated_at).toISOString();
  }
  
  return doc;
}

/**
 * Convert Cloudant document to SQLite-style meeting
 */
function fromCloudantDoc(doc) {
  const meeting = { ...doc };
  
  // Convert _id to id
  if (meeting._id) {
    meeting.id = meeting._id;
    delete meeting._id;
  }
  
  // Remove Cloudant metadata
  delete meeting._rev;
  
  return meeting;
}

/**
 * Cloudant meeting operations
 */
const cloudantMeetingQueries = {
  /**
   * Get all meetings
   */
  getAll: async () => {
    if (!cloudantClient || !meetingsDb) {
      throw new Error('Cloudant not initialized');
    }

    try {
      const response = await cloudantClient.postFind({
        db: meetingsDb,
        selector: {},
        sort: [{ 'start_datetime': 'desc' }],
        limit: 1000
      });

      return response.result.docs.map(fromCloudantDoc);
    } catch (error) {
      console.error('Error getting all meetings from Cloudant:', error);
      throw error;
    }
  },

  /**
   * Get meeting by ID
   */
  getById: async (id) => {
    if (!cloudantClient || !meetingsDb) {
      throw new Error('Cloudant not initialized');
    }

    try {
      const response = await cloudantClient.getDocument({
        db: meetingsDb,
        docId: id.toString()
      });

      return fromCloudantDoc(response.result);
    } catch (error) {
      if (error.status === 404) {
        return null;
      }
      console.error('Error getting meeting from Cloudant:', error);
      throw error;
    }
  },

  /**
   * Create new meeting
   */
  create: async (meeting) => {
    if (!cloudantClient || !meetingsDb) {
      throw new Error('Cloudant not initialized');
    }

    try {
      // Generate ID based on timestamp
      const id = Date.now().toString();
      const doc = toCloudantDoc({
        ...meeting,
        id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      const response = await cloudantClient.postDocument({
        db: meetingsDb,
        document: doc
      });

      return { id: response.result.id, lastID: response.result.id };
    } catch (error) {
      console.error('Error creating meeting in Cloudant:', error);
      throw error;
    }
  },

  /**
   * Update meeting
   */
  update: async (id, meeting) => {
    if (!cloudantClient || !meetingsDb) {
      throw new Error('Cloudant not initialized');
    }

    try {
      // Get current document to get _rev
      const currentDoc = await cloudantClient.getDocument({
        db: meetingsDb,
        docId: id.toString()
      });

      const doc = toCloudantDoc({
        ...meeting,
        id,
        _rev: currentDoc.result._rev,
        updated_at: new Date().toISOString()
      });

      const response = await cloudantClient.postDocument({
        db: meetingsDb,
        document: doc
      });

      return { changes: 1 };
    } catch (error) {
      console.error('Error updating meeting in Cloudant:', error);
      throw error;
    }
  },

  /**
   * Delete meeting
   */
  delete: async (id) => {
    if (!cloudantClient || !meetingsDb) {
      throw new Error('Cloudant not initialized');
    }

    try {
      // Get current document to get _rev
      const currentDoc = await cloudantClient.getDocument({
        db: meetingsDb,
        docId: id.toString()
      });

      await cloudantClient.deleteDocument({
        db: meetingsDb,
        docId: id.toString(),
        rev: currentDoc.result._rev
      });

      return { changes: 1 };
    } catch (error) {
      console.error('Error deleting meeting from Cloudant:', error);
      throw error;
    }
  }
};

module.exports = {
  initCloudantDatabase,
  isCloudantConfigured,
  cloudantMeetingQueries,
  cloudantClient
};

// Made with Bob
