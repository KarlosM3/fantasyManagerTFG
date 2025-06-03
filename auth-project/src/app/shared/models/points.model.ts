export interface PlayerPoints {
  id: string;
  images: {
    transparent: {
      '256x256': string;
    };
  };
  positionId: number;
  position: string;
  nickname: string;
  lastSeasonPoints: number | null;
  playerStatus: string;
  team: {
    id: string;
    name: string;
    slug: string;
    badgeColor: string;
    badge?: string;
  };
  points: number;
  averagePoints: number;
  weekPoints: {
    weekNumber: number;
    points: number;
  }[];
  matchdayPoints?: number;
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
