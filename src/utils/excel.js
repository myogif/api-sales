const ExcelJS = require('exceljs');

const streamProductsXlsx = async (res, products, filename = 'products.xlsx') => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Products');

  // Define columns
  worksheet.columns = [
    { header: 'ID', key: 'id', width: 40 },
    { header: 'Name', key: 'name', width: 30 },
    { header: 'SKU', key: 'sku', width: 20 },
    { header: 'Notes', key: 'notes', width: 40 },
    { header: 'Purchased At', key: 'purchasedAt', width: 15 },
    { header: 'Store Name', key: 'storeName', width: 25 },
    { header: 'Store Phone', key: 'storePhone', width: 15 },
    { header: 'Creator Name', key: 'creatorName', width: 25 },
    { header: 'Creator Phone', key: 'creatorPhone', width: 15 },
    { header: 'Created At', key: 'createdAt', width: 20 },
    { header: 'Updated At', key: 'updatedAt', width: 20 },
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
      id: product.id,
      name: product.name,
      sku: product.sku,
      notes: product.notes || '',
      purchasedAt: product.purchasedAt,
      storeName: product.store?.name || '',
      storePhone: product.store?.phone || '',
      creatorName: product.creator?.name || '',
      creatorPhone: product.creator?.phone || '',
      createdAt: product.createdAt?.toISOString(),
      updatedAt: product.updatedAt?.toISOString(),
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

module.exports = {
  streamProductsXlsx,
};