const sendSuccess = (
  res,
  data = null,
  message = null,
  meta = null,
  statusCode = 200
) => {
  const response = {
    success: true,
    data,
    message,
    error: null,
  };

  if (meta) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

const sendError = (
  res,
  message,
  errorCode = "INTERNAL_ERROR",
  details = {},
  statusCode = 500
) => {
  return res.status(statusCode).json({
    success: false,
    data: null,
    message,
    error: {
      code: errorCode,
      details,
    },
  });
};

module.exports = {
  sendSuccess,
  sendError,
};
