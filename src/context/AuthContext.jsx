import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Load active user session from localStorage
      const savedUser = localStorage.getItem('invoice_saas_active_user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {
          console.error('Error parsing active user', e);
        }
      }
      setLoading(false);
      return;
    }

    let authSubscription = null;

    // Fetch initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('company_name')
            .eq('id', session.user.id)
            .single();

          setUser({
            id: session.user.id,
            email: session.user.email,
            businessName: profile?.company_name || ''
          });
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Error fetching Supabase session:', err);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_name')
          .eq('id', session.user.id)
          .single();

        setUser({
          id: session.user.id,
          email: session.user.email,
          businessName: profile?.company_name || ''
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    authSubscription = subscription;

    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  const signup = async (email, password, businessName) => {
    if (!isSupabaseConfigured) {
      const users = JSON.parse(localStorage.getItem('invoice_saas_users') || '[]');
      
      // Check if user already exists
      if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error('An account with this email already exists.');
      }

      const newUser = {
        id: 'usr_' + Math.random().toString(36).substr(2, 9),
        email: email.toLowerCase(),
        password: password, // For simulation purposes
        businessName: businessName,
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      localStorage.setItem('invoice_saas_users', JSON.stringify(users));

      // Also initialize default business profile for this new user
      const defaultProfile = {
        companyName: businessName,
        email: email,
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
      localStorage.setItem(`invoice_saas_profile_${newUser.id}`, JSON.stringify(defaultProfile));

      // Log user in automatically
      setUser(newUser);
      localStorage.setItem('invoice_saas_active_user', JSON.stringify(newUser));
      return newUser;
    }

    // Supabase Sign Up
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password: password,
      options: {
        data: {
          businessName: businessName
        }
      }
    });

    if (error) throw error;

    if (data?.user) {
      const newUser = {
        id: data.user.id,
        email: data.user.email,
        businessName: businessName
      };
      setUser(newUser);
      return newUser;
    }
  };

  const login = async (email, password) => {
    if (!isSupabaseConfigured) {
      const users = JSON.parse(localStorage.getItem('invoice_saas_users') || '[]');
      const foundUser = users.find(
        u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
      );

      if (!foundUser) {
        throw new Error('Invalid email or password.');
      }

      setUser(foundUser);
      localStorage.setItem('invoice_saas_active_user', JSON.stringify(foundUser));
      return foundUser;
    }

    // Supabase Sign In
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password: password
    });

    if (error) throw error;

    if (data?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_name')
        .eq('id', data.user.id)
        .single();

      const loggedInUser = {
        id: data.user.id,
        email: data.user.email,
        businessName: profile?.company_name || ''
      };
      setUser(loggedInUser);
      return loggedInUser;
    }
  };

  const logout = async () => {
    if (!isSupabaseConfigured) {
      setUser(null);
      localStorage.removeItem('invoice_saas_active_user');
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error signing out:', error);
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    if (!user) return;
    
    if (!isSupabaseConfigured) {
      localStorage.setItem(`invoice_saas_profile_${user.id}`, JSON.stringify(profileData));
      
      // Update user display details if business name changes
      if (profileData.companyName && profileData.companyName !== user.businessName) {
        const updatedUser = { ...user, businessName: profileData.companyName };
        setUser(updatedUser);
        localStorage.setItem('invoice_saas_active_user', JSON.stringify(updatedUser));

        // Sync back to users database
        const users = JSON.parse(localStorage.getItem('invoice_saas_users') || '[]');
        const index = users.findIndex(u => u.id === user.id);
        if (index !== -1) {
          users[index].businessName = profileData.companyName;
          localStorage.setItem('invoice_saas_users', JSON.stringify(users));
        }
      }
      return;
    }

    // Supabase Profile Update
    const { error } = await supabase
      .from('profiles')
      .update({
        company_name: profileData.companyName,
        email: profileData.email,
        phone: profileData.phone,
        address: profileData.address,
        gstin: profileData.gstin,
        pan: profileData.pan,
        payment_details: profileData.paymentDetails,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) throw error;

    // Update local state businessName
    if (profileData.companyName && profileData.companyName !== user.businessName) {
      setUser(prev => ({ ...prev, businessName: profileData.companyName }));
    }
  };

  return (
    <AuthContext.Provider value={{ user, signup, login, logout, updateProfile, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
