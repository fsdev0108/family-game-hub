require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const ConnectSQLite = require('connect-sqlite3')(session);
const helmet = require('helmet');
const cors = require('cors');

const { errorHandler } = require('./middlewares/errorHandler');
const { generalLimiter } = require('./middlewares/rateLimiter');

const roomRoutes = require('./routes/rooms');
const playerRoutes = require('./routes/players');
const gameRoutes = require('./routes/games');
const sessionRoutes = require('./routes/session');

const initSockets = require('./sockets/index');

const app = express();
const httpServer = http.createServer(app);

// In development allow any origin (local network play). In production restrict to CORS_ORIGIN.
const corsOrigin = process.env.NODE_ENV === 'production'
  ? process.env.CORS_ORIGIN
  : true;

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    credentials: true,
  },
  pingTimeout: 20000,
  pingInterval: 10000,
  transports: ['websocket'],
});

const sessionMiddleware = session({
  store: new ConnectSQLite({ db: 'sessions.db', dir: './' }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 1000 * 60 * 60 * 4,
  },
});

app.use(helmet());
app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));
app.use(express.json());
app.use(sessionMiddleware);
app.use(generalLimiter);

app.use('/api/rooms', roomRoutes);
app.use('/api/rooms', playerRoutes);
app.use('/api/rooms', gameRoutes);
app.use('/api/session', sessionRoutes);

app.use(errorHandler);

initSockets(io, sessionMiddleware);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT} [${process.env.NODE_ENV}]`);
});