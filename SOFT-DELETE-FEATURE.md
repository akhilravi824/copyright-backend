# Soft Delete Feature for Incidents

## Overview
The soft delete feature allows administrators and managers to "delete" incidents without permanently removing them from the database. Deleted incidents are hidden from regular views but can be accessed, reviewed, and restored by authorized users.

## Features Implemented

### 1. **Backend API Endpoints**

#### Delete Incident (Soft Delete)
- **Endpoint**: `DELETE /api/incidents/:id`
- **Access**: Admin and Manager only
- **Payload**:
  ```json
  {
    "userId": "uuid-of-user-performing-delete",
    "reason": "Optional reason for deletion"
  }
  ```
- **Behavior**: 
  - Sets `deleted_at` timestamp
  - Records `deleted_by` user ID
  - Optionally stores `deleted_reason`
  - Incident remains in database but is excluded from regular queries

#### Get Deleted Incidents
- **Endpoint**: `GET /api/incidents/deleted/list?userId=<user-id>`
- **Access**: Admin and Manager only
- **Response**: List of all soft-deleted incidents with deletion metadata

#### Restore Incident
- **Endpoint**: `POST /api/incidents/:id/restore`
- **Access**: Admin and Manager only
- **Payload**:
  ```json
  {
    "userId": "uuid-of-user-performing-restore"
  }
  ```
- **Behavior**: 
  - Clears `deleted_at`, `deleted_by`, and `deleted_reason` fields
  - Incident becomes visible again in regular views

### 2. **Database Schema**

#### New Fields Added to `incidents` Table
```sql
ALTER TABLE incidents
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN deleted_by UUID REFERENCES users(id),
ADD COLUMN deleted_reason TEXT;
```

**Migration File**: `/server/database/add-soft-delete-migration.sql`

**To Apply Migration**:
1. Go to Supabase Dashboard → SQL Editor
2. Copy the SQL from `add-soft-delete-migration.sql`
3. Execute the query

### 3. **Frontend Components**

#### Deleted Incidents Page
- **Route**: `/deleted-incidents`
- **Access**: Admin and Manager only (automatic redirect for unauthorized users)
- **Features**:
  - View all deleted incidents in a table format
  - Search functionality
  - Display deletion metadata (deleted by, deleted date, reason)
  - One-click restore functionality with confirmation modal
  - Shows case number, title, status, severity, and reporter info

#### Navigation Link
- New sidebar menu item: "Deleted Incidents" (with trash icon)
- Only visible to admins and managers
- Located after "Users" in the navigation menu

### 4. **Query Filtering**

All existing endpoints now exclude soft-deleted incidents by default:
- `/api/incidents` - Incident list
- `/api/cases` - Cases list  
- `/api/cases/stats/dashboard` - Dashboard statistics

**Filter Applied**: `.is('deleted_at', null)`

## Usage Instructions

### For Administrators & Managers

#### To Delete an Incident:
Currently, deletion must be done via API call. To add UI button:
1. Open incident detail page
2. Add a "Delete" button (only visible to admin/manager)
3. Show confirmation modal
4. Call `api.delete(/api/incidents/${id})` with user ID and optional reason

#### To View Deleted Incidents:
1. Login as admin or manager
2. Click "Deleted Incidents" in the sidebar
3. Browse the list of deleted incidents
4. Use search bar to find specific incidents

#### To Restore an Incident:
1. Navigate to "Deleted Incidents" page
2. Find the incident you want to restore
3. Click the "Restore" button
4. Confirm the restoration in the modal
5. Incident will immediately reappear in active incidents list

## Security Features

- **Role-Based Access Control**: All soft delete operations verify user role (admin or manager only)
- **Audit Trail**: Tracks who deleted what and when
- **Reason Logging**: Optional reason field for compliance/documentation
- **Authorization Checks**: Backend validates user permissions on every request

## Benefits

1. **Data Retention**: No data is permanently lost
2. **Compliance**: Full audit trail of deletions
3. **Undo Capability**: Mistakes can be easily reversed
4. **Security**: Only authorized users can delete or restore
5. **Clean UI**: Deleted items don't clutter active views

## Database Migration Status

⚠️ **Action Required**: You need to manually run the SQL migration in Supabase:

1. **Location**: `/server/database/add-soft-delete-migration.sql`
2. **Instructions**: Run `node server/scripts/apply-soft-delete-migration.js` to see the SQL
3. **Apply**: Copy and execute in Supabase SQL Editor

## Testing Checklist

- [ ] Run database migration in Supabase
- [ ] Test soft delete as admin user
- [ ] Test soft delete as manager user
- [ ] Verify deleted incident is hidden from incidents list
- [ ] Access deleted incidents page
- [ ] Test restore functionality
- [ ] Verify restored incident appears in active list
- [ ] Test with non-admin user (should see access denied)
- [ ] Verify dashboard stats exclude deleted incidents

## Future Enhancements

- **Add Delete Button**: Add delete button to incident detail page UI
- **Bulk Operations**: Delete/restore multiple incidents at once
- **Permanent Delete**: Option for admins to permanently delete after N days
- **Email Notifications**: Notify relevant parties when incidents are deleted/restored
- **Deletion Reason Required**: Make reason field mandatory for compliance

## Support

For questions or issues:
- Check backend logs in Vercel dashboard
- Review database schema in Supabase
- Verify user roles in the users table
- Check browser console for frontend errors

---

**Last Updated**: October 8, 2025  
**Version**: 1.0.0  
**Status**: ✅ Implemented (Database migration pending)

