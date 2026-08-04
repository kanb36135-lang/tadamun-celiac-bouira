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
      // 1. Extraction robuste de l'image
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      let photoUrl = null;
      
      if (profile.photos && profile.photos.length > 0) {
        photoUrl = profile.photos[0].value;
      } else if (profile._json && profile._json.picture) {
        photoUrl = profile._json.picture;
      }

      if (!email) {
        return done(new Error("Aucun email trouvé dans le compte Google"), null);
      }

      // 2. Mettre à jour OU Créer l'utilisateur directement avec la photo mise à jour
      const patient = await Patient.findOneAndUpdate(
        { $or: [{ googleId: profile.id }, { email: email }] },
        {
          $set: {
            googleId: profile.id,
            fullName: profile.displayName,
            email: email,
            photo: photoUrl, // Forcer la valeur de la photo
            isVerified: true
          },
          $setOnInsert: {
            commune: 'non_defini',
            medicalCertPath: 'pending_upload'
          }
        },
        { new: true, upsert: true } // Crée si n'existe pas, retourne la version mise à jour
      );

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