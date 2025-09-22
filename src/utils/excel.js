const ExcelJS = require('exceljs');

const streamProductsXlsx = async (res, products, filename = 'products.xlsx') => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Products');

  // Define columns
  worksheet.columns = [
    { header: 'Nama', key: 'name', width: 30 },
    { header: 'Kode', key: 'code', width: 20 },
    { header: 'Harga', key: 'price', width: 18 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Toko', key: 'storeName', width: 25 },
    { header: 'No. HP Toko', key: 'storePhone', width: 15 },
    { header: 'Sales', key: 'creatorName', width: 25 },
    { header: 'No. HP Sales', key: 'creatorPhone', width: 15 },
    { header: 'Tanggal Mulai Garansi', key: 'createdAt', width: 20 },
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE6F3FF' },
  };

  // Add data rows
  products.forEach((product) => {
    worksheet.addRow({
      name: product.name,
      code: product.code,
      price: product.price !== undefined && product.price !== null ? Number(product.price) : '',
      status: deriveStatus(product.status, product.createdAt), // <-- status terhitung
      storeName: product.store?.name || '',
      storePhone: product.store?.phone || '',
      creatorName: product.creator?.name || '',
      creatorPhone: product.creator?.phone || '',
      createdAt: formatDateToDDMMYYYY(product.createdAt),
    });
  });

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    if (column.key !== 'notes') {
      column.width = Math.max(column.width, 10);
    }
  });

  // Set response headers
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  // Write to response
  await workbook.xlsx.write(res);
  res.end();
};


function deriveStatus(currentStatus, createdAt) {
  if (!createdAt) return currentStatus ?? '';

  const created = new Date(createdAt);
  if (isNaN(created)) return currentStatus ?? '';

  // Tambah 6 bulan dari tanggal dibuat
  const sixMonthsAfter = new Date(created);
  sixMonthsAfter.setMonth(sixMonthsAfter.getMonth() + 6);

  const now = new Date();
  const isYoungerThanSixMonths = now < sixMonthsAfter;

  const isActiveLike  = /^(aktif|active)$/i.test((currentStatus || '').trim());
  const isExpiredLike = /^expired$/i.test((currentStatus || '').trim());

  // Aturan:
  // 1) Jika status masih aktif tapi umur > 6 bulan -> "Expired"
  if (isActiveLike && !isYoungerThanSixMonths) return 'Expired';

  // 2) Jika status masih expired tapi umur < 6 bulan -> "Used"
  if (isExpiredLike && isYoungerThanSixMonths) return 'Used';

  // 3) Jika status masih aktif dan umur < 6 bulan -> "Aktif"
  if (isActiveLike && isYoungerThanSixMonths) return 'Aktif';

  // Fallback: kembalikan status asli bila tidak match aturan di atas
  return currentStatus ?? '';
}

function formatDateToDDMMYYYY(date) { 
  if (!date) return '';
  const d = new Date(date);

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0'); // bulan 0-index
  const year = d.getFullYear();

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${day}-${month}-${year}, ${hours}:${minutes}`;
}


module.exports = {
  streamProductsXlsx,
};