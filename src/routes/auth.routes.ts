import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Users from '../models/users';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'chave_secreta';

// rotas de autenticação
// auth/...

// Rota de signup
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, password, birth, phone, emergencyPhone, cpf, homeAddress } = req.body;
    console.log(firstName, lastName, email, password, birth, phone, emergencyPhone, cpf, homeAddress);
    // validar campos obrigatórios
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'Nome, email e senha são obrigatórios' });
    }

    // verificar se usuário já existe
    const existingUser = await Users.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email já cadastrado' });
    }

    // criar novo usuário (senha será hasheada automaticamente pelo pre-save hook)
    const user = new Users({ firstName, lastName, email, password, birth, phone, emergencyPhone, cpf, homeAddress });
    await user.save();

    // gerar token com role
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        birth: user.birth,
        phone: user.phone,
        emergencyPhone: user.emergencyPhone,
        cpf: user.cpf,
        homeAddress: user.homeAddress
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Erro ao criar usuário', error });
  }
});

// Rota de login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    console.log(email, password);
    // verificar usuário
    const user = await Users.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Usuário não encontrado' });

    // verificar senha
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Senha inválida' });

    // gerar token com role
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        birth: user.birth,
        phone: user.phone,
        emergencyPhone: user.emergencyPhone,
        cpf: user.cpf,
        homeAddress: user.homeAddress
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro no login', error });
  }
});

// Rota para validar token (apenas verifica se o token é válido)
router.get('/validate', authMiddleware, (req: AuthRequest, res: Response) => {
  // Se chegou aqui, o token é válido (authMiddleware já validou)
  res.json({ valid: true, userId: req.user?.id });
});

// Rota para validar token e retornar dados do usuário autenticado
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await Users.findById(req.user?.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    res.json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        birth: user.birth,
        phone: user.phone,
        emergencyPhone: user.emergencyPhone,
        cpf: user.cpf,
        homeAddress: user.homeAddress
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar dados do usuário', error });
  }
});

export default router;
