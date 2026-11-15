import { z } from 'zod';

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function validate(source, target, schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten().fieldErrors,
      });
    }
    req[target] = parsed.data;
    return next();
  };
}

export const validateBody = (schema) => validate('body', 'validatedBody', schema);
export const validateQuery = (schema) => validate('query', 'validatedQuery', schema);
export const validateParams = (schema) => validate('params', 'validatedParams', schema);

/** `/:id` path parameter: positive integer. */
export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
