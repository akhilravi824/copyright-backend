const express = require('express');
const { body, validationResult } = require('express-validator');

const Incident = require('../models/Incident');
const Document = require('../models/Document');
const MonitoringAlert = require('../models/MonitoringAlert');
const { auth, requirePermission } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/reports/overview
// @desc    Get comprehensive overview report
// @access  Private
router.get('/overview', auth, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (dateFrom || dateTo) {
      dateFilter.reportedAt = {};
      if (dateFrom) dateFilter.reportedAt.$gte = new Date(dateFrom);
      if (dateTo) dateFilter.reportedAt.$lte = new Date(dateTo);
    }

    // Get incident statistics
    const incidentStats = await Incident.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $in: ['$status', ['reported', 'under_review', 'in_progress']] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
          avgResolutionTime: {
            $avg: {
              $cond: [
                { $ne: ['$resolvedAt', null] },
                { $subtract: ['$resolvedAt', '$reportedAt'] },
                null
              ]
            }
          }
        }
      }
    ]);

    // Get document statistics
    const documentStats = await Document.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
          responded: { $sum: { $cond: [{ $eq: ['$status', 'responded'] }, 1, 0] } }
        }
      }
    ]);

    // Get monitoring statistics
    const monitoringStats = await MonitoringAlert.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          new: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          falsePositive: { $sum: { $cond: [{ $eq: ['$status', 'false_positive'] }, 1, 0] } }
        }
      }
    ]);

    res.json({
      incidents: incidentStats[0] || { total: 0, open: 0, resolved: 0, critical: 0, high: 0, avgResolutionTime: 0 },
      documents: documentStats[0] || { total: 0, sent: 0, responded: 0 },
      monitoring: monitoringStats[0] || { total: 0, new: 0, resolved: 0, falsePositive: 0 }
    });

  } catch (error) {
    console.error('Error generating overview report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/reports/trends
// @desc    Get trend analysis report
// @access  Private
router.get('/trends', auth, async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    
    let groupFormat;
    switch (period) {
      case 'daily':
        groupFormat = { year: { $year: '$reportedAt' }, month: { $month: '$reportedAt' }, day: { $dayOfMonth: '$reportedAt' } };
        break;
      case 'weekly':
        groupFormat = { year: { $year: '$reportedAt' }, week: { $week: '$reportedAt' } };
        break;
      case 'monthly':
      default:
        groupFormat = { year: { $year: '$reportedAt' }, month: { $month: '$reportedAt' } };
        break;
    }

    // Incident trends
    const incidentTrends = await Incident.aggregate([
      {
        $group: {
          _id: groupFormat,
          count: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
      { $limit: 12 }
    ]);

    // Document trends
    const documentTrends = await Document.aggregate([
      {
        $group: {
          _id: groupFormat,
          count: { $sum: 1 },
          sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
      { $limit: 12 }
    ]);

    res.json({
      incidents: incidentTrends,
      documents: documentTrends
    });

  } catch (error) {
    console.error('Error generating trends report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/reports/export
// @desc    Export comprehensive report
// @access  Private
router.get('/export', auth, requirePermission('view_reports'), async (req, res) => {
  try {
    const { format = 'json', dateFrom, dateTo } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (dateFrom || dateTo) {
      dateFilter.reportedAt = {};
      if (dateFrom) dateFilter.reportedAt.$gte = new Date(dateFrom);
      if (dateTo) dateFilter.reportedAt.$lte = new Date(dateTo);
    }

    // Get all incidents
    const incidents = await Incident.find(dateFilter)
      .populate('reporter', 'firstName lastName email department')
      .populate('assignedTo', 'firstName lastName email')
      .sort({ reportedAt: -1 });

    // Get all documents
    const documents = await Document.find(dateFilter)
      .populate('incidentId', 'title caseNumber')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    // Get all monitoring alerts
    const alerts = await MonitoringAlert.find(dateFilter)
      .populate('assignedTo', 'firstName lastName email')
      .populate('incidentId', 'title caseNumber')
      .sort({ detectedAt: -1 });

    const reportData = {
      generatedAt: new Date().toISOString(),
      generatedBy: req.user.email,
      dateRange: { from: dateFrom, to: dateTo },
      summary: {
        totalIncidents: incidents.length,
        totalDocuments: documents.length,
        totalAlerts: alerts.length
      },
      incidents: incidents.map(incident => ({
        caseNumber: incident.caseNumber,
        title: incident.title,
        type: incident.incidentType,
        status: incident.status,
        severity: incident.severity,
        reporter: incident.reporter?.fullName,
        assignedTo: incident.assignedTo?.fullName,
        reportedAt: incident.reportedAt,
        resolvedAt: incident.resolvedAt
      })),
      documents: documents.map(doc => ({
        title: doc.title,
        type: doc.type,
        status: doc.status,
        incidentCaseNumber: doc.incidentId?.caseNumber,
        createdBy: doc.createdBy?.fullName,
        createdAt: doc.createdAt,
        sentDate: doc.sentDate
      })),
      alerts: alerts.map(alert => ({
        title: alert.title,
        source: alert.source,
        status: alert.status,
        priority: alert.priority,
        detectedAt: alert.detectedAt,
        assignedTo: alert.assignedTo?.fullName,
        incidentCaseNumber: alert.incidentId?.caseNumber
      }))
    };

    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(reportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=dsp-brand-protection-report.csv');
      res.send(csv);
    } else {
      // Return JSON
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=dsp-brand-protection-report.json');
      res.json(reportData);
    }

  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helper function to convert data to CSV
function convertToCSV(data) {
  const headers = [
    'Case Number', 'Title', 'Type', 'Status', 'Severity', 'Reporter', 'Assigned To', 'Reported At', 'Resolved At'
  ];
  
  const rows = data.incidents.map(incident => [
    incident.caseNumber,
    incident.title,
    incident.type,
    incident.status,
    incident.severity,
    incident.reporter,
    incident.assignedTo,
    incident.reportedAt,
    incident.resolvedAt
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field || ''}"`).join(','))
    .join('\n');

  return csvContent;
}

module.exports = router;
