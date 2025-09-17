import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
const app = express();

// middlewares
app.use(cors());
app.use(express.json());

// routes
import configRoutes from './routes/config.routes';

// register routes
app.use('/config', configRoutes);

// porta
const PORT = process.env.PORT || 8083;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
