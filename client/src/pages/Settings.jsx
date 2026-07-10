import { useState, useEffect } from 'react';
import { User, Lock, Tag, Download, Upload, Save, Loader2, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', securityKey: '' });
  const [showPw, setShowPw] = useState(false);
  const [categories, setCategories] = useState([]);
  const [newCat, setNewCat] = useState({ name: '', category_type: 'expense', icon: 'Tag', color: '#10B981' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) setProfile({ name: user.name, email: user.email });
    api.get('/categories').then(r => setCategories(r.data)).catch(() => {});
  }, [user]);

  const saveProfile = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const r = await api.put('/auth/me', profile);
      updateUser(r.data); toast.success('Profile updated');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.put('/auth/password', pw);
      toast.success('Password changed'); setPw({ currentPassword: '', newPassword: '', securityKey: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const addCategory = async (e) => {
    e.preventDefault();
    try {
      const r = await api.post('/categories', newCat);
      setCategories([...categories, r.data]);
      setNewCat({ name: '', category_type: 'expense', icon: 'Tag', color: '#10B981' });
      toast.success('Category added');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const delCat = async (id) => {
    if (!confirm('Delete this category?')) return;
    try {
      await api.delete(`/categories/${id}`);
      setCategories(categories.filter(c => c._id !== id));
      toast.success('Deleted');
    } catch (err) { toast.error(err.response?.data?.message || 'Cannot delete — has transactions'); }
  };

  const [exportingData, setExportingData] = useState(false);

  const exportData = async () => {
    setExportingData(true);
    try {
      const response = await api.get('/transactions/export', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finora_transactions_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported');
    } catch { toast.error('Export failed'); }
    finally { setExportingData(false); }
  };

  const tabs = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'security', label: 'Security', icon: Lock },
    { key: 'categories', label: 'Categories', icon: Tag },
    { key: 'data', label: 'Import/Export', icon: Download },
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-white">Settings</h1><p className="text-gray-400 text-sm mt-1">Manage your account and preferences</p></div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-colors ${tab === t.key ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-gray-400 hover:text-white hover:bg-navy-700'}`}>
            <t.icon size={16} />{t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <form onSubmit={saveProfile} className="glass rounded-xl p-6 max-w-lg space-y-4">
          <div><label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
            <input type="text" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} required className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white focus:border-emerald-500" /></div>
          <div><label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} required className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white focus:border-emerald-500" /></div>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
          </button>
        </form>
      )}

      {tab === 'security' && (
        <form onSubmit={changePassword} className="glass rounded-xl p-6 max-w-lg space-y-4">
          <p className="text-sm text-gray-400">Changing your password requires your current password and security key.</p>
          <div><label className="block text-sm font-medium text-gray-300 mb-1">Current Password</label>
            <input type={showPw ? 'text' : 'password'} value={pw.currentPassword} onChange={e => setPw({ ...pw, currentPassword: e.target.value })} required className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white" /></div>
          <div><label className="block text-sm font-medium text-gray-300 mb-1">New Password</label>
            <input type={showPw ? 'text' : 'password'} value={pw.newPassword} onChange={e => setPw({ ...pw, newPassword: e.target.value })} required minLength={6} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white" /></div>
          <div><label className="block text-sm font-medium text-gray-300 mb-1">Security Key</label>
            <input type={showPw ? 'text' : 'password'} value={pw.securityKey} onChange={e => setPw({ ...pw, securityKey: e.target.value })} required className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white font-mono text-xs" /></div>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setShowPw(!showPw)} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />} {showPw ? 'Hide' : 'Show'}
            </button>
          </div>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />} Change Password
          </button>
          <p className="text-xs text-gray-500 mt-2">Your security key cannot be viewed, changed, or regenerated.</p>
        </form>
      )}

      {tab === 'categories' && (
        <div className="space-y-4">
          <form onSubmit={addCategory} className="glass rounded-xl p-4 flex flex-wrap items-end gap-3">
            <div><label className="block text-xs text-gray-400 mb-1">Name</label>
              <input type="text" value={newCat.name} onChange={e => setNewCat({ ...newCat, name: e.target.value })} required className="px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white w-40" /></div>
            <div><label className="block text-xs text-gray-400 mb-1">Type</label>
              <select value={newCat.category_type} onChange={e => setNewCat({ ...newCat, category_type: e.target.value })} className="px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white">
                <option value="expense">Expense</option><option value="income">Income</option></select></div>
            <div><label className="block text-xs text-gray-400 mb-1">Color</label>
              <input type="color" value={newCat.color} onChange={e => setNewCat({ ...newCat, color: e.target.value })} className="w-10 h-9 bg-navy-900 border border-navy-700 rounded-lg cursor-pointer" /></div>
            <button type="submit" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg flex items-center gap-1"><Plus size={14} /> Add</button>
          </form>
          <div className="glass rounded-xl divide-y divide-navy-700">
            {categories.map(c => (
              <div key={c._id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="text-sm text-white">{c.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.category_type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{c.category_type}</span>
                  {c.isDefault && <span className="text-xs text-gray-500">default</span>}
                </div>
                {!c.isDefault && <button onClick={() => delCat(c._id)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400"><Trash2 size={14} /></button>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'data' && (
        <div className="glass rounded-xl p-6 max-w-lg space-y-4">
          <h3 className="text-lg font-semibold text-white">Export Data</h3>
          <p className="text-sm text-gray-400">Download all your transactions as a CSV file (includes account details).</p>
          <button onClick={exportData} disabled={exportingData} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 disabled:opacity-50"><Download size={16} /> {exportingData ? 'Exporting...' : 'Export CSV'}</button>
        </div>
      )}
    </div>
  );
};

export default Settings;
