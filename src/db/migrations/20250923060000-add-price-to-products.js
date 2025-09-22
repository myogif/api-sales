module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('products', 'price', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addIndex('products', ['price']);
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('products', ['price']).catch(() => {});
    await queryInterface.removeColumn('products', 'price');
  },
};
