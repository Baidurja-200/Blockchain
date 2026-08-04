import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["PO_CREATED", "PO_AMENDED", "GRN_CREATED", "INVOICE_UPLOADED", "INVOICE_APPROVED", "INVOICE_REJECTED", "PAYMENT_RELEASED", "FRAUD_FLAGGED"],
      required: true,
    },
    message: { type: String, required: true },
    actor: { type: String, default: "System" },
    referenceId: { type: String, default: "" },
    severity: { type: String, enum: ["info", "success", "warning", "danger"], default: "info" },
  },
  { timestamps: true }
);

export default mongoose.model("ActivityLog", activityLogSchema);
