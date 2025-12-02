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
    tipe: {
      type: DataTypes.STRING(100),
      allowNull: false,
      set(value) {
        if (typeof value === 'string') {
          this.setDataValue('tipe', value.trim());
        } else {
          this.setDataValue('tipe', value);
        }
      },
      validate: {
        notEmpty: {
          msg: 'Product type is required',
        },
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
    customerName: {
      type: DataTypes.STRING(200),
      field: 'customer_name',
      allowNull: true,
      set(value) {
        if (typeof value === 'string') {
          this.setDataValue('customerName', value.trim());
        } else {
          this.setDataValue('customerName', value);
        }
      },
    },
    customerPhone: {
      type: DataTypes.STRING(50),
      field: 'customer_phone',
      allowNull: true,
      set(value) {
        if (typeof value === 'string') {
          this.setDataValue('customerPhone', value.trim());
        } else if (value != null) {
          this.setDataValue('customerPhone', String(value).trim());
        } else {
          this.setDataValue('customerPhone', value);
        }
      },
    },
    customerEmail: {
      type: DataTypes.STRING(150),
      field: 'customer_email',
      allowNull: true,
      set(value) {
        if (typeof value === 'string') {
          const trimmed = value.trim();
          this.setDataValue('customerEmail', trimmed ? trimmed.toLowerCase() : trimmed);
        } else {
          this.setDataValue('customerEmail', value);
        }
      },
      validate: {
        isEmail: {
          msg: 'Customer email must be valid',
        },
      },
    },
    invoiceNumber: {
      type: DataTypes.STRING,
      field: 'invoice_number',
      allowNull: false,
      set(value) {
        if (typeof value === 'string') {
          this.setDataValue('invoiceNumber', value.trim());
        } else {
          this.setDataValue('invoiceNumber', value);
        }
      },
      validate: {
        notEmpty: {
          msg: 'Invoice number is required',
        },
      },
    },
    warrantyMonths: {
      type: DataTypes.INTEGER,
      field: 'warranty_months',
      allowNull: false,
      validate: {
        min: 1,
        isInt: true,
      },
    },
    nomorKepesertaan: {
      type: DataTypes.STRING(120),
      field: 'nomor_kepesertaan',
      allowNull: false,
      unique: true,
      set(value) {
        if (typeof value === 'string') {
          const trimmed = value.trim();
          this.setDataValue('nomorKepesertaan', trimmed ? trimmed.toUpperCase() : trimmed);
        } else {
          this.setDataValue('nomorKepesertaan', value);
        }
      },
      validate: {
        notEmpty: {
          msg: 'Nomor kepesertaan is required',
        },
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
      {
        fields: ['nomor_kepesertaan'],
        unique: true,
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
