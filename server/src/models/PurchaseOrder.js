import mongoose from "mongoose";

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: { type: String, required: true, unique: true },
    vendor: { type: String, required: true },
    product: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    deliveryDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["Open", "Partially Received", "Closed", "Cancelled"],
      default: "Open",
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Blockchain anchoring
    blockId: { type: Number, default: null },
    txHash: { type: String, default: null },
    blockTimestamp: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("PurchaseOrder", purchaseOrderSchema);
