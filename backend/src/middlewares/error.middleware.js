import { HttpError } from '../utils/http-error.js';
import { config } from '../config/env.js';

/** Middleware 404 para rutas no registradas. */
export function notFoundHandler(req, res) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

/**
 * Middleware centralizado de manejo de errores.
 * Traduce HttpError y errores de validación de Sequelize a respuestas JSON.
 */
// eslint-disable-next-line no-unused-vars -- Express detecta el error handler por su aridad (4 args)
export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({ error: err.message, details: err.details });
  }

  // JSON con sintaxis inválida (body-parser) → 400
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es JSON válido' });
  }
  // Cuerpo mayor al límite de body-parser (100 KB) → 413 (ver ADR-0016)
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'El cuerpo de la petición es demasiado grande' });
  }

  // Errores de validación / unicidad de Sequelize → 400 / 409
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ error: 'El recurso ya existe', details: err.errors?.map((e) => e.message) });
  }
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({ error: 'Datos inválidos', details: err.errors?.map((e) => e.message) });
  }

  // Error no controlado
  if (config.env !== 'test') {
    console.error('[error]', err);
  }
  return res.status(500).json({ error: 'Error interno del servidor' });
}
