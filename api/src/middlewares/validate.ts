import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import AppError from '../helper/AppError';

const validate =
  (schema: AnyZodObject) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      //  * await schema.parseAsync({
      //  *   body: req.body,
      //  *  query: req.query,
      //  *   params: req.params,
      //  * });
      await schema.parseAsync(req.body);

      return next();
    } catch (err: any) {
      let message = err.message || '';
      if (err instanceof ZodError) {
        message = err.flatten().fieldErrors;
      }

      return next(
        new AppError({
          message: message || 'Error validating request body!!',
          statusCode: err.statusCode || 400,
          stack: err.stack || '',
        })
      );
    }
  };

export default validate;
