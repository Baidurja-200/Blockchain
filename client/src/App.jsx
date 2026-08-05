import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";
import ProtectedRoute from "./components/common/ProtectedRoute";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { startGlobalSyncLoop } from "./services/cloudLedgerService";
import { initSocket, registerUser, unregisterUser } from "./services/socketService";
import { useAuth } from "./context/AuthContext";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PurchaseOrders from "./pages/PurchaseOrders";
import GoodsReceipt from "./pages/GoodsReceipt";
import Invoices from "./pages/Invoices";
import SmartContractValidation from "./pages/SmartContractValidation";
import BlockchainExplorer from "./pages/BlockchainExplorer";
import FraudDetection from "./pages/FraudDetection";
import BackendMonitor from "./pages/BackendMonitor";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import AboutUs from "./pages/AboutUs";
import NotFound from "./pages/NotFound";

export default function App() {
  const { user } = useAuth();

  useEffect(() => {
    initSocket();
    if (user) {
      registerUser(user);
    } else {
      unregisterUser();
    }
  }, [user]);

  useEffect(() => {
    const stopSync = startGlobalSyncLoop(() => user);
    return () => {
      if (stopSync) stopSync();
    };
  }, [user]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <ErrorBoundary>
              <DashboardLayout />
            </ErrorBoundary>
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/purchase-orders" element={<PurchaseOrders />} />
        <Route path="/grn" element={<GoodsReceipt />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/validation" element={<SmartContractValidation />} />
        <Route path="/blockchain" element={<BlockchainExplorer />} />
        <Route path="/fraud" element={<FraudDetection />} />
        <Route path="/monitor" element={<BackendMonitor />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/about" element={<AboutUs />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
