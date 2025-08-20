const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/connection');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Configure Google OAuth strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user exists
    let user = await db.get('SELECT * FROM users WHERE google_id = ?', [profile.id]);
    
    if (user) {
      // Update user info
      await db.run(
        'UPDATE users SET name = ?, picture = ?, google_user_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [profile.displayName, profile.photos[0]?.value, JSON.stringify(profile._json), user.id]
      );
    } else {
      // Create new user
      const userId = uuidv4();
      await db.run(
        'INSERT INTO users (id, email, name, picture, google_id, google_user_data) VALUES (?, ?, ?, ?, ?, ?)',
        [
          userId,
          profile.emails[0].value,
          profile.displayName,
          profile.photos[0]?.value,
          profile.id,
          JSON.stringify(profile._json)
        ]
      );
      
      user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    }
    
    return done(null, user);
  } catch (error) {
    console.error('Google OAuth error:', error);
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Get Google OAuth URL
router.get('/google/url', (req, res) => {
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(process.env.API_URL || 'http://localhost:5000')}/api/auth/google/callback&` +
    `scope=${encodeURIComponent('profile email')}&` +
    `response_type=code&` +
    `access_type=offline`;
  
  res.json({ url: authUrl });
});

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/auth/failed` }),
  (req, res) => {
    // Generate JWT token
    const token = jwt.sign(
      { id: req.user.id, email: req.user.email },
      process.env.JWT_SECRET || 'your-jwt-secret',
      { expiresIn: '7d' }
    );
    
    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${token}`);
  }
);

// Get current user
router.get('/me', authMiddleware, (req, res) => {
  const userData = {
    id: req.user.id,
    email: req.user.email,
    name: req.user.name,
    picture: req.user.picture,
    google_user_data: req.user.google_user_data ? JSON.parse(req.user.google_user_data) : null
  };
  res.json(userData);
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Session destruction failed' });
      }
      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out successfully' });
    });
  });
});

module.exports = router;
