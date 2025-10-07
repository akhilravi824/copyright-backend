const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const databaseService = require('../config/databaseService');
const { auth, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
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

// Validation rules
const incidentValidation = [
  body('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title must be between 5 and 200 characters'),
  body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('incidentType').isIn(['copyright_infringement', 'trademark_violation', 'impersonation', 'unauthorized_distribution', 'other']).withMessage('Invalid incident type'),
  body('severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity level'),
  body('infringedContent').trim().isLength({ min: 5 }).withMessage('Infringed content description is required'),
  body('infringedUrls').custom((value) => {
    if (!value || !Array.isArray(value)) {
      throw new Error('Infringed URLs must be an array');
    }
    if (value.length === 0) {
      throw new Error('At least one infringed URL is required');
    }
    return true;
  }),
  body('infringerInfo').optional().isObject().withMessage('Infringer info must be an object')
];

// @route   POST /api/incidents
// @desc    Create a new incident
// @access  Private
router.post('/', auth, upload.array('evidence', 5), incidentValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      incidentType,
      severity = 'medium',
      priority = 'normal',
      infringedContent,
      infringedUrls,
      infringerInfo = {},
      tags = [],
      dueDate
    } = req.body;

    // Process infringed URLs
    let processedUrls = [];
    if (typeof infringedUrls === 'string') {
      try {
        processedUrls = JSON.parse(infringedUrls);
      } catch (e) {
        processedUrls = [{ url: infringedUrls, description: '', verified: false }];
      }
    } else if (Array.isArray(infringedUrls)) {
      processedUrls = infringedUrls;
    }

    // Normalize URLs (add https:// if no protocol)
    processedUrls = processedUrls.map(urlObj => {
      if (typeof urlObj === 'string') {
        urlObj = { url: urlObj, description: '', verified: false };
      }
      if (!urlObj.url.startsWith('http://') && !urlObj.url.startsWith('https://')) {
        urlObj.url = 'https://' + urlObj.url;
      }
      return urlObj;
    });

    // Process infringer info
    let processedInfringerInfo = {};
    if (typeof infringerInfo === 'string') {
      try {
        processedInfringerInfo = JSON.parse(infringerInfo);
      } catch (e) {
        processedInfringerInfo = { name: infringerInfo };
      }
    } else if (typeof infringerInfo === 'object') {
      processedInfringerInfo = infringerInfo;
    }

    // Process tags
    let processedTags = [];
    if (typeof tags === 'string') {
      try {
        processedTags = JSON.parse(tags);
      } catch (e) {
        processedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }
    } else if (Array.isArray(tags)) {
      processedTags = tags;
    }

    // Process evidence files
    const evidenceFiles = req.files ? req.files.map(file => ({
      fileName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      fileType: file.mimetype,
      uploadedAt: new Date()
    })) : [];

    // Get database service
    const db = databaseService.getService();
    
    if (databaseService.type === 'supabase') {
      // Create incident using Supabase
      const { data, error } = await db.createIncident({
        title,
        description,
        reporter_id: req.user.id,
        incident_type: incidentType,
        severity,
        priority,
        infringed_content: infringedContent,
        infringed_urls: processedUrls,
        infringer_info: processedInfringerInfo,
        tags: processedTags,
        evidence_files: evidenceFiles,
        due_date: dueDate ? new Date(dueDate) : null,
        reported_at: new Date()
      });

      if (error) {
        console.error('Error creating incident:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
      }

      // Get the created incident with populated data
      const incident = await db.getIncidentById(data.id);
      
      res.status(201).json({
        message: 'Incident reported successfully',
        incident: {
          ...incident,
          caseNumber: `DSP-${incident.id.slice(-8).toUpperCase()}`,
          reporter: {
            _id: incident.reporter?.id,
            firstName: incident.reporter?.first_name,
            lastName: incident.reporter?.last_name,
            email: incident.reporter?.email,
            department: incident.reporter?.department
          }
        }
      });
    } else {
      // Fallback to MongoDB (for backward compatibility)
      const Incident = require('../models/Incident');
      const User = require('../models/User');
      
      const incident = new Incident({
        title,
        description,
        reporter: req.user._id,
        incidentType,
        severity,
        priority,
        infringedContent,
        infringedUrls: processedUrls,
        infringerInfo: processedInfringerInfo,
        tags: processedTags,
        evidenceFiles,
        dueDate: dueDate ? new Date(dueDate) : null,
        reportedAt: new Date()
      });

      await incident.save();
      await incident.populate('reporter', 'firstName lastName email department');

      res.status(201).json({
        message: 'Incident reported successfully',
        incident
      });
    }

  } catch (error) {
    console.error('Error creating incident:', error);
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
      sortBy = 'reported_at',
      sortOrder = 'desc'
    } = req.query;

    const db = databaseService.getService();
    
    if (databaseService.type === 'supabase') {
      // Get incidents using Supabase
      const filters = {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        incident_type: incidentType,
        severity,
        assigned_to: assignedTo,
        reporter_id: reporter,
        search,
        sortBy,
        sortOrder
      };

      const { incidents, total } = await db.listIncidents(filters);

      res.json({
        incidents: incidents.map(incident => ({
          ...incident,
          caseNumber: `DSP-${incident.id.slice(-8).toUpperCase()}`,
          reporter: {
            _id: incident.reporter?.id,
            firstName: incident.reporter?.first_name,
            lastName: incident.reporter?.last_name,
            email: incident.reporter?.email,
            department: incident.reporter?.department
          },
          assignedTo: incident.assigned_to ? {
            _id: incident.assigned_to.id,
            firstName: incident.assigned_to.first_name,
            lastName: incident.assigned_to.last_name,
            email: incident.assigned_to.email
          } : null
        })),
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      });
    } else {
      // Fallback to MongoDB
      const Incident = require('../models/Incident');
      
      const filter = {};
      if (status) filter.status = status;
      if (incidentType) filter.incidentType = incidentType;
      if (severity) filter.severity = severity;
      if (assignedTo) filter.assignedTo = assignedTo;
      if (reporter) filter.reporter = reporter;
      
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { infringedContent: { $regex: search, $options: 'i' } },
          { 'infringerInfo.name': { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const incidents = await Incident.find(filter)
        .populate('reporter', 'firstName lastName email department')
        .populate('assignedTo', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Incident.countDocuments(filter);

      res.json({
        incidents,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
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

      res.json({
        ...incident,
        caseNumber: `DSP-${incident.id.slice(-8).toUpperCase()}`,
        reporter: {
          _id: incident.reporter?.id,
          firstName: incident.reporter?.first_name,
          lastName: incident.reporter?.last_name,
          email: incident.reporter?.email,
          department: incident.reporter?.department
        },
        assignedTo: incident.assigned_to ? {
          _id: incident.assigned_to.id,
          firstName: incident.assigned_to.first_name,
          lastName: incident.assigned_to.last_name,
          email: incident.assigned_to.email
        } : null
      });
    } else {
      // Fallback to MongoDB
      const Incident = require('../models/Incident');
      
      const incident = await Incident.findById(req.params.id)
        .populate('reporter', 'firstName lastName email department phone')
        .populate('assignedTo', 'firstName lastName email phone')
        .populate('notes.author', 'firstName lastName email')
        .populate('documents', 'title fileName fileType uploadedBy createdAt')
        .populate('monitoringAlerts', 'title alertType status createdAt');

      if (!incident) {
        return res.status(404).json({ message: 'Incident not found' });
      }

      res.json(incident);
    }

  } catch (error) {
    console.error('Error fetching incident:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/incidents/:id
// @desc    Update incident
// @access  Private
router.put('/:id', auth, requirePermission('edit_incidents'), async (req, res) => {
  try {
    const db = databaseService.getService();
    
    if (databaseService.type === 'supabase') {
      const { data, error } = await db.updateIncident(req.params.id, req.body);
      
      if (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
      }

      res.json({
        message: 'Incident updated successfully',
        incident: data
      });
    } else {
      // Fallback to MongoDB
      const Incident = require('../models/Incident');
      
      const incident = await Incident.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      ).populate('reporter', 'firstName lastName email department');

      if (!incident) {
        return res.status(404).json({ message: 'Incident not found' });
      }

      res.json({
        message: 'Incident updated successfully',
        incident
      });
    }

  } catch (error) {
    console.error('Error updating incident:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
