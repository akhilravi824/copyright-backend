const express = require('express');
const { body, validationResult } = require('express-validator');
const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');

const MonitoringAlert = require('../models/MonitoringAlert');
const Incident = require('../models/Incident');
const { auth, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Monitoring configuration
const MONITORING_KEYWORDS = [
  'Signing Naturally',
  'DawnSignPress',
  'ASL Pal',
  'DSP Publications',
  'Dawn Sign Press',
  'ASL Learning',
  'Deaf Education'
];

const MONITORING_DOMAINS = [
  'oercommons.org',
  'merlot.org',
  'openstax.org',
  'khanacademy.org',
  'coursera.org',
  'edx.org',
  'youtube.com',
  'vimeo.com'
];

// @route   GET /api/monitoring/alerts
// @desc    Get monitoring alerts with filtering
// @access  Private
router.get('/alerts', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      source,
      priority,
      assignedTo,
      search,
      dateFrom,
      dateTo,
      sortBy = 'detectedAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status) filter.status = status;
    if (source) filter.source = source;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    
    // Date range filtering
    if (dateFrom || dateTo) {
      filter.detectedAt = {};
      if (dateFrom) filter.detectedAt.$gte = new Date(dateFrom);
      if (dateTo) filter.detectedAt.$lte = new Date(dateTo);
    }
    
    // Search functionality
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { detectedContent: { $regex: search, $options: 'i' } },
        { matchedKeywords: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const alerts = await MonitoringAlert.find(filter)
      .populate('assignedTo', 'firstName lastName email')
      .populate('reviewedBy', 'firstName lastName email')
      .populate('incidentId', 'title caseNumber')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await MonitoringAlert.countDocuments(filter);

    res.json({
      alerts,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching monitoring alerts:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/monitoring/alerts/:id
// @desc    Get monitoring alert by ID
// @access  Private
router.get('/alerts/:id', auth, async (req, res) => {
  try {
    const alert = await MonitoringAlert.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email')
      .populate('reviewedBy', 'firstName lastName email')
      .populate('incidentId', 'title caseNumber')
      .populate('notes.author', 'firstName lastName');

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    res.json(alert);

  } catch (error) {
    console.error('Error fetching alert:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/monitoring/alerts/:id/assign
// @desc    Assign alert to user
// @access  Private
router.post('/alerts/:id/assign', auth, requirePermission('edit_incidents'), [
  body('assignedTo').isMongoId().withMessage('Invalid user ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const alert = await MonitoringAlert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    alert.assignedTo = req.body.assignedTo;
    await alert.save();

    await alert.populate('assignedTo', 'firstName lastName email');

    res.json({
      message: 'Alert assigned successfully',
      alert
    });

  } catch (error) {
    console.error('Error assigning alert:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/monitoring/alerts/:id/status
// @desc    Update alert status
// @access  Private
router.put('/alerts/:id/status', auth, [
  body('status').isIn(['new', 'reviewed', 'investigating', 'action_taken', 'resolved', 'false_positive']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const alert = await MonitoringAlert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    await alert.updateStatus(req.body.status, req.user._id);
    await alert.populate('reviewedBy', 'firstName lastName email');

    res.json({
      message: 'Status updated successfully',
      alert
    });

  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/monitoring/alerts/:id/create-incident
// @desc    Create incident from alert
// @access  Private
router.post('/alerts/:id/create-incident', auth, requirePermission('create_incidents'), async (req, res) => {
  try {
    const alert = await MonitoringAlert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    // Create incident data from alert
    const incidentData = {
      title: alert.title,
      description: alert.description,
      reporter: req.user._id,
      incidentType: 'copyright_infringement',
      severity: alert.priority === 'critical' ? 'critical' : alert.priority === 'high' ? 'high' : 'medium',
      infringedContent: alert.dspContent?.title || 'Unknown DSP Content',
      infringedUrls: [{
        url: alert.sourceUrl,
        description: alert.description,
        verified: true
      }],
      infringerInfo: {
        name: alert.metadata?.platform || 'Unknown',
        website: alert.sourceDomain
      },
      monitoringSource: alert.source,
      evidence: alert.screenshots.map(screenshot => ({
        type: 'screenshot',
        filename: screenshot,
        description: 'Screenshot from monitoring alert'
      }))
    };

    const incident = new Incident(incidentData);
    await incident.save();

    // Link alert to incident
    alert.incidentId = incident._id;
    alert.status = 'action_taken';
    await alert.save();

    await incident.populate('reporter', 'firstName lastName email department');

    res.json({
      message: 'Incident created successfully',
      incident: {
        ...incident.toObject(),
        caseNumber: incident.caseNumber
      }
    });

  } catch (error) {
    console.error('Error creating incident from alert:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/monitoring/scan
// @desc    Trigger manual monitoring scan
// @access  Private (admin only)
router.post('/scan', auth, requirePermission('create_incidents'), async (req, res) => {
  try {
    const results = await performMonitoringScan();
    
    res.json({
      message: 'Monitoring scan completed',
      results: {
        alertsFound: results.length,
        alerts: results
      }
    });

  } catch (error) {
    console.error('Error performing monitoring scan:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/monitoring/stats/overview
// @desc    Get monitoring statistics
// @access  Private
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const stats = await MonitoringAlert.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          new: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
          reviewed: { $sum: { $cond: [{ $eq: ['$status', 'reviewed'] }, 1, 0] } },
          investigating: { $sum: { $cond: [{ $eq: ['$status', 'investigating'] }, 1, 0] } },
          actionTaken: { $sum: { $cond: [{ $eq: ['$status', 'action_taken'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          falsePositive: { $sum: { $cond: [{ $eq: ['$status', 'false_positive'] }, 1, 0] } }
        }
      }
    ]);

    const sourceStats = await MonitoringAlert.aggregate([
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 }
        }
      }
    ]);

    const monthlyStats = await MonitoringAlert.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$detectedAt' },
            month: { $month: '$detectedAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.json({
      overview: stats[0] || { total: 0, new: 0, reviewed: 0, investigating: 0, actionTaken: 0, resolved: 0, falsePositive: 0 },
      bySource: sourceStats,
      monthly: monthlyStats
    });

  } catch (error) {
    console.error('Error fetching monitoring stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Monitoring scan functions
async function performMonitoringScan() {
  const alerts = [];
  
  try {
    // Google Alerts simulation (in production, integrate with Google Alerts API)
    const googleAlerts = await simulateGoogleAlerts();
    alerts.push(...googleAlerts);
    
    // BrandMentions simulation (in production, integrate with BrandMentions API)
    const brandMentions = await simulateBrandMentions();
    alerts.push(...brandMentions);
    
    // Automated web scraping
    const webScans = await performWebScans();
    alerts.push(...webScans);
    
    // Save alerts to database
    for (const alertData of alerts) {
      const existingAlert = await MonitoringAlert.findOne({
        sourceUrl: alertData.sourceUrl,
        detectedAt: {
          $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Within last 24 hours
        }
      });
      
      if (!existingAlert) {
        const alert = new MonitoringAlert(alertData);
        await alert.save();
      }
    }
    
    return alerts;
  } catch (error) {
    console.error('Error in monitoring scan:', error);
    return [];
  }
}

async function simulateGoogleAlerts() {
  // In production, integrate with Google Alerts API
  // For now, return simulated data
  return [
    {
      title: 'Signing Naturally Unit 5 Found on Educational Platform',
      description: 'Potential unauthorized use of DSP content detected',
      source: 'google_alerts',
      sourceUrl: 'https://example-oer.org/signing-naturally-unit-5',
      sourceDomain: 'example-oer.org',
      detectedContent: 'Signing Naturally Unit 5: Family and Relationships',
      matchedKeywords: ['Signing Naturally'],
      confidence: 85,
      dspContent: {
        title: 'Signing Naturally Unit 5',
        contentType: 'book'
      },
      metadata: {
        platform: 'OER Commons',
        language: 'en',
        country: 'US'
      }
    }
  ];
}

async function simulateBrandMentions() {
  // In production, integrate with BrandMentions API
  return [
    {
      title: 'DawnSignPress Logo Used Without Permission',
      description: 'Company logo found on unauthorized website',
      source: 'brandmentions',
      sourceUrl: 'https://unauthorized-site.com/about',
      sourceDomain: 'unauthorized-site.com',
      detectedContent: 'DawnSignPress logo and branding materials',
      matchedKeywords: ['DawnSignPress'],
      confidence: 90,
      dspContent: {
        title: 'DawnSignPress Logo',
        contentType: 'other'
      },
      metadata: {
        platform: 'Website',
        language: 'en',
        country: 'US'
      }
    }
  ];
}

async function performWebScans() {
  const alerts = [];
  
  try {
    // Scan OER repositories
    for (const domain of MONITORING_DOMAINS) {
      try {
        const response = await axios.get(`https://${domain}/search`, {
          params: {
            q: MONITORING_KEYWORDS.join(' OR '),
            limit: 10
          },
          timeout: 10000
        });
        
        const $ = cheerio.load(response.data);
        
        // Parse search results and look for DSP content
        $('.search-result, .result-item, .content-item').each((index, element) => {
          const title = $(element).find('h3, .title, .name').text().trim();
          const description = $(element).find('.description, .summary').text().trim();
          const link = $(element).find('a').attr('href');
          
          if (title && link) {
            const matchedKeywords = MONITORING_KEYWORDS.filter(keyword => 
              title.toLowerCase().includes(keyword.toLowerCase()) ||
              description.toLowerCase().includes(keyword.toLowerCase())
            );
            
            if (matchedKeywords.length > 0) {
              alerts.push({
                title: `Potential DSP Content Found: ${title}`,
                description: description || 'Content found during automated scan',
                source: 'automated_scan',
                sourceUrl: link.startsWith('http') ? link : `https://${domain}${link}`,
                sourceDomain: domain,
                detectedContent: title,
                matchedKeywords,
                confidence: Math.min(60 + (matchedKeywords.length * 10), 90),
                dspContent: {
                  title: title,
                  contentType: 'other'
                },
                metadata: {
                  platform: domain,
                  language: 'en',
                  country: 'US'
                }
              });
            }
          }
        });
      } catch (error) {
        console.error(`Error scanning ${domain}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Error in web scanning:', error);
  }
  
  return alerts;
}

// Schedule automated monitoring scans
if (process.env.NODE_ENV === 'production') {
  // Run monitoring scan every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('Running scheduled monitoring scan...');
    try {
      const results = await performMonitoringScan();
      console.log(`Monitoring scan completed. Found ${results.length} potential alerts.`);
    } catch (error) {
      console.error('Scheduled monitoring scan failed:', error);
    }
  });
}

module.exports = router;
