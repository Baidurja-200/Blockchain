import Invoice from "../models/Invoice.js";

export async function listFlagged(req, res, next) {
  try {
    const invoices = await Invoice.find({ "fraud.score": { $gt: 0 } }).sort({ "fraud.score": -1 });
    res.json({ invoices });
  } catch (err) {
    next(err);
  }
}

export async function fraudSummary(req, res, next) {
  try {
    const invoices = await Invoice.find();
    const high = invoices.filter((i) => i.fraud.level === "High").length;
    const medium = invoices.filter((i) => i.fraud.level === "Medium").length;
    const low = invoices.filter((i) => i.fraud.level === "Low").length;
    const avgScore = invoices.length ? Math.round(invoices.reduce((s, i) => s + i.fraud.score, 0) / invoices.length) : 0;

    res.json({ high, medium, low, avgScore, total: invoices.length });
  } catch (err) {
    next(err);
  }
}

export default { listFlagged, fraudSummary };
