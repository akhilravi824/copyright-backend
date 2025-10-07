const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const Incident = require('../models/Incident');
const User = require('../models/User');
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
    try {
      const urls = typeof value === 'string' ? JSON.parse(value) : value;
      if (!Array.isArray(urls)) {
        throw new Error('Infringed URLs must be an array');
      }
      for (const url of urls) {
        if (!url.url || typeof url.url !== 'string') {
          throw new Error('Each URL must have a valid url field');
        }
        // Basic URL validation - try with https:// if no protocol
        let urlToValidate = url.url;
        if (!urlToValidate.match(/^https?:\/\//i)) {
          urlToValidate = `https://${urlToValidate}`;
        }
        try {
          new URL(urlToValidate);
        } catch {
          throw new Error(`Invalid URL format: ${url.url}`);
        }
      }
      return true;
    } catch (error) {
      throw new Error(error.message);
    }
  }),
  body('infringerInfo.name').optional().trim().isLength({ min: 2 }).withMessage('Infringer name must be at least 2 characters'),
  body('infringerInfo.email').optional().isEmail().withMessage('Invalid email format'),
  body('infringerInfo.website').optional().isURL().withMessage('Invalid website URL')
];

// @route   POST /api/incidents
// @desc    Create a new incident report
// @access  Private (staff and above)
router.post('/', auth, requirePermission('create_incidents'), incidentValidation, upload.array('evidence', 10), async (req, res) => {
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
      infringedContent,
      infringedUrls,
      infringerInfo,
      tags = [],
      priority = 'normal'
    } = req.body;

    // Process uploaded files
    const evidence = [];
    if (req.files) {
      for (const file of req.files) {
        evidence.push({
          type: file.mimetype.startsWith('image/') ? 'screenshot' : 'document',
          filename: file.filename,
          url: `/uploads/evidence/${file.filename}`,
          description: `Uploaded evidence: ${file.originalname}`,
          uploadedBy: req.user._id
        });
      }
    }

    // Process URLs and infringer info
    const processedUrls = typeof infringedUrls === 'string' ? JSON.parse(infringedUrls) : infringedUrls || [];
    const processedInfringerInfo = typeof infringerInfo === 'string' ? JSON.parse(infringerInfo) : infringerInfo || {};
    const processedTags = typeof tags === 'string' ? JSON.parse(tags) : tags || [];
    
    // Auto-add https:// to URLs that don't have a protocol
    const normalizedUrls = processedUrls.map(urlObj => ({
      ...urlObj,
      url: urlObj.url.match(/^https?:\/\//i) ? urlObj.url : `https://${urlObj.url}`
    }));

    // Create incident
    const incident = new Incident({
      title,
      description,
      reporter: req.user._id,
      incidentType,
      severity,
      infringedContent,
      infringedUrls: normalizedUrls,
      infringerInfo: processedInfringerInfo,
      evidence,
      tags: processedTags,
      priority,
      status: 'reported'
    });

    await incident.save();
    await incident.populate('reporter', 'firstName lastName email department');

    res.status(201).json({
      message: 'Incident reported successfully',
      incident: {
        ...incident.toObject(),
        caseNumber: incident.caseNumber
      }
    });

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
      sortBy = 'reportedAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status) filter.status = status;
    if (incidentType) filter.incidentType = incidentType;
    if (severity) filter.severity = severity;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (reporter) filter.reporter = reporter;
    
    // Search functionality
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { infringedContent: { $regex: search, $options: 'i' } },
        { 'infringerInfo.name': { $regex: search, $options: 'i' } }
      ];
    }

    // Role-based filtering
    if (req.user.role === 'staff') {
      filter.$or = [
        { reporter: req.user._id },
        { assignedTo: req.user._id }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Sort object
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
    const incident = await Incident.findById(req.params.id)
      .populate('reporter', 'firstName lastName email department')
      .populate('assignedTo', 'firstName lastName email')
      .populate('notes.author', 'firstName lastName');

    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    // Check permissions
    if (req.user.role === 'staff' && 
        incident.reporter._id.toString() !== req.user._id.toString() && 
        incident.assignedTo?._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      ...incident.toObject(),
      caseNumber: incident.caseNumber
    });

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
    const incident = await Incident.findById(req.params.id);
    
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    // Check permissions
    if (req.user.role === 'staff' && 
        incident.reporter.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Can only edit your own incidents' });
    }

    const updates = req.body;
    delete updates._id;
    delete updates.reporter;
    delete updates.reportedAt;

    Object.assign(incident, updates);
    await incident.save();

    await incident.populate('reporter', 'firstName lastName email department');
    await incident.populate('assignedTo', 'firstName lastName email');

    res.json({
      message: 'Incident updated successfully',
      incident: {
        ...incident.toObject(),
        caseNumber: incident.caseNumber
      }
    });

  } catch (error) {
    console.error('Error updating incident:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/incidents/:id/notes
// @desc    Add note to incident
// @access  Private
router.post('/:id/notes', auth, [
  body('content').trim().isLength({ min: 1 }).withMessage('Note content is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const incident = await Incident.findById(req.params.id);
    
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    await incident.addNote(req.body.content, req.user._id);
    await incident.populate('notes.author', 'firstName lastName');

    res.json({
      message: 'Note added successfully',
      incident: incident.toObject()
    });

  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/incidents/:id/status
// @desc    Update incident status
// @access  Private
router.put('/:id/status', auth, requirePermission('edit_incidents'), [
  body('status').isIn(['reported', 'under_review', 'in_progress', 'resolved', 'closed', 'escalated']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const incident = await Incident.findById(req.params.id);
    
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    await incident.updateStatus(req.body.status, req.user._id);

    res.json({
      message: 'Status updated successfully',
      incident: {
        ...incident.toObject(),
        caseNumber: incident.caseNumber
      }
    });

  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/incidents/stats/overview
// @desc    Get incident statistics
// @access  Private
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const stats = await Incident.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $in: ['$status', ['reported', 'under_review', 'in_progress']] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } }
        }
      }
    ]);

    const typeStats = await Incident.aggregate([
      {
        $group: {
          _id: '$incidentType',
          count: { $sum: 1 }
        }
      }
    ]);

    const monthlyStats = await Incident.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$reportedAt' },
            month: { $month: '$reportedAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.json({
      overview: stats[0] || { total: 0, open: 0, resolved: 0, critical: 0, high: 0 },
      byType: typeStats,
      monthly: monthlyStats
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
