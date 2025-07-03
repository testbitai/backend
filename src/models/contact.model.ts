import mongoose, { Document, Model, Schema } from "mongoose";

export interface ContactDocument extends Document {
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<ContactDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

const ContactModel: Model<ContactDocument> = mongoose.model<ContactDocument>(
  "Contact",
  contactSchema
);

export default ContactModel;
