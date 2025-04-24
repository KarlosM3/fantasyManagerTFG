const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // Obtener token del header
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'No hay token, autorización denegada' });
  }
  
  try {
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Añadir usuario al request
    req.user = decoded.user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token no válido' });
  }
};
