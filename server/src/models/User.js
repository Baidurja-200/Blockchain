import mongoose from "mongoose";
import bcrypt from "bcryptjs";

export const ROLES = [
  "Procurement Officer",
  "Warehouse Officer",
  "Finance Officer",
  "Vendor",
  "Auditor",
];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true },
    company: { type: String, default: "" },
    avatarColor: { type: String, default: "#6366f1" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    company: this.company,
    avatarColor: this.avatarColor,
  };
};

export default mongoose.model("User", userSchema);
