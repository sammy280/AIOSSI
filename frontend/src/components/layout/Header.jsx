import { Menu, Bell, Sun, Moon, Search } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useAuthStore } from '../../store/authStore';
import NotificationDrawer from '../notifications/NotificationDrawer';
import { useState } from 'react';
import { cn } from '../../lib/utils';

export default function Header({ onMenuClick }) {
  const { theme, toggleTheme } = useThemeStore();
  const { unreadCount } = useNotificationStore();
  const { user } = useAuthStore();
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center gap-3 px-4 shrink-0 z-20">
      <button
        onClick={onMenuClick}
        className="p-2 rounded-lg hover:bg-accent transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1 flex items-center gap-2 max-w-md">
        <div className="relative flex-1 hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Search..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-accent border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 ml-auto">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <button
          onClick={() => setNotifOpen(true)}
          className="relative p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User avatar */}
        <div className="ml-1 w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden shrink-0">
          {user?.profile?.avatar ? (
            <img src={`/uploads/${user.profile.avatar}`} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-primary">
              {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
      </div>

      <NotificationDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />
    </header>
  );
}
