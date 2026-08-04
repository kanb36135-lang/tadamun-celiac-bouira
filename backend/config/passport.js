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
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      const photoUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

      if (!email) {
        return done(new Error("Aucun email associé à ce compte Google."), null);
      }

      // Rechercher d'abord par email (ou par googleId)
      let patient = await Patient.findOne({ $or: [{ googleId: profile.id }, { email: email }] });
      
      if (!patient) {
        // Créer un nouvel utilisateur avec la photo Google
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
        // Mettre à jour les informations existantes (googleId et photo)
        let hasChanges = false;

        if (!patient.googleId) {
          patient.googleId = profile.id;
          hasChanges = true;
        }

        if (photoUrl && patient.photo !== photoUrl) {
          patient.photo = photoUrl;
          hasChanges = true;
        }

        if (hasChanges) {
          await patient.save();
        }
      }
      
      return done(null, patient);
    } catch (error) {
      console.error("Erreur dans la stratégie Google Passport:", error);
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