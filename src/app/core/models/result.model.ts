export interface Result<T> {
  success: boolean;           // Indica si la operación fue exitosa
  message: string;            // Mensaje descriptivo para UI o logs
  data: T | null;             // Carga útil de datos
  timestamp?: string;         // ISO timestamp
  statusCode?: number;        // Código HTTP
  error?: ErrorDetail;        // Información detallada de fallo
  meta?: MetaData;            // Paginación o metadatos adicionales
}

export interface ErrorDetail {
  code: string;
  message: string;
  description?: string;
  details?: any;
}

export interface MetaData {
  [key: string]: any;
}

export const createSuccessResult = <T>(data: T, message = 'Operación exitosa', meta?: MetaData): Result<T> => ({
  success: true,
  message,
  data,
  timestamp: new Date().toISOString(),
  meta
});

export const createFailureResult = <T>(message: string, error?: ErrorDetail, statusCode = 500): Result<T> => ({
  success: false,
  message,
  data: null,
  timestamp: new Date().toISOString(),
  statusCode,
  error: error ?? { code: 'OPERATION_FAILED', message }
});

