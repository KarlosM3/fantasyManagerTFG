import { Injectable } from "@angular/core"

@Injectable({
  providedIn: "root",
})
export class PlayerBadgeService {
  // Determina si un jugador está disponible, lesionado, etc.
  getPlayerStatus(player: any): string {
    if (!player || !player.playerStatus) return "Disponible";

    switch (player.playerStatus.toLowerCase()) {
      case "ok":
        return "Disponible";
      case "doubtful":
        return "Duda";
      case "injured":
        return "Lesionado";
      case "suspended":
        return "Sancionado";
      default:
        return player.playerStatus;
    }
  }

  // Devuelve la clase CSS para el badge según el estado
  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case "disponible":
      case "ok":
        return "disponible";
      case "duda":
      case "doubtful":
        return "duda";
      case "lesionado":
      case "injured":
        return "lesionado";
      case "sancionado":
      case "suspended":
        return "sancionado";
      default:
        return "";
    }
  }

  // Devuelve el color del badge según el estado
  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case "disponible":
      case "ok":
        return "#10b981"; // Verde para disponible
      case "duda":
      case "doubtful":
        return "#f59e0b"; // Amarillo para duda
      case "lesionado":
      case "injured":
        return "#ef4444"; // Rojo para lesionado
      case "sancionado":
      case "suspended":
        return "#6b7280"; // Gris para sancionado
      default:
        return "#10b981";
    }
  }

  // Verifica si se debe mostrar el badge (solo cuando no es "ok")
  shouldShowBadge(player: any): boolean {
    return player && player.playerStatus && player.playerStatus.toLowerCase() !== "ok";
  }

  // Añadir este método a PlayerBadgeService
  getStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case "disponible":
      case "ok":
        return "fa-check-circle";
      case "duda":
      case "doubtful":
        return "fa-question-circle"; // Icono para jugadores en duda
      case "lesionado":
      case "injured":
        return "fa-notes-medical"; // Icono para jugadores lesionados
      case "sancionado":
      case "suspended":
        return "fa-ban"; // Icono para jugadores sancionados (alternativa a cards-blank)
      default:
        return "fa-check-circle";
    }
  }



}
