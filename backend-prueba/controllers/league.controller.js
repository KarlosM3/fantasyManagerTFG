const League = require('../models/league.model');
const User = require('../models/user.model');

// Crear una nueva liga y asociarla al usuario
exports.createLeague = async (req, res) => {
  try {
    const { name, privacy, maxParticipants, initialBudget } = req.body;
    const userId = req.user.id || req.user._id; // Ajusta según tu sistema de auth

    // 1. Crear la liga
    const newLeague = new League({
      name,
      privacy: privacy || 'private',
      maxParticipants: maxParticipants || 10,
      initialBudget: initialBudget || 100000000,
      createdBy: userId,
      members: [{
        userId,
        role: 'admin',
        joinedAt: new Date()
      }]
    });

    await newLeague.save();

    // Añadir la liga al usuario
    await User.findByIdAndUpdate(userId, {
      $push: { leagues: newLeague._id } }, 
      {new: true} // Devuelve el usuario actualizado
    );

    res.status(201).json({
      success: true,
      leagueId: newLeague._id,
      message: 'Liga creada con éxito'
    });
  } catch (error) {
    console.error('Error al crear la liga:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear la liga',
      error: error.message
    });
  }
};

// Obtener las ligas de un usuario
exports.getUserLeagues = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId).populate('leagues');
    res.status(200).json(user.leagues);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener las ligas', error: error.message });
  }
};
