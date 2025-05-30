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

// NUEVO ENDPOINT: Ruta para el monitoreo de API (v4) - SIN autenticación para el monitoreo automático
router.get('/external/players', async (req, res) => {
  try {
    console.log('Solicitando datos de jugadores para monitoreo...');
    const response = await axios.get('https://api-fantasy.llt-services.com/api/v4/players');
    
    // Log básico para debugging
    console.log(`Datos obtenidos: ${response.data.length} jugadores`);
    
    res.json(response.data);
  } catch (error) {
    console.error('Error al obtener jugadores para monitoreo:', error.message);
    res.status(500).json({
      message: 'Error al obtener datos de jugadores para monitoreo',
      error: error.message
    });
  }
});

module.exports = router;
