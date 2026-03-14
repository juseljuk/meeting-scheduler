const express = require('express');
const router = express.Router();
const { meetingQueries } = require('../database');

/**
 * @swagger
 * components:
 *   schemas:
 *     Meeting:
 *       type: object
 *       required:
 *         - title
 *         - start_datetime
 *         - end_datetime
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated meeting ID
 *           example: 1
 *         title:
 *           type: string
 *           description: Meeting title
 *           example: "Customer Demo"
 *         description:
 *           type: string
 *           description: Meeting description
 *           example: "Product demonstration for new customer"
 *         start_datetime:
 *           type: string
 *           format: date-time
 *           description: Meeting start date and time (full day format YYYY-MM-DDT00:00:00)
 *           example: "2026-03-15T00:00:00"
 *         end_datetime:
 *           type: string
 *           format: date-time
 *           description: Meeting end date and time (full day format YYYY-MM-DDT23:59:59)
 *           example: "2026-03-15T23:59:59"
 *         location:
 *           type: string
 *           description: Meeting location
 *           example: "Helsinki Office"
 *         attendees:
 *           type: string
 *           description: Comma-separated list of participants (Ricardo, Jukka, Máté, Steve)
 *           example: "Ricardo, Jukka, Máté"
 *         customer:
 *           type: string
 *           description: Customer name
 *           example: "Acme Corporation"
 *         is_onsite:
 *           type: integer
 *           description: Whether meeting is on-site (1) or remote (0)
 *           example: 1
 *         country:
 *           type: string
 *           description: Country for on-site meetings
 *           example: "Finland"
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *     MeetingInput:
 *       type: object
 *       required:
 *         - title
 *         - start_datetime
 *         - end_datetime
 *       properties:
 *         title:
 *           type: string
 *           example: "Customer Demo"
 *         description:
 *           type: string
 *           example: "Product demonstration"
 *         start_datetime:
 *           type: string
 *           format: date-time
 *           example: "2026-03-15T00:00:00"
 *         end_datetime:
 *           type: string
 *           format: date-time
 *           example: "2026-03-15T23:59:59"
 *         location:
 *           type: string
 *           example: "Helsinki Office"
 *         attendees:
 *           type: string
 *           example: "Ricardo, Jukka"
 *         customer:
 *           type: string
 *           example: "Acme Corporation"
 *         is_onsite:
 *           type: integer
 *           example: 1
 *         country:
 *           type: string
 *           example: "Finland"
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: Error message
 */

/**
 * @swagger
 * /api/meetings:
 *   get:
 *     summary: Get all meetings
 *     description: Retrieve a list of all scheduled meetings
 *     tags: [Meetings]
 *     responses:
 *       200:
 *         description: List of all meetings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Meeting'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', (req, res, next) => {
  try {
    const meetings = meetingQueries.getAll.all();
    res.json(meetings);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/meetings/{id}:
 *   get:
 *     summary: Get a specific meeting
 *     description: Retrieve details of a specific meeting by ID
 *     tags: [Meetings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Meeting ID
 *     responses:
 *       200:
 *         description: Meeting details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Meeting'
 *       404:
 *         description: Meeting not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

/**
 * @swagger
 * /api/meetings:
 *   post:
 *     summary: Create a new meeting
 *     description: Create a new meeting with participants
 *     tags: [Meetings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MeetingInput'
 *           example:
 *             title: "Customer Demo"
 *             description: "Product demonstration for Acme Corp"
 *             start_datetime: "2026-03-15T00:00:00"
 *             end_datetime: "2026-03-15T23:59:59"
 *             location: "Helsinki Office"
 *             attendees: "Ricardo, Jukka, Máté"
 *             customer: "Acme Corporation"
 *             is_onsite: 1
 *             country: "Finland"
 *     responses:
 *       201:
 *         description: Meeting created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Meeting'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

/**
 * @swagger
 * /api/meetings/{id}:
 *   put:
 *     summary: Update a meeting
 *     description: Update an existing meeting by ID
 *     tags: [Meetings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Meeting ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MeetingInput'
 *     responses:
 *       200:
 *         description: Meeting updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Meeting'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Meeting not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

/**
 * @swagger
 * /api/meetings/{id}:
 *   delete:
 *     summary: Delete a meeting
 *     description: Delete an existing meeting by ID
 *     tags: [Meetings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Meeting ID
 *     responses:
 *       204:
 *         description: Meeting deleted successfully
 *       404:
 *         description: Meeting not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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
