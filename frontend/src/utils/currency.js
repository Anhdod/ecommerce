const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  currencyDisplay: 'code',
  maximumFractionDigits: 0,
});

const compactVndFormatter = new Intl.NumberFormat('vi-VN', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export const toVndAmount = (value) => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
};

export const formatVnd = (value) => vndFormatter.format(toVndAmount(value));

export const formatCompactVnd = (value) => `${compactVndFormatter.format(toVndAmount(value))} VND`;
