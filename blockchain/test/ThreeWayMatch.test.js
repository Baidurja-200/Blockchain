import { expect } from "chai";
import hardhat from "hardhat";

const { ethers } = hardhat;

describe("ThreeWayMatch", function () {
  async function deploy() {
    const ThreeWayMatch = await ethers.getContractFactory("ThreeWayMatch");
    const contract = await ThreeWayMatch.deploy();
    await contract.waitForDeployment();
    return contract;
  }

  it("approves an invoice when PO, GRN, amount and quantity all match", async function () {
    const contract = await deploy();

    await contract.createPurchaseOrder("PO-2026-1000", "NovaTech", 100, 5000);
    await contract.createGoodsReceipt("GRN-2026-2000", "PO-2026-1000", 100);

    const tx = await contract.submitInvoice("INV-2026-3000", "PO-2026-1000", "GRN-2026-2000", 5000);
    await tx.wait();

    expect(await contract.getInvoiceStatus("INV-2026-3000")).to.equal(2n); // Approved
  });

  it("rejects an invoice when the amount does not match the PO", async function () {
    const contract = await deploy();

    await contract.createPurchaseOrder("PO-2026-1001", "NovaTech", 50, 1000);
    await contract.createGoodsReceipt("GRN-2026-2001", "PO-2026-1001", 50);

    await contract.submitInvoice("INV-2026-3001", "PO-2026-1001", "GRN-2026-2001", 9999);

    expect(await contract.getInvoiceStatus("INV-2026-3001")).to.equal(3n); // Rejected
  });

  it("rejects a duplicate invoice submitted against the same PO", async function () {
    const contract = await deploy();

    await contract.createPurchaseOrder("PO-2026-1002", "Vertex", 10, 500);
    await contract.createGoodsReceipt("GRN-2026-2002", "PO-2026-1002", 10);

    await contract.submitInvoice("INV-2026-3002", "PO-2026-1002", "GRN-2026-2002", 500);
    await contract.submitInvoice("INV-2026-3003", "PO-2026-1002", "GRN-2026-2002", 500);

    expect(await contract.getInvoiceStatus("INV-2026-3003")).to.equal(3n); // Rejected — duplicate
  });
});
