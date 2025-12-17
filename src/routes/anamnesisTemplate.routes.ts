import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import AnamnesisTemplate, { FieldType } from '../models/anamnesisTemplate';

const router = Router();

// GET all anamnesis templates
router.get('/', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
  try {
    const { isActive, search } = req.query;

    // Build query based on filters
    const query: any = {};

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (search && typeof search === 'string') {
      query.name = { $regex: search, $options: 'i' };
    }

    const templates = await AnamnesisTemplate.find(query).sort({ name: 1 });

    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar templates de anamnese', error });
  }
});

// GET single anamnesis template by ID
router.get('/:id', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const template = await AnamnesisTemplate.findById(id);

    if (!template) {
      return res.status(404).json({ message: 'Template de anamnese não encontrado' });
    }

    res.json(template);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar template de anamnese', error });
  }
});

// POST create new anamnesis template
router.post('/', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, fields, isActive } = req.body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ message: 'Campo obrigatório: name (deve ser uma string não vazia)' });
    }

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({ message: 'Campo obrigatório: fields (deve ser um array com pelo menos 1 campo)' });
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
    const template = new AnamnesisTemplate({
      name,
      description,
      fields,
      isActive: isActive !== undefined ? isActive : true
    });

    await template.save();

    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar template de anamnese', error });
  }
});

// PUT update anamnesis template
router.put('/:id', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, fields, isActive } = req.body;

    // Find existing template
    const template = await AnamnesisTemplate.findById(id);

    if (!template) {
      return res.status(404).json({ message: 'Template de anamnese não encontrado' });
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

    // Return updated template
    const updatedTemplate = await AnamnesisTemplate.findById(template._id);

    res.json(updatedTemplate);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar template de anamnese', error });
  }
});

// DELETE anamnesis template
router.delete('/:id', authMiddleware, requireRole(['superadmin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const template = await AnamnesisTemplate.findById(id);

    if (!template) {
      return res.status(404).json({ message: 'Template de anamnese não encontrado' });
    }

    await AnamnesisTemplate.findByIdAndDelete(id);

    res.json({
      message: 'Template de anamnese deletado com sucesso',
      template: {
        id: template._id,
        name: template.name
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao deletar template de anamnese', error });
  }
});

export default router;
