export const formatCurrency = (amount, currency = '₹') => {
  const num = parseFloat(amount) || 0;
  return `${currency}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateInput = (date) => {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

export const getMonthName = (monthStr) => {
  const [year, month] = monthStr.split('-');
  const date = new Date(year, parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};
