import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { Router, Request, Response } from 'express';
import ExerciseCategories from '../models/exerciseCategories';

const router = Router();

// GET /exercise-categories - List all categories
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const categories = await ExerciseCategories.find();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar categorias de exercício', error });
  }
});

// GET /exercise-categories/:id - Get single category by ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const category = await ExerciseCategories.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Categoria de exercício não encontrada' });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar categoria de exercício', error });
  }
});

// POST /exercise-categories - Create new category
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Nome é obrigatório' });
    }

    const newCategory = new ExerciseCategories({ name });
    await newCategory.save();

    res.status(201).json(newCategory);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Categoria de exercício com este nome já existe' });
    }
    res.status(500).json({ message: 'Erro ao criar categoria de exercício', error });
  }
});

// PUT /exercise-categories/:id - Update category
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Nome é obrigatório' });
    }

    const updatedCategory = await ExerciseCategories.findByIdAndUpdate(
      req.params.id,
      { name },
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ message: 'Categoria de exercício não encontrada' });
    }

    res.json(updatedCategory);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Categoria de exercício com este nome já existe' });
    }
    res.status(500).json({ message: 'Erro ao atualizar categoria de exercício', error });
  }
});

// DELETE /exercise-categories/:id - Delete category
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const deletedCategory = await ExerciseCategories.findByIdAndDelete(req.params.id);

    if (!deletedCategory) {
      return res.status(404).json({ message: 'Categoria de exercício não encontrada' });
    }

    res.json({ message: 'Categoria de exercício deletada com sucesso', category: deletedCategory });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao deletar categoria de exercício', error });
  }
});

export default router;
