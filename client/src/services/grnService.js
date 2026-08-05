import api from "./api";
import { MOCK_GRNS, MOCK_POS, appendMockBlock, saveMockState } from "./mockData";

export const listGRNs = () => api.get("/grns").then((r) => r.data.grns).catch(() => MOCK_GRNS);
export const createGRN = (payload) =>
  api
    .post("/grns", payload)
    .then((r) => r.data.grn)
    .catch(() => {
      const grnNumber = "GRN-" + Math.floor(1000 + Math.random() * 9000);
      const receivedQuantity = Number(payload.quantityReceived ?? payload.receivedQuantity ?? 0);

      const poObj = MOCK_POS.find((p) => p.poNumber === payload.poNumber);
      const priorGrns = MOCK_GRNS.filter((g) => g.poNumber === payload.poNumber && g.status !== "REJECTED");
      const alreadyReceived = priorGrns.reduce((sum, g) => sum + (Number(g.receivedQuantity ?? g.quantityReceived) || 0), 0);
      const poQuantity = poObj ? Number(poObj.quantity) : 0;
      const remaining = poQuantity - alreadyReceived;

      // On-chain restriction: if received quantity exceeds remaining PO quantity, REJECT on-chain!
      if (!poObj || receivedQuantity > Math.max(remaining, 0) || receivedQuantity <= 0) {
        const rejectionBlock = appendMockBlock("GRN_REJECTED", grnNumber, {
          grnNumber,
          poNumber: payload.poNumber,
          receivedQuantity,
          poQuantity,
          alreadyReceived,
          status: "REJECTED",
          reason: !poObj
            ? `Purchase order ${payload.poNumber} not found.`
            : `Over-receipt restriction: Receiving ${receivedQuantity} units exceeds remaining PO quantity (${remaining} units remaining of ${poQuantity} ordered).`,
        });

        const errorMsg = !poObj
          ? `Blockchain Validation Error: Purchase order ${payload.poNumber} not found. Smart contract rejected transaction.`
          : `Blockchain Validation Error: Transaction Restricted. Receiving ${receivedQuantity} units exceeds remaining PO quantity (${remaining} units remaining of ${poQuantity} ordered). Smart contract rejected this transaction (Mined Block #${rejectionBlock.blockNumber}).`;

        const err = new Error(errorMsg);
        err.response = {
          data: {
            message: errorMsg,
            blockNumber: rejectionBlock.blockNumber,
          },
        };
        throw err;
      }

      const newBlock = appendMockBlock("GRN", grnNumber, {
        grnNumber,
        poNumber: payload.poNumber,
        receivedQuantity,
      });

      const newGRN = {
        _id: "grn-" + Date.now(),
        grnNumber,
        poNumber: payload.poNumber,
        receivedQuantity,
        quantityReceived: receivedQuantity,
        receivedDate: new Date().toISOString().split("T")[0],
        receivedBy: payload.warehouseOfficer || "Warehouse Admin",
        warehouseOfficer: payload.warehouseOfficer || "Warehouse Admin",
        remarks: payload.remarks || "Goods received and inspected",
        status: "ACCEPTED",
        blockNumber: newBlock.blockNumber,
        blockId: newBlock.blockNumber,
        blockHash: newBlock.hash,
        txHash: newBlock.hash,
        blockTimestamp: newBlock.timestamp,
        createdAt: new Date().toISOString(),
      };

      if (alreadyReceived + receivedQuantity >= poQuantity && poObj) {
        poObj.status = "Closed";
      } else if (poObj && poObj.status === "ISSUED") {
        poObj.status = "Partially Received";
      }

      MOCK_GRNS.unshift(newGRN);
      saveMockState();
      import("./firebaseService").then(({ syncGRNToFirebase, syncPOToFirebase }) => {
        syncGRNToFirebase(newGRN);
        if (poObj) syncPOToFirebase(poObj);
      }).catch(() => {});
      return newGRN;
    });
