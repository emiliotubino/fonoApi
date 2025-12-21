import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import PatientActionPlan, { ActionPlanStatus } from '../models/patientActionPlans';
import User from '../models/users';

const router = Router();

// GET all action plans for a specific patient
router.get('/:patientId/patient-action-plans', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
  try {
    const { patientId } = req.params;
    const { status, startDate, endDate } = req.query;

    // Validate patient exists and has patient role
    const patient = await User.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Paciente não encontrado' });
    }
    if (patient.role !== 'patient') {
      return res.status(400).json({ message: 'Usuário não é um paciente' });
    }

    // Build query based on filters
    const query: any = { patientId };

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      if (startDate) {
        query.startDate = { $gte: new Date(startDate as string) };
      }
      if (endDate) {
        query.endDate = { $lte: new Date(endDate as string) };
      }
    }

    const patientActionPlans = await PatientActionPlan.find(query)
      .populate('patientId', '-password')
      .populate({
        path: 'trainings',
        populate: {
          path: 'trainingId',
          populate: {
            path: 'categories'
          }
        }
      })
      .sort({ startDate: -1 });

    res.json(patientActionPlans);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar planos de ação do paciente', error });
  }
});

// GET single patient action plan by ID
router.get('/:patientId/patient-action-plans/:id', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
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

    const patientActionPlan = await PatientActionPlan.findOne({ _id: id, patientId })
      .populate('patientId', '-password')
      .populate({
        path: 'trainings',
        populate: {
          path: 'trainingId',
          populate: {
            path: 'categories'
          }
        }
      });

    if (!patientActionPlan) {
      return res.status(404).json({ message: 'Plano de ação não encontrado' });
    }

    res.json(patientActionPlan);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar plano de ação', error });
  }
});

// POST create new patient action plan
router.post('/:patientId/patient-action-plans', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
  try {
    const { patientId } = req.params;
    const { startDate, endDate, diagnosis, planDescription, status } = req.body;

    // Validate required fields
    if (!startDate || !endDate || !diagnosis || !planDescription) {
      return res.status(400).json({
        message: 'Campos obrigatórios: startDate, endDate, diagnosis, planDescription'
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

    // Validate endDate > startDate
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      return res.status(400).json({
        message: 'Data de fim deve ser posterior à data de início'
      });
    }

    // Prepare action plan data
    const actionPlanData: any = {
      patientId,
      startDate: start,
      endDate: end,
      diagnosis,
      planDescription,
      status: status || ActionPlanStatus.IN_PROGRESS
    };

    // Create the action plan
    const patientActionPlan = await PatientActionPlan.create(actionPlanData);

    // Populate and return
    const populatedActionPlan = await PatientActionPlan.findById(patientActionPlan._id)
      .populate('patientId', '-password')
      .populate({
        path: 'trainings',
        populate: {
          path: 'trainingId',
          populate: {
            path: 'categories'
          }
        }
      });

    res.status(201).json(populatedActionPlan);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar plano de ação', error });
  }
});

// PUT update patient action plan
router.put('/:patientId/patient-action-plans/:id', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
  try {
    const { patientId, id } = req.params;
    const { startDate, endDate, diagnosis, planDescription, status } = req.body;

    // Validate patient exists and has patient role
    const patient = await User.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Paciente não encontrado' });
    }
    if (patient.role !== 'patient') {
      return res.status(400).json({ message: 'Usuário não é um paciente' });
    }

    // Find existing patient action plan
    const patientActionPlan = await PatientActionPlan.findOne({ _id: id, patientId });

    if (!patientActionPlan) {
      return res.status(404).json({ message: 'Plano de ação não encontrado' });
    }

    // Prevent transition from completed to in_progress
    if (patientActionPlan.status === ActionPlanStatus.COMPLETED && status === ActionPlanStatus.IN_PROGRESS) {
      return res.status(400).json({
        message: 'Não é possível reverter plano completo para em andamento'
      });
    }

    // Update startDate if provided
    if (startDate !== undefined) {
      patientActionPlan.startDate = new Date(startDate);
    }

    // Update endDate if provided
    if (endDate !== undefined) {
      patientActionPlan.endDate = new Date(endDate);
    }

    // Validate endDate > startDate after updates
    if (patientActionPlan.endDate <= patientActionPlan.startDate) {
      return res.status(400).json({
        message: 'Data de fim deve ser posterior à data de início'
      });
    }

    // Update diagnosis if provided
    if (diagnosis !== undefined) {
      patientActionPlan.diagnosis = diagnosis;
    }

    // Update planDescription if provided
    if (planDescription !== undefined) {
      patientActionPlan.planDescription = planDescription;
    }

    // Update status if provided
    if (status !== undefined) {
      // Validate status
      if (!Object.values(ActionPlanStatus).includes(status)) {
        return res.status(400).json({
          message: 'Status inválido. Valores permitidos: in_progress, completed'
        });
      }

      patientActionPlan.status = status;
      // Note: The pre-save hook will automatically populate trainings when status becomes 'completed'
    }

    await patientActionPlan.save();

    // Return populated document
    const updatedPatientActionPlan = await PatientActionPlan.findById(patientActionPlan._id)
      .populate('patientId', '-password')
      .populate({
        path: 'trainings',
        populate: {
          path: 'trainingId',
          populate: {
            path: 'categories'
          }
        }
      });

    res.json(updatedPatientActionPlan);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar plano de ação', error });
  }
});

// DELETE patient action plan
router.delete('/:patientId/patient-action-plans/:id', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
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

    const patientActionPlan = await PatientActionPlan.findOne({ _id: id, patientId });

    if (!patientActionPlan) {
      return res.status(404).json({ message: 'Plano de ação não encontrado' });
    }

    await PatientActionPlan.findByIdAndDelete(id);

    res.json({
      message: 'Plano de ação deletado com sucesso',
      patientActionPlan: {
        id: patientActionPlan._id,
        patientId: patientActionPlan.patientId,
        diagnosis: patientActionPlan.diagnosis,
        startDate: patientActionPlan.startDate,
        endDate: patientActionPlan.endDate
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao deletar plano de ação', error });
  }
});

export default router;
