import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { formatDate, formatCurrency, getStatusColor } from '../utils/helpers';
import { 
  Plus, Search, Calendar, ChevronRight, Copy, Check, 
  Download, Edit2, Trash2, CheckCircle2, Eye 
} from 'lucide-react';

export default function Invoices({ setRoute, setEditingInvoiceId }) {
  const { invoices, updateInvoice, deleteInvoice } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [copiedInvoiceId, setCopiedInvoiceId] = useState(null);

  const handleEdit = (id) => {
    setEditingInvoiceId(id);
    setRoute(`invoices/edit/${id}`);
  };

  const handleCreate = () => {
    setEditingInvoiceId(null);
    setRoute('invoices/new');
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      deleteInvoice(id);
    }
  };

  const handleMarkAsPaid = (id) => {
    updateInvoice(id, { status: 'paid' });
  };

  const handleCopyLink = (id) => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const shareableUrl = `${origin}${pathname}#/invoice/view/${id}`;
    
    navigator.clipboard.writeText(shareableUrl).then(() => {
      setCopiedInvoiceId(id);
      setTimeout(() => setCopiedInvoiceId(null), 2000);
    });
  };

  const handlePrint = (id) => {
    // Navigate to public view, which triggers window.print() or has a print view
    window.open(`${window.location.origin}${window.location.pathname}#/invoice/view/${id}?print=true`, '_blank');
  };

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.clientName.toLowerCase().includes(searchQuery.toLowerCase());
      
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && inv.status === statusFilter;
  });

  // Sort invoices by date descending (newest first)
  const sortedInvoices = [...filteredInvoices].sort((a, b) => 
    new Date(b.issueDate) - new Date(a.issueDate)
  );

  return (
    <div className="animate-slide-up">
      <div className="page-header mb-6">
        <div>
          <h1>Invoices</h1>
          <p className="text-secondary">Create, manage, track, and dispatch your business invoices.</p>
        </div>
        <button className="btn btn-primary" onClick={handleCreate}>
          <Plus size={18} />
          <span>Create Invoice</span>
        </button>
      </div>

      {/* Filter Tabs & Toolbar */}
      <div className="filter-toolbar mb-6">
        <div className="tabs-container">
          {['all', 'draft', 'sent', 'paid', 'overdue'].map((status) => (
            <button
              key={status}
              className={`tab-btn ${statusFilter === status ? 'active' : ''}`}
              onClick={() => setStatusFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="search-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="form-control search-input"
            placeholder="Search by invoice number or client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Invoices List */}
      {sortedInvoices.length === 0 ? (
        <div className="card empty-state text-center py-12">
          <Calendar size={48} className="text-tertiary mb-3 mx-auto" />
          <h3>No invoices found</h3>
          <p className="text-secondary mb-4">
            {searchQuery || statusFilter !== 'all' 
              ? 'Try adjusting your search terms or filters.' 
              : 'Add clients and build your first professional invoice today.'}
          </p>
          {statusFilter === 'all' && !searchQuery && (
            <button className="btn btn-primary" onClick={handleCreate}>
              <Plus size={18} />
              <span>Create Your First Invoice</span>
            </button>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Total</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedInvoices.map((inv) => {
                const colors = getStatusColor(inv.status);
                return (
                  <tr key={inv.id}>
                    <td className="font-semibold">{inv.invoiceNumber}</td>
                    <td className="font-medium">{inv.clientName}</td>
                    <td>{formatDate(inv.issueDate)}</td>
                    <td>{formatDate(inv.dueDate)}</td>
                    <td className="font-bold text-primary">{formatCurrency(inv.total)}</td>
                    <td>
                      <span className={`badge ${colors.bg} ${colors.text} ${colors.border}`}>
                        <span className={`dot ${colors.dot}`}></span>
                        <span>{inv.status}</span>
                      </span>
                    </td>
                    <td className="text-right actions-cell">
                      <button 
                        className="btn-text text-primary" 
                        onClick={() => window.open(`#/invoice/view/${inv.id}`, '_blank')}
                        title="View Public Link"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        className="btn-text text-secondary" 
                        onClick={() => handleCopyLink(inv.id)}
                        title="Copy Public Share Link"
                      >
                        {copiedInvoiceId === inv.id ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                      </button>
                      <button 
                        className="btn-text text-secondary" 
                        onClick={() => handlePrint(inv.id)}
                        title="Download PDF / Print"
                      >
                        <Download size={16} />
                      </button>
                      
                      {inv.status !== 'paid' && (
                        <button 
                          className="btn-text text-success" 
                          onClick={() => handleMarkAsPaid(inv.id)}
                          title="Mark as Paid"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      )}
                      
                      {inv.status !== 'paid' && (
                        <button 
                          className="btn-text text-primary" 
                          onClick={() => handleEdit(inv.id)}
                          title="Edit Invoice"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      
                      <button 
                        className="btn-text text-danger" 
                        onClick={() => handleDelete(inv.id)}
                        title="Delete Invoice"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .filter-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
          flex-wrap: wrap;
        }
        .tabs-container {
          display: flex;
          background-color: var(--bg-tertiary);
          padding: 0.25rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
        }
        .tab-btn {
          border: none;
          background: transparent;
          color: var(--text-secondary);
          padding: 0.5rem 1rem;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          border-radius: calc(var(--radius-sm) - 2px);
          text-transform: capitalize;
          transition: all var(--transition-fast);
        }
        .tab-btn:hover {
          color: var(--text-primary);
        }
        .tab-btn.active {
          background-color: var(--bg-secondary);
          color: var(--primary);
          box-shadow: var(--shadow-sm);
        }
        .search-wrapper {
          position: relative;
          width: 320px;
        }
        @media (max-width: 640px) {
          .filter-toolbar {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }
          .search-wrapper {
            width: 100%;
          }
        }
        .search-icon {
          position: absolute;
          left: 0.875rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-tertiary);
        }
        .search-input {
          padding-left: 2.5rem;
        }
        .text-right {
          text-align: right;
        }
        .font-semibold {
          font-weight: 600;
        }
        .font-medium {
          font-weight: 500;
        }
        .font-bold {
          font-weight: 700;
        }
        .actions-cell {
          display: flex;
          justify-content: flex-end;
          gap: 0.25rem;
        }
        .text-success {
          color: var(--success) !important;
        }
        .mx-auto {
          margin-left: auto;
          margin-right: auto;
        }
        .py-12 {
          padding-top: 3rem;
          padding-bottom: 3rem;
        }
      `}</style>
    </div>
  );
}
