const mongoose = require('mongoose');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dsp-brand-protection';

// Supabase connection
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// MongoDB Models
const User = require('../models/User');
const Incident = require('../models/Incident');
const Document = require('../models/Document');
const Template = require('../models/Template');
const MonitoringAlert = require('../models/MonitoringAlert');

// Helper function to generate UUID from MongoDB ObjectId
function generateUUID() {
  return crypto.randomUUID();
}

async function migrateToSupabase() {
  try {
    console.log('🚀 Starting migration from MongoDB to Supabase...');
    
    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Test Supabase connection
    console.log('🧪 Testing Supabase connection...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (testError && testError.code === 'PGRST205') {
      console.error('❌ Supabase tables not found. Please run the SQL schema first.');
      return false;
    }
    
    if (testError) {
      console.error('❌ Supabase connection failed:', testError);
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    
    // Create ID mapping for relationships
    const userMapping = new Map();
    const incidentMapping = new Map();
    
    // Migrate Users
    console.log('👥 Migrating users...');
    const users = await User.find({});
    console.log(`Found ${users.length} users to migrate`);
    
    for (const user of users) {
      try {
        const { data, error } = await supabase
          .from('users')
          .upsert({
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
            preferences: user.preferences || {},
            password_reset_token: user.passwordResetToken,
            password_reset_expires: user.passwordResetExpires,
            email_verification_token: user.emailVerificationToken,
            email_verified: user.emailVerified,
            invitation_token: user.invitationToken,
            invitation_expires: user.invitationExpires,
            invitation_status: user.invitationStatus,
            login_attempts: user.loginAttempts,
            lock_until: user.lockUntil
          }, { onConflict: 'email' })
          .select();
        
        if (error) {
          console.warn(`⚠️  Error migrating user ${user.email}:`, error.message);
        } else {
          console.log(`✅ Migrated user: ${user.email}`);
          // Store mapping for relationships
          userMapping.set(user._id.toString(), data[0].id);
        }
      } catch (error) {
        console.warn(`⚠️  Error migrating user ${user.email}:`, error.message);
      }
    }
    
    // Migrate Incidents
    console.log('📋 Migrating incidents...');
    const incidents = await Incident.find({}).populate('reporter assignedTo');
    console.log(`Found ${incidents.length} incidents to migrate`);
    
    for (const incident of incidents) {
      try {
        const { data, error } = await supabase
          .from('incidents')
          .insert({
            title: incident.title,
            description: incident.description,
            reporter_id: userMapping.get(incident.reporter?._id?.toString()),
            incident_type: incident.incidentType,
            severity: incident.severity,
            status: incident.status,
            priority: incident.priority,
            infringed_content: incident.infringedContent,
            infringed_urls: incident.infringedUrls || [],
            infringer_info: incident.infringerInfo || {},
            assigned_to: userMapping.get(incident.assignedTo?._id?.toString()),
            assigned_at: incident.assignedAt,
            due_date: incident.dueDate,
            tags: incident.tags || [],
            evidence_files: incident.evidenceFiles || [],
            notes: incident.notes || [],
            reported_at: incident.reportedAt,
            resolved_at: incident.resolvedAt
          })
          .select();
        
        if (error) {
          console.warn(`⚠️  Error migrating incident ${incident.title}:`, error.message);
        } else {
          console.log(`✅ Migrated incident: ${incident.title}`);
          // Store mapping for relationships
          incidentMapping.set(incident._id.toString(), data[0].id);
        }
      } catch (error) {
        console.warn(`⚠️  Error migrating incident ${incident.title}:`, error.message);
      }
    }
    
    // Migrate Documents
    console.log('📄 Migrating documents...');
    const documents = await Document.find({}).populate('incident uploadedBy');
    console.log(`Found ${documents.length} documents to migrate`);
    
    for (const document of documents) {
      try {
        const { data, error } = await supabase
          .from('documents')
          .insert({
            incident_id: incidentMapping.get(document.incident?._id?.toString()),
            title: document.title,
            description: document.description,
            file_path: document.filePath,
            file_name: document.fileName,
            file_size: document.fileSize,
            file_type: document.fileType,
            document_type: document.documentType,
            uploaded_by: userMapping.get(document.uploadedBy?._id?.toString())
          });
        
        if (error) {
          console.warn(`⚠️  Error migrating document ${document.title}:`, error.message);
        } else {
          console.log(`✅ Migrated document: ${document.title}`);
        }
      } catch (error) {
        console.warn(`⚠️  Error migrating document ${document.title}:`, error.message);
      }
    }
    
    // Migrate Templates
    console.log('📝 Migrating templates...');
    const templates = await Template.find({}).populate('createdBy');
    console.log(`Found ${templates.length} templates to migrate`);
    
    for (const template of templates) {
      try {
        const { data, error } = await supabase
          .from('templates')
          .insert({
            name: template.name,
            description: template.description,
            template_type: template.templateType,
            content: template.content,
            variables: template.variables || [],
            is_active: template.isActive,
            created_by: userMapping.get(template.createdBy?._id?.toString())
          });
        
        if (error) {
          console.warn(`⚠️  Error migrating template ${template.name}:`, error.message);
        } else {
          console.log(`✅ Migrated template: ${template.name}`);
        }
      } catch (error) {
        console.warn(`⚠️  Error migrating template ${template.name}:`, error.message);
      }
    }
    
    // Migrate Monitoring Alerts (without populate to avoid errors)
    console.log('🔔 Migrating monitoring alerts...');
    const alerts = await MonitoringAlert.find({});
    console.log(`Found ${alerts.length} monitoring alerts to migrate`);
    
    for (const alert of alerts) {
      try {
        const { data, error } = await supabase
          .from('monitoring_alerts')
          .insert({
            alert_type: alert.alertType,
            source: alert.source,
            title: alert.title,
            description: alert.description,
            url: alert.url,
            content: alert.content,
            severity: alert.severity,
            status: alert.status,
            assigned_to: userMapping.get(alert.assignedTo?.toString()),
            incident_id: incidentMapping.get(alert.incident?.toString()),
            metadata: alert.metadata || {}
          });
        
        if (error) {
          console.warn(`⚠️  Error migrating alert ${alert.title}:`, error.message);
        } else {
          console.log(`✅ Migrated alert: ${alert.title}`);
        }
      } catch (error) {
        console.warn(`⚠️  Error migrating alert ${alert.title}:`, error.message);
      }
    }
    
    console.log('🎉 Migration completed successfully!');
    console.log('');
    console.log('📊 Migration Summary:');
    console.log(`- Users: ${users.length}`);
    console.log(`- Incidents: ${incidents.length}`);
    console.log(`- Documents: ${documents.length}`);
    console.log(`- Templates: ${templates.length}`);
    console.log(`- Monitoring Alerts: ${alerts.length}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return false;
  } finally {
    // Close MongoDB connection
    await mongoose.disconnect();
    console.log('📦 Disconnected from MongoDB');
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateToSupabase()
    .then((success) => {
      if (success) {
        console.log('🎉 Migration completed successfully!');
        process.exit(0);
      } else {
        console.log('💥 Migration failed!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('💥 Migration error:', error);
      process.exit(1);
    });
}

module.exports = migrateToSupabase;
