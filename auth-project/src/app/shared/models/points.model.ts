export interface PlayerPoints {
  id: string;
  name: string;
  nickname: string;
  position: string;
  positionId: number;
  marketValue: number;
  images: any;
  team: any;
  points: number;
}

export interface MatchdayPoints {
  matchday: number;
  total_points: number;
}

export interface TeamStanding {
  id: string;
  name: string;
  user_id: string;
  username: string;
  total_points: number;
  matchdays_played: number;
}
