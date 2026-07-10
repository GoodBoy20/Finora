import { useState, useEffect } from 'react';
import { BarChart3, Printer } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import api from '../utils/api';
import { formatCurrency, getMonthName } from '../utils/helpers';
import LoadingSpinner from '../components/LoadingSpinner';

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6', '#F97316', '#6B7280'];

const Reports = () => {
  const [monthly, setMonthly] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [cashflow, setCashflow] = useState([]);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(6);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const [monthRes, catRes, cashRes] = await Promise.all([
          api.get(`/reports/monthly?months=${months}`),
          api.get('/reports/category'),
          api.get(`/reports/cashflow?months=${months}`),
        ]);
        setMonthly(monthRes.data.map(m => ({ ...m, monthLabel: getMonthName(m.month) })));
        setCategoryData(catRes.data);
        setCashflow(cashRes.data.map(m => ({ ...m, monthLabel: getMonthName(m.month) })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [months]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-navy-800 border border-navy-700 rounded-lg p-3 shadow-xl">
          <p className="text-gray-300 text-xs mb-1">{label}</p>
          {payload.map((p, i) => (
            <p key={i} className="text-sm" style={{ color: p.color }}>
              {p.name}: {formatCurrency(p.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) return <LoadingSpinner size="lg" text="Generating reports..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-gray-400 text-sm mt-1">Detailed financial analytics</p>
        </div>
        <div className="flex gap-3 items-center">
          <select value={months} onChange={(e) => setMonths(parseInt(e.target.value))} className="px-3 py-1.5 bg-navy-800 border border-navy-700 rounded-lg text-sm text-gray-300">
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
          </select>
          <button onClick={() => window.print()} className="px-4 py-2 bg-navy-700 hover:bg-navy-600 text-gray-300 text-sm font-medium rounded-lg flex items-center gap-2">
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      {/* Monthly Income vs Expense Bar Chart */}
      <div className="glass rounded-xl p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Monthly Income vs Expenses</h3>
        {monthly.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthly} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="monthLabel" tick={{ fill: '#94A3B8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#94A3B8', fontSize: 12 }} />
              <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} name="Income" />
              <Bar dataKey="expense" fill="#EF4444" radius={[4, 4, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-gray-500 text-sm">No data available</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Donut Chart */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Spending by Category</h3>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={categoryData} dataKey="total" nameKey="name"
                    cx="50%" cy="50%" outerRadius={90} innerRadius={55} paddingAngle={3}
                  >
                    {categoryData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color || COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px', color: '#F8FAFC' }} />
                  <Legend wrapperStyle={{ color: '#94A3B8', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-4">
                {categoryData.map((cat, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color || COLORS[i % COLORS.length] }} />
                      <span className="text-gray-300">{cat.name}</span>
                    </div>
                    <span className="text-gray-400">{formatCurrency(cat.total)} ({cat.count} tx)</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-gray-500 text-sm">No expense data</div>
          )}
        </div>

        {/* Cash Flow Line Chart */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Cash Flow Trend</h3>
          {cashflow.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={cashflow}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="monthLabel" tick={{ fill: '#94A3B8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: '#94A3B8', fontSize: 12 }} />
                <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} name="Income" />
                <Line type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2} dot={{ r: 4 }} name="Expenses" />
                <Line type="monotone" dataKey="net" stroke="#3B82F6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} name="Net" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[320px] text-gray-500 text-sm">No data available</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
