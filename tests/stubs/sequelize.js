const Op = {
  or: Symbol('or'),
  iLike: Symbol('iLike'),
  gte: Symbol('gte'),
  lte: Symbol('lte'),
};

class SequelizeStub {
  constructor() {}

  define() {
    return {};
  }
}

const DataTypes = new Proxy({}, {
  get: () => ({}),
});

module.exports = SequelizeStub;
module.exports.Sequelize = SequelizeStub;
module.exports.Op = Op;
module.exports.DataTypes = DataTypes;
