const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      validate: {
        len: [10, 20],
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [6, 100],
      },
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [2, 100],
      },
    },
    role: {
      type: DataTypes.ENUM('MANAGER', 'SUPERVISOR', 'SALES'),
      allowNull: false,
    },
    storeId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'stores',
        key: 'id',
      },
    },
    supervisorId: {
      type: DataTypes.UUID,
      allowNull: true,
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
    tableName: 'users',
    paranoid: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 12);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 12);
        }
      },
    },
    defaultScope: {
      attributes: { exclude: ['password'] },
    },
    scopes: {
      withPassword: {
        attributes: { include: ['password'] },
      },
    },
  });

  User.associate = (models) => {
    // User belongs to Store
    User.belongsTo(models.Store, {
      foreignKey: 'storeId',
      as: 'store',
    });

    // User belongs to Supervisor (self-reference)
    User.belongsTo(models.User, {
      foreignKey: 'supervisorId',
      as: 'supervisor',
    });

    // User has many Sales (as supervisor)
    User.hasMany(models.User, {
      foreignKey: 'supervisorId',
      as: 'salesTeam',
    });

    // User has many Products (as creator)
    User.hasMany(models.Product, {
      foreignKey: 'creatorId',
      as: 'createdProducts',
    });
  };

  User.prototype.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  };

  User.prototype.toSafeJSON = function () {
    const values = { ...this.dataValues };
    delete values.password;
    return values;
  };

  return User;
};