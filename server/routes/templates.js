const express = require('express');
const { body, validationResult } = require('express-validator');

const Template = require('../models/Template');
const { auth, requirePermission } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/templates
// @desc    Get all templates with filtering
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      type,
      category,
      search,
      isActive = true
    } = req.query;

    // Build filter object
    const filter = { isActive };
    
    if (type) filter.type = type;
    if (category) filter.category = category;
    
    // Search functionality
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const templates = await Template.find(filter)
      .populate('createdBy', 'firstName lastName')
      .populate('lastModifiedBy', 'firstName lastName')
      .sort({ name: 1 });

    res.json({ templates });

  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/templates/:id
// @desc    Get template by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const template = await Template.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('lastModifiedBy', 'firstName lastName');

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json(template);

  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/templates
// @desc    Create a new template
// @access  Private (legal and above)
router.post('/', auth, requirePermission('create_documents'), [
  body('name').trim().isLength({ min: 3 }).withMessage('Name must be at least 3 characters'),
  body('type').isIn(['cease_desist', 'dmca_takedown', 'abuse_report', 'legal_notice', 'email_template', 'other']).withMessage('Invalid template type'),
  body('content').trim().isLength({ min: 10 }).withMessage('Content must be at least 10 characters'),
  body('subject').optional().trim(),
  body('description').optional().trim(),
  body('category').optional().trim(),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('variables').optional().isArray().withMessage('Variables must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      type,
      subject,
      content,
      description,
      category,
      tags = [],
      variables = [],
      settings = {}
    } = req.body;

    // Create template
    const template = new Template({
      name,
      type,
      subject,
      content,
      description,
      category,
      tags,
      variables,
      settings,
      createdBy: req.user._id,
      lastModifiedBy: req.user._id
    });

    await template.save();
    await template.populate('createdBy', 'firstName lastName');

    res.status(201).json({
      message: 'Template created successfully',
      template
    });

  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/templates/:id
// @desc    Update template
// @access  Private (legal and above)
router.put('/:id', auth, requirePermission('create_documents'), [
  body('name').optional().trim().isLength({ min: 3 }).withMessage('Name must be at least 3 characters'),
  body('content').optional().trim().isLength({ min: 10 }).withMessage('Content must be at least 10 characters'),
  body('subject').optional().trim(),
  body('description').optional().trim(),
  body('category').optional().trim(),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('variables').optional().isArray().withMessage('Variables must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const updates = req.body;
    delete updates._id;
    delete updates.createdBy;
    delete updates.createdAt;

    updates.lastModifiedBy = req.user._id;
    Object.assign(template, updates);

    await template.save();
    await template.populate('createdBy', 'firstName lastName');
    await template.populate('lastModifiedBy', 'firstName lastName');

    res.json({
      message: 'Template updated successfully',
      template
    });

  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/templates/:id/preview
// @desc    Preview template with variables
// @access  Private
router.post('/:id/preview', auth, [
  body('variables').isObject().withMessage('Variables must be an object')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Validate required variables
    const validation = template.validateVariables(req.body.variables);
    if (!validation.isValid) {
      return res.status(400).json({ 
        message: 'Missing required variables',
        missingVariables: validation.missingVariables
      });
    }

    // Render template
    const rendered = template.render(req.body.variables);

    res.json({
      subject: rendered.subject,
      content: rendered.content,
      variables: req.body.variables
    });

  } catch (error) {
    console.error('Error previewing template:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/templates/:id/approve
// @desc    Approve template for legal use
// @access  Private (legal and above)
router.put('/:id/approve', auth, requirePermission('create_documents'), [
  body('approved').isBoolean().withMessage('Approved must be a boolean'),
  body('comments').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    template.legalApproved = req.body.approved;
    template.approvedBy = req.user._id;
    template.approvedAt = new Date();

    if (req.body.comments) {
      template.history.push({
        version: template.version,
        content: template.content,
        modifiedBy: req.user._id,
        modifiedAt: new Date(),
        changeNotes: `Legal approval: ${req.body.comments}`
      });
    }

    await template.save();
    await template.populate('approvedBy', 'firstName lastName');

    res.json({
      message: `Template ${req.body.approved ? 'approved' : 'rejected'} successfully`,
      template
    });

  } catch (error) {
    console.error('Error approving template:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/templates/:id
// @desc    Delete template (soft delete)
// @access  Private (admin only)
router.delete('/:id', auth, requirePermission('create_documents'), async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    template.isActive = false;
    await template.save();

    res.json({ message: 'Template deleted successfully' });

  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/templates/stats/overview
// @desc    Get template statistics
// @access  Private
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const stats = await Template.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ['$legalApproved', true] }, 1, 0] } },
          totalUsage: { $sum: '$usageCount' }
        }
      }
    ]);

    const typeStats = await Template.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          usage: { $sum: '$usageCount' }
        }
      }
    ]);

    const mostUsed = await Template.getMostUsed(5);

    res.json({
      overview: stats[0] || { total: 0, active: 0, approved: 0, totalUsage: 0 },
      byType: typeStats,
      mostUsed
    });

  } catch (error) {
    console.error('Error fetching template stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
