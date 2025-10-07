const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const databaseService = require('../config/databaseService'); // Import the database service
const { auth, requirePermission } = require('../middleware/auth-supabase');

const router = express.Router();

// Configure multer for file uploads (remains the same)
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/evidence');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'));
    }
  }
});

// Validation rules (remains largely the same, but adjusted for Supabase field names)
const incidentValidation = [
  body('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title must be between 5 and 200 characters'),
  body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('incidentType').isIn(['copyright_infringement', 'trademark_violation', 'impersonation', 'unauthorized_distribution', 'other']).withMessage('Invalid incident type'),
  body('severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity level'),
  body('infringedContent').trim().isLength({ min: 5 }).withMessage('Infringed content description is required'),
  body('infringedUrls')
    .custom((value, { req }) => {
      if (!value || value.length === 0) {
        throw new Error('At least one infringed URL is required');
      }
      const urls = typeof value === 'string' ? JSON.parse(value) : value;
      for (const urlObj of urls) {
        let url = urlObj.url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = `https://${url}`; // Auto-prepend protocol for validation
        }
        try {
          new URL(url);
        } catch (e) {
          throw new Error(`Invalid URL: ${urlObj.url}`);
        }
      }
      return true;
    })
    .withMessage('Invalid infringed URLs provided'),
  body('infringerInfo').optional().isObject().withMessage('Infringer info must be an object'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority level'),
  body('assignedTo').optional().isUUID().withMessage('Invalid assigned user ID'),
  body('dueDate').optional().isISO8601().toDate().withMessage('Invalid due date'),
];

// @route   POST /api/incidents
// @desc    Report a new incident
// @access  Private
router.post('/', auth, upload.array('evidenceFiles'), incidentValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Clean up uploaded files if validation fails
      if (req.files) {
        for (const file of req.files) {
          await fs.unlink(file.path);
        }
      }
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      incidentType,
      severity,
      infringedContent,
      infringedUrls,
      infringerInfo,
      tags,
      priority,
      assignedTo,
      dueDate,
    } = req.body;

    const db = databaseService.getService();

    if (databaseService.type === 'supabase') {
      // Process infringedUrls to ensure protocol and correct format for Supabase JSONB
      const processedInfringedUrls = (typeof infringedUrls === 'string' ? JSON.parse(infringedUrls) : infringedUrls).map(urlObj => {
        let url = urlObj.url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = `https://${url}`;
        }
        return { ...urlObj, url };
      });

      const newIncident = {
        title,
        description,
        reporter_id: req.user.id, // Use req.user.id from JWT payload
        incident_type: incidentType,
        severity,
        status: 'reported',
        priority,
        infringed_content: infringedContent,
        infringed_urls: processedInfringedUrls,
        infringer_info: typeof infringerInfo === 'string' ? JSON.parse(infringerInfo) : infringerInfo,
        assigned_to: assignedTo || null, // Ensure UUID or null
        assigned_at: assignedTo ? new Date() : null,
        due_date: dueDate ? new Date(dueDate) : null,
        tags: typeof tags === 'string' ? JSON.parse(tags) : tags,
        reported_at: new Date(),
        evidence_files: req.files ? req.files.map(file => ({
          file_name: file.filename,
          file_path: file.path,
          original_name: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          uploaded_at: new Date(),
        })) : [],
        notes: [], // Initialize empty notes array
      };

      const createdIncident = await db.createIncident(newIncident);

      res.status(201).json({
        message: 'Incident reported successfully',
        incident: createdIncident,
      });

    } else {
      // MongoDB logic (existing code)
      const Incident = require('../models/Incident');
      
      // Process infringedUrls to ensure protocol
      const processedInfringedUrls = (typeof infringedUrls === 'string' ? JSON.parse(infringedUrls) : infringedUrls).map(urlObj => {
        let url = urlObj.url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = `https://${url}`;
        }
        return { ...urlObj, url };
      });

      const newIncident = new Incident({
        title,
        description,
        reporter: req.user.userId,
        incidentType,
        severity,
        status: 'reported',
        priority,
        infringedContent,
        infringedUrls: processedInfringedUrls,
        infringerInfo: typeof infringerInfo === 'string' ? JSON.parse(infringerInfo) : infringerInfo,
        assignedTo: assignedTo || null,
        assignedAt: assignedTo ? new Date() : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        tags: typeof tags === 'string' ? JSON.parse(tags) : tags,
        evidenceFiles: req.files ? req.files.map(file => ({
          fileName: file.filename,
          filePath: file.path,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          uploadedAt: new Date(),
        })) : [],
        notes: [],
      });

      await newIncident.save();

      res.status(201).json({
        message: 'Incident reported successfully',
        incident: newIncident,
      });
    }

  } catch (error) {
    console.error('Error reporting incident:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/incidents
// @desc    Get all incidents with filtering and pagination
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      incidentType,
      severity,
      assignedTo,
      reporter,
      search,
      sortBy = 'reported_at', // Default sort column for Supabase
      sortOrder = 'desc'
    } = req.query;

    const db = databaseService.getService();

    if (databaseService.type === 'supabase') {
      const filters = {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        incident_type: incidentType, // Supabase column name
        severity,
        assigned_to: assignedTo, // Supabase column name
        reporter_id: reporter, // Supabase column name
        search,
        sortBy,
        sortOrder,
      };

      const { incidents, total } = await db.listIncidents(filters);

      // Map Supabase data to match expected frontend structure if necessary
      const formattedIncidents = incidents.map(incident => ({
        _id: incident.id, // Map Supabase 'id' to '_id' for frontend compatibility
        title: incident.title,
        description: incident.description,
        reporter: {
          _id: incident.reporter?.id,
          firstName: incident.reporter?.first_name,
          lastName: incident.reporter?.last_name,
          email: incident.reporter?.email,
          department: incident.reporter?.department,
        },
        incidentType: incident.incident_type,
        severity: incident.severity,
        status: incident.status,
        priority: incident.priority,
        infringedContent: incident.infringed_content,
        infringedUrls: incident.infringed_urls,
        infringerInfo: incident.infringer_info,
        assignedTo: incident.assigned_user ? {
          _id: incident.assigned_user.id,
          firstName: incident.assigned_user.first_name,
          lastName: incident.assigned_user.last_name,
          email: incident.assigned_user.email,
        } : null,
        reportedAt: incident.reported_at,
        createdAt: incident.created_at,
        updatedAt: incident.updated_at,
        caseNumber: incident.case_number, // Use the generated case_number
        // Add other fields as needed
      }));

      res.json({
        incidents: formattedIncidents,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      });

    } else {
      // MongoDB logic (existing code)
      const Incident = require('../models/Incident');
      
      const query = {};
      
      if (status) query.status = status;
      if (incidentType) query.incidentType = incidentType;
      if (severity) query.severity = severity;
      if (assignedTo) query.assignedTo = assignedTo;
      if (reporter) query.reporter = reporter;
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { infringedContent: { $regex: search, $options: 'i' } }
        ];
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const incidents = await Incident.find(query)
        .populate('reporter', 'firstName lastName email department')
        .populate('assignedTo', 'firstName lastName email')
        .sort(sortOptions)
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Incident.countDocuments(query);

      res.json({
        incidents,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      });
    }

  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/incidents/:id
