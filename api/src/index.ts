require('dotenv-safe').config();
import 'reflect-metadata';
import express from 'express';
import { createConnection } from 'typeorm';
import { __prod__ } from './constants';
import { join } from 'path';
import { User } from './entities/User';
import { Strategy as GitHubStrategy } from 'passport-github';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { runInNewContext } from 'node:vm';

const main = async () => {
  await createConnection({
    type: 'postgres',
    database: 'vstodo',
    // dropSchema: true,
    username: 'postgres',
    password: '5616',
    entities: [join(__dirname, './entities/*.*')],
    logging: !__prod__,
    synchronize: !__prod__,
  });

  // const user = await User.create({ name: 'bob' }).save();

  // console.log({ user });

  const app = express();

  app.use(passport.initialize());

  passport.serializeUser((user: any, done) => {
    done(null, user.accessToken);
  });

  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: 'http://localhost:3002/auth/github/callback',
      },
      async (_: any, __: any, profile: any, cb: any) => {
        let user = await User.findOne({ where: { githubId: profile.id } });
        if (user) {
          user.name = profile.displayName;
          await user.save();
        } else {
          user = await User.create({ name: profile.displayName, githubId: profile.id }).save();
        }

        cb(null, {
          accessToken: jwt.sign({ userId: user.id }, 'sbjdksudjhid', {
            expiresIn: '1y',
          }),
        });
      }
    )
  );

  app.get('/auth/github', passport.authenticate('github', { session: false }));

  app.get(
    '/auth/github/callback',
    passport.authenticate('github', { session: false }),
    (req: any, res) => {
      // Successful authentication, redirect home.
      res.redirect(`http://localhost:54321/auth${req.user.accessToken}`)
    }
  );

  app.get('/', (_req, res) => {
    res.send('hello');
  });
  app.listen(3002, () => {
    console.log('Listening on port 3002');
  });
};

main();
