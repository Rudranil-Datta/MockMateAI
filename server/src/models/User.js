import mongoose from "mongoose";

const profileSchema = new mongoose.Schema(
  {
    experienceLevel: {
      enum: ["beginner", "intermediate", "advanced"],
      trim: true,
      type: String,
    },
    targetRole: {
      maxlength: 100,
      trim: true,
      type: String,
    },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    email: {
      lowercase: true,
      maxlength: 254,
      required: true,
      trim: true,
      type: String,
      unique: true,
    },
    name: {
      maxlength: 100,
      required: true,
      trim: true,
      type: String,
    },
    passwordHash: {
      required: true,
      select: false,
      type: String,
    },
    profile: {
      default: () => ({}),
      type: profileSchema,
    },
  },
  { timestamps: true },
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
