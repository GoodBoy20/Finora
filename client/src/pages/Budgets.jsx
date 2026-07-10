import { useState, useEffect } from 'react';
import { Plus, PiggyBank, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { formatCurrency, formatDateInput } from '../utils/helpers';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const Budgets = () => {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [form, setForm] = useState({ categoryId: '', limitAmount: '', period: 'monthly', startDate: '', endDate: '' });

  const fetchBudgets = async () => {
    try {
      const [budgetRes, catRes] = await Promise.all([api.get('/budgets'), api.get('/categories')]);
      setBudgets(budgetRes.data);
      setCategories(catRes.data.filter(c => c.category_type === 'expense'));
    } catch (err) {
      toast.error('Failed to fetch budgets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBudgets(); }, []);

  const getDefaultDates = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { startDate: formatDateInput(start), endDate: formatDateInput(end) };
  };

  const openAdd = () => {
    setEditingBudget(null);
    const dates = getDefaultDates();
    setForm({ categoryId: categories[0]?._id || '', limitAmount: '', period: 'monthly', ...dates });
    setModalOpen(true);
  };

  const openEdit = (b) => {
    setEditingBudget(b);
    setForm({
      categoryId: b.categoryId?._id || b.categoryId,
      limitAmount: b.limitAmount,
      period: b.period,
      startDate: formatDateInput(b.startDate),
      endDate: formatDateInput(b.endDate),
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...form, limitAmount: parseFloat(form.limitAmount) };
    try {
      if (editingBudget) {
        await api.put(`/budgets/${editingBudget._id}`, data);
        toast.success('Budget updated');
      } else {
        await api.post('/budgets', data);
        toast.success('Budget created');
      }
      setModalOpen(false);
      fetchBudgets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save budget');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this budget?')) return;
    try {
      await api.delete(`/budgets/${id}`);
      toast.success('Budget deleted');
      fetchBudgets();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Budgets</h1>
          <p className="text-gray-400 text-sm mt-1">Set spending limits and track your progress</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
          <Plus size={16} /> Add Budget
        </button>
      </div>

      {budgets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((budget, i) => {
            const percent = budget.limitAmount > 0 ? (budget.spentAmount / budget.limitAmount) * 100 : 0;
            const isOver = percent > 100;
            const isNear = percent > 80 && percent <= 100;
            return (
              <div key={budget._id} className="glass rounded-xl p-5 animate-fadeIn" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: budget.categoryId?.color || '#6B7280' }} />
                    <h3 className="text-white font-semibold">{budget.categoryId?.name || 'Category'}</h3>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(budget)} className="p-1.5 hover:bg-navy-600 rounded-lg text-gray-400 hover:text-white transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(budget._id)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-2xl font-bold text-white">{formatCurrency(budget.spentAmount)}</span>
                    <span className="text-sm text-gray-400">of {formatCurrency(budget.limitAmount)}</span>
                  </div>
                  <div className="w-full h-3 bg-navy-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isOver ? 'bg-red-500' : isNear ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className={`text-xs font-medium ${isOver ? 'text-red-400' : isNear ? 'text-amber-400' : 'text-gray-400'}`}>
                      {percent.toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-500 capitalize">{budget.period}</span>
                  </div>
                </div>

                {isOver && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <AlertTriangle size={14} className="text-red-400" />
                    <span className="text-xs text-red-400 font-medium">Over budget by {formatCurrency(budget.spentAmount - budget.limitAmount)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={PiggyBank} title="No budgets set" description="Create a budget to start tracking your spending limits."
          action={<button onClick={openAdd} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg flex items-center gap-2"><Plus size={16} /> Add Budget</button>} />
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingBudget ? 'Edit Budget' : 'Add Budget'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white">
              <option value="">Select category</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Limit Amount</label>
            <input type="number" step="0.01" value={form.limitAmount} onChange={(e) => setForm({ ...form, limitAmount: e.target.value })} required className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white" placeholder="5000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Period</label>
            <select value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white">
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 bg-navy-700 text-gray-300 text-sm rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg">{editingBudget ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Budgets;
