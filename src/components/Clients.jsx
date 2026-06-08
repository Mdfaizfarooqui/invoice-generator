import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Plus, Edit2, Trash2, Search, User, Mail, Phone, MapPin, X, FileText } from 'lucide-react';

export default function Clients() {
  const { clients, addClient, updateClient, deleteClient } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [error, setError] = useState('');

  const openAddModal = () => {
    setEditingClient(null);
    setName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setGstin('');
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (client) => {
    setEditingClient(client);
    setName(client.name);
    setEmail(client.email || '');
    setPhone(client.phone || '');
    setAddress(client.address || '');
    setGstin(client.gstin || '');
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Client Name is required.');
      return;
    }

    // Client GSTIN length check (15 characters)
    if (gstin.trim() && gstin.trim().length !== 15) {
      setError('Client GSTIN must be exactly 15 characters (e.g. 29AAAAA1111A1Z1).');
      return;
    }

    const clientPayload = { 
      name, 
      email, 
      phone, 
      address, 
      gstin: gstin.toUpperCase() 
    };

    if (editingClient) {
      updateClient(editingClient.id, clientPayload);
    } else {
      addClient(clientPayload);
    }

    setIsModalOpen(false);
  };

  const handleDelete = (clientId) => {
    if (window.confirm('Are you sure you want to delete this client? Invoices linked to this client will retain their details but you won\'t be able to select this client for new invoices.')) {
      deleteClient(clientId);
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.gstin && c.gstin.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="animate-slide-up">
      <div className="page-header mb-6">
        <div>
          <h1>Clients</h1>
          <p className="text-secondary">Manage and view your clients directory for GST-compliant invoicing.</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={18} />
          <span>Add New Client</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="toolbar-row mb-6">
        <div className="search-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="form-control search-input"
            placeholder="Search by name, email, or GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Clients List */}
      {filteredClients.length === 0 ? (
        <div className="card empty-state text-center py-12">
          <User size={48} className="text-tertiary mb-3 mx-auto" />
          <h3>{searchQuery ? 'No matching clients found' : 'No clients added yet'}</h3>
          <p className="text-secondary mb-4">
            {searchQuery ? 'Try adjusting your search terms.' : 'Add your first client to start creating invoices.'}
          </p>
          {!searchQuery && (
            <button className="btn btn-primary" onClick={openAddModal}>
              <Plus size={18} />
              <span>Add Your First Client</span>
            </button>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Client Name</th>
                <th>GSTIN</th>
                <th>Email Address</th>
                <th>Phone</th>
                <th>Billing Address</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <tr key={client.id}>
                  <td>
                    <p className="font-semibold">{client.name}</p>
                  </td>
                  <td>
                    {client.gstin ? (
                      <span className="gstin-badge">{client.gstin}</span>
                    ) : (
                      <span className="text-muted font-small">URD (Unregistered)</span>
                    )}
                  </td>
                  <td>{client.email || <span className="text-muted">—</span>}</td>
                  <td>{client.phone || <span className="text-muted">—</span>}</td>
                  <td className="addr-cell" title={client.address}>
                    {client.address || <span className="text-muted">—</span>}
                  </td>
                  <td className="text-right actions-cell">
                    <button 
                      className="btn-text text-primary" 
                      onClick={() => openEditModal(client)}
                      title="Edit Client"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      className="btn-text text-danger" 
                      onClick={() => handleDelete(client.id)}
                      title="Delete Client"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingClient ? 'Edit Client Details' : 'Add New Client'}</h3>
              <button className="btn-text" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {error && <div className="error-alert mb-4">{error}</div>}
                
                <div className="form-group">
                  <label className="form-label" htmlFor="client-name">Client Name / Company *</label>
                  <div className="input-icon-wrapper">
                    <User size={16} className="field-icon" />
                    <input
                      id="client-name"
                      type="text"
                      className="form-control pad-left"
                      placeholder="e.g. Beta Studios Pvt Ltd"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="client-gstin">Client GSTIN (Optional)</label>
                  <div className="input-icon-wrapper">
                    <FileText size={16} className="field-icon" />
                    <input
                      id="client-gstin"
                      type="text"
                      className="form-control pad-left uppercase-input"
                      placeholder="e.g. 29AAAAA1111A1Z1"
                      maxLength="15"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value)}
                    />
                  </div>
                  <span className="helper-text">Leave blank if the client is unregistered (URD).</span>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="client-email">Email Address</label>
                    <div className="input-icon-wrapper">
                      <Mail size={16} className="field-icon" />
                      <input
                        id="client-email"
                        type="email"
                        className="form-control pad-left"
                        placeholder="billing@client.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="client-phone">Phone Number</label>
                    <div className="input-icon-wrapper">
                      <Phone size={16} className="field-icon" />
                      <input
                        id="client-phone"
                        type="text"
                        className="form-control pad-left"
                        placeholder="+91 99999 88888"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="client-address">Billing Address</label>
                  <div className="input-icon-wrapper">
                    <MapPin size={16} className="field-icon-textarea" />
                    <textarea
                      id="client-address"
                      className="form-control pad-left textarea-field"
                      rows="3"
                      placeholder="45 Creative Plaza, MG Road&#10;Bengaluru, Karnataka 560001"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingClient ? 'Save Changes' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .toolbar-row {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .search-wrapper {
          position: relative;
          width: 300px;
        }
        @media (max-width: 640px) {
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
        .text-muted {
          color: var(--text-tertiary);
        }
        .font-semibold {
          font-weight: 600;
        }
        .addr-cell {
          max-width: 200px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .actions-cell {
          display: flex;
          justify-content: flex-end;
          gap: 0.25rem;
        }
        .mx-auto {
          margin-left: auto;
          margin-right: auto;
        }
        .py-12 {
          padding-top: 3rem;
          padding-bottom: 3rem;
        }
        .error-alert {
          background-color: var(--danger-light);
          color: var(--danger-hover);
          padding: 0.75rem 1rem;
          border-radius: var(--radius-sm);
          font-size: 0.875rem;
          font-weight: 500;
          border-left: 4px solid var(--danger);
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
        .gstin-badge {
          display: inline-block;
          background-color: var(--primary-light);
          color: var(--primary);
          padding: 0.125rem 0.5rem;
          font-size: 0.75rem;
          font-weight: 600;
          border-radius: 4px;
          font-family: monospace;
        }
        .dark .gstin-badge {
          background-color: rgba(99, 102, 241, 0.15);
        }
        .uppercase-input {
          text-transform: uppercase;
        }
        .font-small {
          font-size: 0.75rem;
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
