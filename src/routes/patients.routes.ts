import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { Router, Response } from 'express';
import User from '../models/users';
import { generateRandomPassword } from '../utils/generatePassword';

const router = Router();

// GET /patients - List all patients (superadmin only)
router.get('/', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
  try {
    const patients = await User.find({ role: 'patient' }).select('-password');
    res.json(patients);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar pacientes', error });
  }
});

// GET /patients/:id - Get single patient by ID (superadmin only)
router.get('/:id', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
  try {
    const patient = await User.findById(req.params.id).select('-password');

    if (!patient) {
      return res.status(404).json({ message: 'Paciente não encontrado' });
    }

    // Verificar se realmente é um patient
    if (patient.role !== 'patient') {
      return res.status(400).json({ message: 'Usuário não é um paciente' });
    }

    res.json(patient);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar paciente', error });
  }
});

// POST /patients - Create new patient (superadmin only)
router.post('/', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
  try {
    let { firstName, lastName, email, password, birth, phone, emergencyPhone, cpf, homeAddress } = req.body;

    // Validar campos obrigatórios (password não é mais obrigatório)
    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        message: 'Campos obrigatórios: firstName, lastName, email'
      });
    }

    // Gerar senha aleatória se não foi fornecida
    let generatedPassword: string | undefined = undefined;
    if (!password) {
      password = generateRandomPassword();
      generatedPassword = password;
    }

    // Criar patient com role forçado
    const newPatient = new User({
      firstName,
      lastName,
      email,
      password,
      role: 'patient',  // Sempre patient, mesmo se o body tiver outro valor
      birth,
      phone,
      emergencyPhone,
      cpf,
      homeAddress
    });

    await newPatient.save();

    // Retornar sem password do banco, mas com senha gerada se aplicável
    const patientResponse: any = await User.findById(newPatient._id).select('-password');

    // Incluir senha gerada na resposta se foi criada automaticamente
    if (generatedPassword) {
      const responseWithPassword = patientResponse.toObject();
      responseWithPassword.generatedPassword = generatedPassword;
      return res.status(201).json(responseWithPassword);
    }

    res.status(201).json(patientResponse);
  } catch (error: any) {
    // Erro de email duplicado
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email já cadastrado' });
    }
    res.status(500).json({ message: 'Erro ao criar paciente', error });
  }
});

// PUT /patients/:id - Update patient (superadmin only)
router.put('/:id', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, lastName, email, password, birth, phone, emergencyPhone, cpf, homeAddress } = req.body;

    // Buscar patient existente
    const patient = await User.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({ message: 'Paciente não encontrado' });
    }

    // Verificar se é realmente um patient
    if (patient.role !== 'patient') {
      return res.status(400).json({ message: 'Usuário não é um paciente' });
    }

    // Validar campos se fornecidos
    if (firstName !== undefined && !firstName) {
      return res.status(400).json({ message: 'firstName não pode ser vazio' });
    }
    if (lastName !== undefined && !lastName) {
      return res.status(400).json({ message: 'lastName não pode ser vazio' });
    }
    if (email !== undefined && !email) {
      return res.status(400).json({ message: 'email não pode ser vazio' });
    }
    if (password !== undefined && !password) {
      return res.status(400).json({ message: 'password não pode ser vazio' });
    }

    // Atualizar campos fornecidos
    if (firstName !== undefined) patient.firstName = firstName;
    if (lastName !== undefined) patient.lastName = lastName;
    if (email !== undefined) patient.email = email;
    if (password !== undefined) patient.password = password;
    if (birth !== undefined) patient.birth = birth;
    if (phone !== undefined) patient.phone = phone;
    if (emergencyPhone !== undefined) patient.emergencyPhone = emergencyPhone;
    if (cpf !== undefined) patient.cpf = cpf;
    if (homeAddress !== undefined) patient.homeAddress = homeAddress;

    // Garantir que role permanece 'patient'
    patient.role = 'patient';

    await patient.save();

    // Retornar sem password
    const updatedPatient = await User.findById(patient._id).select('-password');

    res.json(updatedPatient);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email já cadastrado' });
    }
    res.status(500).json({ message: 'Erro ao atualizar paciente', error });
  }
});

// DELETE /patients/:id - Delete patient (superadmin only)
router.delete('/:id', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
  try {
    const patient = await User.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({ message: 'Paciente não encontrado' });
    }

    // Verificar se é realmente um patient
    if (patient.role !== 'patient') {
      return res.status(400).json({ message: 'Usuário não é um paciente' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Paciente deletado com sucesso',
      patient: {
        id: patient._id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao deletar paciente', error });
  }
});

export default router;
