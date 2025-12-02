module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn('products', 'invoice_number', {
        type: Sequelize.STRING,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('products', 'warranty_months', {
        type: Sequelize.INTEGER,
        allowNull: true,
      }, { transaction });
    });
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn('products', 'warranty_months', { transaction });
      await queryInterface.removeColumn('products', 'invoice_number', { transaction });
    });
  },
};
