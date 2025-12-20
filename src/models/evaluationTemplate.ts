import mongoose, { Schema, Document } from 'mongoose';

// Import FieldType from anamnesisTemplate for reusability
export { FieldType } from './anamnesisTemplate';
import { FieldType } from './anamnesisTemplate';

// Interface for field subdocument (same as anamnesis)
export interface IEvaluationField {
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[];    // For checkbox, radio, select
  order: number;         // Field display order
}

// Interface for main document
export interface IEvaluationTemplate extends Document {
  name: string;
  description?: string;
  fields: IEvaluationField[];
  categories: mongoose.Types.ObjectId[];  // References to ExerciseCategory
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Field subdocument schema
const FieldSchema = new Schema({
  label: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: Object.values(FieldType)
  },
  placeholder: { type: String, required: false },
  options: [{ type: String }],
  order: { type: Number, required: true }
}, { _id: false });

// Main schema
const EvaluationTemplateSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: false },
  fields: {
    type: [FieldSchema],
    required: true,
    validate: {
      validator: (v: any[]) => Array.isArray(v) && v.length > 0,
      message: 'Template must have at least one field'
    }
  },
  categories: [{
    type: Schema.Types.ObjectId,
    ref: 'ExerciseCategory'
  }],
  isActive: { type: Boolean, required: true, default: true }
}, { timestamps: true });

// Export the model
export default mongoose.model<IEvaluationTemplate>('EvaluationTemplate', EvaluationTemplateSchema);
