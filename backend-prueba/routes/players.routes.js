const express = require('express');
const axios = require('axios');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');

// Ruta para obtener todos los jugadores
router.get('/players', authMiddleware ,async (req, res) => {
  try {
    const response = await axios.get('https://api-fantasy.llt-services.com/api/v3/players');
    res.json(response.data);
  } catch (error) {
    console.error('Error al obtener jugadores:', error.message);
    res.status(500).json({ 
      message: 'Error al obtener datos de jugadores',
      error: error.message 
    });
  }
});

module.exports = router;
