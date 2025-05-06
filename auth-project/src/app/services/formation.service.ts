import { Injectable } from "@angular/core"

@Injectable({
  providedIn: "root",
})
export class FormationService {
  // Coordenadas para posicionar jugadores según formación
  private formationPositions: { [key: string]: any } = {
    "4-4-2": {
      GK: [{ x: 50, y: 90 }],
      DEF: [
        { x: 20, y: 70 },
        { x: 40, y: 70 },
        { x: 60, y: 70 },
        { x: 80, y: 70 },
      ],
      MID: [
        { x: 20, y: 50 },
        { x: 40, y: 50 },
        { x: 60, y: 50 },
        { x: 80, y: 50 },
      ],
      FWD: [
        { x: 35, y: 30 },
        { x: 65, y: 30 },
      ],
    },
    "4-3-3": {
      GK: [{ x: 50, y: 90 }],
      DEF: [
        { x: 20, y: 70 },
        { x: 40, y: 70 },
        { x: 60, y: 70 },
        { x: 80, y: 70 },
      ],
      MID: [
        { x: 30, y: 50 },
        { x: 50, y: 50 },
        { x: 70, y: 50 },
      ],
      FWD: [
        { x: 20, y: 30 },
        { x: 50, y: 30 },
        { x: 80, y: 30 },
      ],
    },
    "3-5-2": {
      GK: [{ x: 50, y: 90 }],
      DEF: [
        { x: 30, y: 70 },
        { x: 50, y: 70 },
        { x: 70, y: 70 },
      ],
      MID: [
        { x: 20, y: 50 },
        { x: 35, y: 50 },
        { x: 50, y: 50 },
        { x: 65, y: 50 },
        { x: 80, y: 50 },
      ],
      FWD: [
        { x: 35, y: 30 },
        { x: 65, y: 30 },
      ],
    },
    "5-3-2": {
      GK: [{ x: 50, y: 90 }],
      DEF: [
        { x: 10, y: 70 },
        { x: 30, y: 70 },
        { x: 50, y: 70 },
        { x: 70, y: 70 },
        { x: 90, y: 70 },
      ],
      MID: [
        { x: 30, y: 50 },
        { x: 50, y: 50 },
        { x: 70, y: 50 },
      ],
      FWD: [
        { x: 35, y: 30 },
        { x: 65, y: 30 },
      ],
    },
    "5-4-1": {
      GK: [{ x: 50, y: 90 }],
      DEF: [
        { x: 10, y: 70 },
        { x: 30, y: 70 },
        { x: 50, y: 70 },
        { x: 70, y: 70 },
        { x: 90, y: 70 },
      ],
      MID: [
        { x: 20, y: 50 },
        { x: 40, y: 50 },
        { x: 60, y: 50 },
        { x: 80, y: 50 },
      ],
      FWD: [{ x: 50, y: 30 }],
    },
    "3-4-3": {
      GK: [{ x: 50, y: 90 }],
      DEF: [
        { x: 30, y: 70 },
        { x: 50, y: 70 },
        { x: 70, y: 70 },
      ],
      MID: [
        { x: 20, y: 50 },
        { x: 40, y: 50 },
        { x: 60, y: 50 },
        { x: 80, y: 50 },
      ],
      FWD: [
        { x: 20, y: 30 },
        { x: 50, y: 30 },
        { x: 80, y: 30 },
      ],
    },
  }

  constructor() {}

  getPositionsForFormation(formation: string): any {
    return this.formationPositions[formation] || this.formationPositions["4-4-2"]
  }

  getFormationOptions(): string[] {
    return Object.keys(this.formationPositions)
  }
}
