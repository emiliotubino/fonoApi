import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './database/connection';

dotenv.config();
const app = express();

// middlewares
app.use(cors());
app.use(express.json());

// conectar banco
connectDB();

// routes
import configRoutes from './routes/config.routes';

// register routes
app.use('/config', configRoutes);

// porta
const PORT = process.env.PORT || 8083;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
