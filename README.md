# Flight Data Visualizer

This project analyzes personal flight history using Python and visualizes the data on an interactive map using a React and Vite-powered frontend.

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation & Setup](#installation--setup)
- [Testing](#testing)
  - [Unit Testing with Vitest](#unit-testing-with-vitest)
  - [End-to-End Testing with Cypress](#end-to-end-testing-with-cypress)
  - [Test Structure](#test-structure)
  - [Writing Tests](#writing-tests)
- [Current Features](#current-features)

## Project Overview

The application has two main parts:

1.  **Data Analysis (Python):** A Python script is used to process raw flight data. It cleans the data, distances, and times, and enriches it with airport coordinates and airline information. The final output is a structured JSON file.
2.  **Frontend (React + Vite):** A single-page application built with React and Vite consumes the JSON data. It displays the flights on an interactive map and in a sortable, filterable table. The frontend is styled using the Mantine component library.

## Tech Stack

- **Frontend:** React, Vite, Mantine UI
- **Data Processing:** Python, Pandas
- **Deployment:** Configured for static site deployment on Netlify

## Getting Started

Follow these instructions to get a local copy up and running.

### Prerequisites

- Node.js (v18 or newer)
- npm
- Python 3.x

### Installation & Setup

1.  **Clone the repository:**

    ```bash
    git clone <your-repository-url>
    cd <repository-directory>
    ```

2.  **Prepare the data:**
    - Navigate to the `python` directory.
    - Run the data processing script to generate the `flights_with_coordinates.json` file. This file is required by the frontend. You need to install the dependencies using `uv`

3.  **Install frontend dependencies:**

    ```bash
    npm install
    ```

4.  **Run the development server:**
    - This will start the app on `http://localhost:5173`. The page will automatically reload if you make changes to the source code.

    ```bash
    npm run dev
    ```

5.  **Build for production:**
    - This command bundles the app into the `dist` directory for deployment.
    ```bash
    npm run build
    ```

## Firebase Deployment

1.  **Install Firebase CLI:**
    ```bash
    npm install -g firebase-tools
    ```
2.  **Login to Firebase:**
    ```bash
    firebase login:list  # to see logged in accounts
    firebase login  # if not already logged in
    firebase login:add  # to add another account
    firebase login:use  # to select the project to use (run from project directory)
    ```
3.  **Initialize Firebase in your project:**
    ```bash
    firebase init
    ```

    - Select "Hosting" and follow the prompts to set up your project.
4.  **Deploy to Firebase:**
    ```bash
    firebase deploy
    ```

## Firebase Firestore Security Rules Setup

```bash
firebase deploy --only firestore:rules
```

### Firestore Security Rules

This repo includes a sample Firestore rules file at `firestore.rules` that enforces per-user access to flight documents stored under `/flights/{userId}/records/{docId}`. Rules ensure that:

- Only authenticated users can read/write their own flight records.
- Created documents must include `departure_date`, `departure_airport_iata`, `arrival_airport_iata`, and `airline_iata` and `departure_date` must be a Firestore timestamp.

To deploy those rules to your Firebase project use:

```bash
firebase deploy --only firestore:rules
```

Or, during `firebase init`, point the Firestore rules location to `firestore.rules` so rules are deployed together with hosting.

## Testing

This project uses two testing frameworks:

### Unit Testing with Vitest

Vitest is used for unit and integration testing of React components and utility functions.

**Run all unit tests:**

```bash
npm run test
```

**Run tests in watch mode (automatically re-runs when files change):**

```bash
npm run test:watch
```

**Run tests with coverage report:**

```bash
npm run test:coverage
```

**Run tests in UI mode (interactive test runner):**

```bash
npm run test:ui
```

### End-to-End Testing with Cypress

Cypress is used for end-to-end testing of the complete application workflow.

**Run Cypress tests in headless mode:**

```bash
npm run cypress:run
```

**Open Cypress Test Runner (interactive mode):**

```bash
npm run cypress:open
```

**Run Cypress tests against production build:**

```bash
npm run build
npm run preview
npm run cypress:run
```

### Test Structure

- **Unit tests:** Located in `src/` alongside components (e.g., `Component.test.jsx`)
- **Test utilities:** Shared testing utilities in `test-utils/` (see `test-utils/README.md` for details on the global i18n test setup, how translations are injected during tests, and examples to override per-test).
- **Cypress tests:** End-to-end tests in `cypress/e2e/`
- **Test constants:** Centralized test IDS in `src/constants/testIds.js`

### Writing Tests

**Example unit test:**

```javascript
import { describe, it, expect } from "vitest";
import { render } from "../test-utils/render";
import { screen } from "@testing-library/react";
import { TEST_IDS } from "../constants/testIds";
import MyComponent from "./MyComponent";

describe("MyComponent", () => {
  it("renders correctly", () => {
    render(<MyComponent />);
    expect(screen.getByText("Expected text")).toBeInTheDocument();
  });
});
```

```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "test:ui": "vitest --ui",
    "cypress:open": "cypress open",
    "cypress:run": "cypress run"
  }
}
```

## Current Features

- Interactive globe displaying all flight paths.
- Detailed flight list in a table format.
- Filter flights by date range, airline, and airport.
- Displays airline logos for each flight.
- Add new flights manually through a form, using CSV upload, or by parsing natural language input with AI assistance.

## Feature Roadmap (Suggestions)

### Missing / Core Gaps

- [ ] Offline write sync is still placeholder-only.
- [ ] No user data export/backup workflow.
- [ ] No search/sort controls in the flights table beyond default date ordering.
- [ ] No duplicate detection workflow for CSV/manual imports.

### High-Value, Low-Maintenance (No External API)

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

### Nice but Significantly Harder to Maintain

1. True offline-first queue with conflict resolution across devices.

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

#### 2. Natural-Language Flight Parser

- Accept text input like: `12 Jan 2025, QF12, SYD -> LAX`.
- Parse and extract structured flight fields into draft rows.
- Ask user for confirmation before saving.
- Difficulty: Medium
- External API: Usually yes (LLM), but partial rule-based fallback is possible.

#### 3. Screenshot/PDF Itinerary Import

- Upload booking screenshots or itinerary PDFs.
- OCR + parser extracts flight data and pre-fills entries.
- User reviews and confirms before import.
- Difficulty: High
- External API: Usually yes (OCR and/or AI extraction).

#### 4. Auto-Fix with Confidence Scores

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

#### 3. Year-over-Year Comparison Page

- Compare two selected years side-by-side.
- Metrics: flights, distance, countries, top airlines/routes.
- Difficulty: Low-Medium

#### 4. Airport Profile Page

- Drill down into a specific airport.
- Show arrivals/departures, connected airports, first/last visit.
- Difficulty: Medium

#### 5. Stories / Replay Page

- Animated playback of flights over time.
- "Year in review" style summaries and shareable outputs.
- Difficulty: Medium-High

#### 6. Data Quality Page

- Show missing fields, suspicious values, and possible duplicates.
- Provide one-click suggested fixes where possible.
- Difficulty: Medium

#### 7. More visualizations
- Use the vector map from Tabler to show countries visited: https://docs.tabler.io/ui/components/vector-maps
- Difficulty: Low-Medium
