# Announcements System - Implementation Guide

## Overview
The announcements system allows administrators to post announcements that automatically appear on the website homepage. Announcements can be categorized, prioritized, and set to expire automatically.

## ✅ Features Implemented

### 1. **Admin Announcements Management** (`/admin/announcements`)
- Create, edit, and delete announcements
- Rich announcement form with:
  - Title and content
  - Category (General, Academic, Event, Urgent)
  - Priority (Normal, High, Urgent)
  - Expiration date (optional)
  - Publish/unpublish toggle
  - Show on homepage toggle
- Color-coded priority display
- Publish/unpublish functionality
- Full CRUD operations

### 2. **Website Display** (Homepage)
- Announcements automatically show on website homepage
- Smart filtering:
  - Only shows published announcements
  - Only shows announcements marked "show_on_homepage"
  - Automatically hides expired announcements
- Priority-based display (urgent first)
- User-dismissible (stored in localStorage)
- Color-coded by priority:
  - **Urgent**: Red border and background
  - **High**: Orange border and background
  - **Normal**: Blue border and background

### 3. **Database Structure**
Table: `announcements`
- `id` - UUID primary key
- `title` - Announcement title
- `content` - Announcement content (supports line breaks)
- `category` - general, academic, event, urgent
- `priority` - normal, high, urgent
- `published` - Boolean (published or draft)
- `show_on_homepage` - Boolean (display on homepage)
- `expires_at` - Optional expiration date
- `created_by` - Reference to admin who created it
- `created_at` - Timestamp
- `updated_at` - Auto-updated timestamp

## 🗄️ Database Migration

**Run this SQL in Supabase SQL Editor:**
```sql
-- Location: database/add-announcements.sql
```

The migration creates:
- `announcements` table with all fields
- RLS policies (public read for published, admin full control)
- Indexes for performance
- Auto-update trigger for `updated_at`

## 📁 Files Created/Modified

### Created Files
1. **database/add-announcements.sql**
   - Database schema and RLS policies
   - Indexes and triggers

2. **components/AnnouncementsBanner.tsx**
   - Website announcement display component
   - Dismissible announcements with localStorage
   - Auto-filters published/homepage/unexpired announcements
   - Priority-based styling

### Modified Files
1. **app/admin/announcements/page.tsx**
   - Updated to use new schema (category, expires_at, show_on_homepage)
   - Added saving state
   - Improved UI with better form controls

2. **app/page.tsx** (Homepage)
   - Added AnnouncementsBanner import
   - Added announcements section before photo gallery

3. **database/fix-all-rls-policies.sql**
   - Added announcements RLS policies to master migration

## 🎨 User Interface

### Admin Interface
**Location**: `/admin/announcements`

**Features**:
- List all announcements with priority color coding
- Create new announcement button
- Edit/Delete buttons for each announcement
- Publish/Unpublish toggle
- Status badges (Draft, Homepage)
- Modal form with all fields

**Form Fields**:
- Title* (required)
- Content* (required, supports multiline)
- Category (dropdown)
- Priority (dropdown)
- Expires On (date picker, optional)
- Publish immediately (checkbox)
- Show on homepage (checkbox)

### Website Display
**Location**: Homepage (automatically appears)

**Features**:
- Shows top 5 recent announcements
- Priority sorting (urgent → high → normal)
- Dismiss button (X) on each announcement
- Expiration date display (if set)
- Responsive design
- Color-coded borders

## 🔐 Security

### RLS Policies
1. **Public Read** - Anyone can view published announcements
2. **Admin Full Control** - Only admins can create/edit/delete
3. **Draft Protection** - Unpublished announcements hidden from public

### Data Validation
- Required fields enforced
- Date validation for expiration
- Admin authentication required for all operations

## 🚀 Usage Workflow

### Creating an Announcement
1. Admin logs in and navigates to `/admin/announcements`
2. Click "New Announcement"
3. Fill in title and content
4. Select category and priority
5. Optionally set expiration date
6. Check "Publish immediately" to make it live
7. Check "Show on homepage" to display on website
8. Click "Create"

### Editing an Announcement
1. Click edit icon on any announcement
2. Modify fields as needed
3. Click "Update"

### Publishing/Unpublishing
- Click "Unpublish" button to hide from website
- Click "Publish" button to make visible again

### Deleting an Announcement
- Click trash icon
- Confirm deletion

