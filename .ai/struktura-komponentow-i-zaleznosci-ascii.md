# Struktura Komponentów i Zależności - 10x Project

## Legenda

- 📦 Moduł/Katalog domenowy
- 🔷 React Component (.tsx)
- 🔶 Astro Component (.astro)
- 🎨 UI Component (Shadcn/ui)
- 🔧 Utility/Hook (.ts)
- 📝 Types/Interfaces
- ⚡ Realtime/WebSocket
- 🗄️ API Client
- 🎯 Service Layer
- 🔄 Mapper

---

## Struktura Komponentów

```
src/
├── components/
│   ├── 📦 activities/ [Zarządzanie aktywnościami obozowymi]
│   │   ├── 🔷 ActivitiesListShell.tsx
│   │   ├── 🔷 ActivitiesSkeletonRows.tsx
│   │   ├── 🔷 ActivitiesTable.tsx ⭐ [Główna tabela - używa ActivityRow, RowActionsMenu]
│   │   │   └── Zależności: ActivityWithEditorsDTO, ColumnVisibilityState
│   │   │       AIChips, EditorsAvatarGroup, RowActionsMenu
│   │   ├── 🔷 ActivitiesToolbar.tsx
│   │   ├── 🔷 ActivityRow.tsx
│   │   ├── 🔷 AIChips.tsx [Wyświetla oceny AI (lore, scouting)]
│   │   ├── 🔷 BulkActionsBar.tsx
│   │   ├── 🔷 ColumnsConfigurator.tsx
│   │   ├── 🔷 CreateActivityDialog.tsx
│   │   ├── 🔷 EditorsAvatarGroup.tsx [Avatary edytorów]
│   │   ├── 🔷 EmptyState.tsx
│   │   ├── 🔷 RowActionsMenu.tsx [Menu akcji dla wiersza]
│   │   │
│   │   ├── 📦 details/ [Widok szczegółów aktywności]
│   │   │   ├── 🔷 ActionsBar.tsx
│   │   │   ├── 🔷 ActivityDetailsView.tsx ⭐ [Główny widok szczegółów]
│   │   │   ├── 🔷 ActivityFieldsSection.tsx
│   │   │   ├── 🔷 ActivityHeader.tsx
│   │   │   ├── 🔷 AIEvaluationPanel.tsx [Panel oceny AI]
│   │   │   ├── 🔷 AIEvaluationSummary.tsx
│   │   │   ├── 🔷 AIEvaluationTimeline.tsx
│   │   │   ├── 🔷 Countdown.tsx
│   │   │   └── 🔷 EditorsList.tsx
│   │   │
│   │   ├── 📦 editor/ [Edytor aktywności z real-time]
│   │   │   ├── 🔷 ActivityEditorApp.tsx ⭐ [Główna aplikacja edytora]
│   │   │   │   └── Zależności: useActivity, getGroupPermissions, supabaseClient
│   │   │   │       ActivityEditorForm, useEditors (realtime)
│   │   │   ├── 🔷 ActivityEditorForm.tsx [Formularz z autosave]
│   │   │   ├── 🔷 ActivityForm.tsx
│   │   │   ├── 🔷 ActivityHeader.tsx
│   │   │   ├── 🔷 ActivityTabs.tsx
│   │   │   ├── 🔷 AIEvaluationPanel.tsx
│   │   │   ├── 🔷 AutosaveIndicator.tsx
│   │   │   ├── 🔷 ConflictDiffModal.tsx [Wykrywanie konfliktów]
│   │   │   ├── 🔷 DirtyPrompt.tsx [Ostrzeżenie o niezapisanych zmianach]
│   │   │   ├── 🔷 EditorsManager.tsx ⚡ [Zarządzanie edytorami realtime]
│   │   │   ├── 🔷 RelatedTasks.tsx
│   │   │   └── 🔷 UserCombobox.tsx
│   │   │
│   │   └── 📦 new/ [Kreator nowej aktywności - multi-step]
│   │       ├── 🔷 AddToScheduleDialog.tsx
│   │       ├── 🔷 BasicsStep.tsx [Krok 1: Podstawowe informacje]
│   │       ├── 🔷 ContentStep.tsx [Krok 2: Treść merytoryczna]
│   │       ├── 🔷 CtaBar.tsx [Pasek akcji nawigacyjnych]
│   │       ├── 🔷 LeaveConfirmDialog.tsx
│   │       ├── 🔷 LogisticsStep.tsx [Krok 3: Logistyka]
│   │       ├── 🔷 NewActivityStepper.tsx ⭐ [Główny stepper z 4 krokami]
│   │       │   └── Zależności: useLeaveGuard, useStepValidation,
│   │       │       useCreateActivity, useAssignSelfOnCreate, useAutosave
│   │       ├── 🔷 StepIndicator.tsx
│   │       ├── 🔷 SummaryStep.tsx [Krok 4: Podsumowanie]
│   │       ├── 📝 types.ts
│   │       └── 📦 hooks/
│   │           ├── 🔧 useAutosave.ts
│   │           ├── 🔧 useAssignSelfOnCreate.ts
│   │           ├── 🔧 useCreateActivity.ts
│   │           ├── 🔧 useLeaveGuard.ts
│   │           └── 🔧 useStepValidation.ts
│   │
│   ├── 📦 auth/ [Autentykacja i autoryzacja]
│   │   ├── 🔷 EmailField.tsx
│   │   ├── 🔷 ForgotPasswordCard.tsx
│   │   ├── 🔷 ForgotPasswordForm.tsx
│   │   ├── 🔷 LoginCard.tsx
│   │   ├── 🔷 LoginForm.tsx
│   │   │   └── Zależności: useLogin (lib/auth)
│   │   ├── 🔷 PasswordField.tsx
│   │   ├── 🔷 PasswordStrengthIndicator.tsx
│   │   ├── 🔷 RegisterCard.tsx
│   │   ├── 🔷 RegisterForm.tsx
│   │   │   └── Zależności: useRegister (lib/auth)
│   │   ├── 🔷 ResetPasswordCard.tsx
│   │   └── 🔷 ResetPasswordForm.tsx
│   │
│   ├── 📦 camp-days/ [Harmonogramy dni obozowych]
│   │   ├── 🔷 ActivityBadge.tsx
│   │   ├── 🔷 ActivityPickerDialog.tsx
│   │   ├── 🔷 AddSlotButton.tsx
│   │   ├── 🔷 ApplyTemplateButton.tsx
│   │   ├── 🔷 CampDayCreateForm.tsx
│   │   ├── 🔷 CampDayEditForm.tsx
│   │   ├── 🔷 CampDayPageActions.tsx
│   │   ├── 🔷 CampDayView.tsx ⭐ [Główny widok dnia z realtime]
│   │   │   └── Zależności: useCampDayData, useActivitySummaries,
│   │   │       useRealtimeCampDay ⚡, DaySelector, DayHeader,
│   │   │       ConflictsBanner, SlotsList, SaveStatusBar
│   │   ├── 🔷 ConflictsBanner.tsx [Ostrzeżenia o konfliktach czasowych]
│   │   ├── 🔷 DayHeader.tsx
│   │   ├── 🔷 DaySelector.tsx
│   │   ├── 🔷 DeleteCampDayButton.tsx
│   │   ├── 🔷 SaveStatusBar.tsx [Status autosave]
│   │   ├── 🔷 SlotRow.tsx [Wiersz slotu czasowego]
│   │   ├── 🔷 SlotsList.tsx [Lista slotów z drag&drop]
│   │   ├── 🔷 SortableSlot.tsx [Sortowalne sloty]
│   │   ├── 🔷 TimeRangeEditor.tsx
│   │   │
│   │   └── 📦 list/ [Lista dni obozowych]
│   │       ├── 🔷 CampDayCard.tsx
│   │       ├── 🔷 CampDayMetrics.tsx
│   │       ├── 🔷 CampDaysEmptyState.tsx
│   │       ├── 🔷 CampDaysFilters.tsx
│   │       ├── 🔷 CampDaysHeader.tsx
│   │       ├── 🔷 CampDaysList.tsx
│   │       ├── 🔷 CampDaysPage.tsx ⭐ [Główna strona listy]
│   │       ├── 🔷 CampDaysSkeleton.tsx
│   │       ├── 🔷 DeleteCampDayDialog.tsx
│   │       └── 📝 types.ts
│   │
│   ├── 📦 groups/ [Grupy i zarządzanie członkami]
│   │   ├── 🔷 ActivityFeedEmpty.tsx
│   │   ├── 🔷 ActivityFeedFilters.tsx
│   │   ├── 🔷 ActivityFeedItem.tsx
│   │   ├── 🔷 ActivityFeedList.tsx
│   │   ├── 🔷 ActivityFeedView.tsx [Aktywny feed grupy]
│   │   ├── 🔷 ArchivedBanner.tsx
│   │   ├── 🔷 ConfirmDialog.tsx
│   │   ├── 🔷 CreateGroupDialog.tsx
│   │   ├── 🔷 DangerZoneCard.tsx
│   │   ├── 🔷 DashboardInviteCard.tsx
│   │   ├── 🔷 DashboardShortcuts.tsx
│   │   ├── 🔷 EmptyState.tsx
│   │   ├── 🔷 ErrorState.tsx
│   │   ├── 🔷 GroupCard.tsx [Karta grupy w liście]
│   │   ├── 🔷 GroupDashboardTiles.tsx [Dashboard grupy - kafelki]
│   │   ├── 🔷 GroupDashboardTilesClient.tsx ⭐ [Dashboard z realtime]
│   │   │   └── Zależności: useDashboardRealtime ⚡, mapDashboardToTilesVM
│   │   ├── 🔷 GroupDetailsForm.tsx
│   │   ├── 🔷 GroupMembersTable.tsx [Tabela członków]
│   │   ├── 🔷 GroupMembersView.tsx [Widok zarządzania członkami]
│   │   ├── 🔷 GroupSettingsView.tsx [Ustawienia grupy]
│   │   ├── 🔷 GroupsGrid.tsx [Siatka kart grup]
│   │   ├── 🔷 GroupsHeader.tsx
│   │   ├── 🔷 GroupsView.tsx ⭐ [Główny widok listy grup]
│   │   │   └── Zależności: useGroups, useDeleteGroup, useRestoreGroup,
│   │   │       mapGroupToCardVM, GroupsHeader, GroupsGrid, EmptyState,
│   │   │       CreateGroupDialog, JoinGroupDialog, ConfirmDialog
│   │   ├── 🔷 InviteCard.tsx
│   │   ├── 🔷 JoinGroupDialog.tsx
│   │   ├── 🔷 LiveIndicator.tsx ⚡ [Wskaźnik aktywności realtime]
│   │   ├── 🔷 LoadingSkeleton.tsx
│   │   ├── 🔷 MemberActions.tsx
│   │   ├── 🔷 MembersToolbar.tsx
│   │   ├── 🔷 QuickTaskForm.tsx
│   │   ├── 🔷 RecentActivityFeed.tsx
│   │   ├── 🔷 RoleBadge.tsx
│   │   ├── 🔷 RoleSelect.tsx
│   │   │
│   │   └── 📦 tasks/ [Zadania grupowe]
│   │       ├── 🔷 CompletedTasksList.tsx
│   │       ├── 🔷 GroupTasksEmptyState.tsx
│   │       ├── 🔷 GroupTasksList.tsx
│   │       ├── 🔷 PendingTasksList.tsx
│   │       ├── 🔷 TaskCard.tsx
│   │       └── 🔷 TasksView.tsx ⭐ [Główny widok zadań z realtime]
│   │
│   ├── 📦 tasks/ [Zadania powiązane z aktywnościami]
│   │   ├── 🔷 ActivitySelect.tsx
│   │   ├── 🔷 StatusSelect.tsx
│   │   ├── 🔷 TaskDetailsView.tsx
│   │   ├── 🔷 TaskForm.tsx
│   │   ├── 🔷 TaskHeader.tsx
│   │   └── 🔷 TaskMeta.tsx
│   │
│   ├── 📦 navigation/ [Nawigacja i breadcrumbs]
│   │   ├── 🔶 AuthHeader.astro [Nagłówek z autentykacją]
│   │   ├── 🔷 Breadcrumb.tsx
│   │   └── 🔷 Topbar.tsx
│   │
│   ├── 📦 profile/ [Profil użytkownika]
│   │   └── 🔷 ProfileView.tsx
│   │
│   ├── 📦 ui/ [Shadcn/ui - komponenty bazowe]
│   │   ├── 🎨 badge.tsx
│   │   ├── 🎨 button.tsx [+ button.test.tsx]
│   │   ├── 🎨 card.tsx
│   │   ├── 🎨 command.tsx
│   │   ├── 🎨 dialog.tsx
│   │   ├── 🎨 input.tsx
│   │   ├── 🎨 label.tsx
│   │   ├── 🎨 popover.tsx
│   │   ├── 🎨 sonner.tsx [Toasty]
│   │   └── 🎨 textarea.tsx
│   │
│   ├── 🔷 JoinCard.tsx [Karta dołączania do grupy]
│   └── 🔶 Welcome.astro [Komponent powitalny]
│
├── lib/ [Logika biznesowa, hooki, serwisy]
│   ├── 📦 activities/ [Logika zarządzania aktywnościami]
│   │   ├── 🗄️ api.client.ts
│   │   ├── 🔧 useActivityDetails.ts
│   │   ├── 🔧 useAIEvaluationRequest.ts
│   │   ├── 🔧 useCooldown.ts [Cooldown dla AI]
│   │   ├── 🔧 useInfiniteActivities.ts [Nieskończone przewijanie]
│   │   └── 🔧 useRealtimeActivities.ts ⚡
│   │
│   ├── 📦 auth/ [Autentykacja]
│   │   ├── 🗄️ client.ts
│   │   ├── 🔧 useForgotPassword.ts
│   │   ├── 🔧 useLogin.ts
│   │   ├── 🔧 useRegister.ts
│   │   └── 🔧 useResetPassword.ts
│   │
│   ├── 📦 camp-days/ [Logika dni obozowych]
│   │   ├── 🗄️ api.client.ts
│   │   ├── 🗄️ getCampDay.ts
│   │   ├── 📝 types.ts [SlotVM, TimeHHMM, ConflictVM]
│   │   ├── 🔧 useActivitySummaries.ts
│   │   ├── 🔧 useAutosaveSchedule.ts [Autosave dla slotów]
│   │   ├── 🔧 useCampDayData.ts [Główny hook dla danych dnia]
│   │   ├── 🔧 useCampDaysList.ts
│   │   ├── 🔧 useGroupPermissions.ts
│   │   ├── 🔧 useRealtimeCampDay.ts ⚡
│   │   └── 🔧 useSchedulesDndController.ts [Drag & Drop]
│   │
│   ├── 📦 dashboard/ [Dashboard grupy]
│   │   ├── 📝 activity-feed.types.ts
│   │   ├── 📝 types.ts [DashboardTilesVM]
│   │   └── 🔧 useDashboardRealtime.ts ⚡
│   │
│   ├── 📦 editor/ [Edytor aktywności]
│   │   ├── 🔧 useActivity.ts [Główny hook dla edytora]
│   │   ├── 🔧 useAIEvaluations.ts
│   │   ├── 🔧 useAutosaveDrafts.ts [Autosave drafts]
│   │   ├── 🔧 useConflictDetection.ts [Wykrywanie konfliktów]
│   │   ├── 🔧 useDirtyPrompt.ts
│   │   └── 🔧 useEditors.ts ⚡ [Real-time editors]
│   │
│   ├── 📦 groups/ [Logika grup]
│   │   ├── 🗄️ api.client.ts
│   │   ├── 🗄️ getGroup.ts
│   │   ├── 🗄️ getPermissions.ts
│   │   ├── 🔄 mappers.ts
│   │   ├── 📝 types.ts [GroupCardVM, ColumnVisibilityState]
│   │   ├── 🔧 useColumnPreferences.ts
│   │   ├── 🔧 useCreateGroup.ts
│   │   ├── 🔧 useDeleteGroup.ts
│   │   ├── 🔧 useGroupMembers.ts
│   │   ├── 🔧 useGroupMembersForPicker.ts
│   │   ├── 🔧 useGroupPermissions.ts
│   │   ├── 🔧 useGroups.ts [Główny hook dla list grup]
│   │   ├── 🔧 useJoinGroup.ts
│   │   ├── 🔧 useRestoreGroup.ts
│   │   │
│   │   ├── 📦 members/ [Zarządzanie członkami]
│   │   │   └── 🗄️ api.client.ts
│   │   │
│   │   └── 📦 tasks/ [Zadania grupowe]
│   │       ├── 🗄️ api.client.ts
│   │       ├── 🔧 useGroupTasks.ts
│   │       └── 🔧 useRealtimeTasks.ts ⚡
│   │
│   ├── 📦 hooks/ [Współdzielone hooki]
│   │   ├── 🔧 useDebouncedValue.ts
│   │   ├── 🔧 useIntersection.ts [Infinite scroll]
│   │   └── 🔧 useLlmChat.ts [LLM Integration]
│   │
│   ├── 📦 http/ [HTTP utilities]
│   │   ├── 🔧 response.ts
│   │   └── 🔧 status.ts
│   │
│   ├── 📦 mappers/ [Mapowanie DTO -> VM]
│   │   ├── 🔄 activity-editor.mapper.ts
│   │   ├── 🔄 activity-schedule.mapper.ts
│   │   ├── 🔄 activity.mapper.ts
│   │   ├── 🔄 ai-evaluation.mapper.ts
│   │   ├── 🔄 camp-day.mapper.ts
│   │   ├── 🔄 dashboard-tiles.mapper.ts
│   │   ├── 🔄 dashboard.mapper.ts
│   │   ├── 🔄 group-membership.mapper.ts
│   │   ├── 🔄 group-task.mapper.ts
│   │   ├── 🔄 group.mapper.ts
│   │   └── 🔄 permissions.mapper.ts
│   │
│   ├── 📦 services/ [Backend services - używane w API]
│   │   ├── 🎯 activities.service.ts
│   │   ├── 🎯 activity-editors.service.ts
│   │   ├── 🎯 activity-schedules.service.ts
│   │   ├── 🎯 ai-evaluations.service.ts
│   │   ├── 🎯 camp-days.service.ts
│   │   ├── 🎯 dashboard.service.ts
│   │   ├── 🎯 group-memberships.service.ts
│   │   ├── 🎯 group-tasks.service.ts
│   │   ├── 🎯 groups.service.ts
│   │   ├── 🎯 openrouter.ts [OpenRouter AI API]
│   │   └── 🎯 permissions.service.ts
│   │
│   ├── 📦 validation/ [Walidacja danych - Zod schemas]
│   │   ├── 📝 activity.ts
│   │   ├── 📝 activityEditor.ts
│   │   ├── 📝 activitySchedule.ts
│   │   ├── 📝 aiEvaluation.ts
│   │   ├── 📝 auth.ts
│   │   ├── 📝 campDay.ts
│   │   ├── 📝 dashboard.ts
│   │   ├── 📝 group.ts
│   │   ├── 📝 groupMembership.ts
│   │   ├── 📝 groupTask.ts
│   │   ├── 📝 join.ts
│   │   └── 📝 llm.ts
│   │
│   ├── 🔧 useGroupSettings.ts
│   ├── 🔧 useJoinGroup.ts
│   ├── 🔧 utils.ts [+ utils.test.ts]
│   └── 🔧 errors.ts
│
├── pages/ [Astro pages - routing]
│   ├── 📦 activities/
│   │   ├── 🔶 [activityId].astro [Szczegóły/edytor aktywności]
│   │   └── 🔶 new.astro [Tworzenie nowej aktywności]
│   │
│   ├── 📦 api/ [API endpoints]
│   │   ├── 📝 activities/
│   │   │   ├── [activityId].ts [GET, PATCH, DELETE]
│   │   │   ├── [activityId]/
│   │   │   │   ├── ai-evaluations.ts [GET, POST]
│   │   │   │   └── editors.ts [GET]
│   │   │   └── index.ts [GET lista, POST tworzenie]
│   │   │
│   │   ├── 📝 activity-editors/
│   │   │   └── [editorId].ts [DELETE]
│   │   │
│   │   ├── 📝 activity-schedules/
│   │   │   └── [scheduleId].ts [GET, PATCH, DELETE]
│   │   │
│   │   ├── 📝 ai-evaluations/
│   │   │   └── [evaluationId].ts [GET]
│   │   │
│   │   ├── 📝 camp-days/
│   │   │   ├── [campDayId].ts [GET, PATCH, DELETE]
│   │   │   └── [campDayId]/schedules.ts [POST]
│   │   │
│   │   ├── 📝 groups/
│   │   │   ├── [groupId].ts [GET, PATCH, DELETE]
│   │   │   ├── [groupId]/
│   │   │   │   ├── activities.ts [GET lista aktywności grupy]
│   │   │   │   ├── camp-days.ts [GET lista, POST tworzenie]
│   │   │   │   ├── dashboard.ts [GET dashboard data]
│   │   │   │   ├── members.ts [GET, POST]
│   │   │   │   ├── members/[membershipId].ts [PATCH, DELETE]
│   │   │   │   ├── permissions.ts [GET uprawnienia]
│   │   │   │   └── tasks.ts [GET, POST]
│   │   │   └── index.ts [GET lista grup, POST tworzenie]
│   │   │
│   │   ├── 📝 group-tasks/
│   │   │   └── [taskId].ts [PATCH, DELETE]
│   │   │
│   │   └── 📝 join.ts [POST dołączanie do grupy]
│   │
│   ├── 📦 auth/ [Strony autentykacji]
│   │   ├── 🔶 forgot-password.astro
│   │   ├── 🔶 login.astro
│   │   ├── 🔶 register.astro
│   │   ├── 🔶 reset-password.astro
│   │   └── 🔶 verify-email.astro
│   │
│   ├── 📦 groups/ [Strony grup]
│   │   ├── 🔶 [groupId].astro [Dashboard grupy]
│   │   ├── 🔶 [groupId]/
│   │   │   ├── activities.astro [Lista aktywności grupy]
│   │   │   ├── camp-days.astro [Lista dni obozowych]
│   │   │   ├── camp-days/[campDayId].astro [Szczegóły dnia]
│   │   │   ├── camp-days/new.astro [Nowy dzień]
│   │   │   ├── members.astro [Zarządzanie członkami]
│   │   │   ├── settings.astro [Ustawienia grupy]
│   │   │   └── tasks.astro [Zadania grupy]
│   │   └── new.astro [Tworzenie nowej grupy]
│   │
│   ├── 📦 tasks/
│   │   └── 🔶 [taskId].astro [Szczegóły zadania]
│   │
│   ├── 🔶 groups.astro [Lista wszystkich grup]
│   ├── 🔶 index.astro [Strona główna]
│   └── 🔶 join.astro [Dołączanie po kodzie zaproszenia]
│
├── layouts/
│   └── 🔶 Layout.astro [Główny layout aplikacji]
│
├── db/ [Supabase integration]
│   ├── 📝 database.types.ts [Typy generowane z Supabase]
│   └── 🗄️ supabase.client.ts [Klient Supabase]
│
├── middleware/
│   └── 🔧 index.ts [Middleware Astro - auth, redirects]
│
├── workers/ [Background workers]
│   ├── 🔧 ai-evaluation-worker.ts [Worker dla ocen AI]
│   └── 📝 README.md
│
└── 📝 types.ts [Współdzielone typy - DTOs, Entities]
```

