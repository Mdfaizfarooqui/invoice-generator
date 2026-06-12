import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Save, Building, Phone, Mail, MapPin, CreditCard, CheckCircle, Percent } from 'lucide-react';

export default function Profile() {
  const { profile, updateProfile } = useData();
  const [companyName, setCompanyName] = useState(profile?.companyName || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [address, setAddress] = useState(profile?.address || '');
  
  // Indian Tax details
  const [gstin, setGstin] = useState(profile?.gstin || '');
  const [pan, setPan] = useState(profile?.pan || '');

  // Payment Details
  const [bankName, setBankName] = useState(profile?.paymentDetails?.bankName || '');
  const [accountNumber, setAccountNumber] = useState(profile?.paymentDetails?.accountNumber || '');
  const [ifscCode, setIfscCode] = useState(profile?.paymentDetails?.ifscCode || profile?.paymentDetails?.routingNumber || '');
  const [paypalEmail, setPaypalEmail] = useState(profile?.paymentDetails?.paypalEmail || '');
  const [upiId, setUpiId] = useState(profile?.paymentDetails?.upiId || '');
  const [additionalInstructions, setAdditionalInstructions] = useState(profile?.paymentDetails?.additionalInstructions || '');

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);

    if (!companyName.trim()) {
      setError('Business Name is required.');
      return;
    }

    // GSTIN format check (standard 15 alphanumeric characters)
    if (gstin.trim() && gstin.trim().length !== 15) {
      setError('GSTIN must be exactly 15 characters (e.g. 29AAAAA1111A1Z1).');
      return;
    }

    // PAN format check (standard 10 alphanumeric characters)
    if (pan.trim() && pan.trim().length !== 10) {
      setError('PAN must be exactly 10 characters (e.g. ABCDE1234F).');
      return;
    }

    // IFSC format check (11 characters)
    if (ifscCode.trim() && ifscCode.trim().length !== 11) {
      setError('IFSC Code must be exactly 11 characters (e.g. SBIN0001234).');
      return;
    }

    const updatedProfile = {
      companyName,
      email,
      phone,
      address,
      gstin: gstin.toUpperCase(),
      pan: pan.toUpperCase(),
      paymentDetails: {
        bankName,
        accountNumber,
        ifscCode: ifscCode.toUpperCase(),
        routingNumber: ifscCode.toUpperCase(), // Sync routing for backwards compatibility
        paypalEmail,
        upiId: upiId.toLowerCase(),
        additionalInstructions
      }
    };

    setLoading(true);
    try {
      await updateProfile(updatedProfile);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save profile settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-slide-up">
      <div className="profile-header mb-6">
        <h1>Business Profile</h1>
        <p className="text-secondary">Configure your company identity, tax registrations (GSTIN/PAN), and payment instructions for Indian invoicing.</p>
      </div>

      <form onSubmit={handleSubmit} className="profile-form-grid">
        <div className="grid-left-col">
          {/* General Business Card */}
          <div className="card mb-6">
            <div className="card-header mb-4">
              <Building size={20} className="text-primary" />
              <h3>Company Details</h3>
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="profile-companyName">Business / Freelancer Name *</label>
              <input
                id="profile-companyName"
                type="text"
                className="form-control"
                placeholder="e.g. Alpha Tech Consultants"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="profile-gstin">GSTIN (Optional)</label>
                <input
                  id="profile-gstin"
                  type="text"
                  className="form-control uppercase-input"
                  placeholder="e.g. 29AAAAA1111A1Z1"
                  maxLength="15"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label" htmlFor="profile-pan">PAN (Optional)</label>
                <input
                  id="profile-pan"
                  type="text"
                  className="form-control uppercase-input"
                  placeholder="e.g. ABCDE1234F"
                  maxLength="10"
                  value={pan}
                  onChange={(e) => setPan(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="profile-email">Business Email</label>
                <div className="input-icon-wrapper">
                  <Mail size={16} className="field-icon" />
                  <input
                    id="profile-email"
                    type="email"
                    className="form-control pad-left"
                    placeholder="billing@alphatech.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label" htmlFor="profile-phone">Business Phone</label>
                <div className="input-icon-wrapper">
                  <Phone size={16} className="field-icon" />
                  <input
                    id="profile-phone"
                    type="text"
                    className="form-control pad-left"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="profile-address">Address / Office Location</label>
              <div className="input-icon-wrapper">
                <MapPin size={16} className="field-icon-textarea" />
                <textarea
                  id="profile-address"
                  className="form-control pad-left textarea-field"
                  rows="3"
                  placeholder="456 Innovation Hub, Sector 62&#10;Noida, Uttar Pradesh 201301"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid-right-col">
          {/* Payment & Payout Card */}
          <div className="card">
            <div className="card-header mb-4">
              <CreditCard size={20} className="text-primary" />
              <h3>Payment & Checkout Settings</h3>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="profile-upiId">UPI ID / VPA (Recommended)</label>
              <input
                id="profile-upiId"
                type="text"
                className="form-control"
                placeholder="e.g. alphatech@okhdfcbank"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
              />
              <span className="helper-text">This will generate a simulated UPI QR Code on public client invoices.</span>
            </div>

            <div className="divider mb-4"><span>OR BANK TRANSFER</span></div>

            <div className="form-group">
              <label className="form-label" htmlFor="profile-bankName">Bank Name</label>
              <input
                id="profile-bankName"
                type="text"
                className="form-control"
                placeholder="e.g. HDFC Bank"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="profile-accountNumber">Account Number</label>
                <input
                  id="profile-accountNumber"
                  type="text"
                  className="form-control"
                  placeholder="50200012345678"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-ifscCode">IFSC Code</label>
                <input
                  id="profile-ifscCode"
                  type="text"
                  className="form-control uppercase-input"
                  placeholder="HDFC0000123"
                  maxLength="11"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value)}
                />
              </div>
            </div>

            <div className="divider mb-4"><span>GLOBAL CLIENTS</span></div>

            <div className="form-group">
              <label className="form-label" htmlFor="profile-paypalEmail">PayPal Email (Optional)</label>
              <input
                id="profile-paypalEmail"
                type="email"
                className="form-control"
                placeholder="paypal@alphatech.com"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="profile-additionalInstructions">Additional Payment Terms</label>
              <textarea
                id="profile-additionalInstructions"
                className="form-control textarea-field"
                rows="2"
                placeholder="Please share payment screenshot after transfer. GST details are subject to standard reverse charges."
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
              />
            </div>
          </div>

          <div className="profile-actions mt-6">
            {error && <p className="text-danger mb-2 font-medium">{error}</p>}
            {saved && (
              <div className="success-banner mb-3">
                <CheckCircle size={18} />
                <span>Profile settings saved successfully!</span>
              </div>
            )}
            <button type="submit" className="btn btn-primary w-full py-3" disabled={loading}>
              <Save size={20} />
              <span>{loading ? 'Saving Changes...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </div>
      </form>

      <style>{`
        .mb-6 { margin-bottom: 1.5rem; }
        .mb-4 { margin-bottom: 1rem; }
        .mb-3 { margin-bottom: 0.75rem; }
        .mb-2 { margin-bottom: 0.5rem; }
        .divider {
          display: flex;
          align-items: center;
          text-align: center;
          color: var(--text-tertiary);
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.05em;
        }
        .divider::before, .divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid var(--border-color);
        }
        .divider:not(:empty)::before { margin-right: .5em; }
        .divider:not(:empty)::after { margin-left: .5em; }
        .card-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 0.75rem;
        }
        .profile-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }
        @media (max-width: 1024px) {
          .profile-form-grid {
            grid-template-columns: 1fr;
            gap: 0;
          }
        }
        .input-icon-wrapper {
          position: relative;
        }
        .field-icon {
          position: absolute;
          left: 0.875rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-tertiary);
        }
        .field-icon-textarea {
          position: absolute;
          left: 0.875rem;
          top: 0.875rem;
          color: var(--text-tertiary);
        }
        .pad-left {
          padding-left: 2.5rem;
        }
        .textarea-field {
          resize: vertical;
        }
        .py-3 {
          padding-top: 0.75rem;
          padding-bottom: 0.75rem;
        }
        .success-banner {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background-color: var(--success-light);
          color: var(--success-hover);
          padding: 0.75rem 1rem;
          border-radius: var(--radius-sm);
          font-weight: 500;
          font-size: 0.875rem;
          border-left: 4px solid var(--success);
        }
        .font-medium {
          font-weight: 500;
        }
        .text-danger {
          color: var(--danger);
        }
        .uppercase-input {
          text-transform: uppercase;
        }
        .helper-text {
          display: block;
          font-size: 0.75rem;
          color: var(--text-tertiary);
          margin-top: 0.25rem;
        }
      `}</style>
    </div>
  );
}
