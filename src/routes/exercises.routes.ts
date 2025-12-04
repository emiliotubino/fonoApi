import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { Router, Request, Response } from 'express';
import Exercises, { ExerciseTypes } from '../models/exercises';
import ExerciseCategories from '../models/exerciseCategories';

const router = Router();

// GET /exercises/types - Get list of exercise types enum
router.get('/types', authMiddleware, requireRole(['superadmin', 'patient']), async (req: AuthRequest, res: Response) => {
  try {
    const types = Object.values(ExerciseTypes);
    res.json(types);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar tipos de exercício', error });
  }
});

// GET /exercises - List all exercises with populated categories
router.get('/', authMiddleware, requireRole(['superadmin', 'patient']), async (req: AuthRequest, res: Response) => {
  try {
    const exercises = await Exercises.find().populate('categories');
    res.json(exercises);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar exercícios', error });
  }
});

// GET /exercises/:id - Get single exercise by ID with populated categories
router.get('/:id', authMiddleware, requireRole(['superadmin', 'patient']), async (req: AuthRequest, res: Response) => {
  try {
    const exercise = await Exercises.findById(req.params.id).populate('categories');
    if (!exercise) {
      return res.status(404).json({ message: 'Exercício não encontrado' });
    }
    res.json(exercise);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar exercício', error });
  }
});

// POST /exercises - Create new exercise (superadmin only)
router.post('/', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, link, description, categories } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Nome é obrigatório' });
    }
    if (!type) {
      return res.status(400).json({ message: 'Tipo é obrigatório' });
    }

    // Validate enum value
    if (!Object.values(ExerciseTypes).includes(type)) {
      return res.status(400).json({
        message: 'Tipo inválido. Valores permitidos: isometric, isotonic, read, custom'
      });
    }

    // Validate that categories exist if provided
    if (categories && Array.isArray(categories) && categories.length > 0) {
      for (const categoryId of categories) {
        const categoryExists = await ExerciseCategories.findById(categoryId);
        if (!categoryExists) {
          return res.status(400).json({ message: `Categoria ${categoryId} não encontrada` });
        }
      }
    }

    const newExercise = new Exercises({ name, type, link, description, categories: categories || [] });
    await newExercise.save();

    // Populate categories before returning
    const populatedExercise = await Exercises.findById(newExercise._id).populate('categories');

    res.status(201).json(populatedExercise);
  } catch (error: any) {
    res.status(500).json({ message: 'Erro ao criar exercício', error });
  }
});

// PUT /exercises/:id - Update exercise (superadmin only)
router.put('/:id', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, link, description, categories } = req.body;

    // Validate required fields if provided
    if (name !== undefined && !name) {
      return res.status(400).json({ message: 'Nome não pode ser vazio' });
    }
    if (type !== undefined && !type) {
      return res.status(400).json({ message: 'Tipo não pode ser vazio' });
    }

    // Validate enum value if type is being updated
    if (type && !Object.values(ExerciseTypes).includes(type)) {
      return res.status(400).json({
        message: 'Tipo inválido. Valores permitidos: isometric, isotonic, read, custom'
      });
    }

    // Validate that categories exist if being updated
    if (categories && Array.isArray(categories) && categories.length > 0) {
      for (const categoryId of categories) {
        const categoryExists = await ExerciseCategories.findById(categoryId);
        if (!categoryExists) {
          return res.status(400).json({ message: `Categoria ${categoryId} não encontrada` });
        }
      }
    }

    const updatedExercise = await Exercises.findByIdAndUpdate(
      req.params.id,
      { name, type, link, description, categories },
      { new: true, runValidators: true }
    ).populate('categories');

    if (!updatedExercise) {
      return res.status(404).json({ message: 'Exercício não encontrado' });
    }

    res.json(updatedExercise);
  } catch (error: any) {
    res.status(500).json({ message: 'Erro ao atualizar exercício', error });
  }
});

// DELETE /exercises/:id - Delete exercise (superadmin only)
router.delete('/:id', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
  try {
    const deletedExercise = await Exercises.findByIdAndDelete(req.params.id);

    if (!deletedExercise) {
      return res.status(404).json({ message: 'Exercício não encontrado' });
    }

    res.json({ message: 'Exercício deletado com sucesso', exercise: deletedExercise });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao deletar exercício', error });
  }
});

export default router;