---

## Główne Przepływy Danych

### 1. **Zarządzanie Aktywnościami**

```
User → ActivitiesTable → useInfiniteActivities → API /api/activities
                       ↓
                  ActivitiesRow → RowActionsMenu
                       ↓
                  ActivityDetailsView → useActivityDetails
                       ↓
                  ActivityEditorApp → useActivity + useEditors (⚡ realtime)
                       ↓
                  ActivityEditorForm → useAutosaveDrafts
                       ↓
                  API /api/activities/[id] → activities.service
```

### 2. **Dni Obozowe (Camp Days)**

```
User → CampDaysPage → useCampDaysList → API /api/groups/[id]/camp-days
             ↓
        CampDayCard
             ↓
        CampDayView → useCampDayData + useRealtimeCampDay (⚡)
             ↓
        SlotsList → useSchedulesDndController (Drag & Drop)
             ↓
        SlotRow → TimeRangeEditor → useAutosaveSchedule
             ↓
        API /api/activity-schedules/[id] → activity-schedules.service
```

### 3. **Dashboard Grupy z Real-time**

```
User → GroupDashboard (Astro page)
             ↓
        GroupDashboardTilesClient → useDashboardRealtime (⚡ Supabase)
             ↓                              ↓
        GroupDashboardTiles         [Automatyczne odświeżanie]
             ↓
        API /api/groups/[id]/dashboard → dashboard.service
             ↓
        mapDashboardToTilesVM → DashboardTilesVM
```

