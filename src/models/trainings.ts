import mongoose, { Document, Schema } from 'mongoose';
import Exercise from './exercises';

export interface ITraining extends Document {
  name: string;
  userId?: mongoose.Types.ObjectId;
  exercises: mongoose.Types.ObjectId[];
  categories: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const TrainingSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    exercises: [{
      type: Schema.Types.ObjectId,
      ref: 'Exercise'
    }],
    categories: [{
      type: Schema.Types.ObjectId,
      ref: 'ExerciseCategory'
    }]
  },
  { timestamps: true }
);

// Pre-save hook to auto-compute categories from exercises
TrainingSchema.pre('save', async function(next) {
  if (this.isModified('exercises')) {
    // Fetch all exercises with their categories
    const exercises = await Exercise.find({ _id: { $in: this.exercises } })
      .select('categories');

    // Collect all category IDs from all exercises
    const allCategoryIds = exercises.flatMap(ex => ex.categories);

    // Get unique category IDs using Set
    this.categories = [...new Set(allCategoryIds.map(id => id.toString()))];
  }
  next();
});

export default mongoose.model<ITraining>('Training', TrainingSchema);
