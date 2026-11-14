/** Fill `{courseId}` in a path/query template. Safe for RSC + client. */
export function fillCourseHrefTemplate(
  template: string,
  courseId: string,
): string {
  return template.replaceAll('{courseId}', courseId);
}
