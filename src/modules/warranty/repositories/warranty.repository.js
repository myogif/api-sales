const warranties = [
  {
    id: '123',
    nomor: 'GAR-123-2025',
    nama: 'Adi Nugroho',
    email: 'adi.nugroho@example.com',
    nomorTelepon: '+62 812-3456-7890',
    tanggalPembelian: '2025-10-08T00:00:00.000Z',
    biayaGaransi: 100000,
    periodeMulai: '2025-10-08T00:00:00.000Z',
    periodeSelesai: '2026-04-08T00:00:00.000Z',
    periodeDurasiBulan: 6,
    merek: 'Samsung',
    tipe: 'Smart TV Neo QLED 55"',
    kodeProduk: 'SMTV-NEO55',
    harga: 7100000,
  },
  {
    id: '456',
    nomor: 'GAR-456-2025',
    nama: 'Sinta Dewi',
    email: 'sinta.dewi@example.com',
    nomorTelepon: '+62 813-2222-1111',
    tanggalPembelian: '2025-09-12T00:00:00.000Z',
    biayaGaransi: 150000,
    periodeMulai: '2025-09-12T00:00:00.000Z',
    periodeSelesai: '2026-03-12T00:00:00.000Z',
    periodeDurasiBulan: 6,
    merek: 'LG',
    tipe: 'Washer TurboWash 10.5Kg',
    kodeProduk: 'LGW-105TW',
    harga: 9200000,
  },
];

const findById = (id) => warranties.find((warranty) => String(warranty.id) === String(id)) || null;

module.exports = {
  findById,
};
