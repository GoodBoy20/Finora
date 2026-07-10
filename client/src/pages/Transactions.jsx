import { useState, useEffect } from 'react';
import { Plus, Filter, Upload, Download, Edit2, Trash2, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, ArrowLeftRight, X, ChevronDown, ChevronUp, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { formatCurrency, formatDate, formatDateInput } from '../utils/helpers';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [blockError, setBlockError] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({ type: '', category: '', account: '', startDate: '', endDate: '' });
  const [form, setForm] = useState({
    accountId: '', toAccountId: '', categoryId: '', amount: '', type: 'expense',
    date: formatDateInput(new Date()), description: '', tags: '', transferNote: '',
  });

  const fetchTransactions = async () => {
    try {
      const params = { page, limit: 15 };
      if (filters.type) params.type = filters.type;
      if (filters.category) params.category = filters.category;
      if (filters.account) params.account = filters.account;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      const res = await api.get('/transactions', { params });
      setTransactions(res.data.transactions || []);
      setTotalPages(res.data.pages || 1);
    } catch (err) {
      toast.error('Failed to fetch transactions');
    }
  };

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [accRes, catRes] = await Promise.all([api.get('/accounts'), api.get('/categories')]);
        setAccounts(accRes.data);
        setCategories(catRes.data);
      } catch (err) {}
      setLoading(false);
    };
    fetchMeta();
  }, []);

  useEffect(() => { fetchTransactions(); }, [page, filters]);

  const isTransfer = form.type === 'transfer';

  const openAdd = () => {
    setEditingTx(null);
    setBlockError('');
    setForm({
      accountId: accounts[0]?._id || '', toAccountId: '', categoryId: categories[0]?._id || '',
      amount: '', type: 'expense', date: formatDateInput(new Date()), description: '', tags: '', transferNote: '',
    });
    setModalOpen(true);
  };

  const openEdit = (tx) => {
    setEditingTx(tx);
    setBlockError('');
    setForm({
      accountId: tx.accountId?._id || tx.accountId,
      toAccountId: tx.toAccountId?._id || tx.toAccountId || '',
      categoryId: tx.categoryId?._id || tx.categoryId || '',
      amount: tx.amount, type: tx.type, date: formatDateInput(tx.date),
      description: tx.description || '', tags: (tx.tags || []).join(', '),
      transferNote: tx.transferNote || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBlockError('');

    const data = {
      accountId: form.accountId,
      amount: parseFloat(form.amount),
      type: form.type,
      date: form.date,
      description: form.description,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
    };

    if (isTransfer) {
      data.toAccountId = form.toAccountId;
      data.transferNote = form.transferNote;
      data.categoryId = null;

      if (!data.toAccountId) {
        setBlockError('🚫 Please select a To Account for the transfer');
        return;
      }
      if (data.accountId === data.toAccountId) {
        setBlockError('🚫 From and To accounts cannot be the same');
        return;
      }
    } else {
      data.categoryId = form.categoryId;
      data.toAccountId = null;
    }

    // Pre-check balance protection for expense/transfer (new transactions only)
    if ((data.type === 'expense' || data.type === 'transfer') && !editingTx) {
      try {
        const checkRes = await api.post('/balance-protection/check', {
          accountId: data.accountId,
          transactionAmount: data.amount,
          transactionType: data.type,
        });
        if (!checkRes.data.allowed) {
          setBlockError(`🚫 Transaction blocked: ${checkRes.data.message}`);
          return;
        }
        if (checkRes.data.warning) {
          toast(`⚠ Warning: ${checkRes.data.warning}`, {
            icon: '⚠️',
            style: { background: '#78350F', color: '#FDE68A', border: '1px solid #92400E', borderRadius: '12px', fontSize: '14px' },
          });
        }
      } catch {}
    }

    try {
      let res;
      if (editingTx) {
        res = await api.put(`/transactions/${editingTx._id}`, data);
        toast.success('Transaction updated');
      } else {
        res = await api.post('/transactions', data);
        toast.success(isTransfer ? 'Transfer completed' : 'Transaction created');
      }

      // Show balance warning from server response
      if (res.data.balanceWarning) {
        toast(`⚠ Warning: ${res.data.balanceWarning}`, {
          icon: '⚠️',
          style: { background: '#78350F', color: '#FDE68A', border: '1px solid #92400E', borderRadius: '12px', fontSize: '14px' },
        });
      }

      // Show triggered budget alerts
      if (res.data.triggeredAlerts && res.data.triggeredAlerts.length > 0) {
        res.data.triggeredAlerts.forEach((alert) => {
          toast(`⚠ Budget Alert: ${alert.alertMessage}`, {
            icon: '🔔',
            duration: 6000,
            style: { background: '#78350F', color: '#FDE68A', border: '1px solid #92400E', borderRadius: '12px', fontSize: '14px' },
          });
        });
      }

      setModalOpen(false);
      setBlockError('');
      fetchTransactions();
    } catch (err) {
      if (err.response?.data?.blocked) {
        setBlockError(`🚫 Transaction blocked: ${err.response.data.message}`);
      } else {
        toast.error(err.response?.data?.message || 'Failed to save transaction');
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await api.delete(`/transactions/${id}`);
      toast.success('Transaction deleted');
      fetchTransactions();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    const file = e.target.csvFile.files[0];
    if (!file) return toast.error('Select a CSV file');
    setImporting(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/transactions/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImportResult(res.data);
      if (res.data.importedCount > 0) {
        fetchTransactions();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.category) params.append('category', filters.category);
      if (filters.account) params.append('account', filters.account);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      const response = await api.get(`/transactions/export?${params.toString()}`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `finora_transactions_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Exported successfully');
    } catch {
      toast.error('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const downloadSampleCSV = () => {
    const csv = `date,amount,type,category,description,account,toAccount\n2024-01-15,5000,income,Salary,January salary,Your Account Name,\n2024-01-16,250,expense,Food,Lunch at cafe,Your Account Name,\n2024-01-17,2000,transfer,,Moved to savings,Your Account Name,Your Other Account Name`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'finora_sample_import.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Find account object for balance display
  const getAccountBalance = (id) => {
    const acc = accounts.find(a => a._id === id);
    return acc ? `₹${acc.balance?.toFixed(2)}` : '';
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your income, expenses, and transfers</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} disabled={exporting} title="Export transactions as CSV (includes account details)" className="px-4 py-2 bg-navy-700 hover:bg-navy-600 text-gray-300 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50">
            <Download size={16} /> {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
          <button onClick={() => setImportModalOpen(true)} className="px-4 py-2 bg-navy-700 hover:bg-navy-600 text-gray-300 text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
            <Upload size={16} /> Import CSV
          </button>
          <button onClick={openAdd} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
            <Plus size={16} /> Add Transaction
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4 flex flex-wrap gap-3 items-center">
        <Filter size={16} className="text-gray-400" />
        <select value={filters.type} onChange={(e) => { setFilters({ ...filters, type: e.target.value }); setPage(1); }} className="px-3 py-1.5 bg-navy-900 border border-navy-700 rounded-lg text-sm text-gray-300 focus:border-emerald-500">
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="transfer">Transfer</option>
        </select>
        <select value={filters.category} onChange={(e) => { setFilters({ ...filters, category: e.target.value }); setPage(1); }} className="px-3 py-1.5 bg-navy-900 border border-navy-700 rounded-lg text-sm text-gray-300 focus:border-emerald-500">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select value={filters.account} onChange={(e) => { setFilters({ ...filters, account: e.target.value }); setPage(1); }} className="px-3 py-1.5 bg-navy-900 border border-navy-700 rounded-lg text-sm text-gray-300 focus:border-emerald-500">
          <option value="">All Accounts</option>
          {accounts.map(a => <option key={a._id} value={a._id}>{a.account_name}</option>)}
        </select>
        <input type="date" value={filters.startDate} onChange={(e) => { setFilters({ ...filters, startDate: e.target.value }); setPage(1); }} className="px-3 py-1.5 bg-navy-900 border border-navy-700 rounded-lg text-sm text-gray-300 focus:border-emerald-500" />
        <input type="date" value={filters.endDate} onChange={(e) => { setFilters({ ...filters, endDate: e.target.value }); setPage(1); }} className="px-3 py-1.5 bg-navy-900 border border-navy-700 rounded-lg text-sm text-gray-300 focus:border-emerald-500" />
        {(filters.type || filters.category || filters.account || filters.startDate || filters.endDate) && (
          <button onClick={() => { setFilters({ type: '', category: '', account: '', startDate: '', endDate: '' }); setPage(1); }} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      {transactions.length > 0 ? (
        <div className="glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-navy-700">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase">Description</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase">Category</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase">Account</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase">Type</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 uppercase">Amount</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx._id} className="border-b border-navy-700/50 hover:bg-navy-700/30 transition-colors">
                    <td className="px-5 py-3 text-sm text-gray-300">{formatDate(tx.date)}</td>
                    <td className="px-5 py-3 text-sm text-white">
                      {tx.type === 'transfer' ? (tx.transferNote || tx.description || 'Transfer') : (tx.description || '-')}
                    </td>
                    <td className="px-5 py-3">
                      {tx.type === 'transfer' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400">
                          <ArrowLeftRight size={10} /> Transfer
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: `${tx.categoryId?.color || '#6B7280'}20`, color: tx.categoryId?.color || '#6B7280' }}>
                          {tx.categoryId?.name || 'N/A'}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-300">
                      {tx.type === 'transfer' ? (
                        <span className="inline-flex items-center gap-1 text-blue-400">
                          {tx.accountId?.account_name || '?'}
                          <ArrowLeftRight size={12} className="text-blue-500 mx-0.5" />
                          {tx.toAccountId?.account_name || '?'}
                        </span>
                      ) : (
                        tx.accountId?.account_name || 'N/A'
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                        tx.type === 'income' ? 'text-emerald-400' : tx.type === 'expense' ? 'text-red-400' : 'text-blue-400'
                      }`}>
                        {tx.type === 'income' ? <ArrowUpRight size={12} /> : tx.type === 'transfer' ? <ArrowLeftRight size={12} /> : <ArrowDownRight size={12} />}
                        {tx.type}
                      </span>
                    </td>
                    <td className={`px-5 py-3 text-sm font-semibold text-right ${
                      tx.type === 'income' ? 'text-emerald-400' : tx.type === 'expense' ? 'text-red-400' : 'text-blue-400'
                    }`}>
                      {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '↔'}{formatCurrency(tx.amount)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(tx)} className="p-1.5 hover:bg-navy-600 rounded-lg transition-colors text-gray-400 hover:text-white">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(tx._id)} className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors text-gray-400 hover:text-red-400">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-navy-700">
            <span className="text-sm text-gray-400">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 bg-navy-700 hover:bg-navy-600 rounded-lg disabled:opacity-30 text-gray-400">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 bg-navy-700 hover:bg-navy-600 rounded-lg disabled:opacity-30 text-gray-400">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState icon={ArrowDownRight} title="No transactions yet" description="Add your first transaction to start tracking your finances." action={
          <button onClick={openAdd} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg flex items-center gap-2">
            <Plus size={16} /> Add Transaction
          </button>
        } />
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingTx ? 'Edit Transaction' : 'Add Transaction'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, toAccountId: '', transferNote: '' })} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white focus:border-emerald-500">
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Amount</label>
              <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white focus:border-emerald-500" placeholder="0.00" />
            </div>
          </div>

          {isTransfer ? (
            <>
              {/* Transfer-specific fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">From Account</label>
                  <select
                    value={form.accountId}
                    onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white focus:border-emerald-500"
                  >
                    <option value="">Select account</option>
                    {accounts.map(a => <option key={a._id} value={a._id}>{a.account_name}</option>)}
                  </select>
                  {form.accountId && (
                    <p className="text-xs text-gray-500 mt-1">Balance: {getAccountBalance(form.accountId)}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">To Account</label>
                  <select
                    value={form.toAccountId}
                    onChange={(e) => setForm({ ...form, toAccountId: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white focus:border-emerald-500"
                  >
                    <option value="">Select account</option>
                    {accounts
                      .filter(a => a._id !== form.accountId)
                      .map(a => <option key={a._id} value={a._id}>{a.account_name}</option>)}
                  </select>
                  {form.toAccountId && (
                    <p className="text-xs text-gray-500 mt-1">Balance: {getAccountBalance(form.toAccountId)}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Transfer Note <span className="text-gray-500">(optional)</span></label>
                <input type="text" value={form.transferNote} onChange={(e) => setForm({ ...form, transferNote: e.target.value })} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white focus:border-emerald-500" placeholder="e.g. Moving to savings account" />
              </div>
            </>
          ) : (
            <>
              {/* Income/Expense fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Account</label>
                  <select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} required className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white focus:border-emerald-500">
                    <option value="">Select account</option>
                    {accounts.map(a => <option key={a._id} value={a._id}>{a.account_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                  <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white focus:border-emerald-500">
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white focus:border-emerald-500" />
          </div>
          {!isTransfer && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white focus:border-emerald-500" placeholder="E.g., Grocery shopping" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Tags <span className="text-gray-500">(comma separated)</span></label>
                <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white focus:border-emerald-500" placeholder="food, weekly" />
              </div>
            </>
          )}
          {blockError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400 font-medium">
              {blockError}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 bg-navy-700 hover:bg-navy-600 text-gray-300 text-sm rounded-lg transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors">
              {editingTx ? 'Update' : isTransfer ? 'Transfer' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Import CSV Modal */}
      <Modal isOpen={importModalOpen} onClose={() => { setImportModalOpen(false); setImportResult(null); setShowGuide(false); }} title="Import Transactions from CSV">
        {!importResult ? (
          <form onSubmit={handleImport} className="space-y-4">
            {/* CSV Format Guide */}
            <div className="bg-navy-900/50 border border-navy-700 rounded-lg overflow-hidden">
              <button type="button" onClick={() => setShowGuide(!showGuide)} className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                <span>📋 How to format your CSV</span>
                {showGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showGuide && (
                <div className="px-4 pb-4 space-y-3 text-xs text-gray-400 border-t border-navy-700 pt-3">
                  <p className="font-medium text-gray-300">For income / expense rows:</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead><tr className="text-gray-500">
                        <th className="pr-3 pb-1">date</th><th className="pr-3 pb-1">amount</th><th className="pr-3 pb-1">type</th><th className="pr-3 pb-1">category</th><th className="pr-3 pb-1">description</th><th className="pr-3 pb-1">account</th>
                      </tr></thead>
                      <tbody><tr className="text-gray-300">
                        <td className="pr-3">2024-01-15</td><td className="pr-3">5000</td><td className="pr-3">income</td><td className="pr-3">Salary</td><td className="pr-3">Jan salary</td><td className="pr-3">HDFC Savings</td>
                      </tr></tbody>
                    </table>
                  </div>
                  <p className="font-medium text-gray-300 pt-2">For transfer rows (add toAccount column):</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead><tr className="text-gray-500">
                        <th className="pr-3 pb-1">date</th><th className="pr-3 pb-1">amount</th><th className="pr-3 pb-1">type</th><th className="pr-3 pb-1">category</th><th className="pr-3 pb-1">description</th><th className="pr-3 pb-1">account</th><th className="pr-3 pb-1">toAccount</th>
                      </tr></thead>
                      <tbody><tr className="text-gray-300">
                        <td className="pr-3">2024-01-17</td><td className="pr-3">2000</td><td className="pr-3">transfer</td><td className="pr-3"></td><td className="pr-3">To wallet</td><td className="pr-3">HDFC Savings</td><td className="pr-3">Paytm Wallet</td>
                      </tr></tbody>
                    </table>
                  </div>
                  <div className="space-y-1 pt-2 text-gray-500">
                    <p>• <span className="text-gray-400">toAccount</span> is only required for transfer rows — leave empty for income/expense</p>
                    <p>• Account names must match your FINORA accounts (case-insensitive)</p>
                    <p>• Accepted date formats: YYYY-MM-DD, DD/MM/YYYY, MM-DD-YYYY</p>
                  </div>
                </div>
              )}
            </div>

            {/* Download sample */}
            <button type="button" onClick={downloadSampleCSV} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-navy-800 hover:bg-navy-700 border border-navy-700 text-gray-300 text-sm rounded-lg transition-colors">
              <Download size={14} /> Download Sample CSV
            </button>

            {/* File input */}
            <input type="file" name="csvFile" accept=".csv" className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-gray-300 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-emerald-500 file:text-white hover:file:bg-emerald-600" />

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setImportModalOpen(false); setImportResult(null); }} className="px-4 py-2 bg-navy-700 text-gray-300 text-sm rounded-lg">Cancel</button>
              <button type="submit" disabled={importing} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </form>
        ) : (
          /* Results panel */
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
                <CheckCircle size={18} className="text-emerald-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-emerald-400">{importResult.importedCount}</p>
                <p className="text-xs text-gray-400">Imported</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
                <AlertTriangle size={18} className="text-amber-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-amber-400">{importResult.warnings?.length || 0}</p>
                <p className="text-xs text-gray-400">Warnings</p>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                <XCircle size={18} className="text-red-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-red-400">{importResult.skippedCount}</p>
                <p className="text-xs text-gray-400">Skipped</p>
              </div>
            </div>

            {/* Skipped rows */}
            {importResult.skipped?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-red-400 mb-2">Skipped Rows</p>
                <div className="max-h-32 overflow-y-auto space-y-1 bg-navy-900/50 rounded-lg p-3">
                  {importResult.skipped.map((s, i) => (
                    <p key={i} className="text-xs text-red-300 flex items-start gap-1.5">
                      <XCircle size={12} className="mt-0.5 shrink-0" />
                      <span><span className="text-gray-500">Row {s.row}:</span> {s.reason}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {importResult.warnings?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-amber-400 mb-2">Warnings</p>
                <div className="max-h-32 overflow-y-auto space-y-1 bg-navy-900/50 rounded-lg p-3">
                  {importResult.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-amber-300 flex items-start gap-1.5">
                      <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                      <span><span className="text-gray-500">Row {w.row}:</span> {w.message}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button onClick={() => { setImportModalOpen(false); setImportResult(null); }} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg">
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Transactions;
