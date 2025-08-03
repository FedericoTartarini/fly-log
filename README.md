# Flight Data Visualizer

This project analyzes personal flight history using Python and visualizes the data on an interactive map using a React and Vite-powered frontend.

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

## Current Features

*   Interactive globe displaying all flight paths.
*   Detailed flight list in a table format.
*   Filter flights by year.
*   Displays airline logos for each flight.

## To-Do / Future Improvements

### Visualization Enhancements
* [ ] Add filtering by airline, aircraft type, or airport.
* [ ] Implement search functionality for flights.

### User Experience Improvements
* [ ] Improve mobile responsiveness.
* [ ] Improve desktop responsiveness.
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