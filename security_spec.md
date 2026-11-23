# Vynorix Solo Tournament — Firestore Security Specification (Phase 0)

## Data Invariants
1. **No Self-Credited Balances**: Players can never modify `walletBalance`, `totalEarnings`, `totalKillRewards`, `totalWithdrawals`, `pendingWithdrawals`, `role`, or `isBanned` on `/users/{userId}`.
2. **No Unapproved Room Access**: `/tournaments/{tournamentId}/room_secrets/{secretId}` is strictly unreadable unless the caller is an Admin OR holds a verified registration (`/registrations/{tournamentId}_{uid}` with `paymentStatus == 'Approved'` and `slotConfirmed == true`) AND the release time has arrived (`tournament.status in ['Room Details Released', 'Live', 'Completed']` or `request.time >= resource.data.releaseTimestamp`).
3. **No Duplicate Registrations or UTRs**: Registration IDs must equal `${tournamentId}_${uid}`, and creation atomically requires `existsAfter(/used_utrs/${utrNumber})`, where `used_utrs` fails if the UTR already exists.
4. **No Duplicate Withdrawals or Over-Withdrawal**: Withdrawal creation requires `amount >= 50`, `amount <= user.walletBalance`, `!exists(/active_withdrawals/${uid})`, and `existsAfter(/active_withdrawals/${uid})`.
5. **No Unverified Kill Credits**: Players can only create `kill_claims` with `status == 'Pending'`, `verifiedKills == 0`, `totalReward == 0`, and only if they have an approved registration for that tournament. Only Admin can approve kills and write `/wallet_transactions`.
6. **PII Isolation**: Private user records (`/users/{uid}`) and `registrations`, `withdrawals`, `kill_claims`, `notifications`, `wallet_transactions`, `support_tickets` are readable only by the owning user or an Admin.

## The "Dirty Dozen" Attack Payloads
1. **Self-Balance Injection**: Player updates `/users/{uid}` with `{ walletBalance: 99999 }`. -> `PERMISSION_DENIED`.
2. **Role Escalation**: Player creates `/users/{uid}` with `{ role: 'admin' }` or updates `role` to `'admin'`. -> `PERMISSION_DENIED`.
3. **Unapproved Room Snooping**: Unregistered or pending player calls `get` on `/tournaments/t1/room_secrets/details`. -> `PERMISSION_DENIED`.
4. **Early Room Snooping**: Approved player calls `get` on `/tournaments/t1/room_secrets/details` before release time and while status is `Registration Closed`. -> `PERMISSION_DENIED`.
5. **Self-Approve Payment**: Player creates `/registrations/t1_uid` with `paymentStatus: 'Approved'` or updates `paymentStatus`. -> `PERMISSION_DENIED`.
6. **Duplicate UTR Replay**: Player submits an already-used UTR in `/used_utrs/{utr}`. -> `PERMISSION_DENIED`.
7. **Orphan Registration Without UTR Lock**: Player creates `/registrations/t1_uid` without writing `/used_utrs/{utr}` in the same batch. -> `PERMISSION_DENIED`.
8. **Fake Kill Credit**: Player creates `/kill_claims/t1_uid` with `status: 'Approved', totalReward: 700`. -> `PERMISSION_DENIED`.
9. **Wallet Ledger Forgery**: Player writes directly to `/wallet_transactions/{txId}`. -> `PERMISSION_DENIED`.
10. **Below-Minimum / Over-Balance Withdrawal**: Player creates `/withdrawals/{id}` with `amount: 10` or `amount: 5000` when balance is `100`. -> `PERMISSION_DENIED`.
11. **PII Scraping**: Signed-in player runs `list` on `/users` or `get` on `/users/otherUid`. -> `PERMISSION_DENIED`.
12. **Shadow Field / Oversized ID Poisoning**: Attacker injects extra `isVerified: true` field or 1500-char document ID. -> `PERMISSION_DENIED`.
