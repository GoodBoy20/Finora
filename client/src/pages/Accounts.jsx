import { useState, useEffect } from 'react';
import { Plus, Wallet, CreditCard, Edit2, Trash2, ArrowRightLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { formatCurrency } from '../utils/helpers';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const iconMap = { bank: CreditCard, wallet: Wallet };
const colorMap = { bank: 'from-blue-500 to-blue-600', wallet: 'from-purple-500 to-purple-600' };

const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [editingAcc, setEditingAcc] = useState(null);
  const [form, setForm] = useState({ account_name: '', type: 'bank', balance: '', currency: 'INR' });
  const [transferForm, setTransferForm] = useState({ fromId: '', toId: '', amount: '' });

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data);
    } catch (err) {
      toast.error('Failed to fetch accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAccounts(); }, []);

  const openAdd = () => {
    setEditingAcc(null);
    setForm({ account_name: '', type: 'bank', balance: '', currency: 'INR' });
    setModalOpen(true);
  };

  const openEdit = (acc) => {
    setEditingAcc(acc);
    setForm({ account_name: acc.account_name, type: acc.type, balance: acc.balance, currency: acc.currency });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...form, balance: parseFloat(form.balance) || 0 };
    try {
      if (editingAcc) {
        await api.put(`/accounts/${editingAcc._id}`, data);
        toast.success('Account updated');
      } else {
        await api.post('/accounts', data);
        toast.success('Account created');
      }
      setModalOpen(false);
      fetchAccounts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save account');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this account? This will also delete all transactions associated with this account.')) return;
    try {
      await api.delete(`/accounts/${id}`);
      toast.success('Account deleted');
      fetchAccounts();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    const { fromId, toId, amount } = transferForm;
    if (fromId === toId) return toast.error('Cannot transfer to the same account');
    try {
      // Get default category
      const catRes = await api.get('/categories');
      const othersCat = catRes.data.find(c => c.name === 'Others') || catRes.data[0];

      // Create expense from source
      await api.post('/transactions', {
        accountId: fromId, categoryId: othersCat._id,
        amount: parseFloat(amount), type: 'transfer', description: 'Transfer out',
      });
      // Create income to destination
      await api.post('/transactions', {
        accountId: toId, categoryId: othersCat._id,
        amount: parseFloat(amount), type: 'transfer', description: 'Transfer in',
      });
      toast.success('Transfer complete');
      setTransferModalOpen(false);
      fetchAccounts();
    } catch (err) {
      toast.error('Transfer failed');
    }
  };

  if (loading) return <LoadingSpinner />;

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Accounts</h1>
          <p className="text-gray-400 text-sm mt-1">Total Balance: <span className="text-emerald-400 font-semibold">{formatCurrency(totalBalance)}</span></p>
        </div>
        <div className="flex gap-2">
          {accounts.length >= 2 && (
            <button onClick={() => setTransferModalOpen(true)} className="px-4 py-2 bg-navy-700 hover:bg-navy-600 text-gray-300 text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
              <ArrowRightLeft size={16} /> Transfer
            </button>
          )}
          <button onClick={openAdd} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
            <Plus size={16} /> Add Account
          </button>
        </div>
      </div>

      {accounts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc, i) => {
            const Icon = iconMap[acc.type] || Wallet;
            const gradient = colorMap[acc.type] || colorMap.bank;
            return (
              <div key={acc._id} className="glass rounded-xl p-5 animate-fadeIn hover:border-emerald-500/30 transition-all duration-300" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                    <Icon size={20} className="text-white" />
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(acc)} className="p-1.5 hover:bg-navy-600 rounded-lg text-gray-400 hover:text-white transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(acc._id)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <h3 className="text-white font-semibold mb-1">{acc.account_name}</h3>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">{acc.type} • {acc.currency}</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(acc.balance)}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={Wallet} title="No accounts yet" description="Create your first account to start tracking your finances."
          action={<button onClick={openAdd} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg flex items-center gap-2"><Plus size={16} /> Add Account</button>} />
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingAcc ? 'Edit Account' : 'Add Account'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Account Name</label>
            <input type="text" value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} required className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white focus:border-emerald-500" placeholder="E.g., HDFC Savings" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white focus:border-emerald-500">
              <option value="bank">Bank</option>
              <option value="wallet">Wallet</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Balance</label>
            <input type="number" step="0.01" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white focus:border-emerald-500" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Currency</label>
            <input type="text" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white focus:border-emerald-500" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 bg-navy-700 text-gray-300 text-sm rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg">{editingAcc ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      {/* Transfer Modal */}
      <Modal isOpen={transferModalOpen} onClose={() => setTransferModalOpen(false)} title="Transfer Between Accounts" size="sm">
        <form onSubmit={handleTransfer} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">From Account</label>
            <select value={transferForm.fromId} onChange={(e) => setTransferForm({ ...transferForm, fromId: e.target.value })} required className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white">
              <option value="">Select source</option>
              {accounts.map(a => <option key={a._id} value={a._id}>{a.account_name} ({formatCurrency(a.balance)})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">To Account</label>
            <select value={transferForm.toId} onChange={(e) => setTransferForm({ ...transferForm, toId: e.target.value })} required className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white">
              <option value="">Select destination</option>
              {accounts.map(a => <option key={a._id} value={a._id}>{a.account_name} ({formatCurrency(a.balance)})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Amount</label>
            <input type="number" step="0.01" value={transferForm.amount} onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })} required className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white" placeholder="0.00" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setTransferModalOpen(false)} className="px-4 py-2 bg-navy-700 text-gray-300 text-sm rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg">Transfer</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Accounts;
