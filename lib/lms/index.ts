export {
  COURSE_TOOL_IDS,
  COURSE_TOOL_LABELS,
  DEFAULT_COURSE_NAV,
  courseLmsShellEnabled,
  facultyToolSuffix,
  normalizeCourseNav,
  studentToolSuffix,
  visibleFacultyTools,
  visibleStudentTools,
  type CourseLmsNavigation,
  type CourseNavEntry,
  type CourseToolId,
} from '@/lib/lms/courseNav';
export { loadCourseNav } from '@/lib/lms/loadCourseNav';
export {
  addModuleItem,
  backfillModulesFromOutline,
  createModule,
  evaluateModuleLocks,
  listModulesWithItems,
  loadStudentModulesView,
  markModuleItemComplete,
  modulesCompletedFromProgress,
  syncPublishedOutlineItemToModule,
  updateModule,
  updateModuleItem,
  type ModuleWithItems,
} from '@/lib/lms/modules';
export {
  rebuildSmartModulesFromOutline,
  type SmartModulesBuildResult,
} from '@/lib/lms/smartModulesFromOutline';
export {
  computeWeightedGrade,
  type GroupScoreInput,
  type WeightedGradeResult,
} from '@/lib/lms/weightedGrades';
