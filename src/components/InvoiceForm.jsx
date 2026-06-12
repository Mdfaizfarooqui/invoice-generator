import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { calculateTotals } from '../utils/helpers';
import { ArrowLeft, Plus, Trash2, Save, Send, Calendar, Hash, FileText, Percent } from 'lucide-react';

export default function InvoiceForm({ invoiceId, setRoute }) {
  const { clients, invoices, addInvoice, updateInvoice, getInvoiceById } = useData();
  const isEdit = !!invoiceId;

  // Invoice State
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [clientId, setClientId] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState([{ id: 'itm_1', description: '', hsnSac: '', quantity: 1, price: 0 }]);
  const [gstRate, setGstRate] = useState(18); // Default to 18% standard GST
  const [gstType, setGstType] = useState('intra'); // 'intra' (CGST+SGST) or 'inter' (IGST)
  const [discountRate, setDiscountRate] = useState(0);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Load invoice data if in edit mode
  useEffect(() => {
    if (isEdit) {
      const inv = getInvoiceById(invoiceId);
      if (inv) {
        setInvoiceNumber(inv.invoiceNumber);
        setClientId(inv.clientId);
        setIssueDate(inv.issueDate);
        setDueDate(inv.dueDate);
        setItems(inv.items.map(item => ({ 
          ...item, 
          id: item.id || 'itm_' + Math.random(),
          hsnSac: item.hsnSac || '' 
        })));
        setGstRate(inv.gstRate || inv.taxRate || 0);
        setGstType(inv.gstType || 'intra');
        setDiscountRate(inv.discountRate || 0);
        setNotes(inv.notes || '');
      } else {
        setError('Invoice not found');
      }
    } else {
      // Auto-generate invoice number
      const count = invoices.length + 1;
      const paddedNumber = String(count).padStart(4, '0');
      setInvoiceNumber(`INV-${paddedNumber}`);
      
      // Default dates
      const today = new Date();
      const format = (d) => d.toISOString().split('T')[0];
      setIssueDate(format(today));
      
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(today.getDate() + 30);
      setDueDate(format(thirtyDaysLater));
    }
  }, [invoiceId, isEdit, invoices.length]);

  // Handle line items changes
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    if (field === 'quantity') {
      newItems[index][field] = parseFloat(value) || 0;
    } else if (field === 'price') {
      newItems[index][field] = parseFloat(value) || 0;
    } else {
      newItems[index][field] = value;
    }
    setItems(newItems);
  };

  const addItemRow = () => {
    setItems([...items, { 
      id: 'itm_' + Math.random().toString(36).substr(2, 9), 
      description: '', 
      hsnSac: '',
      quantity: 1, 
      price: 0 
    }]);
  };

  const removeItemRow = (id) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  // Run Indian GST totals calculations
  const { 
    subtotal, 
    discountAmount, 
    taxableValue, 
    gstAmount, 
    cgstAmount, 
    sgstAmount, 
    igstAmount, 
    total 
  } = calculateTotals(items, gstRate, discountRate, gstType);

  const handleSave = async (status) => {
    setError('');

    // Validation
    if (!invoiceNumber.trim()) {
      setError('Invoice number is required.');
      return;
    }
    if (!clientId) {
      setError('Please select a client.');
      return;
    }
    if (!issueDate || !dueDate) {
      setError('Please provide issue and due dates.');
      return;
    }
    if (items.some(item => !item.description.trim())) {
      setError('Please write descriptions for all line items.');
      return;
    }
    if (items.some(item => item.quantity <= 0 || item.price < 0)) {
      setError('Quantity must be greater than 0, and price must be 0 or more.');
      return;
    }

    const client = clients.find(c => c.id === clientId);
    const invoicePayload = {
      invoiceNumber,
      clientId,
      clientName: client?.name || '',
      clientEmail: client?.email || '',
      clientAddress: client?.address || '',
      clientPhone: client?.phone || '',
      clientGstin: client?.gstin || '',
      issueDate,
      dueDate,
      items: items.map(itm => ({
        description: itm.description,
        hsnSac: itm.hsnSac,
        quantity: itm.quantity,
        price: itm.price
      })),
      subtotal,
      discountRate,
      discountAmount,
      taxableValue,
      gstRate,
      gstType,
      gstAmount,
      taxAmount: gstAmount, // compatible with list badges / dashboard
      cgstAmount,
      sgstAmount,
      igstAmount,
      total,
      notes,
      status
    };

    setSaving(true);
    try {
      if (isEdit) {
        const oldInv = getInvoiceById(invoiceId);
        const finalStatus = (oldInv?.status === 'paid') ? 'paid' : status;
        await updateInvoice(invoiceId, { ...invoicePayload, status: finalStatus });
      } else {
        await addInvoice(invoicePayload);
      }
      setRoute('invoices');
    } catch (err) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-slide-up">
      <div className="form-header-row mb-6">
        <button className="btn btn-secondary btn-sm" onClick={() => setRoute('invoices')}>
          <ArrowLeft size={16} />
          <span>Back to Invoices</span>
        </button>
        <h2>{isEdit ? `Edit Invoice ${invoiceNumber}` : 'Create GST Invoice'}</h2>
      </div>

      {error && <div className="error-alert mb-4">{error}</div>}

      <div className="invoice-builder-grid">
        {/* Left Column - Main Details */}
        <div className="builder-main">
          {/* Metadata Card */}
          <div className="card mb-6">
            <div className="card-header mb-4">
              <FileText size={18} className="text-primary" />
              <h3>Invoice Details</h3>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="inv-number">Invoice Number *</label>
                <div className="input-icon-wrapper">
                  <Hash size={16} className="field-icon" />
                  <input
                    id="inv-number"
                    type="text"
                    className="form-control pad-left"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="INV-0001"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="inv-client">Select Client *</label>
                {clients.length === 0 ? (
                  <div className="client-missing-alert">
                    No clients found.{' '}
                    <button className="btn-link" onClick={() => setRoute('clients')}>
                      Add Client First
                    </button>
                  </div>
                ) : (
                  <select
                    id="inv-client"
                    className="form-control"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                  >
                    <option value="">-- Choose Client --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.gstin ? `(GSTIN: ${c.gstin})` : '(URD)'}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="inv-issue-date">Issue Date *</label>
                <div className="input-icon-wrapper">
                  <Calendar size={16} className="field-icon" />
                  <input
                    id="inv-issue-date"
                    type="date"
                    className="form-control pad-left"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="inv-due-date">Due Date *</label>
                <div className="input-icon-wrapper">
                  <Calendar size={16} className="field-icon" />
                  <input
                    id="inv-due-date"
                    type="date"
                    className="form-control pad-left"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Card */}
          <div className="card">
            <div className="card-header-with-action mb-4">
              <div className="card-header-title">
                <h3>Line Items</h3>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={addItemRow}>
                <Plus size={16} />
                <span>Add Item</span>
              </button>
            </div>

            <div className="line-items-table-wrapper">
              <table className="line-items-table">
                <thead>
                  <tr>
                    <th>Item Description *</th>
                    <th style={{ width: '120px' }}>HSN/SAC</th>
                    <th style={{ width: '90px' }}>Quantity *</th>
                    <th style={{ width: '130px' }}>Rate *</th>
                    <th style={{ width: '100px' }} className="text-right">Total</th>
                    <th style={{ width: '50px' }} className="text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id}>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Consultancy Services"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control text-center"
                          placeholder="e.g. 998311"
                          maxLength="8"
                          value={item.hsnSac}
                          onChange={(e) => handleItemChange(idx, 'hsnSac', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control text-center"
                          value={item.quantity}
                          min="1"
                          step="any"
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        />
                      </td>
                      <td>
                        <div className="currency-input-wrapper">
                          <span className="currency-symbol">₹</span>
                          <input
                            type="number"
                            className="form-control pad-left-sm"
                            value={item.price}
                            min="0"
                            step="any"
                            onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                          />
                        </div>
                      </td>
                      <td className="text-right font-semibold">
                        ₹{((item.quantity || 0) * (item.price || 0)).toFixed(2)}
                      </td>
                      <td className="text-center">
                        <button
                          className="btn-text text-danger"
                          onClick={() => removeItemRow(item.id)}
                          disabled={items.length <= 1}
                          title="Remove Item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column - Summary & Actions */}
        <div className="builder-sidebar">
          {/* GST Configuration */}
          <div className="card mb-6">
            <h3>GST Configuration</h3>
            <div className="divider my-4"></div>

            <div className="form-group">
              <label className="form-label">GST Tax Type</label>
              <div className="toggle-group">
                <button
                  type="button"
                  className={`toggle-btn ${gstType === 'intra' ? 'active' : ''}`}
                  onClick={() => setGstType('intra')}
                >
                  CGST + SGST (Intra-State)
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${gstType === 'inter' ? 'active' : ''}`}
                  onClick={() => setGstType('inter')}
                >
                  IGST (Inter-State)
                </button>
              </div>
            </div>

            <div className="form-group mb-0">
              <label className="form-label" htmlFor="gst-rate">GST Rate (%)</label>
              <select
                id="gst-rate"
                className="form-control"
                value={gstRate}
                onChange={(e) => setGstRate(parseFloat(e.target.value) || 0)}
              >
                <option value="0">0% (Nil Rated)</option>
                <option value="5">5% (Goods/Services)</option>
                <option value="12">12% (Goods/Services)</option>
                <option value="18">18% (Standard Services)</option>
                <option value="28">28% (Luxury Goods)</option>
              </select>
            </div>
          </div>

          {/* Summary Card */}
          <div className="card mb-6">
            <h3>Summary</h3>
            <div className="divider my-4"></div>

            <div className="summary-row">
              <span className="text-secondary">Subtotal</span>
              <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
            </div>

            <div className="summary-input-row mt-3">
              <div className="form-group mb-0">
                <label className="form-label font-small">Discount Rate (%)</label>
                <input
                  type="number"
                  className="form-control"
                  min="0"
                  max="100"
                  value={discountRate}
                  onChange={(e) => setDiscountRate(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                />
              </div>
              <div className="summary-amt font-semibold text-right text-danger">
                -₹{discountAmount.toFixed(2)}
              </div>
            </div>

            <div className="summary-row mt-3">
              <span className="text-secondary font-medium">Taxable Value</span>
              <span className="font-semibold">₹{taxableValue.toFixed(2)}</span>
            </div>

            <div className="divider my-3"></div>

            {/* GST Tax splits */}
            {gstType === 'intra' ? (
              <>
                <div className="summary-row font-small">
                  <span className="text-secondary">CGST ({gstRate / 2}%)</span>
                  <span>+₹{cgstAmount.toFixed(2)}</span>
                </div>
                <div className="summary-row font-small mt-1">
                  <span className="text-secondary">SGST ({gstRate / 2}%)</span>
                  <span>+₹{sgstAmount.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="summary-row font-small">
                <span className="text-secondary">IGST ({gstRate}%)</span>
                <span>+₹{igstAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="divider my-4"></div>

            <div className="summary-row total-row">
              <h3>Total Due</h3>
              <span className="total-amount text-primary">₹{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Notes Card */}
          <div className="card mb-6">
            <h3>Notes & Terms</h3>
            <textarea
              className="form-control textarea-field"
              rows="3"
              placeholder="e.g. Terms: Net 15 days. GST is payable on reverse charge basis."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Builder Actions */}
          <div className="builder-actions-card">
            {isEdit && getInvoiceById(invoiceId)?.status === 'paid' ? (
              <button className="btn btn-primary w-full py-3 mb-3" onClick={() => handleSave('paid')} disabled={saving}>
                <Save size={18} />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            ) : (
              <>
                <button className="btn btn-primary w-full py-3 mb-3" onClick={() => handleSave('sent')} disabled={saving}>
                  <Send size={18} />
                  <span>{saving ? 'Saving...' : (isEdit ? 'Save & Mark Sent' : 'Create & Send')}</span>
                </button>
                
                <button className="btn btn-secondary w-full py-3" onClick={() => handleSave('draft')} disabled={saving}>
                  <Save size={18} />
                  <span>{saving ? 'Saving...' : 'Save as Draft'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .form-header-row {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        .invoice-builder-grid {
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 2rem;
        }
        @media (max-width: 1024px) {
          .invoice-builder-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
        }
        .card-header-with-action {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 0.75rem;
        }
        .client-missing-alert {
          background-color: var(--warning-light);
          color: var(--warning-hover);
          padding: 0.5rem 0.75rem;
          border-radius: var(--radius-sm);
          font-size: 0.875rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .line-items-table-wrapper {
          overflow-x: auto;
        }
        .line-items-table {
          width: 100%;
          border-collapse: collapse;
        }
        .line-items-table th {
          text-align: left;
          color: var(--text-secondary);
          font-size: 0.8125rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.5rem;
          border-bottom: 2px solid var(--border-color);
        }
        .line-items-table td {
          padding: 0.75rem 0.5rem;
          vertical-align: middle;
        }
        .currency-input-wrapper {
          position: relative;
        }
        .currency-symbol {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-secondary);
          font-weight: 500;
        }
        .pad-left-sm {
          padding-left: 1.5rem;
        }
        .my-4 {
          margin-top: 1rem;
          margin-bottom: 1rem;
        }
        .my-3 {
          margin-top: 0.75rem;
          margin-bottom: 0.75rem;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.9375rem;
        }
        .summary-input-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 1rem;
        }
        .summary-input-row .form-group {
          flex: 1;
        }
        .summary-amt {
          padding-bottom: 0.625rem;
          min-width: 100px;
        }
        .font-small {
          font-size: 0.75rem;
        }
        .font-medium {
          font-weight: 500;
        }
        .total-row {
          font-size: 1.125rem;
        }
        .total-amount {
          font-size: 1.5rem;
          font-weight: 800;
        }
        .builder-actions-card {
          display: flex;
          flex-direction: column;
        }
        .mb-0 {
          margin-bottom: 0;
        }
        .mb-3 {
          margin-bottom: 0.75rem;
        }
        .toggle-group {
          display: flex;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          overflow: hidden;
          background-color: var(--bg-tertiary);
          padding: 0.125rem;
        }
        .toggle-btn {
          flex: 1;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 0.75rem;
          padding: 0.5rem 0.25rem;
          cursor: pointer;
          border-radius: calc(var(--radius-sm) - 2px);
          transition: all var(--transition-fast);
        }
        .toggle-btn:hover {
          color: var(--text-primary);
        }
        .toggle-btn.active {
          background-color: var(--bg-secondary);
          color: var(--primary);
          box-shadow: var(--shadow-sm);
        }
      `}</style>
    </div>
  );
}
