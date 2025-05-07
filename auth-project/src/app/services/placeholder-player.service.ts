import { Injectable } from "@angular/core"
import type { Player } from "../player.interface"

@Injectable({
  providedIn: "root",
})
export class PlaceholderPlayerService {
  // Jugadores placeholder para cada posición
  private placeholders: { [key: string]: Player } = {
    GK: {
      id: "placeholder-gk",
      nickname: "Portero Vacante",
      positionId: "1",
      position: "GK",
      marketValue: 0,
      points: 0,
      image: "assets/placeholder-player.png",
      team: {
        name: "Sin Equipo",
        shortName: "N/A",
      },
    },
    DEF: {
      id: "placeholder-def",
      nickname: "Defensa Vacante",
      positionId: "2",
      position: "DEF",
      marketValue: 0,
      points: 0,
      image: "assets/placeholder-player.png",
      team: {
        name: "Sin Equipo",
        shortName: "N/A",
      },
    },
    MID: {
      id: "placeholder-mid",
      nickname: "Centrocampista Vacante",
      positionId: "3",
      position: "MID",
      marketValue: 0,
      points: 0,
      image: "assets/placeholder-player.png",
      team: {
        name: "Sin Equipo",
        shortName: "N/A",
      },
    },
    FWD: {
      id: "placeholder-fwd",
      nickname: "Delantero Vacante",
      positionId: "4",
      position: "FWD",
      marketValue: 0,
      points: 0,
      image: "assets/placeholder-player.png",
      team: {
        name: "Sin Equipo",
        shortName: "N/A",
      },
    },
  }

  // Genera un ID único para cada placeholder
  getPlaceholder(position: string, index: number): Player {
    const base = this.placeholders[position] || this.placeholders["DEF"]
    return {
      ...base,
      id: `${base.id}-${index}`, // Asegura IDs únicos
    }
  }

  // Verifica si un jugador es un placeholder
  isPlaceholder(player: Player): boolean {
    return player.id.startsWith("placeholder-")
  }

  // Obtiene placeholders para completar una formación
  getPlaceholdersForFormation(formation: string, available: { [key: string]: Player[] }): { [key: string]: Player[] } {
    const parts = formation.split("-").map((p) => Number.parseInt(p))
    const result: { [key: string]: Player[] } = {
      GK: [],
      DEF: [],
      MID: [],
      FWD: [],
    }

    // Portero (siempre 1)
    if (available["GK"].length < 1) {
      result["GK"] = [this.getPlaceholder("GK", 0)]
    }

    // Defensas
    const defNeeded = parts[0]
    if (available["DEF"].length < defNeeded) {
      for (let i = available["DEF"].length; i < defNeeded; i++) {
        result["DEF"].push(this.getPlaceholder("DEF", i))
      }
    }

    // Centrocampistas
    const midNeeded = parts[1]
    if (available["MID"].length < midNeeded) {
      for (let i = available["MID"].length; i < midNeeded; i++) {
        result["MID"].push(this.getPlaceholder("MID", i))
      }
    }

    // Delanteros
    const fwdNeeded = parts[2]
    if (available["FWD"].length < fwdNeeded) {
      for (let i = available["FWD"].length; i < fwdNeeded; i++) {
        result["FWD"].push(this.getPlaceholder("FWD", i))
      }
    }

    return result
  }
}
