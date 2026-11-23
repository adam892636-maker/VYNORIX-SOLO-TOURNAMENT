import type { MapName, PlatformSettings, TournamentStatus } from '../types/vynorix';

export const OWNER_EMAIL = 'ssahu76447@gmail.com';
export const DEFAULT_UPI_ID = 'sumit892636@fam';
export const DEFAULT_ENTRY_FEE = 10;
export const DEFAULT_PER_KILL_REWARD = 7;
export const DEFAULT_MIN_WITHDRAWAL = 50;

export const DEFAULT_TOURNAMENT_RULES: string[] = [
  '1. No Hack or Cheats.',
  '2. No Character Skill.',
  '3. No Gun Skin.',
  '4. No Double Vector.',
  '5. No Healing Battle.',
  '6. No Teaming.',
  '7. No Collaboration.',
  '8. No unfair gameplay.',
  '9. Match screenshots or other evidence may be required.',
  '10. Admin verifies final results.',
];

export const DEFAULT_SETTINGS: Omit<PlatformSettings, 'updatedAt'> = {
  defaultEntryFee: DEFAULT_ENTRY_FEE,
  perKillReward: DEFAULT_PER_KILL_REWARD,
  minWithdrawal: DEFAULT_MIN_WITHDRAWAL,
  upiId: DEFAULT_UPI_ID,
  upiQrUrl: '',
  defaultRules: DEFAULT_TOURNAMENT_RULES,
  maintenanceMode: false,
};

export const TOURNAMENT_STATUSES: TournamentStatus[] = [
  'Upcoming',
  'Registration Open',
  'Registration Closed',
  'Room Details Released',
  'Live',
  'Completed',
  'Cancelled',
];

export const MAP_NAMES: MapName[] = ['Bermuda', 'Purgatory', 'Kalahari', 'Alpine', 'Nextera'];

export const ASSETS = {
  logo: '/src/assets/images/vynorix_logo_1795447008133.jpg',
  heroBanner: '/src/assets/images/hero_arena_banner_1795447009535.jpg',
  mapBermuda: '/src/assets/images/map_bermuda_1795447010384.jpg',
  mapPurgatory: '/src/assets/images/map_purgatory_1795447011206.jpg',
  mapKalahari: '/src/assets/images/map_kalahari_1795447010377.jpg',
} as const;

export function getMapImage(map: MapName): string {
  switch (map) {
    case 'Purgatory':
      return ASSETS.mapPurgatory;
    case 'Kalahari':
      return ASSETS.mapKalahari;
    case 'Alpine':
      return ASSETS.mapPurgatory;
    case 'Nextera':
      return ASSETS.mapBermuda;
    case 'Bermuda':
    default:
      return ASSETS.mapBermuda;
  }
}

export function formatINR(amount: number): string {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
}
