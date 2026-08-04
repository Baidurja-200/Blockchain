import mongoose from "mongoose";

const grnSchema = new mongoose.Schema(
  {
    grnNumber: { type: String, required: true, unique: true },
    purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder", required: true },
    poNumber: { type: String, required: true },
    quantityReceived: { type: Number, required: true, min: 0 },
    warehouseOfficer: { type: String, required: true },
    remarks: { type: String, default: "" },

    // Anomaly flags. We deliberately RECORD these rather than blocking the
    // entry — the system's job is to detect and surface irregularities, not
    // to assume a warehouse officer can never collude or make a mistake.
    isOverReceipt: { type: Boolean, default: false },
    overReceiptBy: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    blockId: { type: Number, default: null },
    txHash: { type: String, default: null },
    blockTimestamp: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("GRN", grnSchema);
