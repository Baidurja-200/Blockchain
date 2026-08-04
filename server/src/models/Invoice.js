import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder" },
    poNumber: { type: String, required: true },
    grn: { type: mongoose.Schema.Types.ObjectId, ref: "GRN" },
    grnNumber: { type: String, default: "" },
    vendor: { type: String, required: true },
    invoiceAmount: { type: Number, required: true, min: 0 },
    fileName: { type: String, default: "" },
    filePath: { type: String, default: "" },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Manual Review"],
      default: "Pending",
    },

    // Three-way match validation results
    validation: {
      poExists: { type: Boolean, default: false },
      grnExists: { type: Boolean, default: false },
      duplicateInvoice: { type: Boolean, default: false },
      amountMatches: { type: Boolean, default: false },
      quantitySufficient: { type: Boolean, default: false },
      passed: { type: Boolean, default: false },
      steps: { type: Array, default: [] }, // ordered step log for animation replay
    },

    // Fraud detection results
    fraud: {
      score: { type: Number, default: 0 }, // 0-100
      level: { type: String, enum: ["Low", "Medium", "High"], default: "Low" },
      reasons: { type: [String], default: [] },
      recommendation: {
        type: String,
        enum: ["Approve", "Manual Review", "Reject"],
        default: "Approve",
      },
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    paymentStatus: { type: String, enum: ["Unpaid", "Pending", "Paid"], default: "Unpaid" },

    blockId: { type: Number, default: null },
    txHash: { type: String, default: null },
    blockTimestamp: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Invoice", invoiceSchema);