### 4. **Edytor z Wykrywaniem Konfliktów**

```
User → ActivityEditorApp
             ↓
        useActivity → API /api/activities/[id]
             ↓
        useEditors (⚡) → Supabase Realtime [activity_editors]
             ↓
        EditorsManager → EditorsAvatarGroup
             ↓
        useConflictDetection → ConflictDiffModal
             ↓
        useAutosaveDrafts → API PATCH /api/activities/[id]
```

### 5. **Tworzenie Aktywności (Multi-step)**

```
User → NewActivityStepper
             ↓
        StepIndicator → [basics, content, logistics, summary]
             ↓
        BasicsStep → ContentStep → LogisticsStep → SummaryStep
             ↓                           ↓
        useStepValidation          useAutosave
             ↓                           ↓
        useCreateActivity → API POST /api/activities
             ↓
        useAssignSelfOnCreate → API POST /api/activities/[id]/editors
             ↓
        AddToScheduleDialog (opcjonalnie)
```

---

## Funkcje Real-time (⚡ Supabase)

### 1. **Edytorzy Aktywności**
- **Hook**: `useEditors` (lib/editor/useEditors.ts)
- **Tabela**: `activity_editors`
- **Komponenty**: EditorsManager, EditorsAvatarGroup
- **Cel**: Pokazywanie aktywnych edytorów w czasie rzeczywistym

