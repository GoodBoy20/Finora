import { useState, useEffect } from 'react';
import { Plus, BellRing, Edit2, Trash2, ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const BudgetAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    categoryId: '',
    budgetId: '',
    thresholdPercent: 80,
    alertMessage: '',
    isActive: true,
  });

  const fetchAlerts = async () => {
    try {
      const res = await api.get('/budget-alerts');
      setAlerts(res.data);
    } catch {
      toast.error('Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  };

  const fetchMeta = async () => {
    try {
      const [catRes, budRes] = await Promise.all([
        api.get('/categories'),
        api.get('/budgets'),
      ]);
      setCategories(catRes.data);
      setBudgets(budRes.data);
    } catch {}
  };

  useEffect(() => {
    fetchAlerts();
    fetchMeta();
  }, []);

  // Filter budgets by selected category
  const filteredBudgets = form.categoryId
    ? budgets.filter((b) => {
        const catId = b.categoryId?._id || b.categoryId;
        return catId === form.categoryId || catId?.toString() === form.categoryId;
      })
    : [];

  const openAdd = () => {
    setEditing(null);
    setForm({
      categoryId: '',
      budgetId: '',
      thresholdPercent: 80,
      alertMessage: '',
      isActive: true,
    });
    setModalOpen(true);
  };

  const openEdit = (alert) => {
    setEditing(alert);
    setForm({
      categoryId: alert.categoryId?._id || alert.categoryId,
      budgetId: alert.budgetId?._id || alert.budgetId,
      thresholdPercent: alert.thresholdPercent,
      alertMessage: alert.alertMessage,
      isActive: alert.isActive,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/budget-alerts/${editing._id}`, form);
        toast.success('Alert updated');
      } else {
        await api.post('/budget-alerts', form);
        toast.success('Alert created');
      }
      setModalOpen(false);
      fetchAlerts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save alert');
    }
  };

  const toggleActive = async (alert) => {
    try {
      await api.put(`/budget-alerts/${alert._id}`, { isActive: !alert.isActive });
      toast.success(alert.isActive ? 'Alert disabled' : 'Alert enabled');
      fetchAlerts();
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this alert?')) return;
    try {
      await api.delete(`/budget-alerts/${id}`);
      toast.success('Alert deleted');
      fetchAlerts();
    } catch {
      toast.error('Failed to delete');
    }
  };

  // Check if triggered this month
  const isTriggeredThisMonth = (triggeredAt) => {
    if (!triggeredAt) return false;
    const now = new Date();
    const t = new Date(triggeredAt);
    return t.getMonth() === now.getMonth() && t.getFullYear() === now.getFullYear();
  };

  const formatDate = (d) => {
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BellRing size={24} className="text-amber-400" />
            Budget Alerts & Warnings
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Get notified when your spending approaches budget limits
          </p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus size={16} /> Add Alert
        </button>
      </div>

      {alerts.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {alerts.map((alert, i) => (
            <div
              key={alert._id}
              className={`glass rounded-xl p-5 animate-fadeIn relative overflow-hidden ${
                !alert.isActive ? 'opacity-50' : ''
              }`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* Triggered banner */}
              {isTriggeredThisMonth(alert.triggeredAt) && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-amber-500/20 to-red-500/20 border-b border-amber-500/30 px-4 py-2 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-400" />
                  <span className="text-xs font-medium text-amber-400">
                    ⚠ Triggered on {formatDate(alert.triggeredAt)}
                  </span>
                </div>
              )}

              <div className={isTriggeredThisMonth(alert.triggeredAt) ? 'pt-8' : ''}>
                {/* Category & Budget */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <BellRing size={18} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {alert.categoryId?.name || 'Unknown Category'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      Budget: ₹
                      {alert.budgetId?.limitAmount?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                </div>

                {/* Threshold */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">Threshold</span>
                    <span className="text-xs font-semibold text-amber-400">
                      Alert at {alert.thresholdPercent}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-navy-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${alert.thresholdPercent}%` }}
                    />
                  </div>
                </div>

                {/* Message */}
                <p className="text-xs text-gray-300 bg-navy-900/50 rounded-lg px-3 py-2 mb-4 italic">
                  "{alert.alertMessage}"
                </p>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => toggleActive(alert)}
                    className="p-2 rounded-lg hover:bg-navy-600 transition-colors"
                  >
                    {alert.isActive ? (
                      <ToggleRight size={22} className="text-emerald-400" />
                    ) : (
                      <ToggleLeft size={22} className="text-gray-500" />
                    )}
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(alert)}
                      className="p-2 hover:bg-navy-600 rounded-lg text-gray-400 hover:text-white transition-colors"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(alert._id)}
                      className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BellRing}
          title="No budget alerts"
          description="Create alerts to get notified when your spending approaches budget limits."
          action={
            <button
              onClick={openAdd}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg flex items-center gap-2"
            >
              <Plus size={16} /> Add Alert
            </button>
          }
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Budget Alert' : 'Add Budget Alert'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Category
            </label>
            <select
              value={form.categoryId}
              onChange={(e) =>
                setForm({ ...form, categoryId: e.target.value, budgetId: '' })
              }
              required
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white focus:border-emerald-500"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Budget */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Budget
            </label>
            <select
              value={form.budgetId}
              onChange={(e) => setForm({ ...form, budgetId: e.target.value })}
              required
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white focus:border-emerald-500"
            >
              <option value="">Select budget</option>
              {filteredBudgets.map((b) => (
                <option key={b._id} value={b._id}>
                  ₹{b.limitAmount?.toFixed(2)} ({b.period}) — Spent: ₹
                  {b.spentAmount?.toFixed(2)}
                </option>
              ))}
            </select>
            {form.categoryId && filteredBudgets.length === 0 && (
              <p className="text-xs text-amber-400 mt-1">
                No budgets found for this category
              </p>
            )}
          </div>

          {/* Threshold */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Threshold Percentage
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={form.thresholdPercent}
                onChange={(e) =>
                  setForm({ ...form, thresholdPercent: parseInt(e.target.value) })
                }
                className="flex-1 accent-amber-400"
              />
              <span className="text-sm font-bold text-amber-400 w-12 text-right">
                {form.thresholdPercent}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Alert fires when spending reaches this % of budget
            </p>
          </div>

          {/* Alert Message */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Custom Alert Message
            </label>
            <input
              type="text"
              value={form.alertMessage}
              onChange={(e) =>
                setForm({ ...form, alertMessage: e.target.value })
              }
              required
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white focus:border-emerald-500"
              placeholder="You're close to your Food budget limit!"
            />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-3 bg-navy-900/50 border border-navy-700 rounded-lg">
            <span className="text-sm text-gray-300">Active</span>
            <button
              type="button"
              onClick={() => setForm({ ...form, isActive: !form.isActive })}
              className="p-1"
            >
              {form.isActive ? (
                <ToggleRight size={24} className="text-emerald-400" />
              ) : (
                <ToggleLeft size={24} className="text-gray-500" />
              )}
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 bg-navy-700 hover:bg-navy-600 text-gray-300 text-sm rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {editing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BudgetAlerts;
