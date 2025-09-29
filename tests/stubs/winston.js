module.exports = {
  createLogger: () => ({
    info: () => {},
    error: () => {},
    warn: () => {},
    add: () => {},
  }),
  transports: {
    Console: class {},
  },
  format: {
    combine: (...fns) => fns,
    timestamp: () => ({}),
    printf: (fn) => fn,
    colorize: () => ({}),
    simple: () => ({}),
    errors: () => ({}),
    json: () => ({}),
  },
};
