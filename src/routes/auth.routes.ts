import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Users from '../models/users';
import bcrypt from 'bcryptjs';
const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'chave_secreta';

// rotas de autenticação
// auth/...

// Rota de login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // verificar usuário
    const user = await Users.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Usuário não encontrado' });

    // verificar senha
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Senha inválida' });

    // gerar token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });

    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: 'Erro no login', error });
  }
});

// Criar usuário
router.post("/signup", async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // verifica se já existe usuário
    const existingUser = await Users.findOne({ email });
    if (existingUser) {
    return res.status(400).json({ message: "E-mail já cadastrado" });
    }

    // criptografa senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // cria usuário
    const newUser = new Users({
      name,
      email,
      password: hashedPassword
    });

    await newUser.save();

    // gerar token
    const token = jwt.sign({ id: newUser._id }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({ user: { id: newUser._id, name: newUser.name, email: newUser.email, token: token } });
  } catch (err) {
    res.status(500).json({ message: "Erro ao criar usuário", error: err });
  }
});

export default router;
