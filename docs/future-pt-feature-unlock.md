# PT Feature Unlock System (Future Enhancement)
**Status:** Planned, Not Yet Implemented  
**Priority:** Medium (before public PT rollout)  
**Estimated Effort:** 1-2 hours

## Rationale

Currently, PT features (trainer dashboard, client connections, program assignments) are available to all users who toggle "I am a PT" in settings. This is fine for beta testing, but poses issues for production:

1. **No monetization path** - Can't charge for PT features
2. **No usage control** - Can't limit who accesses PT features
3. **Hard to add later** - Retroactively locking features feels bad to users
4. **No rollback** - If abuse occurs, can't disable individual users

## Proposed Solution: Unlock Code System

### User Flow

**Without Code:**
- Settings screen: "I am a PT" toggle is hidden or disabled
- Button: "Unlock PT Features" → opens code input modal

**With Valid Code:**
- User enters code (e.g., "PT-ABC123")
- Code validated against Firestore
- User document updated: `ptUnlocked: true`
- "I am a PT" toggle now visible in settings
- Badge: "PT Features Active ✓"

**Code Expiry/Revocation:**
- Admin (you) can deactivate codes in Firestore
- App checks code validity periodically
- If code revoked: user loses PT access, data preserved

### Technical Implementation

#### 1. Firestore Collection: `pt_unlock_codes`

```javascript
{
  code: "PT-ABC123",           // 6-8 character code
  isActive: true,              // Can be deactivated
  expiresAt: Timestamp,        // Optional expiry date
  maxUses: 1,                  // Single-use (1) or unlimited (999)
  usedBy: ["userId1"],         // Array of user IDs who redeemed
  createdAt: Timestamp,
  createdBy: "admin",
  notes: "Beta tester - John"  // For tracking
}
```

#### 2. User Document Update: `users/{userId}`

```javascript
{
  // ... existing fields
  ptUnlocked: true,
  ptUnlockCode: "PT-ABC123",   // Which code was used
  ptUnlockedAt: Timestamp,
  ptFeatureExpiry: Timestamp   // Optional, for subscriptions
}
```

#### 3. New Service: `src/services/ptUnlock.js`

```javascript
export async function validateUnlockCode(code) {
  // Query pt_unlock_codes where code === code
  // Check isActive, expiresAt, maxUses
  // Return { valid: boolean, message: string }
}

export async function redeemUnlockCode(userId, userName, code) {
  // Validate code
  // Check if user already used it (if maxUses === 1)
  // Update user document
  // Add userId to code.usedBy array
  // Return success/error
}

export async function checkPTFeatureAccess(userId) {
  // Check user.ptUnlocked
  // Check user.ptFeatureExpiry (if exists)
  // Check if code still active
  // Return { hasAccess: boolean, reason: string }
}
```

#### 4. New Component: `src/components/PTUnlockModal.js`

Similar to `InviteCodeInput` component:
- Text input for code
- "Unlock" button
- Loading state
- Success/error messages
- Link to "Why do I need a code?" explanation

#### 5. Settings Screen Changes: `src/screens/SettingsScreen.js`

```javascript
// Existing toggle
<Switch
  value={isPT}
  onValueChange={setIsPT}
  disabled={!user.ptUnlocked}  // ← Disable if not unlocked
/>

// New unlock section (if not unlocked)
{!user.ptUnlocked && (
  <View>
    <Text>Unlock PT Features to access trainer dashboard</Text>
    <Button onPress={() => setShowUnlockModal(true)}>
      Enter Unlock Code
    </Button>
  </View>
)}

// Badge (if unlocked)
{user.ptUnlocked && (
  <Text style={styles.badge}>PT Features Active ✓</Text>
)}
```

#### 6. Security Rules: `firestore.rules`

```javascript
// PT Unlock Codes
match /pt_unlock_codes/{codeId} {
  // Anyone can read to validate codes
  allow read: if isSignedIn();
  
  // Only admin can create/update/delete
  allow write: if false;  // Managed via Firebase Console or Cloud Function
}

// User updates (existing, modify to allow PT unlock)
match /users/{userId} {
  allow update: if isOwner(userId) && (
    // Existing allowed updates...
    request.resource.data.diff(resource.data).affectedKeys()
      .hasOnly(['ptUnlocked', 'ptUnlockCode', 'ptUnlockedAt', ...otherFields])
  );
}
```

#### 7. Code Generator Script: `scripts/generatePTCode.js`

