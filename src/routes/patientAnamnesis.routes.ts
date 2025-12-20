import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import PatientAnamnesis, { AnamnesisStatus } from '../models/patientAnamnesis';
import User from '../models/users';
import AnamnesisTemplate from '../models/anamnesisTemplate';

const router = Router();

// GET all anamnesis for a specific patient
router.get('/:patientId/patient-anamnesis', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
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

    const patientAnamnesis = await PatientAnamnesis.find(query)
      .populate('patientId', '-password')
      .populate('templateId', 'name description')
      .sort({ filledDate: -1 });

    res.json(patientAnamnesis);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar anamneses do paciente', error });
  }
});

// GET single patient anamnesis by ID
router.get('/:patientId/patient-anamnesis/:id', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
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

    const patientAnamnesis = await PatientAnamnesis.findOne({ _id: id, patientId })
      .populate('patientId', '-password')
      .populate('templateId', 'name description');

    if (!patientAnamnesis) {
      return res.status(404).json({ message: 'Anamnese de paciente não encontrada' });
    }

    res.json(patientAnamnesis);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar anamnese de paciente', error });
  }
});

// POST create new patient anamnesis
router.post('/:patientId/patient-anamnesis', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
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
    const template = await AnamnesisTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({ message: 'Template de anamnese não encontrado' });
    }
    if (!template.isActive) {
      return res.status(400).json({ message: 'Template de anamnese não está ativo' });
    }

    // Create template snapshot
    const templateSnapshot = {
      templateName: template.name,
      templateDescription: template.description,
      fields: template.fields
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

    // Prepare anamnesis data
    const anamnesisData: any = {
      patientId,
      templateId,
      templateSnapshot,
      answers: answers || [],
      status: status || AnamnesisStatus.DRAFT
    };

    if (filledDate) {
      anamnesisData.filledDate = filledDate;
    }

    // If status is completed, validate all fields have answers and set completedDate
    if (anamnesisData.status === AnamnesisStatus.COMPLETED) {
      const answeredLabels = new Set(anamnesisData.answers.map((a: any) => a.fieldLabel));
      const missingFields = template.fields.filter(f => !answeredLabels.has(f.label));

      if (missingFields.length > 0) {
        return res.status(400).json({
          message: 'Não é possível completar anamnese com campos faltando',
          missingFields: missingFields.map(f => f.label)
        });
      }

      anamnesisData.completedDate = new Date();
    }

    // Create the anamnesis
    const patientAnamnesis = await PatientAnamnesis.create(anamnesisData);

    // Populate and return
    const populatedAnamnesis = await PatientAnamnesis.findById(patientAnamnesis._id)
      .populate('patientId', '-password')
      .populate('templateId', 'name description');

    res.status(201).json(populatedAnamnesis);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar anamnese de paciente', error });
  }
});

// PUT update patient anamnesis
router.put('/:patientId/patient-anamnesis/:id', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
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

    // Find existing patient anamnesis
    const patientAnamnesis = await PatientAnamnesis.findOne({ _id: id, patientId });

    if (!patientAnamnesis) {
      return res.status(404).json({ message: 'Anamnese de paciente não encontrada' });
    }

    // Prevent transition from completed to draft
    if (patientAnamnesis.status === AnamnesisStatus.COMPLETED && status === AnamnesisStatus.DRAFT) {
      return res.status(400).json({
        message: 'Não é possível reverter anamnese completa para rascunho'
      });
    }

    // Update answers if provided
    if (answers !== undefined) {
      // Validate answers against template snapshot
      const fieldLabels = new Set(patientAnamnesis.templateSnapshot.fields.map(f => f.label));
      for (const answer of answers) {
        if (!fieldLabels.has(answer.fieldLabel)) {
          return res.status(400).json({
            message: `Campo "${answer.fieldLabel}" não existe no template`
          });
        }
      }
      patientAnamnesis.answers = answers;
    }

    // Update status if provided
    if (status !== undefined) {
      // Validate status
      if (!Object.values(AnamnesisStatus).includes(status)) {
        return res.status(400).json({
          message: 'Status inválido. Valores permitidos: draft, completed'
        });
      }

      // If changing to completed, validate all fields are answered
      if (status === AnamnesisStatus.COMPLETED) {
        const answeredLabels = new Set(patientAnamnesis.answers.map(a => a.fieldLabel));
        const missingFields = patientAnamnesis.templateSnapshot.fields.filter(f => !answeredLabels.has(f.label));

        if (missingFields.length > 0) {
          return res.status(400).json({
            message: 'Não é possível completar anamnese com campos faltando',
            missingFields: missingFields.map(f => f.label)
          });
        }

        // Auto-set completedDate when status changes to completed
        if (!patientAnamnesis.completedDate) {
          patientAnamnesis.completedDate = new Date();
        }
      }

      patientAnamnesis.status = status;
    }

    if (completedDate !== undefined) {
      patientAnamnesis.completedDate = completedDate;
    }

    await patientAnamnesis.save();

    // Return populated document
    const updatedPatientAnamnesis = await PatientAnamnesis.findById(patientAnamnesis._id)
      .populate('patientId', '-password')
      .populate('templateId', 'name description');

    res.json(updatedPatientAnamnesis);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar anamnese de paciente', error });
  }
});

// DELETE patient anamnesis
router.delete('/:patientId/patient-anamnesis/:id', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
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

    const patientAnamnesis = await PatientAnamnesis.findOne({ _id: id, patientId });

    if (!patientAnamnesis) {
      return res.status(404).json({ message: 'Anamnese de paciente não encontrada' });
    }

    await PatientAnamnesis.findByIdAndDelete(id);

    res.json({
      message: 'Anamnese de paciente deletada com sucesso',
      patientAnamnesis: {
        id: patientAnamnesis._id,
        patientId: patientAnamnesis.patientId,
        templateId: patientAnamnesis.templateId,
        filledDate: patientAnamnesis.filledDate
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao deletar anamnese de paciente', error });
  }
});

export default router;
