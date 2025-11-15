const drawHeader = (doc, data, margin) => {
  const top = margin;
  const rightMargin = doc.page.width - margin;

  doc
    .font('Helvetica-Bold')
    .fontSize(26)
    .fillColor('#000000')
    .text('KARTU GARANSI +', margin, top, { align: 'left' });

  doc
    .font('Helvetica-Bold')
    .fontSize(22)
    .fillColor('#2E7D32')
    .text('GARANSI+', margin, top, { align: 'right', width: rightMargin - margin });

  const detailsTop = top + 50;
  const labelWidth = 170;
  const colonX = margin + labelWidth;
  const valueX = colonX + 10;
  const lineHeight = 20;

  const details = [
    { label: 'NOMOR', value: data.nomor },
    { label: 'NAMA', value: data.nama },
    { label: 'EMAIL', value: data.email },
    { label: 'NOMOR TELEPON', value: data.nomorTelepon },
    { label: 'TANGGAL PEMBELIAN', value: data.tanggalPembelianDisplay },
    { label: 'BIAYA GARANSI +', value: data.biayaGaransiDisplay },
    { label: 'PERIODE GARANSI +', value: data.periodeGaransiDisplay },
  ];

  let currentY = detailsTop;
  details.forEach((detail) => {
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor('#000000')
      .text(detail.label, margin, currentY, { width: labelWidth, lineBreak: false });

    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .text(':', colonX, currentY, { width: 10, align: 'center', lineBreak: false });

    doc
      .font('Helvetica')
      .fontSize(12)
      .text(detail.value, valueX, currentY, {
        width: rightMargin - valueX,
        align: 'left',
      });

    currentY += lineHeight;
  });

  return currentY + 10;
};

const drawProductTable = (doc, data, margin, startY) => {
  const tableTop = startY + 20;
  const tableWidth = doc.page.width - margin * 2;
  const headerHeight = 32;
  const rowHeight = 32;
  const columns = [
    { key: 'merek', label: 'MEREK', width: tableWidth * 0.25 },
    { key: 'tipe', label: 'TIPE', width: tableWidth * 0.25 },
    { key: 'kodeProduk', label: 'KODE', width: tableWidth * 0.25 },
    { key: 'hargaDisplay', label: 'HARGA', width: tableWidth * 0.25 },
  ];

  doc
    .save()
    .rect(margin, tableTop, tableWidth, headerHeight)
    .fill('#D5F5E3');

  doc
    .strokeColor('#2E7D32')
    .lineWidth(1)
    .rect(margin, tableTop, tableWidth, headerHeight)
    .stroke();

  let currentX = margin;
  columns.forEach((column) => {
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor('#1B5E20')
      .text(column.label, currentX + 8, tableTop + 9, {
        width: column.width - 16,
        align: 'center',
      });

    doc
      .moveTo(currentX + column.width, tableTop)
      .lineTo(currentX + column.width, tableTop + headerHeight)
      .strokeColor('#2E7D32')
      .stroke();

    currentX += column.width;
  });

  doc.restore();

  const rowTop = tableTop + headerHeight;
  doc
    .strokeColor('#BDBDBD')
    .lineWidth(1)
    .rect(margin, rowTop, tableWidth, rowHeight)
    .stroke();

  currentX = margin;
  columns.forEach((column) => {
    doc
      .font('Helvetica')
      .fontSize(12)
      .fillColor('#000000')
      .text(data[column.key], currentX + 8, rowTop + 9, {
        width: column.width - 16,
        align: 'center',
      });

    doc
      .moveTo(currentX + column.width, rowTop)
      .lineTo(currentX + column.width, rowTop + rowHeight)
      .strokeColor('#BDBDBD')
      .stroke();

    currentX += column.width;
  });

  return rowTop + rowHeight + 20;
};

const drawBenefitsSection = (doc, margin, startY) => {
  const sectionTop = startY;
  const sectionWidth = doc.page.width - margin * 2;
  const headerHeight = 30;
  const contentHeight = 50;

  doc
    .save()
    .rect(margin, sectionTop, sectionWidth, headerHeight)
    .fill('#000000');

  doc
    .font('Helvetica-Bold')
    .fontSize(14)
    .fillColor('#FFFFFF')
    .text('MANFAAT', margin, sectionTop + 8, {
      width: sectionWidth,
      align: 'center',
    });

  doc.restore();

  const contentTop = sectionTop + headerHeight;
  const leftWidth = sectionWidth * 0.3;
  const rightWidth = sectionWidth - leftWidth;

  doc
    .strokeColor('#000000')
    .lineWidth(1)
    .rect(margin, contentTop, sectionWidth, contentHeight)
    .stroke();

  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor('#000000')
    .text('GARANSI +', margin + 12, contentTop + 15, {
      width: leftWidth - 24,
      align: 'left',
    });

  doc
    .font('Helvetica')
    .fontSize(12)
    .text('GARANSI KOMPENSASI BIAYA PERBAIKAN SELAMA DALAM MASA GARANSI.', margin + leftWidth + 12, contentTop + 15, {
      width: rightWidth - 24,
      align: 'left',
    });

  return contentTop + contentHeight + 20;
};

const drawNotesSection = (doc, margin, startY) => {
  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor('#000000')
    .text('CATATAN', margin, startY);

  doc
    .font('Helvetica')
    .fontSize(11)
    .text('Untuk menggunakan klaim Garansi, wajib sertakan Nota Pembelian dan Box Asli.', margin, startY + 18, {
      width: doc.page.width - margin * 2,
      align: 'left',
    });
};

const generateWarrantyPdf = (doc, data) => {
  const margin = doc.page.margins.left || 50;

  const detailsEndY = drawHeader(doc, data, margin);
  const tableEndY = drawProductTable(doc, data, margin, detailsEndY);
  const benefitsEndY = drawBenefitsSection(doc, margin, tableEndY);
  drawNotesSection(doc, margin, benefitsEndY);
};

module.exports = generateWarrantyPdf;
