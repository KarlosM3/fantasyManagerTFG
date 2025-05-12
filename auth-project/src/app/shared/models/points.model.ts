export interface PlayerPoints {
  id: string;
  images: {
    transparent: {
      '256x256': string;
    };
  };
  positionId: number; // Cambiado a number en lugar de string
  position: string;
  nickname: string;
  lastSeasonPoints: number | null;
  playerStatus: string;
  team: {
    id: string;
    name: string;
    slug: string;
    badgeColor: string;
    badge?: string; // Añadido para compatibilidad con la visualización
  };
  points: number;
  averagePoints: number;
  weekPoints: {
    weekNumber: number;
    points: number;
  }[];
  matchdayPoints?: number; // Añadido con ? para indicar que es opcional
}

export interface MatchdayPoints {
  matchday: number;
  total_points: number;
  players: PlayerPoints[];
  date: string;
}

export interface TeamStanding {
  teamId: string;
  teamName: string;
  userId: string;
  username: string;
  totalPoints: number;
  teamValue: number;
  position: number;
}
