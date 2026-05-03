import winston from 'winston';
import path from 'path';
import { getTraceId } from './otel';

const logDir = process.env.NODE_ENV === 'production' ? '/app/logs' : path.join(process.cwd(), 'logs');

const traceIdFormat = winston.format((info): winston.Logform.TransformableInfo => {
  const traceId = getTraceId();
  if (traceId) {
    info.traceId = traceId;
  }
  return info;
});

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  // winston types: format() wrapper is FormatWrap; combine() expects Format — runtime is correct
  traceIdFormat as unknown as winston.Logform.Format,
  winston.format.errors({ stack: true }),
  winston.format.json()
);


const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'MobiManager' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length > 1 ? ' ' + JSON.stringify(meta) : '';
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        })
      ),
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'app.log'),
      maxsize: 5242880,
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),
  ],
});

export default logger;

export const logAuthAttempt = (
  type: 'admin' | 'subadmin' | 'superadmin',
  email: string,
  ip: string,
  userAgent: string,
  success: boolean,
  error?: string
) => {
  const logLevel = success ? 'info' : 'warn';
  logger.log(logLevel, `Admin ${type} login ${success ? 'success' : 'failure'}`, {
    email,
    ip,
    userAgent,
    success,
    error,
    timestamp: new Date().toISOString(),
  });
};

export const logApiRequest = (
  method: string,
  path: string,
  ip: string,
  adminId?: string,
  duration?: number
) => {
  logger.http(`${method} ${path}`, {
    ip,
    adminId,
    duration,
    timestamp: new Date().toISOString(),
  });
};

export const logDocumentUpload = (
  adminId: string,
  documentType: string,
  fileName: string,
  ip: string
) => {
  logger.info(`Document uploaded: ${documentType}`, {
    adminId,
    documentType,
    fileName,
    ip,
    timestamp: new Date().toISOString(),
  });
};

export const logVerificationChange = (
  adminId: string,
  shopName: string,
  oldStatus: string,
  newStatus: string,
  changedBy: string,
  note?: string
) => {
  logger.info(`Verification status changed`, {
    adminId,
    shopName,
    oldStatus,
    newStatus,
    changedBy,
    note,
    timestamp: new Date().toISOString(),
  });
};

export const logAuditLogCreation = (
  adminId: string,
  tableName: string,
  recordId: string,
  fieldName: string,
  reason: string,
  editedBy: string
) => {
  logger.info(`Audit log created`, {
    adminId,
    tableName,
    recordId,
    fieldName,
    reason,
    editedBy,
    timestamp: new Date().toISOString(),
  });
};
