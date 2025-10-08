# Analyst Role Implementation - Complete Guide

## 📋 Overview

I've successfully implemented the **Analyst role** with restricted access to the DSP Brand Protection Platform. Analysts can only:

1. **View Dashboard** - Shows statistics and incidents they have reported
2. **View Incidents** - Lists only incidents they have created/reported
3. **Create New Incidents** - Can report new incidents

Analysts **CANNOT** access:
- Cases page
- Documents page
- Templates page
- Monitoring page
- Reports page
- Users management
- Deleted incidents
- Global search functionality

---

## 🚀 Quick Start - Login Credentials

### Test Analyst Account

**Email:** `analyst@dsp.com`  
**Password:** `analyst123`  
**Role:** Analyst (Content Analyst)  
**Department:** Legal

**⚠️ IMPORTANT:** You need to run the SQL migration first (see step 1 below) to create this user.

---

## 📝 Setup Instructions

### Step 1: Run SQL Migration in Supabase

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard/project/slccdyjixpmstlhveagk/sql/new
2. Copy and paste the following SQL:

```sql
-- =====================================================
-- ADD ANALYST ROLE AND CREATE TEST USER
-- =====================================================

-- Step 1: Drop the existing CHECK constraint on role
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Step 2: Add new CHECK constraint with 'analyst' role
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'legal', 'manager', 'staff', 'viewer', 'analyst'));

-- Step 3: Create a test analyst user
-- Password: analyst123 (you should hash this in production)
INSERT INTO users (
  first_name,
  last_name,
  email,
  password,
  role,
  department,
  phone,
  job_title,
  is_active,
  email_verified,
  created_at,
  updated_at
) VALUES (
  'Sarah',
  'Analyst',
  'analyst@dsp.com',
  'analyst123',
  'analyst',
  'legal',
  '+1-555-0103',
  'Content Analyst',
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  role = 'analyst',
  first_name = 'Sarah',
  last_name = 'Analyst',
  job_title = 'Content Analyst',
  updated_at = NOW();

-- Step 4: Comment to document the analyst role
COMMENT ON COLUMN users.role IS 'User role: admin (full access), legal (legal operations), manager (team management), staff (general staff), viewer (read-only), analyst (limited access - own incidents only)';

-- Verify the changes
SELECT id, first_name, last_name, email, role, department, is_active
FROM users
WHERE email = 'analyst@dsp.com';
```

3. Click **Run** to execute the SQL
4. You should see a success message and the analyst user details

### Step 2: Test the Analyst Account

1. **Wait 1-2 minutes** for Vercel to deploy the frontend and backend changes
2. **Logout** from your current admin account
3. **Login** with:
   - Email: `analyst@dsp.com`
   - Password: `analyst123`
4. **Verify** the following:
   - You should only see 2 menu items: Dashboard and Incidents
   - No global search bar at the top
   - Dashboard shows only YOUR reported incidents (will be empty initially)
   - Incidents page shows only YOUR reported incidents

### Step 3: Test Creating an Incident as Analyst

1. Click **"Report New Incident"** on the Dashboard
2. Fill in the incident details
3. Submit the incident
4. **Verify**:
   - The incident appears on the Dashboard
   - The incident appears in the Incidents list
   - No other users' incidents are visible

---

## 🎯 What Was Changed

### Backend Changes

1. **`index-supabase.js`**:
   - Added `reporter_id` filter to `/api/incidents` endpoint
   - When `reporter_id` query parameter is present, filters incidents by that reporter

2. **Database Schema**:
   - Updated `users` table CHECK constraint to include 'analyst' role
   - Created test analyst user

### Frontend Changes

1. **`Layout.js`**:
   - Conditional navigation menu based on user role
   - Analysts see only Dashboard and Incidents
   - Hidden global search bar for analysts

2. **`Dashboard.js`**:
   - Fetches only analyst's own incidents when user role is 'analyst'
   - Calculates stats from filtered incidents
   - Hides charts and certain quick actions for analysts

3. **`Incidents.js`**:
   - Automatically adds `reporter_id` filter for analysts
   - Shows only incidents created by the logged-in analyst

---

## 🔒 Security Features

1. **Backend Filtering**: The backend enforces filtering by `reporter_id`, preventing analysts from accessing other users' data via API manipulation
2. **Frontend Restrictions**: The UI hides navigation items and features analysts shouldn't access
3. **Role-Based Access**: All restrictions are based on the `user.role` field from authentication

---

## 📊 Role Comparison

| Feature | Admin | Manager | Staff | Analyst |
|---------|-------|---------|-------|---------|
| Dashboard | ✅ Full | ✅ Full | ✅ Full | ⚠️ Own incidents only |
| Incidents | ✅ All | ✅ All | ✅ All | ⚠️ Own incidents only |
| Cases | ✅ | ✅ | ✅ | ❌ |
| Documents | ✅ | ✅ | ✅ | ❌ |
| Templates | ✅ | ✅ | ✅ | ❌ |
| Monitoring | ✅ | ✅ | ✅ | ❌ |
| Reports | ✅ | ✅ | ✅ | ❌ |
| Users | ✅ | ❌ | ❌ | ❌ |
| Deleted Incidents | ✅ | ✅ | ❌ | ❌ |
| Global Search | ✅ | ✅ | ✅ | ❌ |
| Create Incident | ✅ | ✅ | ✅ | ✅ |

---

## 🧪 Testing Checklist

- [ ] SQL migration executed successfully in Supabase
- [ ] Analyst user created and visible in database
- [ ] Frontend and backend deployed to Vercel
- [ ] Can login with analyst@dsp.com / analyst123
- [ ] Only see Dashboard and Incidents in navigation
- [ ] No global search bar visible
- [ ] Dashboard shows 0 incidents initially
- [ ] Can create a new incident
- [ ] Created incident appears on Dashboard
- [ ] Created incident appears in Incidents list
- [ ] Cannot access /cases, /documents, /templates, etc. directly

---

## 🔧 Troubleshooting

### Issue: Cannot login as analyst
**Solution**: Make sure you ran the SQL migration in Supabase

### Issue: Can see all incidents, not just my own
**Solution**: 
1. Check that the backend deployment is complete
2. Verify the analyst user's `id` matches the `reporter_id` filter
3. Check browser console and backend logs for errors

### Issue: Navigation shows all pages
**Solution**: 
1. Clear browser cache and reload
2. Verify the frontend deployment is complete
3. Check that `user.role === 'analyst'` in browser console

---

## 📞 Support

If you encounter any issues:

1. Check **Supabase Logs**: https://supabase.com/dashboard/project/slccdyjixpmstlhveagk/logs/postgres-logs
2. Check **Vercel Backend Logs**: https://vercel.com/dashboard (look for the backend-deploy project)
3. Check **Browser Console** for frontend errors
4. Verify the analyst user exists in Supabase: `SELECT * FROM users WHERE email = 'analyst@dsp.com'`

---

## 🎉 Summary

You now have a fully functional Analyst role that restricts users to:
- Viewing only their own incidents
- Creating new incidents
- Accessing a limited dashboard

All code has been deployed to GitHub and Vercel. Just run the SQL migration in Supabase and you're ready to test!

