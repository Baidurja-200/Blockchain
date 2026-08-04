import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import Footer from "../components/layout/Footer";

const TITLES = {
  "/": "Dashboard",
  "/purchase-orders": "Purchase Orders",
  "/grn": "Goods Receipt Notes",
  "/invoices": "Invoices",
  "/validation": "Smart Contract Validation",
  "/blockchain": "Blockchain Explorer",
  "/fraud": "Fraud Detection",
  "/monitor": "Backend Monitor",
  "/reports": "Reports",
  "/settings": "Settings",
  "/about": "About Us",
};

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const title = TITLES[location.pathname] || "Hashflow";

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0b1120]">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex min-h-screen flex-1 flex-col justify-between">
        <div>
          <Topbar onOpenMobile={() => setMobileOpen(true)} title={title} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
        <Footer />
      </div>
    </div>
  );
}