### 2. **Dashboard Grupy**
- **Hook**: `useDashboardRealtime` (lib/dashboard/useDashboardRealtime.ts)
- **Tabele**: `group_tasks`, `activities`, `camp_days`
- **Komponenty**: GroupDashboardTilesClient
- **Cel**: Automatyczne odświeżanie statystyk dashboardu

### 3. **Dni Obozowe**
- **Hook**: `useRealtimeCampDay` (lib/camp-days/useRealtimeCampDay.ts)
- **Tabela**: `activity_schedules`
- **Komponenty**: CampDayView
- **Cel**: Synchronizacja zmian w harmonogramie między użytkownikami

### 4. **Zadania Grupowe**
- **Hook**: `useRealtimeTasks` (lib/groups/tasks/useRealtimeTasks.ts)
- **Tabela**: `group_tasks`
- **Komponenty**: TasksView
- **Cel**: Aktualizacja listy zadań w czasie rzeczywistym

### 5. **Aktywności Grupy**
- **Hook**: `useRealtimeActivities` (lib/activities/useRealtimeActivities.ts)
- **Tabela**: `activities`
- **Komponenty**: ActivityFeedView
- **Cel**: Feed aktywności w czasie rzeczywistym

---

## Wzorce Architektury

### 1. **Separacja Warstw**
```
Components (UI) → Hooks (Logic) → API Clients → Services (Backend) → Supabase
                       ↓
                  Mappers (DTO → VM)
                       ↓
                  Validation (Zod)
```

