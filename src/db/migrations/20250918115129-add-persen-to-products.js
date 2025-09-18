'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Tambah kolom `persen`
    await queryInterface.addColumn('products', 'persen', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
  },

  async down (queryInterface, Sequelize) {
    // Rollback: hapus kolom `persen`
    await queryInterface.removeColumn('products', 'persen');
  }
};
