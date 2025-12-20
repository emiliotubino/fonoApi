import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import PatientEvaluation, { EvaluationStatus } from '../models/patientEvaluations';
import User from '../models/users';
import EvaluationTemplate from '../models/evaluationTemplate';

const router = Router();

// GET all evaluations for a specific patient
router.get('/:patientId/patient-evaluations', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
  try {
    const { patientId } = req.params;
    const { status, templateId, startDate, endDate } = req.query;

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

    if (templateId) {
      query.templateId = templateId;
    }

    if (startDate || endDate) {
      query.filledDate = {};
      if (startDate) {
        query.filledDate.$gte = new Date(startDate as string);
      }
      if (endDate) {
        query.filledDate.$lte = new Date(endDate as string);
      }
    }

    const patientEvaluations = await PatientEvaluation.find(query)
      .populate('patientId', '-password')
      .populate('templateId', 'name description')
      .sort({ filledDate: -1 });

    res.json(patientEvaluations);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar avaliações do paciente', error });
  }
});

// GET single patient evaluation by ID
router.get('/:patientId/patient-evaluations/:id', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
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

    const patientEvaluation = await PatientEvaluation.findOne({ _id: id, patientId })
      .populate('patientId', '-password')
      .populate('templateId', 'name description');

    if (!patientEvaluation) {
      return res.status(404).json({ message: 'Avaliação de paciente não encontrada' });
    }

    res.json(patientEvaluation);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar avaliação de paciente', error });
  }
});

// POST create new patient evaluation
router.post('/:patientId/patient-evaluations', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
  try {
    const { patientId } = req.params;
    const { templateId, answers, status, filledDate } = req.body;

    // Validate required fields
    if (!templateId) {
      return res.status(400).json({
        message: 'Campo obrigatório: templateId'
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

    // Validate template exists and is active
    const template = await EvaluationTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({ message: 'Template de avaliação não encontrado' });
    }
    if (!template.isActive) {
      return res.status(400).json({ message: 'Template de avaliação não está ativo' });
    }

    // Create template snapshot
    const templateSnapshot = {
      templateName: template.name,
      templateDescription: template.description,
      fields: template.fields,
      categories: template.categories
    };

    // Validate answers if provided
    if (answers && Array.isArray(answers)) {
      const fieldLabels = new Set(template.fields.map(f => f.label));
      for (const answer of answers) {
        if (!fieldLabels.has(answer.fieldLabel)) {
          return res.status(400).json({
            message: `Campo "${answer.fieldLabel}" não existe no template`
          });
        }
      }
    }

    // Prepare evaluation data
    const evaluationData: any = {
      patientId,
      templateId,
      templateSnapshot,
      answers: answers || [],
      status: status || EvaluationStatus.DRAFT
    };

    if (filledDate) {
      evaluationData.filledDate = filledDate;
    }

    // If status is completed, validate all fields have answers and set completedDate
    if (evaluationData.status === EvaluationStatus.COMPLETED) {
      const answeredLabels = new Set(evaluationData.answers.map((a: any) => a.fieldLabel));
      const missingFields = template.fields.filter(f => !answeredLabels.has(f.label));

      if (missingFields.length > 0) {
        return res.status(400).json({
          message: 'Não é possível completar avaliação com campos faltando',
          missingFields: missingFields.map(f => f.label)
        });
      }

      evaluationData.completedDate = new Date();
    }

    // Create the evaluation
    const patientEvaluation = await PatientEvaluation.create(evaluationData);

    // Populate and return
    const populatedEvaluation = await PatientEvaluation.findById(patientEvaluation._id)
      .populate('patientId', '-password')
      .populate('templateId', 'name description');

    res.status(201).json(populatedEvaluation);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar avaliação de paciente', error });
  }
});

// PUT update patient evaluation
router.put('/:patientId/patient-evaluations/:id', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
  try {
    const { patientId, id } = req.params;
    const { answers, status, completedDate } = req.body;

    // Validate patient exists and has patient role
    const patient = await User.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Paciente não encontrado' });
    }
    if (patient.role !== 'patient') {
      return res.status(400).json({ message: 'Usuário não é um paciente' });
    }

    // Find existing patient evaluation
    const patientEvaluation = await PatientEvaluation.findOne({ _id: id, patientId });

    if (!patientEvaluation) {
      return res.status(404).json({ message: 'Avaliação de paciente não encontrada' });
    }

    // Prevent transition from completed to draft
    if (patientEvaluation.status === EvaluationStatus.COMPLETED && status === EvaluationStatus.DRAFT) {
      return res.status(400).json({
        message: 'Não é possível reverter avaliação completa para rascunho'
      });
    }

    // Update answers if provided
    if (answers !== undefined) {
      // Validate answers against template snapshot
      const fieldLabels = new Set(patientEvaluation.templateSnapshot.fields.map(f => f.label));
      for (const answer of answers) {
        if (!fieldLabels.has(answer.fieldLabel)) {
          return res.status(400).json({
            message: `Campo "${answer.fieldLabel}" não existe no template`
          });
        }
      }
      patientEvaluation.answers = answers;
    }

    // Update status if provided
    if (status !== undefined) {
      // Validate status
      if (!Object.values(EvaluationStatus).includes(status)) {
        return res.status(400).json({
          message: 'Status inválido. Valores permitidos: draft, completed'
        });
      }

      // If changing to completed, validate all fields are answered
      if (status === EvaluationStatus.COMPLETED) {
        const answeredLabels = new Set(patientEvaluation.answers.map(a => a.fieldLabel));
        const missingFields = patientEvaluation.templateSnapshot.fields.filter(f => !answeredLabels.has(f.label));

        if (missingFields.length > 0) {
          return res.status(400).json({
            message: 'Não é possível completar avaliação com campos faltando',
            missingFields: missingFields.map(f => f.label)
          });
        }

        // Auto-set completedDate when status changes to completed
        if (!patientEvaluation.completedDate) {
          patientEvaluation.completedDate = new Date();
        }
      }

      patientEvaluation.status = status;
    }

    if (completedDate !== undefined) {
      patientEvaluation.completedDate = completedDate;
    }

    await patientEvaluation.save();

    // Return populated document
    const updatedPatientEvaluation = await PatientEvaluation.findById(patientEvaluation._id)
      .populate('patientId', '-password')
      .populate('templateId', 'name description');

    res.json(updatedPatientEvaluation);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar avaliação de paciente', error });
  }
});

// DELETE patient evaluation
router.delete('/:patientId/patient-evaluations/:id', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
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

    const patientEvaluation = await PatientEvaluation.findOne({ _id: id, patientId });

    if (!patientEvaluation) {
      return res.status(404).json({ message: 'Avaliação de paciente não encontrada' });
    }

    await PatientEvaluation.findByIdAndDelete(id);

    res.json({
      message: 'Avaliação de paciente deletada com sucesso',
      patientEvaluation: {
        id: patientEvaluation._id,
        patientId: patientEvaluation.patientId,
        templateId: patientEvaluation.templateId,
        filledDate: patientEvaluation.filledDate
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao deletar avaliação de paciente', error });
  }
});

export default router;
