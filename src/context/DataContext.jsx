import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

// Helper to map invoice to database schema (snake_case)
const mapInvoiceToDb = (inv, userId) => ({
  user_id: userId,
  invoice_number: inv.invoiceNumber,
  client_id: inv.clientId || null,
  client_name: inv.clientName || '',
  client_email: inv.clientEmail || '',
  client_address: inv.clientAddress || '',
  client_phone: inv.clientPhone || '',
  client_gstin: inv.clientGstin || '',
  issue_date: inv.issueDate,
  due_date: inv.dueDate,
  items: inv.items,
  subtotal: inv.subtotal,
  discount_rate: inv.discountRate,
  discount_amount: inv.discountAmount,
  taxable_value: inv.taxableValue,
  gst_rate: inv.gstRate,
  gst_type: inv.gstType,
  gst_amount: inv.gstAmount,
  cgst_amount: inv.cgstAmount,
  sgst_amount: inv.sgstAmount,
  igst_amount: inv.igstAmount,
  total: inv.total,
  notes: inv.notes || '',
  status: inv.status
});

// Helper to map invoice from database schema (camelCase)
const mapInvoiceFromDb = (dbInv) => ({
  id: dbInv.id,
  invoiceNumber: dbInv.invoice_number,
  clientId: dbInv.client_id,
  clientName: dbInv.client_name,
  clientEmail: dbInv.client_email,
  clientAddress: dbInv.client_address,
  clientPhone: dbInv.client_phone,
  clientGstin: dbInv.client_gstin,
  issueDate: dbInv.issue_date,
  dueDate: dbInv.due_date,
  items: dbInv.items,
  subtotal: Number(dbInv.subtotal),
  discountRate: Number(dbInv.discount_rate),
  discountAmount: Number(dbInv.discount_amount),
  taxableValue: Number(dbInv.taxable_value),
  gstRate: Number(dbInv.gst_rate),
  gstType: dbInv.gst_type,
  gstAmount: Number(dbInv.gst_amount),
  taxAmount: Number(dbInv.gst_amount), // compatible with list badges / dashboard
  cgstAmount: Number(dbInv.cgst_amount),
  sgstAmount: Number(dbInv.sgst_amount),
  igstAmount: Number(dbInv.igst_amount),
  total: Number(dbInv.total),
  notes: dbInv.notes,
  status: dbInv.status,
  createdAt: dbInv.created_at,
  updatedAt: dbInv.updated_at
});

