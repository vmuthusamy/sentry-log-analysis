import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Express } from "express";
import { storage } from "./storage";

export function setupGoogleAuth(app: Express) {
  // Validate environment variables
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn("Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
    return;
  }

  // Google OAuth Strategy
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists
      let user = await storage.getUserByEmail(profile.emails?.[0]?.value || "");
      
      if (!user) {
        // Create new user from Google profile
        user = await storage.createUser({
          username: profile.emails?.[0]?.value || profile.displayName || `google_${profile.id}`,
          email: profile.emails?.[0]?.value || "",
          password: "", // No password for OAuth users
          firstName: profile.name?.givenName || "",
          lastName: profile.name?.familyName || "",
          profileImageUrl: profile.photos?.[0]?.value || ""
        });
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));

  // Google OAuth routes
  app.get("/api/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  app.get("/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/auth?error=google_auth_failed" }),
    (req, res) => {
      // Successful authentication, redirect to home
      res.redirect("/");
    }
  );
}