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
- [To-Do / Future Improvements](#to-do--future-improvements)
    - [Visualization Enhancements](#visualization-enhancements)
    - [User Experience Improvements](#user-experience-improvements)
    - [Accessibility](#accessibility)
    - [Maintenance and DevOps](#maintenance-and-devops)
    - [Data & Backend](#data--backend)

## Project Overview

The application has two main parts:

1.  **Data Analysis (Python):** A Python script is used to process raw flight data. It cleans the data, distances, and times, and enriches it with airport coordinates and airline information. The final output is a structured JSON file.
2.  **Frontend (React + Vite):** A single-page application built with React and Vite consumes the JSON data. It displays the flights on an interactive map and in a sortable, filterable table. The frontend is styled using the Mantine component library.

## Tech Stack

*   **Frontend:** React, Vite, Mantine UI
*   **Data Processing:** Python, Pandas
*   **Deployment:** Configured for static site deployment Netlify

## Getting Started

Follow these instructions to get a local copy up and running.

### Prerequisites

*   Node.js (v18 or newer)
*   npm
*   Python 3.x

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd <repository-directory>
    ```

2.  **Prepare the data:**
    *   Navigate to the `python` directory.
    *   Run the data processing script to generate the `flights_with_coordinates.json` file. This file is required by the frontend. You need to install the devependencies using `uv`

3.  **Install frontend dependencies:**
    ```bash
    npm install
    ```

4.  **Run the development server:**
    *   This will start the app on `http://localhost:5173`. The page will automatically reload if you make changes to the source code.
    ```bash
    npm run dev
    ```

5.  **Build for production:**
    *   This command bundles the app into the `dist` directory for deployment.
    ```bash
    npm run build
    ```



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
- **Test utilities:** Shared testing utilities in `test-utils/`
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

*   Interactive globe displaying all flight paths.
*   Detailed flight list in a table format.
*   Filter flights by year.
*   Displays airline logos for each flight.

## To-Do / Future Improvements

### Issues
* [ ] When the user logs in all the flights are displayed, past and future. This is okay but I need to change the text in the dropdown to say "All Flights" instead of "Past Flights".
* [ ] When I navigate to the flights page no flights are displayed.

### Visualization Enhancements
* [ ] Add filtering by airline, aircraft type, or airport.
* [ ] Implement search functionality for flights.
* [x] Add a button in the home page to go to the flight stats page.
* [ ] Add footer with links to GitHub, documentation, and contact info.
* [ ] If a user is already logged in go straight to the flight stats page.

### User Experience Improvements
* [x] Improve mobile responsiveness.
* [x] Improve desktop responsiveness.
* [ ] Add a page for detailed flight stats and analytics.
* [ ] Implement a dark mode toggle.
* [ ] Conduct user testing to gather feedback on usability.
* [ ] Muli-language support (i18n).

### Accessibility
* [ ] Conduct a full accessibility audit (WCAG 2.1 compliance).
* [ ] Ensure components are keyboard navigable and screen reader friendly.

### Maintenance and DevOps
* [ ] Write unit and integration tests for components and utility functions.
* [ ] Refactor state management for more complex filtering logic.
* [ ] Set up continuous integration (CI) for automated builds, tests, and deployments.
* [ ] Document the codebase with comments and a developer guide.
* [ ] Optimize performance for large datasets (e.g., lazy loading, pagination).
* [ ] Integrate code linting and formatting tools (ESLint, Prettier).

### Data & Backend
* [ ] Implement user authentication for personalized flight history.
* [ ] Add a feature to upload new flight data.
* [ ] Connect to a backend service for dynamic data fetching.
* [ ] Support importing flight data from various formats (CSV, JSON, etc.).
