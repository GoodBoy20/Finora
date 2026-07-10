import { useState, useEffect, useRef } from 'react';
import {
  Sparkles, RefreshCw, Heart, Lightbulb, TrendingUp, TrendingDown,
  AlertTriangle, BarChart2, PiggyBank, Activity, CheckCircle,
  PlusCircle, Zap, ChevronDown, Loader2
} from 'lucide-react';
import api from '../utils/api';

// ─── Utilities ───────────────────────────────────────────────────────

const formatCurrency = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const formatTime = (d) => {
  const date = new Date(d);
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) +
    ', ' + date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

// ─── Skeleton loaders ────────────────────────────────────────────────

const SkeletonPulse = ({ className }) => (
  <div className={`animate-pulse bg-slate-700/50 rounded-lg ${className}`} />
);

const HealthScoreSkeleton = () => (
  <div className="flex flex-col items-center gap-6 py-4">
    <div className="animate-pulse rounded-full bg-slate-700/50 w-44 h-44" />
    <div className="w-full space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <SkeletonPulse className="w-28 h-4" />
          <SkeletonPulse className="flex-1 h-3" />
          <SkeletonPulse className="w-10 h-4" />
        </div>
      ))}
    </div>
    <SkeletonPulse className="w-full h-16" />
  </div>
);

const SuggestionsSkeleton = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[...Array(4)].map((_, i) => (
        <SkeletonPulse key={i} className="h-36" />
      ))}
    </div>
    <SkeletonPulse className="h-24" />
  </div>
);

const PredictionsSkeleton = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <SkeletonPulse key={i} className="h-24" />
      ))}
    </div>
    <SkeletonPulse className="h-48" />
  </div>
);

const AnomaliesSkeleton = () => (
  <div className="space-y-4">
    <SkeletonPulse className="h-16" />
    {[...Array(2)].map((_, i) => (
      <SkeletonPulse key={i} className="h-28" />
    ))}
  </div>
);

// ─── Shared sub-components ───────────────────────────────────────────

const ErrorCard = ({ message, onRetry }) => (
  <div className="flex flex-col items-center gap-3 py-8 text-center">
    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
      <AlertTriangle className="text-red-400" size={24} />
    </div>
    <p className="text-red-400 text-sm font-medium">{message}</p>
    <button onClick={onRetry}
      className="px-4 py-2 text-xs bg-navy-700 hover:bg-navy-600 text-gray-300 rounded-lg transition-colors flex items-center gap-2">
      <RefreshCw size={14} /> Try Again
    </button>
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center gap-3 py-10 text-center">
    <div className="w-14 h-14 rounded-2xl bg-slate-700/40 flex items-center justify-center">
      <Sparkles className="text-emerald-400/60" size={26} />
    </div>
    <p className="text-gray-400 text-sm">Click <span className="font-semibold text-emerald-400">Generate</span> to get AI-powered insights</p>
  </div>
);

const InsufficientData = () => (
  <div className="flex flex-col items-center gap-3 py-10 text-center">
    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
      <BarChart2 className="text-amber-400" size={26} />
    </div>
    <p className="text-white font-semibold text-sm">Not enough data yet</p>
    <p className="text-gray-400 text-xs max-w-xs">Add at least 5 transactions from the last 30 days to generate this insight.</p>
  </div>
);

const Spinner = () => <Loader2 size={16} className="animate-spin" />;

// ─── Section wrapper ─────────────────────────────────────────────────

