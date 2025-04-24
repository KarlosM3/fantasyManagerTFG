const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Ruta para registro
router.post('/register', authController.register);

// Ruta para login
router.post('/login', authController.login);

// Ruta protegida para obtener información del usuario
router.get('/user', authMiddleware, authController.getUser);

module.exports = router;
