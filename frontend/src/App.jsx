import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { useNotificationStore } from './store/notificationStore';
import { getSocket, initSocket } from './lib/socket';
import api from './lib/api';
import toast, { Toaster } from 'react-hot-toast';

// Auth pages
import Login from './pages/auth/Login';
import PinLogin from './pages/auth/PinLogin';

// Layout
import DashboardLayout from './components/layout/DashboardLayout';

// Role-specific dashboards
import AdminDashboard from './pages/admin/Dashboard';
import ManagerDashboard from './pages/manager/Dashboard';
import DailyReportPage from './pages/manager/DailyReport';
import CashierDashboard from './pages/cashier/Dashboard';
import WaiterDashboard from './pages/waiter/Dashboard';
import KitchenDashboard from './pages/kitchen/Dashboard';
import BarDashboard from './pages/bar/Dashboard';

// Shared pages
import UsersPage from './pages/shared/Users';
import MenuPage from './pages/shared/Menu';
import TablesPage from './pages/shared/Tables';
import OrdersPage from './pages/shared/Orders';
import InventoryPage from './pages/shared/Inventory';
import AttendancePage from './pages/shared/Attendance';
import PayrollPage from './pages/shared/Payroll';
import ReportsPage from './pages/shared/Reports';
import AnalyticsPage from './pages/shared/Analytics';
import NotificationsPage from './pages/shared/Notifications';
import SuppliersPage from './pages/shared/Suppliers';
import ExpensesPage from './pages/shared/Expenses';
import PunishmentsPage from './pages/shared/Punishments';
import AuditLogsPage from './pages/shared/AuditLogs';
import CustomersPage from './pages/shared/Customers';
import ReservationsPage from './pages/shared/Reservations';
import ShiftsPage from './pages/shared/Shifts';
import SettingsPage from './pages/shared/Settings';
import BillsPage from './pages/shared/Bills';
import DeliveryPage from './pages/shared/Delivery';
import PerformancePage from './pages/shared/Performance';
import RequisitionsPage from './pages/shared/Requisitions';

const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/unauthorized" replace />;
  return children;
};

const RoleHome = () => {
  const { user } = useAuthStore();
  const roleMap = { ADMIN: '/admin', MANAGER: '/manager', CASHIER: '/cashier', WAITER: '/waiter', KITCHEN: '/kitchen', BAR: '/bar' };
  return <Navigate to={roleMap[user?.role] || '/login'} replace />;
};

export default function App() {
  const { isAuthenticated, token } = useAuthStore();
  const { addNotification, setNotifications, setUnreadCount } = useNotificationStore();

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    const socket = initSocket(token);

    // Load existing notifications from server
    api.get('/notifications')
      .then(res => setNotifications(Array.isArray(res.data) ? res.data : (res.data || [])))
      .catch(() => {});
    api.get('/notifications/unread-count')
      .then(res => setUnreadCount(typeof res.data === 'number' ? res.data : res.data?.count || 0))
      .catch(() => {});

    socket.on('notification:new', (notif) => {
      addNotification(notif);
      // Show a visible toast popup — click it to open notifications
      const icons = { ORDER_UPDATE:'🍽️', KITCHEN_UPDATE:'👨‍🍳', BAR_UPDATE:'🍺', BILL_UPDATE:'🧾', PAYMENT_UPDATE:'💳', STOCK_ALERT:'⚠️', ONLINE_ORDER:'📱' };
      toast.custom(
        (t) => (
          <div
            onClick={() => toast.dismiss(t.id)}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border border-border bg-card cursor-pointer transition-all ${t.visible ? 'animate-fade-in' : 'opacity-0'}`}
            style={{ maxWidth: 320 }}
          >
            <span className="text-xl shrink-0">{icons[notif.type] || '🔔'}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground">{notif.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notif.message}</p>
            </div>
          </div>
        ),
        { duration: 5000, position: 'top-right' }
      );
    });

    return () => { socket.off('notification:new'); };
  }, [isAuthenticated, token]);

  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/pin-login" element={<PinLogin />} />
        <Route path="/unauthorized" element={<div className="flex items-center justify-center h-screen text-foreground">Access Denied</div>} />
        <Route path="/" element={isAuthenticated ? <RoleHome /> : <Navigate to="/login" replace />} />

        <Route element={<ProtectedRoute roles={['ADMIN', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN', 'BAR']}><DashboardLayout /></ProtectedRoute>}>
          {/* Admin routes */}
          <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />

          {/* Manager routes */}
          <Route path="/manager" element={<ProtectedRoute roles={['MANAGER', 'ADMIN']}><ManagerDashboard /></ProtectedRoute>} />

          {/* Cashier routes */}
          <Route path="/cashier" element={<ProtectedRoute roles={['CASHIER', 'ADMIN', 'MANAGER']}><CashierDashboard /></ProtectedRoute>} />
          <Route path="/bills" element={<ProtectedRoute roles={['CASHIER', 'ADMIN', 'MANAGER']}><BillsPage /></ProtectedRoute>} />

          {/* Waiter routes */}
          <Route path="/waiter" element={<ProtectedRoute roles={['WAITER']}><WaiterDashboard /></ProtectedRoute>} />

          {/* Kitchen routes */}
          <Route path="/kitchen" element={<ProtectedRoute roles={['KITCHEN', 'ADMIN', 'MANAGER']}><KitchenDashboard /></ProtectedRoute>} />

          {/* Bar routes */}
          <Route path="/bar" element={<ProtectedRoute roles={['BAR', 'ADMIN', 'MANAGER']}><BarDashboard /></ProtectedRoute>} />

          {/* Shared / Multi-role routes */}
          <Route path="/orders" element={<ProtectedRoute roles={['ADMIN', 'MANAGER', 'CASHIER', 'WAITER']}><OrdersPage /></ProtectedRoute>} />
          <Route path="/tables" element={<ProtectedRoute roles={['ADMIN', 'MANAGER', 'WAITER', 'CASHIER']}><TablesPage /></ProtectedRoute>} />
          <Route path="/menu" element={<ProtectedRoute roles={['ADMIN', 'MANAGER', 'WAITER']}><MenuPage /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><InventoryPage /></ProtectedRoute>} />
          <Route path="/suppliers" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><SuppliersPage /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute roles={['ADMIN', 'MANAGER', 'WAITER', 'KITCHEN', 'BAR', 'CASHIER']}><AttendancePage /></ProtectedRoute>} />
          <Route path="/shifts" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><ShiftsPage /></ProtectedRoute>} />
          <Route path="/payroll" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><PayrollPage /></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><ExpensesPage /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><UsersPage /></ProtectedRoute>} />
          <Route path="/punishments" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><PunishmentsPage /></ProtectedRoute>} />
          <Route path="/performance" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><PerformancePage /></ProtectedRoute>} />
          <Route path="/customers" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><CustomersPage /></ProtectedRoute>} />
          <Route path="/reservations" element={<ProtectedRoute roles={['ADMIN', 'MANAGER', 'CASHIER']}><ReservationsPage /></ProtectedRoute>} />
          <Route path="/audit-logs" element={<ProtectedRoute roles={['ADMIN']}><AuditLogsPage /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><AnalyticsPage /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><ReportsPage /></ProtectedRoute>} />
          <Route path="/daily-report" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><DailyReportPage /></ProtectedRoute>} />
          <Route path="/delivery" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><DeliveryPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/requisitions" element={<RequisitionsPage />} />
          <Route path="/settings" element={<ProtectedRoute roles={['ADMIN']}><SettingsPage /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
