const express = require("express")
const router = express.Router()
const marketController = require("../controllers/market.controller")
const authMiddleware = require("../middleware/auth.middleware")

// Rutas para el mercado de jugadores
router.post("/buy", authMiddleware, marketController.buyPlayer)
router.post("/sell", authMiddleware, marketController.sellPlayer)
router.get("/transactions/:leagueId", authMiddleware, marketController.getTransactionHistory)
router.get("/players", authMiddleware, marketController.getAllPlayers);


module.exports = router
