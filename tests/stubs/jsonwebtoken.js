const sign = (payload) => JSON.stringify(payload);

const verify = (token) => {
  try {
    return JSON.parse(token);
  } catch (error) {
    const err = new Error('Invalid token');
    err.name = 'JsonWebTokenError';
    throw err;
  }
};

module.exports = {
  sign,
  verify,
};
