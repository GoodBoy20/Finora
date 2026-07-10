import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Percent, ArrowUpRight, ArrowDownRight, ArrowLeftRight } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../utils/api';
import { formatCurrency, formatDate, getMonthName } from '../utils/helpers';
import LoadingSpinner from '../components/LoadingSpinner';

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6', '#F97316', '#6B7280'];

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [recentTx, setRecentTx] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sumRes, monthRes, catRes, txRes, budgetRes] = await Promise.all([
          api.get('/reports/summary'),
          api.get('/reports/monthly'),
          api.get('/reports/category'),
          api.get('/transactions?limit=10'),
          api.get('/budgets'),
        ]);
        setSummary(sumRes.data);
        setMonthly(monthRes.data.map(m => ({ ...m, monthLabel: getMonthName(m.month) })));
        setCategoryData(catRes.data);
        setRecentTx(txRes.data.transactions || []);
        setBudgets(budgetRes.data || []);
      } catch (err) {
        console.error('Dashboard data error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <LoadingSpinner size="lg" text="Loading dashboard..." />;

  const summaryCards = [
    { label: 'Total Balance', value: summary?.totalBalance || 0, icon: DollarSign, color: 'from-emerald-500 to-emerald-600', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-400' },
    { label: 'Total Income', value: summary?.totalIncome || 0, icon: TrendingUp, color: 'from-blue-500 to-blue-600', iconBg: 'bg-blue-500/10', iconColor: 'text-blue-400' },
    { label: 'Total Expenses', value: summary?.totalExpenses || 0, icon: TrendingDown, color: 'from-red-500 to-red-600', iconBg: 'bg-red-500/10', iconColor: 'text-red-400' },
    { label: 'Savings Rate', value: `${(summary?.savingsRate || 0).toFixed(1)}%`, icon: Percent, color: 'from-purple-500 to-purple-600', iconBg: 'bg-purple-500/10', iconColor: 'text-purple-400', isCurrency: false },
  ];

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Your financial overview at a glance</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <div key={i} className="glass rounded-xl p-5 card-glow animate-fadeIn" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                <card.icon size={20} className={card.iconColor} />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">
              {card.isCurrency === false ? card.value : formatCurrency(card.value)}
            </p>
            <p className="text-sm text-gray-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expenses Line Chart */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Income vs Expenses</h3>
          {monthly.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="monthLabel" tick={{ fill: '#94A3B8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: '#94A3B8', fontSize: 12 }} />
                <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} name="Income" />
                <Line type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2} dot={{ r: 4 }} name="Expenses" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-gray-500 text-sm">
              No data yet — add some transactions to see trends
            </div>
          )}
        </div>

        {/* Expense breakdown Pie Chart */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Expense Breakdown</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="total"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={3}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#64748B' }}
                >
                  {categoryData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color || COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px', color: '#F8FAFC' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-gray-500 text-sm">
              No expense data — add some transactions to see breakdown
            </div>
          )}
        </div>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Transactions</h3>
          {recentTx.length > 0 ? (
            <div className="space-y-3">
              {recentTx.map((tx) => (
                <div key={tx._id} className="flex items-center justify-between py-2 border-b border-navy-700/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: tx.type === 'transfer' ? '#3B82F620' : `${tx.categoryId?.color || '#6B7280'}20` }}
                    >
                      {tx.type === 'income' ? (
                        <ArrowUpRight size={16} className="text-emerald-400" />
                      ) : tx.type === 'transfer' ? (
                        <ArrowLeftRight size={16} className="text-blue-400" />
                      ) : (
                        <ArrowDownRight size={16} className="text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">
                        {tx.type === 'transfer'
                          ? `${tx.accountId?.account_name || '?'} → ${tx.toAccountId?.account_name || '?'}`
                          : (tx.description || tx.categoryId?.name || 'Transaction')}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(tx.date)}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${
                    tx.type === 'income' ? 'text-emerald-400' : tx.type === 'transfer' ? 'text-blue-400' : 'text-red-400'
                  }`}>
                    {tx.type === 'income' ? '+' : tx.type === 'transfer' ? '↔' : '-'}{formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              No transactions yet
            </div>
          )}
        </div>

        {/* Budget Progress */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Budget Progress</h3>
          {budgets.length > 0 ? (
            <div className="space-y-4">
              {budgets.slice(0, 5).map((budget) => {
                const percent = budget.limitAmount > 0 ? (budget.spentAmount / budget.limitAmount) * 100 : 0;
                const isOver = percent > 100;
                return (
                  <div key={budget._id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-gray-300">{budget.categoryId?.name || 'Category'}</span>
                      <span className={`text-xs font-medium ${isOver ? 'text-red-400' : 'text-gray-400'}`}>
                        {formatCurrency(budget.spentAmount)} / {formatCurrency(budget.limitAmount)}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-navy-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOver ? 'bg-red-500' : percent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              No budgets set — create one to track spending
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