## 💡 How It Works

### Backend Logic
1. Admin creates announcement via admin portal
2. Announcement saved to database with metadata
3. RLS policies ensure only published announcements are publicly visible

### Frontend Display
1. Homepage loads `AnnouncementsBanner` component
2. Component fetches published announcements with:
   - `published = true`
   - `show_on_homepage = true`
   - Not expired (`expires_at` is null or future date)
3. Sorts by priority (urgent first) then date (recent first)
4. Displays top 5 announcements
5. User can dismiss individual announcements
6. Dismissals stored in localStorage (persistent across sessions)

### Auto-Expiration
- Announcements with `expires_at` set automatically hide after that date
- Query filters out expired announcements: `expires_at >= NOW()`
- No manual cleanup needed

## 📊 Example Use Cases

### 1. School Closure (Urgent)
```
Title: School Closed Due to Weather
Content: All classes are cancelled tomorrow due to heavy rains. Stay safe!
Category: Urgent
Priority: Urgent
Show on Homepage: Yes
Expires: Tomorrow
```

### 2. Exam Schedule (High Priority)
```
Title: End of Term Exams - November 2025
Content: Exams begin December 2nd. Check your class schedules for details.
Category: Academic
Priority: High
Show on Homepage: Yes
Expires: December 10
```

### 3. Event Announcement (Normal)
```
Title: Annual Sports Day Coming Soon
Content: Mark your calendars! Sports Day will be held on December 15th. All students must participate.
Category: Event
Priority: Normal
Show on Homepage: Yes
Expires: December 16
```

### 4. General Notice (Normal)
```
Title: New Library Hours
Content: The school library will now open at 7:00 AM instead of 8:00 AM starting Monday.
Category: General
Priority: Normal
Show on Homepage: Yes
Expires: (No expiration)
```

## 🎯 Display Priority

Announcements display in this order:
1. **Urgent priority** (red)
2. **High priority** (orange)
3. **Normal priority** (blue)

Within each priority level, sorted by date (most recent first).

## 🔄 Auto-Updates

- `updated_at` field automatically updates on any edit
- Trigger handles timestamp updates
- No manual timestamp management needed

## 📱 Responsive Design

- Mobile-friendly layout
- Touch-optimized dismiss button
- Readable on all screen sizes
- Proper spacing and padding

## 🧪 Testing Checklist

- [ ] Create announcement with all fields filled
- [ ] Create announcement with only required fields
- [ ] Edit existing announcement
- [ ] Delete announcement (with confirmation)
- [ ] Publish/unpublish announcement
- [ ] Set expiration date and verify auto-hide
- [ ] Dismiss announcement on website
- [ ] Verify dismissed state persists after page reload
- [ ] Test priority sorting (urgent shows first)
- [ ] Verify "show_on_homepage" toggle works
- [ ] Check announcements appear on homepage
- [ ] Verify unpublished announcements don't show on website

## 🐛 Troubleshooting

**Announcements not showing on website?**
- Check if `published = true`
- Check if `show_on_homepage = true`
- Verify `expires_at` is not in the past
- Clear localStorage if dismissals are stuck

**Can't create announcements?**
- Verify you're logged in as admin
- Check RLS policies are applied
- Run `add-announcements.sql` migration

**Database errors?**
- Ensure announcements table exists
- Verify RLS is enabled
- Check admin has proper role in profiles table

## 🔮 Future Enhancements (Optional)

1. **Email Notifications**
   - Send announcement to parent/student emails
   - Email templates

2. **SMS Integration**
   - Send urgent announcements via SMS
   - Twilio integration

3. **Push Notifications**
   - Browser push notifications for urgent announcements
   - Mobile app notifications

4. **Rich Text Editor**
   - Bold, italic, links in content
   - Image embedding

5. **Announcement Analytics**
   - View count tracking
   - Dismiss rate tracking

6. **Scheduled Publishing**
   - Set future publish date
   - Auto-publish at specific time

7. **Target Audience**
   - Show only to specific classes
   - Show only to parents/students/teachers

8. **Announcement Templates**
   - Pre-defined templates for common announcements
   - Quick fill forms

---

**Status**: ✅ Fully Implemented and Functional
**Migration Required**: Yes - Run `database/add-announcements.sql`
**Dependencies**: Supabase, Next.js, TailwindCSS
