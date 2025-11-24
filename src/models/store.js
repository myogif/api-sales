module.exports = (sequelize, DataTypes) => {
  const Store = sequelize.define('Store', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    kode_toko: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      set(value) {
        if (typeof value === 'string') {
          const trimmed = value.trim();
          this.setDataValue('kode_toko', trimmed ? trimmed.toUpperCase() : trimmed);
        } else {
          this.setDataValue('kode_toko', value);
        }
      },
      validate: {
        notEmpty: {
          msg: 'Store code is required',
        },
      },
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [2, 100],
      },
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        len: [10, 20],
      },
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: 'stores',
  });

  Store.associate = (models) => {
    // Store has many Users
    Store.hasMany(models.User, {
      foreignKey: 'storeId',
      as: 'users',
    });

    // Store has one Supervisor
    Store.hasOne(models.User, {
      foreignKey: 'storeId',
      as: 'supervisor',
      scope: {
        role: 'SUPERVISOR',
      },
    });

    // Store has many Products
    Store.hasMany(models.Product, {
      foreignKey: 'storeId',
      as: 'products',
    });
  };

  return Store;
};