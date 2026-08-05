const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // 1. Récupérer le token depuis le header Authorization
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
        return res.status(401).json({ success: false, message: 'Accès refusé. Aucun token fourni.' });
    }

    // Le header est au format "Bearer <TOKEN>"
    const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7, authHeader.length) 
        : authHeader;

    try {
        // 2. Vérifier le token avec la clé secrète JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tadamun_secret_key');
        
        // 3. Injecter l'utilisateur décodé dans la requête
        req.user = decoded;
        next();
    } catch (err) {
        res.status(400).json({ success: false, message: 'Token invalide ou expiré.' });
    }
};