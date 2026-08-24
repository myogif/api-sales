const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface) => {
    const password = await bcrypt.hash('mngtest123', 12);

    await queryInterface.bulkInsert('users', [
      {
        id: 'acacacac-acac-acac-acac-acacacacacac',
        phone: '085745398241',
        password,
        name: 'Manager User',
        role: 'MANAGER',
        store_id: null,
        supervisor_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete(
      'users',
      { id: 'acacacac-acac-acac-acac-acacacacacac' },
    );
  },
};
