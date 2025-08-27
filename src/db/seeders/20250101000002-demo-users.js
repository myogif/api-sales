const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface) => {
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const salesPassword = await bcrypt.hash('sales123', 12);

    const users = [
      // Manager
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        phone: '080000000001',
        password: hashedPassword,
        name: 'System Manager',
        role: 'MANAGER',
        store_id: null,
        supervisor_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      // Supervisors
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        phone: '080000000002',
        password: hashedPassword,
        name: 'Main Store Supervisor',
        role: 'SUPERVISOR',
        store_id: '11111111-1111-1111-1111-111111111111',
        supervisor_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        phone: '080000000003',
        password: hashedPassword,
        name: 'Branch Store Supervisor',
        role: 'SUPERVISOR',
        store_id: '22222222-2222-2222-2222-222222222222',
        supervisor_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      // Sales users
      {
        id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        phone: '080000000004',
        password: salesPassword,
        name: 'Sales User 1',
        role: 'SALES',
        store_id: '11111111-1111-1111-1111-111111111111',
        supervisor_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        phone: '080000000005',
        password: salesPassword,
        name: 'Sales User 2',
        role: 'SALES',
        store_id: '11111111-1111-1111-1111-111111111111',
        supervisor_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        phone: '080000000006',
        password: salesPassword,
        name: 'Sales User 3',
        role: 'SALES',
        store_id: '22222222-2222-2222-2222-222222222222',
        supervisor_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    await queryInterface.bulkInsert('users', users);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('users', null, {});
  },
};