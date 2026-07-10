import { useState, useEffect } from 'react';
import { Plus, Shield, Edit2, Trash2, ToggleLeft, ToggleRight, ShieldAlert, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const BalanceProtection = () => {
  const [rules, setRules] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    accountId: '',
    minimumBalance: '',
    alertMessage: '',
    blockTransaction: false,
    isActive: true,
  });

  const fetchRules = async () => {
    try {
      const res = await api.get('/balance-protection');
      setRules(res.data);
    } catch {
      toast.error('Failed to fetch protection rules');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data);
    } catch {}
  };

  useEffect(() => {
    fetchRules();
    fetchAccounts();
  }, []);

  const selectedAccount = accounts.find((a) => a._id === form.accountId);

  const openAdd = () => {
    setEditing(null);
    setForm({
      accountId: '',
      minimumBalance: '',
      alertMessage: '',
      blockTransaction: false,
      isActive: true,
    });
    setModalOpen(true);
  };

  const openEdit = (rule) => {
    setEditing(rule);
    setForm({
      accountId: rule.accountId?._id || rule.accountId,
      minimumBalance: rule.minimumBalance,
      alertMessage: rule.alertMessage,
      blockTransaction: rule.blockTransaction,
      isActive: rule.isActive,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...form, minimumBalance: parseFloat(form.minimumBalance) };
    try {
      if (editing) {
        await api.put(`/balance-protection/${editing._id}`, data);
        toast.success('Protection rule updated');
      } else {
        await api.post('/balance-protection', data);
        toast.success('Protection rule created');
      }
      setModalOpen(false);
      fetchRules();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save rule');
    }
  };

  const toggleActive = async (rule) => {
    try {
      await api.put(`/balance-protection/${rule._id}`, { isActive: !rule.isActive });
      toast.success(rule.isActive ? 'Rule disabled' : 'Rule enabled');
      fetchRules();
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this protection rule?')) return;
    try {
      await api.delete(`/balance-protection/${id}`);
      toast.success('Rule deleted');
      fetchRules();
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield size={24} className="text-blue-400" />
            Balance Protection
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Protect your accounts from dropping below safe balance levels
          </p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus size={16} /> Add Protection Rule
        </button>
      </div>

      {rules.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rules.map((rule, i) => (
            <div
              key={rule._id}
              className={`glass rounded-xl p-5 animate-fadeIn ${
                !rule.isActive ? 'opacity-50' : ''
              }`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* Account info */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Shield size={18} className="text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {rule.accountId?.account_name || 'Unknown Account'}
                  </p>
                  <p className="text-xs text-gray-400">
                    Current: ₹{rule.accountId?.balance?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>

              {/* Minimum balance */}
              <div className="bg-navy-900/50 rounded-lg px-3 py-2 mb-3 flex items-center justify-between">
                <span className="text-xs text-gray-400">Min. Balance</span>
                <span className="text-sm font-bold text-white">
                  ₹{rule.minimumBalance?.toFixed(2)}
                </span>
              </div>

              {/* Mode badge */}
              <div className="mb-3">
                {rule.blockTransaction ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                    <ShieldAlert size={12} />
                    Will block transactions
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <ShieldCheck size={12} />
                    Warn only
                  </span>
                )}
              </div>

              {/* Message */}
              <p className="text-xs text-gray-300 bg-navy-900/50 rounded-lg px-3 py-2 mb-4 italic">
                "{rule.alertMessage}"
              </p>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => toggleActive(rule)}
                  className="p-2 rounded-lg hover:bg-navy-600 transition-colors"
                >
                  {rule.isActive ? (
                    <ToggleRight size={22} className="text-emerald-400" />
                  ) : (
                    <ToggleLeft size={22} className="text-gray-500" />
                  )}
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(rule)}
                    className="p-2 hover:bg-navy-600 rounded-lg text-gray-400 hover:text-white transition-colors"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(rule._id)}
                    className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Shield}
          title="No protection rules"
          description="Create rules to safeguard your accounts from dropping below minimum balance."
          action={
            <button
              onClick={openAdd}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg flex items-center gap-2"
            >
              <Plus size={16} /> Add Protection Rule
            </button>
          }
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Protection Rule' : 'Add Protection Rule'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Account
            </label>
            <select
              value={form.accountId}
              onChange={(e) => setForm({ ...form, accountId: e.target.value })}
              required
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white focus:border-emerald-500"
            >
              <option value="">Select account</option>
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.account_name} ({a.type})
                </option>
              ))}
            </select>
            {selectedAccount && (
              <p className="text-xs text-gray-400 mt-1">
                Current balance: ₹{selectedAccount.balance?.toFixed(2)}
              </p>
            )}
          </div>

          {/* Minimum Balance */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Minimum Balance (₹)
            </label>
            <input
              type="number"
              step="0.01"
              value={form.minimumBalance}
              onChange={(e) =>
                setForm({ ...form, minimumBalance: e.target.value })
              }
              required
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white focus:border-emerald-500"
              placeholder="5000.00"
            />
            <p className="text-xs text-gray-500 mt-1">
              A warning/block will trigger if balance drops below this amount
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
              placeholder="Balance too low in savings account!"
            />
          </div>

          {/* Block vs Warn Toggle */}
          <div className="p-3 bg-navy-900/50 border border-navy-700 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Block Transaction</span>
              <button
                type="button"
                onClick={() =>
                  setForm({ ...form, blockTransaction: !form.blockTransaction })
                }
                className="p-1"
              >
                {form.blockTransaction ? (
                  <ToggleRight size={24} className="text-red-400" />
                ) : (
                  <ToggleLeft size={24} className="text-gray-500" />
                )}
              </button>
            </div>
            {form.blockTransaction ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                <ShieldAlert size={12} />
                Will block transactions
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <ShieldCheck size={12} />
                Will warn only
              </span>
            )}
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

export default BalanceProtection;
