import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { cn, getRoleColor } from '../../lib/utils';
import {
  LayoutDashboard, ShoppingCart, UtensilsCrossed, Wine, Receipt,
  Package, Truck, Users, ClipboardList, BarChart3, Calendar,
  DollarSign, Clock, AlertTriangle, FileText, Settings, LogOut,
  ChefHat, CreditCard, MapPin, Star, Shield, TrendingUp, Bike,
  BookOpen, Warehouse, Gavel, Activity, ClipboardCheck
} from 'lucide-react';

const navConfig = {
  ADMIN: [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
    { label: 'Analytics', icon: BarChart3, href: '/analytics' },
    { label: 'Orders', icon: ShoppingCart, href: '/orders' },
    { label: 'Tables', icon: MapPin, href: '/tables' },
    { label: 'Menu', icon: UtensilsCrossed, href: '/menu' },
    { label: 'Inventory', icon: Warehouse, href: '/inventory' },
    { label: 'Suppliers', icon: Truck, href: '/suppliers' },
    { label: 'Bills', icon: Receipt, href: '/bills' },
    { label: 'Users', icon: Users, href: '/users' },
    { label: 'Attendance', icon: Clock, href: '/attendance' },
    { label: 'Shifts', icon: Calendar, href: '/shifts' },
    { label: 'Payroll', icon: DollarSign, href: '/payroll' },
    { label: 'Expenses', icon: CreditCard, href: '/expenses' },
    { label: 'Customers', icon: Star, href: '/customers' },
    { label: 'Reservations', icon: BookOpen, href: '/reservations' },
    { label: 'Performance', icon: TrendingUp, href: '/performance' },
    { label: 'Punishments', icon: Gavel, href: '/punishments' },
    { label: 'Delivery', icon: Bike, href: '/delivery' },
    { label: 'Reports', icon: FileText, href: '/reports' },
    { label: 'Daily Report', icon: Activity, href: '/daily-report' },
    { label: 'Requisitions', icon: ClipboardCheck, href: '/requisitions' },
    { label: 'Audit Logs', icon: Shield, href: '/audit-logs' },
    { label: 'Settings', icon: Settings, href: '/settings' },
  ],
  MANAGER: [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/manager' },
    { label: 'Analytics', icon: BarChart3, href: '/analytics' },
    { label: 'Orders', icon: ShoppingCart, href: '/orders' },
    { label: 'Tables', icon: MapPin, href: '/tables' },
    { label: 'Menu', icon: UtensilsCrossed, href: '/menu' },
    { label: 'Inventory', icon: Warehouse, href: '/inventory' },
    { label: 'Suppliers', icon: Truck, href: '/suppliers' },
    { label: 'Bills', icon: Receipt, href: '/bills' },
    { label: 'Users', icon: Users, href: '/users' },
    { label: 'Attendance', icon: Clock, href: '/attendance' },
    { label: 'Shifts', icon: Calendar, href: '/shifts' },
    { label: 'Payroll', icon: DollarSign, href: '/payroll' },
    { label: 'Expenses', icon: CreditCard, href: '/expenses' },
    { label: 'Customers', icon: Star, href: '/customers' },
    { label: 'Reservations', icon: BookOpen, href: '/reservations' },
    { label: 'Performance', icon: TrendingUp, href: '/performance' },
    { label: 'Punishments', icon: Gavel, href: '/punishments' },
    { label: 'Delivery', icon: Bike, href: '/delivery' },
    { label: 'Reports', icon: FileText, href: '/reports' },
    { label: 'Daily Report', icon: Activity, href: '/daily-report' },
    { label: 'Requisitions', icon: ClipboardCheck, href: '/requisitions' },
  ],
  CASHIER: [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/cashier' },
    { label: 'Bills', icon: Receipt, href: '/bills' },
    { label: 'Orders', icon: ShoppingCart, href: '/orders' },
    { label: 'Tables', icon: MapPin, href: '/tables' },
    { label: 'Reservations', icon: BookOpen, href: '/reservations' },
    { label: 'Attendance', icon: Clock, href: '/attendance' },
  ],
  WAITER: [
    { label: 'My Tables', icon: MapPin, href: '/waiter' },
    { label: 'Orders', icon: ShoppingCart, href: '/orders' },
    { label: 'Attendance', icon: Clock, href: '/attendance' },
  ],
  KITCHEN: [
    { label: 'Kitchen Queue', icon: ChefHat, href: '/kitchen' },
    { label: 'Requisitions', icon: ClipboardCheck, href: '/requisitions' },
    { label: 'Attendance', icon: Clock, href: '/attendance' },
  ],
  BAR: [
    { label: 'Bar Queue', icon: Wine, href: '/bar' },
    { label: 'Requisitions', icon: ClipboardCheck, href: '/requisitions' },
    { label: 'Attendance', icon: Clock, href: '/attendance' },
  ],
};

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const nav = navConfig[user?.role] || [];

  const handleLogout = async () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={onClose} />}

      <aside className={cn(
        'fixed md:relative z-40 flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 overflow-hidden',
        open ? 'w-64' : 'w-0 md:w-16'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <UtensilsCrossed className="w-4 h-4 text-white" />
          </div>
          {open && <span className="font-bold text-sidebar-foreground truncate">Sammy ERP</span>}
        </div>

        {/* User */}
        {open && (
          <div className="px-4 py-3 border-b border-sidebar-border shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">
                  {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">{user?.name}</p>
                <p className={cn('text-xs font-medium', getRoleColor(user?.role))}>{user?.role}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {nav.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) => cn(
                'nav-item',
                isActive ? 'active' : ''
              )}
              title={!open ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {open && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-2 border-t border-sidebar-border shrink-0">
          <button
            onClick={handleLogout}
            className="nav-item w-full text-red-400 hover:bg-red-500/10 hover:text-red-400"
            title={!open ? 'Logout' : undefined}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {open && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
