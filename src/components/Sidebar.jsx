import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Settings, 
  LogOut, 
  Sun, 
  Moon,
  Receipt,
  Menu,
  X
} from 'lucide-react';

export default function Sidebar({ currentRoute, setRoute }) {
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('invoice_saas_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('invoice_saas_theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('invoice_saas_theme', 'dark');
      setIsDark(true);
    }
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, route: 'dashboard' },
    { name: 'Invoices', icon: FileText, route: 'invoices' },
    { name: 'Clients', icon: Users, route: 'clients' },
    { name: 'Business Profile', icon: Settings, route: 'profile' }
  ];

  const handleNav = (route) => {
    setRoute(route);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <header className="mobile-header no-print">
        <div className="mobile-header-brand">
          <Receipt size={24} className="text-primary" />
          <span>Invoicely</span>
        </div>
        <button 
          className="mobile-menu-toggle"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
        >
          {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar Overlay for Mobile */}
      {isMobileOpen && (
        <div 
          className="sidebar-overlay no-print" 
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`sidebar no-print ${isMobileOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <Receipt size={32} className="text-primary" />
          <h2>Invoicely</h2>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.route || 
                             (item.route === 'invoices' && currentRoute.startsWith('invoices/'));
            return (
              <button
                key={item.route}
                onClick={() => handleNav(item.route)}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-info">
            <div className="user-avatar">
              {(user?.businessName || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div className="user-details">
              <p className="user-name">{user?.businessName || 'My Business'}</p>
              <p className="user-email">{user?.email}</p>
            </div>
          </div>

          <div className="sidebar-footer-actions">
            <button 
              onClick={toggleTheme} 
              className="sidebar-action-btn"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button 
              onClick={logout} 
              className="sidebar-action-btn text-danger-btn"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </aside>

      {/* Inline styles for Sidebar and Layout structure since tailwind isn't used */}
      <style>{`
        .mobile-header {
          display: none;
          height: 60px;
          padding: 0 1.25rem;
          background-color: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .mobile-header-brand {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 700;
          font-size: 1.25rem;
        }
        .mobile-menu-toggle {
          background: none;
          border: none;
          color: var(--text-primary);
          cursor: pointer;
        }
        .sidebar-overlay {
          position: fixed;
          top: 60px;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(15, 23, 42, 0.4);
          z-index: 98;
          backdrop-filter: blur(2px);
        }
        .sidebar {
          width: 280px;
          background-color: var(--bg-secondary);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          height: 100vh;
          position: sticky;
          top: 0;
          z-index: 99;
          transition: transform var(--transition-normal);
        }
        .sidebar-brand {
          padding: 2rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          border-bottom: 1px solid var(--border-color);
        }
        .sidebar-nav {
          padding: 1.5rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
        }
        .sidebar-nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          border: none;
          background: transparent;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
          text-align: left;
        }
        .sidebar-nav-item:hover {
          background-color: var(--bg-tertiary);
          color: var(--text-primary);
        }
        .sidebar-nav-item.active {
          background-color: var(--primary-light);
          color: var(--primary);
        }
        .dark .sidebar-nav-item.active {
          background-color: rgba(99, 102, 241, 0.15);
          color: var(--primary);
        }
        .sidebar-footer {
          padding: 1.5rem;
          border-top: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .sidebar-user-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: var(--primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.125rem;
        }
        .user-details {
          overflow: hidden;
        }
        .user-name {
          font-weight: 600;
          font-size: 0.9375rem;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .user-email {
          font-size: 0.8125rem;
          color: var(--text-tertiary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sidebar-footer-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0.5rem;
        }
        .sidebar-action-btn {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          background-color: transparent;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .sidebar-action-btn:hover {
          background-color: var(--bg-tertiary);
          color: var(--text-primary);
          border-color: var(--border-hover);
        }
        .text-danger-btn:hover {
          color: var(--danger);
          background-color: var(--danger-light);
          border-color: transparent;
        }

        @media (max-width: 768px) {
          .mobile-header {
            display: flex;
          }
          .sidebar {
            position: fixed;
            top: 60px;
            left: 0;
            bottom: 0;
            height: calc(100vh - 60px);
            transform: translateX(-100%);
            z-index: 100;
          }
          .sidebar.open {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
