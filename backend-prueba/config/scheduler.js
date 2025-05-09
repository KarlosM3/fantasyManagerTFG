const cron = require('node-cron');
const { refreshMarket } = require('./controllers/market.controller');

// Programar actualización diaria a las 00:00
cron.schedule('0 0 * * *', async () => {
  console.log('Actualizando el mercado de jugadores...');
  try {
    await refreshMarket();
    console.log('Mercado actualizado correctamente');
  } catch (error) {
    console.error('Error al actualizar el mercado:', error);
  }
});