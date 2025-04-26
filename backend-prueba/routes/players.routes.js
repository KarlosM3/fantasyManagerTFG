const express = require('express');
const axios = require('axios');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');

// Ruta para obtener todos los jugadores
router.get('/players', authMiddleware ,async (req, res) => {
  try {
    const response = await axios.get('https://api-fantasy.llt-services.com/api/v4/players');
    res.json(response.data);
  } catch (error) {
    console.error('Error al obtener jugadores:', error.message);
    res.status(500).json({ 
      message: 'Error al obtener datos de jugadores',
      error: error.message 
    });
  }
});

// Si necesitas más endpoints relacionados con jugadores, agrégalos aquí
// Por ejemplo, para obtener un jugador específico por ID
router.get('/players/:id', async (req, res) => {
  try {
    const response = await axios.get(`https://api-fantasy.llt-services.com/api/v4/players/${req.params.id}`);
    res.json(response.data);
  } catch (error) {
    console.error(`Error al obtener jugador con ID ${req.params.id}:`, error.message);
    res.status(500).json({ 
      message: `Error al obtener jugador con ID ${req.params.id}`,
      error: error.message 
    });
  }
});

module.exports = router;
