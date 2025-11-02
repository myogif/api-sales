const isEmptyValue = (value) => value === undefined || value === null || value === '';

const ensureErrorStore = (req) => {
  if (!req._validationErrors) {
    Object.defineProperty(req, '_validationErrors', {
      value: [],
      writable: true,
      enumerable: false,
    });
  }
  return req._validationErrors;
};

const addError = (req, field, location, message) => {
  const errors = ensureErrorStore(req);
  errors.push({
    msg: message,
    param: field || '_error',
    location,
  });
};

const getLocationContainer = (req, location) => {
  if (location === 'body') {
    if (!req.body) req.body = {};
    return req.body;
  }
  if (location === 'params') {
    if (!req.params) req.params = {};
    return req.params;
  }
  if (location === 'query') {
    if (!req.query) req.query = {};
    return req.query;
  }
  return {};
};

const addValidator = (chain, runFn, defaultMessage, options = {}) => {
  chain._validators.push({
    run: runFn,
    defaultMessage,
    customMessage: null,
    isSanitizer: false,
    useErrorMessage: options.useErrorMessage || false,
  });
};

const addSanitizer = (chain, runFn) => {
  chain._validators.push({
    run: runFn,
    isSanitizer: true,
  });
};

const createChain = (field, location) => {
  const chain = {
    _field: field,
    _location: location,
    _validators: [],
    _optional: false,
    _optionalOptions: {},
    optional(options = {}) {
      this._optional = true;
      this._optionalOptions = options;
      return this;
    },
    notEmpty() {
      addValidator(this, (value) => {
        if (isEmptyValue(value)) {
          throw new Error('Value cannot be empty');
        }
        if (typeof value === 'string' && value.trim() === '') {
          throw new Error('Value cannot be empty');
        }
      }, 'Value cannot be empty');
      return this;
    },
    isLength({ min, max }) {
      addValidator(this, (value) => {
        const str = value === undefined || value === null ? '' : String(value);
        if (typeof min === 'number' && str.length < min) {
          throw new Error('Value is shorter than minimum length');
        }
        if (typeof max === 'number' && str.length > max) {
          throw new Error('Value is longer than maximum length');
        }
      }, 'Invalid length');
      return this;
    },
    isFloat(options = {}) {
      addValidator(this, (value) => {
        if (isEmptyValue(value)) {
          throw new Error('Value must be a number');
        }
        const num = Number(value);
        if (Number.isNaN(num)) {
          throw new Error('Value must be a number');
        }
        if (typeof options.min === 'number' && num < options.min) {
          throw new Error('Value is less than minimum');
        }
      }, 'Invalid number');
      return this;
    },
    toFloat() {
      addSanitizer(this, (value) => {
        if (isEmptyValue(value)) {
          return value;
        }
        const num = Number(value);
        return Number.isNaN(num) ? value : num;
      });
      return this;
    },
    isInt(options = {}) {
      addValidator(this, (value) => {
        if (isEmptyValue(value)) {
          throw new Error('Value must be an integer');
        }
        const num = typeof value === 'number' ? value : Number(value);
        if (!Number.isInteger(num)) {
          throw new Error('Value must be an integer');
        }
        if (typeof options.min === 'number' && num < options.min) {
          throw new Error('Value is less than minimum');
        }
      }, 'Invalid integer');
      return this;
    },
    isBoolean() {
      addValidator(this, (value) => {
        if (isEmptyValue(value)) {
          throw new Error('Value must be a boolean');
        }
        if (typeof value === 'boolean') {
          return;
        }
        if (typeof value === 'string') {
          const normalized = value.toLowerCase();
          if (normalized === 'true' || normalized === 'false') {
            return;
          }
        }
        throw new Error('Value must be a boolean');
      }, 'Invalid boolean');
      return this;
    },
    toBoolean() {
      addSanitizer(this, (value) => {
        if (typeof value === 'boolean') {
          return value;
        }
        if (typeof value === 'string') {
          const normalized = value.toLowerCase();
          if (normalized === 'true') {
            return true;
          }
          if (normalized === 'false') {
            return false;
          }
        }
        return Boolean(value);
      });
      return this;
    },
    isEmail() {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      addValidator(this, (value) => {
        if (isEmptyValue(value)) {
          throw new Error('Value must be a valid email address');
        }
        if (typeof value !== 'string' || !emailRegex.test(value.trim())) {
          throw new Error('Value must be a valid email address');
        }
      }, 'Invalid email address');
      return this;
    },
    isString() {
      addValidator(this, (value) => {
        if (typeof value !== 'string') {
          throw new Error('Value must be a string');
        }
      }, 'Invalid string');
      return this;
    },
    isUUID() {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      addValidator(this, (value) => {
        if (typeof value !== 'string' || !uuidRegex.test(value)) {
          throw new Error('Value must be a valid UUID');
        }
      }, 'Invalid UUID');
      return this;
    },
    custom(fn) {
      addValidator(
        this,
        async (value, context) => {
          const result = fn(value, context);
          if (result instanceof Promise) {
            await result;
          } else if (result === false) {
            throw new Error('Invalid value');
          }
        },
        'Invalid value',
        { useErrorMessage: true },
      );
      return this;
    },
    withMessage(message) {
      if (this._validators.length > 0) {
        const last = this._validators[this._validators.length - 1];
        last.customMessage = message;
      }
      return this;
    },
    async run(req) {
      const data = getLocationContainer(req, this._location);
      const targetField = this._field;
      const valueExists = targetField === undefined
        || Object.prototype.hasOwnProperty.call(data, targetField);
      const rawValue = targetField === undefined ? data : data[targetField];
      const skipForOptional = () => {
        if (!this._optional) {
          return false;
        }
        if (!valueExists) {
          return true;
        }
        if (isEmptyValue(rawValue)) {
          return true;
        }
        if (this._optionalOptions.checkFalsy && !rawValue) {
          return true;
        }
        if (this._optionalOptions.nullable && rawValue === null) {
          return true;
        }
        return false;
      };

      if (skipForOptional()) {
        return;
      }

      let value = rawValue;

      for (const validator of this._validators) {
        if (validator.isSanitizer) {
          value = validator.run(value, { req });
          if (targetField !== undefined) {
            data[targetField] = value;
          }
          continue;
        }

        try {
          const result = validator.run(value, { req });
          if (result instanceof Promise) {
            await result;
          }
        } catch (error) {
          const message = validator.customMessage
            || (validator.useErrorMessage && error && error.message)
            || validator.defaultMessage;
          addError(req, targetField, this._location, message);
          return;
        }
      }

      if (targetField !== undefined) {
        data[targetField] = value;
      }
    },
  };

  return chain;
};

const body = (field) => createChain(field, 'body');
const param = (field) => createChain(field, 'params');

const validationResult = (req) => {
  const errors = req._validationErrors || [];
  return {
    isEmpty: () => errors.length === 0,
    array: () => errors.slice(),
  };
};

module.exports = {
  body,
  param,
  validationResult,
};
