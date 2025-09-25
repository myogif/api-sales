module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('products', 'price_warranty', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.sequelize.query(
      'UPDATE products SET price_warranty = COALESCE(price, 0) * COALESCE(persen, 0) / 100.0;'
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('products', 'price_warranty');
  },
};
