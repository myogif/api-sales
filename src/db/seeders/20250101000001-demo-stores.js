const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface) => {
    const stores = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        kode_toko: 'TOKO001',
        name: 'Main Store',
        address: '123 Main Street, City Center',
        phone: '080111111111',
        email: 'main@store.com',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        kode_toko: 'TOKO002',
        name: 'Branch Store',
        address: '456 Branch Avenue, Downtown',
        phone: '080222222222',
        email: 'branch@store.com',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        kode_toko: 'TOKO003',
        name: 'West Store',
        address: '789 West Road, West District',
        phone: '080333333333',
        email: 'west@store.com',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    await queryInterface.bulkInsert('stores', stores);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('stores', null, {});
  },
};