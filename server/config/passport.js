import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import dotenv from 'dotenv';
import { issueToken } from '../utils/tokenService.js';

dotenv.config();

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const googleId = profile.id;
      const email = profile.emails?.[0]?.value;
      const firstName = profile.name?.givenName || '';
      const lastName = profile.name?.familyName || '';

      if (!email) {
        return done(new Error('Google account did not provide an email.'), null);
      }

      let user = await User.findOne({ email });

      if (user) {
        if (!user.googleId) {
          user.googleId = googleId;
          await user.save();
        }
      } else {
        user = await User.create({
          googleId,
          email,
          firstName,
          lastName,
        });
      }

      if (!user.firstName && firstName) {
        user.firstName = firstName;
        await user.save();
      }
      if (!user.lastName && lastName) {
        user.lastName = lastName;
        await user.save();
      }

      const userObject = user.toObject();
      const cleanUserObject = {
        _id: userObject._id.toString(),
        firstName: userObject.firstName,
        lastName: userObject.lastName,
        email: userObject.email,
        phoneNumber: userObject.phoneNumber,
        CNIC: userObject.CNIC,
        services: userObject.services || [],
      };

      console.log('Clean user object:', cleanUserObject);

      const token = issueToken(cleanUserObject);

      done(null, { user: cleanUserObject, token });
    } catch (err) {
      console.error('Error in Google Strategy:', err);
      done(err, null);
    }
  }));
} else {
  console.warn('Google OAuth environment variables not set. Skipping GoogleStrategy registration.');
}
