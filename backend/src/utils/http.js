export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: parsed.error.flatten().fieldErrors,
      });
    }
    req.validatedBody = parsed.data;
    return next();
  };
}
