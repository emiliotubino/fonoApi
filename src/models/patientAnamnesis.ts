import mongoose, { Schema, Document } from 'mongoose';
import { IAnamnesisField, FieldType } from './anamnesisTemplate';

// Enum for anamnesis status
export enum AnamnesisStatus {
  DRAFT = 'draft',
  COMPLETED = 'completed'
}

// Interface for answer subdocument
export interface IPatientAnamnesisAnswer {
  fieldLabel: string;
  value: string;
}

// Interface for template snapshot
export interface ITemplateSnapshot {
  templateName: string;
  templateDescription?: string;
  fields: IAnamnesisField[];
}

// Interface for TypeScript typing
export interface IPatientAnamnesis extends Document {
  patientId: mongoose.Types.ObjectId;
  templateId: mongoose.Types.ObjectId;
  templateSnapshot: ITemplateSnapshot;
  answers: IPatientAnamnesisAnswer[];
  filledDate: Date;
  status: AnamnesisStatus;
  completedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Answer subdocument schema
const AnswerSchema = new Schema({
  fieldLabel: { type: String, required: true },
  value: { type: String, required: true }
}, { _id: false });

// Field schema for template snapshot (replicating from anamnesisTemplate)
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

// Template snapshot subdocument schema
const TemplateSnapshotSchema = new Schema({
  templateName: { type: String, required: true },
  templateDescription: { type: String, required: false },
  fields: {
    type: [FieldSchema],
    required: true,
    validate: {
      validator: (v: any[]) => Array.isArray(v) && v.length > 0,
      message: 'Template snapshot must have at least one field'
    }
  }
}, { _id: false });

// Mongoose schema definition
const PatientAnamnesisSchema: Schema = new Schema(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'AnamnesisTemplate',
      required: true
    },
    templateSnapshot: {
      type: TemplateSnapshotSchema,
      required: true
    },
    answers: {
      type: [AnswerSchema],
      required: true,
      default: []
    },
    filledDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(AnamnesisStatus),
      default: AnamnesisStatus.DRAFT
    },
    completedDate: {
      type: Date,
      required: false
    }
  },
  { timestamps: true }
);

// Indexes for performance
PatientAnamnesisSchema.index({ patientId: 1, status: 1 });
PatientAnamnesisSchema.index({ templateId: 1 });
PatientAnamnesisSchema.index({ filledDate: -1 });

// Export the model
export default mongoose.model<IPatientAnamnesis>('PatientAnamnesis', PatientAnamnesisSchema);
