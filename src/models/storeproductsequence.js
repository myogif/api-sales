module.exports = (sequelize, DataTypes) => {
  const StoreProductSequence = sequelize.define('StoreProductSequence', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    storeId: {
      type: DataTypes.UUID,
      field: 'store_id',
      allowNull: false,
      unique: true,
    },
    nextNumber: {
      type: DataTypes.INTEGER,
      field: 'next_number',
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
      },
    },
  }, {
    tableName: 'store_product_sequences',
  });

  StoreProductSequence.associate = (models) => {
    StoreProductSequence.belongsTo(models.Store, {
      foreignKey: 'storeId',
      as: 'store',
    });
  };

  return StoreProductSequence;
};
