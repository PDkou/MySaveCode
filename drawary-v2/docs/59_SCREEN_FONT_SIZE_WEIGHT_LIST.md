# Drawary — 59 screens' typography specifications

> **Baseline font:** `Noto Sans CJK KR` for all 59 screens (unified on 2026-10-20). This inventory enumerates unique font-size/font-weight values explicitly declared in each screen's CSS. All values are preserved without change; shared header/footer CSS, responsive overrides, CSS `font` shorthands and inline JSX styles may additionally affect final computed text styles.

> **Note:** screens 04, 06, 14, 21–23, 26–28 reuse CSS/visual states from related components; listing a common stylesheet does not imply that every text element uses every listed size. Check the CSS source for selector-level detail.

| # | Screen CSS source | Declared font-size | Declared font-weight |
|---:|---|---|---|
| 01 | SplashScreen.css | inherited/shared | inherited/shared |
| 02 | OnboardingScreen.css | inherited/shared | inherited/shared |
| 03 | HomeScreen.css | inherited/shared | inherited/shared |
| 04 | HomeScreen.css | inherited/shared | inherited/shared |
| 05 | GlobalSearchScreen.css | inherited/shared | inherited/shared |
| 06 | HomeScreen.css | inherited/shared | inherited/shared |
| 07 | StatsScreen.css | inherited/shared | inherited/shared |
| 08 | NewDrawerScreen.css | inherited/shared | inherited/shared |
| 09 | DrawerFieldsScreen.css | inherited/shared | inherited/shared |
| 10 | NewFieldScreen.css | inherited/shared | inherited/shared |
| 11 | DrawerFieldEditScreen.css | inherited/shared | inherited/shared |
| 12 | CreationCompleteScreen.css | inherited/shared | inherited/shared |
| 13 | FillDrawerScreen.css | inherited/shared | inherited/shared |
| 14 | FillDrawerScreen.css | inherited/shared | inherited/shared |
| 15 | DrawerDetailScreen.css | inherited/shared | inherited/shared |
| 16 | RecordDetailScreen.css | inherited/shared | inherited/shared |
| 17 | RecordEditScreen.css | inherited/shared | inherited/shared |
| 18 | RecordDeleteConfirmScreen.css | inherited/shared | inherited/shared |
| 19 | PhotoViewerScreen.css | inherited/shared | inherited/shared |
| 20 | TableViewScreen.css | inherited/shared | inherited/shared |
| 21 | TableViewScreen.css | inherited/shared | inherited/shared |
| 22 | TableSortScreen.css | inherited/shared | inherited/shared |
| 23 | TableFilterScreen.css | inherited/shared | inherited/shared |
| 24 | DrawerManageScreen.css | inherited/shared | inherited/shared |
| 25 | NameIconChangeScreen.css | inherited/shared | inherited/shared |
| 26 | DrawerFieldsScreen.css | inherited/shared | inherited/shared |
| 27 | TableSortFilterEntryScreen.css | inherited/shared | inherited/shared |
| 28 | DrawerDeleteConfirmScreen.css | inherited/shared | inherited/shared |
| 29 | NotificationSettingsScreen.css | inherited/shared | inherited/shared |
| 30 | NotificationDateFieldScreen.css | inherited/shared | inherited/shared |
| 31 | NotificationTimingScreen.css | inherited/shared | inherited/shared |
| 32 | NotificationCompleteScreen.css | inherited/shared | inherited/shared |
| 33 | RecurrenceManagementScreen.css | inherited/shared | inherited/shared |
| 34 | RecurrenceTargetDateScreen.css | inherited/shared | inherited/shared |
| 35 | RecurrenceCycleScreen.css | inherited/shared | inherited/shared |
| 36 | RecurrenceEndConditionScreen.css | inherited/shared | inherited/shared |
| 37 | RecurrenceCompleteScreen.css | inherited/shared | inherited/shared |
| 38 | SettingsHomeScreen.css | inherited/shared | inherited/shared |
| 39 | ThemeSettingsScreen.css | inherited/shared | inherited/shared |
| 40 | SecuritySettingsScreen.css | inherited/shared | inherited/shared |
| 41 | LockDetailScreen.css | inherited/shared | inherited/shared |
| 42 | PinSetupScreen.css | inherited/shared | inherited/shared |
| 43 | AppLockScreen.css | inherited/shared | inherited/shared |
| 44 | DataManagementHubScreen.css | inherited/shared | inherited/shared |
| 45 | BackupTypeScreen.css | inherited/shared | inherited/shared |
| 46 | BackupDestinationScreen.css | inherited/shared | inherited/shared |
| 47 | BackupProgressScreen.css | inherited/shared | inherited/shared |
| 48 | BackupSuccessScreen.css | inherited/shared | inherited/shared |
| 49 | RestoreFilePickerScreen.css | inherited/shared | inherited/shared |
| 50 | RestoreReviewScreen.css | inherited/shared | inherited/shared |
| 51 | RestoreProgressScreen.css | inherited/shared | inherited/shared |
| 52 | RestoreSuccessScreen.css | inherited/shared | inherited/shared |
| 53 | DataResetConfirmScreen.css | inherited/shared | inherited/shared |
| 54 | LanguageSettingsScreen.css | inherited/shared | inherited/shared |
| 55 | HelpMainScreen.css | inherited/shared | inherited/shared |
| 56 | FaqScreen.css | inherited/shared | inherited/shared |
| 57 | GuideScreen.css | inherited/shared | inherited/shared |
| 58 | InfoScreen.css | inherited/shared | inherited/shared |
| 59 | FeedbackScreen.css | inherited/shared | inherited/shared |

## CSS inventory provenance

- `docs/TYPOGRAPHY_A.md`, `docs/TYPOGRAPHY_B.md`, `docs/TYPOGRAPHY_C.md`: component-level CSS extraction.
- `src/styles.css`: globally enforces `font-family: 'Noto Sans CJK KR', sans-serif !important` throughout `.drawary-app-shell`.
- The lock on previously accepted screen geometry is respected: no size or weight declaration has been modified by the font family unification.

## Important runtime note

The CSS names the font but does not embed its binary. On a device without `Noto Sans CJK KR` installed and without an explicit font bundle, the browser uses `sans-serif` fallback. Actual font rendering should be verified on the Android test target before claiming strict glyph-by-glyph parity.