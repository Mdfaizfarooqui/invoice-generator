import React, { useState, useEffect } from 'react';
import { formatDate, formatCurrency, getStatusColor } from '../utils/helpers';
import { Receipt, Printer, Download, CreditCard, CheckCircle, Loader2, QrCode, Copy } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export default function PublicInvoiceView({ invoiceId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Payment simulation state
  const [isPaying, setIsPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi'); // 'upi' or 'card'
  
  // Card Form fields
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  // UPI Form fields
  const [clientUpiId, setClientUpiId] = useState('');

  const [showPayModal, setShowPayModal] = useState(false);

  // Clipboard copy states
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedIfsc, setCopiedIfsc] = useState(false);

  const copyToClipboard = (text, setCopiedFlag) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedFlag(true);
    setTimeout(() => setCopiedFlag(false), 2000);
  };

  // Scan Supabase or localStorage for the matching invoice
  const loadInvoice = async () => {
    setLoading(true);
    let found = null;

    if (isSupabaseConfigured) {
      try {
        const { data: dbInv, error: invErr } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', invoiceId)
          .single();

        if (dbInv) {
          const { data: dbProf } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', dbInv.user_id)
            .single();

          const profile = dbProf ? {
            companyName: dbProf.company_name || '',
            email: dbProf.email || '',
            phone: dbProf.phone || '',
            address: dbProf.address || '',
            gstin: dbProf.gstin || '',
            pan: dbProf.pan || '',
            paymentDetails: dbProf.payment_details || {
              bankName: '',
              accountNumber: '',
              ifscCode: '',
              routingNumber: '',
              paypalEmail: '',
              upiId: '',
              additionalInstructions: ''
            }
          } : null;

          const invoice = {
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
            taxAmount: Number(dbInv.gst_amount),
            cgstAmount: Number(dbInv.cgst_amount),
            sgstAmount: Number(dbInv.sgst_amount),
            igstAmount: Number(dbInv.igst_amount),
            total: Number(dbInv.total),
            notes: dbInv.notes,
            status: dbInv.status,
            createdAt: dbInv.created_at,
            updatedAt: dbInv.updated_at
          };

          found = { invoice, profile, userId: dbInv.user_id };
        }
      } catch (err) {
        console.error('Error fetching public invoice from Supabase:', err);
      }
    }

    if (!found) {
      // Fallback: Scan localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('invoice_saas_invoices_')) {
          try {
            const invoices = JSON.parse(localStorage.getItem(key) || '[]');
            const inv = invoices.find(item => item.id === invoiceId);
            if (inv) {
              const userId = key.replace('invoice_saas_invoices_', '');
              const profileStr = localStorage.getItem(`invoice_saas_profile_${userId}`);
              const profile = profileStr ? JSON.parse(profileStr) : null;
              found = { invoice: inv, profile, userId, storageKey: key };
              break;
            }
          } catch (e) {
            console.error('Error scanning public invoices', e);
          }
        }
      }
    }

    if (found) {
      setData(found);
      if (found.invoice.status === 'paid') {
        setPaySuccess(true);
      }
    } else {
      setError('Invoice not found. Please verify the link.');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (invoiceId) {
      loadInvoice();
    }
  }, [invoiceId]);

  // Handle URL print query parameter
  useEffect(() => {
    if (data && window.location.href.includes('print=true')) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [data]);

  const handlePrint = () => {
    window.print();
  };

  const handleProcessPayment = (e) => {
    e.preventDefault();
    
    if (paymentMethod === 'card') {
      if (!cardNumber || !expiry || !cvc) {
        alert('Please fill out card details');
        return;
      }
    } else if (paymentMethod === 'upi') {
      if (!clientUpiId && !data?.profile?.paymentDetails?.upiId) {
        alert('Please provide your UPI VPA');
        return;
      }
    }
    
    setIsPaying(true);
    
    // Simulate payment processing delay
    setTimeout(async () => {
      try {
        if (isSupabaseConfigured) {
          const { error } = await supabase
            .from('invoices')
            .update({ status: 'paid', updated_at: new Date().toISOString() })
            .eq('id', invoiceId);

          if (error) throw error;

          setIsPaying(false);
          setPaySuccess(true);
          setShowPayModal(false);
          
          setData(prev => ({
            ...prev,
            invoice: { ...prev.invoice, status: 'paid' }
          }));
        } else {
          const key = data.storageKey;
          const invoices = JSON.parse(localStorage.getItem(key) || '[]');
          const updatedInvoices = invoices.map(inv => {
            if (inv.id === invoiceId) {
              return { ...inv, status: 'paid', updatedAt: new Date().toISOString() };
            }
            return inv;
          });

          localStorage.setItem(key, JSON.stringify(updatedInvoices));
          
          setIsPaying(false);
          setPaySuccess(true);
          setShowPayModal(false);
          
          setData(prev => ({
            ...prev,
            invoice: { ...prev.invoice, status: 'paid' }
          }));
        }
      } catch (err) {
        console.error('Payment processing failed:', err);
        alert('Payment processing failed. Please try again.');
        setIsPaying(false);
      }
    }, 2000);
  };

  if (loading) {
    return (
      <div className="public-loading-state">
        <Loader2 className="spinner" size={48} />
        <p>Loading invoice details...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="public-error-state card">
        <Receipt size={48} className="text-danger mx-auto mb-3" />
        <h2>Unable to load invoice</h2>
        <p className="text-secondary">{error || 'The requested invoice is not available.'}</p>
      </div>
    );
  }

  const { invoice, profile } = data;
  const statusColors = getStatusColor(invoice.status);

  // Generate real UPI Pay URI for scanning
  // format: upi://pay?pa=upi_id&pn=biz_name&am=amount&cu=INR
  const upiIdStr = profile?.paymentDetails?.upiId;
  const upiPayUri = upiIdStr 
    ? `upi://pay?pa=${upiIdStr}&pn=${encodeURIComponent(profile?.companyName || 'Merchant')}&am=${invoice.total}&cu=INR`
    : '';
  const qrCodeUrl = upiPayUri 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiPayUri)}`
    : '';

  return (
    <div className="public-view-container">
      {/* Top Action Header Bar (Hidden during print) */}
      <div className="public-action-bar no-print">
        <div className="action-bar-left">
          <Receipt size={24} className="text-primary" />
          <span className="logo-text">Client Invoice Portal</span>
        </div>
        <div className="action-bar-right">
          <button className="btn btn-secondary" onClick={handlePrint}>
            <Printer size={18} />
            <span>Print / Save PDF</span>
          </button>
          
          {invoice.status !== 'paid' && (
            <button className="btn btn-primary" onClick={() => setShowPayModal(true)}>
              <CreditCard size={18} />
              <span>Pay Invoice Online</span>
            </button>
          )}
        </div>
      </div>

      {/* Invoice Document Wrapper */}
      <div className="print-invoice-wrapper card-glass card animate-slide-up">
        {/* Invoice Header */}
        <div className="invoice-doc-header">
          <div className="doc-header-left">
            {profile?.companyName ? (
              <h1 className="biz-title">{profile.companyName}</h1>
            ) : (
              <h1 className="biz-title text-primary">TAX INVOICE</h1>
            )}
            <p className="biz-address">{profile?.address || 'Billing details'}</p>
            {profile?.phone && <p className="biz-meta">Phone: {profile.phone}</p>}
            {profile?.email && <p className="biz-meta">Email: {profile.email}</p>}
            
            {/* PAN & GSTIN display */}
            {profile?.gstin && <p className="tax-meta-label">GSTIN: <strong>{profile.gstin}</strong></p>}
            {profile?.pan && <p className="tax-meta-label">PAN: <strong>{profile.pan}</strong></p>}
          </div>
          
          <div className="doc-header-right text-right">
            <div className="invoice-tag">TAX INVOICE</div>
            <div className="invoice-num">{invoice.invoiceNumber}</div>
            
            <div className="invoice-status-badge mt-2">
              <span className={`badge ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
                <span className={`dot ${statusColors.dot}`}></span>
                <span>{invoice.status}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="divider my-6"></div>

        {/* Invoice Metadata (Bill To / Bill From / Dates) */}
        <div className="invoice-doc-meta">
          <div className="meta-block">
            <span className="meta-label">Billed To:</span>
            <h4 className="meta-val-name">{invoice.clientName}</h4>
            <p className="meta-val-sub">{invoice.clientAddress}</p>
            {invoice.clientEmail && <p className="meta-val-sub">Email: {invoice.clientEmail}</p>}
            {invoice.clientPhone && <p className="meta-val-sub">Phone: {invoice.clientPhone}</p>}
            
            {/* Client GSTIN */}
            {invoice.clientGstin ? (
              <p className="tax-meta-label mt-2">Client GSTIN: <strong>{invoice.clientGstin}</strong></p>
            ) : (
              <p className="tax-meta-label mt-2 text-muted-print">Client GSTIN: <strong>URD (Unregistered)</strong></p>
            )}
          </div>

          <div className="meta-block text-right">
            <div className="meta-date-row">
              <span className="meta-label">Date Issued:</span>
              <span className="meta-val-date">{formatDate(invoice.issueDate)}</span>
            </div>
            <div className="meta-date-row mt-2">
              <span className="meta-label">Due Date:</span>
              <span className="meta-val-date font-bold">{formatDate(invoice.dueDate)}</span>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="doc-table-wrapper my-6">
          <table className="table">
            <thead>
              <tr>
                <th>Item / Description</th>
                <th style={{ width: '100px' }} className="text-center">HSN/SAC</th>
                <th style={{ width: '80px' }} className="text-center">Qty</th>
                <th style={{ width: '120px' }} className="text-right">Unit Price</th>
                <th style={{ width: '120px' }} className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="font-medium">{item.description}</td>
                  <td className="text-center font-monospace">{item.hsnSac || '—'}</td>
                  <td className="text-center">{item.quantity}</td>
                  <td className="text-right">{formatCurrency(item.price)}</td>
                  <td className="text-right font-semibold">{formatCurrency(item.quantity * item.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Breakdown Summary */}
        <div className="invoice-doc-summary">
          <div className="summary-notes">
            {invoice.notes && (
              <>
                <h4 className="notes-heading">Terms & Notes</h4>
                <p className="notes-text mb-4">{invoice.notes}</p>
              </>
            )}

            {/* Payment Details Section */}
            {(profile?.paymentDetails?.bankName || profile?.paymentDetails?.upiId) && (
              <div className="payment-instructions-box">
                <h4 className="notes-heading">Payment Instructions</h4>
                
                {profile.paymentDetails.upiId && (
                  <div className="upi-details-block mb-3">
                    <div className="notes-text flex-align-center">
                      <strong>UPI ID / VPA:</strong> 
                      <span className="font-monospace ml-1">{profile.paymentDetails.upiId}</span>
                      <button 
                        type="button"
                        className="btn-copy no-print" 
                        onClick={() => copyToClipboard(profile.paymentDetails.upiId, setCopiedUpi)}
                        title="Copy UPI ID"
                      >
                        {copiedUpi ? <CheckCircle size={14} className="text-success" /> : <Copy size={14} />}
                        <span className="copy-tooltip">{copiedUpi ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                    
                    {/* Embedded UPI QR code for client scanning */}
                    {qrCodeUrl && (
                      <div className="qr-container mt-2 no-print-flex">
                        <img src={qrCodeUrl} alt="UPI QR Code" className="qr-code-img" />
                        <div className="qr-instruction">
                          <p className="font-semibold text-primary font-small">Scan to Pay via UPI</p>
                          <p className="text-secondary font-xsmall">Use BHIM, GooglePay, PhonePe, or Paytm</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {profile.paymentDetails.bankName && (
                  <div className="bank-details-block">
                    <p className="notes-text"><strong>Bank Transfer:</strong></p>
                    <div className="notes-text flex-align-center">
                      <span>Bank: {profile.paymentDetails.bankName}</span>
                      <button 
                        type="button"
                        className="btn-copy no-print" 
                        onClick={() => copyToClipboard(profile.paymentDetails.bankName, setCopiedBank)}
                        title="Copy Bank Name"
                      >
                        {copiedBank ? <CheckCircle size={14} className="text-success" /> : <Copy size={14} />}
                        <span className="copy-tooltip">{copiedBank ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="notes-text flex-align-center">
                      <span>Account No: {profile.paymentDetails.accountNumber}</span>
                      <button 
                        type="button"
                        className="btn-copy no-print" 
                        onClick={() => copyToClipboard(profile.paymentDetails.accountNumber, setCopiedAccount)}
                        title="Copy Account Number"
                      >
                        {copiedAccount ? <CheckCircle size={14} className="text-success" /> : <Copy size={14} />}
                        <span className="copy-tooltip">{copiedAccount ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="notes-text flex-align-center">
                      <span>IFSC Code: {profile.paymentDetails.ifscCode || profile.paymentDetails.routingNumber}</span>
                      <button 
                        type="button"
                        className="btn-copy no-print" 
                        onClick={() => copyToClipboard(profile.paymentDetails.ifscCode || profile.paymentDetails.routingNumber, setCopiedIfsc)}
                        title="Copy IFSC Code"
                      >
                        {copiedIfsc ? <CheckCircle size={14} className="text-success" /> : <Copy size={14} />}
                        <span className="copy-tooltip">{copiedIfsc ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {profile.paymentDetails.additionalInstructions && (
                  <p className="notes-text mt-2 italic font-small">{profile.paymentDetails.additionalInstructions}</p>
                )}
              </div>
            )}
          </div>

          <div className="summary-math">
            <div className="math-row">
              <span className="text-secondary">Subtotal</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            
            {invoice.discountAmount > 0 && (
              <div className="math-row text-danger-text">
                <span className="text-secondary">Discount ({invoice.discountRate}%)</span>
                <span>-{formatCurrency(invoice.discountAmount)}</span>
              </div>
            )}

            <div className="math-row">
              <span className="text-secondary font-medium">Taxable Value</span>
              <span>{formatCurrency(invoice.taxableValue || (invoice.subtotal - invoice.discountAmount))}</span>
            </div>

            <div className="divider my-2"></div>

            {/* GST Split Display */}
            {invoice.gstType === 'inter' ? (
              <div className="math-row">
                <span className="text-secondary">IGST ({invoice.gstRate}%)</span>
                <span>+{formatCurrency(invoice.igstAmount || invoice.gstAmount || invoice.taxAmount)}</span>
              </div>
            ) : (
              <>
                <div className="math-row">
                  <span className="text-secondary">CGST ({(invoice.gstRate || 18) / 2}%)</span>
                  <span>+{formatCurrency(invoice.cgstAmount || (invoice.gstAmount || invoice.taxAmount) / 2)}</span>
                </div>
                <div className="math-row mt-1">
                  <span className="text-secondary">SGST ({(invoice.gstRate || 18) / 2}%)</span>
                  <span>+{formatCurrency(invoice.sgstAmount || (invoice.gstAmount || invoice.taxAmount) / 2)}</span>
                </div>
              </>
            )}

            <div className="divider my-2"></div>

            <div className="math-row total-doc-row">
              <span className="font-bold">Total Invoice Value</span>
              <span className="grand-total-val text-primary">{formatCurrency(invoice.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Paid Screen Banner Overlay */}
      {paySuccess && (
        <div className="paid-celebration-banner no-print">
          <CheckCircle size={24} />
          <span>This invoice is fully paid. Thank you!</span>
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && (
        <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="modal-content pay-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Secure Checkout Portal</h3>
              <button className="btn-text" onClick={() => setShowPayModal(false)}>Cancel</button>
            </div>
            
            <form onSubmit={handleProcessPayment}>
              <div className="modal-body">
                <div className="payment-amount-banner">
                  <span className="label">Amount to Pay</span>
                  <span className="amount">{formatCurrency(invoice.total)}</span>
                </div>

                {/* Indian payment tabs */}
                <div className="payment-method-tabs mb-4">
                  <button
                    type="button"
                    className={`method-tab-btn ${paymentMethod === 'upi' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('upi')}
                    disabled={!upiIdStr}
                  >
                    <QrCode size={16} />
                    <span>UPI Pay (BHIM / Apps)</span>
                  </button>
                  <button
                    type="button"
                    className={`method-tab-btn ${paymentMethod === 'card' || !upiIdStr ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('card')}
                  >
                    <CreditCard size={16} />
                    <span>Credit / Debit Card</span>
                  </button>
                </div>
                
                {paymentMethod === 'card' || !upiIdStr ? (
                  /* Card checkout form */
                  <div className="card-form-body animate-fade-in">
                    <div className="form-group">
                      <label className="form-label" htmlFor="card-num">Card Number</label>
                      <input
                        id="card-num"
                        type="text"
                        className="form-control"
                        placeholder="4111 2222 3333 4444"
                        maxLength="19"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label" htmlFor="card-exp">Expiration Date</label>
                        <input
                          id="card-exp"
                          type="text"
                          className="form-control"
                          placeholder="MM/YY"
                          maxLength="5"
                          value={expiry}
                          onChange={(e) => setExpiry(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="card-cvc">CVC / CVV</label>
                        <input
                          id="card-cvc"
                          type="password"
                          className="form-control"
                          placeholder="•••"
                          maxLength="4"
                          value={cvc}
                          onChange={(e) => setCvc(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* UPI checkout form */
                  <div className="upi-form-body animate-fade-in text-center">
                    {qrCodeUrl && (
                      <div className="checkout-qr-wrapper mb-4">
                        <img src={qrCodeUrl} alt="Checkout QR" className="checkout-qr-img" />
                        <p className="font-semibold mt-2">Scan QR code using your UPI app</p>
                        <p className="text-secondary font-small">Or click below to simulate instant UPI confirmation</p>
                      </div>
                    )}
                    
                    <div className="form-group text-left">
                      <label className="form-label" htmlFor="upi-vpa">Enter Your UPI VPA</label>
                      <input
                        id="upi-vpa"
                        type="text"
                        className="form-control text-center"
                        placeholder="username@bankname"
                        value={clientUpiId}
                        onChange={(e) => setClientUpiId(e.target.value)}
                        required={!upiPayUri}
                      />
                    </div>
                  </div>
                )}

                <div className="secure-badge-info mt-4">
                  <span className="lock-icon">🔒</span>
                  <span>Secured payment demo. No actual Indian Rupees will be transacted.</span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPayModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isPaying}>
                  {isPaying ? (
                    <>
                      <Loader2 className="spinner btn-spinner" size={16} />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Pay {formatCurrency(invoice.total)}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .public-view-container {
          min-height: 100vh;
          background-color: #f1f5f9;
          padding: 2rem 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          transition: background-color var(--transition-normal);
        }
        .dark .public-view-container {
          background-color: #0b0f19;
        }
        .public-action-bar {
          width: 100%;
          max-width: 900px;
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 1rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
          box-shadow: var(--shadow-md);
        }
        .action-bar-left {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 700;
          font-size: 1.125rem;
        }
        .action-bar-right {
          display: flex;
          gap: 0.75rem;
        }
        
        .print-invoice-wrapper {
          width: 100%;
          max-width: 900px;
          background-color: #ffffff !important;
          color: #0f172a !important;
          border-radius: var(--radius-lg);
          padding: 3.5rem !important;
          box-shadow: var(--shadow-xl);
          border: 1px solid var(--border-color);
        }
        .dark .print-invoice-wrapper {
          background-color: #ffffff !important;
          color: #0f172a !important;
          border: 1px solid #e2e8f0;
        }
        .dark .print-invoice-wrapper .text-secondary {
          color: #475569 !important;
        }
        .dark .print-invoice-wrapper h1,
        .dark .print-invoice-wrapper h2,
        .dark .print-invoice-wrapper h3,
        .dark .print-invoice-wrapper h4,
        .dark .print-invoice-wrapper td,
        .dark .print-invoice-wrapper th {
          color: #0f172a !important;
        }
        
        .invoice-doc-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .biz-title {
          font-size: 2rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
        }
        .biz-address {
          color: #475569;
          font-size: 0.9375rem;
          white-space: pre-line;
          max-width: 320px;
        }
        .biz-meta {
          color: #64748b;
          font-size: 0.875rem;
          margin-top: 0.25rem;
        }
        .tax-meta-label {
          font-size: 0.875rem;
          color: #0f172a;
          margin-top: 0.375rem;
        }
        .text-muted-print {
          color: #64748b !important;
        }
        .invoice-tag {
          font-size: 1.75rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: var(--primary);
        }
        .invoice-num {
          font-size: 1.25rem;
          font-weight: 700;
          color: #475569;
        }
        .invoice-doc-meta {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 2rem;
        }
        .meta-block {
          flex: 1;
        }
        .meta-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
          margin-bottom: 0.5rem;
        }
        .meta-val-name {
          font-size: 1.125rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }
        .meta-val-sub {
          font-size: 0.875rem;
          color: #475569;
          white-space: pre-line;
        }
        .meta-date-row {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          font-size: 0.9375rem;
        }
        .meta-date-row .meta-label {
          margin-bottom: 0;
          display: flex;
          align-items: center;
        }
        .meta-val-date {
          min-width: 100px;
        }
        
        .doc-table-wrapper {
          border: 1px solid #e2e8f0;
          border-radius: var(--radius-sm);
          overflow: hidden;
        }
        .doc-table-wrapper .table th {
          background-color: #f8fafc;
          border-bottom: 2px solid #e2e8f0;
          color: #475569;
        }
        .doc-table-wrapper .table td {
          border-bottom: 1px solid #f1f5f9;
        }
        .doc-table-wrapper .table tr:last-child td {
          border-bottom: none;
        }
        
        .invoice-doc-summary {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 3rem;
        }
        @media (max-width: 768px) {
          .invoice-doc-summary {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
        }
        .summary-notes {
          display: flex;
          flex-direction: column;
        }
        .notes-heading {
          font-size: 0.8125rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #64748b;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }
        .notes-text {
          font-size: 0.875rem;
          color: #475569;
          line-height: 1.6;
        }
        .payment-instructions-box {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: var(--radius-sm);
          padding: 1rem;
        }
        .upi-details-block {
          border-bottom: 1px dashed #cbd5e1;
          padding-bottom: 0.75rem;
        }
        .qr-container {
          display: flex;
          align-items: center;
          gap: 1rem;
          background-color: #ffffff;
          padding: 0.5rem;
          border-radius: var(--radius-sm);
          border: 1px solid #cbd5e1;
          width: fit-content;
        }
        .qr-code-img {
          width: 80px;
          height: 80px;
        }
        .qr-instruction {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }
        
        .summary-math {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .math-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.9375rem;
        }
        .text-danger-text {
          color: #b91c1c;
        }
        .total-doc-row {
          font-size: 1.125rem;
        }
        .grand-total-val {
          font-size: 1.75rem;
          font-weight: 800;
        }
        
        .public-loading-state,
        .public-error-state {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background-color: #f1f5f9;
          padding: 2rem;
          text-align: center;
        }
        .dark .public-loading-state,
        .dark .public-error-state {
          background-color: #0b0f19;
        }
        .spinner {
          animation: spin 1s linear infinite;
          color: var(--primary);
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .paid-celebration-banner {
          position: fixed;
          top: 1.5rem;
          background-color: var(--success);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          box-shadow: var(--shadow-lg);
          font-weight: 600;
          z-index: 100;
          animation: slideUp 0.3s ease;
        }
        
        /* Payment modal enhancements */
        .payment-amount-banner {
          background-color: var(--primary-light);
          color: var(--primary);
          padding: 1rem;
          border-radius: var(--radius-sm);
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-bottom: 1.25rem;
        }
        .payment-amount-banner .label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        .payment-amount-banner .amount {
          font-size: 1.5rem;
          font-weight: 800;
        }
        .secure-badge-info {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        .btn-spinner {
          margin-right: 0.5rem;
        }
        
        .payment-method-tabs {
          display: flex;
          background-color: var(--bg-tertiary);
          padding: 0.25rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
        }
        .method-tab-btn {
          flex: 1;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          padding: 0.625rem;
          font-weight: 600;
          font-size: 0.8125rem;
          cursor: pointer;
          border-radius: calc(var(--radius-sm) - 2px);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all var(--transition-fast);
        }
        .method-tab-btn:hover {
          color: var(--text-primary);
        }
        .method-tab-btn.active {
          background-color: var(--bg-secondary);
          color: var(--primary);
          box-shadow: var(--shadow-sm);
        }
        .checkout-qr-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .checkout-qr-img {
          width: 140px;
          height: 140px;
          border: 1px solid #e2e8f0;
          border-radius: var(--radius-sm);
          padding: 0.25rem;
        }
        .font-xsmall {
          font-size: 0.6875rem;
        }
        .font-monospace {
          font-family: monospace;
        }

        /* Print Override adjustments */
        @media print {
          .public-view-container {
            background: transparent !important;
            padding: 0 !important;
          }
          .print-invoice-wrapper {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
          .payment-instructions-box {
            background-color: transparent !important;
            border: 1px solid #cbd5e1 !important;
          }
          .doc-table-wrapper .table th {
            background-color: #f1f5f9 !important;
          }
          .no-print-flex {
            display: none !important;
          }
        }

        .flex-align-center {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .ml-1 {
          margin-left: 0.25rem;
        }
        .btn-copy {
          background: transparent;
          border: none;
          color: var(--text-tertiary);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          padding: 0.125rem 0.25rem;
          border-radius: 4px;
          position: relative;
          transition: all var(--transition-fast);
        }
        .btn-copy:hover {
          color: var(--primary);
          background-color: var(--primary-light);
        }
        .dark .btn-copy:hover {
          background-color: rgba(99, 102, 241, 0.15);
        }
        .copy-tooltip {
          visibility: hidden;
          background-color: #0f172a;
          color: #fff;
          text-align: center;
          border-radius: 4px;
          padding: 0.25rem 0.5rem;
          position: absolute;
          z-index: 10;
          bottom: 125%;
          left: 50%;
          transform: translateX(-50%);
          opacity: 0;
          transition: opacity 0.2s;
          font-size: 0.6875rem;
          white-space: nowrap;
          pointer-events: none;
        }
        .btn-copy:hover .copy-tooltip {
          visibility: visible;
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
