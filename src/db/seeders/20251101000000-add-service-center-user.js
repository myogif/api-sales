const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface) => {
    const password = await bcrypt.hash('admin123', 12);

    await queryInterface.bulkInsert('users', [
      {
        id: 'abababab-abab-abab-abab-abababababab',
        phone: '08214189423',
        password,
        name: 'Service Center User',
        role: 'SERVICE_CENTER',
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
      { id: 'abababab-abab-abab-abab-abababababab' },
    );
  },
};
