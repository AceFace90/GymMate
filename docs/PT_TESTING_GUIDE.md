# PT-Client Collaboration - Testing Guide

## Setup Requirements

1. **Two Test Accounts:**
   - Account A: Trainer (enable "I am a trainer" toggle in Profile)
   - Account B: Client (athlete)

2. **Browser:**
   - Open two browser windows (or use incognito + regular)
   - Window 1: Sign in as Trainer
   - Window 2: Sign in as Client

---

## Test Flow 1: Trainer Invites Client

### Step 1: Enable Trainer Mode (Account A)
1. Go to **Profile** tab
2. Scroll to "Account Type" section
3. Toggle **"I am a trainer"** to ON
4. **Expected:** Two new tabs appear in bottom nav: "Clients" (👥) and "Templates" (📋)

### Step 2: Generate Invite Code (Account A - Trainer)
1. Tap **Clients** tab
2. Tap **"Connect Client"** button (or + FAB if you already have clients)
3. Tap **"Generate Code"**
4. **Expected:**
   - 6-character code appears (e.g., "AB12CD")
   - "Expires in 24h" countdown shows
   - Copy and Share buttons work

### Step 3: Client Accepts Invite (Account B - Client)
1. Go to **Profile** tab
2. Scroll to "Trainer Connection" section
3. Tap **"Connect with Trainer"**
4. Enter the 6-character code from Step 2
5. Tap **"Verify Code"**
6. **Expected:**
   - Trainer preview card appears
   - Shows trainer name + permissions list
   - "Accept & Connect" button enabled
7. Tap **"Accept & Connect"**
8. **Expected:** Success alert, returns to Profile showing trainer name

### Step 4: Verify Connection (Account A - Trainer)
1. Go to **Clients** tab
2. **Expected:**
   - Client appears in list
   - Shows client name, adherence %, workout count
   - Stats overview shows "1 Active Clients"

---

## Test Flow 2: Trainer Creates & Assigns Program

### Step 1: Create Template (Account A - Trainer)
1. Tap **Templates** tab
2. Tap **+ icon** (top right)
3. Create a program:
   - Name: "Beginner Strength"
   - Description: "3x per week full body"
   - Days per week: 3
4. Add exercises to days (use existing program creation flow)
5. **Expected:** Template appears in Templates list

### Step 2: Assign Template (Account A - Trainer)
1. In **Templates** tab, find "Beginner Strength"
2. Tap **"Assign"** button
3. Select client from list (tap to toggle checkmark)
4. Choose assignment type:
   - **Linked** → updates when template changes
   - **Custom Copy** → independent copy
5. Tap **"Assign to 1 Client"**
6. **Expected:** Success alert

### Step 3: Client Views Assigned Program (Account B - Client)
1. Go to **Programs** tab
2. **Expected:**
   - New "Assigned Programs" section
   - "Beginner Strength" program shows:
     - 🔒 Lock icon (read-only)
     - "Created by [Trainer Name]" badge
     - Can tap "Start Workout" but NOT edit
3. Try to edit the program
4. **Expected:** Edit buttons disabled/hidden

---

## Test Flow 3: Client Disconnects

### Step 1: Disconnect (Account B - Client)
1. Go to **Profile** tab
2. Scroll to "Trainer Connection"
3. Tap **"Disconnect"**
4. Confirm in alert
5. **Expected:**
   - Trainer name disappears
   - "Connect with Trainer" button reappears
   - Assigned programs remain but no longer sync

### Step 2: Verify (Account A - Trainer)
1. Go to **Clients** tab
2. **Expected:** Client no longer appears in list (or shows "Disconnected" badge)

---

## Test Flow 4: Template Updates (Linked Programs)

### Prerequisites:
- Trainer assigned a **Linked** program to client (not Custom Copy)

### Step 1: Edit Template (Account A - Trainer)
1. Go to **Templates** tab
2. Tap **"Edit"** on assigned template
3. Change program name or add/remove exercises
4. Save changes

### Step 2: Client Sees Updates (Account B - Client)
1. Go to **Programs** → Assigned Programs
2. **Expected:** Program automatically reflects changes (name, exercises)

**Note:** This requires syncAssignedPrograms() to be called, which happens on app launch or when navigating to Programs screen.

---

## Edge Cases to Test

### EC1: Expired Invite Code
1. Generate invite code
2. Wait 24 hours (or manually change `expiresAt` in Firestore)
3. Try to use code
4. **Expected:** "Invite code has expired" error

### EC2: Invalid Invite Code
1. Enter random 6-character code (e.g., "XXXXXX")
2. **Expected:** "Invalid or expired invite code" error

