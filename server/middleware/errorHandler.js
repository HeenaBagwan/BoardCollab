/**
 * Centralized application error handling middleware
 */
export function errorHandler(err, req, res, next) {
  console.error('[Error Handler]', {
    method: req.method,
    url: req.originalUrl,
    name: err.name,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // MySQL Duplicate Entry (e.g. unique email or room_code conflict)
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      message: 'A resource with this identifier already exists'
    });
  }

  // JSON parse error in body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ message: 'Malformed JSON payload' });
  }

  // Custom HTTP status errors
  if (err.status && typeof err.status === 'number') {
    return res.status(err.status).json({ message: err.message || 'An error occurred' });
  }

  // Fallback 500 internal server error
  return res.status(500).json({
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : (err.message || 'Internal server error')
  });
}
