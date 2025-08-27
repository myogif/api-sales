module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        len: [2, 200],
      },
    },
    sku: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: [2, 50],
      },
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    purchasedAt: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    storeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'stores',
        key: 'id',
      },
    },
    creatorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: 'products',
    paranoid: true,
    indexes: [
      {
        fields: ['sku'],
        unique: true,
      },
      {
        fields: ['storeId'],
      },
      {
        fields: ['creatorId'],
      },
      {
        fields: ['purchasedAt'],
      },
      {
        fields: ['name'],
      },
    ],
  });

  Product.associate = (models) => {
    // Product belongs to Store
    Product.belongsTo(models.Store, {
      foreignKey: 'storeId',
      as: 'store',
    });

    // Product belongs to User (creator)
    Product.belongsTo(models.User, {
      foreignKey: 'creatorId',
      as: 'creator',
    });
  };

  return Product;
};