### EC3: Trainer Deletes Template After Assignment
1. Trainer assigns template to client
2. Trainer deletes template from Templates screen
3. **Expected:**
   - Client's program remains (orphaned copy)
   - No longer syncs updates

### EC4: Multiple Clients
1. Create 3 test client accounts
2. Connect all to same trainer
3. **Expected:**
   - All show in Clients list
   - Stats aggregate correctly (total workouts, avg adherence)

### EC5: Client Has No Google Account (Local Profile)
1. Create local profile (no Google sign-in)
2. Try to connect with trainer
3. **Expected:**
   - Connection works (invite code flow doesn't require Google)
   - Programs assign successfully
   - But sync may be limited (local storage only)

---

## UI Regression Checks

### Programs Tab
- [ ] "My Programs" section still works
- [ ] "Assigned Programs" section only shows when connected
- [ ] Quick Start still works
- [ ] AI generation still works (if Gemini key set)

### Progress Tab
- [ ] Dashboard loads correctly
- [ ] Charts render with data
- [ ] PRs list displays
- [ ] History shows completed workouts

### Exercises Tab
- [ ] Exercise list loads
- [ ] Search works
- [ ] Filter pills work
- [ ] Exercise detail shows video + stats

### Profile Tab
- [ ] Save Profile still works
- [ ] Biometrics save correctly
- [ ] Theme toggle works
- [ ] Logout works
- [ ] Wipe Data still works (with warning)

---

## Database Migration Check

1. Open browser DevTools → Application → IndexedDB (web) or use SQLite inspector (native)
2. Check `programs` table has new columns:
   - `created_by_user_id`
   - `is_template`
   - `linked_template_id`
3. Check new table exists:
   - `workout_feedback`
4. Check schema_version = 2

---

## Firestore Rules Check

1. Open Firebase Console → Firestore → Rules
2. Verify rules deployed:
   ```
   match /trainer_clients/{relationshipId}
   match /program_templates/{templateId}
   match /program_assignments/{assignmentId}
   match /workout_feedback_cloud/{feedbackId}
   ```
3. Test unauthorized access:
   - Try to read another trainer's clients (should fail)
   - Try to assign program without connection (should fail)

---

## Performance Checks

- [ ] Clients list loads quickly (<500ms)
- [ ] Templates list loads quickly (<500ms)
- [ ] Navigation between tabs is smooth
- [ ] No console errors on page load
- [ ] Network requests complete successfully (check DevTools Network tab)

---

## Known Limitations (v1.1.0)

1. **No real-time sync:** Client must refresh/reopen app to see template updates
2. **No push notifications:** Trainer can't notify client of new assignments
3. **No workout feedback UI:** Trainer can't leave comments yet (backend ready, UI not built)
4. **No client stats:** Trainer dashboard shows placeholders (volume, PRs not fetched from client's cloud data yet)
5. **Template-to-program sync:** Only syncs program metadata, not full day/exercise structure (complex logic deferred)

---

## Rollback Instructions

If something breaks badly:

```bash
# Option 1: Switch to v1.0.0 tag (safe)
git checkout main
git checkout v1.0.0
npm start

# Option 2: Delete feature branch (before merge)
git checkout main
git branch -D feature/pt-client-collaboration

# Option 3: Revert merge (after merge)
git revert -m 1 <merge-commit-hash>
git push origin main

# Option 4: Hard reset (destructive)
git reset --hard v1.0.0
git push --force origin main
```

To undo database migration:
```sql
ALTER TABLE programs DROP COLUMN created_by_user_id;
ALTER TABLE programs DROP COLUMN is_template;
ALTER TABLE programs DROP COLUMN linked_template_id;
DROP TABLE workout_feedback;
UPDATE schema_version SET version = 1;
```

---

## Success Criteria

✅ Trainer can generate invite codes
✅ Client can connect via invite code
✅ Trainer sees connected clients in dashboard
✅ Trainer can create templates
✅ Trainer can assign templates to clients
✅ Client sees assigned programs (read-only)
✅ Client can start workouts from assigned programs
✅ Either party can disconnect
✅ No breaking changes to v1.0.0 features
✅ Firestore rules enforce security
✅ Database migration runs successfully

---

## Deployment Checklist

Before merging to main:

- [ ] All manual tests pass
- [ ] No console errors in browser DevTools
- [ ] Firestore rules deployed (`firebase deploy --only firestore:rules`)
- [ ] Database migration tested (v1 → v2)
- [ ] Rollback tested (can return to v1.0.0)
- [ ] Documentation complete (this file + README update)
- [ ] Version bumped to 1.1.0 in package.json
- [ ] Git tag created: `git tag v1.1.0`
