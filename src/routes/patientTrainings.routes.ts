import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import PatientTraining, { TrainingStatus } from '../models/patientTrainings';
import User from '../models/users';
import Training from '../models/trainings';

const router = Router();

// GET all trainings for a specific patient
router.get('/:patientId/patient-trainings', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
  try {
    const { patientId } = req.params;
    const { period } = req.query;

    // Validate patient exists and has patient role
    const patient = await User.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Paciente não encontrado' });
    }
    if (patient.role !== 'patient') {
      return res.status(400).json({ message: 'Usuário não é um paciente' });
    }

    // Build query based on period filter
    const query: any = { patientId };
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Set to start of today

    if (period === 'past') {
      query.scheduledDate = { $lt: now };
    } else if (period === 'future') {
      query.scheduledDate = { $gte: now };
    }
    // If period === 'all' or undefined, no date filter is applied

    const patientTrainings = await PatientTraining.find(query)
      .populate('patientId', '-password')
      .populate('trainingId')
      .sort({ scheduledDate: 1 });

    res.json(patientTrainings);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar treinamentos do paciente', error });
  }
});

// GET single patient training by ID
router.get('/:patientId/patient-trainings/:id', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
  try {
    const { patientId, id } = req.params;

    // Validate patient exists and has patient role
    const patient = await User.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Paciente não encontrado' });
    }
    if (patient.role !== 'patient') {
      return res.status(400).json({ message: 'Usuário não é um paciente' });
    }

    const patientTraining = await PatientTraining.findOne({ _id: id, patientId })
      .populate('patientId', '-password')
      .populate('trainingId');

    if (!patientTraining) {
      return res.status(404).json({ message: 'Treinamento de paciente não encontrado' });
    }

    res.json(patientTraining);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar treinamento de paciente', error });
  }
});

// POST create new patient training assignments (bulk creation with multiple dates)
router.post('/:patientId/patient-trainings', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
  try {
    const { patientId } = req.params;
    const { trainingId, scheduledDates, assignedDate, status } = req.body;

    // Validate required fields
    if (!trainingId || !scheduledDates || !Array.isArray(scheduledDates) || scheduledDates.length === 0) {
      return res.status(400).json({
        message: 'Campos obrigatórios: trainingId, scheduledDates (array de datas)'
      });
    }

    // Validate patient exists and has patient role
    const patient = await User.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Paciente não encontrado' });
    }
    if (patient.role !== 'patient') {
      return res.status(400).json({ message: 'Usuário não é um paciente' });
    }

    // Validate training exists
    const training = await Training.findById(trainingId);
    if (!training) {
      return res.status(404).json({ message: 'Treinamento não encontrado' });
    }
    console.log(TrainingStatus, status)

    // Validate status if provided
    if (status && !Object.values(TrainingStatus).includes(status)) {
      return res.status(400).json({
        message: 'Status inválido. Valores permitidos: incompleto, completo'
      });
    }

    // Create multiple patient trainings, one for each scheduled date
    const patientTrainings = scheduledDates.map(scheduledDate => ({
      patientId,
      trainingId,
      scheduledDate,
      assignedDate: assignedDate || Date.now(),
      status: status || TrainingStatus.INCOMPLETED
    }));

    // Insert all trainings at once
    const createdTrainings = await PatientTraining.insertMany(patientTrainings);

    // Populate the created trainings
    const populatedTrainings = await PatientTraining.find({
      _id: { $in: createdTrainings.map(t => t._id) }
    })
      .populate('patientId', '-password')
      .populate('trainingId');

    res.status(201).json({
      message: `${createdTrainings.length} treinamento(s) criado(s) com sucesso`,
      count: createdTrainings.length,
      trainings: populatedTrainings
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar treinamentos de paciente', error });
  }
});

// PUT update patient training
router.put('/:patientId/patient-trainings/:id', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
  try {
    const { patientId, id } = req.params;
    const { scheduledDate, status, completedDate } = req.body;

    // Validate patient exists and has patient role
    const patient = await User.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Paciente não encontrado' });
    }
    if (patient.role !== 'patient') {
      return res.status(400).json({ message: 'Usuário não é um paciente' });
    }

    // Find existing patient training
    const patientTraining = await PatientTraining.findOne({ _id: id, patientId });

    if (!patientTraining) {
      return res.status(404).json({ message: 'Treinamento de paciente não encontrado' });
    }

    // Update fields if provided
    if (scheduledDate !== undefined) {
      patientTraining.scheduledDate = scheduledDate;
    }

    if (status !== undefined) {
      // Validate status
      if (!Object.values(TrainingStatus).includes(status)) {
        return res.status(400).json({
          message: 'Status inválido. Valores permitidos: incompleto, completo'
        });
      }
      patientTraining.status = status;

      // Auto-set completedDate when status changes to completed
      if (status === TrainingStatus.COMPLETED && !patientTraining.completedDate) {
        patientTraining.completedDate = new Date();
      }
    }

    if (completedDate !== undefined) {
      patientTraining.completedDate = completedDate;
    }

    await patientTraining.save();

    // Return populated document
    const updatedPatientTraining = await PatientTraining.findById(patientTraining._id)
      .populate('patientId', '-password')
      .populate('trainingId');

    res.json(updatedPatientTraining);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar treinamento de paciente', error });
  }
});

// DELETE patient training
router.delete('/:patientId/patient-trainings/:id', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
  try {
    const { patientId, id } = req.params;

    // Validate patient exists and has patient role
    const patient = await User.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Paciente não encontrado' });
    }
    if (patient.role !== 'patient') {
      return res.status(400).json({ message: 'Usuário não é um paciente' });
    }

    const patientTraining = await PatientTraining.findOne({ _id: id, patientId });

    if (!patientTraining) {
      return res.status(404).json({ message: 'Treinamento de paciente não encontrado' });
    }

    await PatientTraining.findByIdAndDelete(id);

    res.json({
      message: 'Treinamento de paciente deletado com sucesso',
      patientTraining: {
        id: patientTraining._id,
        patientId: patientTraining.patientId,
        trainingId: patientTraining.trainingId,
        scheduledDate: patientTraining.scheduledDate
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao deletar treinamento de paciente', error });
  }
});

export default router;
