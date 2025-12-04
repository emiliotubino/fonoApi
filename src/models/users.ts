import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'superadmin' | 'patient';
  birth?: Date;
  phone?: string;
  emergencyPhone?: string;
  cpf?: string;
  homeAddress?: {
    city?: string;
    state?: string;
    country?: string;
    street?: string;
    neighborhood?: string;
    complement?: string;
    number?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['superadmin', 'patient'],
      default: 'patient',
      required: true
    },
    birth: { type: Date, required: false },
    phone: { type: String, required: false },
    emergencyPhone: { type: String, required: false },
    cpf: { type: String, required: false },
    homeAddress: {
      type: {
        city: { type: String, required: false },
        state: { type: String, required: false },
        country: { type: String, required: false },
        street: { type: String, required: false },
        neighborhood: { type: String, required: false },
        complement: { type: String, required: false },
        number: { type: String, required: false },
      },
      required: false
    },
  },
  { timestamps: true }
);

// antes de salvar, encriptar senha
UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// método para comparar senha
UserSchema.methods.comparePassword = async function (password: string) {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);