import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { Router, Request, Response } from 'express';
import Users from '../models/users';
const router = Router();

// rotas de usuário
// users/...

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await Users.findById(req.user.id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar usuário', error });
  }
});

export default router;