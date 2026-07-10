import { useState, useEffect } from 'react';
import { Plus, RefreshCw, Edit2, Trash2, Play, Pause } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { formatCurrency, formatDate, formatDateInput } from '../utils/helpers';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const Recurring = () => {
  const [rules, setRules] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [form, setForm] = useState({
    accountId: '', categoryId: '', amount: '', type: 'expense', description: '', frequency: 'monthly', nextRunDate: formatDateInput(new Date()),
  });

  const fetchData = async () => {
    try {
      const [rRes, aRes, cRes] = await Promise.all([api.get('/recurring'), api.get('/accounts'), api.get('/categories')]);
      setRules(rRes.data);
      setAccounts(aRes.data);
      setCategories(cRes.data);
    } catch (err) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => {
    setEditingRule(null);
    setForm({ accountId: accounts[0]?._id || '', categoryId: categories[0]?._id || '', amount: '', type: 'expense', description: '', frequency: 'monthly', nextRunDate: formatDateInput(new Date()) });
    setModalOpen(true);
  };

  const openEdit = (rule) => {
    setEditingRule(rule);
    setForm({
      accountId: rule.accountId?._id || rule.accountId, categoryId: rule.categoryId?._id || rule.categoryId,
      amount: rule.amount, type: rule.type, description: rule.description, frequency: rule.frequency,
      nextRunDate: formatDateInput(rule.nextRunDate),
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...form, amount: parseFloat(form.amount) };
    try {
      if (editingRule) {
        await api.put(`/recurring/${editingRule._id}`, data);
        toast.success('Rule updated');
      } else {
        await api.post('/recurring', data);
        toast.success('Rule created');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
  };

  const toggleActive = async (rule) => {
    try {
      await api.put(`/recurring/${rule._id}`, { isActive: !rule.isActive });
      toast.success(rule.isActive ? 'Rule paused' : 'Rule activated');
      fetchData();
    } catch (err) {
      toast.error('Failed to toggle');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this recurring rule?')) return;
    try {
      await api.delete(`/recurring/${id}`);
      toast.success('Rule deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  if (loading) return <LoadingSpinner />;

  const freqColors = { daily: 'bg-blue-500/10 text-blue-400', weekly: 'bg-purple-500/10 text-purple-400', monthly: 'bg-emerald-500/10 text-emerald-400', yearly: 'bg-amber-500/10 text-amber-400' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Recurring Transactions</h1>
          <p className="text-gray-400 text-sm mt-1">Automate your regular income and expenses</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
          <Plus size={16} /> Add Rule
        </button>
      </div>

      {rules.length > 0 ? (
        <div className="space-y-3">
          {rules.map((rule, i) => (
            <div key={rule._id} className={`glass rounded-xl p-5 animate-fadeIn ${!rule.isActive ? 'opacity-60' : ''}`} style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${rule.type === 'income' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                    <RefreshCw size={18} className={rule.type === 'income' ? 'text-emerald-400' : 'text-red-400'} />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{rule.description || rule.categoryId?.name || 'Recurring Rule'}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-sm font-semibold ${rule.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(rule.amount)}
                      </span>
                      <span className="text-gray-500">•</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${freqColors[rule.frequency] || freqColors.monthly}`}>
                        {rule.frequency}
                      </span>
                      <span className="text-gray-500">•</span>
                      <span className="text-xs text-gray-400">Next: {formatDate(rule.nextRunDate)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleActive(rule)} className={`p-2 rounded-lg transition-colors ${rule.isActive ? 'hover:bg-amber-500/10 text-emerald-400 hover:text-amber-400' : 'hover:bg-emerald-500/10 text-gray-400 hover:text-emerald-400'}`} title={rule.isActive ? 'Pause' : 'Activate'}>
                    {rule.isActive ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <button onClick={() => openEdit(rule)} className="p-2 hover:bg-navy-600 rounded-lg text-gray-400 hover:text-white transition-colors">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(rule._id)} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={RefreshCw} title="No recurring rules" description="Set up automatic recurring transactions for regular bills and income."
          action={<button onClick={openAdd} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg flex items-center gap-2"><Plus size={16} /> Add Rule</button>} />
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingRule ? 'Edit Rule' : 'Add Recurring Rule'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white">
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Amount</label>
              <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Account</label>
              <select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} required className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white">
                <option value="">Select</option>
                {accounts.map(a => <option key={a._id} value={a._id}>{a.account_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white">
                <option value="">Select</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white" placeholder="E.g., Monthly rent" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Frequency</label>
              <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Next Run Date</label>
              <input type="date" value={form.nextRunDate} onChange={(e) => setForm({ ...form, nextRunDate: e.target.value })} required className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 bg-navy-700 text-gray-300 text-sm rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg">{editingRule ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Recurring;
