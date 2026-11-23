import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { DEFAULT_SETTINGS, OWNER_EMAIL } from '../lib/constants';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import type {
  Announcement,
  KillClaim,
  NotificationCategory,
  PlatformSettings,
  PlayerPublic,
  Registration,
  RoomSecret,
  SupportTicket,
  TicketCategory,
  TicketStatus,
  Tournament,
  TournamentResult,
  UserPrivate,
  Withdrawal,
} from '../types/vynorix';

function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}_${Date.now()}_${rand}`;
}

export function generatePlayerCode(uid: string): string {
  const clean = uid.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const suffix = (clean + 'VYNORIX').slice(0, 6);
  return `VYN-${suffix}`;
}

export function normalizeUtr(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9\-_]/g, '');
}

// ---------------------------------------------------------------------------
// Player Profile & Onboarding
// ---------------------------------------------------------------------------
export async function createPlayerProfile(params: {
  uid: string;
  email?: string;
  phone?: string;
  ign: string;
  ffUid: string;
  avatarUrl?: string;
}): Promise<void> {
  const { uid, email, phone, ign, ffUid, avatarUrl } = params;
  const playerCode = generatePlayerCode(uid);
  const batch = writeBatch(db);

  const userRef = doc(db, 'users', uid);
  const publicRef = doc(db, 'players_public', uid);

  const userDoc: Record<string, unknown> = {
    uid,
    playerCode,
    ign: ign.trim(),
    ffUid: ffUid.trim(),
    walletBalance: 0,
    totalEarnings: 0,
    totalKillRewards: 0,
    totalWithdrawals: 0,
    pendingWithdrawals: 0,
    isBanned: false,
    role: 'player',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (email) userDoc.email = email;
  if (phone) userDoc.phone = phone;
  if (avatarUrl) userDoc.avatarUrl = avatarUrl;

  const publicDoc: Record<string, unknown> = {
    uid,
    playerCode,
    ign: ign.trim(),
    ffUid: ffUid.trim(),
    totalKills: 0,
    totalEarnings: 0,
    matchesPlayed: 0,
    booyahs: 0,
    isBanned: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (avatarUrl) publicDoc.avatarUrl = avatarUrl;

  batch.set(userRef, userDoc);
  batch.set(publicRef, publicDoc);

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `users/${uid}`);
  }
}

export async function updatePlayerProfile(
  uid: string,
  updates: { ign: string; ffUid: string; phone?: string; avatarUrl?: string }
): Promise<void> {
  const batch = writeBatch(db);
  const userRef = doc(db, 'users', uid);
  const publicRef = doc(db, 'players_public', uid);

  const userPayload: Record<string, unknown> = {
    ign: updates.ign.trim(),
    ffUid: updates.ffUid.trim(),
    updatedAt: serverTimestamp(),
  };
  if (updates.phone !== undefined) userPayload.phone = updates.phone.trim();
  if (updates.avatarUrl !== undefined) userPayload.avatarUrl = updates.avatarUrl;

  const publicPayload: Record<string, unknown> = {
    ign: updates.ign.trim(),
    ffUid: updates.ffUid.trim(),
    updatedAt: serverTimestamp(),
  };
  if (updates.avatarUrl !== undefined) publicPayload.avatarUrl = updates.avatarUrl;

  batch.update(userRef, userPayload);
  batch.update(publicRef, publicPayload);

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
  }
}

// ---------------------------------------------------------------------------
// Tournament Registration & Manual UPI Payment
// ---------------------------------------------------------------------------
export async function submitTournamentPayment(params: {
  tournament: Tournament;
  profile: UserPrivate;
  utrNumber: string;
  screenshotData: string;
}): Promise<void> {
  const { tournament, profile, screenshotData } = params;
  const utr = normalizeUtr(params.utrNumber);
  if (utr.length < 6 || utr.length > 40) {
    throw new Error('UTR / Reference number must be 6 to 40 alphanumeric characters.');
  }

  const regId = `${tournament.id}_${profile.uid}`;
  const utrRef = doc(db, 'used_utrs', utr);
  const regRef = doc(db, 'registrations', regId);

  const [existingUtr, existingReg] = await Promise.all([getDoc(utrRef), getDoc(regRef)]);
  if (existingUtr.exists()) {
    throw new Error('This UTR / Reference number has already been submitted. Duplicate UTRs are blocked.');
  }

  const isResubmit = existingReg.exists() && existingReg.data()?.paymentStatus === 'Rejected';
  if (existingReg.exists() && !isResubmit) {
    throw new Error('You already have an active or pending registration for this tournament.');
  }

  const batch = writeBatch(db);
  if (isResubmit) {
    batch.update(regRef, {
      utrNumber: utr,
      screenshotData,
      paymentStatus: 'Pending',
      slotConfirmed: false,
      rejectionReason: '',
      updatedAt: serverTimestamp(),
    });
  } else {
    batch.set(regRef, {
      id: regId,
      tournamentId: tournament.id,
      tournamentTitle: tournament.title,
      userId: profile.uid,
      playerCode: profile.playerCode,
      ign: profile.ign,
      ffUid: profile.ffUid,
      entryFee: tournament.entryFee,
      utrNumber: utr,
      screenshotData,
      paymentStatus: 'Pending',
      slotConfirmed: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  batch.set(utrRef, {
    utrNumber: utr,
    userId: profile.uid,
    registrationId: regId,
    createdAt: serverTimestamp(),
  });

  const notifId = makeId('notif');
  batch.set(doc(db, 'notifications', notifId), {
    id: notifId,
    userId: profile.uid,
    title: 'Registration Submitted',
    message: `Your ₹${tournament.entryFee} payment (UTR: ${utr}) for ${tournament.title} is pending admin verification.`,
    category: 'registration' as NotificationCategory,
    isRead: false,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `registrations/${regId}`);
  }
}

// ---------------------------------------------------------------------------
// Custom Room Secrets (Rule-Gated)
// ---------------------------------------------------------------------------
export async function fetchRoomSecret(tournamentId: string): Promise<RoomSecret | null> {
  const secretRef = doc(db, 'tournaments', tournamentId, 'room_secrets', 'details');
  try {
    const snap = await getDoc(secretRef);
    if (!snap.exists()) return null;
    return snap.data() as RoomSecret;
  } catch {
    // Permission denied means either unapproved player or before release time
    return null;
  }
}

// ---------------------------------------------------------------------------
// Kill Verification Claim
// ---------------------------------------------------------------------------
export async function submitKillClaim(params: {
  tournament: Tournament;
  profile: UserPrivate;
  claimedKills: number;
  screenshotData: string;
  notes?: string;
}): Promise<void> {
  const { tournament, profile, claimedKills, screenshotData, notes } = params;
  const claimId = `${tournament.id}_${profile.uid}`;
  const claimRef = doc(db, 'kill_claims', claimId);
  const existing = await getDoc(claimRef);

  if (existing.exists() && existing.data()?.status !== 'Rejected') {
    throw new Error('You have already submitted a kill claim for this match.');
  }

  try {
    if (existing.exists() && existing.data()?.status === 'Rejected') {
      await updateDoc(claimRef, {
        claimedKills,
        screenshotData,
        notes: (notes || '').trim().slice(0, 300),
        status: 'Pending',
        verifiedKills: 0,
        totalReward: 0,
        rejectionReason: '',
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(claimRef, {
        id: claimId,
        tournamentId: tournament.id,
        tournamentTitle: tournament.title,
        userId: profile.uid,
        playerCode: profile.playerCode,
        ign: profile.ign,
        ffUid: profile.ffUid,
        claimedKills,
        verifiedKills: 0,
        perKillReward: tournament.perKillReward,
        totalReward: 0,
        screenshotData,
        notes: (notes || '').trim().slice(0, 300),
        status: 'Pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `kill_claims/${claimId}`);
  }
}

// ---------------------------------------------------------------------------
// Withdrawals
// ---------------------------------------------------------------------------
export async function requestWithdrawal(params: {
  profile: UserPrivate;
  amount: number;
  upiId: string;
  minWithdrawal: number;
}): Promise<void> {
  const { profile, amount, upiId, minWithdrawal } = params;
  const cleanUpi = upiId.trim();
  if (cleanUpi.length < 4 || !cleanUpi.includes('@')) {
    throw new Error('Please enter a valid UPI ID (e.g., player@oksbi or 9876543210@ybl).');
  }
  if (amount < minWithdrawal) {
    throw new Error(`Minimum withdrawal amount is ₹${minWithdrawal}.`);
  }
  if (amount > profile.walletBalance) {
    throw new Error('Requested amount exceeds your available wallet balance.');
  }

  const lockRef = doc(db, 'active_withdrawals', profile.uid);
  const lockSnap = await getDoc(lockRef);
  if (lockSnap.exists()) {
    throw new Error('You already have a pending withdrawal request. Wait for it to be processed.');
  }

  const withdrawalId = makeId('wdr');
  const batch = writeBatch(db);
  batch.set(doc(db, 'withdrawals', withdrawalId), {
    id: withdrawalId,
    userId: profile.uid,
    playerCode: profile.playerCode,
    ign: profile.ign,
    amount,
    upiId: cleanUpi,
    status: 'Pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(lockRef, {
    userId: profile.uid,
    withdrawalId,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `withdrawals/${withdrawalId}`);
  }
}

// ---------------------------------------------------------------------------
// Notifications & Support Tickets
// ---------------------------------------------------------------------------
export async function markNotificationRead(notifId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', notifId), { isRead: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `notifications/${notifId}`);
  }
}

export async function markAllNotificationsRead(notifIds: string[]): Promise<void> {
  if (notifIds.length === 0) return;
  const batch = writeBatch(db);
  for (const id of notifIds) {
    batch.update(doc(db, 'notifications', id), { isRead: true });
  }
  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'notifications');
  }
}

export async function submitSupportTicket(params: {
  profile: UserPrivate;
  category: TicketCategory;
  subject: string;
  description: string;
  tournamentId?: string;
  evidenceData?: string;
}): Promise<void> {
  const id = makeId('tkt');
  const payload: Record<string, unknown> = {
    id,
    userId: params.profile.uid,
    playerCode: params.profile.playerCode,
    ign: params.profile.ign,
    category: params.category,
    subject: params.subject.trim().slice(0, 120),
    description: params.description.trim().slice(0, 1000),
    status: 'Open',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (params.tournamentId) payload.tournamentId = params.tournamentId;
  if (params.evidenceData) payload.evidenceData = params.evidenceData;

  try {
    await setDoc(doc(db, 'support_tickets', id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `support_tickets/${id}`);
  }
}

// ---------------------------------------------------------------------------
// ADMIN-ONLY OPERATIONS
// ---------------------------------------------------------------------------
function requireAdminIdentity(): { uid: string; email: string } {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required.');
  return { uid: user.uid, email: user.email || OWNER_EMAIL };
}

export async function savePlatformSettings(
  settings: Omit<PlatformSettings, 'updatedAt'>
): Promise<void> {
  requireAdminIdentity();
  try {
    await setDoc(doc(db, 'settings', 'platform'), {
      ...settings,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/platform');
  }
}

export async function ensureInitialPlatformSettings(): Promise<void> {
  const ref = doc(db, 'settings', 'platform');
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      ...DEFAULT_SETTINGS,
      updatedAt: serverTimestamp(),
    });
  }
}

export async function saveTournament(
  data: Omit<Tournament, 'id' | 'filledSlots' | 'resultsPublished' | 'createdBy' | 'createdAt' | 'updatedAt'>,
  existingTournament?: Tournament
): Promise<string> {
  const admin = requireAdminIdentity();
  const id = existingTournament ? existingTournament.id : makeId('trn');
  const ref = doc(db, 'tournaments', id);

  try {
    if (existingTournament) {
      await updateDoc(ref, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ...data,
        id,
        filledSlots: 0,
        resultsPublished: false,
        createdBy: admin.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `tournaments/${id}`);
  }
}

export async function deleteTournament(tournamentId: string): Promise<void> {
  requireAdminIdentity();
  try {
    await deleteDoc(doc(db, 'tournaments', tournamentId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `tournaments/${tournamentId}`);
  }
}

export async function saveRoomCredentials(params: {
  tournament: Tournament;
  roomId: string;
  roomPassword: string;
  matchDate: string;
  matchTime: string;
  mapName: string;
  mode: string;
  maxPlayers: number;
  releaseDateTimeIso: string;
  releaseImmediately: boolean;
}): Promise<void> {
  const admin = requireAdminIdentity();
  const releaseDate = new Date(params.releaseDateTimeIso);
  const releaseTs = Timestamp.fromDate(
    Number.isNaN(releaseDate.getTime()) ? new Date() : releaseDate
  );

  const batch = writeBatch(db);
  const secretRef = doc(db, 'tournaments', params.tournament.id, 'room_secrets', 'details');
  batch.set(secretRef, {
    tournamentId: params.tournament.id,
    roomId: params.roomId.trim(),
    roomPassword: params.roomPassword.trim(),
    matchDate: params.matchDate.trim(),
    matchTime: params.matchTime.trim(),
    mapName: params.mapName.trim(),
    mode: params.mode.trim(),
    maxPlayers: params.maxPlayers,
    releaseTimestamp: releaseTs,
    updatedAt: serverTimestamp(),
  });

  if (params.releaseImmediately) {
    batch.update(doc(db, 'tournaments', params.tournament.id), {
      status: 'Room Details Released',
      roomReleaseTime: params.releaseDateTimeIso,
      updatedAt: serverTimestamp(),
    });
    const annId = makeId('ann');
    batch.set(doc(db, 'announcements', annId), {
      id: annId,
      title: `Room Released: ${params.tournament.title}`,
      message: `Custom Room ID & Password are now unlocked for approved players. Check the Custom Room tab before match start at ${params.matchTime}.`,
      tournamentId: params.tournament.id,
      type: 'room_release',
      createdBy: admin.uid,
      createdAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
    if (params.releaseImmediately) {
      await notifyTournamentApprovedPlayers(
        params.tournament.id,
        'Room Details Released!',
        `Room ID & Password for ${params.tournament.title} are now live in the Custom Room tab.`,
        'room'
      );
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `tournaments/${params.tournament.id}/room_secrets/details`);
  }
}

async function notifyTournamentApprovedPlayers(
  tournamentId: string,
  title: string,
  message: string,
  category: NotificationCategory
): Promise<void> {
  const q = query(
    collection(db, 'registrations'),
    where('tournamentId', '==', tournamentId),
    where('paymentStatus', '==', 'Approved')
  );
  const snap = await getDocs(q);
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    const reg = d.data() as Registration;
    const notifId = makeId('notif');
    batch.set(doc(db, 'notifications', notifId), {
      id: notifId,
      userId: reg.userId,
      title,
      message,
      category,
      isRead: false,
      createdAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

export async function approvePaymentRegistration(reg: Registration): Promise<void> {
  const admin = requireAdminIdentity();
  const regRef = doc(db, 'registrations', reg.id);
  const trnRef = doc(db, 'tournaments', reg.tournamentId);

  try {
    await runTransaction(db, async (tx) => {
      const [regSnap, trnSnap] = await Promise.all([tx.get(regRef), tx.get(trnRef)]);
      if (!regSnap.exists()) throw new Error('Registration not found.');
      if (!trnSnap.exists()) throw new Error('Tournament not found.');
      const curReg = regSnap.data() as Registration;
      const curTrn = trnSnap.data() as Tournament;

      if (curReg.paymentStatus === 'Approved') {
        throw new Error('This payment is already approved.');
      }
      if (curTrn.filledSlots >= curTrn.maxSlots) {
        throw new Error('Tournament slots are already full.');
      }

      tx.update(regRef, {
        paymentStatus: 'Approved',
        slotConfirmed: true,
        rejectionReason: '',
        reviewedBy: admin.uid,
        updatedAt: serverTimestamp(),
      });

      tx.update(trnRef, {
        filledSlots: curTrn.filledSlots + 1,
        updatedAt: serverTimestamp(),
      });

      const notifId = makeId('notif');
      tx.set(doc(db, 'notifications', notifId), {
        id: notifId,
        userId: curReg.userId,
        title: 'Payment Approved & Slot Confirmed',
        message: `Your entry for ${curReg.tournamentTitle} (UTR: ${curReg.utrNumber}) is verified. Your slot is confirmed.`,
        category: 'payment',
        isRead: false,
        createdAt: serverTimestamp(),
      });

      const logId = makeId('log');
      tx.set(doc(db, 'audit_logs', logId), {
        id: logId,
        action: 'PAYMENT_APPROVED',
        actorUid: admin.uid,
        actorEmail: admin.email,
        targetUserId: curReg.userId,
        referenceId: curReg.id,
        amount: curReg.entryFee,
        details: `Approved UTR ${curReg.utrNumber} for ${curReg.tournamentTitle}`,
        createdAt: serverTimestamp(),
      });
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `registrations/${reg.id}`);
  }
}

export async function rejectPaymentRegistration(
  reg: Registration,
  reason: string
): Promise<void> {
  const admin = requireAdminIdentity();
  const batch = writeBatch(db);

  batch.update(doc(db, 'registrations', reg.id), {
    paymentStatus: 'Rejected',
    slotConfirmed: false,
    rejectionReason: reason.trim() || 'Payment could not be verified.',
    reviewedBy: admin.uid,
    updatedAt: serverTimestamp(),
  });

  const notifId = makeId('notif');
  batch.set(doc(db, 'notifications', notifId), {
    id: notifId,
    userId: reg.userId,
    title: 'Payment Rejected',
    message: `Your payment for ${reg.tournamentTitle} (UTR: ${reg.utrNumber}) was rejected: ${reason.trim() || 'UTR not received'}. You may resubmit.`,
    category: 'payment',
    isRead: false,
    createdAt: serverTimestamp(),
  });

  const logId = makeId('log');
  batch.set(doc(db, 'audit_logs', logId), {
    id: logId,
    action: 'PAYMENT_REJECTED',
    actorUid: admin.uid,
    actorEmail: admin.email,
    targetUserId: reg.userId,
    referenceId: reg.id,
    amount: reg.entryFee,
    details: `Rejected UTR ${reg.utrNumber}: ${reason.trim()}`,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `registrations/${reg.id}`);
  }
}

export async function approveKillClaim(
  claim: KillClaim,
  verifiedKills: number
): Promise<void> {
  const admin = requireAdminIdentity();
  const claimRef = doc(db, 'kill_claims', claim.id);
  const userRef = doc(db, 'users', claim.userId);
  const pubRef = doc(db, 'players_public', claim.userId);

  try {
    await runTransaction(db, async (tx) => {
      const [claimSnap, userSnap, pubSnap] = await Promise.all([
        tx.get(claimRef),
        tx.get(userRef),
        tx.get(pubRef),
      ]);
      if (!claimSnap.exists()) throw new Error('Kill claim not found.');
      if (!userSnap.exists()) throw new Error('Player account not found.');

      const curClaim = claimSnap.data() as KillClaim;
      const curUser = userSnap.data() as UserPrivate;
      const curPub = pubSnap.exists() ? (pubSnap.data() as PlayerPublic) : null;

      if (curClaim.status === 'Approved') {
        throw new Error('This kill claim has already been approved and credited.');
      }

      const reward = verifiedKills * curClaim.perKillReward;
      const newBalance = curUser.walletBalance + reward;

      tx.update(claimRef, {
        verifiedKills,
        totalReward: reward,
        status: 'Approved',
        rejectionReason: '',
        reviewedBy: admin.uid,
        updatedAt: serverTimestamp(),
      });

      tx.update(userRef, {
        walletBalance: newBalance,
        totalEarnings: curUser.totalEarnings + reward,
        totalKillRewards: curUser.totalKillRewards + reward,
        updatedAt: serverTimestamp(),
      });

      if (curPub) {
        tx.update(pubRef, {
          totalKills: curPub.totalKills + verifiedKills,
          totalEarnings: curPub.totalEarnings + reward,
          updatedAt: serverTimestamp(),
        });
      }

      if (reward > 0) {
        const txId = makeId('wtx');
        tx.set(doc(db, 'wallet_transactions', txId), {
          id: txId,
          txCode: `VTX-${Date.now().toString(36).toUpperCase()}`,
          userId: curClaim.userId,
          type: 'kill_reward',
          direction: 'credit',
          amount: reward,
          balanceAfter: newBalance,
          referenceId: curClaim.id,
          description: `${verifiedKills} verified kills × ₹${curClaim.perKillReward} (${curClaim.tournamentTitle})`,
          createdBy: admin.uid,
          createdAt: serverTimestamp(),
        });
      }

      const notifId = makeId('notif');
      tx.set(doc(db, 'notifications', notifId), {
        id: notifId,
        userId: curClaim.userId,
        title: 'Kill Reward Credited',
        message: `${verifiedKills} kills verified for ${curClaim.tournamentTitle}. ₹${reward} credited to your Vynorix wallet.`,
        category: 'kill_reward',
        isRead: false,
        createdAt: serverTimestamp(),
      });

      const logId = makeId('log');
      tx.set(doc(db, 'audit_logs', logId), {
        id: logId,
        action: 'KILL_CLAIM_APPROVED',
        actorUid: admin.uid,
        actorEmail: admin.email,
        targetUserId: curClaim.userId,
        referenceId: curClaim.id,
        amount: reward,
        details: `Verified ${verifiedKills} kills (${curClaim.claimedKills} claimed) @ ₹${curClaim.perKillReward}/kill`,
        createdAt: serverTimestamp(),
      });
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `kill_claims/${claim.id}`);
  }
}

export async function rejectKillClaim(claim: KillClaim, reason: string): Promise<void> {
  const admin = requireAdminIdentity();
  const batch = writeBatch(db);
  batch.update(doc(db, 'kill_claims', claim.id), {
    status: 'Rejected',
    verifiedKills: 0,
    totalReward: 0,
    rejectionReason: reason.trim() || 'Screenshot proof invalid.',
    reviewedBy: admin.uid,
    updatedAt: serverTimestamp(),
  });

  const notifId = makeId('notif');
  batch.set(doc(db, 'notifications', notifId), {
    id: notifId,
    userId: claim.userId,
    title: 'Kill Claim Rejected',
    message: `Kill proof for ${claim.tournamentTitle} rejected: ${reason.trim() || 'Invalid proof'}.`,
    category: 'kill_reward',
    isRead: false,
    createdAt: serverTimestamp(),
  });

  const logId = makeId('log');
  batch.set(doc(db, 'audit_logs', logId), {
    id: logId,
    action: 'KILL_CLAIM_REJECTED',
    actorUid: admin.uid,
    actorEmail: admin.email,
    targetUserId: claim.userId,
    referenceId: claim.id,
    amount: 0,
    details: `Rejected kill claim: ${reason.trim()}`,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `kill_claims/${claim.id}`);
  }
}

export async function processWithdrawalRequest(params: {
  withdrawal: Withdrawal;
  action: 'Approve' | 'Pay' | 'Reject';
  payoutUtr?: string;
  rejectionReason?: string;
}): Promise<void> {
  const admin = requireAdminIdentity();
  const { withdrawal, action, payoutUtr, rejectionReason } = params;
  const wdrRef = doc(db, 'withdrawals', withdrawal.id);
  const userRef = doc(db, 'users', withdrawal.userId);
  const lockRef = doc(db, 'active_withdrawals', withdrawal.userId);

  try {
    await runTransaction(db, async (tx) => {
      const [wdrSnap, userSnap] = await Promise.all([tx.get(wdrRef), tx.get(userRef)]);
      if (!wdrSnap.exists()) throw new Error('Withdrawal request not found.');
      if (!userSnap.exists()) throw new Error('Player account not found.');

      const curWdr = wdrSnap.data() as Withdrawal;
      const curUser = userSnap.data() as UserPrivate;

      if (curWdr.status === 'Paid') {
        throw new Error('This withdrawal has already been marked Paid. Double payout blocked.');
      }

      if (action === 'Approve') {
        tx.update(wdrRef, {
          status: 'Approved',
          reviewedBy: admin.uid,
          updatedAt: serverTimestamp(),
        });
        const notifId = makeId('notif');
        tx.set(doc(db, 'notifications', notifId), {
          id: notifId,
          userId: curWdr.userId,
          title: 'Withdrawal Approved',
          message: `Your ₹${curWdr.amount} withdrawal to ${curWdr.upiId} is approved and queued for UPI payout.`,
          category: 'withdrawal',
          isRead: false,
          createdAt: serverTimestamp(),
        });
      } else if (action === 'Pay') {
        const cleanUtr = (payoutUtr || '').trim();
        if (cleanUtr.length < 6) {
          throw new Error('Enter the actual UPI payout UTR/reference number before marking Paid.');
        }
        if (curUser.walletBalance < curWdr.amount) {
          throw new Error('Player wallet balance is lower than withdrawal amount.');
        }
        const newBalance = curUser.walletBalance - curWdr.amount;

        tx.update(wdrRef, {
          status: 'Paid',
          payoutUtr: cleanUtr,
          reviewedBy: admin.uid,
          updatedAt: serverTimestamp(),
        });
        tx.update(userRef, {
          walletBalance: newBalance,
          totalWithdrawals: curUser.totalWithdrawals + curWdr.amount,
          updatedAt: serverTimestamp(),
        });
        tx.delete(lockRef);

        const txId = makeId('wtx');
        tx.set(doc(db, 'wallet_transactions', txId), {
          id: txId,
          txCode: `VTX-${Date.now().toString(36).toUpperCase()}`,
          userId: curWdr.userId,
          type: 'withdrawal_paid',
          direction: 'debit',
          amount: curWdr.amount,
          balanceAfter: newBalance,
          referenceId: curWdr.id,
          description: `UPI payout to ${curWdr.upiId} (UTR: ${cleanUtr})`,
          createdBy: admin.uid,
          createdAt: serverTimestamp(),
        });

        const notifId = makeId('notif');
        tx.set(doc(db, 'notifications', notifId), {
          id: notifId,
          userId: curWdr.userId,
          title: 'Withdrawal Paid!',
          message: `₹${curWdr.amount} transferred to ${curWdr.upiId}. Payout UTR: ${cleanUtr}.`,
          category: 'withdrawal',
          isRead: false,
          createdAt: serverTimestamp(),
        });

        const logId = makeId('log');
        tx.set(doc(db, 'audit_logs', logId), {
          id: logId,
          action: 'WITHDRAWAL_PAID',
          actorUid: admin.uid,
          actorEmail: admin.email,
          targetUserId: curWdr.userId,
          referenceId: curWdr.id,
          amount: curWdr.amount,
          details: `Paid ₹${curWdr.amount} to ${curWdr.upiId} (UTR: ${cleanUtr})`,
          createdAt: serverTimestamp(),
        });
      } else if (action === 'Reject') {
        const reason = (rejectionReason || '').trim() || 'Withdrawal request rejected by admin.';
        tx.update(wdrRef, {
          status: 'Rejected',
          rejectionReason: reason,
          reviewedBy: admin.uid,
          updatedAt: serverTimestamp(),
        });
        tx.delete(lockRef);

        const notifId = makeId('notif');
        tx.set(doc(db, 'notifications', notifId), {
          id: notifId,
          userId: curWdr.userId,
          title: 'Withdrawal Rejected',
          message: `Your ₹${curWdr.amount} withdrawal request was rejected: ${reason}`,
          category: 'withdrawal',
          isRead: false,
          createdAt: serverTimestamp(),
        });

        const logId = makeId('log');
        tx.set(doc(db, 'audit_logs', logId), {
          id: logId,
          action: 'WITHDRAWAL_REJECTED',
          actorUid: admin.uid,
          actorEmail: admin.email,
          targetUserId: curWdr.userId,
          referenceId: curWdr.id,
          amount: curWdr.amount,
          details: `Rejected withdrawal: ${reason}`,
          createdAt: serverTimestamp(),
        });
      }
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `withdrawals/${withdrawal.id}`);
  }
}

export async function publishTournamentResults(params: {
  tournament: Tournament;
  entries: Array<{
    userId: string;
    playerCode: string;
    ign: string;
    ffUid: string;
    rank: number;
    kills: number;
    placementPrize: number;
  }>;
}): Promise<void> {
  const admin = requireAdminIdentity();
  const { tournament, entries } = params;

  try {
    await runTransaction(db, async (tx) => {
      const trnRef = doc(db, 'tournaments', tournament.id);
      const trnSnap = await tx.get(trnRef);
      if (!trnSnap.exists()) throw new Error('Tournament not found.');

      const userSnaps = await Promise.all(
        entries.map((e) => Promise.all([tx.get(doc(db, 'users', e.userId)), tx.get(doc(db, 'players_public', e.userId))]))
      );

      entries.forEach((entry, idx) => {
        const [uSnap, pSnap] = userSnaps[idx];
        const killReward = entry.kills * tournament.perKillReward;
        const totalWon = killReward + entry.placementPrize;
        const resultId = `${tournament.id}_${entry.userId}`;

        tx.set(doc(db, 'tournament_results', resultId), {
          id: resultId,
          tournamentId: tournament.id,
          tournamentTitle: tournament.title,
          userId: entry.userId,
          playerCode: entry.playerCode,
          ign: entry.ign,
          ffUid: entry.ffUid,
          rank: entry.rank,
          kills: entry.kills,
          killReward,
          placementPrize: entry.placementPrize,
          totalWon,
          publishedBy: admin.uid,
          createdAt: serverTimestamp(),
        });

        if (uSnap.exists() && entry.placementPrize > 0) {
          const u = uSnap.data() as UserPrivate;
          const newBal = u.walletBalance + entry.placementPrize;
          tx.update(doc(db, 'users', entry.userId), {
            walletBalance: newBal,
            totalEarnings: u.totalEarnings + entry.placementPrize,
            updatedAt: serverTimestamp(),
          });

          const txId = makeId('wtx');
          tx.set(doc(db, 'wallet_transactions', txId), {
            id: txId,
            txCode: `VTX-${Date.now().toString(36).toUpperCase()}${idx}`,
            userId: entry.userId,
            type: 'booyah_prize',
            direction: 'credit',
            amount: entry.placementPrize,
            balanceAfter: newBal,
            referenceId: resultId,
            description: `Rank #${entry.rank} placement prize (${tournament.title})`,
            createdBy: admin.uid,
            createdAt: serverTimestamp(),
          });
        }

        if (pSnap.exists()) {
          const p = pSnap.data() as PlayerPublic;
          tx.update(doc(db, 'players_public', entry.userId), {
            matchesPlayed: p.matchesPlayed + 1,
            booyahs: p.booyahs + (entry.rank === 1 ? 1 : 0),
            totalEarnings: p.totalEarnings + entry.placementPrize,
            updatedAt: serverTimestamp(),
          });
        }

        const notifId = makeId('notif');
        tx.set(doc(db, 'notifications', notifId), {
          id: notifId,
          userId: entry.userId,
          title: 'Match Results Published',
          message: `${tournament.title}: Ranked #${entry.rank} with ${entry.kills} kills.${entry.placementPrize > 0 ? ` ₹${entry.placementPrize} placement prize credited!` : ''}`,
          category: 'result',
          isRead: false,
          createdAt: serverTimestamp(),
        });
      });

      tx.update(trnRef, {
        resultsPublished: true,
        status: 'Completed',
        updatedAt: serverTimestamp(),
      });

      const annId = makeId('ann');
      tx.set(doc(db, 'announcements', annId), {
        id: annId,
        title: `Results Published: ${tournament.title}`,
        message: `Final standings and verified kills for ${tournament.title} are now live on the Leaderboard.`,
        tournamentId: tournament.id,
        type: 'result',
        createdBy: admin.uid,
        createdAt: serverTimestamp(),
      });
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `tournament_results/${tournament.id}`);
  }
}

