export { pb, COLLECTIONS, isConfigured } from '@/lib/pocketbase';
export {
  clampSearchTerm,
  mapPatientRecord,
  toAttendanceStatus,
} from '@/services/base';
export {
  fetchPatients,
  updatePatientAttendance,
  fetchAttendanceSummary,
} from '@/services/patients.service';
export {
  loginWithPassword,
  logout,
  recordToAuthUser,
} from '@/services/auth.service';
export {
  importPatientsFromDrafts,
  registerImportHistory,
} from '@/services/import.service';
export {
  authenticateSuperuser,
  countPatients,
  deleteAllPatients,
  truncateCollection,
} from '@/services/delete.service';
export {
  MOCK_PATIENTS,
  buildMockPatients,
  buildMockSummary,
} from '@/services/mock-data';
