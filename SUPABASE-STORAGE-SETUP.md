# Supabase Storage Setup for Evidence Files

This guide explains how to set up a Supabase Storage bucket for storing evidence files (images, documents) uploaded with incidents.

## 📋 Prerequisites

- Access to your Supabase Dashboard: https://supabase.com/dashboard
- Your project: `slccdyjixpmstlhveagk` (from the URL in your config)

## 🪣 Step 1: Create Storage Bucket

1. **Go to Supabase Dashboard**:
   - Navigate to: https://supabase.com/dashboard/project/slccdyjixpmstlhveagk
   - Or go to https://supabase.com/dashboard and select your project

2. **Open Storage**:
   - In the left sidebar, click on **"Storage"**

3. **Create a New Bucket**:
   - Click the **"New bucket"** button
   - Enter the following details:
     - **Name**: `evidence`
     - **Public bucket**: ✅ **Check this box** (to allow public read access to uploaded files)
     - **Allowed MIME types**: Leave empty (or add: `image/jpeg, image/png, image/gif, image/webp, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain`)
     - **File size limit**: `10 MB` (matches the limit in the code)
   - Click **"Create bucket"**

## 🔒 Step 2: Set Up Storage Policies

After creating the bucket, you need to set up policies to allow file uploads and public access.

### Policy 1: Allow Public Read Access

1. In the Storage section, click on your `evidence` bucket
2. Go to the **"Policies"** tab
3. Click **"New policy"** or **"Create policy"**
4. Select **"For full customization"** (custom policy)
5. Enter the following:
   - **Policy Name**: `Public read access`
   - **Allowed operation**: `SELECT` (or check "Read")
   - **Target roles**: `public`
   - **USING expression**:
     ```sql
     true
     ```
6. Click **"Review"** and then **"Save policy"**

### Policy 2: Allow Authenticated Users to Upload

1. Click **"New policy"** again
2. Select **"For full customization"**
3. Enter the following:
   - **Policy Name**: `Allow authenticated uploads`
   - **Allowed operation**: `INSERT` (or check "Insert")
   - **Target roles**: `authenticated`
   - **WITH CHECK expression**:
     ```sql
     true
     ```
   - OR if you want to be more restrictive (only allow certain file types):
     ```sql
     (bucket_id = 'evidence'::text) AND 
     (
       (storage.extension(name) = 'jpg'::text) OR 
       (storage.extension(name) = 'jpeg'::text) OR 
       (storage.extension(name) = 'png'::text) OR 
       (storage.extension(name) = 'gif'::text) OR 
       (storage.extension(name) = 'webp'::text) OR 
       (storage.extension(name) = 'pdf'::text) OR 
       (storage.extension(name) = 'doc'::text) OR 
       (storage.extension(name) = 'docx'::text) OR 
       (storage.extension(name) = 'txt'::text)
     )
     ```
4. Click **"Review"** and then **"Save policy"**

### Policy 3: Allow Authenticated Users to Update/Delete (Optional)

If you want users to be able to update or delete their uploads:

1. Click **"New policy"**
2. Enter:
   - **Policy Name**: `Allow authenticated update and delete`
   - **Allowed operation**: `UPDATE` and `DELETE` (check both)
   - **Target roles**: `authenticated`
   - **USING expression**:
     ```sql
     true
     ```
3. Click **"Review"** and then **"Save policy"**

## ✅ Step 3: Verify Setup

### Test File Upload

You can test the setup by:

1. **Using the Supabase Dashboard**:
   - Go to your `evidence` bucket
   - Try uploading a test file manually
   - If successful, you should see the file in the bucket

2. **Using the Application**:
   - Navigate to **"Report New Incident"** (`/incidents/new`)
   - Fill out the incident form
   - Upload an image or document as evidence
   - Submit the form
   - If successful, the incident will be created with the file uploaded to Supabase Storage

### Check File URL

After uploading a file, you can access it via the public URL:
```
https://slccdyjixpmstlhveagk.supabase.co/storage/v1/object/public/evidence/[filename]
```

Example:
```
https://slccdyjixpmstlhveagk.supabase.co/storage/v1/object/public/evidence/evidence-1759800041562-139466873.png
```

## 🛠️ Troubleshooting

### Error: "new row violates row-level security policy"

**Solution**: Make sure you've created the policies in Step 2. Supabase Storage uses Row-Level Security (RLS) by default.

### Error: "Bucket not found"

**Solution**: Double-check that the bucket name is exactly `evidence` (lowercase, no spaces).

### Files Not Accessible (404 on public URL)

**Solution**: Make sure the bucket is set to **"Public"** and the "Public read access" policy is in place.

### Upload Fails with "File too large"

**Solution**: 
- Check the bucket's file size limit (should be at least 10 MB)
- The backend code has a 10MB limit in `multer` configuration

## 📝 Current Configuration

The backend is already configured to use Supabase Storage. Here's what's already set up in the code:

- **Backend file**: `backend-deploy/index-supabase.js`
- **Upload endpoint**: `POST /api/upload` (single file)
- **Multiple upload endpoint**: `POST /api/upload/multiple` (up to 10 files)
- **Accepted file types**: 
  - Images: `jpeg, jpg, png, gif`
  - Documents: `pdf, doc, docx, txt`
- **Max file size**: `10 MB`
- **Storage bucket**: `evidence`
- **Supabase URL**: `https://slccdyjixpmstlhveagk.supabase.co`

## 🚀 Next Steps

Once you've completed the setup:

1. ✅ Test file upload by creating a new incident with an image/document
2. ✅ Verify the file appears in Supabase Storage dashboard
3. ✅ Verify the file is accessible via the public URL
4. ✅ Mark the TODO as complete! 🎉

## 📚 Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Supabase Storage Policies](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase Storage Limits](https://supabase.com/docs/guides/storage/uploads/file-limits)

