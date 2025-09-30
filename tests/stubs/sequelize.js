const Op = {
  or: Symbol('or'),
  and: Symbol('and'),
  like: Symbol('like'),
  iLike: Symbol('iLike'),
  gte: Symbol('gte'),
  lte: Symbol('lte'),
  lt: Symbol('lt'),
};

const fn = (name, ...args) => ({
  type: 'fn',
  name,
  args,
});

const col = (name) => ({
  type: 'col',
  name,
});

const where = (lhs, rhs) => ({
  type: 'where',
  lhs,
  rhs,
});

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
module.exports.fn = fn;
module.exports.col = col;
module.exports.where = where;
