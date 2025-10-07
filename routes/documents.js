const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const Document = require('../models/Document');
const Template = require('../models/Template');
const Incident = require('../models/Incident');
const { auth, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/documents');
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
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|txt|rtf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, and RTF files are allowed.'));
    }
  }
});

// @route   GET /api/documents
// @desc    Get all documents with filtering
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      incidentId,
      type,
      status,
      createdBy,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (incidentId) filter.incidentId = incidentId;
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (createdBy) filter.createdBy = createdBy;
    
    // Search functionality
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { 'recipient.name': { $regex: search, $options: 'i' } },
        { 'recipient.organization': { $regex: search, $options: 'i' } }
      ];
    }

    // Role-based filtering
    if (req.user.role === 'staff') {
      filter.$or = [
        { createdBy: req.user._id },
        { 'reviewers.user': req.user._id }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const documents = await Document.find(filter)
      .populate('incidentId', 'title caseNumber')
      .populate('createdBy', 'firstName lastName email')
      .populate('reviewers.user', 'firstName lastName')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Document.countDocuments(filter);

    res.json({
      documents,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/documents/:id
// @desc    Get document by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('incidentId', 'title caseNumber')
      .populate('createdBy', 'firstName lastName email')
      .populate('reviewers.user', 'firstName lastName')
      .populate('notes.author', 'firstName lastName');

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check permissions
    if (req.user.role === 'staff' && 
        document.createdBy._id.toString() !== req.user._id.toString() &&
        !document.reviewers.some(r => r.user._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(document);

  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/documents
// @desc    Create a new document
// @access  Private
router.post('/', auth, requirePermission('create_documents'), [
  body('title').trim().isLength({ min: 5 }).withMessage('Title must be at least 5 characters'),
  body('type').isIn(['cease_desist', 'dmca_takedown', 'abuse_report', 'legal_notice', 'other']).withMessage('Invalid document type'),
  body('incidentId').isMongoId().withMessage('Invalid incident ID'),
  body('content').trim().isLength({ min: 10 }).withMessage('Content must be at least 10 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      type,
      incidentId,
      content,
      templateId,
      recipient,
      deliveryMethod,
      tags = []
    } = req.body;

    // Verify incident exists
    const incident = await Incident.findById(incidentId);
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    // Create document
    const document = new Document({
      title,
      type,
      incidentId,
      content,
      templateId,
      createdBy: req.user._id,
      recipient: JSON.parse(recipient || '{}'),
      deliveryMethod,
      tags: JSON.parse(tags || '[]'),
      status: 'draft'
    });

    await document.save();
    await document.populate('incidentId', 'title caseNumber');
    await document.populate('createdBy', 'firstName lastName email');

    res.status(201).json({
      message: 'Document created successfully',
      document
    });

  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/documents/generate-from-template
// @desc    Generate document from template
// @access  Private
router.post('/generate-from-template', auth, requirePermission('create_documents'), [
  body('templateId').isMongoId().withMessage('Invalid template ID'),
  body('incidentId').isMongoId().withMessage('Invalid incident ID'),
  body('variables').isObject().withMessage('Variables must be an object')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { templateId, incidentId, variables, recipient, deliveryMethod } = req.body;

    // Get template
    const template = await Template.findById(templateId);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Verify incident exists
    const incident = await Incident.findById(incidentId);
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    // Validate required variables
    const validation = template.validateVariables(variables);
    if (!validation.isValid) {
      return res.status(400).json({ 
        message: 'Missing required variables',
        missingVariables: validation.missingVariables
      });
    }

    // Render template
    const rendered = template.render(variables);

    // Create document
    const document = new Document({
      title: rendered.subject || template.name,
      type: template.type,
      incidentId,
      content: rendered.content,
      templateId,
      createdBy: req.user._id,
      recipient: JSON.parse(recipient || '{}'),
      deliveryMethod,
      status: 'draft'
    });

    await document.save();
    await document.populate('incidentId', 'title caseNumber');
    await document.populate('createdBy', 'firstName lastName email');

    // Increment template usage
    await template.incrementUsage();

    res.status(201).json({
      message: 'Document generated successfully',
      document
    });

  } catch (error) {
    console.error('Error generating document:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/documents/:id
// @desc    Update document
// @access  Private
router.put('/:id', auth, requirePermission('edit_incidents'), [
  body('title').optional().trim().isLength({ min: 5 }).withMessage('Title must be at least 5 characters'),
  body('content').optional().trim().isLength({ min: 10 }).withMessage('Content must be at least 10 characters'),
  body('status').optional().isIn(['draft', 'review', 'approved', 'sent', 'responded', 'archived']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check permissions
    if (req.user.role === 'staff' && 
        document.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Can only edit your own documents' });
    }

    const updates = req.body;
    delete updates._id;
    delete updates.createdBy;
    delete updates.createdAt;

    Object.assign(document, updates);
    await document.save();

    await document.populate('incidentId', 'title caseNumber');
    await document.populate('createdBy', 'firstName lastName email');

    res.json({
      message: 'Document updated successfully',
      document
    });

  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/documents/:id/reviewers
// @desc    Add reviewer to document
// @access  Private
router.post('/:id/reviewers', auth, requirePermission('edit_incidents'), [
  body('userId').isMongoId().withMessage('Invalid user ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    await document.addReviewer(req.body.userId);
    await document.populate('reviewers.user', 'firstName lastName email');

    res.json({
      message: 'Reviewer added successfully',
      document
    });

  } catch (error) {
    console.error('Error adding reviewer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/documents/:id/reviewers/:userId
// @desc    Update reviewer status
// @access  Private
router.put('/:id/reviewers/:userId', auth, [
  body('status').isIn(['pending', 'approved', 'rejected']).withMessage('Invalid status'),
  body('comments').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user is a reviewer
    const isReviewer = document.reviewers.some(r => r.user.toString() === req.params.userId);
    if (!isReviewer) {
      return res.status(403).json({ message: 'Not authorized to review this document' });
    }

    await document.updateReviewerStatus(req.params.userId, req.body.status, req.body.comments);
    await document.populate('reviewers.user', 'firstName lastName email');

    res.json({
      message: 'Review status updated successfully',
      document
    });

  } catch (error) {
    console.error('Error updating review status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/documents/:id/send
// @desc    Mark document as sent
// @access  Private
router.post('/:id/send', auth, requirePermission('send_legal_actions'), [
  body('deliveryMethod').isIn(['email', 'mail', 'fax', 'online_form', 'other']).withMessage('Invalid delivery method'),
  body('sentDate').optional().isISO8601().withMessage('Invalid date format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    document.status = 'sent';
    document.deliveryMethod = req.body.deliveryMethod;
    document.sentDate = req.body.sentDate ? new Date(req.body.sentDate) : new Date();

    await document.save();
    await document.populate('incidentId', 'title caseNumber');
    await document.populate('createdBy', 'firstName lastName email');

    res.json({
      message: 'Document marked as sent successfully',
      document
    });

  } catch (error) {
    console.error('Error marking document as sent:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/documents/stats/overview
// @desc    Get document statistics
// @access  Private
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const stats = await Document.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          draft: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
          review: { $sum: { $cond: [{ $eq: ['$status', 'review'] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
          responded: { $sum: { $cond: [{ $eq: ['$status', 'responded'] }, 1, 0] } }
        }
      }
    ]);

    const typeStats = await Document.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    const monthlyStats = await Document.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.json({
      overview: stats[0] || { total: 0, draft: 0, review: 0, approved: 0, sent: 0, responded: 0 },
      byType: typeStats,
      monthly: monthlyStats
    });

  } catch (error) {
    console.error('Error fetching document stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