### 2. **View Models (VM)**
- DTO (Data Transfer Object) - surowe dane z API
- VM (View Model) - dane przygotowane dla UI
- Mapowanie: `lib/mappers/*`

### 3. **Autosave Pattern**
- `useAutosaveDrafts` - drafty aktywności
- `useAutosaveSchedule` - sloty harmonogramu
- `useAutosave` - generyczny hook (w NewActivityStepper)

### 4. **Conflict Detection**
- `useConflictDetection` - wykrywa zmiany podczas edycji
- `ConflictDiffModal` - pokazuje różnice
- Wykorzystuje `updated_at` timestamps

### 5. **Infinite Scroll**
- `useInfiniteActivities` - nieskończone przewijanie
- `useIntersection` - detekcja końca listy
- Pattern: offset-based pagination

### 6. **Optimistic Updates**
- Natychmiastowa aktualizacja UI
- Rollback w przypadku błędu
- Używane w: zadaniach, członkach grup

---

## Zależności Między Komponentami

### Poziom 1: Podstawowe UI (Shadcn/ui)
```
components/ui/* [badge, button, card, dialog, input, label, etc.]
```
**Używane przez**: wszystkie komponenty domenowe

### Poziom 2: Współdzielone Komponenty
```
EmptyState, LoadingSkeleton, ErrorState, ConfirmDialog
```
**Używane przez**: wszystkie moduły domenowe

