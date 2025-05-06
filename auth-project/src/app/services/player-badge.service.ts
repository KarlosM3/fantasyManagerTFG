import { Injectable } from "@angular/core"

@Injectable({
  providedIn: "root",
})
export class PlayerBadgeService {
  // Determina si un jugador está disponible, lesionado, etc.
  getPlayerStatus(player: any): string {
    // Aquí implementarías la lógica real basada en tus datos
    // Por ahora, simulamos que todos están disponibles
    return "Disponible"
  }

  // Devuelve la clase CSS para el badge según el estado
  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case "disponible":
        return "disponible"
      case "duda":
        return "duda"
      case "lesionado":
        return "lesionado"
      case "sancionado":
        return "sancionado"
      default:
        return ""
    }
  }

  // Devuelve el color del badge según el estado
  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case "disponible":
        return "#10b981" // Verde para disponible
      case "duda":
        return "#f59e0b" // Amarillo para duda
      case "lesionado":
        return "#ef4444" // Rojo para lesionado
      case "sancionado":
        return "#6b7280" // Gris para sancionado
      default:
        return "#10b981"
    }
  }
}
