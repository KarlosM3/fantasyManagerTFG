const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: '/etc/secrets/.env' });
const connectDB = require('./config/db');

// Inicializar app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Conectar a la base de datos
connectDB();

// Rutas
app.use('/api', require('./routes/auth.routes'));
app.use('/api', require('./routes/players.routes'));
app.use('/api/leagues', require('./routes/league.router'));
app.use('/api/market', require('./routes/market.routes'));
app.use('/api/points', require('./routes/points.router'));

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ message: 'API funcionando correctamente' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
