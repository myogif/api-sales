const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { Product, Store } = require('../../../models');

const LIME_GREEN = rgb(0.788235294117647, 0.9529411764705882, 0.3568627450980392);

/**
 * Generate PDF Kartu Garansi
 * @param {Object} data - Data untuk kartu garansi
 * @returns {Promise<Uint8Array>} PDF buffer
 */
async function generateKartuGaransiPdf(data) {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  
  // Add a page (A4 size: 595 x 842 points)
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();
  
  // Embed fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Try to embed logo if exists
  let logoImage = null;
  try {
    const logoPath = path.join(__dirname, '..', '..', '..', '..', 'assets', 'pdf', 'logo-garansi.png');
    if (fs.existsSync(logoPath)) {
      const logoBytes = fs.readFileSync(logoPath);
      logoImage = await pdfDoc.embedPng(logoBytes);
    }
  } catch (error) {
    // If logo not found or error, we'll use text fallback
    console.log('Logo file not found, using text fallback');
  }
  
  // PDF coordinate system: (0,0) is bottom-left, so we work from top
  let y = height - 50; // Start from top with 50pt margin
  const leftMargin = 50;
  const rightMargin = width - 50;
  
  // --- HEADER ---
  // Draw logo on top-right corner
  if (logoImage) {
    // If logo image exists, draw it
    const logoWidth = 120;
    const logoHeight = 30;
    
    page.drawImage(logoImage, {
      x: rightMargin - logoWidth,
      y: y - 5,
      width: logoWidth,
      height: logoHeight,
    });
  } else {
    // Fallback: Draw text "GARANSI +" as placeholder
    const logoText = 'GARANSI';
    const logoWidth = fontBold.widthOfTextAtSize(logoText, 20);
    
    page.drawText(logoText, {
      x: rightMargin - logoWidth - 25,
      y: y + 5,
      size: 20,
      font: fontBold,
      color: rgb(0, 0, 0)
    });
    
    // Draw the "+" symbol in lime green
    page.drawText('+', {
      x: rightMargin - 20,
      y: y + 5,
      size: 20,
      font: fontBold,
      color: LIME_GREEN
    });
  }
  
  y -= 15;
  
  page.drawText(data.noKepesertaan, {
    x: leftMargin,
    y: y,
    size: 11,
    font: fontBold,
    color: rgb(0, 0, 0)
  });
  
  y -= 30;
  
  // Big title: KARTU GARANSI +
  page.drawText('KARTU GARANSI ', {
    x: leftMargin,
    y: y,
    size: 24,
    font: fontBold,
    color: rgb(0, 0, 0)
  });
  
  const titleWidth = fontBold.widthOfTextAtSize('KARTU GARANSI ', 24);
  page.drawText('+', {
    x: leftMargin + titleWidth,
    y: y,
    size: 24,
    font: fontBold,
    color: LIME_GREEN
  });
  
  y -= 35;
  
  // --- SECTION: Data Transaksi (no header, just fields) ---
  const labelWidth = 155; // Fixed width for consistent alignment
  
  // Helper function to draw label-value pairs with consistent spacing
  const drawField = (label, value, yPos) => {
    page.drawText(`${label}`, {
      x: leftMargin,
      y: yPos,
      size: 10,
      font: font,
      color: rgb(0, 0, 0)
    });
    
    page.drawText(':', {
      x: leftMargin + labelWidth,
      y: yPos,
      size: 10,
      font: font,
      color: rgb(0, 0, 0)
    });
    
    page.drawText(value, {
      x: leftMargin + labelWidth + 15,
      y: yPos,
      size: 10,
      font: font,
      color: rgb(0, 0, 0)
    });
  };
  
  drawField('NOMOR NOTA', data.nomorNota, y);
  y -= 18;
  drawField('NAMA TOKO', data.namaToko, y);
  y -= 18;
  drawField('TANGGAL PEMBELIAN', data.tanggalPembelian, y);
  
  y -= 30;
  
  // --- SECTION: DATA CUSTOMER ---
  page.drawText('DATA CUSTOMER', {
    x: leftMargin,
    y: y,
    size: 12,
    font: fontBold,
    color: rgb(0, 0, 0)
  });
  
  y -= 20;
  
  drawField('NAMA', data.customer.nama, y);
  y -= 18;
  drawField('EMAIL', data.customer.email, y);
  y -= 18;
  drawField('NOMOR TELEPON', data.customer.nomorTelepon, y);
  y -= 18;
  drawField('PERSENTASE', data.customer.persentase, y);
  y -= 18;
  drawField('BIAYA GARANSI +', data.customer.biayaGaransi, y);
  y -= 18;
  drawField('BIAYA TOTAL', data.customer.biayaTotal, y);
  y -= 18;
  drawField('PERIODE GARANSI +', data.customer.periodeGaransi, y);
  
  y -= 35;
  
  // --- TABLE: Produk ---
  const tableTop = y;
  const tableLeft = leftMargin;
  const tableWidth = rightMargin - leftMargin;
  const rowHeight = 30;
  const colWidths = [tableWidth * 0.25, tableWidth * 0.25, tableWidth * 0.25, tableWidth * 0.25];
  
  // Header row background (lime green)
  page.drawRectangle({
    x: tableLeft,
    y: tableTop - rowHeight,
    width: tableWidth,
    height: rowHeight,
    color: LIME_GREEN
  });
  
  // Header row border (no vertical lines)
  page.drawRectangle({
    x: tableLeft,
    y: tableTop - rowHeight,
    width: tableWidth,
    height: rowHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1
  });
  
  // Header text (centered)
  const headers = ['MEREK', 'TIPE', 'KODE', 'HARGA'];
  let currentX = tableLeft;
  
  headers.forEach((header, i) => {
    const headerWidth = fontBold.widthOfTextAtSize(header, 10);
    const centerX = currentX + (colWidths[i] - headerWidth) / 2;
    
    page.drawText(header, {
      x: centerX,
      y: tableTop - rowHeight + 10,
      size: 10,
      font: fontBold,
      color: rgb(0, 0, 0)
    });
    currentX += colWidths[i];
  });
  
  y = tableTop - rowHeight;
  
  // Data rows
  data.produk.forEach((produk) => {
    y -= rowHeight;
    
    // Row border
    page.drawRectangle({
      x: tableLeft,
      y: y,
      width: tableWidth,
      height: rowHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1
    });
    
    // Draw vertical lines for data row
    currentX = tableLeft;
    for (let i = 1; i < colWidths.length; i++) {
      currentX += colWidths[i - 1];
      page.drawLine({
        start: { x: currentX, y: y + rowHeight },
        end: { x: currentX, y: y },
        thickness: 1,
        color: rgb(0, 0, 0)
      });
    }
    
    // Row data (centered)
    const rowData = [produk.merek, produk.tipe, produk.kode, produk.harga];
    currentX = tableLeft;
    
    rowData.forEach((dataText, i) => {
      const dataWidth = font.widthOfTextAtSize(dataText, 10);
      const centerX = currentX + (colWidths[i] - dataWidth) / 2;
      
      page.drawText(dataText, {
        x: centerX,
        y: y + 10,
        size: 10,
        font: font,
        color: rgb(0, 0, 0)
      });
      currentX += colWidths[i];
    });
  });
  
  y -= 35;
  
  // --- TABLE: Manfaat ---
  const manfaatHeight = 30;
  const manfaatContentHeight = 50;
  
  // Header bar (black background, white text)
  page.drawRectangle({
    x: tableLeft,
    y: y - manfaatHeight,
    width: tableWidth,
    height: manfaatHeight,
    color: rgb(0, 0, 0)
  });
  
  const manfaatText = 'MANFAAT';
  const manfaatTextWidth = fontBold.widthOfTextAtSize(manfaatText, 11);
  
  page.drawText(manfaatText, {
    x: tableLeft + (tableWidth - manfaatTextWidth) / 2,
    y: y - manfaatHeight + 10,
    size: 11,
    font: fontBold,
    color: rgb(1, 1, 1)
  });
  
  y -= manfaatHeight;
  
  // Content row
  page.drawRectangle({
    x: tableLeft,
    y: y - manfaatContentHeight,
    width: tableWidth,
    height: manfaatContentHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1
  });
  
  // Left cell: GARANSI +
  page.drawText('GARANSI ', {
    x: tableLeft + 10,
    y: y - manfaatContentHeight + 20,
    size: 10,
    font: fontBold,
    color: rgb(0, 0, 0)
  });
  
  const garansiWidth = fontBold.widthOfTextAtSize('GARANSI ', 10);
  page.drawText('+', {
    x: tableLeft + 10 + garansiWidth,
    y: y - manfaatContentHeight + 20,
    size: 10,
    font: fontBold,
    color: LIME_GREEN
  });
  
  // Vertical divider
  page.drawLine({
    start: { x: tableLeft + tableWidth * 0.25, y: y },
    end: { x: tableLeft + tableWidth * 0.25, y: y - manfaatContentHeight },
    thickness: 1,
    color: rgb(0, 0, 0)
  });
  
  // Right cell: Description (centered vertically)
  const description = 'GARANSI KOMPENSASI BIAYA PERBAIKAN SELAMA DALAM MASA';
  const description2 = 'GARANSI.';
  
  page.drawText(description, {
    x: tableLeft + tableWidth * 0.25 + 10,
    y: y - manfaatContentHeight + 25,
    size: 9,
    font: font,
    color: rgb(0, 0, 0)
  });
  
  page.drawText(description2, {
    x: tableLeft + tableWidth * 0.25 + 10,
    y: y - manfaatContentHeight + 13,
    size: 9,
    font: font,
    color: rgb(0, 0, 0)
  });
  
  y -= manfaatContentHeight + 30;
  
  // --- FOOTER NOTE ---
  page.drawText('CATATAN', {
    x: leftMargin,
    y: y,
    size: 11,
    font: fontBold,
    color: rgb(0, 0, 0)
  });
  
  y -= 18;
  
  page.drawText('Untuk menggunakan klaim Garansi, wajib sertakan Nota Pembelian dan Box Asli.', {
    x: leftMargin,
    y: y,
    size: 9,
    font: font,
    color: rgb(0.3, 0.3, 0.3)
  });
  
  // Save the PDF to bytes
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

function formatRupiah(value) {
  const number = Number(value) || 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(number);
}

function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function buildPeriodeGaransi(startDate, months) {
  if (!startDate || !months) return '-';
  const start = new Date(startDate);
  const end = new Date(start);
  end.setMonth(end.getMonth() + Number(months));

  const fmt = (d) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  return `${fmt(start)} S/D ${fmt(end)} (${months} Bulan)`;
}

function buildWarrantyPdfDataFromProduct(product) {
  return {
    noKepesertaan: product.nomor_kepesertaan || product.nomorKepesertaan || '-',
    nomorNota: product.invoice_number || product.invoiceNumber || '-',
    namaToko: product.store ? product.store.name : '-',
    tanggalPembelian: formatDate(product.created_at || product.createdAt),
    customer: {
      nama: product.customer_name || product.customerName || '-',
      email: product.customer_email || product.customerEmail || '-',
      nomorTelepon: product.customer_phone || product.customerPhone || '-',
      persentase: product.persen != null ? `${product.persen}%` : '-',
      biayaGaransi: formatRupiah(product.price_warranty || product.priceWarranty || 0),
      biayaTotal: formatRupiah(product.price || 0),
      periodeGaransi: buildPeriodeGaransi(product.created_at || product.createdAt, product.warranty_months || product.warrantyMonths)
    },
    produk: [
      {
        merek: product.name || '-',
        tipe: product.tipe || '-',
        kode: product.code || '-',
        harga: formatRupiah(product.price || 0)
      }
    ]
  };
}

const createWarrantyFileName = (nomor) => {
  if (!nomor) {
    return 'kartu-garansi.pdf';
  }

  const sanitized = nomor
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `kartu-garansi-${sanitized || 'garansi'}.pdf`;
};

const prepareWarrantyCertificate = async (id) => {
  const product = await Product.findOne({
    where: { id },
    include: [{ model: Store, as: 'store' }],
  });

  if (!product) {
    return null;
  }

  const plainProduct = product.get({ plain: true });
  const displayData = buildWarrantyPdfDataFromProduct(plainProduct);

  return {
    displayData,
    fileName: createWarrantyFileName(displayData.noKepesertaan),
    render: async () => {
      const pdfBytes = await generateKartuGaransiPdf(displayData);
      return Buffer.from(pdfBytes);
    },
  };
};

module.exports = {
  prepareWarrantyCertificate,
};
