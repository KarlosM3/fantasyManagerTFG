export interface Player {
  id: string;
  name: string;
  positionId: string;
  position?: string; // Derivado de positionId
  marketValue: number;
  team?: {
    name: string;
    shortName?: string;
  };
  points?: number;
  image?: string;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
}
