module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('store_product_sequences', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },
        store_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'stores',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        next_number: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
      }, { transaction });

      await queryInterface.addIndex('store_product_sequences', ['store_id'], {
        name: 'store_product_sequences_store_id_unique',
        unique: true,
        transaction,
      });
    });
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex('store_product_sequences', 'store_product_sequences_store_id_unique', { transaction });
      await queryInterface.dropTable('store_product_sequences', { transaction });
    });
  },
};
