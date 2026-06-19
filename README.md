# Anjani Restaurant Ecosystem 🍔🛵

Welcome to the **Anjani Ecosystem**! This is a comprehensive, production-ready suite of applications designed to power a modern restaurant, from customer ordering to delivery tracking and owner management.

This ecosystem is built to be modular, highly performant, and completely open-source friendly.

## 🌟 The Applications

The ecosystem consists of four interconnected platforms:

### 1. Customer App (`/Anjani Restaurant`)
A beautiful, cinematic React Native (Expo) web application where customers can browse the menu, add items to their cart, securely checkout, and track their delivery in real-time.
- **Tech Stack**: React Native Web, Expo Router, Zustand (State), Firebase (DB/Auth)

### 2. Rider App (`/Anjani Delivery Partner`)
A dedicated portal for delivery drivers. Riders can log in, view available orders, accept deliveries, and transmit their live GPS coordinates to the customer.
- **Tech Stack**: React Native Web, Expo Router, Expo Location, Firebase Realtime Sync

### 3. Owner Dashboard (`/Anjani Owner Dashboard`)
A powerful, secure React web dashboard for restaurant management. Owners can view live analytics, manage inventory, toggle restaurant open/close status, and process incoming orders via a drag-and-drop Kanban board.
- **Tech Stack**: Vite, React (TypeScript), Chart.js, Firebase Auth/Firestore

### 4. Razorpay Backend Server (`/Anjani Razorpay Server`)
A secure Node.js backend handling the critical money flow. It initializes payment orders securely and verifies webhook signatures before fulfilling orders in the database.
- **Tech Stack**: Node.js, Express, Razorpay SDK, Firebase Admin SDK

## 🛠 Setup & Installation

To run any of these applications locally:

1. Navigate to the specific app directory:
   ```bash
   cd "Anjani Restaurant"
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npx expo start -p web    # For Expo Apps
   npm run dev              # For the Vite Dashboard
   npm run start            # For the Node Backend
   ```

## 📖 Documentation

Every single source code file in this ecosystem has been extensively documented. 
- **Component Level**: Check the top of any `.tsx` or `.ts` file for a high-level overview.
- **Function Level**: All core functions are annotated with JSDoc/TSDoc blocks explaining their inputs, outputs, and side-effects.
- **Inline Logic**: Complex state transitions, animations, and database queries are explained with conversational inline comments.

## 🤝 Contributing

We welcome community contributions! Please ensure that any pull requests maintain the strict, professional commenting standards and aesthetic guidelines established in the core source files. 

*Engineered by Appology Inc.*
