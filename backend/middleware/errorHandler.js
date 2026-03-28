const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Server Error';

  console.error('Error Stack:', err.stack);

  // Prisma unique constraint error
  if (err.code === 'P2002') {
    statusCode = 400;
    message = `Duplicate field value: ${err.meta?.target || 'Resource already exists'}`;
  }

  // Prisma record not found error
  if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Resource not found';
  }

  // Prisma foreign key constraint error
  if (err.code === 'P2003') {
    statusCode = 400;
    message = 'Foreign key constraint failed';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired';
  }

  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack, code: err.code })
  });
};

module.exports = errorHandler;
