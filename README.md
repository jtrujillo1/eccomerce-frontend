# Ecommerce Frontend Project

## Overview

This is a React-based frontend application for an ecommerce platform. It provides a user interface to browse products, manage a shopping cart, and handle payments through integration with a backend API and payment gateway.

## Technologies Used

- React 18
- Redux Toolkit for state management
- React Toastify for notifications
- Jest for testing
- Vite as the build tool
- CSS for styling components

## Project Structure

```
src/
├── components/           # Reusable UI components (e.g., CartSidebar, Modal, Header, ProductCard)
├── screens/              # Page-level components (e.g., HomeScreen, ProductList)
├── services/             # API service modules for backend interaction (e.g., PaymentService, ProductService)
├── redux/                # Redux store and slices for state management
├── utils/                # Utility modules (e.g., ApiConfig)
├── App.jsx               # Main app component
├── main.jsx              # React app entry point
```

## Getting Started

### Prerequisites

- Node.js (version 14 or higher recommended)
- npm or yarn package manager

### Installation

1. Clone the repository
2. Run `npm install` or `yarn` to install dependencies

### Running the Application

Run the following command to start the development server:

```bash
npm run dev
```

Open your browser and navigate to `https://staging.d2srhe0qsndhh4.amplifyapp.com/` to view the app.

## Key Components and Features

- **Home Screen**: Displays the header and product list.
- **Product List**: Fetches products from the backend and displays them using ProductCard components.
- **Cart Sidebar**: Manages the shopping cart UI and interactions.
- **Payment Service**: Handles payment processing including tokenization, transaction creation, and status updates.
- **Redux Store**: Manages global state for the cart and other app data.
- **Notifications**: Uses React Toastify to show user notifications.

## API Integration

The app interacts with a backend API defined in `src/utils/ApiConfig.js`. Key services include:

- Product fetching and cart total calculation (`ProductService.js`)
- Payment processing and transaction management (`PaymentService.js`)
- Order processing and transaction management (`OrderService.js`)

## Additional Information

- Styling is done using CSS modules scoped to components.
- The app uses React Strict Mode and Redux Provider for robust state management.
- Toast notifications provide feedback for user actions.

---

This README provides a comprehensive overview of the project to help developers understand, run, and contribute to the ecommerce frontend application.

## Continuous Integration

This project can be integrated with GitHub Actions for continuous integration (CI) to automate testing and linting on each push or pull request.

A sample GitHub Actions workflow configuration (`.github/workflows/ci.yml`) could include the following steps:

- Checkout the repository
- Setup Node.js environment
- Install dependencies
- Run tests using `npm test`
- Run linting using `npm run lint`

To enable CI, create the `.github/workflows/ci.yml` file with the above steps. This helps ensure code quality and automated testing on every code change.
