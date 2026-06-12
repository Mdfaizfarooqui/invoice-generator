import React from 'react';
import { useData } from '../context/DataContext';
import { formatCurrency, formatDate, getStatusColor } from '../utils/helpers';
import { 
  DollarSign, FileText, CheckCircle2, AlertCircle, 
  ArrowUpRight, Plus, Users, Settings, Receipt, ChevronRight 
} from 'lucide-react';

export default function Dashboard({ setRoute, setEditingInvoiceId }) {
  const { invoices, clients } = useData();

  // Calculations
  const stats = invoices.reduce((acc, inv) => {
    if (inv.status === 'paid') {
      acc.revenue += inv.total;
      acc.paidCount += 1;
    } else if (inv.status === 'sent') {
      acc.outstanding += inv.total;
      acc.unpaidCount += 1;
    } else if (inv.status === 'overdue') {
      acc.outstanding += inv.total;
      acc.overdue += inv.total;
      acc.overdueCount += 1;
    } else if (inv.status === 'draft') {
      acc.draftCount += 1;
    }
    return acc;
  }, { revenue: 0, outstanding: 0, overdue: 0, paidCount: 0, unpaidCount: 0, overdueCount: 0, draftCount: 0 });

  // Get recent invoices (max 5)
  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const handleEditInvoice = (id) => {
    setEditingInvoiceId(id);
    setRoute(`invoices/edit/${id}`);
  };

  // Group invoices by month for the last 6 months
  const monthlyData = (() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('en-US', { month: 'short' });
      months.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label,
        billed: 0,
        collected: 0,
      });
    }

    invoices.forEach(inv => {
      const invDate = new Date(inv.issueDate || inv.createdAt);
      if (isNaN(invDate.getTime())) return;
      const invYear = invDate.getFullYear();
      const invMonth = invDate.getMonth();

      const match = months.find(m => m.year === invYear && m.month === invMonth);
      if (match) {
        match.billed += inv.total;
        if (inv.status === 'paid') {
          match.collected += inv.total;
        }
      }
    });

    return months;
  })();

  const maxBilled = Math.max(...monthlyData.map(m => m.billed), 1000);

  // Metrics for visualization
  const totalInvoicesCount = invoices.length;
  const paidPct = totalInvoicesCount ? (stats.paidCount / totalInvoicesCount) * 100 : 0;
  const unpaidPct = totalInvoicesCount ? (stats.unpaidCount / totalInvoicesCount) * 100 : 0;
  const overduePct = totalInvoicesCount ? (stats.overdueCount / totalInvoicesCount) * 100 : 0;
  const draftPct = totalInvoicesCount ? (stats.draftCount / totalInvoicesCount) * 100 : 0;

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="dashboard-header mb-6">
        <h1>Dashboard</h1>
        <p className="text-secondary">Track your earnings, outstanding payments, and client distributions.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid-cols-4 mb-6">
        {/* Total Revenue */}
        <div className="card stat-card" style={{ '--accent-color': 'var(--success)', '--accent-bg': 'var(--success-light)' }}>
          <div className="stat-card-inner">
            <div>
              <p className="stat-label">Total Revenue</p>
              <h2 className="stat-val">{formatCurrency(stats.revenue)}</h2>
            </div>
            <div className="stat-icon">
              <DollarSign size={24} />
            </div>
          </div>
        </div>

        {/* Outstanding */}
        <div className="card stat-card" style={{ '--accent-color': 'var(--primary)', '--accent-bg': 'var(--primary-light)' }}>
          <div className="stat-card-inner">
            <div>
              <p className="stat-label">Outstanding Balance</p>
              <h2 className="stat-val">{formatCurrency(stats.outstanding)}</h2>
            </div>
            <div className="stat-icon">
              <Receipt size={24} />
            </div>
          </div>
        </div>

        {/* Overdue */}
        <div className="card stat-card" style={{ '--accent-color': 'var(--danger)', '--accent-bg': 'var(--danger-light)' }}>
          <div className="stat-card-inner">
            <div>
              <p className="stat-label">Overdue Balance</p>
              <h2 className="stat-val">{formatCurrency(stats.overdue)}</h2>
            </div>
            <div className="stat-icon">
              <AlertCircle size={24} />
            </div>
          </div>
        </div>

        {/* Invoices Count */}
        <div className="card stat-card" style={{ '--accent-color': 'var(--warning)', '--accent-bg': 'var(--warning-light)' }}>
          <div className="stat-card-inner">
            <div>
              <p className="stat-label">Total Invoices</p>
              <h2 className="stat-val">{totalInvoicesCount}</h2>
            </div>
            <div className="stat-icon">
              <FileText size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Panels */}
      <div className="dashboard-grid mb-6">
        {/* Recent Invoices & Analytics */}
        <div className="dashboard-main-panel">
          {/* Revenue breakdown & Collection Trends card */}
          <div className="card mb-6">
            <div className="analytics-header mb-4">
              <h3>Financial Collection Trends</h3>
              <p className="text-secondary">Compare total billed amount vs. actual payments collected over the last 6 months.</p>
            </div>
            
            {totalInvoicesCount === 0 ? (
              <div className="text-center py-6">
                <p className="text-tertiary">No invoices created yet to display analytics.</p>
              </div>
            ) : (
              <div className="analytics-content">
                <div className="chart-container mb-6" style={{ width: '100%', overflow: 'hidden' }}>
                  <svg viewBox="0 0 500 220" width="100%" height="100%" className="analytics-svg">
                    {/* Y-Axis Grid Lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                      const yVal = 170 - ratio * 150;
                      const amount = ratio * maxBilled;
                      return (
                        <g key={index}>
                          <line x1="50" y1={yVal} x2="480" y2={yVal} stroke="var(--border-color)" strokeWidth="1" strokeDasharray="3 3" />
                          <text x="42" y={yVal + 3} textAnchor="end" fill="var(--text-tertiary)" fontSize="9" fontWeight="500">
                            {amount >= 1000 ? `₹${(amount / 1000).toFixed(1)}k` : `₹${amount.toFixed(0)}`}
                          </text>
                        </g>
                      );
                    })}

                    {/* Bars */}
                    {monthlyData.map((month, idx) => {
                      const monthWidth = 430 / 6;
                      const groupCenter = 50 + idx * monthWidth + monthWidth / 2;
                      const billedHeight = (month.billed / maxBilled) * 150;
                      const collectedHeight = (month.collected / maxBilled) * 150;

                      return (
                        <g key={idx} className="chart-group">
                          {/* Billed Bar */}
                          <rect
                            x={groupCenter - 15}
                            y={170 - billedHeight}
                            width="12"
                            height={billedHeight}
                            fill="var(--primary)"
                            opacity="0.85"
                            rx="2"
                            className="chart-bar"
                          >
                            <title>{`Billed: ${formatCurrency(month.billed)}`}</title>
                          </rect>

                          {/* Collected Bar */}
                          <rect
                            x={groupCenter + 3}
                            y={170 - collectedHeight}
                            width="12"
                            height={collectedHeight}
                            fill="var(--success)"
                            opacity="0.85"
                            rx="2"
                            className="chart-bar"
                          >
                            <title>{`Collected: ${formatCurrency(month.collected)}`}</title>
                          </rect>

                          {/* X-Axis Month Label */}
                          <text x={groupCenter} y="190" textAnchor="middle" fill="var(--text-secondary)" fontSize="10" fontWeight="600">
                            {month.label}
                          </text>
                        </g>
                      );
                    })}

                    {/* X-Axis line */}
                    <line x1="50" y1="170" x2="480" y2="170" stroke="var(--text-tertiary)" strokeWidth="1.5" />
                  </svg>
                </div>

                <div className="divider mb-4" />

                <div className="status-breakdown-section">
                  <h4 className="font-small text-secondary uppercase-label mb-2">Invoice Status Breakdown</h4>
                  <div className="progress-bar-composite">
                    <div className="progress-segment bg-success" style={{ width: `${paidPct}%` }} title={`Paid: ${stats.paidCount} (${paidPct.toFixed(0)}%)`} />
                    <div className="progress-segment bg-primary" style={{ width: `${unpaidPct}%` }} title={`Unpaid: ${stats.unpaidCount} (${unpaidPct.toFixed(0)}%)`} />
                    <div className="progress-segment bg-danger" style={{ width: `${overduePct}%` }} title={`Overdue: ${stats.overdueCount} (${overduePct.toFixed(0)}%)`} />
                    <div className="progress-segment bg-slate" style={{ width: `${draftPct}%` }} title={`Draft: ${stats.draftCount} (${draftPct.toFixed(0)}%)`} />
                  </div>
                  
                  <div className="legend-grid mt-4">
                    <div className="legend-item"><span className="legend-dot bg-success" /><span>Paid ({stats.paidCount})</span></div>
                    <div className="legend-item"><span className="legend-dot bg-primary" /><span>Sent ({stats.unpaidCount})</span></div>
                    <div className="legend-item"><span className="legend-dot bg-danger" /><span>Overdue ({stats.overdueCount})</span></div>
                    <div className="legend-item"><span className="legend-dot bg-slate" /><span>Draft ({stats.draftCount})</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Recent Invoices Card */}
          <div className="card">
            <div className="card-header-with-link mb-4">
              <h3>Recent Invoices</h3>
              <button className="btn-link-action" onClick={() => setRoute('invoices')}>
                <span>View All Invoices</span>
                <ArrowUpRight size={16} />
              </button>
            </div>

            {recentInvoices.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-secondary">No invoices created yet.</p>
              </div>
            ) : (
              <div className="recent-list">
                {recentInvoices.map((inv) => {
                  const colors = getStatusColor(inv.status);
                  return (
                    <div 
                      key={inv.id} 
                      className="recent-list-item"
                      onClick={() => handleEditInvoice(inv.id)}
                    >
                      <div className="recent-item-info">
                        <p className="recent-item-num">{inv.invoiceNumber}</p>
                        <p className="recent-item-client">{inv.clientName}</p>
                      </div>
                      <div className="recent-item-meta">
                        <p className="recent-item-date">{formatDate(inv.issueDate)}</p>
                        <span className={`badge ${colors.bg} ${colors.text} ${colors.border}`}>
                          <span className={`dot ${colors.dot}`}></span>
                          <span>{inv.status}</span>
                        </span>
                      </div>
                      <div className="recent-item-total">
                        <p>{formatCurrency(inv.total)}</p>
                        <ChevronRight size={16} className="arrow-hover" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="dashboard-sidebar-panel">
          <div className="card quick-actions-card mb-6">
            <h3>Quick Actions</h3>
            <div className="actions-buttons-grid mt-4">
              <button className="quick-action-btn" onClick={() => { setEditingInvoiceId(null); setRoute('invoices/new'); }}>
                <Plus size={20} />
                <span>Create Invoice</span>
              </button>
              <button className="quick-action-btn" onClick={() => setRoute('clients')}>
                <Users size={20} />
                <span>Manage Clients</span>
              </button>
              <button className="quick-action-btn" onClick={() => setRoute('profile')}>
                <Settings size={20} />
                <span>Configure Profile</span>
              </button>
            </div>
          </div>

          <div className="card overview-card">
            <h3>Overview</h3>
            <div className="overview-stats mt-4">
              <div className="overview-row">
                <span>Active Clients</span>
                <span className="font-semibold">{clients.length}</span>
              </div>
              <div className="overview-row">
                <span>Unpaid Invoices</span>
                <span className="font-semibold">{stats.unpaidCount + stats.overdueCount}</span>
              </div>
              <div className="overview-row">
                <span>Paid Invoices</span>
                <span className="font-semibold">{stats.paidCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .chart-bar {
          transition: transform 0.2s ease, opacity 0.2s ease;
          cursor: pointer;
        }
        .chart-bar:hover {
          opacity: 1;
          transform: scaleY(1.02);
          transform-origin: bottom;
        }
        .uppercase-label {
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 700;
          font-size: 0.75rem;
        }
        .analytics-svg {
          background-color: var(--bg-secondary);
          border-radius: var(--radius-sm);
        }
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 1.5rem;
        }
        @media (max-width: 1024px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }
        .stat-card-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .stat-label {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-bottom: 0.25rem;
          font-weight: 500;
        }
        .stat-val {
          font-size: 1.75rem;
          font-weight: 800;
          color: var(--text-primary);
        }
        .progress-bar-composite {
          display: flex;
          height: 12px;
          border-radius: 9999px;
          overflow: hidden;
          background-color: var(--bg-tertiary);
        }
        .progress-segment {
          height: 100%;
        }
        .bg-success { background-color: var(--success); }
        .bg-primary { background-color: var(--primary); }
        .bg-danger { background-color: var(--danger); }
        .bg-slate { background-color: var(--text-tertiary); }
        
        .legend-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8125rem;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .card-header-with-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .btn-link-action {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          background: none;
          border: none;
          color: var(--primary);
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
        }
        .btn-link-action:hover {
          color: var(--primary-hover);
          text-decoration: underline;
        }
        .recent-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .recent-list-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background-color: var(--bg-tertiary);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all var(--transition-fast);
          border: 1px solid transparent;
        }
        .recent-list-item:hover {
          border-color: var(--border-hover);
          background-color: var(--bg-secondary);
          box-shadow: var(--shadow-sm);
        }
        .recent-item-info {
          flex: 1;
        }
        .recent-item-num {
          font-weight: 600;
          font-size: 0.875rem;
        }
        .recent-item-client {
          font-size: 0.8125rem;
          color: var(--text-secondary);
        }
        .recent-item-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.25rem;
          margin-right: 1.5rem;
        }
        .recent-item-date {
          font-size: 0.75rem;
          color: var(--text-tertiary);
        }
        .recent-item-total {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .arrow-hover {
          opacity: 0;
          color: var(--text-tertiary);
          transition: all var(--transition-fast);
        }
        .recent-list-item:hover .arrow-hover {
          opacity: 1;
          transform: translateX(2px);
        }
        .actions-buttons-grid {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .quick-action-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1.25rem;
          background-color: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          cursor: pointer;
          color: var(--text-primary);
          font-weight: 600;
          transition: all var(--transition-fast);
          text-align: left;
        }
        .quick-action-btn:hover {
          background-color: var(--primary-light);
          color: var(--primary);
          border-color: var(--primary);
        }
        .dark .quick-action-btn:hover {
          background-color: rgba(99, 102, 241, 0.15);
          color: var(--primary);
        }
        .overview-stats {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .overview-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 0.5rem;
        }
        .overview-row:last-child {
          border-bottom: none;
        }
      `}</style>
    </div>
  );
}
