import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './Pages.css';

interface Invoice {
  id: string;
  clientName: string;
  period: string;
  dueDate: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue' | 'draft';
  boxCount: number;
  retrievalFees: number;
  storageFees: number;
}

interface PaymentHistory {
  id: string;
  date: string;
  amount: number;
  method: string;
  reference: string;
  status: 'completed' | 'pending' | 'failed';
}

const Billing: React.FC = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'payments' | 'pricing'>('overview');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);

  const invoices: Invoice[] = [
    {
      id: 'INV-2024-0234',
      clientName: 'Department of Justice',
      period: 'January 2024',
      dueDate: '2024-02-15',
      amount: 138240,
      status: 'paid',
      boxCount: 3456,
      storageFees: 138240,
      retrievalFees: 0
    },
    {
      id: 'INV-2024-0235',
      clientName: 'Metro Police Department',
      period: 'January 2024',
      dueDate: '2024-02-15',
      amount: 87560,
      status: 'pending',
      boxCount: 2189,
      storageFees: 87560,
      retrievalFees: 0
    },
    {
      id: 'INV-2024-0236',
      clientName: 'Provincial Court',
      period: 'January 2024',
      dueDate: '2024-02-10',
      amount: 67120,
      status: 'overdue',
      boxCount: 1678,
      storageFees: 67120,
      retrievalFees: 0
    }
  ];

  const paymentHistory: PaymentHistory[] = [
    {
      id: 'PAY-001',
      date: '2024-01-25',
      amount: 138240,
      method: 'Bank Transfer',
      reference: 'DOJ-JAN-2024',
      status: 'completed'
    },
    {
      id: 'PAY-002',
      date: '2024-01-20',
      amount: 156320,
      method: 'EFT',
      reference: 'MPD-DEC-2023',
      status: 'completed'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed': return theme.colors.success;
      case 'pending': return theme.colors.warning;
      case 'overdue':
      case 'failed': return theme.colors.error;
      case 'draft': return theme.colors.info;
      default: return theme.colors.textSecondary;
    }
  };

  const formatCurrency = (amount: number) => {
    return `R${amount.toLocaleString()}`;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Billing & Invoicing</h1>
        <p className="page-subtitle">Manage invoices, payments, and billing settings</p>
      </div>

      {/* Tab Navigation */}
      <div className="card">
        <div className="card-header" style={{ padding: '0' }}>
          <div style={{ display: 'flex', gap: '0', width: '100%' }}>
            {(['overview', 'invoices', 'payments', 'pricing'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: activeTab === tab ? theme.colors.backgroundPaper : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab ? `2px solid ${theme.colors.primary}` : `2px solid transparent`,
                  color: activeTab === tab ? theme.colors.primary : theme.colors.textSecondary,
                  fontSize: '0.875rem',
                  fontWeight: activeTab === tab ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textTransform: 'capitalize'
                }}
              >
                {tab === 'overview' && '📊 '}
                {tab === 'invoices' && '📄 '}
                {tab === 'payments' && '💳 '}
                {tab === 'pricing' && '💰 '}
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Financial Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="card">
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div>
                    <p style={{ color: theme.colors.textSecondary, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Current Month Revenue</p>
                    <h2 style={{ fontSize: '2rem', fontWeight: '700', margin: 0 }}>{formatCurrency(498240)}</h2>
                  </div>
                  <span style={{ fontSize: '2rem' }}>💰</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <span style={{ color: theme.colors.success }}>↑ 12.5%</span>
                  <span style={{ color: theme.colors.textSecondary }}>from last month</span>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div>
                    <p style={{ color: theme.colors.textSecondary, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Outstanding Balance</p>
                    <h2 style={{ fontSize: '2rem', fontWeight: '700', margin: 0 }}>{formatCurrency(154680)}</h2>
                  </div>
                  <span style={{ fontSize: '2rem' }}>⏰</span>
                </div>
                <div style={{ fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                  3 pending invoices
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div>
                    <p style={{ color: theme.colors.textSecondary, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Clients</p>
                    <h2 style={{ fontSize: '2rem', fontWeight: '700', margin: 0 }}>24</h2>
                  </div>
                  <span style={{ fontSize: '2rem' }}>🏢</span>
                </div>
                <div style={{ fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                  21 active, 3 inactive
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div>
                    <p style={{ color: theme.colors.textSecondary, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Collection Rate</p>
                    <h2 style={{ fontSize: '2rem', fontWeight: '700', margin: 0 }}>96.8%</h2>
                  </div>
                  <span style={{ fontSize: '2rem' }}>✅</span>
                </div>
                <div style={{ fontSize: '0.875rem', color: theme.colors.success }}>
                  Excellent performance
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <h2>Monthly Revenue Trend</h2>
            </div>
            <div className="card-body">
              <div style={{ height: '300px', display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
                {['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'].map((month, idx) => {
                  const heights = [380, 420, 445, 460, 475, 498];
                  return (
                    <div key={month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div
                        style={{
                          width: '100%',
                          height: `${(heights[idx] / 500) * 250}px`,
                          background: idx === 5 ? theme.colors.primary : theme.colors.primaryLight,
                          borderRadius: '8px 8px 0 0',
                          position: 'relative',
                          transition: 'all 0.3s',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.boxShadow = theme.shadows.md;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <span style={{
                          position: 'absolute',
                          top: '-25px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}>
                          R{heights[idx]}k
                        </span>
                      </div>
                      <span style={{ fontSize: '0.875rem', color: theme.colors.textSecondary, marginTop: '0.5rem' }}>
                        {month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent Invoices */}
          <div className="card">
            <div className="card-header">
              <h2>Recent Invoices</h2>
              <button className="btn btn-primary" onClick={() => setShowNewInvoiceModal(true)}>
                Create Invoice
              </button>
            </div>
            <div className="card-body">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Invoice #</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Client</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Period</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Amount</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Due Date</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Status</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(invoice => (
                      <tr key={invoice.id} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                        <td style={{ padding: '0.75rem', fontWeight: '600', color: theme.colors.primary }}>
                          {invoice.id}
                        </td>
                        <td style={{ padding: '0.75rem' }}>{invoice.clientName}</td>
                        <td style={{ padding: '0.75rem' }}>{invoice.period}</td>
                        <td style={{ padding: '0.75rem', fontWeight: '600' }}>{formatCurrency(invoice.amount)}</td>
                        <td style={{ padding: '0.75rem' }}>{invoice.dueDate}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span className="status-badge" style={{ backgroundColor: getStatusColor(invoice.status) }}>
                            {invoice.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button className="btn btn-sm btn-outline" onClick={() => setSelectedInvoice(invoice)}>View</button>
                            <button className="btn btn-sm btn-outline">Send</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="card">
          <div className="card-header">
            <h2>All Invoices</h2>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="text"
                placeholder="Search invoices..."
                className="search-input"
                style={{ width: '250px' }}
              />
              <button className="btn btn-primary" onClick={() => setShowNewInvoiceModal(true)}>
                Create Invoice
              </button>
            </div>
          </div>
          <div className="card-body">
            <p style={{ color: theme.colors.textSecondary }}>Complete invoice management</p>
            {/* Full invoice list would go here */}
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <h2>Payment Methods</h2>
              <button className="btn btn-primary">Add Payment Method</button>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '1rem', border: `1px solid ${theme.colors.border}`, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '2rem' }}>🏦</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: '600' }}>Bank Transfer</p>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: theme.colors.textSecondary }}>Primary payment method</p>
                  </div>
                  <span className="status-badge" style={{ backgroundColor: theme.colors.success }}>Active</span>
                </div>
                <div style={{ padding: '1rem', border: `1px solid ${theme.colors.border}`, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '2rem' }}>💳</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: '600' }}>Electronic Funds Transfer</p>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: theme.colors.textSecondary }}>Secondary payment method</p>
                  </div>
                  <span className="status-badge" style={{ backgroundColor: theme.colors.success }}>Active</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2>Payment History</h2>
            </div>
            <div className="card-body">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Date</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Amount</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Method</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Reference</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Status</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map(payment => (
                      <tr key={payment.id} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                        <td style={{ padding: '0.75rem' }}>{payment.date}</td>
                        <td style={{ padding: '0.75rem', fontWeight: '600' }}>{formatCurrency(payment.amount)}</td>
                        <td style={{ padding: '0.75rem' }}>{payment.method}</td>
                        <td style={{ padding: '0.75rem', fontFamily: theme.fonts.mono, fontSize: '0.875rem' }}>{payment.reference}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span className="status-badge" style={{ backgroundColor: getStatusColor(payment.status) }}>
                            {payment.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <button className="btn btn-sm btn-outline">Receipt</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Pricing Tab */}
      {activeTab === 'pricing' && (
        <>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <h2>Service Pricing</h2>
              <button className="btn btn-primary">Update Pricing</button>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <div style={{ textAlign: 'center', padding: '1.5rem', background: theme.colors.background, borderRadius: '12px', border: `2px solid ${theme.colors.border}` }}>
                  <span style={{ fontSize: '2.5rem' }}>📦</span>
                  <h3 style={{ margin: '1rem 0 0.5rem' }}>Storage Fee</h3>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: theme.colors.primary }}>R40</div>
                  <p style={{ color: theme.colors.textSecondary, fontSize: '0.875rem' }}>per box / month</p>
                </div>
                <div style={{ textAlign: 'center', padding: '1.5rem', background: theme.colors.background, borderRadius: '12px', border: `2px solid ${theme.colors.border}` }}>
                  <span style={{ fontSize: '2.5rem' }}>📤</span>
                  <h3 style={{ margin: '1rem 0 0.5rem' }}>Normal Retrieval</h3>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: theme.colors.primary }}>Free</div>
                  <p style={{ color: theme.colors.textSecondary, fontSize: '0.875rem' }}>2-hour service</p>
                </div>
                <div style={{ textAlign: 'center', padding: '1.5rem', background: theme.colors.background, borderRadius: '12px', border: `2px solid ${theme.colors.border}` }}>
                  <span style={{ fontSize: '2.5rem' }}>⚡</span>
                  <h3 style={{ margin: '1rem 0 0.5rem' }}>Urgent Retrieval</h3>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: theme.colors.primary }}>R50</div>
                  <p style={{ color: theme.colors.textSecondary, fontSize: '0.875rem' }}>30-minute service</p>
                </div>
                <div style={{ textAlign: 'center', padding: '1.5rem', background: theme.colors.background, borderRadius: '12px', border: `2px solid ${theme.colors.border}` }}>
                  <span style={{ fontSize: '2.5rem' }}>🚚</span>
                  <h3 style={{ margin: '1rem 0 0.5rem' }}>Bulk Transfer</h3>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: theme.colors.primary }}>R500</div>
                  <p style={{ color: theme.colors.textSecondary, fontSize: '0.875rem' }}>per batch</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2>Client Pricing Tiers</h2>
            </div>
            <div className="card-body">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Tier</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Monthly Volume</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Storage Rate</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Discount</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Benefits</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                      <td style={{ padding: '0.75rem', fontWeight: '600' }}>Enterprise</td>
                      <td style={{ padding: '0.75rem' }}>1000+ boxes</td>
                      <td style={{ padding: '0.75rem' }}>R35/box</td>
                      <td style={{ padding: '0.75rem', color: theme.colors.success }}>12.5% off</td>
                      <td style={{ padding: '0.75rem' }}>Priority support, Free urgent retrievals</td>
                    </tr>
                    <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                      <td style={{ padding: '0.75rem', fontWeight: '600' }}>Professional</td>
                      <td style={{ padding: '0.75rem' }}>500-999 boxes</td>
                      <td style={{ padding: '0.75rem' }}>R38/box</td>
                      <td style={{ padding: '0.75rem', color: theme.colors.success }}>5% off</td>
                      <td style={{ padding: '0.75rem' }}>Dedicated account manager</td>
                    </tr>
                    <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                      <td style={{ padding: '0.75rem', fontWeight: '600' }}>Standard</td>
                      <td style={{ padding: '0.75rem' }}>0-499 boxes</td>
                      <td style={{ padding: '0.75rem' }}>R40/box</td>
                      <td style={{ padding: '0.75rem' }}>-</td>
                      <td style={{ padding: '0.75rem' }}>Standard support</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="modal-overlay" onClick={() => setSelectedInvoice(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Invoice {selectedInvoice.id}</h2>
              <button className="close-btn" onClick={() => setSelectedInvoice(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '0.875rem', color: theme.colors.textSecondary, marginBottom: '0.5rem' }}>Bill To</h3>
                    <p style={{ margin: 0, fontWeight: '600' }}>{selectedInvoice.clientName}</p>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: theme.colors.textSecondary }}>123 Main Street</p>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: theme.colors.textSecondary }}>Johannesburg, 2000</p>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.875rem', color: theme.colors.textSecondary, marginBottom: '0.5rem' }}>Invoice Details</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.875rem', color: theme.colors.textSecondary }}>Invoice Date:</span>
                      <span style={{ fontSize: '0.875rem' }}>2024-01-01</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.875rem', color: theme.colors.textSecondary }}>Due Date:</span>
                      <span style={{ fontSize: '0.875rem' }}>{selectedInvoice.dueDate}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.875rem', color: theme.colors.textSecondary }}>Status:</span>
                      <span className="status-badge" style={{ backgroundColor: getStatusColor(selectedInvoice.status) }}>
                        {selectedInvoice.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Services</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Description</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Qty</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Rate</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                      <td style={{ padding: '0.5rem' }}>Storage Service - {selectedInvoice.period}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>{selectedInvoice.boxCount}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>R40.00</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600' }}>
                        {formatCurrency(selectedInvoice.storageFees)}
                      </td>
                    </tr>
                    {selectedInvoice.retrievalFees > 0 && (
                      <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                        <td style={{ padding: '0.5rem' }}>Retrieval Fees</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>-</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>-</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600' }}>
                          {formatCurrency(selectedInvoice.retrievalFees)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>Total</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '1.25rem', fontWeight: '700', color: theme.colors.primary }}>
                        {formatCurrency(selectedInvoice.amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary" style={{ flex: 1 }}>📧 Send Invoice</button>
                <button className="btn btn-secondary" style={{ flex: 1 }}>📥 Download PDF</button>
                {selectedInvoice.status === 'pending' && (
                  <button className="btn btn-outline" style={{ flex: 1 }}>Mark as Paid</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Invoice Modal */}
      {showNewInvoiceModal && (
        <div className="modal-overlay" onClick={() => setShowNewInvoiceModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Invoice</h2>
              <button className="close-btn" onClick={() => setShowNewInvoiceModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                    Client
                  </label>
                  <select className="search-input" style={{ width: '100%' }}>
                    <option>Department of Justice</option>
                    <option>Metro Police Department</option>
                    <option>Provincial Court</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                      Billing Period
                    </label>
                    <input type="month" className="search-input" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                      Due Date
                    </label>
                    <input type="date" className="search-input" style={{ width: '100%' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                    Additional Notes
                  </label>
                  <textarea
                    className="search-input"
                    style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                    placeholder="Any additional notes or instructions..."
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Generate Invoice</button>
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowNewInvoiceModal(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;