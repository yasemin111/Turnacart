/**
 * Dirty Dozen Security Spec Verification Cases for firestore.rules
 * Documents the 12 adversarial payloads blocked by the Eight Pillars ruleset.
 */
export const DIRTY_DOZEN_SECURITY_CASES = [
  { name: 'Shadow Field Injection', path: 'learners/userA', payload: { isAdmin: true }, expected: 'PERMISSION_DENIED' },
  { name: 'Identity Spoofing', path: 'learners/userA', payload: { uid: 'userB' }, expected: 'PERMISSION_DENIED' },
  { name: 'Unverified Email Write', auth: { uid: 'userA', email_verified: false }, expected: 'PERMISSION_DENIED' },
  { name: 'Client Timestamp Forgery', path: 'learners/userA', payload: { createdAt: '2020-01-01T00:00:00Z' }, expected: 'PERMISSION_DENIED' },
  { name: 'Immutable FriendCode Mutation', path: 'learners/userA', payload: { friendCode: 'HACK-123' }, expected: 'PERMISSION_DENIED' },
  { name: 'Negative XP Overflow', path: 'learners/userA', payload: { xp: -50 }, expected: 'PERMISSION_DENIED' },
  { name: 'PII Leak Attempt', path: 'users/userB/private/info', auth: { uid: 'userA' }, expected: 'PERMISSION_DENIED' },
  { name: 'Friend Code Scraping', operation: 'list', path: 'friendCodes', expected: 'PERMISSION_DENIED' },
  { name: 'Learner Directory Scraping', operation: 'list', path: 'learners', expected: 'PERMISSION_DENIED' },
  { name: 'Orphan Friend Edge', path: 'users/userA/friends/missing_uid', expected: 'PERMISSION_DENIED' },
  { name: 'Self-Friending', path: 'users/userA/friends/userA', expected: 'PERMISSION_DENIED' },
  { name: 'Unsolicited Nudge Spam', path: 'learners/userB/nudges/n1', expected: 'PERMISSION_DENIED' },
] as const;
