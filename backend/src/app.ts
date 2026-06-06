import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler.js';
import authRouter from './routes/auth.routes.js';
import { tweetRouter, timelineRouter } from './routes/tweet.routes.js';
import followRouter from './routes/follow.routes.js';
import likeRouter from './routes/like.routes.js';
import userRouter from './routes/user.routes.js';
import searchRouter from './routes/search.routes.js';
import uploadRouter from './routes/upload.routes.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(
  morgan(':method :url :status :response-time ms - :res[content-length]'),
);
app.use('/uploads', express.static('uploads'));

app.use('/auth', authRouter);
app.use('/tweets', tweetRouter);
app.use('/timeline', timelineRouter);
app.use('/follows', followRouter);
app.use('/likes', likeRouter);
app.use('/users', userRouter);
app.use('/search', searchRouter);
app.use('/uploads', uploadRouter);

app.use(errorHandler);

export default app;
