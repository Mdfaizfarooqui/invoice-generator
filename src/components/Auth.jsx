import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Receipt, Mail, Lock, Building, ArrowRight } from 'lucide-react';

export default function Auth() {
  const { login, signup } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password || (!isLogin && !businessName)) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        login(email, password);
      } else {
        signup(email, password, businessName);
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setEmail('');
    setPassword('');
    setBusinessName('');
    setError('');
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card animate-fade-in">
        <div className="auth-logo">
          <Receipt size={36} className="text-primary" />
          <span>Invoicely</span>
        </div>

        <div className="auth-header">
          <h2>{isLogin ? 'Welcome back' : 'Create your account'}</h2>
          <p>{isLogin ? 'Manage your business invoices easily' : 'Start generating professional invoices in seconds'}</p>
        </div>

        {error && (
          <div className="auth-error-alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="form-group">
              <label className="form-label" htmlFor="businessName">Business Name</label>
              <div className="input-with-icon">
                <Building className="input-icon" size={18} />
                <input
                  id="businessName"
                  type="text"
                  placeholder="e.g. Acme Corporation"
                  className="form-control"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <div className="input-with-icon">
              <Mail className="input-icon" size={18} />
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="input-with-icon">
              <Lock className="input-icon" size={18} />
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full mt-4" disabled={loading}>
            <span>{loading ? 'Processing...' : isLogin ? 'Sign In' : 'Get Started'}</span>
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="auth-toggle-link">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
          <button onClick={toggleMode} className="btn-link" disabled={loading}>
            {isLogin ? 'Sign up free' : 'Log in'}
          </button>
        </div>
      </div>

      <style>{`
        .auth-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .auth-header h2 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .auth-header p {
          color: var(--text-secondary);
          font-size: 0.9375rem;
        }
        .auth-error-alert {
          background-color: var(--danger-light);
          color: var(--danger-hover);
          padding: 0.75rem 1rem;
          border-radius: var(--radius-sm);
          font-size: 0.875rem;
          margin-bottom: 1.5rem;
          font-weight: 500;
          border-left: 4px solid var(--danger);
        }
        .input-with-icon {
          position: relative;
        }
        .input-with-icon .form-control {
          padding-left: 2.5rem;
        }
        .input-icon {
          position: absolute;
          left: 0.875rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-tertiary);
          pointer-events: none;
        }
        .w-full {
          width: 100%;
        }
        .mt-4 {
          margin-top: 1rem;
        }
        .auth-toggle-link {
          text-align: center;
          margin-top: 1.5rem;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        .btn-link {
          background: none;
          border: none;
          color: var(--primary);
          font-weight: 600;
          cursor: pointer;
        }
        .btn-link:hover {
          color: var(--primary-hover);
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
