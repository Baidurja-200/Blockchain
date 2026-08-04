import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";

import authRoutes from "./routes/auth.routes.js";
import poRoutes from "./routes/po.routes.js";
import grnRoutes from "./routes/grn.routes.js";
import invoiceRoutes from "./routes/invoice.routes.js";
import blockchainRoutes from "./routes/blockchain.routes.js";
import fraudRoutes from "./routes/fraud.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import reportsRoutes from "./routes/reports.routes.js";
import monitorRoutes from "./routes/monitor.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));
app.use(express.json());
app.use(morgan("dev"));
app.use("/uploads", express.static(path.resolve("uploads")));

app.get("/api/health", (req, res) => res.json({ status: "ok", service: "hashflow-api" }));

app.use("/api/auth", authRoutes);
app.use("/api/purchase-orders", poRoutes);
app.use("/api/grns", grnRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/blockchain", blockchainRoutes);
app.use("/api/fraud", fraudRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/monitor", monitorRoutes);
app.use("/api/settings", settingsRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