export const DataProvider = ({ children }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load user data on login or session restore
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setProfile(null);
        setClients([]);
        setInvoices([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      if (!isSupabaseConfigured) {
        // --- LOCAL STORAGE FALLBACK ---
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
        
        const processedInvoices = rawInvoices.map(inv => {
          if (inv.status === 'sent' && new Date(inv.dueDate) < new Date()) {
            return { ...inv, status: 'overdue' };
          }
          return inv;
        });
        setInvoices(processedInvoices);
        setLoading(false);
      } else {
        // --- SUPABASE DATA FETCH ---
        try {
          // 1. Fetch Profile
          const { data: prof, error: profError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profError && profError.code !== 'PGRST116') { // PGRST116 is code for 0 rows returned
            throw profError;
          }

          if (prof) {
            setProfile({
              companyName: prof.company_name || '',
              email: prof.email || '',
              phone: prof.phone || '',
              address: prof.address || '',
              gstin: prof.gstin || '',
              pan: prof.pan || '',
              paymentDetails: prof.payment_details || {
                bankName: '',
                accountNumber: '',
                ifscCode: '',
                routingNumber: '',
                paypalEmail: '',
                upiId: '',
                additionalInstructions: ''
              }
            });
          } else {
            // Create default profile if trigger failed or didn't run
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
            
            await supabase.from('profiles').insert({
              id: user.id,
              company_name: defaultProfile.companyName,
              email: defaultProfile.email,
              payment_details: defaultProfile.paymentDetails
            });

            setProfile(defaultProfile);
          }

          // 2. Fetch Clients
          const { data: clis, error: clisError } = await supabase
            .from('clients')
            .select('*')
            .eq('user_id', user.id)
            .order('name', { ascending: true });

          if (clisError) throw clisError;
          
          setClients(
            (clis || []).map(c => ({
              id: c.id,
              name: c.name,
              email: c.email || '',
              phone: c.phone || '',
              address: c.address || '',
              gstin: c.gstin || '',
              createdAt: c.created_at
            }))
          );

          // 3. Fetch Invoices
          const { data: invs, error: invsError } = await supabase
            .from('invoices')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (invsError) throw invsError;

          const mappedInvoices = (invs || []).map(mapInvoiceFromDb);
          
          // Process overdue status on client side
          const processedInvoices = mappedInvoices.map(inv => {
            if (inv.status === 'sent' && new Date(inv.dueDate) < new Date()) {
              return { ...inv, status: 'overdue' };
            }
            return inv;
          });
          setInvoices(processedInvoices);
        } catch (err) {
          console.error('Error loading Supabase data:', err);
        } finally {
          setLoading(false);
        }
      }
    };

    loadData();
  }, [user]);

  // --- Profile Actions ---
  const updateProfileData = async (updatedProfile) => {
    setProfile(updatedProfile);
    if (!user) return;

    if (!isSupabaseConfigured) {
      localStorage.setItem(`invoice_saas_profile_${user.id}`, JSON.stringify(updatedProfile));
    } else {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            company_name: updatedProfile.companyName,
            email: updatedProfile.email,
            phone: updatedProfile.phone,
            address: updatedProfile.address,
            gstin: updatedProfile.gstin,
            pan: updatedProfile.pan,
            payment_details: updatedProfile.paymentDetails,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (error) throw error;
      } catch (err) {
        console.error('Error updating profile in Supabase:', err);
        throw err;
      }
    }
  };

  // --- Client CRUD ---
  const addClient = async (client) => {
    if (!isSupabaseConfigured) {
      const newClient = {
        ...client,
        id: 'cli_' + Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString()
      };
      const newClients = [...clients, newClient];
      setClients(newClients);
      if (user) {
        localStorage.setItem(`invoice_saas_clients_${user.id}`, JSON.stringify(newClients));
      }
      return newClient;
    }

    // Supabase Add Client
    try {
      const { data: dbCli, error } = await supabase
        .from('clients')
        .insert({
          user_id: user.id,
          name: client.name,
          email: client.email || '',
          phone: client.phone || '',
          address: client.address || '',
          gstin: client.gstin || ''
        })
        .select()
        .single();

      if (error) throw error;

      const newClient = {
        id: dbCli.id,
        name: dbCli.name,
        email: dbCli.email || '',
        phone: dbCli.phone || '',
        address: dbCli.address || '',
        gstin: dbCli.gstin || '',
        createdAt: dbCli.created_at
      };

      setClients(prev => [...prev, newClient]);
      return newClient;
    } catch (err) {
      console.error('Error adding client in Supabase:', err);
      throw err;
    }
  };

  const updateClient = async (clientId, updatedClient) => {
    if (!isSupabaseConfigured) {
      const updated = clients.map(cli => 
        cli.id === clientId ? { ...cli, ...updatedClient } : cli
      );
      setClients(updated);
      if (user) {
        localStorage.setItem(`invoice_saas_clients_${user.id}`, JSON.stringify(updated));
      }
      return;
    }

    // Supabase Update Client
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: updatedClient.name,
          email: updatedClient.email || '',
          phone: updatedClient.phone || '',
          address: updatedClient.address || '',
          gstin: updatedClient.gstin || ''
        })
        .eq('id', clientId)
        .eq('user_id', user.id);

      if (error) throw error;

      setClients(prev =>
        prev.map(cli => (cli.id === clientId ? { ...cli, ...updatedClient } : cli))
      );
    } catch (err) {
      console.error('Error updating client in Supabase:', err);
      throw err;
    }
  };

  const deleteClient = async (clientId) => {
    if (!isSupabaseConfigured) {
      const updated = clients.filter(cli => cli.id !== clientId);
      setClients(updated);
      if (user) {
        localStorage.setItem(`invoice_saas_clients_${user.id}`, JSON.stringify(updated));
      }
      return;
    }

    // Supabase Delete Client
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)
        .eq('user_id', user.id);

      if (error) throw error;

      setClients(prev => prev.filter(cli => cli.id !== clientId));
    } catch (err) {
      console.error('Error deleting client from Supabase:', err);
      throw err;
    }
  };

  // --- Invoice CRUD ---
  const addInvoice = async (invoice) => {
    if (!isSupabaseConfigured) {
      const newInvoice = {
        ...invoice,
        id: 'inv_' + Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const newInvoices = [...invoices, newInvoice];
      setInvoices(newInvoices);
      if (user) {
        localStorage.setItem(`invoice_saas_invoices_${user.id}`, JSON.stringify(newInvoices));
      }
      return newInvoice;
    }

    // Supabase Add Invoice
    try {
      const dbPayload = mapInvoiceToDb(invoice, user.id);
      const { data: dbInv, error } = await supabase
        .from('invoices')
        .insert(dbPayload)
        .select()
        .single();

      if (error) throw error;

      const newInvoice = mapInvoiceFromDb(dbInv);
      setInvoices(prev => [newInvoice, ...prev]);
      return newInvoice;
    } catch (err) {
      console.error('Error adding invoice in Supabase:', err);
      throw err;
    }
  };

  const updateInvoice = async (invoiceId, updatedInvoice) => {
    if (!isSupabaseConfigured) {
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
      setInvoices(updated);
      if (user) {
        localStorage.setItem(`invoice_saas_invoices_${user.id}`, JSON.stringify(updated));
      }
      return;
    }

    // Supabase Update Invoice
    try {
      const dbPayload = mapInvoiceToDb(updatedInvoice, user.id);
      const { error } = await supabase
        .from('invoices')
        .update({
          ...dbPayload,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)
        .eq('user_id', user.id);

      if (error) throw error;

      setInvoices(prev =>
        prev.map(inv => {
          if (inv.id === invoiceId) {
            const item = { ...inv, ...updatedInvoice, updatedAt: new Date().toISOString() };
            if (item.status === 'sent' && new Date(item.dueDate) < new Date()) {
              item.status = 'overdue';
            }
            return item;
          }
          return inv;
        })
      );
    } catch (err) {
      console.error('Error updating invoice in Supabase:', err);
      throw err;
    }
  };

  const deleteInvoice = async (invoiceId) => {
    if (!isSupabaseConfigured) {
      const updated = invoices.filter(inv => inv.id !== invoiceId);
      setInvoices(updated);
      if (user) {
        localStorage.setItem(`invoice_saas_invoices_${user.id}`, JSON.stringify(updated));
      }
      return;
    }

    // Supabase Delete Invoice
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId)
        .eq('user_id', user.id);

      if (error) throw error;

      setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
    } catch (err) {
      console.error('Error deleting invoice from Supabase:', err);
      throw err;
    }
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
