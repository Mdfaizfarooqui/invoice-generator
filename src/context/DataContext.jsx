import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load user data on login or session restore
  useEffect(() => {
    if (user) {
      setLoading(true);
      
      // Load business profile
      const savedProfile = localStorage.getItem(`invoice_saas_profile_${user.id}`);
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
      } else {
        const defaultProfile = {
          companyName: user.businessName || '',
          email: user.email || '',
          phone: '',
          address: '',
          gstin: '',
          pan: '',
          paymentDetails: {
            bankName: '',
            accountNumber: '',
            ifscCode: '',
            routingNumber: '',
            paypalEmail: '',
            upiId: '',
            additionalInstructions: ''
          }
        };
        setProfile(defaultProfile);
        localStorage.setItem(`invoice_saas_profile_${user.id}`, JSON.stringify(defaultProfile));
      }

      // Load clients
      const savedClients = localStorage.getItem(`invoice_saas_clients_${user.id}`);
      setClients(savedClients ? JSON.parse(savedClients) : []);

      // Load invoices
      const savedInvoices = localStorage.getItem(`invoice_saas_invoices_${user.id}`);
      const rawInvoices = savedInvoices ? JSON.parse(savedInvoices) : [];
      
      // Process invoices to check if any unpaid sent invoices are overdue
      const processedInvoices = rawInvoices.map(inv => {
        if (inv.status === 'sent' && new Date(inv.dueDate) < new Date()) {
          return { ...inv, status: 'overdue' };
        }
        return inv;
      });
      setInvoices(processedInvoices);
      
      setLoading(false);
    } else {
      setProfile(null);
      setClients([]);
      setInvoices([]);
      setLoading(false);
    }
  }, [user]);

  // Sync clients to localStorage
  const saveClients = (newClients) => {
    setClients(newClients);
    if (user) {
      localStorage.setItem(`invoice_saas_clients_${user.id}`, JSON.stringify(newClients));
    }
  };

  // Sync invoices to localStorage
  const saveInvoices = (newInvoices) => {
    setInvoices(newInvoices);
    if (user) {
      localStorage.setItem(`invoice_saas_invoices_${user.id}`, JSON.stringify(newInvoices));
    }
  };

  // --- Profile Actions ---
  const updateProfileData = (updatedProfile) => {
    setProfile(updatedProfile);
    if (user) {
      localStorage.setItem(`invoice_saas_profile_${user.id}`, JSON.stringify(updatedProfile));
    }
  };

  // --- Client CRUD ---
  const addClient = (client) => {
    const newClient = {
      ...client,
      id: 'cli_' + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };
    saveClients([...clients, newClient]);
    return newClient;
  };

  const updateClient = (clientId, updatedClient) => {
    const updated = clients.map(cli => 
      cli.id === clientId ? { ...cli, ...updatedClient } : cli
    );
    saveClients(updated);
  };

  const deleteClient = (clientId) => {
    // Check if client is used in any invoice before deleting (optional - we can allow delete but display client details raw in old invoices, or block it)
    saveClients(clients.filter(cli => cli.id !== clientId));
  };

  // --- Invoice CRUD ---
  const addInvoice = (invoice) => {
    const newInvoice = {
      ...invoice,
      id: 'inv_' + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    saveInvoices([...invoices, newInvoice]);
    return newInvoice;
  };

  const updateInvoice = (invoiceId, updatedInvoice) => {
    const updated = invoices.map(inv => {
      if (inv.id === invoiceId) {
        const item = { ...inv, ...updatedInvoice, updatedAt: new Date().toISOString() };
        // Re-check overdue status
        if (item.status === 'sent' && new Date(item.dueDate) < new Date()) {
          item.status = 'overdue';
        }
        return item;
      }
      return inv;
    });
    saveInvoices(updated);
  };

  const deleteInvoice = (invoiceId) => {
    saveInvoices(invoices.filter(inv => inv.id !== invoiceId));
  };

  const getInvoiceById = (invoiceId) => {
    return invoices.find(inv => inv.id === invoiceId);
  };

  return (
    <DataContext.Provider
      value={{
        profile,
        clients,
        invoices,
        loading,
        updateProfile: updateProfileData,
        addClient,
        updateClient,
        deleteClient,
        addInvoice,
        updateInvoice,
        deleteInvoice,
        getInvoiceById
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
