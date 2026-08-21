# Staff Companion

Create a complete, modern, responsive Staff Management and Attendance Management web application.

Main Goal

Build an app for a business owner/admin to manage staff, attendance, salary, working hours and employee records from one dashboard.

Technology

Use a modern responsive web stack suitable for Lovable.
Use Supabase for authentication and database.
The application must work perfectly on desktop, tablet and mobile.

1. Admin Login

Create a secure Admin Login page with:

Email

Password

Login button

Logout functionality

Protected admin dashboard

Only authenticated admins should be able to access staff and salary data.

2. Admin Dashboard

Create a professional dashboard showing:

Total Staff

Present Today

Absent Today

Late Today

Total Monthly Salary

Today's Attendance

Quick actions

Use clean cards, icons and charts where useful.

3. Staff Management

Create a Staff section where admin can:

Add new staff

Edit staff

Delete/deactivate staff

View staff details

Search staff

Filter staff by department/status

Staff fields:

Staff ID

Full Name

Mobile Number

Email

Address

Date of Joining

Department

Designation

Salary Type (Monthly / Daily)

Salary Amount

Working Hours

Profile Photo

Active/Inactive status

4. Camera Attendance

Create a camera-based attendance feature.

The admin should be able to open the device camera and capture the staff member's face/photo for attendance.

For the first version:

Use camera access through the browser.

Capture staff photo.

Select/identify the staff member.

Record Check-In time automatically.

Record Check-Out time.

Store attendance date and time in the database.

Design the system so that real face-recognition verification can be added later.

Do NOT claim that basic camera capture is face recognition.

5. Attendance Management

Create an Attendance page with:

Calendar view

Daily attendance

Monthly attendance

Staff-wise attendance

Present

Absent

Half Day

Leave

Late

Check-in time

Check-out time

Total working hours

Allow admin to manually correct attendance.

6. Salary Management

Create a Salary section.

Automatically calculate salary based on:

Monthly salary or daily salary

Number of working days

Present days

Absent days

Leave

Half days

Overtime

Late deductions if configured

Show:

Gross salary

Deductions

Overtime

Net salary

Create a monthly salary summary for every staff member.

7. Reports

Create a Reports section with:

Monthly attendance report

Staff attendance report

Salary report

Present/absent report

Working hours report

Allow reports to be downloaded as CSV/PDF if supported.

8. Database

Create proper Supabase database tables for:

admins/users

staff

attendance

salary

departments

leave records

Use proper relationships and timestamps.

9. UI/UX

Use a clean professional design.

Requirements:

Responsive design

Mobile friendly

Sidebar navigation on desktop

Mobile bottom/menu navigation where appropriate

Modern cards

Tables with search/filter

Confirmation dialogs before deleting

Toast notifications

Loading states

Empty states

Error handling

Use a professional business dashboard style rather than a generic template.

10. Navigation

Create these pages:

/login
/dashboard
/staff
/staff/:id
/attendance
/salary
/reports
/settings

11. Settings

Create settings for:

Business name

Working hours

Salary calculation rules

Late rules

Overtime rules

Attendance settings

Important Requirements

The app must actually function, not just be a static UI.

Connect forms to Supabase.
Persist staff and attendance data.
Use proper validation.
Handle authentication securely.
Do not expose sensitive database credentials in frontend code.

Start by creating the database schema, authentication, dashboard and Staff Management functionality. Then implement Attendance, Salary and Reports.

Make the application production-ready, clean, scalable and easy for a non-technical business owner to use.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://hotelamantran.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/97b27844-21ec-4aaa-aa27-88a688d88ddf).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
