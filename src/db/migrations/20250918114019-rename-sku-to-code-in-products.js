'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Rename kolom sku → code
    await queryInterface.renameColumn('products', 'sku', 'code');

    // Hapus index lama di sku (kalau ada)
    await queryInterface.removeIndex('products', ['sku']);

    // Tambahkan index unik di code
    await queryInterface.addIndex('products', ['code'], { unique: true });
  },

  async down(queryInterface, Sequelize) {
    // Balikin code → sku
    await queryInterface.renameColumn('products', 'code', 'sku');

    // Hapus index unik di code
    await queryInterface.removeIndex('products', ['code']);

    // Tambahkan index unik di sku
    await queryInterface.addIndex('products', ['sku'], { unique: true });
  }
};
