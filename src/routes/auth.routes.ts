import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Users from '../models/users';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'chave_secreta';

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

export default router;
