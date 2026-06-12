export const formatCurrency = (amount, currency = 'INR') => {
  const parsed = parseFloat(amount);
  if (isNaN(parsed)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
  }).format(parsed);
};

export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
};

export const calculateTotals = (items = [], gstRate = 0, discountRate = 0, gstType = 'intra') => {
  const subtotal = items.reduce((acc, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.price) || 0;
    return acc + (qty * price);
  }, 0);

  const parsedGstRate = parseFloat(gstRate) || 0;
  const parsedDiscountRate = parseFloat(discountRate) || 0;

  const discountAmount = subtotal * (parsedDiscountRate / 100);
  const taxableValue = subtotal - discountAmount;
  const gstAmount = taxableValue * (parsedGstRate / 100);
  const total = taxableValue + gstAmount;

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (gstType === 'intra') {
    cgstAmount = gstAmount / 2;
    sgstAmount = gstAmount / 2;
  } else {
    igstAmount = gstAmount;
  }

  return {
    subtotal,
    discountAmount,
    taxableValue,
    taxAmount: gstAmount, // Maintain property name for general compatibility
    gstAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    total
  };
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'paid':
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-950/30',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-800/50',
        dot: 'bg-emerald-500'
      };
    case 'sent':
      return {
        bg: 'bg-indigo-50 dark:bg-indigo-950/30',
        text: 'text-indigo-700 dark:text-indigo-400',
        border: 'border-indigo-200 dark:border-indigo-800/50',
        dot: 'bg-indigo-500'
      };
    case 'overdue':
      return {
        bg: 'bg-rose-50 dark:bg-rose-950/30',
        text: 'text-rose-700 dark:text-rose-400',
        border: 'border-rose-200 dark:border-rose-800/50',
        dot: 'bg-rose-500'
      };
    case 'draft':
    default:
      return {
        bg: 'bg-slate-50 dark:bg-slate-900/50',
        text: 'text-slate-600 dark:text-slate-400',
        border: 'border-slate-200 dark:border-slate-800',
        dot: 'bg-slate-400'
      };
  }
};
