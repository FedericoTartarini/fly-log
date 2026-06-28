## Feature Roadmap (Suggestions)

### Missing / Core Gaps

- [ ] No user data export/backup workflow.
- [ ] improve the email templates authentication

### User Experience Improvements

- [ ] Conduct user testing to gather feedback on usability.
- [ ] Improve Multi-language support (i18n) currently only English and Italian.
- [ ] check what happens if the user uploads a bad csv with wrong dates, time, airport or airlines codes.
- [ ] Accessibility pass: add skip link/landmarks, ARIA live error messaging, reduced-motion support.
- [ ] Accessibility pass: add keyboard alternatives + text summaries for map visualizations.
- [ ] Accessibility pass: verify and fix color contrast across light/dark themes.

### Maintenance and DevOps

- [ ] Refactor state management for more complex filtering logic.

### High-Value, Low-Maintenance (No External API)

- [ ] No duplicate detection workflow for CSV/manual imports.
- [ ] Add CSV/JSON export for full or filtered flight data.
- [ ] Add duplicate detection + skip/merge flow on import.
- [ ] Add table search (airline/airport/flight number) + user-selectable sorting.
- [ ] Add undo-delete toast with short restore window.

### Nice Features (Medium Complexity, No External API)

- [ ] Trip grouping (outbound/return/date-range) + trip-level stats.
- [ ] Custom tags and notes per flight.
- [ ] Goals/milestones (e.g., flights, countries, distance).
- [ ] Data quality diagnostics (unknown airport/airline, suspicious durations).
- [ ] Public read-only share links for stats.

### External API-Dependent Features (Highest Ongoing Maintenance)

1. Live flight status/history enrichment.
2. Aircraft-level emissions estimation from external aviation datasets.
3. Ticket price analytics and currency normalization.
4. Weather overlays for flight dates/routes.
5. Frequent-flyer miles/status tracking across airlines.

## AI Upload Ideas and New Pages

### AI Features to Facilitate Uploading

#### 1. Smart CSV Mapper

- Let users upload CSV files with arbitrary headers/order.
- Use heuristics or AI to suggest mapping to your schema fields.
- Save accepted mapping templates for reuse.
- Difficulty: Medium
- External API: Optional

#### 2. Auto-Fix with Confidence Scores

- During import, flag uncertain/invalid values.
- Suggest likely corrections (airport/airline/date normalization).
- Show confidence and let user approve each fix.
- Difficulty: Medium
- External API: Optional

### New Visualizations and Pages

#### 1. Timeline Page

- Display flights by month/year, using a chart similar to the GitHub contributions graph, a heatmap chart
- https://mantine.dev/charts/heatmap/
- Highlight travel streaks, busy periods, and inactivity gaps.
- Difficulty: Low-Medium

#### 2. Route Network Page (stashed)

- Airports as nodes and routes as weighted edges.
- Show hubs, most frequent routes, and network evolution by year.
- Difficulty: Medium

#### 3. Airport Profile Page

- Drill down into a specific airport.
- Show arrivals/departures, connected airports, first/last visit.
- Difficulty: Medium

#### 4. Data Quality Page

- Show missing fields, suspicious values, and possible duplicates.
- Provide one-click suggested fixes where possible.
- Difficulty: Medium

#### 5. More visualizations

- Use the vector map from Tabler to show countries visited: https://docs.tabler.io/ui/components/vector-maps
- Difficulty: Low-Medium
