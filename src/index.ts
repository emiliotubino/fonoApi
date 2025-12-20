import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './database/connection';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import patientsRoutes from './routes/patients.routes';
import exerciseCategoriesRoutes from './routes/exerciseCategories.routes';
import exercisesRoutes from './routes/exercises.routes';
import trainingsRoutes from './routes/trainings.routes';
import anamnesisTemplateRoutes from './routes/anamnesisTemplate.routes';
import patientTrainingsRoutes from './routes/patientTrainings.routes';
import patientAnamnesisRoutes from './routes/patientAnamnesis.routes';

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
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/patients', patientsRoutes);
app.use('/exercise-categories', exerciseCategoriesRoutes);
app.use('/exercises', exercisesRoutes);
app.use('/trainings', trainingsRoutes);
app.use('/anamnesis-templates', anamnesisTemplateRoutes);
app.use('/', patientTrainingsRoutes);
app.use('/', patientAnamnesisRoutes);

// porta
const PORT = process.env.PORT || 8083;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
