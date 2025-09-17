import { Router, Request, Response } from 'express';

const router = Router();

// rota GET simples
router.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Rota de exemplo funcionando!' });
});

// rota POST simples
router.post('/', (req: Request, res: Response) => {
  const data = req.body;
  res.json({ message: 'Dados recebidos', data });
});

export default router;
