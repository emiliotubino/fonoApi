import { Router, Request, Response } from 'express';

const router = Router();

// rota GET simples
// config/...
router.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Rota de exemplo funcionando!' });
});

export default router;
