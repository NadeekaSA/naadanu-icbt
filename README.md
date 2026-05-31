# Naadanu Event Management System

Naadanu is a full-stack web application designed to manage the ICBT Computing Society's annual singing and dancing competition. The platform provides a seamless digital experience for participants, administrators, and the audience, from registration and auditions to final performances and public voting.

## Key Features

- **Participant Registration**: Students can register for various categories (solo/group, singing/dancing) with their ICBT ID and contact details.
- **Admin Dashboard**: A secure dashboard for administrators to manage categories, participants, auditions, and announcements.
- **Audition Scheduling**: Admins can schedule and manage audition details, including dates, venues, and results.
- **Real-time Notifications**: Participants receive automated notifications for registration status changes, audition schedules, and new announcements.
- **Public Voting System**: The audience can vote for their favorite final performances in real-time. The system uses IP tracking to ensure fair voting.
- **Announcements**: Admins can publish event-wide or category-specific announcements to keep participants informed.

## Technologies Used

- **Frontend**: Vite, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication, Realtime)
- **Routing**: React Router
- **Linting**: ESLint
- **Web Push Notifications**: Python, pywebpush (Service backend)

## Database Schema

The database is managed with Supabase and includes the following tables:

- `admin`: Stores administrator login details.
- `categories`: Defines the competition categories (e.g., Solo Singing).
- `participants`: Manages participant registration data and status.
- `auditions`: Tracks audition schedules, venues, and results.
- `announcements`: Stores event announcements created by admins.
- `notifications`: Logs notifications sent to participants.
- `final_performances`: Manages the final performances for the voting phase.
- `performance_votes`: Records audience votes for each performance.

For detailed table structures and relationships, please refer to the SQL migration files in the `supabase/migrations` directory.

## Getting Started

To get the project up and running locally, follow these steps:

### Prerequisites

- Node.js (v18 or higher)
- npm (or a compatible package manager)
- A Supabase account
- Python 3.9+ (For Web Push Notification Service)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/naadanu-event-system.git
   cd naadanu-event-system
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up Supabase**:
   - Create a new project on [Supabase](https://supabase.com/).
   - Navigate to the `SQL Editor` and run the SQL scripts from the `supabase/migrations` directory in chronological order to set up the database schema.
   - Go to `Project Settings` > `API` and find your Project URL and anon key.

4. **Configure environment variables**:
   - Create a `.env` file in the root of the project.
   - Add your Supabase credentials to the `.env` file:
     ```env
     VITE_SUPABASE_URL=your-supabase-project-url
     VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
     VITE_SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
     VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
     VAPID_PRIVATE_KEY_PATH=private_key.pem
     VAPID_CLAIM_EMAIL=admin@naadanu.lk
     ```

5. **Set up Web Push Notifications**:
   - Run the script to generate VAPID keys. This will create `public_key.pem`, `private_key.pem`, and `vapid_keys.json` containing the keys.
     ```bash
     python generate_vapid_keys.py
     ```
   - Make sure to update the `.env` file with the newly generated `VITE_VAPID_PUBLIC_KEY`.

6. **Run the application**:
   - Start the Vite development server for the frontend:
     ```bash
     npm run dev
     ```
   - Start the Python Web Push Notification Service:
     ```bash
     pip install -r requirements.txt
     python notification_service.py
     ```
     Alternatively, you can run the notification service using Docker. Ensure Docker is installed, then build and run the container:
     ```bash
     docker build -t naadanu-notification-service .
     docker run -d --env-file .env naadanu-notification-service
     ```

The application should now be running on `http://localhost:5173`.

### Available Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run lint`: Lints the codebase using ESLint.
- `npm run preview`: Previews the production build locally.
- `npm run typecheck`: Runs TypeScript type checking.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
