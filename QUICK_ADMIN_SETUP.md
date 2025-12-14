# QUICK ADMIN SETUP GUIDE
**5-Minute Setup - No Coding Required**

---

## Part 1: Create Authentication User (2 minutes)

1. **Open Supabase Dashboard**
   - Go to: https://okfawhokrtkaibhbcjdk.supabase.co
   - Login if needed

2. **Navigate to Users**
   - Click **"Authentication"** in the left sidebar
   - Click **"Users"** 

3. **Add New User**
   - Click the green **"Add User"** button (top right)
   - Select **"Create new user"**

4. **Fill in Details**
   ```
   Email: admin@biriwa.edu.gh
   Password: Admin123!
   ```
   - ✅ **Check** "Auto Confirm User" box
   - Click **"Create User"**

5. **Copy the User ID**
   - You'll see the new user in the list
   - Find the **"id"** column (long text like: a1b2c3d4-e5f6...)
   - **Click to copy** the entire ID
   - **Save it temporarily** (paste in notepad)

---

## Part 2: Create Profile in Database (2 minutes)

1. **Open SQL Editor**
   - Click **"SQL Editor"** in the left sidebar
   - Click **"New Query"** button

2. **Paste This SQL**
   Copy and paste this ENTIRE code:

```sql
-- Create admin profile
-- REPLACE the UUID below with the one you copied!

INSERT INTO profiles (id, email, username, full_name, role)
VALUES (
  'PASTE-YOUR-UUID-HERE',  -- ⚠️ Replace this line!
  'admin@biriwa.edu.gh',
  'admin.francis',
  'Mr. Francis Owusu',
  'admin'
);
```

3. **Replace the UUID**
   - Find the line: `'PASTE-YOUR-UUID-HERE'`
   - Delete `PASTE-YOUR-UUID-HERE`
   - Paste your actual UUID (from step 5 above)
   - Keep the quotes: `'your-uuid-here'`

4. **Run the Query**
   - Click the green **"Run"** button (or press F5)
   - You should see: ✅ "Success. 1 row inserted."

---

## Part 3: Login (1 minute)

1. **Go to Your Website**
   - Open: http://localhost:3000 (or your deployed URL)

2. **Click Portal Button**

3. **Login with Admin Account**
   ```
   Username: admin.francis
   Password: Admin123!
   ```

4. **Click "Sign In"**
   - You should be redirected to the admin dashboard! 🎉

---

## ⚠️ TROUBLESHOOTING

### Error: "Cannot coerce the result to a single JSON object"
- **Problem:** The profile wasn't created in the database
- **Solution:** Go back to Part 2 and run the SQL again

### Error: "Invalid username or password"
- **Problem:** Either the auth user or profile is missing
- **Solutions:**
  1. Check the auth user exists: Authentication > Users
  2. Check the profile exists: Run this SQL:
     ```sql
     SELECT * FROM profiles WHERE username = 'admin.francis';
     ```
  3. If profile is missing, go back to Part 2

### Error: "violates foreign key constraint"
- **Problem:** The UUID in the SQL doesn't match the auth user
- **Solution:** 
  1. Get the correct UUID from Authentication > Users
  2. Copy it exactly
  3. Run the SQL again with the correct UUID

---

## ALTERNATIVE: Use the Portal's Admin Creation

Once you have ONE admin account working, you can create more users easily:

1. Login as admin
2. Go to **Teacher Management** or **Student Management**
3. Click **"Add Teacher"** or **"Add Student"**
4. Or click **"Upload CSV"** to add multiple users at once

---

## Need Help?

If you're still stuck:
1. Take a screenshot of the error
2. Check which part failed (Part 1, 2, or 3)
3. Make sure you copied the UUID exactly (no extra spaces!)
