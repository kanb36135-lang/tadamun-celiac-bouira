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
      let patient = await Patient.findOne({ googleId: profile.id });
      
      if (!patient) {
        patient = new Patient({
          googleId: profile.id,
          fullName: profile.displayName,
          email: profile.emails[0].value,
          commune: 'non_defini',
          medicalCertPath: 'pending_upload',
          isVerified: true
        });
        await patient.save();
      }
      
      done(null, patient);
    } catch (error) {
      done(error, null);
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