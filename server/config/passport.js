
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import dotenv from 'dotenv';
dotenv.config(); // must come before accessing process.env

const resolveGoogleCallbackUrl = () => {
  const callbackPath = '/api/auth/google/callback';
  const configuredCallback = process.env.GOOGLE_CALLBACK_URL?.trim();

  if (configuredCallback && !configuredCallback.includes('localhost')) {
    return configuredCallback.replace('/auth/google/callback', callbackPath);
  }

  // A relative callback lets Passport build the correct host/protocol from the
  // incoming request, which is important behind nginx/HTTPS on the VPS.
  return callbackPath;
};

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: resolveGoogleCallbackUrl(),
    proxy: true,
  },
async (accessToken, refreshToken, profile, done) => {
  try {
    const googleId = profile.id;
    const email = profile.emails?.[0]?.value;
    const firstName = profile.name?.givenName || '';
    const lastName = profile.name?.familyName || '';

    if (!email) {
      return done(new Error("Google account did not provide an email."), null);
    }

    // Check for existing user by email
    let user = await User.findOne({ email });

    if (user) {
      // If user exists but no googleId, update it
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    } else {
      // Create new user
      user = await User.create({
        googleId,
        email,
        firstName,
        lastName
      });
    }

    // Update user with Google profile data if fields are empty
    if (!user.firstName && firstName) {
      user.firstName = firstName;
      await user.save();
    }
    if (!user.lastName && lastName) {
      user.lastName = lastName;
      await user.save();
    }

    const userObject = user.toObject();
    
    // Create a clean user object with only the necessary fields
    const cleanUserObject = {
      id: userObject._id.toString(),
      _id: userObject._id.toString(), // Ensure _id is a string
      firstName: userObject.firstName,
      lastName: userObject.lastName,
      email: userObject.email,
      phoneNumber: userObject.phoneNumber,
      CNIC: userObject.CNIC,
      services: userObject.services || []
    };

    const token = jwt.sign(cleanUserObject, process.env.JWT_SECRET, { expiresIn: '1d' });

    done(null, { user: cleanUserObject, token });

  } catch (err) {
    console.error("Error in Google Strategy:", err);
    done(err, null);
  }
  }));
} else {
  console.warn('Google OAuth client ID/secret not set. Skipping GoogleStrategy registration.');
}
