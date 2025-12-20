import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import EvaluationTemplate, { FieldType } from '../models/evaluationTemplate';
import ExerciseCategory from '../models/exerciseCategories';
import mongoose from 'mongoose';

const router = Router();

// GET all evaluation templates
router.get('/', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
  try {
    const { isActive, search, categoryId } = req.query;

    // Build query based on filters
    const query: any = {};

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (search && typeof search === 'string') {
      query.name = { $regex: search, $options: 'i' };
    }

    if (categoryId) {
      query.categories = categoryId;
    }

    const templates = await EvaluationTemplate.find(query)
      .populate('categories', 'name')
      .sort({ name: 1 });

    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar templates de avaliação', error });
  }
});

// GET single evaluation template by ID
router.get('/:id', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const template = await EvaluationTemplate.findById(id).populate('categories', 'name');

    if (!template) {
      return res.status(404).json({ message: 'Template de avaliação não encontrado' });
    }

    res.json(template);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar template de avaliação', error });
  }
});

// POST create new evaluation template
router.post('/', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, fields, categories, isActive } = req.body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ message: 'Campo obrigatório: name (deve ser uma string não vazia)' });
    }

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({ message: 'Campo obrigatório: fields (deve ser um array com pelo menos 1 campo)' });
    }

    // Validate categories if provided
    if (categories !== undefined) {
      if (!Array.isArray(categories)) {
        return res.status(400).json({ message: 'categories deve ser um array' });
      }

      // Validate that all categories exist
      if (categories.length > 0) {
        for (const categoryId of categories) {
          if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(400).json({ message: `Category ID inválido: ${categoryId}` });
          }

          const categoryExists = await ExerciseCategory.findById(categoryId);
          if (!categoryExists) {
            return res.status(404).json({ message: `Categoria não encontrada: ${categoryId}` });
          }
        }
      }
    }

    // Validate each field
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];

      if (!field.label || typeof field.label !== 'string') {
        return res.status(400).json({ message: `Campo ${i + 1}: label é obrigatório e deve ser uma string` });
      }

      if (!field.type) {
        return res.status(400).json({ message: `Campo ${i + 1}: type é obrigatório` });
      }

      // Validate field type
      if (!Object.values(FieldType).includes(field.type)) {
        return res.status(400).json({
          message: `Campo ${i + 1}: tipo de campo inválido. Valores permitidos: ${Object.values(FieldType).join(', ')}`
        });
      }

      // Validate options for select/radio/checkbox
      if (['select', 'radio', 'checkbox'].includes(field.type)) {
        if (!field.options || !Array.isArray(field.options) || field.options.length === 0) {
          return res.status(400).json({
            message: `Campo ${i + 1}: tipo ${field.type} requer um array de options não vazio`
          });
        }
      }

      // Auto-assign order if not provided
      if (field.order === undefined) {
        field.order = i + 1;
      }
    }

    // Create the template
    const template = new EvaluationTemplate({
      name,
      description,
      fields,
      categories: categories || [],
      isActive: isActive !== undefined ? isActive : true
    });

    await template.save();

    // Populate and return
    const populatedTemplate = await EvaluationTemplate.findById(template._id).populate('categories', 'name');

    res.status(201).json(populatedTemplate);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar template de avaliação', error });
  }
});

// PUT update evaluation template
router.put('/:id', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, fields, categories, isActive } = req.body;

    // Find existing template
    const template = await EvaluationTemplate.findById(id);

    if (!template) {
      return res.status(404).json({ message: 'Template de avaliação não encontrado' });
    }

    // Update name if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ message: 'name deve ser uma string não vazia' });
      }
      template.name = name;
    }

    // Update description if provided
    if (description !== undefined) {
      template.description = description;
    }

    // Update categories if provided
    if (categories !== undefined) {
      if (!Array.isArray(categories)) {
        return res.status(400).json({ message: 'categories deve ser um array' });
      }

      // Validate that all categories exist
      if (categories.length > 0) {
        for (const categoryId of categories) {
          if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(400).json({ message: `Category ID inválido: ${categoryId}` });
          }

          const categoryExists = await ExerciseCategory.findById(categoryId);
          if (!categoryExists) {
            return res.status(404).json({ message: `Categoria não encontrada: ${categoryId}` });
          }
        }
      }

      template.categories = categories;
    }

    // Update fields if provided
    if (fields !== undefined) {
      if (!Array.isArray(fields) || fields.length === 0) {
        return res.status(400).json({ message: 'fields deve ser um array com pelo menos 1 campo' });
      }

      // Validate each field
      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];

        if (!field.label || typeof field.label !== 'string') {
          return res.status(400).json({ message: `Campo ${i + 1}: label é obrigatório e deve ser uma string` });
        }

        if (!field.type) {
          return res.status(400).json({ message: `Campo ${i + 1}: type é obrigatório` });
        }

        // Validate field type
        if (!Object.values(FieldType).includes(field.type)) {
          return res.status(400).json({
            message: `Campo ${i + 1}: tipo de campo inválido. Valores permitidos: ${Object.values(FieldType).join(', ')}`
          });
        }

        // Validate options for select/radio/checkbox
        if (['select', 'radio', 'checkbox'].includes(field.type)) {
          if (!field.options || !Array.isArray(field.options) || field.options.length === 0) {
            return res.status(400).json({
              message: `Campo ${i + 1}: tipo ${field.type} requer um array de options não vazio`
            });
          }
        }

        // Auto-assign order if not provided
        if (field.order === undefined) {
          field.order = i + 1;
        }
      }

      template.fields = fields;
    }

    // Update isActive if provided
    if (isActive !== undefined) {
      template.isActive = isActive;
    }

    await template.save();

    // Return updated template with populated categories
    const updatedTemplate = await EvaluationTemplate.findById(template._id).populate('categories', 'name');

    res.json(updatedTemplate);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar template de avaliação', error });
  }
});

// DELETE evaluation template
router.delete('/:id', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const template = await EvaluationTemplate.findById(id);

    if (!template) {
      return res.status(404).json({ message: 'Template de avaliação não encontrado' });
    }

    await EvaluationTemplate.findByIdAndDelete(id);

    res.json({
      message: 'Template de avaliação deletado com sucesso',
      template: {
        id: template._id,
        name: template.name
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao deletar template de avaliação', error });
  }
});

export default router;
