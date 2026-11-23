/**
 * Security Rules Verification Spec (Dirty Dozen Adversarial Suite)
 * Documents expected PERMISSION_DENIED outcomes against firestore.rules.
 */
export const DIRTY_DOZEN_CASES = [
  { name: '1. Self-Balance Injection', path: '/users/p1', op: 'update', payload: { walletBalance: 99999 }, expected: 'PERMISSION_DENIED' },
  { name: '2. Role Escalation', path: '/users/p1', op: 'create', payload: { role: 'admin' }, expected: 'PERMISSION_DENIED' },
  { name: '3. Unapproved Room Snooping', path: '/tournaments/t1/room_secrets/details', op: 'get', expected: 'PERMISSION_DENIED' },
  { name: '4. Early Room Snooping', path: '/tournaments/t1/room_secrets/details', op: 'get', expected: 'PERMISSION_DENIED' },
  { name: '5. Self-Approve Payment', path: '/registrations/t1_p1', op: 'create', payload: { paymentStatus: 'Approved', slotConfirmed: true }, expected: 'PERMISSION_DENIED' },
  { name: '6. Duplicate UTR Replay', path: '/used_utrs/UTR123456', op: 'create', expected: 'PERMISSION_DENIED' },
  { name: '7. Orphan Registration Without UTR Lock', path: '/registrations/t1_p1', op: 'create', expected: 'PERMISSION_DENIED' },
  { name: '8. Fake Kill Credit', path: '/kill_claims/t1_p1', op: 'create', payload: { status: 'Approved', totalReward: 350 }, expected: 'PERMISSION_DENIED' },
  { name: '9. Wallet Ledger Forgery', path: '/wallet_transactions/tx1', op: 'create', expected: 'PERMISSION_DENIED' },
  { name: '10. Over-Balance Withdrawal', path: '/withdrawals/w1', op: 'create', payload: { amount: 9999 }, expected: 'PERMISSION_DENIED' },
  { name: '11. PII Scraping on /users', path: '/users/p2', op: 'get', expected: 'PERMISSION_DENIED' },
  { name: '12. Shadow Field Injection', path: '/players_public/p1', op: 'update', payload: { isBanned: false, totalKills: 999 }, expected: 'PERMISSION_DENIED' },
] as const;
