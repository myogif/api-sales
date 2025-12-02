const success = (message = 'Berhasil', data = null) => ({
  success: true,
  message,
  data,
});

const error = (message = 'Terjadi kesalahan', errors = null) => ({
  success: false,
  message,
  errors,
  data: null,
});

const paginated = (message = 'Data berhasil diambil', data) => ({
  success: true,
  message,
  data,
});

const validation = (errors) => ({
  success: false,
  message: 'Validasi gagal',
  errors: errors.map((err) => err.msg),
  data: null,
});

module.exports = {
  success,
  error,
  paginated,
  validation,
};