### Poziom 3: Komponenty Domenowe - Atomic
```
ActivityRow, GroupCard, CampDayCard, TaskCard, SlotRow
RoleBadge, AIChips, EditorsAvatarGroup, ActivityBadge
```
**Używane przez**: komponenty kontenerowe

### Poziom 4: Komponenty Kontenerowe
```
ActivitiesTable, GroupsGrid, CampDaysList, SlotsList
GroupMembersTable, TasksList
```
**Używane przez**: widoki główne

### Poziom 5: Widoki Główne (⭐)
```
GroupsView, CampDayView, ActivityEditorApp, NewActivityStepper
GroupDashboardTilesClient, ActivityDetailsView, TasksView
```
**Montowane w**: Astro pages

### Poziom 6: Astro Pages
```
pages/*.astro, pages/groups/*.astro, pages/activities/*.astro
```
**Renderują**: widoki główne z danymi SSR

---

## Stack Technologiczny

### Frontend
- **Framework**: Astro 5 (SSR) + React 19 (komponenty interaktywne)
- **Styling**: Tailwind CSS 4
- **UI Library**: Shadcn/ui (komponenty bazowe)
- **State Management**: React hooks (lokalny stan)
- **Forms**: Natywne + Zod validation
- **Toasts**: Sonner

### Backend
- **Runtime**: Node.js (Astro API routes)
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Realtime (WebSocket)
- **Auth**: Supabase Auth
- **AI**: OpenRouter API (LLM evaluations)

