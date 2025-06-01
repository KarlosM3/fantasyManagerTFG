// migrate-precise-dates-fixed.js
require('dotenv').config();
const connectDB = require('./config/db');

// Calendario oficial corregido
const LALIGA_CALENDAR = [
  { jornada: 1, inicio: new Date('2024-08-18') },
  { jornada: 2, inicio: new Date('2024-08-25') },
  { jornada: 3, inicio: new Date('2024-08-28') },
  { jornada: 4, inicio: new Date('2024-09-01') },
  { jornada: 5, inicio: new Date('2024-09-15') },
  { jornada: 6, inicio: new Date('2024-09-22') },
  { jornada: 7, inicio: new Date('2024-09-29') },
  { jornada: 8, inicio: new Date('2024-10-06') },
  { jornada: 9, inicio: new Date('2024-10-20') },
  { jornada: 10, inicio: new Date('2024-10-27') },
  { jornada: 11, inicio: new Date('2024-11-03') },
  { jornada: 12, inicio: new Date('2024-11-10') },
  { jornada: 13, inicio: new Date('2024-11-24') },
  { jornada: 14, inicio: new Date('2024-12-01') },
  { jornada: 15, inicio: new Date('2024-12-08') },
  { jornada: 16, inicio: new Date('2024-12-15') },
  { jornada: 17, inicio: new Date('2024-12-22') },
  { jornada: 18, inicio: new Date('2025-01-12') },
  { jornada: 19, inicio: new Date('2025-01-19') },
  { jornada: 20, inicio: new Date('2025-01-26') },
  { jornada: 21, inicio: new Date('2025-02-02') },
  { jornada: 22, inicio: new Date('2025-02-09') },
  { jornada: 23, inicio: new Date('2025-02-16') },
  { jornada: 24, inicio: new Date('2025-02-23') },
  { jornada: 25, inicio: new Date('2025-03-02') },
  { jornada: 26, inicio: new Date('2025-03-09') },
  { jornada: 27, inicio: new Date('2025-03-16') },
  { jornada: 28, inicio: new Date('2025-03-30') },
  { jornada: 29, inicio: new Date('2025-04-06') },
  { jornada: 30, inicio: new Date('2025-04-13') },
  { jornada: 31, inicio: new Date('2025-04-20') },
  { jornada: 32, inicio: new Date('2025-04-27') },
  { jornada: 33, inicio: new Date('2025-05-04') },
  { jornada: 34, inicio: new Date('2025-05-11') },
  { jornada: 35, inicio: new Date('2025-05-18') },
  { jornada: 36, inicio: new Date('2025-05-14') }, // Jornada 36: 14 mayo
  { jornada: 37, inicio: new Date('2025-05-18') }, // Jornada 37: 18 mayo  
  { jornada: 38, inicio: new Date('2025-05-25') }  // Jornada 38: 25 mayo
];

function getJornadaForDate(createdDate) {
  for (let i = LALIGA_CALENDAR.length - 1; i >= 0; i--) {
    if (createdDate >= LALIGA_CALENDAR[i].inicio) {
      return LALIGA_CALENDAR[i].jornada + 1;
    }
  }
  return 1;
}

async function preciseMigration() {
  try {
    await connectDB();
    console.log('🔧 Iniciando migración precisa con fechas reales de LaLiga...');
    
    const mongoose = require('mongoose');
    
    // Migrar equipos
    const teams = await mongoose.connection.db.collection('teams').find().toArray();
    
    console.log(`\n👥 MIGRANDO ${teams.length} EQUIPOS:`);
    
    for (let team of teams) {
      const createdDate = new Date(team.createdAt);
      const correctMatchday = getJornadaForDate(createdDate);
      
      await mongoose.connection.db.collection('teams').updateOne(
        { _id: team._id },
        { $set: { joinedMatchday: correctMatchday } }
      );
      
      console.log(`✅ Equipo ID: ${team._id} (${createdDate.toLocaleDateString()}) - joinedMatchday: ${correctMatchday}`);
    }
    
    // Caso específico: Tu equipo del 31 de mayo
    const mayTeam = teams.find(t => t._id.toString() === "683b1a0be56975417e659b1c");
    if (mayTeam) {
      const mayDate = new Date(mayTeam.createdAt);
      const mayMatchday = getJornadaForDate(mayDate);
      console.log(`\n🎯 TU EQUIPO DEL 31 DE MAYO:`);
      console.log(`- Fecha creación: ${mayDate.toLocaleDateString()}`);
      console.log(`- Jornada asignada: ${mayMatchday}`);
      console.log(`- Explicación: Creado después de jornada 38 (25 mayo), no debería tener puntos`);
    }
    
    console.log('\n🎉 Migración precisa completada exitosamente');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  }
}

preciseMigration();
