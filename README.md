# Journey On — Outreach Tracker

Journey On Outreach Tracker is a privacy-first mobile application designed for outreach workers to safely and securely record encounters with individuals in the field. The application is built with a focus on anonymity, ensuring that no personally identifiable information (PII) is collected or stored.

## Features

- **Anonymous Tracking:** Encounters are tracked using anonymous IDs, protecting the privacy of individuals.
- **Mobile-First Interface:** The web-based frontend is designed for use on mobile devices, making it easy for outreach workers to record data on the go.
- **Encounter Details:** Users can record GPS coordinates, risk level, observed conditions, location notes, services requested, and referrals given for each encounter.
- **Persistent Storage:** The backend uses a PostgreSQL database to store all encounter data securely.
- **CSV Export:** All encounter data can be exported as a CSV file for reporting and analysis.

## Project Structure

The project is organized as a monorepo with the following components:

-   `frontend/`: A Vite + React application that provides the user interface for creating and managing encounters.
-   `backend/`: A Node.js and Express-based REST API that handles the business logic and database interactions.
-   `database/`: Contains the PostgreSQL database schema and guidelines for data handling.

## Getting Started

To run the application, you will need to set up the frontend, backend, and a PostgreSQL database. Please refer to the `README.md` files in each of the subdirectories for specific instructions on how to set up and run each component.
