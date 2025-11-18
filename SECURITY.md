# Security Policy

This document outlines the security policies and procedures for the Nadanu Event Management System.

## Reporting a Vulnerability

If you discover a security vulnerability, please report it to us as soon as possible by emailing `security@example.com`. We appreciate your efforts to disclose your findings responsibly and will make every effort to acknowledge your contributions.

## Data Security and Privacy

Our application is built on [Supabase](https://supabase.com), which provides a robust set of security features. We leverage these features to protect the data of our users.

### Row Level Security (RLS)

All tables in our database have Row Level Security (RLS) enabled. This ensures that users can only access the data they are authorized to see. The specific policies are as follows:

- **Admins**: Administrators have full access to manage all data in the system, but they can only view their own admin profile information.
- **Participants**: Participants can view and manage their own registration and audition data. They can also view public information such as categories and active announcements.
- **Anonymous Users**: Unauthenticated users can view public information, such as categories, active announcements, and final performances. They can also register as new participants and vote for performances.

### Voter Privacy

To protect the privacy of voters, we do not expose individual voting records or IP addresses to the public. All vote counts are aggregated and displayed anonymously through a secure view. Direct access to the `performance_votes` table is restricted to administrators.

### Authentication

User authentication is handled by Supabase Auth. Passwords are not stored in our database; instead, we store a secure hash of the password.

## Security Updates

The security of our application is a top priority. We regularly review our codebase and dependencies for security vulnerabilities and apply patches as needed. All security-related changes are documented in our SQL migration files and in this document.
