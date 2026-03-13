const express = require('express');
const router = express.Router();
const { meetingQueries } = require('../database');

// GET /api/meetings - Get all meetings
router.get('/', (req, res, next) => {
  try {
    const meetings = meetingQueries.getAll.all();
    res.json(meetings);
  } catch (error) {
    next(error);
  }
});

// GET /api/meetings/:id - Get specific meeting
router.get('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const meeting = meetingQueries.getById.get(id);
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    res.json(meeting);
  } catch (error) {
    next(error);
  }
});

// POST /api/meetings - Create new meeting
router.post('/', (req, res, next) => {
  try {
    const {
      title,
      description,
      start_datetime,
      end_datetime,
      location,
      attendees,
      customer,
      is_onsite,
      country
    } = req.body;

    // Validation
    if (!title || !start_datetime || !end_datetime) {
      return res.status(400).json({ 
        error: 'Title, start_datetime, and end_datetime are required' 
      });
    }

    // Create meeting
    const result = meetingQueries.create.run(
      title,
      description || null,
      start_datetime,
      end_datetime,
      location || null,
      attendees || null,
      customer || null,
      is_onsite ? 1 : 0,
      country || null
    );

    // Get the created meeting
    const meeting = meetingQueries.getById.get(result.lastInsertRowid);
    
    res.status(201).json(meeting);
  } catch (error) {
    next(error);
  }
});

// PUT /api/meetings/:id - Update meeting
router.put('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      start_datetime,
      end_datetime,
      location,
      attendees,
      customer,
      is_onsite,
      country
    } = req.body;

    // Check if meeting exists
    const existing = meetingQueries.getById.get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Validation
    if (!title || !start_datetime || !end_datetime) {
      return res.status(400).json({ 
        error: 'Title, start_datetime, and end_datetime are required' 
      });
    }

    // Update meeting
    meetingQueries.update.run(
      title,
      description || null,
      start_datetime,
      end_datetime,
      location || null,
      attendees || null,
      customer || null,
      is_onsite ? 1 : 0,
      country || null,
      id
    );

    // Get updated meeting
    const meeting = meetingQueries.getById.get(id);
    
    res.json(meeting);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/meetings/:id - Delete meeting
router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if meeting exists
    const existing = meetingQueries.getById.get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Delete meeting
    meetingQueries.delete.run(id);
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;

// Made with Bob
