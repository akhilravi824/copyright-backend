const mongoose = require('mongoose');
const { createClient } = require('@supabase/supabase-js');
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
      console.log('Go to: https://supabase.com/dashboard/project/slccdyjixpmstlhveagk');
      console.log('Click SQL Editor and run the schema from: server/database/complete-schema.sql');
      return false;
    }
    
    if (testError) {
      console.error('❌ Supabase connection failed:', testError);
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    
    // Migrate Users
    console.log('👥 Migrating users...');
    const users = await User.find({});
    console.log(`Found ${users.length} users to migrate`);
    
    for (const user of users) {
      const { data, error } = await supabase
        .from('users')
        .upsert({
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
          preferences: user.preferences || {},
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
        }, { onConflict: 'email' });
      
      if (error) {
        console.warn(`⚠️  Error migrating user ${user.email}:`, error.message);
      } else {
        console.log(`✅ Migrated user: ${user.email}`);
      }
    }
    
    // Migrate Incidents
    console.log('📋 Migrating incidents...');
    const incidents = await Incident.find({}).populate('reporter assignedTo');
    console.log(`Found ${incidents.length} incidents to migrate`);
    
    for (const incident of incidents) {
      const { data, error } = await supabase
        .from('incidents')
        .upsert({
          id: incident._id.toString(),
          title: incident.title,
          description: incident.description,
          reporter_id: incident.reporter?._id?.toString(),
          incident_type: incident.incidentType,
          severity: incident.severity,
          status: incident.status,
          priority: incident.priority,
          infringed_content: incident.infringedContent,
          infringed_urls: incident.infringedUrls || [],
          infringer_info: incident.infringerInfo || {},
          assigned_to: incident.assignedTo?._id?.toString(),
          assigned_at: incident.assignedAt,
          due_date: incident.dueDate,
          tags: incident.tags || [],
          evidence_files: incident.evidenceFiles || [],
          notes: incident.notes || [],
          reported_at: incident.reportedAt,
          resolved_at: incident.resolvedAt,
          created_at: incident.createdAt,
          updated_at: incident.updatedAt
        }, { onConflict: 'id' });
      
      if (error) {
        console.warn(`⚠️  Error migrating incident ${incident.title}:`, error.message);
      } else {
        console.log(`✅ Migrated incident: ${incident.title}`);
      }
    }
    
    // Migrate Documents
    console.log('📄 Migrating documents...');
    const documents = await Document.find({}).populate('incident uploadedBy');
    console.log(`Found ${documents.length} documents to migrate`);
    
    for (const document of documents) {
      const { data, error } = await supabase
        .from('documents')
        .upsert({
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
        }, { onConflict: 'id' });
      
      if (error) {
        console.warn(`⚠️  Error migrating document ${document.title}:`, error.message);
      } else {
        console.log(`✅ Migrated document: ${document.title}`);
      }
    }
    
    // Migrate Templates
    console.log('📝 Migrating templates...');
    const templates = await Template.find({}).populate('createdBy');
    console.log(`Found ${templates.length} templates to migrate`);
    
    for (const template of templates) {
      const { data, error } = await supabase
        .from('templates')
        .upsert({
          id: template._id.toString(),
          name: template.name,
          description: template.description,
          template_type: template.templateType,
          content: template.content,
          variables: template.variables || [],
          is_active: template.isActive,
          created_by: template.createdBy?._id?.toString(),
          created_at: template.createdAt,
          updated_at: template.updatedAt
        }, { onConflict: 'id' });
      
      if (error) {
        console.warn(`⚠️  Error migrating template ${template.name}:`, error.message);
      } else {
        console.log(`✅ Migrated template: ${template.name}`);
      }
    }
    
    // Migrate Monitoring Alerts
    console.log('🔔 Migrating monitoring alerts...');
    const alerts = await MonitoringAlert.find({}).populate('assignedTo incident');
    console.log(`Found ${alerts.length} monitoring alerts to migrate`);
    
    for (const alert of alerts) {
      const { data, error } = await supabase
        .from('monitoring_alerts')
        .upsert({
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
          metadata: alert.metadata || {},
          created_at: alert.createdAt,
          updated_at: alert.updatedAt
        }, { onConflict: 'id' });
      
      if (error) {
        console.warn(`⚠️  Error migrating alert ${alert.title}:`, error.message);
      } else {
        console.log(`✅ Migrated alert: ${alert.title}`);
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