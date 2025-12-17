import mongoose, { Schema, Document } from 'mongoose';

// Enum for field types
export enum FieldType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  SELECT = 'select',
  DATE = 'date',
  TIME = 'time'
}

// Interface for field subdocument
export interface IAnamnesisField {
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[];    // For checkbox, radio, select
  order: number;         // Field display order
}

// Interface for main document
export interface IAnamnesisTemplate extends Document {
  name: string;
  description?: string;
  fields: IAnamnesisField[];
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
const AnamnesisTemplateSchema = new Schema({
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
  isActive: { type: Boolean, required: true, default: true }
}, { timestamps: true });

// Export the model
export default mongoose.model<IAnamnesisTemplate>('AnamnesisTemplate', AnamnesisTemplateSchema);
