/**
 * Central DTO & Command Model type definitions for the REST API.
 *
 * All DTOs derive (directly or via Pick/Omit/Partial) from database entity row types
 * exported in `./db/database.types`. Transformations (like nested `invite` object for Group)
 * are modelled as derived/computed fields and documented inline.
 */
import type { Tables, TablesInsert, TablesUpdate } from "./db/database.types";

/** Primitive helper aliases for stronger semantic meaning */
export type UUID = string; // Server generates UUIDs
export type DateISO = string; // Format: YYYY-MM-DD
export type TimestampISO = string; // Full ISO timestamp with Z
export type TimeHHMM = string; // Format: HH:MM (24h)

/** Enumerations based on business rules from API plan */
export type GroupStatus = "planning" | "active" | "archived";
export type ActivityStatus = "draft" | "review" | "ready" | "archived"; // Future states included for forward compatibility
export type TaskStatus = "pending" | "in_progress" | "done" | "canceled";
export type GroupRole = "admin" | "editor" | "member";

/** Error code enumeration aggregated from API plan */
export type ApiErrorCode =
  | "GROUP_LIMIT_REACHED"
  | "DATE_RANGE_INVALID"
  | "NOT_MEMBER"
  | "FORBIDDEN_ROLE"
  | "INVITE_INVALID"
  | "INVITE_EXPIRED"
  | "INVITE_MAXED"
  | "LAST_ADMIN_REMOVAL"
  | "ROLE_INVALID"
  | "ACTIVITY_NOT_FOUND"
  | "VALIDATION_ERROR"
  | "ALREADY_ASSIGNED"
  | "USER_NOT_IN_GROUP"
  | "AI_EVALUATION_COOLDOWN"
  | "DAY_OUT_OF_RANGE"
  | "DATE_OUT_OF_GROUP_RANGE"
  | "DUPLICATE_DAY_NUMBER"
  | "OVERLAPPING_TIME"
  | "ORDER_IN_DAY_CONFLICT"
  | "TASK_NOT_FOUND"
  | "RATE_LIMIT_EXCEEDED"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "BAD_REQUEST"
  | "INTERNAL_ERROR";

