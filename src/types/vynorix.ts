import type { Timestamp } from 'firebase/firestore';

export type TournamentStatus =
  | 'Upcoming'
  | 'Registration Open'
  | 'Registration Closed'
  | 'Room Details Released'
  | 'Live'
  | 'Completed'
  | 'Cancelled';

export type MapName = 'Bermuda' | 'Purgatory' | 'Kalahari' | 'Alpine' | 'Nextera';

export type PaymentStatus = 'Pending' | 'Approved' | 'Rejected';
export type KillClaimStatus = 'Pending' | 'Approved' | 'Rejected';
export type WithdrawalStatus = 'Pending' | 'Approved' | 'Rejected' | 'Paid';
export type TicketStatus = 'Open' | 'In Review' | 'Resolved' | 'Closed';

export type TicketCategory =
  | 'payment_dispute'
  | 'kill_dispute'
  | 'cheater_report'
  | 'withdrawal_issue'
  | 'account_support';

export type NotificationCategory =
  | 'registration'
  | 'payment'
  | 'room'
  | 'tournament'
  | 'result'
  | 'kill_reward'
  | 'withdrawal'
  | 'system';

export interface UserPrivate {
  uid: string;
  playerCode: string;
  email?: string;
  phone?: string;
  ign: string;
  ffUid: string;
  avatarUrl?: string;
  walletBalance: number;
  totalEarnings: number;
  totalKillRewards: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
  isBanned: boolean;
  role: 'player' | 'admin';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PlayerPublic {
  uid: string;
  playerCode: string;
  ign: string;
  ffUid: string;
  avatarUrl?: string;
  totalKills: number;
  totalEarnings: number;
  matchesPlayed: number;
  booyahs: number;
  isBanned: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PlatformSettings {
  defaultEntryFee: number;
  perKillReward: number;
  minWithdrawal: number;
  upiId: string;
  upiQrUrl?: string;
  defaultRules: string[];
  maintenanceMode: boolean;
  updatedAt: Timestamp;
}

export interface Tournament {
  id: string;
  title: string;
  description?: string;
  matchDate: string;
  startTime: string;
  regCloseTime: string;
  roomReleaseTime: string;
  format: string;
  map: MapName;
  maxSlots: number;
  filledSlots: number;
  entryFee: number;
  perKillReward: number;
  prizePool: number;
  booyahPrize?: number;
  rules: string[];
  status: TournamentStatus;
  announcement?: string;
  resultsPublished: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface RoomSecret {
  tournamentId: string;
  roomId: string;
  roomPassword: string;
  matchDate: string;
  matchTime: string;
  mapName: string;
  mode: string;
  maxPlayers: number;
  releaseTimestamp: Timestamp;
  updatedAt: Timestamp;
}

export interface Registration {
  id: string;
  tournamentId: string;
  tournamentTitle: string;
  userId: string;
  playerCode: string;
  ign: string;
  ffUid: string;
  entryFee: number;
  utrNumber: string;
  screenshotData: string;
  paymentStatus: PaymentStatus;
  slotConfirmed: boolean;
  rejectionReason?: string;
  reviewedBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface KillClaim {
  id: string;
  tournamentId: string;
  tournamentTitle: string;
  userId: string;
  playerCode: string;
  ign: string;
  ffUid: string;
  claimedKills: number;
  verifiedKills: number;
  perKillReward: number;
  totalReward: number;
  screenshotData: string;
  notes?: string;
  status: KillClaimStatus;
  rejectionReason?: string;
  reviewedBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface WalletTransaction {
  id: string;
  txCode: string;
  userId: string;
  type: 'kill_reward' | 'booyah_prize' | 'withdrawal_paid' | 'admin_adjustment';
  direction: 'credit' | 'debit';
  amount: number;
  balanceAfter: number;
  referenceId: string;
  description: string;
  createdBy: string;
  createdAt: Timestamp;
}

export interface Withdrawal {
  id: string;
  userId: string;
  playerCode: string;
  ign: string;
  amount: number;
  upiId: string;
  status: WithdrawalStatus;
  payoutUtr?: string;
  rejectionReason?: string;
  reviewedBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TournamentResult {
  id: string;
  tournamentId: string;
  tournamentTitle: string;
  userId: string;
  playerCode: string;
  ign: string;
  ffUid: string;
  rank: number;
  kills: number;
  killReward: number;
  placementPrize: number;
  totalWon: number;
  publishedBy: string;
  createdAt: Timestamp;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  tournamentId?: string;
  type: 'general' | 'tournament' | 'room_release' | 'result';
  createdBy: string;
  createdAt: Timestamp;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  category: NotificationCategory;
  isRead: boolean;
  createdAt: Timestamp;
}

export interface SupportTicket {
  id: string;
  userId: string;
  playerCode: string;
  ign: string;
  tournamentId?: string;
  category: TicketCategory;
  subject: string;
  description: string;
  evidenceData?: string;
  status: TicketStatus;
  adminReply?: string;
  resolvedBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AuditLog {
  id: string;
  action: string;
  actorUid: string;
  actorEmail: string;
  targetUserId: string;
  referenceId: string;
  amount: number;
  details: string;
  createdAt: Timestamp;
}

export type AppTab = 'arena' | 'room' | 'leaderboard' | 'wallet' | 'hub' | 'admin';

export const BLUEPRINT_LIMITS = {
  ign: { min: 2, max: 40 },
  ffUid: { min: 5, max: 20, pattern: /^[0-9]{5,20}$/ },
  utr: { min: 6, max: 40, pattern: /^[A-Za-z0-9\-_]{6,40}$/ },
  playerCodePattern: /^VYN-[A-Z0-9]{4,12}$/,
  screenshotMaxLen: 450000,
  titleMax: 100,
  descMax: 500,
  notesMax: 300,
} as const;
