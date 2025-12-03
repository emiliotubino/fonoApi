import mongoose, { Document, Schema } from 'mongoose';

export enum ExerciseTypes {
  ISOMETRIC = 'isométrico',
  ISOTONIC = 'isotônico',
  READ = 'leitura',
  CUSTOM = 'customizado'
}

export interface IExercise extends Document {
  name: string;
  type: ExerciseTypes;
  link?: string;
  description?: string;
  categories: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const ExerciseSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: Object.values(ExerciseTypes)
    },
    link: { type: String, required: false },
    description: { type: String, required: false },
    categories: [{
      type: Schema.Types.ObjectId,
      ref: 'ExerciseCategory'
    }]
  },
  { timestamps: true }
);

export default mongoose.model<IExercise>('Exercise', ExerciseSchema);
