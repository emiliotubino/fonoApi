import mongoose, { Document, Schema } from 'mongoose';

export interface IExerciseCategory extends Document {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExerciseCategorySchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export default mongoose.model<IExerciseCategory>('ExerciseCategory', ExerciseCategorySchema);
