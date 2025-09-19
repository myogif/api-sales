'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Hapus index dulu kalau ada yang terkait purchased_at
    await queryInterface.removeIndex('products', ['purchased_at']).catch(() => {});

    // Hapus kolom purchased_at
    await queryInterface.removeColumn('products', 'purchased_at');
  },

  down: async (queryInterface, Sequelize) => {
    // Tambahkan kembali kolom purchased_at
    await queryInterface.addColumn('products', 'purchased_at', {
      type: Sequelize.DATEONLY,
      allowNull: false,
    });

    // Tambahkan kembali index
    await queryInterface.addIndex('products', ['purchased_at']);
  }
};
