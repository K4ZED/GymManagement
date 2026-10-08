import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config';
import { authenticate } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/error';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { membersRouter } from './routes/members';
import { membershipsRouter } from './routes/memberships';
import { plansRouter } from './routes/plans';
import { trainersRouter } from './routes/trainers';
import { classesRouter } from './routes/classes';
import { bookingsRouter } from './routes/bookings';
import { checkinsRouter } from './routes/checkins';
import { dashboardRouter } from './routes/dashboard';

export const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({ data: { status: 'ok' } });
});

app.use('/api/auth', authRouter);
app.use('/api/users', authenticate, usersRouter);
app.use('/api/members', authenticate, membersRouter);
app.use('/api/memberships', authenticate, membershipsRouter);
app.use('/api/plans', authenticate, plansRouter);
app.use('/api/trainers', authenticate, trainersRouter);
app.use('/api/classes', authenticate, classesRouter);
app.use('/api/bookings', authenticate, bookingsRouter);
app.use('/api/checkins', authenticate, checkinsRouter);
app.use('/api/dashboard', authenticate, dashboardRouter);

app.use(notFoundHandler);
app.use(errorHandler);
