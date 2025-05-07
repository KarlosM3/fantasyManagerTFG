export interface Player {
  id: string;
  nickname?: string;
  positionId: string;
  position?: string; // Derivado de positionId
  marketValue?: number;
  team?: {
    name: string;
    shortName?: string;
    badgeColor?: string;
  };
  points?: number;
  image?: string;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
}
