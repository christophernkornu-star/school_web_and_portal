# Biriwa Methodist 'C' Basic School Management System

A comprehensive School Management System built for Biriwa Methodist 'C' Basic School in Ghana.

## Features

### Student Portal
- Login and view results
- Access class information
- View performance reports

### Teacher Portal
- Enter exam scores and class assessments
- Monitor student performance over time
- Access only assigned classes/subjects
- Generate performance analytics

### Administrative Portal
- Manage teachers and students
- Resource management
- Population statistics and reporting
- System-wide oversight

### Public Website
- School information and history
- Events calendar
- Photo albums
- Admission information
- Contact details

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

3. Run the database migrations in Supabase (see `database/schema.sql`)

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Database Schema

See `database/schema.sql` for the complete database structure.

## License

Proprietary - Biriwa Methodist 'C' Basic School