export async function togglePlayerBan(targetUser: UserPrivate, ban: boolean): Promise<void> {
  const admin = requireAdminIdentity();
  const batch = writeBatch(db);
  batch.update(doc(db, 'users', targetUser.uid), {
    isBanned: ban,
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, 'players_public', targetUser.uid), {
    isBanned: ban,
    updatedAt: serverTimestamp(),
  });

  const logId = makeId('log');
  batch.set(doc(db, 'audit_logs', logId), {
    id: logId,
    action: ban ? 'PLAYER_BANNED' : 'PLAYER_UNBANNED',
    actorUid: admin.uid,
    actorEmail: admin.email,
    targetUserId: targetUser.uid,
    referenceId: targetUser.playerCode,
    amount: 0,
    details: `${ban ? 'Suspended' : 'Reinstated'} player ${targetUser.ign} (${targetUser.ffUid})`,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${targetUser.uid}`);
  }
}

export async function publishAnnouncement(params: {
  title: string;
  message: string;
  type: Announcement['type'];
  tournamentId?: string;
  broadcastToAllPlayers?: boolean;
}): Promise<void> {
  const admin = requireAdminIdentity();
  const id = makeId('ann');
  const payload: Record<string, unknown> = {
    id,
    title: params.title.trim(),
    message: params.message.trim(),
    type: params.type,
    createdBy: admin.uid,
    createdAt: serverTimestamp(),
  };
  if (params.tournamentId) payload.tournamentId = params.tournamentId;

  try {
    await setDoc(doc(db, 'announcements', id), payload);
    if (params.broadcastToAllPlayers) {
      const usersSnap = await getDocs(collection(db, 'users'));
      const batch = writeBatch(db);
      usersSnap.docs.forEach((d) => {
        const nid = makeId('notif');
        batch.set(doc(db, 'notifications', nid), {
          id: nid,
          userId: d.id,
          title: params.title.trim(),
          message: params.message.trim(),
          category: params.type === 'room_release' ? 'room' : params.type === 'result' ? 'result' : 'tournament',
          isRead: false,
          createdAt: serverTimestamp(),
        });
      });
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `announcements/${id}`);
  }
}

export async function updateSupportTicket(params: {
  ticket: SupportTicket;
  status: TicketStatus;
  adminReply: string;
}): Promise<void> {
  const admin = requireAdminIdentity();
  const batch = writeBatch(db);
  batch.update(doc(db, 'support_tickets', params.ticket.id), {
    status: params.status,
    adminReply: params.adminReply.trim(),
    resolvedBy: admin.uid,
    updatedAt: serverTimestamp(),
  });

  const notifId = makeId('notif');
  batch.set(doc(db, 'notifications', notifId), {
    id: notifId,
    userId: params.ticket.userId,
    title: `Support Ticket ${params.status}`,
    message: `${params.ticket.subject}: ${params.adminReply.trim()}`,
    category: 'system',
    isRead: false,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `support_tickets/${params.ticket.id}`);
  }
}
