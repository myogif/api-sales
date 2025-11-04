module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('stores', 'kode_toko', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });

    const [stores] = await queryInterface.sequelize.query('SELECT id FROM stores ORDER BY created_at ASC');

    let counter = 1;
    for (const store of stores) {
      const kodeToko = `TOKO${String(counter).padStart(3, '0')}`;
      await queryInterface.sequelize.query(
        'UPDATE stores SET kode_toko = :kode WHERE id = :id',
        {
          replacements: { kode: kodeToko, id: store.id },
        },
      );
      counter += 1;
    }

    await queryInterface.changeColumn('stores', 'kode_toko', {
      type: Sequelize.STRING(50),
      allowNull: false,
    });

    await queryInterface.addConstraint('stores', {
      fields: ['kode_toko'],
      type: 'unique',
      name: 'stores_kode_toko_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('stores', 'stores_kode_toko_unique');
    await queryInterface.removeColumn('stores', 'kode_toko');
  },
};