/** Standard API error envelope */
export interface ApiError {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

/** Generic list & single envelopes */
export interface ApiSingle<T> {
  data: T;
}
export interface ApiList<T> {
  data: T[];
  nextCursor?: string; // Opaque cursor for pagination
  count?: number; // Optional total (when offset pagination used)
}

/** Pagination query helper types */
export interface CursorPaginationParams {
  limit?: number;
  cursor?: string;
}
export interface OffsetPaginationParams {
  page?: number;
  page_size?: number;
}

/** =====================
 *  Entity Row Aliases
 *  (Direct references to underlying DB rows)
 *  ===================== */
export type GroupEntity = Tables<"groups">;
export type GroupMembershipEntity = Tables<"group_memberships">;
export type ActivityEntity = Tables<"activities">;
export type ActivityEditorEntity = Tables<"activity_editors">;
export type AIEvaluationEntity = Tables<"ai_evaluations">;
export type CampDayEntity = Tables<"camp_days">;
export type ActivityScheduleEntity = Tables<"activity_schedules">;
export type GroupTaskEntity = Tables<"group_tasks">;
export type GroupDashboardStatsEntity = Tables<"group_dashboard_stats">; // View
export type UserGroupPermissionsEntity = Tables<"user_group_permissions">; // View

/** =====================
 *  Derived / Nested Structures
 *  ===================== */
export interface InviteDTO {
  code: string; // groups.invite_code
  expires_at: TimestampISO | null; // groups.invite_expires_at
  max_uses: number; // groups.invite_max_uses
  current_uses: number; // groups.invite_current_uses
}

/** =====================
 *  Resource DTOs
 *  ===================== */

/** GROUP */
export interface GroupDTO
  extends Pick<
    GroupEntity,
    | "id"
    | "name"
    | "description"
    | "lore_theme"
    | "status"
    | "start_date"
    | "end_date"
    | "max_members"
    | "created_at"
    | "updated_at"
    | "deleted_at"
  > {
  invite: InviteDTO | null; // Composed from invite_* columns
}

/** GROUP MEMBERSHIP */
export type GroupMemberDTO = Pick<GroupMembershipEntity, "user_id" | "role" | "joined_at"> & {
  group_id: UUID; // Optional exposure (can be omitted if redundant)
};

/** ACTIVITY */
export type ActivityDTO = Pick<
  ActivityEntity,
  | "id"
  | "group_id"
  | "title"
  | "objective"
  | "tasks"
  | "duration_minutes"
  | "location"
  | "materials"
  | "responsible"
  | "knowledge_scope"
  | "participants"
  | "flow"
  | "summary"
  | "status"
  | "last_evaluation_requested_at"
  | "deleted_at"
  | "created_at"
  | "updated_at"
>;

/** ACTIVITY EDITOR ASSIGNMENTS */
export type ActivityEditorDTO = Pick<
  ActivityEditorEntity,
  "activity_id" | "user_id" | "assigned_at" | "assigned_by_user_id"
>;

/** AI EVALUATION */
export interface AIEvaluationDTO
  extends Pick<
    AIEvaluationEntity,
    | "id"
    | "activity_id"
    | "version"
    | "lore_score"
    | "scouting_values_score"
    | "lore_feedback"
    | "scouting_feedback"
    | "tokens"
    | "created_at"
  > {
  suggestions: string[]; // Narrowed from Json (expected array of strings)
}

/** CAMP DAY */
export type CampDayDTO = Pick<
  CampDayEntity,
  "id" | "group_id" | "day_number" | "date" | "theme" | "created_at" | "updated_at"
>;

/** ACTIVITY SCHEDULE */
export type ActivityScheduleDTO = Pick<
  ActivityScheduleEntity,
  "id" | "activity_id" | "camp_day_id" | "start_time" | "end_time" | "order_in_day" | "created_at" | "updated_at"
>;

/** GROUP TASK */
export type GroupTaskDTO = Pick<
  GroupTaskEntity,
  "id" | "group_id" | "activity_id" | "title" | "description" | "due_date" | "status" | "created_at" | "updated_at"
>;

/** DASHBOARD STATS */
export interface GroupDashboardDTO {
  group_id: UUID;
  total_activities: number;
  evaluated_activities: number;
  pct_evaluated_above_7: number;
  tasks: { pending: number; done: number };
  recent_activity: {
    type: string; // e.g. 'activity_created'
    id: UUID;
    at: TimestampISO;
    user_id: UUID;
  }[];
}

/** PERMISSIONS */
export interface GroupPermissionsDTO
  extends Pick<UserGroupPermissionsEntity, "role" | "can_edit_all" | "can_edit_assigned_only"> {
  group_id: UUID;
}

/** SEARCH RESULTS (MVP+1) */
export interface SearchResultActivitySummary
  extends Pick<ActivityEntity, "id" | "group_id" | "title" | "objective" | "status"> {}
export interface SearchResultTaskSummary extends Pick<GroupTaskEntity, "id" | "group_id" | "title" | "status"> {}
export interface SearchResultsDTO {
  activities?: SearchResultActivitySummary[];
  tasks?: SearchResultTaskSummary[];
}

/** HEALTH & VERSION */
export interface HealthDTO {
  ok: true;
  build: string;
  timestamp: TimestampISO;
}
export interface VersionDTO {
  version: string;
  released_at: TimestampISO;
}

/** =====================
 *  Command Models (Request Payloads)
 *  ===================== */

/** GROUP CREATE */
export type GroupCreateCommand = Pick<
  TablesInsert<"groups">,
  "name" | "description" | "lore_theme" | "start_date" | "end_date" | "max_members" | "created_by" | "updated_by"
>;

/** GROUP UPDATE (PATCH) */
export type GroupUpdateCommand = Partial<
  Pick<
    TablesUpdate<"groups">,
    "name" | "description" | "lore_theme" | "status" | "start_date" | "end_date" | "max_members"
  >
>;

/** GROUP RESTORE (empty body semantics) */
export type GroupRestoreCommand = Record<never, never>;

/** GROUP INVITE ROTATE (no body; query param reuse=true optional) */
export type GroupInviteRotateCommand = Record<never, never>;

/** GROUP JOIN BY CODE */
export interface GroupJoinCommand {
  code: string;
}

/** GROUP MEMBERSHIP ROLE CHANGE */
export interface GroupMembershipRoleChangeCommand {
  role: GroupRole;
}

/** ACTIVITY CREATE */
// group_id supplied via path param /api/groups/{group_id}/activities
export type ActivityCreateCommand = Pick<
  TablesInsert<"activities">,
  | "title"
  | "objective"
  | "tasks"
  | "duration_minutes"
  | "location"
  | "materials"
  | "responsible"
  | "knowledge_scope"
  | "participants"
  | "flow"
  | "summary"
>;

/** ACTIVITY UPDATE */
export type ActivityUpdateCommand = Partial<
  Pick<
    TablesUpdate<"activities">,
    | "title"
    | "objective"
    | "tasks"
    | "duration_minutes"
    | "location"
    | "materials"
    | "responsible"
    | "knowledge_scope"
    | "participants"
    | "flow"
    | "summary"
    | "status"
  >
>;

/** ACTIVITY RESTORE (empty body) */
export type ActivityRestoreCommand = Record<never, never>;

/** ACTIVITY EDITOR ASSIGN */
export interface ActivityEditorAssignCommand {
  user_id: UUID;
}

/** ACTIVITY EDITOR REMOVE (no body) */
export type ActivityEditorRemoveCommand = Record<never, never>;

/** AI EVALUATION REQUEST (no body; server uses path param) */
export type AIEvaluationRequestCommand = Record<never, never>;

/** CAMP DAY CREATE */
// group_id via path param /api/groups/{group_id}/camp-days
export type CampDayCreateCommand = Pick<TablesInsert<"camp_days">, "day_number" | "date" | "theme">;

/** CAMP DAY UPDATE */
export type CampDayUpdateCommand = Partial<Pick<TablesUpdate<"camp_days">, "date" | "theme">>;

/** ACTIVITY SCHEDULE CREATE */
// camp_day_id via path param /api/camp-days/{camp_day_id}/schedules
export type ActivityScheduleCreateCommand = Pick<
  TablesInsert<"activity_schedules">,
  "activity_id" | "start_time" | "end_time" | "order_in_day"
>;

/** ACTIVITY SCHEDULE UPDATE */
export type ActivityScheduleUpdateCommand = Partial<
  Pick<TablesUpdate<"activity_schedules">, "start_time" | "end_time" | "order_in_day">
>;

/** GROUP TASK CREATE */
// group_id via path param /api/groups/{group_id}/tasks
export type GroupTaskCreateCommand = Pick<
  TablesInsert<"group_tasks">,
  "title" | "description" | "due_date" | "activity_id"
>;

/** GROUP TASK UPDATE */
export type GroupTaskUpdateCommand = Partial<
  Pick<TablesUpdate<"group_tasks">, "title" | "description" | "due_date" | "status" | "activity_id">
>;

/** DASHBOARD (GET only - no command body) */
export type GroupDashboardFetchCommand = Record<never, never>;

/** PERMISSIONS (GET only) */
export type GroupPermissionsFetchCommand = Record<never, never>;

/** SEARCH QUERY (represented separately from body since GET) */
export interface SearchQueryParams {
  q: string;
  group_id: UUID;
  type?: string; // e.g. 'activities,tasks'
}

/** HEALTH & VERSION (GET only) */
export type HealthFetchCommand = Record<never, never>;
export type VersionFetchCommand = Record<never, never>;

/** =====================
 *  Supporting Utility Types
 *  ===================== */
/** Conditional update with ETag (If-Match header) pattern */
export interface ConcurrencyControlHeaders {
  ifMatch?: string;
}

/** Envelope with error union for function return typing convenience */
export type ApiResponse<T> = ApiSingle<T> | ApiError;
export type ApiListResponse<T> = ApiList<T> | ApiError;

/** =====================
 *  Type Guards (optional convenience declarations; implementations live elsewhere)
 *  ===================== */
export interface WithMeta<T> {
  data: T;
  _meta?: { etag?: string };
}

// NOTE: No executable logic here; purely type declarations derived from DB schema & API design.

/**
 * Extended Activity DTO including editors collection.
 * Added separately to avoid changing base ActivityDTO which mirrors direct row fields.
 */
export interface ActivityWithEditorsDTO extends ActivityDTO {
  editors: ActivityEditorDTO[];
}