```javascript
#!/usr/bin/env node
import admin from 'firebase-admin';

// Usage: node scripts/generatePTCode.js --count 10 --note "Beta testers"

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'PT-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function createCodes(count, notes) {
  for (let i = 0; i < count; i++) {
    const code = generateCode();
    await admin.firestore().collection('pt_unlock_codes').doc(code).set({
      code,
      isActive: true,
      expiresAt: null,
      maxUses: 1,
      usedBy: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      notes,
    });
    console.log(`Created: ${code}`);
  }
}
```

### Migration Path to Paid Subscriptions

This unlock system is a stepping stone to full subscriptions:

**Phase 1:** Manual codes (current proposal)
- You generate codes manually
- Give to beta testers / early customers
- Track usage in Firestore

**Phase 2:** Stripe Integration
- Add Stripe payment
- Generate code automatically after payment
- Store subscription info in user doc

**Phase 3:** Full Subscription System
- Recurring billing (Stripe or RevenueCat)
- Auto-renewal
- Subscription tiers (Basic PT, Pro PT, etc.)
- Feature gates based on tier

**Migration:**
```javascript
// Phase 1 → Phase 2
{
  ptUnlocked: true,
  ptUnlockCode: "PT-ABC123",  // ← Legacy code
  ptSubscriptionId: "sub_123",  // ← New Stripe subscription
  ptSubscriptionStatus: "active",
  ptSubscriptionTier: "pro"
}
```

### Security Considerations

**Client-Side Validation:**
- Current implementation is client-side only
- Determined user could bypass in React DevTools
- Fine for side project, not for high-stakes production

**Server-Side Validation (Future):**
- Cloud Function: validatePTAccess(userId)
- Called before PT features load
- Returns { allowed: boolean, reason: string }
- Can't be bypassed

**Code Leaking:**
- If code shared publicly, revoke it in Firestore
- If maxUses === 1, second user can't use it
- Track usedBy array to see who redeemed

**Fraud Prevention:**
- Limit code checks per user (rate limiting)
- Log all redemption attempts
- Alert if suspicious activity (many failed attempts)

### Testing Checklist

- [ ] Generate 5 test codes
- [ ] Redeem code successfully
- [ ] Try invalid code (shows error)
- [ ] Try expired code (shows error)
- [ ] Try code twice (maxUses === 1, shows error)
- [ ] Toggle "I am a PT" (only works if unlocked)
- [ ] Deactivate code, check user loses access
- [ ] Test on web and native

### Alternative Approaches Considered

**1. Email Whitelist**
- Pro: Simple, no code needed
- Con: No monetization path, manual management

**2. Payment Required (Stripe)**
- Pro: Direct monetization
- Con: More complex, requires business entity

**3. Invite-Only (Admin Approval)**
- Pro: Full control
- Con: Manual bottleneck, doesn't scale

**4. Feature Flags (LaunchDarkly)**
- Pro: A/B testing, gradual rollout
- Con: Another service, overkill for side project

**Why Unlock Codes?**
- Simple to implement (1-2 hours)
- Easy to manage (Firestore Console)
- Scales to thousands of users
- Clear migration path to paid subscriptions
- Familiar UX (like app unlock codes)

### Pricing Strategy (Future)

**Option A: One-Time Unlock**
- $29 one-time payment
- Lifetime PT features access
- Pro: Simple, no recurring billing
- Con: No recurring revenue

**Option B: Subscription**
- $9.99/month or $89/year
- PT features + future enhancements
- Pro: Recurring revenue, sustainable
- Con: Monthly billing complexity

**Option C: Freemium**
- Basic PT features: Free
- Advanced features: $19/month
  - Unlimited clients
  - Advanced analytics
  - Workout feedback
  - In-app messaging

### When to Implement

**Now (Before Public Rollout):**
- If you plan to charge for PT features
- If you want usage control
- If you're beta testing with specific users

**Later (After Validation):**
- If PT features stay free forever
- If you have only 1-2 PT users (friends/family)
- If you want max adoption first, monetize later

### Recommendation

**Implement before expanding PT user base** (before you have >10 PT users). It's much easier to add now than to retroactively lock features from existing users.

---

## Quick Start (When Ready to Implement)

1. Create `pt_unlock_codes` collection in Firestore
2. Add 5 test codes manually via Console
3. Build `PTUnlockModal` component
4. Update `SettingsScreen` to check `user.ptUnlocked`
5. Test with one code
6. Generate more codes as needed

Total time: ~90 minutes
