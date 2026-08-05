import { useEffect, useState } from "react";
import {
  FileText,
  PackageCheck,
  Receipt,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Wallet,
  Blocks,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import KpiCard from "../components/ui/KpiCard";
import Card from "../components/ui/Card";
import PageHeader from "../components/ui/PageHeader";
import Loader from "../components/ui/Loader";
import ActivityRow from "../components/ui/ActivityRow";
import { fetchKpis, fetchCharts, fetchRecentActivity } from "../services/dashboardService";
import { formatCurrency } from "../utils/format";
import { CHART_COLORS, PIE_COLORS, VENDOR_COLORS } from "../utils/chartColors";
import { useAuth } from "../context/AuthContext";

const axisStyle = { fontSize: 11, fill: "#94a3b8" };

export default function Dashboard() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState(null);
  const [charts, setCharts] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = () => {
      Promise.all([fetchKpis(), fetchCharts(), fetchRecentActivity(10)])
        .then(([k, c, a]) => {
          if (!mounted) return;
          setKpis(k);
          setCharts(c);
          setActivities(a);
        })
        .finally(() => mounted && setLoading(false));
    };

    load();
    const handleSync = () => load();
    window.addEventListener("hashflow_cloud_sync", handleSync);
    return () => {
      mounted = false;
      window.removeEventListener("hashflow_cloud_sync", handleSync);
    };
  }, []);

  if (loading) return <Loader label="Loading dashboard..." />;

  const kpiCards = [
    { icon: FileText, label: "Total Purchase Orders", value: kpis.totalPOs, accent: "brand" },
    { icon: PackageCheck, label: "Total GRNs", value: kpis.totalGRNs, accent: "accent" },
    { icon: Receipt, label: "Total Invoices", value: kpis.totalInvoices, accent: "brand" },
    { icon: CheckCircle2, label: "Approved Invoices", value: kpis.approvedInvoices, accent: "success" },
    { icon: XCircle, label: "Rejected Invoices", value: kpis.rejectedInvoices, accent: "danger" },
    { icon: ShieldAlert, label: "Fraud Alerts", value: kpis.fraudAlerts, accent: "warning" },
    {
      icon: Wallet,
      label: "Pending Payments",
      value: kpis.pendingPayments,
      sub: formatCurrency(kpis.pendingPaymentsAmount),
      accent: "warning",
    },
    { icon: Blocks, label: "Blockchain Transactions", value: kpis.blockchainTransactions, accent: "accent" },
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(" ")[0] || ""}`}
        subtitle="Here's what's happening across your procurement pipeline today."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((k, i) => (
          <KpiCard key={k.label} {...k} delay={i * 0.03} />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title="Monthly Procurement" subtitle="Total PO value by month" delay={0.05}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={charts.monthlyProcurement}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="amount" fill={CHART_COLORS.brand} radius={[8, 8, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Invoice Status" subtitle="Distribution of all invoices" delay={0.08}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={charts.invoiceStatus}
                dataKey="count"
                nameKey="status"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
              >
                {charts.invoiceStatus.map((entry, i) => (
                  <Cell key={entry.status} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Vendor Spend" subtitle="Top vendors by total PO value" delay={0.11}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={charts.vendorSpend} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
              <YAxis dataKey="vendor" type="category" width={140} tick={{ ...axisStyle, fontSize: 10.5 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="amount" radius={[0, 8, 8, 0]} maxBarSize={18}>
                {charts.vendorSpend.map((entry, i) => (
                  <Cell key={entry.vendor} fill={VENDOR_COLORS[i % VENDOR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Fraud Trend" subtitle="Average fraud score & alerts by month" delay={0.14}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={charts.fraudTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="avgScore" name="Avg Fraud Score" stroke={CHART_COLORS.danger} strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="alerts" name="Fraud Alerts" stroke={CHART_COLORS.warning} strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Recent Activity" subtitle="Latest events across the platform" className="mt-6" delay={0.18}>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {activities.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No recent activity yet.</p>}
          {activities.map((a) => (
            <ActivityRow key={a._id} activity={a} />
          ))}
        </div>
      </Card>
    </div>
  );
}
