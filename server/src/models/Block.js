import mongoose from "mongoose";

const blockSchema = new mongoose.Schema(
  {
    blockNumber: { type: Number, required: true, unique: true },
    previousHash: { type: String, required: true },
    hash: { type: String, required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    transactionType: {
      type: String,
      enum: ["PURCHASE_ORDER", "PO_AMENDED", "GRN", "INVOICE", "VALIDATION", "PAYMENT", "GENESIS"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Confirmed", "Pending", "Failed"],
      default: "Confirmed",
    },
    referenceId: { type: String, default: "" }, // e.g. PO number / Invoice number
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    nonce: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Block", blockSchema);
