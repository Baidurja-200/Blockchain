import PurchaseOrder from "../models/PurchaseOrder.js";
import GRN from "../models/GRN.js";
import Invoice from "../models/Invoice.js";
import Block from "../models/Block.js";
import ActivityLog from "../models/ActivityLog.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function kpis(req, res, next) {
  try {
    const [totalPOs, totalGRNs, totalInvoices, approvedInvoices, rejectedInvoices, fraudAlerts, pendingPaymentDocs, blockchainTx] =
      await Promise.all([
        PurchaseOrder.countDocuments(),
        GRN.countDocuments(),
        Invoice.countDocuments(),
        Invoice.countDocuments({ status: "Approved" }),
        Invoice.countDocuments({ status: "Rejected" }),
        Invoice.countDocuments({ "fraud.score": { $gte: 30 } }),
        Invoice.find({ status: "Approved", paymentStatus: { $ne: "Paid" } }),
        Block.countDocuments({ transactionType: { $ne: "GENESIS" } }),
      ]);

    const pendingPaymentsAmount = pendingPaymentDocs.reduce((s, i) => s + i.invoiceAmount, 0);

    res.json({
      totalPOs,
      totalGRNs,
      totalInvoices,
      approvedInvoices,
      rejectedInvoices,
      fraudAlerts,
      pendingPayments: pendingPaymentDocs.length,
      pendingPaymentsAmount,
      blockchainTransactions: blockchainTx,
    });
  } catch (err) {
    next(err);
  }
}

export async function charts(req, res, next) {
  try {
    const pos = await PurchaseOrder.find();
    const invoices = await Invoice.find();

    // Monthly Procurement — sum of PO totalAmount by month (last 6 months buckets by creation order)
    const monthlyMap = new Map();
    pos.forEach((po) => {
      const d = new Date(po.createdAt);
      const key = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + po.totalAmount);
    });
    const monthlyProcurement = Array.from(monthlyMap.entries()).map(([month, amount]) => ({ month, amount: Math.round(amount) }));

    // Invoice Status distribution
    const statusCounts = { Pending: 0, Approved: 0, Rejected: 0, "Manual Review": 0 };
    invoices.forEach((inv) => (statusCounts[inv.status] = (statusCounts[inv.status] || 0) + 1));
    const invoiceStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

    // Vendor Spend
    const vendorMap = new Map();
    pos.forEach((po) => vendorMap.set(po.vendor, (vendorMap.get(po.vendor) || 0) + po.totalAmount));
    const vendorSpend = Array.from(vendorMap.entries())
      .map(([vendor, amount]) => ({ vendor, amount: Math.round(amount) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    // Fraud Trend — average fraud score by month
    const fraudMap = new Map();
    invoices.forEach((inv) => {
      const d = new Date(inv.createdAt);
      const key = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      if (!fraudMap.has(key)) fraudMap.set(key, { total: 0, count: 0, alerts: 0 });
      const entry = fraudMap.get(key);
      entry.total += inv.fraud.score;
      entry.count += 1;
      if (inv.fraud.score >= 30) entry.alerts += 1;
    });
    const fraudTrend = Array.from(fraudMap.entries()).map(([month, { total, count, alerts }]) => ({
      month,
      avgScore: count ? Math.round(total / count) : 0,
      alerts,
    }));

    res.json({ monthlyProcurement, invoiceStatus, vendorSpend, fraudTrend });
  } catch (err) {
    next(err);
  }
}

export async function recentActivity(req, res, next) {
  try {
    const limit = Number(req.query.limit) || 12;
    const activities = await ActivityLog.find().sort({ createdAt: -1 }).limit(limit);
    res.json({ activities });
  } catch (err) {
    next(err);
  }
}

export default { kpis, charts, recentActivity };
