const multer = require('multer');

// On stocke le fichier temporairement en mémoire vive (Buffer)
const storage = multer.memoryStorage();

// On garde le filtre pour n'accepter que les PDF
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Format invalide. Uniquement les fichiers PDF !'), false);
    }
};

const upload = multer({ 
    storage: storage, 
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // Limite à 5 Mo
});

module.exports = upload;