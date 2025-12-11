import mongoose, { Schema, Document } from 'mongoose';

// Enum for training status with Portuguese translations
export enum TrainingStatus {
  INCOMPLETED = 'incompleted',
  COMPLETED = 'completed'
}

// Interface for TypeScript typing
export interface IPatientTraining extends Document {
  patientId: mongoose.Types.ObjectId;
  trainingId: mongoose.Types.ObjectId;
  assignedDate: Date;
  scheduledDate: Date;
  status: TrainingStatus;
  completedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose schema definition
const PatientTrainingSchema: Schema = new Schema(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    trainingId: {
      type: Schema.Types.ObjectId,
      ref: 'Training',
      required: true
    },
    assignedDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    scheduledDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(TrainingStatus),
      default: TrainingStatus.INCOMPLETED
    },
    completedDate: {
      type: Date,
      required: false
    }
  },
  { timestamps: true }
);

// Export the model
export default mongoose.model<IPatientTraining>('PatientTraining', PatientTrainingSchema);
