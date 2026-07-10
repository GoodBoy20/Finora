import { useState, useEffect } from 'react';
import { Plus, Zap, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const opLabels = { equals: '=', not_equals: '≠', greater_than: '>', less_than: '<', contains: 'contains' };

const Automation = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    conditionField: 'amount', conditionOperator: 'greater_than', conditionValue: '',
    actionType: 'add_tag', actionValue: '',
  });

  const fetch = async () => {
    try { const r = await api.get('/rules'); setRules(r.data); }
    catch { toast.error('Failed to fetch rules'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  const openAdd = () => { setEditing(null); setForm({ conditionField: 'amount', conditionOperator: 'greater_than', conditionValue: '', actionType: 'add_tag', actionValue: '' }); setModalOpen(true); };
  const openEdit = (r) => { setEditing(r); setForm({ conditionField: r.conditionField, conditionOperator: r.conditionOperator, conditionValue: r.conditionValue, actionType: r.actionType, actionValue: r.actionValue }); setModalOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await api.put(`/rules/${editing._id}`, form); toast.success('Updated'); }
      else { await api.post('/rules', form); toast.success('Created'); }
      setModalOpen(false); fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const toggle = async (r) => {
    try { await api.put(`/rules/${r._id}`, { isActive: !r.isActive }); toast.success(r.isActive ? 'Disabled' : 'Enabled'); fetch(); }
    catch { toast.error('Failed'); }
  };

  const del = async (id) => {
    if (!confirm('Delete this rule?')) return;
    try { await api.delete(`/rules/${id}`); toast.success('Deleted'); fetch(); }
    catch { toast.error('Failed'); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-white">Automation Rules</h1><p className="text-gray-400 text-sm mt-1">IF-THEN rules for automatic transaction processing</p></div>
        <button onClick={openAdd} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg flex items-center gap-2"><Plus size={16} /> Add Rule</button>
      </div>

      {rules.length > 0 ? (
        <div className="space-y-3">
          {rules.map((r, i) => (
            <div key={r._id} className={`glass rounded-xl p-5 animate-fadeIn ${!r.isActive ? 'opacity-50' : ''}`} style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><Zap size={18} className="text-amber-400" /></div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full font-medium">IF</span>
                    <span className="text-sm text-gray-300">{r.conditionField}</span>
                    <span className="text-sm text-emerald-400 font-mono">{opLabels[r.conditionOperator]}</span>
                    <span className="text-sm text-white font-medium">"{r.conditionValue}"</span>
                    <span className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full font-medium">THEN</span>
                    <span className="text-sm text-gray-300">{r.actionType.replace('_', ' ')}</span>
                    <span className="text-sm text-white font-medium">"{r.actionValue}"</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggle(r)} className="p-2 rounded-lg hover:bg-navy-600">{r.isActive ? <ToggleRight size={20} className="text-emerald-400" /> : <ToggleLeft size={20} className="text-gray-500" />}</button>
                  <button onClick={() => openEdit(r)} className="p-2 hover:bg-navy-600 rounded-lg text-gray-400 hover:text-white"><Edit2 size={16} /></button>
                  <button onClick={() => del(r._id)} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Zap} title="No automation rules" description="Create IF-THEN rules to auto-tag or categorize transactions."
          action={<button onClick={openAdd} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg flex items-center gap-2"><Plus size={16} /> Add Rule</button>} />
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Rule' : 'Add Rule'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 bg-navy-900/50 border border-navy-700 rounded-lg space-y-3">
            <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full font-medium">IF</span>
            <div className="grid grid-cols-3 gap-3">
              <select value={form.conditionField} onChange={(e) => setForm({ ...form, conditionField: e.target.value })} className="px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-sm text-white">
                <option value="amount">Amount</option><option value="category">Category</option><option value="type">Type</option><option value="description">Description</option>
              </select>
              <select value={form.conditionOperator} onChange={(e) => setForm({ ...form, conditionOperator: e.target.value })} className="px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-sm text-white">
                <option value="equals">Equals</option><option value="not_equals">Not Equals</option><option value="greater_than">Greater Than</option><option value="less_than">Less Than</option><option value="contains">Contains</option>
              </select>
              <input type="text" value={form.conditionValue} onChange={(e) => setForm({ ...form, conditionValue: e.target.value })} required className="px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-sm text-white" placeholder="Value" />
            </div>
          </div>
          <div className="p-4 bg-navy-900/50 border border-navy-700 rounded-lg space-y-3">
            <span className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full font-medium">THEN</span>
            <div className="grid grid-cols-2 gap-3">
              <select value={form.actionType} onChange={(e) => setForm({ ...form, actionType: e.target.value })} className="px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-sm text-white">
                <option value="add_tag">Add Tag</option><option value="set_category">Set Category</option><option value="flag">Flag</option>
              </select>
              <input type="text" value={form.actionValue} onChange={(e) => setForm({ ...form, actionValue: e.target.value })} required className="px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-sm text-white" placeholder="Value" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 bg-navy-700 text-gray-300 text-sm rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg">{editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Automation;
