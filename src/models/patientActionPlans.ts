import mongoose, { Schema, Document } from 'mongoose';

// Enum for action plan status
export enum ActionPlanStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed'
}

// Interface for TypeScript typing
export interface IPatientActionPlan extends Document {
  patientId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  diagnosis: string;
  planDescription: string;
  status: ActionPlanStatus;
  trainings: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose schema definition
const PatientActionPlanSchema: Schema = new Schema(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator: function(this: IPatientActionPlan, value: Date) {
          return value > this.startDate;
        },
        message: 'Data de fim deve ser posterior à data de início'
      }
    },
    diagnosis: {
      type: String,
      required: true
    },
    planDescription: {
      type: String,
      required: true
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(ActionPlanStatus),
      default: ActionPlanStatus.IN_PROGRESS
    },
    trainings: [{
      type: Schema.Types.ObjectId,
      ref: 'PatientTraining',
      default: []
    }]
  },
  { timestamps: true }
);

// Pre-save hook to auto-populate trainings array when status becomes 'completed'
PatientActionPlanSchema.pre<IPatientActionPlan>('save', async function(next) {
  // Only run this logic if status is being modified to 'completed'
  if (this.isModified('status') && this.status === ActionPlanStatus.COMPLETED) {
    try {
      // Import PatientTraining model
      const PatientTraining = mongoose.model('PatientTraining');

      // Query completed trainings for this patient within date range
      const completedTrainings = await PatientTraining.find({
        patientId: this.patientId,
        status: 'completed',
        completedDate: {
          $gte: this.startDate,
          $lte: this.endDate
        }
      }).select('_id');

      // Extract IDs and populate the trainings array
      this.trainings = completedTrainings.map(training => training._id);

      next();
    } catch (error) {
      next(error as Error);
    }
  } else {
    next();
  }
});

// Indexes for performance
PatientActionPlanSchema.index({ patientId: 1, status: 1 });
PatientActionPlanSchema.index({ startDate: -1 });
PatientActionPlanSchema.index({ endDate: -1 });
PatientActionPlanSchema.index({ patientId: 1, startDate: -1 });

// Export the model
export default mongoose.model<IPatientActionPlan>('PatientActionPlan', PatientActionPlanSchema);
