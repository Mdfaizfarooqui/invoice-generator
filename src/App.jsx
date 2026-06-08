import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';

// Component imports
import Auth from './components/Auth';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Invoices from './components/Invoices';
import InvoiceForm from './components/InvoiceForm';
import Clients from './components/Clients';
import Profile from './components/Profile';
import PublicInvoiceView from './components/PublicInvoiceView';

function AppContent() {
  const { user } = useAuth();
  const [route, setRoute] = useState('dashboard');
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);

  // Hash-based router listener
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || '#/dashboard';
      
      if (hash.startsWith('#/invoice/view/')) {
        const parts = hash.split('/');
        // Extract invoice ID, strip query parameters like ?print=true
        const id = parts[parts.length - 1].split('?')[0];
        setRoute(`invoice/view/${id}`);
      } else if (hash.startsWith('#/invoices/edit/')) {
        const parts = hash.split('/');
        const id = parts[parts.length - 1];
        setEditingInvoiceId(id);
        setRoute(`invoices/edit/${id}`);
      } else {
        const cleanRoute = hash.substring(2) || 'dashboard';
        setRoute(cleanRoute);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Run initial parsing

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (newRoute) => {
    window.location.hash = `#/${newRoute}`;
  };

  // 1. PUBLIC ROUTE: Public invoice detail view (unauthenticated)
  if (route.startsWith('invoice/view/')) {
    const invoiceId = route.replace('invoice/view/', '');
    return <PublicInvoiceView invoiceId={invoiceId} />;
  }

  // 2. PRIVATE ROUTES: Authentication check
  if (!user) {
    // If not authenticated, force Auth view
    // Note: If user is on a different route, reset hash to trigger auth cleanly
    if (window.location.hash !== '' && window.location.hash !== '#/login' && window.location.hash !== '#/register') {
      window.location.hash = '#/login';
    }
    return <Auth />;
  }

  // 3. PRIVATE ROUTES: Render Layout with corresponding panels
  const renderPanel = () => {
    switch (route) {
      case 'dashboard':
        return <Dashboard setRoute={navigate} setEditingInvoiceId={setEditingInvoiceId} />;
      case 'invoices':
        return <Invoices setRoute={navigate} setEditingInvoiceId={setEditingInvoiceId} />;
      case 'invoices/new':
        return <InvoiceForm setRoute={navigate} invoiceId={null} />;
      case 'clients':
        return <Clients />;
      case 'profile':
        return <Profile />;
      default:
        // Handle edit sub-routes or unknown redirect
        if (route.startsWith('invoices/edit/')) {
          return <InvoiceForm setRoute={navigate} invoiceId={editingInvoiceId} />;
        }
        // Fallback to dashboard
        setTimeout(() => navigate('dashboard'), 0);
        return <Dashboard setRoute={navigate} setEditingInvoiceId={setEditingInvoiceId} />;
    }
  };

  return (
    <Layout currentRoute={route} setRoute={navigate}>
      {renderPanel()}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
}