const InsightSection = ({ id, title, icon, onGenerate, isLoading, data, error, children }) => (
  <div id={id} className="glass rounded-2xl overflow-hidden transition-all duration-300 hover:border-slate-600/50">
    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center text-emerald-400">
          {icon}
        </div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      <div className="flex items-center gap-3">
        {data?.generatedAt && (
          <span className="text-[11px] text-gray-500 hidden sm:inline">
            Updated {formatTime(data.generatedAt)}
          </span>
        )}
        <button onClick={onGenerate} disabled={isLoading}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-all duration-200
            ${isLoading
              ? 'bg-emerald-500/10 text-emerald-400 cursor-wait'
              : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40'
            }`}>
          {isLoading ? <Spinner /> : <RefreshCw size={13} />}
          {isLoading ? 'Analyzing...' : data ? 'Refresh' : 'Generate'}
        </button>
      </div>
    </div>
    <div className="px-5 py-4">
      {isLoading && !data && children === null && <EmptyState />}
      {isLoading && id === 'health-score' && <HealthScoreSkeleton />}
      {isLoading && id === 'suggestions' && <SuggestionsSkeleton />}
      {isLoading && id === 'predictions' && <PredictionsSkeleton />}
      {isLoading && id === 'anomalies' && <AnomaliesSkeleton />}
      {!isLoading && error && <ErrorCard message={error} onRetry={onGenerate} />}
      {!isLoading && !error && data?.insufficientData && <InsufficientData />}
      {!isLoading && !error && !data && <EmptyState />}
      {!isLoading && !error && data && !data.insufficientData && children}
    </div>
  </div>
);

// ─── Score Gauge (SVG arc) ───────────────────────────────────────────

const ScoreGauge = ({ score, grade, label }) => {
  const animatedScore = useAnimatedNumber(score);
  const radius = 78;
  const stroke = 10;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * circumference;

  const gradeColor = {
    A: '#10B981', B: '#3B82F6', C: '#F59E0B', D: '#F97316', F: '#EF4444',
  }[grade] || '#6B7280';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-44 h-44">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r={radius} fill="none"
            stroke="rgba(71,85,105,0.3)" strokeWidth={stroke} />
          <circle cx="90" cy="90" r={radius} fill="none"
            stroke={gradeColor} strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-white">{Math.round(animatedScore)}</span>
          <span className="text-sm font-semibold" style={{ color: gradeColor }}>{grade} — {label}</span>
        </div>
      </div>
    </div>
  );
};

function useAnimatedNumber(target) {
  const [value, setValue] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    let start = 0;
    const duration = 1200;
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(eased * target);
      if (t < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, [target]);
  return value;
}

// ─── Pillar bar ──────────────────────────────────────────────────────

const PillarBar = ({ pillar, score, maxScore, comment }) => {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const color = pct >= 75 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-300 font-medium">{pillar}</span>
        <span className="text-gray-400 text-xs">{score}/{maxScore}</span>
      </div>
      <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <p className="text-[11px] text-gray-500 leading-tight">{comment}</p>
    </div>
  );
};

// ─── Section 1: Health Score ─────────────────────────────────────────

const HealthScoreContent = ({ data }) => (
  <div className="space-y-6">
    <ScoreGauge score={data.score} grade={data.grade} label={data.label} />
    <div className="space-y-4">
      {data.breakdown?.map((p, i) => (
        <PillarBar key={i} {...p} />
      ))}
    </div>
    <div className="bg-slate-700/20 rounded-xl p-4 border border-slate-700/30">
      <p className="text-gray-300 text-sm leading-relaxed">{data.summary}</p>
    </div>
  </div>
);

// ─── Section 2: Budget Suggestions ───────────────────────────────────

const typeConfig = {
  warning: { color: 'border-l-red-500', icon: <AlertTriangle size={16} className="text-red-400" />, bg: 'bg-red-500/5' },
  suggestion: { color: 'border-l-blue-500', icon: <Lightbulb size={16} className="text-blue-400" />, bg: 'bg-blue-500/5' },
  positive: { color: 'border-l-emerald-500', icon: <TrendingUp size={16} className="text-emerald-400" />, bg: 'bg-emerald-500/5' },
};

const priorityBadge = {
  high: 'bg-red-500/10 text-red-400 border-red-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  low: 'bg-slate-500/10 text-gray-400 border-slate-500/20',
};

const SuggestionsContent = ({ data }) => {
  const sorted = [...(data.suggestions || [])].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
  });

  return (
    <div className="space-y-6">
      {/* Suggestions grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sorted.map((s, i) => {
          const tc = typeConfig[s.type] || typeConfig.suggestion;
          return (
            <div key={i}
              className={`border-l-4 ${tc.color} ${tc.bg} rounded-xl p-4 space-y-2 border border-slate-700/30 border-l-4`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {tc.icon}
                  <span className="text-gray-500 text-[10px] uppercase tracking-wide">{s.category}</span>
                </div>
                <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${priorityBadge[s.priority]}`}>
                  {s.priority}
                </span>
              </div>
              <h4 className="text-white font-semibold text-sm">{s.title}</h4>
              <p className="text-gray-400 text-xs leading-relaxed">{s.detail}</p>
              {s.potentialSaving != null && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                  <span className="text-xs">💰</span>
                  <span className="text-emerald-400 text-xs font-medium">Save up to {formatCurrency(s.potentialSaving)}/month</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Budget Recommendations */}
      {data.budgetRecommendations?.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <PiggyBank size={16} className="text-amber-400" /> Budget Adjustments
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-slate-700/50">
                  <th className="py-2 px-3 text-left">Category</th>
                  <th className="py-2 px-3 text-right">Current</th>
                  <th className="py-2 px-3 text-right">Recommended</th>
                  <th className="py-2 px-3 text-left">Reason</th>
                </tr>
              </thead>
              <tbody>
                {data.budgetRecommendations.map((r, i) => (
                  <tr key={i} className="border-b border-slate-700/30">
                    <td className="py-2.5 px-3 text-gray-300">{r.category}</td>
                    <td className="py-2.5 px-3 text-right text-gray-400">
                      {r.currentLimit != null ? formatCurrency(r.currentLimit) : (
                        <span className="text-amber-400 text-[10px] bg-amber-500/10 px-2 py-0.5 rounded-full">No Budget</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-emerald-400">
                      {formatCurrency(r.recommendedLimit)}
                    </td>
                    <td className="py-2.5 px-3 text-gray-500 text-xs max-w-[200px]">{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Wins */}
      {data.quickWins?.length > 0 && (
        <div className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/10 space-y-2">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <Zap size={16} className="text-emerald-400" /> Quick Wins
          </h3>
          <ul className="space-y-1.5">
            {data.quickWins.map((q, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-300 text-xs">
                <CheckCircle size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Savings Tip */}
      {data.savingsTip && (
        <div className="bg-gradient-to-r from-emerald-500/5 to-teal-500/5 rounded-xl p-4 border border-emerald-500/15 flex items-start gap-3">
          <PiggyBank size={20} className="text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-gray-300 text-sm leading-relaxed">{data.savingsTip}</p>
        </div>
      )}
    </div>
  );
};

// ─── Section 3: Predictions ──────────────────────────────────────────

const confidenceBadge = {
  high: { bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'High Confidence' },
  medium: { bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20', label: 'Medium Confidence' },
  low: { bg: 'bg-slate-500/10 text-gray-400 border-slate-500/20', label: 'Low Confidence — need more data' },
};

const outlookStyle = {
  positive: { bg: 'bg-emerald-500/5 border-emerald-500/15', text: 'text-emerald-400', label: '🟢 Looking good next month' },
  neutral: { bg: 'bg-blue-500/5 border-blue-500/15', text: 'text-blue-400', label: '🔵 Steady as she goes' },
  concerning: { bg: 'bg-red-500/5 border-red-500/15', text: 'text-red-400', label: '🔴 Action recommended' },
};

const PredictionsContent = ({ data }) => {
  const cb = confidenceBadge[data.confidence] || confidenceBadge.low;
  const ol = outlookStyle[data.outlook] || outlookStyle.neutral;
  const savingsPositive = data.predictedSavings >= 0;

  return (
    <div className="space-y-5">
      {/* Confidence badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${cb.bg}`}>{cb.label}</span>
        {data.confidenceReason && (
          <span className="text-[11px] text-gray-500">{data.confidenceReason}</span>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Predicted Income" value={formatCurrency(data.predictedIncome)}
          color="text-blue-400" bgColor="bg-blue-500/5 border-blue-500/15"
          icon={<TrendingUp size={18} />} />
        <StatCard label="Predicted Expenses" value={formatCurrency(data.predictedExpenses)}
          color={data.predictedExpenses > data.predictedIncome ? 'text-red-400' : 'text-amber-400'}
          bgColor={data.predictedExpenses > data.predictedIncome ? 'bg-red-500/5 border-red-500/15' : 'bg-amber-500/5 border-amber-500/15'}
          icon={data.predictedExpenses > data.predictedIncome ? <TrendingUp size={18} /> : <TrendingDown size={18} />} />
        <StatCard label="Predicted Savings" value={formatCurrency(data.predictedSavings)}
          color={savingsPositive ? 'text-emerald-400' : 'text-red-400'}
          bgColor={savingsPositive ? 'bg-emerald-500/5 border-emerald-500/15' : 'bg-red-500/5 border-red-500/15'}
          icon={savingsPositive ? <TrendingUp size={18} /> : <TrendingDown size={18} />} />
      </div>

      {/* Category predictions table */}
      {data.categoryPredictions?.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-slate-700/50">
                <th className="py-2 px-3 text-left">Category</th>
                <th className="py-2 px-3 text-right">Predicted</th>
                <th className="py-2 px-3 text-center">Trend</th>
                <th className="py-2 px-3 text-left">Note</th>
              </tr>
            </thead>
            <tbody>
              {data.categoryPredictions.map((c, i) => (
                <tr key={i} className="border-b border-slate-700/30">
                  <td className="py-2.5 px-3 text-gray-300">{c.category}</td>
                  <td className="py-2.5 px-3 text-right text-gray-300">{formatCurrency(c.predictedAmount)}</td>
                  <td className="py-2.5 px-3 text-center">
                    {c.trend === 'increasing' && (
                      <span className="text-red-400 text-xs flex items-center justify-center gap-1">
                        <TrendingUp size={13} /> +{Math.abs(c.trendPercent)}%
                      </span>
                    )}
                    {c.trend === 'stable' && (
                      <span className="text-gray-500 text-xs">—</span>
                    )}
                    {c.trend === 'decreasing' && (
                      <span className="text-emerald-400 text-xs flex items-center justify-center gap-1">
                        <TrendingDown size={13} /> -{Math.abs(c.trendPercent)}%
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-gray-500 text-xs max-w-[200px]">{c.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Budget risks */}
      {data.budgetRisks?.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400" /> Budget Risks Next Month
          </h3>
          <div className="space-y-2">
            {data.budgetRisks.map((r, i) => {
              const riskBg = { high: 'bg-red-500/5 border-red-500/15', medium: 'bg-amber-500/5 border-amber-500/15', low: 'bg-slate-500/5 border-slate-500/15' };
              const riskText = { high: 'text-red-400', medium: 'text-amber-400', low: 'text-gray-400' };
              return (
                <div key={i} className={`rounded-xl p-3 border ${riskBg[r.riskLevel] || riskBg.low}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm font-medium">{r.category}</span>
                    <span className={`text-[10px] font-semibold uppercase ${riskText[r.riskLevel]}`}>{r.riskLevel} risk</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400 mb-1">
                    <span>Budget: {formatCurrency(r.budgetLimit)}</span>
                    <span>Predicted: <span className={riskText[r.riskLevel]}>{formatCurrency(r.predictedSpend)}</span></span>
                  </div>
                  <p className="text-gray-500 text-xs">{r.message}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Outlook */}
      <div className={`rounded-xl p-4 border ${ol.bg}`}>
        <p className={`font-semibold text-sm ${ol.text} mb-1`}>{ol.label}</p>
        <p className="text-gray-400 text-xs leading-relaxed">{data.outlookMessage}</p>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, color, bgColor, icon }) => (
  <div className={`rounded-xl p-4 border ${bgColor} text-center`}>
    <div className={`flex items-center justify-center mb-2 ${color}`}>{icon}</div>
    <p className="text-gray-400 text-[11px] uppercase tracking-wide mb-1">{label}</p>
    <p className={`text-xl font-bold ${color}`}>{value}</p>
  </div>
);

// ─── Section 4: Anomalies ────────────────────────────────────────────

const assessmentStyle = {
  normal: { bg: 'bg-emerald-500/5 border-emerald-500/15', text: 'text-emerald-400', label: '✅ No anomalies detected' },
  some_anomalies: { bg: 'bg-amber-500/5 border-amber-500/15', text: 'text-amber-400', label: '⚠️ Some unusual patterns found' },
  concerning: { bg: 'bg-red-500/5 border-red-500/15', text: 'text-red-400', label: '🚨 Significant anomalies detected' },
};

const anomalyTypeIcon = {
  spike: <TrendingUp size={16} className="text-red-400" />,
  new_category: <PlusCircle size={16} className="text-blue-400" />,
  budget_breach: <AlertTriangle size={16} className="text-amber-400" />,
  income_drop: <TrendingDown size={16} className="text-red-400" />,
  unusual_pattern: <Activity size={16} className="text-purple-400" />,
};

const severityStyle = {
  high: 'bg-red-500/10 text-red-400 border-red-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  low: 'bg-slate-500/10 text-gray-400 border-slate-500/20',
};

const AnomaliesContent = ({ data }) => {
  const as = assessmentStyle[data.overallAssessment] || assessmentStyle.normal;

  return (
    <div className="space-y-5">
      {/* Assessment banner */}
      <div className={`rounded-xl p-4 border ${as.bg}`}>
        <p className={`font-semibold text-sm ${as.text} mb-1`}>{as.label}</p>
        <p className="text-gray-400 text-xs leading-relaxed">{data.assessmentMessage}</p>
      </div>

      {/* Anomalies list */}
      {(!data.anomalies || data.anomalies.length === 0) ? (
        <div className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/10 text-center">
          <CheckCircle size={20} className="text-emerald-400 mx-auto mb-2" />
          <p className="text-emerald-400 text-sm font-medium">Everything looks normal this month</p>
          <p className="text-gray-500 text-xs mt-1">No unusual spending detected.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.anomalies.map((a, i) => (
            <div key={i} className="bg-slate-700/15 rounded-xl p-4 border border-slate-700/30 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {anomalyTypeIcon[a.type] || anomalyTypeIcon.unusual_pattern}
                  <span className="text-gray-500 text-[10px] uppercase tracking-wide">{a.category}</span>
                </div>
                <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${severityStyle[a.severity]}`}>
                  {a.severity}
                </span>
              </div>
              <h4 className="text-white font-semibold text-sm">{a.title}</h4>
              <p className="text-gray-400 text-xs leading-relaxed">{a.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Normal patterns */}
      {data.normalPatterns?.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-400" /> What You're Doing Well
          </h3>
          <ul className="space-y-1.5">
            {data.normalPatterns.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-300 text-xs">
                <CheckCircle size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════

const AIInsights = () => {
  // Independent state for each section
  const [healthScore, setHealthScore] = useState({ data: null, loading: false, error: null });
  const [suggestions, setSuggestions] = useState({ data: null, loading: false, error: null });
  const [predictions, setPredictions] = useState({ data: null, loading: false, error: null });
  const [anomalies, setAnomalies] = useState({ data: null, loading: false, error: null });
  const [generatingAll, setGeneratingAll] = useState(false);

  // Generic fetcher
  const fetchSection = async (endpoint, setter) => {
    setter((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await api.get(endpoint);
      setter({ data: res.data, loading: false, error: null });
    } catch (err) {
      const msg = err.response?.data?.message || 'Something went wrong. Please try again.';
      setter((prev) => ({ ...prev, loading: false, error: msg }));
    }
  };

  const generateHealthScore = () => fetchSection('/ai/health-score', setHealthScore);
  const generateSuggestions = () => fetchSection('/ai/budget-suggestions', setSuggestions);
  const generatePredictions = () => fetchSection('/ai/predictions', setPredictions);
  const generateAnomalies = () => fetchSection('/ai/anomalies', setAnomalies);

  const generateAll = async () => {
    setGeneratingAll(true);
    setHealthScore((p) => ({ ...p, loading: true, error: null }));
    setSuggestions((p) => ({ ...p, loading: true, error: null }));
    setPredictions((p) => ({ ...p, loading: true, error: null }));
    setAnomalies((p) => ({ ...p, loading: true, error: null }));

    const [h, b, p, a] = await Promise.allSettled([
      api.get('/ai/health-score'),
      api.get('/ai/budget-suggestions'),
      api.get('/ai/predictions'),
      api.get('/ai/anomalies'),
    ]);

    setHealthScore({
      data: h.status === 'fulfilled' ? h.value.data : null,
      loading: false,
      error: h.status === 'rejected' ? (h.reason?.response?.data?.message || 'Failed to generate') : null,
    });
    setSuggestions({
      data: b.status === 'fulfilled' ? b.value.data : null,
      loading: false,
      error: b.status === 'rejected' ? (b.reason?.response?.data?.message || 'Failed to generate') : null,
    });
    setPredictions({
      data: p.status === 'fulfilled' ? p.value.data : null,
      loading: false,
      error: p.status === 'rejected' ? (p.reason?.response?.data?.message || 'Failed to generate') : null,
    });
    setAnomalies({
      data: a.status === 'fulfilled' ? a.value.data : null,
      loading: false,
      error: a.status === 'rejected' ? (a.reason?.response?.data?.message || 'Failed to generate') : null,
    });

    setGeneratingAll(false);
  };

  const anyLoading = healthScore.loading || suggestions.loading || predictions.loading || anomalies.loading;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Sparkles size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">AI Financial Insights</h1>
            <p className="text-gray-400 text-sm">Powered by Google Gemini — click any section to generate insights</p>
          </div>
        </div>
        <button onClick={generateAll} disabled={anyLoading}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all duration-200 shadow-lg
            ${anyLoading
              ? 'bg-emerald-500/20 text-emerald-400 cursor-wait shadow-emerald-500/10'
              : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-emerald-500/25 hover:shadow-emerald-500/40'
            }`}>
          {generatingAll ? <Spinner /> : <Sparkles size={16} />}
          {generatingAll ? 'Generating All...' : 'Generate All'}
        </button>
      </div>

      {/* ── Section 1: Health Score ───────────────────────── */}
      <InsightSection
        id="health-score"
        title="Financial Health Score"
        icon={<Heart size={18} />}
        onGenerate={generateHealthScore}
        isLoading={healthScore.loading}
        data={healthScore.data}
        error={healthScore.error}
      >
        {healthScore.data?.data && <HealthScoreContent data={healthScore.data.data} />}
      </InsightSection>

      {/* ── Section 2: Budget Suggestions ─────────────────── */}
      <InsightSection
        id="suggestions"
        title="Smart Budget & Expense Suggestions"
        icon={<Lightbulb size={18} />}
        onGenerate={generateSuggestions}
        isLoading={suggestions.loading}
        data={suggestions.data}
        error={suggestions.error}
      >
        {suggestions.data?.data && <SuggestionsContent data={suggestions.data.data} />}
      </InsightSection>

      {/* ── Section 3: Predictions ────────────────────────── */}
      <InsightSection
        id="predictions"
        title="Spending Predictions for Next Month"
        icon={<TrendingUp size={18} />}
        onGenerate={generatePredictions}
        isLoading={predictions.loading}
        data={predictions.data}
        error={predictions.error}
      >
        {predictions.data?.data && <PredictionsContent data={predictions.data.data} />}
      </InsightSection>

      {/* ── Section 4: Anomalies ──────────────────────────── */}
      <InsightSection
        id="anomalies"
        title="Anomaly & Unusual Spending Alerts"
        icon={<AlertTriangle size={18} />}
        onGenerate={generateAnomalies}
        isLoading={anomalies.loading}
        data={anomalies.data}
        error={anomalies.error}
      >
        {anomalies.data?.data && <AnomaliesContent data={anomalies.data.data} />}
      </InsightSection>
    </div>
  );
};

export default AIInsights;
