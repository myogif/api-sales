module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn('products', 'tipe', {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: 'DEFAULT',
      }, { transaction });

      await queryInterface.addColumn('products', 'customer_name', {
        type: Sequelize.STRING(200),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('products', 'customer_phone', {
        type: Sequelize.STRING(50),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('products', 'customer_email', {
        type: Sequelize.STRING(150),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('products', 'nomor_kepesertaan', {
        type: Sequelize.STRING(120),
        allowNull: true,
      }, { transaction });

      const [stores] = await queryInterface.sequelize.query(
        'SELECT id, kode_toko FROM stores',
        { transaction },
      );

      for (const store of stores) {
        if (!store.kode_toko) {
          // eslint-disable-next-line no-continue
          continue;
        }

        const [products] = await queryInterface.sequelize.query(
          'SELECT id FROM products WHERE store_id = :storeId ORDER BY created_at ASC, id ASC',
          {
            transaction,
            replacements: { storeId: store.id },
          },
        );

        let counter = 1;
        for (const product of products) {
          await queryInterface.sequelize.query(
            'UPDATE products SET tipe = :tipe, nomor_kepesertaan = :nomor WHERE id = :id',
            {
              transaction,
              replacements: {
                id: product.id,
                tipe: 'DEFAULT',
                nomor: `${store.kode_toko}-${counter}`,
              },
            },
          );
          counter += 1;
        }
      }

      await queryInterface.changeColumn('products', 'tipe', {
        type: Sequelize.STRING(100),
        allowNull: false,
      }, { transaction });

      await queryInterface.changeColumn('products', 'nomor_kepesertaan', {
        type: Sequelize.STRING(120),
        allowNull: false,
      }, { transaction });

      await queryInterface.addConstraint('products', {
        fields: ['nomor_kepesertaan'],
        type: 'unique',
        name: 'products_nomor_kepesertaan_unique',
        transaction,
      });
    });
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeConstraint('products', 'products_nomor_kepesertaan_unique', { transaction });
      await queryInterface.removeColumn('products', 'nomor_kepesertaan', { transaction });
      await queryInterface.removeColumn('products', 'customer_email', { transaction });
      await queryInterface.removeColumn('products', 'customer_phone', { transaction });
      await queryInterface.removeColumn('products', 'customer_name', { transaction });
      await queryInterface.removeColumn('products', 'tipe', { transaction });
    });
  },
};
