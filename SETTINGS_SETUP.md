# Settings Feature Setup Guide

## Overview
The admin portal now has fully functional settings pages for managing school information, notifications, security, and academic settings.

## 🚀 Quick Setup

### Step 1: Run Database Migration
Execute the SQL migration file to create the settings tables:

1. Open Supabase Dashboard: https://okfawhokrtkaibhbcjdk.supabase.co
2. Go to **SQL Editor**
3. Copy and paste the contents of `database/add-settings-tables.sql`
4. Click **Run** to execute

This will create:
- `school_settings` - School information
- `notification_settings` - Email/SMS configuration
- `academic_settings` - Academic year and term settings
- `security_settings` - Security and access control

### Step 2: Access Settings
Navigate to the admin portal and click on **Settings** to access:

## 📋 Settings Pages

### 1. School Information (`/admin/settings/school-info`)
Configure basic school details:
- School name and motto
- Address and contact information
- Principal information
- Website and founding year

### 2. System Notifications (`/admin/settings/notifications`)
Manage notification preferences:
- **Email Settings**: SMTP configuration for email notifications
- **SMS Settings**: SMS gateway API configuration
- **Notification Types**: Enable/disable specific notifications
  - Attendance notifications
  - Results notifications
  - Fee notifications
  - Announcement notifications

### 3. Security & Access (`/admin/settings/security`)
Configure security policies:
- Session timeout duration
- Maximum login attempts
- Password policy (minimum length, expiration)
- Two-factor authentication
- Access permissions for teachers and students

### 4. General Settings (`/admin/settings/general`)
Academic and system preferences:
- Current academic year
- Current term (First/Second/Third)
- Term dates (start, end, vacation)
- System preferences (online admission, result viewing)

## 🔐 Security Features

All settings tables have Row Level Security (RLS) enabled:
- Only **admins** can view and update settings
- All changes are tracked with `updated_at` and `updated_by` fields
- Non-admin users cannot access settings pages

## 📊 Default Values

The migration automatically creates default records with sensible values:
- School name: "Biriwa Methodist 'C' Basic School"
- Academic year: "2024/2025"
- Current term: "First Term"
- Session timeout: 60 minutes
- Password minimum length: 8 characters
- Email notifications: Enabled
- SMS notifications: Disabled

## 🎯 Usage

### Updating School Information
1. Navigate to **Admin Portal > Settings**
2. Click **School Information**
3. Update fields as needed
4. Click **Save Changes**

### Configuring Notifications
1. Go to **System Notifications**
2. Enable email or SMS notifications
3. Enter SMTP or SMS gateway credentials
4. Select which notification types to enable
5. Save changes

### Managing Security
1. Go to **Security & Access**
2. Adjust session timeout and login attempts
3. Configure password policy
4. Set access permissions
5. Save changes

### Setting Academic Year
1. Go to **General Settings**
2. Update academic year and term
3. Set term dates
4. Configure system preferences
5. Save changes

## 🔄 Dynamic Updates

The main settings page automatically displays:
- Current school name
- Current academic year
- Current term
- System status

All data is loaded dynamically from the database.

## 📝 Notes

- Changes take effect immediately after saving
- All settings are stored in the database
- Settings persist across sessions
- Only admin users can modify settings
- Changes are logged with user ID and timestamp

## ✅ Testing

After running the migration, test each settings page:
1. Login as admin
2. Navigate to Settings
3. Click each configuration card
4. Verify forms load with current values
5. Make a test change and save
6. Confirm changes are saved
7. Return to main settings page to see updates

---

**Need Help?** If you encounter any issues, check:
1. Database migration ran successfully
2. You're logged in as admin
3. Supabase connection is working
4. Browser console for any errors