### Narzędzia
- **TypeScript** 5
- **Testing**: Vitest (unit) + Playwright (e2e)
- **Linting**: ESLint
- **Package Manager**: npm

---

## Konwencje Nazewnictwa

### Komponenty
- **Widoki główne**: `*View.tsx` (np. GroupsView, CampDayView)
- **Kontenery**: `*List.tsx`, `*Table.tsx`, `*Grid.tsx`
- **Karty**: `*Card.tsx`
- **Formularze**: `*Form.tsx`
- **Dialogi**: `*Dialog.tsx`, `*Modal.tsx`
- **Aplikacje**: `*App.tsx` (entry point dla złożonej funkcjonalności)

### Hooks
- **Podstawowe**: `use*` (np. useGroups, useActivity)
- **Real-time**: `useRealtime*` (np. useRealtimeCampDay)
- **API**: `use*` + API client (np. useCreateGroup)
- **Autosave**: `useAutosave*` (np. useAutosaveDrafts)

### Services
- **Pattern**: `*.service.ts` (warstwa biznesowa backend)
- **API Clients**: `api.client.ts` (komunikacja z API z frontendu)

### Mappers
- **Pattern**: `*-*.mapper.ts` (np. activity-editor.mapper.ts)
- **Funkcje**: `map*To*` (np. mapActivityToEditorVM)

### Validation
- **Pattern**: `*.ts` w katalogu validation
- **Export**: Zod schemas (np. activitySchema, campDaySchema)

---

## Notatki Dodatkowe

1. **Astro vs React**: Astro dla stron statycznych/SSR, React dla interaktywności
2. **Real-time**: Supabase Realtime używany dla kolaboracji w czasie rzeczywistym
3. **AI Integration**: OpenRouter API dla ewaluacji aktywności (lore, scouting values)
4. **Permissions**: Role-based (admin, editor, viewer) sprawdzane na każdym poziomie
5. **Autosave**: Debounced autosave dla lepszego UX i mniejszego obciążenia API
6. **Conflict Resolution**: Wykrywanie konfliktów przy jednoczesnej edycji
7. **Infinite Scroll**: Dla list aktywności i innych długich list
8. **Accessibility**: ARIA attributes, semantic HTML, keyboard navigation
9. **Error Handling**: Walidacja Zod + error boundaries + toast notifications
10. **Testing**: Unit testy (Vitest) dla utils/hooks, E2E (Playwright) dla flows

---

**Wygenerowano**: 2025-11-04  
**Projekt**: 10x-project (System zarządzania aktywnościami obozowymi)  
**Wersja**: 1.0

