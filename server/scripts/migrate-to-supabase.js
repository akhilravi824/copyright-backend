const mongoose = require('mongoose');
const supabase = require('../config/supabase');
const User = require('../models/User');
const Incident = require('../models/Incident');
const Document = require('../models/Document');
const Template = require('../models/Template');
const MonitoringAlert = require('../models/MonitoringAlert');

async function migrateDataToSupabase() {
  try {
    console.log('🚀 Starting data migration from MongoDB to Supabase...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dsp-brand-protection');
    console.log('📊 Connected to MongoDB');
    
    // Migrate Users
    console.log('👥 Migrating users...');
    const users = await User.find({});
    for (const user of users) {
      const userData = {
        id: user._id.toString(),
        first_name: user.firstName,
        last_name: user.lastName,
        email: user.email,
        password_hash: user.password,
        role: user.role,
        department: user.department,
        phone: user.phone,
        job_title: user.jobTitle,
        avatar: user.avatar,
        is_active: user.isActive,
        last_login: user.lastLogin,
        preferences: user.preferences,
        password_reset_token: user.passwordResetToken,
        password_reset_expires: user.passwordResetExpires,
        email_verification_token: user.emailVerificationToken,
        email_verified: user.emailVerified,
        invitation_token: user.invitationToken,
        invitation_expires: user.invitationExpires,
        invited_by: user.invitedBy?.toString(),
        invitation_status: user.invitationStatus,
        login_attempts: user.loginAttempts,
        lock_until: user.lockUntil,
        created_at: user.createdAt,
        updated_at: user.updatedAt
      };
      
      const { error } = await supabase
        .from('users')
        .upsert(userData, { onConflict: 'email' });
      
      if (error) {
        console.warn(`⚠️  User ${user.email} migration warning:`, error.message);
      } else {
        console.log(`✅ User ${user.email} migrated successfully`);
      }
    }
    
    // Migrate Incidents
    console.log('📋 Migrating incidents...');
    const incidents = await Incident.find({}).populate('reporter assignedTo');
    for (const incident of incidents) {
      const incidentData = {
        id: incident._id.toString(),
        title: incident.title,
        description: incident.description,
        reporter_id: incident.reporter?._id?.toString(),
        incident_type: incident.incidentType,
        severity: incident.severity,
        status: incident.status,
        priority: incident.priority,
        infringed_content: incident.infringedContent,
        infringed_urls: incident.infringedUrls,
        infringer_info: incident.infringerInfo,
        assigned_to: incident.assignedTo?._id?.toString(),
        assigned_at: incident.assignedAt,
        due_date: incident.dueDate,
        tags: incident.tags,
        evidence_files: incident.evidenceFiles,
        notes: incident.notes,
        reported_at: incident.reportedAt,
        resolved_at: incident.resolvedAt,
        created_at: incident.createdAt,
        updated_at: incident.updatedAt
      };
      
      const { error } = await supabase
        .from('incidents')
        .upsert(incidentData, { onConflict: 'id' });
      
      if (error) {
        console.warn(`⚠️  Incident ${incident.title} migration warning:`, error.message);
      } else {
        console.log(`✅ Incident ${incident.title} migrated successfully`);
      }
    }
    
    // Migrate Documents
    console.log('📄 Migrating documents...');
    const documents = await Document.find({}).populate('incident uploadedBy');
    for (const document of documents) {
      const documentData = {
        id: document._id.toString(),
        incident_id: document.incident?._id?.toString(),
        title: document.title,
        description: document.description,
        file_path: document.filePath,
        file_name: document.fileName,
        file_size: document.fileSize,
        file_type: document.fileType,
        document_type: document.documentType,
        uploaded_by: document.uploadedBy?._id?.toString(),
        created_at: document.createdAt,
        updated_at: document.updatedAt
      };
      
      const { error } = await supabase
        .from('documents')
        .upsert(documentData, { onConflict: 'id' });
      
      if (error) {
        console.warn(`⚠️  Document ${document.title} migration warning:`, error.message);
      } else {
        console.log(`✅ Document ${document.title} migrated successfully`);
      }
    }
    
    // Migrate Templates
    console.log('📝 Migrating templates...');
    const templates = await Template.find({}).populate('createdBy');
    for (const template of templates) {
      const templateData = {
        id: template._id.toString(),
        name: template.name,
        description: template.description,
        template_type: template.templateType,
        content: template.content,
        variables: template.variables,
        is_active: template.isActive,
        created_by: template.createdBy?._id?.toString(),
        created_at: template.createdAt,
        updated_at: template.updatedAt
      };
      
      const { error } = await supabase
        .from('templates')
        .upsert(templateData, { onConflict: 'id' });
      
      if (error) {
        console.warn(`⚠️  Template ${template.name} migration warning:`, error.message);
      } else {
        console.log(`✅ Template ${template.name} migrated successfully`);
      }
    }
    
    // Migrate Monitoring Alerts
    console.log('🔔 Migrating monitoring alerts...');
    const alerts = await MonitoringAlert.find({}).populate('assignedTo incident');
    for (const alert of alerts) {
      const alertData = {
        id: alert._id.toString(),
        alert_type: alert.alertType,
        source: alert.source,
        title: alert.title,
        description: alert.description,
        url: alert.url,
        content: alert.content,
        severity: alert.severity,
        status: alert.status,
        assigned_to: alert.assignedTo?._id?.toString(),
        incident_id: alert.incident?._id?.toString(),
        metadata: alert.metadata,
        created_at: alert.createdAt,
        updated_at: alert.updatedAt
      };
      
      const { error } = await supabase
        .from('monitoring_alerts')
        .upsert(alertData, { onConflict: 'id' });
      
      if (error) {
        console.warn(`⚠️  Alert ${alert.title} migration warning:`, error.message);
      } else {
        console.log(`✅ Alert ${alert.title} migrated successfully`);
      }
    }
    
    console.log('✅ Data migration completed successfully!');
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('📊 Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  migrateDataToSupabase()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateDataToSupabase;
