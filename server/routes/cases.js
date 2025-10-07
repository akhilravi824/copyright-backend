const express = require('express');
const { body, validationResult } = require('express-validator');

const Incident = require('../models/Incident');
const User = require('../models/User');
const Document = require('../models/Document');
const { auth, requirePermission } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/cases
// @desc    Get all cases with advanced filtering and search
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      incidentType,
      severity,
      priority,
      assignedTo,
      reporter,
      search,
      dateFrom,
      dateTo,
      sortBy = 'reportedAt',
      sortOrder = 'desc',
      view = 'all' // all, my, assigned, open, resolved
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status) filter.status = status;
    if (incidentType) filter.incidentType = incidentType;
    if (severity) filter.severity = severity;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (reporter) filter.reporter = reporter;
    
    // Date range filtering
    if (dateFrom || dateTo) {
      filter.reportedAt = {};
      if (dateFrom) filter.reportedAt.$gte = new Date(dateFrom);
      if (dateTo) filter.reportedAt.$lte = new Date(dateTo);
    }
    
    // Search functionality
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { infringedContent: { $regex: search, $options: 'i' } },
        { 'infringerInfo.name': { $regex: search, $options: 'i' } },
        { 'infringerInfo.organization': { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // View-based filtering
    switch (view) {
      case 'my':
        filter.reporter = req.user._id;
        break;
      case 'assigned':
        filter.assignedTo = req.user._id;
        break;
      case 'open':
        filter.status = { $in: ['reported', 'under_review', 'in_progress'] };
        break;
      case 'resolved':
        filter.status = { $in: ['resolved', 'closed'] };
        break;
    }

    // Role-based filtering for staff
    if (req.user.role === 'staff' && view === 'all') {
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

    const cases = await Incident.find(filter)
      .populate('reporter', 'firstName lastName email department')
      .populate('assignedTo', 'firstName lastName email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Incident.countDocuments(filter);

    // Add case numbers
    const casesWithNumbers = cases.map(case_ => ({
      ...case_.toObject(),
      caseNumber: case_.caseNumber
    }));

    res.json({
      cases: casesWithNumbers,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching cases:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/cases/search-suggestions
// @desc    Get search suggestions for cases
// @access  Private
router.get('/search-suggestions', auth, async (req, res) => {
  try {
    const { q: query, limit = 10 } = req.query;
    
    if (!query || query.length < 2) {
      return res.json({ suggestions: [] });
    }
    
    const searchRegex = new RegExp(query, 'i');
    
    // Search in cases (incidents)
    // Handle case number search (DSP-XXXXXXXX format)
    let searchQuery = {
      $or: [
        { title: searchRegex },
        { description: searchRegex },
        { infringerInfo: { $regex: searchRegex } },
        { tags: { $in: [searchRegex] } }
      ]
    };
    
    // If query looks like a case number (DSP-XXXXXXXX), search by _id
    if (query.match(/^DSP-[A-F0-9]{8}$/i)) {
      const caseIdSuffix = query.replace(/^DSP-/i, '').toLowerCase();
      // Find all incidents and filter by case number
      const allIncidents = await Incident.find({})
        .select('_id title status incidentType severity priority')
        .sort({ reportedAt: -1 });
      
      // Filter by case number
      const matchingCases = allIncidents.filter(incident => {
        const caseNumber = `DSP-${incident._id.toString().slice(-8).toUpperCase()}`;
        return caseNumber.toLowerCase() === query.toLowerCase();
      });
      
      // Format case suggestions
      const caseSuggestions = matchingCases.map(caseItem => ({
        type: 'case',
        id: caseItem._id,
        title: caseItem.title,
        subtitle: `DSP-${caseItem._id.toString().slice(-8).toUpperCase()} • ${caseItem.status}`,
        value: caseItem.title,
        icon: 'file-text',
        category: 'Cases'
      }));
      
      // Search in users (for assigned to suggestions)
      const users = await User.find({
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex },
          { jobTitle: searchRegex }
        ],
        isActive: true
      })
      .select('firstName lastName email jobTitle department')
      .limit(5);
      
      // Format suggestions
      const suggestions = [
        ...caseSuggestions,
        // User suggestions
        ...users.map(user => ({
          type: 'user',
          id: user._id,
          title: `${user.firstName} ${user.lastName}`,
          subtitle: `${user.jobTitle || 'User'} • ${user.department}`,
          value: `${user.firstName} ${user.lastName}`,
          icon: 'user',
          category: 'Users'
        })),
        // Common search terms
        ...getCommonSearchTerms(query)
      ];
      
      return res.json({ suggestions: suggestions.slice(0, parseInt(limit)) });
    }
    
    const cases = await Incident.find(searchQuery)
    .select('caseNumber title status incidentType severity priority')
    .limit(parseInt(limit))
    .sort({ reportedAt: -1 });
    
    // Search in users (for assigned to suggestions)
    const users = await User.find({
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { jobTitle: searchRegex }
      ],
      isActive: true
    })
    .select('firstName lastName email jobTitle department')
    .limit(5);
    
    // Format suggestions
    const suggestions = [
      // Case suggestions
      ...cases.map(caseItem => ({
        type: 'case',
        id: caseItem._id,
        title: caseItem.title,
        subtitle: `${caseItem.caseNumber} • ${caseItem.status}`,
        value: caseItem.title,
        icon: 'file-text',
        category: 'Cases'
      })),
      
      // User suggestions
      ...users.map(user => ({
        type: 'user',
        id: user._id,
        title: `${user.firstName} ${user.lastName}`,
        subtitle: `${user.jobTitle || 'User'} • ${user.department}`,
        value: `${user.firstName} ${user.lastName}`,
        icon: 'user',
        category: 'Users'
      })),
      
      // Common search terms
      ...getCommonSearchTerms(query)
    ];
    
    res.json({ suggestions: suggestions.slice(0, parseInt(limit)) });
  } catch (error) {
    console.error('Error fetching search suggestions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helper function to get common search terms
function getCommonSearchTerms(query) {
  const commonTerms = [
    { value: 'copyright infringement', label: 'Copyright Infringement' },
    { value: 'trademark violation', label: 'Trademark Violation' },
    { value: 'impersonation', label: 'Impersonation' },
    { value: 'open cases', label: 'Open Cases' },
    { value: 'resolved cases', label: 'Resolved Cases' },
    { value: 'critical cases', label: 'Critical Cases' },
    { value: 'high priority', label: 'High Priority' },
    { value: 'medium priority', label: 'Medium Priority' },
    { value: 'low priority', label: 'Low Priority' }
  ];
  
  return commonTerms
    .filter(term => 
      term.value.toLowerCase().includes(query.toLowerCase()) ||
      term.label.toLowerCase().includes(query.toLowerCase())
    )
    .map(term => ({
      type: 'term',
      id: term.value,
      title: term.label,
      subtitle: 'Common search term',
      value: term.value,
      icon: 'search',
      category: 'Suggestions'
    }));
}

// @route   GET /api/cases/:id
// @desc    Get case by ID with full details
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const case_ = await Incident.findById(req.params.id)
      .populate('reporter', 'firstName lastName email department phone')
      .populate('assignedTo', 'firstName lastName email phone')
      .populate('notes.author', 'firstName lastName email')
      .populate('evidence.uploadedBy', 'firstName lastName');

    if (!case_) {
      return res.status(404).json({ message: 'Case not found' });
    }

    // Check permissions
    if (req.user.role === 'staff' && 
        case_.reporter._id.toString() !== req.user._id.toString() && 
        case_.assignedTo?._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get related documents
    const documents = await Document.find({ incidentId: req.params.id })
      .populate('createdBy', 'firstName lastName')
      .populate('reviewers.user', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({
      case: {
        ...case_.toObject(),
        caseNumber: case_.caseNumber
      },
      documents
    });

  } catch (error) {
    console.error('Error fetching case:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/cases/:id/assign
// @desc    Assign case to user
// @access  Private (manager and above)
router.put('/:id/assign', auth, requirePermission('assign_cases'), [
  body('assignedTo').isMongoId().withMessage('Invalid user ID'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const case_ = await Incident.findById(req.params.id);
    if (!case_) {
      return res.status(404).json({ message: 'Case not found' });
    }

    // Verify assigned user exists
    const assignedUser = await User.findById(req.body.assignedTo);
    if (!assignedUser) {
      return res.status(400).json({ message: 'Assigned user not found' });
    }

    case_.assignedTo = req.body.assignedTo;
    if (req.body.priority) {
      case_.priority = req.body.priority;
    }

    await case_.save();
    await case_.populate('assignedTo', 'firstName lastName email');

    // Add note about assignment
    await case_.addNote(
      `Case assigned to ${assignedUser.fullName}${req.body.priority ? ` with ${req.body.priority} priority` : ''}`,
      req.user._id
    );

    res.json({
      message: 'Case assigned successfully',
      case: {
        ...case_.toObject(),
        caseNumber: case_.caseNumber
      }
    });

  } catch (error) {
    console.error('Error assigning case:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/cases/:id/status
// @desc    Update case status
// @access  Private
router.put('/:id/status', auth, requirePermission('edit_incidents'), [
  body('status').isIn(['reported', 'under_review', 'in_progress', 'resolved', 'closed', 'escalated']).withMessage('Invalid status'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const case_ = await Incident.findById(req.params.id);
    if (!case_) {
      return res.status(404).json({ message: 'Case not found' });
    }

    const oldStatus = case_.status;
    await case_.updateStatus(req.body.status, req.user._id);

    // Add note about status change
    if (req.body.notes) {
      await case_.addNote(
        `Status changed from ${oldStatus} to ${req.body.status}. ${req.body.notes}`,
        req.user._id
      );
    } else {
      await case_.addNote(
        `Status changed from ${oldStatus} to ${req.body.status}`,
        req.user._id
      );
    }

    await case_.populate('reporter', 'firstName lastName email');
    await case_.populate('assignedTo', 'firstName lastName email');

    res.json({
      message: 'Status updated successfully',
      case: {
        ...case_.toObject(),
        caseNumber: case_.caseNumber
      }
    });

  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/cases/stats/dashboard
// @desc    Get dashboard statistics
// @access  Private
router.get('/stats/dashboard', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    // Base aggregation pipeline
    let matchStage = {};
    
    // Role-based filtering
    if (userRole === 'staff') {
      matchStage = {
        $or: [
          { reporter: userId },
          { assignedTo: userId }
        ]
      };
    }

    // Overall statistics
    const overallStats = await Incident.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $in: ['$status', ['reported', 'under_review', 'in_progress']] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
          urgent: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } }
        }
      }
    ]);

    // Status breakdown
    const statusStats = await Incident.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Type breakdown
    const typeStats = await Incident.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$incidentType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Monthly trends (last 12 months)
    const monthlyStats = await Incident.aggregate([
      { $match: matchStage },
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

    // Response time statistics
    const responseTimeStats = await Incident.aggregate([
      { 
        $match: { 
          ...matchStage,
          resolvedAt: { $exists: true }
        } 
      },
      {
        $project: {
          responseTime: {
            $divide: [
              { $subtract: ['$resolvedAt', '$reportedAt'] },
              1000 * 60 * 60 * 24 // Convert to days
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: '$responseTime' },
          minResponseTime: { $min: '$responseTime' },
          maxResponseTime: { $max: '$responseTime' }
        }
      }
    ]);

    // User-specific stats (if not admin)
    let userStats = null;
    if (userRole !== 'admin') {
      userStats = await Incident.aggregate([
        { $match: { reporter: userId } },
        {
          $group: {
            _id: null,
            reported: { $sum: 1 },
            open: { $sum: { $cond: [{ $in: ['$status', ['reported', 'under_review', 'in_progress']] }, 1, 0] } },
            resolved: { $sum: { $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 1, 0] } }
          }
        }
      ]);

      const assignedStats = await Incident.aggregate([
        { $match: { assignedTo: userId } },
        {
          $group: {
            _id: null,
            assigned: { $sum: 1 },
            open: { $sum: { $cond: [{ $in: ['$status', ['reported', 'under_review', 'in_progress']] }, 1, 0] } },
            resolved: { $sum: { $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 1, 0] } }
          }
        }
      ]);

      userStats = {
        reported: userStats[0] || { reported: 0, open: 0, resolved: 0 },
        assigned: assignedStats[0] || { assigned: 0, open: 0, resolved: 0 }
      };
    }

    res.json({
      overview: overallStats[0] || { total: 0, open: 0, resolved: 0, critical: 0, high: 0, urgent: 0 },
      statusBreakdown: statusStats,
      typeBreakdown: typeStats,
      monthlyTrends: monthlyStats,
      responseTime: responseTimeStats[0] || { avgResponseTime: 0, minResponseTime: 0, maxResponseTime: 0 },
      userStats
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/cases/search/suggestions
// @desc    Get search suggestions
// @access  Private
router.get('/search/suggestions', auth, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ suggestions: [] });
    }

    const suggestions = await Incident.aggregate([
      {
        $match: {
          $or: [
            { title: { $regex: q, $options: 'i' } },
            { 'infringerInfo.name': { $regex: q, $options: 'i' } },
            { 'infringerInfo.organization': { $regex: q, $options: 'i' } },
            { tags: { $in: [new RegExp(q, 'i')] } }
          ]
        }
      },
      {
        $project: {
          title: 1,
          'infringerInfo.name': 1,
          'infringerInfo.organization': 1,
          tags: 1,
          status: 1
        }
      },
      { $limit: 10 }
    ]);

    res.json({ suggestions });

  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


module.exports = router;
