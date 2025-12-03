import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { Router, Request, Response } from 'express';
import Trainings from '../models/trainings';
import Exercises from '../models/exercises';

const router = Router();

// GET /trainings - List all trainings with populated exercises and categories
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const trainings = await Trainings.find()
      .populate('exercises')
      .populate('categories');
    res.json(trainings);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar treinamentos', error });
  }
});

// GET /trainings/:id - Get single training by ID with populated data
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const training = await Trainings.findById(req.params.id)
      .populate('exercises')
      .populate('categories');

    if (!training) {
      return res.status(404).json({ message: 'Treinamento não encontrado' });
    }

    res.json(training);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar treinamento', error });
  }
});

// POST /trainings - Create new training
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, exercises } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Nome é obrigatório' });
    }

    // Validate exercises is an array
    if (exercises && !Array.isArray(exercises)) {
      return res.status(400).json({ message: 'Exercícios devem ser um array' });
    }

    // Validate that all exercises exist if provided
    if (exercises && exercises.length > 0) {
      for (const exerciseId of exercises) {
        const exerciseExists = await Exercises.findById(exerciseId);
        if (!exerciseExists) {
          return res.status(400).json({ message: `Exercício ${exerciseId} não encontrado` });
        }
      }
    }

    // Create new training (pre-save hook will compute categories)
    const newTraining = new Trainings({ name, exercises: exercises || [] });
    await newTraining.save();

    // Populate and return
    const populatedTraining = await Trainings.findById(newTraining._id)
      .populate('exercises')
      .populate('categories');

    res.status(201).json(populatedTraining);
  } catch (error: any) {
    res.status(500).json({ message: 'Erro ao criar treinamento', error });
  }
});

// PUT /trainings/:id - Update training
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, exercises } = req.body;

    // Find existing training
    const training = await Trainings.findById(req.params.id);

    if (!training) {
      return res.status(404).json({ message: 'Treinamento não encontrado' });
    }

    // Validate name if provided
    if (name !== undefined && !name) {
      return res.status(400).json({ message: 'Nome não pode ser vazio' });
    }

    // Validate exercises if provided
    if (exercises !== undefined) {
      if (!Array.isArray(exercises)) {
        return res.status(400).json({ message: 'Exercícios devem ser um array' });
      }

      // Validate all exercises exist
      if (exercises.length > 0) {
        for (const exerciseId of exercises) {
          const exerciseExists = await Exercises.findById(exerciseId);
          if (!exerciseExists) {
            return res.status(400).json({ message: `Exercício ${exerciseId} não encontrado` });
          }
        }
      }
    }

    // Update fields
    if (name !== undefined) training.name = name;
    if (exercises !== undefined) training.exercises = exercises;

    // Save (triggers pre-save hook to recompute categories)
    await training.save();

    // Populate and return
    const populatedTraining = await Trainings.findById(training._id)
      .populate('exercises')
      .populate('categories');

    res.json(populatedTraining);
  } catch (error: any) {
    res.status(500).json({ message: 'Erro ao atualizar treinamento', error });
  }
});

// DELETE /trainings/:id - Delete training
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const deletedTraining = await Trainings.findByIdAndDelete(req.params.id);

    if (!deletedTraining) {
      return res.status(404).json({ message: 'Treinamento não encontrado' });
    }

    res.json({ message: 'Treinamento deletado com sucesso', training: deletedTraining });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao deletar treinamento', error });
  }
});

export default router;
