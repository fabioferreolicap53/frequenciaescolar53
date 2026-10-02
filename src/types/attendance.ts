export type AttendanceStatus = 'frequenta' | 'nao_frequenta' | 'pendente';

export interface AttendanceSummary {
  readonly totalPatients: number;
  readonly attendingStudents: number;
  readonly notAttendingStudents: number;
  readonly pendingStudents: number;
  readonly attendanceRate: number;
  readonly lastSyncAt: string;
}
