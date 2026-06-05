export type ISODateString = string;

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: ISODateString;
}
export * from './contacto';
export * from './clausula';
export * from './expediente';
export * from './plantilla';
export * from './documento';
