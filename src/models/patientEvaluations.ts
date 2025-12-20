import mongoose, { Schema, Document } from 'mongoose';
import { IEvaluationField, FieldType } from './evaluationTemplate';

// Enum for evaluation status
export enum EvaluationStatus {
  DRAFT = 'draft',
  COMPLETED = 'completed'
}

// Interface for answer subdocument
export interface IPatientEvaluationAnswer {
  fieldLabel: string;
  value: string;
}

// Interface for template snapshot
export interface IEvaluationTemplateSnapshot {
  templateName: string;
  templateDescription?: string;
  fields: IEvaluationField[];
  categories: mongoose.Types.ObjectId[];
}

// Interface for TypeScript typing
export interface IPatientEvaluation extends Document {
  patientId: mongoose.Types.ObjectId;
  templateId: mongoose.Types.ObjectId;
  templateSnapshot: IEvaluationTemplateSnapshot;
  answers: IPatientEvaluationAnswer[];
  filledDate: Date;
  status: EvaluationStatus;
  completedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Answer subdocument schema
const AnswerSchema = new Schema({
  fieldLabel: { type: String, required: true },
  value: { type: String, required: true }
}, { _id: false });

// Field schema for template snapshot (replicating from evaluationTemplate)
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
const EvaluationTemplateSnapshotSchema = new Schema({
  templateName: { type: String, required: true },
  templateDescription: { type: String, required: false },
  fields: {
    type: [FieldSchema],
    required: true,
    validate: {
      validator: (v: any[]) => Array.isArray(v) && v.length > 0,
      message: 'Template snapshot must have at least one field'
    }
  },
  categories: [{
    type: Schema.Types.ObjectId,
    ref: 'ExerciseCategory'
  }]
}, { _id: false });

// Mongoose schema definition
const PatientEvaluationSchema: Schema = new Schema(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'EvaluationTemplate',
      required: true
    },
    templateSnapshot: {
      type: EvaluationTemplateSnapshotSchema,
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
      enum: Object.values(EvaluationStatus),
      default: EvaluationStatus.DRAFT
    },
    completedDate: {
      type: Date,
      required: false
    }
  },
  { timestamps: true }
);

// Indexes for performance
PatientEvaluationSchema.index({ patientId: 1, status: 1 });
PatientEvaluationSchema.index({ templateId: 1 });
PatientEvaluationSchema.index({ filledDate: -1 });

// Export the model
export default mongoose.model<IPatientEvaluation>('PatientEvaluation', PatientEvaluationSchema);
