const { calculatePriceWarranty } = require('../utils/product-pricing');

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
    code: {
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
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    priceWarranty: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
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
    persen: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    tableName: 'products',
    paranoid: true,
    indexes: [
      {
        fields: ['code'],
        unique: true,
      },
      {
        fields: ['storeId'],
      },
      {
        fields: ['creatorId'],
      },
      {
        fields: ['name'],
      },
      {
        fields: ['price'],
      },
    ],
  });

  const applyPriceWarranty = (productInstance) => {
    if (!productInstance) {
      return;
    }

    const computedValue = calculatePriceWarranty(productInstance.price, productInstance.persen);
    productInstance.setDataValue('priceWarranty', computedValue);
  };

  Product.addHook('beforeValidate', applyPriceWarranty);
  Product.addHook('beforeSave', applyPriceWarranty);

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
