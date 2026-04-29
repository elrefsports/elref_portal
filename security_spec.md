# Security Specification - Elref Talent Foundation

## 1. Data Invariants
- A registration must have a valid program, student name, and parent contact.
- Registration status can only be transitioned between predefined states: 'pending', 'contacted', 'enrolled', 'completed'.
- Admin logs are immutable once created.
- Only the verified admin (elrefops@gmail.com) can read registration data or contact messages.

## 2. The Dirty Dozen Payloads

### Registrations (Collection: `registrations`)
1. **Unauthorized Read**: Attempt to list registrations as a non-admin user.
2. **Anonymous Create**: Attempt to create a registration without `createdAt` being server timestamp.
3. **Identity Spoofing**: Attempt to update a registration's `studentName` after creation.
4. **Invalid Status**: Attempt to set status to 'hacked'.
5. **Path Poisoning**: Attempt to create a document with a 2KB ID.
6. **Shadow Fields**: Attempt to create a registration with an extra `isVerified: true` field.

### Messages (Collection: `messages`)
7. **Unauthorized List**: Attempt to read messages as a regular user.
8. **Malicious Payload**: Attempt to send a 1MB message string.
9. **Timestamp Cheat**: Attempt to set `createdAt` to a future date.

### Admin Logs (Collection: `adminLogs`)
10. **Global Write**: Attempt to delete admin logs as a non-admin.
11. **Self-Promotion**: An attacker trying to log a "success" via a script without actually being the admin.
12. **Bulk Extraction**: Attempt to query admin logs without authentication.

## 3. Test Runner (Conceptual/Draft)

```typescript
// firestore.rules.test.ts
// This file simulates the "Dirty Dozen" tests.

import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

const ADMIN_AUTH = { uid: 'admin-123', email: 'elrefops@gmail.com', email_verified: true };
const USER_AUTH = { uid: 'user-456', email: 'user@example.com', email_verified: true };

// ... Test setup ...

// Example Test 1: Unauthorized Read
await assertFails(userDb.collection('registrations').get());

// Example Test 4: Invalid Status
await assertFails(adminDb.collection('registrations').add({ ..., status: 'hacked' }));

// Example Test 8: Malicious Payload (Size limit)
await assertFails(db.collection('messages').add({ ..., message: 'a'.repeat(2001) }));
```
