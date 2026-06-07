const errorHandler = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Something went wrong';
  const code = err.code || 'INTERNAL_ERROR';

  if (isDev) {
    console.error(`[ERROR] ${status} ${code}: ${message}`);
    console.error(err.stack);
  }

  res.status(status).json({
    error: {
      code,
      message,
      ...(isDev && { stack: err.stack }),
    },
  });
};

function createError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

module.exports = { errorHandler, createError };