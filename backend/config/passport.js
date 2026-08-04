const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const Patient = require('../models/Patient');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'https://tadamun-celiac-bouira-backend.onrender.com/api/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log("=== PROFILE GOOGLE REÇU ===", profile); // Pour voir les logs dans Render

      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      
      // Extraction sécurisée de la photo depuis différentes structures Google possibles
      let photoUrl = null;
      if (profile.photos && profile.photos.length > 0) {
        photoUrl = profile.photos[0].value;
      } else if (profile._json && profile._json.picture) {
        photoUrl = profile._json.picture;
      }

      if (!email) {
        return done(new Error("Aucun email trouvé dans le compte Google"), null);
      }

      // Chercher si l'utilisateur existe déjà
      let patient = await Patient.findOne({ $or: [{ googleId: profile.id }, { email: email }] });

      if (!patient) {
        // Création du patient avec la photo
        patient = new Patient({
          googleId: profile.id,
          fullName: profile.displayName,
          email: email,
          photo: photoUrl,
          commune: 'non_defini',
          medicalCertPath: 'pending_upload',
          isVerified: true
        });
        await patient.save();
      } else {
        // Mise à jour si la photo est nouvelle ou modifiée
        patient.googleId = profile.id;
        patient.photo = photoUrl;
        await patient.save();
      }

      return done(null, patient);
    } catch (error) {
      console.error("Erreur Passport Google:", error);
      return done(error, null);
    }
  }
));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  Patient.findById(id)
    .then(user => done(null, user))
    .catch(err => done(err, null));
});

module.exports = passport;