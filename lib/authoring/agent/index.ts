export {
  buildOutlineInventory,
  inventoryHumanSummary,
  inventoryPlannerSnapshot,
  isItemPublished,
  type InventoryItem,
  type OutlineInventory,
} from '@/lib/authoring/agent/inventory';
export {
  executeToolCall,
  formatToolResultsReply,
  plannerPlanSchema,
  resolveItemSelector,
  TOOL_NAMES,
  type ItemSelector,
  type PlannerPlan,
  type ToolCall,
  type ToolName,
  type ToolResult,
} from '@/lib/authoring/agent/tools';
export {
  authoringCapabilitiesReply,
  authoringClarifyReply,
  authoringOutOfScopeReply,
} from '@/lib/authoring/agent/capabilities';
export {
  classifyAuthoringIntent,
  type AuthoringIntent,
  type AuthoringIntentKind,
  type OutOfScopeAction,
} from '@/lib/authoring/agent/classify';
export {
  encodeLastActionMarker,
  findLastActionInHistory,
  parseLastActionMarker,
  stripLastActionMarker,
  type AuthoringLastAction,
} from '@/lib/authoring/agent/lastAction';
export {
  buildAuthoringFollowUps,
  type AuthoringFollowUp,
} from '@/lib/authoring/agent/followUps';
export {
  resolveAuthoringTargets,
  type TargetResolution,
} from '@/lib/authoring/agent/resolveTargets';
export {
  applyTargetResolution,
  fallbackPlan,
  normalizePlan,
  runAuthoringAgent,
  type AuthoringAgentResult,
} from '@/lib/authoring/agent/run';
