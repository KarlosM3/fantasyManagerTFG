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

// Programar sincronización de puntos cada lunes a las 03:00 (después de finalizar la jornada)
cron.schedule('0 3 * * 1', async () => {
  console.log('Sincronizando puntos de la jornada...');
  try {
    const currentMatchday = getCurrentMatchday();
    
    const req = { params: { matchday: currentMatchday } };
    const res = {
      status: (code) => ({
        json: (data) => {
          console.log(`Sincronización de puntos para jornada ${currentMatchday}: ${data.message}`);
        }
      })
    };
    
    await pointsController.syncPointsFromExternalAPI(req, res);
  } catch (error) {
    console.error('Error al sincronizar puntos:', error);
  }
});