// @desc    Get incident by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const db = databaseService.getService();

    if (databaseService.type === 'supabase') {
      const incident = await db.getIncidentById(req.params.id);

      if (!incident) {
        return res.status(404).json({ message: 'Incident not found' });
      }

      // Map Supabase data to match expected frontend structure
      const formattedIncident = {
        _id: incident.id,
        title: incident.title,
        description: incident.description,
        reporter: {
          _id: incident.reporter?.id,
          firstName: incident.reporter?.first_name,
          lastName: incident.reporter?.last_name,
          email: incident.reporter?.email,
          department: incident.reporter?.department,
          phone: incident.reporter?.phone,
        },
        incidentType: incident.incident_type,
        severity: incident.severity,
        status: incident.status,
        priority: incident.priority,
        infringedContent: incident.infringed_content,
        infringedUrls: incident.infringed_urls,
        infringerInfo: incident.infringer_info,
        assignedTo: incident.assigned_user ? {
          _id: incident.assigned_user.id,
          firstName: incident.assigned_user.first_name,
          lastName: incident.assigned_user.last_name,
          email: incident.assigned_user.email,
          phone: incident.assigned_user.phone,
        } : null,
        assignedAt: incident.assigned_at,
        dueDate: incident.due_date,
        caseNumber: incident.case_number,
        tags: incident.tags,
        evidenceFiles: incident.evidence_files,
        notes: incident.notes,
        reportedAt: incident.reported_at,
        resolvedAt: incident.resolved_at,
        createdAt: incident.created_at,
        updatedAt: incident.updated_at,
      };

      res.json(formattedIncident);

    } else {
      // MongoDB logic (existing code)
      const Incident = require('../models/Incident');
      
      const incident = await Incident.findById(req.params.id)
        .populate('reporter', 'firstName lastName email department phone')
        .populate('assignedTo', 'firstName lastName email phone')
        .populate('notes.author', 'firstName lastName email');

      if (!incident) {
        return res.status(404).json({ message: 'Incident not found' });
      }

      res.json(incident);
    }

  } catch (error) {
    console.error('Error fetching incident details:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/incidents/:id/status
// @desc    Update incident status
// @access  Private
router.put('/:id/status', auth, requirePermission('edit_incidents'), [
  body('status').isIn(['reported', 'under_review', 'in_progress', 'resolved', 'closed', 'escalated']).withMessage('Invalid status'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status } = req.body;
    const db = databaseService.getService();

    if (databaseService.type === 'supabase') {
      const updates = { status, updated_at: new Date() };
      if (status === 'resolved' || status === 'closed') {
        updates.resolved_at = new Date();
      }
      const updatedIncident = await db.updateIncident(req.params.id, updates);

      if (!updatedIncident) {
        return res.status(404).json({ message: 'Incident not found' });
      }

      res.json({ message: 'Incident status updated successfully', incident: updatedIncident });

    } else {
      // MongoDB logic (existing code)
      const Incident = require('../models/Incident');
      
      const updates = { status };
      if (status === 'resolved' || status === 'closed') {
        updates.resolvedAt = new Date();
      }

      const incident = await Incident.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true }
      ).populate('reporter', 'firstName lastName email department')
       .populate('assignedTo', 'firstName lastName email');

      if (!incident) {
        return res.status(404).json({ message: 'Incident not found' });
      }

      res.json({ message: 'Incident status updated successfully', incident });
    }

  } catch (error) {
    console.error('Error updating incident status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
