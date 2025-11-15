const padNumber = (value) => String(value).padStart(2, '0');

const formatCurrencyDisplay = (amount) => {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return '';
  }

  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  return formatted.replace('Rp', 'RP ').trim();
};

const formatFullDateDisplay = (dateInput) => {
  if (!dateInput) {
    return '';
  }

  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const formatted = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);

  return formatted.toUpperCase();
};

const formatShortDateDisplay = (dateInput) => {
  if (!dateInput) {
    return '';
  }

  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const day = padNumber(date.getDate());
  const month = padNumber(date.getMonth() + 1);
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
};

const formatWarrantyPeriod = (startDate, endDate, months) => {
  const startDisplay = formatShortDateDisplay(startDate);
  const endDisplay = formatShortDateDisplay(endDate);
  const duration = typeof months === 'number' ? months : '';

  if (!startDisplay || !endDisplay || duration === '') {
    return '';
  }

  return `${startDisplay} S/D ${endDisplay} ( ${duration} BULAN )`;
};

module.exports = {
  formatCurrencyDisplay,
  formatFullDateDisplay,
  formatWarrantyPeriod,
};
