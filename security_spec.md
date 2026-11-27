# Security Specification — El Sihri Firestore Rules

## Data Invariants
1. **PII Isolation**: User email addresses reside exclusively under `/users/{userId}/private/info` and can only be read or written by `request.auth.uid == userId`.
2. **Learner Profile Integrity**: A learner profile at `/learners/{userId}` can only be created or updated by its verified owner (`uid == userId == request.auth.uid`), with immutable `uid`, `friendCode`, and `createdAt`.
3. **Friend Lookup Privacy**: `/friendCodes/{code}` supports single-document `get` by signed-in verified users only (`allow list: if false`), preventing full user enumeration.
4. **Friend Edge Referential Integrity**: Adding a friend under `/users/{userId}/friends/{friendUid}` requires the target `/learners/{friendUid}` document to exist and `friendUid != userId`.
5. **Co-Learning Nudge Authorization**: Sending a nudge under `/learners/{learnerId}/nudges/{nudgeId}` requires the sender to have already added `learnerId` as a friend and strictly locks `fromUid == request.auth.uid`.

## The Dirty Dozen Attack Payloads
1. **Shadow Field Injection** on `/learners/{uid}`: `{ ..., isAdmin: true }` -> Rejected by `hasOnly(...)`.
2. **Identity Spoofing** on `/learners/{uid}`: `{ uid: "victim_uid", ... }` -> Rejected by `data.uid == request.auth.uid && uid == userId`.
3. **Unverified Email Write**: Auth token with `email_verified: false` -> Rejected by `isEmailVerified()`.
4. **Client Timestamp Forgery**: `{ createdAt: "2020-01-01T00:00:00Z" }` -> Rejected by `incoming().createdAt == request.time`.
5. **Immutable Field Mutation**: Updating `friendCode` or `createdAt` on `/learners/{uid}` -> Rejected by `affectedKeys().hasOnly(...)` and immutability gate.
6. **Negative / Overflow XP**: `{ xp: -50 }` or `{ xp: 999999999 }` -> Rejected by `0 <= xp <= 10000000`.
7. **PII Leak Attempt**: Signed-in non-owner reading `/users/{victim}/private/info` -> Rejected by `isOwner(userId)`.
8. **Friend Code Scraping**: `list` query on `/friendCodes` -> Rejected by `allow list: if false`.
9. **Learner Directory Scraping**: `list` query on `/learners` without `where('uid', '==', auth.uid)` -> Rejected by `resource.data.uid == request.auth.uid`.
10. **Orphan Friend Edge**: Creating `/users/{uid}/friends/nonexistent_uid` -> Rejected by `exists(/databases/$(database)/documents/learners/$(friendUid))`.
11. **Self-Friending**: Creating `/users/{uid}/friends/{uid}` -> Rejected by `friendUid != userId`.
12. **Nudge Spoofing / Unsolicited Spam**: Creating `/learners/{victim}/nudges/{id}` without being friends or spoofing `fromUid` -> Rejected by `fromUid == request.auth.uid` and `exists(.../friends/$(learnerId))`.
