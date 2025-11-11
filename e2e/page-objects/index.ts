/**
 * Central export for all Page Object Models
 * 
 * Import all page objects from a single location:
 * import { LoginPage, DashboardPage, GroupsListPage } from './page-objects';
 */

// Authentication Pages
export { LoginPage } from './LoginPage';
export { RegisterPage } from './RegisterPage';
export { ForgotPasswordPage } from './ForgotPasswordPage';
export { ResetPasswordPage } from './ResetPasswordPage';

// Dashboard
export { DashboardPage } from './DashboardPage';

// Groups Pages
export { GroupsListPage } from './GroupsListPage';
export { GroupPage } from './GroupPage';
export { CreateGroupDialog } from './CreateGroupDialog';
export type { CreateGroupData } from './CreateGroupDialog';
export { JoinGroupDialog } from './JoinGroupDialog';
export { GroupMembersPage } from './GroupMembersPage';

// Activities Pages
export { ActivitiesListPage } from './ActivitiesListPage';
export { ActivityFormPage } from './ActivityFormPage';
export type { ActivityStepData } from './ActivityFormPage';
export { ActivityDetailsPage } from './ActivityDetailsPage';

// Tasks Pages
export { TasksPage } from './TasksPage';
export type { TaskData } from './TasksPage';

// Camp Days Pages
export { CampDaysPage } from './CampDaysPage';
export type { CampDayData } from './CampDaysPage';

