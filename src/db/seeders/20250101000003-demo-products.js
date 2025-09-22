module.exports = {
  up: async (queryInterface) => {
    const products = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'iPhone 15 Pro',
        code: 'APPLE-IP15P-001',
        price: 19990000,
        persen: 60,
        notes: 'Latest iPhone model with titanium design',
        store_id: '11111111-1111-1111-1111-111111111111',
        creator_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Samsung Galaxy S24',
        code: 'SAMSUNG-GS24-001',
        price: 15999000,
        persen: 60,
        store_id: '11111111-1111-1111-1111-111111111111',
        creator_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'MacBook Air M3',
        code: 'APPLE-MBA-M3-001',
        price: 24999000,
        persen: 60,
        notes: '13-inch laptop with M3 chip',
        store_id: '22222222-2222-2222-2222-222222222222',
        creator_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '44444444-4444-4444-4444-444444444444',
        name: 'Sony WH-1000XM5',
        code: 'SONY-WH1000-001',
        price: 5499000,
        persen: 60,
        notes: 'Noise canceling headphones',
        store_id: '11111111-1111-1111-1111-111111111111',
        creator_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '55555555-5555-5555-5555-555555555555',
        name: 'iPad Pro 12.9',
        code: 'APPLE-IPP-129-001',
        price: 18999000,
        persen: 60,
        notes: 'Professional tablet with M2 chip',
        store_id: '22222222-2222-2222-2222-222222222222',
        creator_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    await queryInterface.bulkInsert('products', products);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('products', null, {});
  },
};