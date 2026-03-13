const Database = require('better-sqlite3');
const path = require('path');

// Database file path - use environment variable or default to data directory
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/meetings.db');

// Initialize database
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create meetings table
const createMeetingsTable = () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      start_datetime TEXT NOT NULL,
      end_datetime TEXT NOT NULL,
      location TEXT,
      attendees TEXT,
      customer TEXT,
      is_onsite INTEGER DEFAULT 0,
      country TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `;
  db.exec(sql);
};

// Initialize database tables
const initDatabase = () => {
  try {
    createMeetingsTable();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Initialize the database first
initDatabase();

// Meeting CRUD operations - prepare statements after table creation
const meetingQueries = {
  // Get all meetings
  getAll: db.prepare('SELECT * FROM meetings ORDER BY start_datetime DESC'),
  
  // Get meeting by ID
  getById: db.prepare('SELECT * FROM meetings WHERE id = ?'),
  
  // Create new meeting
  create: db.prepare(`
    INSERT INTO meetings (
      title, description, start_datetime, end_datetime,
      location, attendees, customer, is_onsite, country
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  
  // Update meeting
  update: db.prepare(`
    UPDATE meetings
    SET title = ?, description = ?, start_datetime = ?, end_datetime = ?,
        location = ?, attendees = ?, customer = ?, is_onsite = ?, country = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),
  
  // Delete meeting
  delete: db.prepare('DELETE FROM meetings WHERE id = ?')
};

module.exports = {
  db,
  initDatabase,
  meetingQueries
};

// Made with Bob
