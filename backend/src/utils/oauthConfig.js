import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import dotenv from 'dotenv';
import prisma from './db.js';

dotenv.config();

// ✅ Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // ✅ Validate necessary profile fields
        if (!profile.emails || profile.emails.length === 0) {
          return done(new Error('No email found in Google profile'), null);
        }

        const email = profile.emails[0].value;
        const avatar = profile.photos?.[0]?.value;

        // ✅ Check by oauthId + provider first
        let user = await prisma.user.findFirst({
          where: {
            oauthId: profile.id,
            oauthProvider: 'GOOGLE',
          },
        });

        if (!user) {
          // Check by email
          user = await prisma.user.findUnique({
            where: { email },
          });

          if (user) {
            // Update existing user
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                oauthProvider: 'GOOGLE',
                oauthId: profile.id,
                avatar: avatar || user.avatar,
              },
            });
          } else {
            // Create new user
            user = await prisma.user.create({
              data: {
                username: profile.displayName || `user_${Date.now()}`,
                email,
                oauthProvider: 'GOOGLE',
                oauthId: profile.id,
                avatar,
                password: null, // No password for OAuth
              },
            });
          }
        }

        // ✅ Return a plain object (not Prisma model)
        return done(null, { ...user });

      } catch (err) {
        console.error('Google OAuth error:', err);
        console.error('Profile received:', profile);
        return done(err, null);
      }
    }
  )
);
// utils/oauthConfig.js (after Google strategy)
// passport.use(
//   new GitHubStrategy(
//     {
//       clientID: process.env.GITHUB_CLIENT_ID,
//       clientSecret: process.env.GITHUB_CLIENT_SECRET,
//       callbackURL: `${process.env.BACKEND_URL}/api/auth/github/callback`,
//       scope: ['user:email']
//     },
//     async (accessToken, refreshToken, profile, done) => {
//       try {
//         // Email may be missing; GitHub sometimes hides it. Try primary email if present.
//         const email = profile.emails?.[0]?.value || null;
//         const avatar = profile.photos?.[0]?.value;
//         const display = profile.username || profile.displayName || `gh_${profile.id}`;

//         // Prefer matching oauthId+provider, then fallback to email if present.
//         let user = await prisma.user.findFirst({
//           where: { oauthId: profile.id, oauthProvider: 'GITHUB' }
//         });

//         if (!user && email) {
//           user = await prisma.user.findUnique({ where: { email } });
//         }

//         if (user) {
//           user = await prisma.user.update({
//             where: { id: user.id },
//             data: {
//               oauthProvider: 'GITHUB',
//               oauthId: profile.id,
//               avatar: avatar || user.avatar,
//             }
//           });
//         } else {
//           // Create “email optional” user (Prisma requires email unique; you have it as required)
//           // If GitHub doesn't return email, you must collect it later on FE.
//           if (!email) {
//             // you can either fail here or synthesize a placeholder & mark isPublic false
//             return done(new Error('GitHub did not provide an email. Ask user to add email after redirect.'), null);
//           }
//           user = await prisma.user.create({
//             data: {
//               username: display,
//               email,
//               oauthProvider: 'GITHUB',
//               oauthId: profile.id,
//               avatar,
//               password: null
//             }
//           });
//         }

//         return done(null, { ...user });
//       } catch (err) {
//         console.error('GitHub OAuth error:', err);
//         return done(err, null);
//       }
//     }
//   )
// );


// ❌ REMOVE serialize/deserialize if you're using `session: false`
/*
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
*/

export default passport;
