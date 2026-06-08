import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  const signup = (email, password, businessName) => {
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
  };

  const login = (email, password) => {
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
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('invoice_saas_active_user');
  };

  const updateProfile = (profileData) => {
    if (!user) return;
    
    // Save to data context key (handled in DataContext, but also updated here if needed)
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
  };

  return (
    <AuthContext.Provider value={{ user, signup, login, logout, updateProfile, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
