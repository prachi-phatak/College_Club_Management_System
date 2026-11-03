# 🎓 College Club Management System

A web-based **College Club Management System** designed to simplify and organize college club activities, student memberships, event planning, and administrative records through a centralized dashboard.

The system provides an organized platform to manage college clubs, maintain student information, assign club roles, schedule events, and generate useful reports.

## ✨ Features

### 📊 Dashboard
- Overview of college clubs and activities.
- Quick access to frequently used operations.
- Upcoming events overview.
- Members-per-club summary.

### 🏛️ Club Management
- Create and manage college clubs.
- Maintain club names and categories.
- Store faculty coordinator details.
- Track club establishment years.

### 👥 Member Management
- Maintain student information.
- Store names, email addresses, departments, study years, and phone numbers.
- Manage student records.

### 🔗 Membership Management
- Assign students to different clubs.
- Maintain membership joining dates.
- Assign roles such as President, Vice President, Secretary, Treasurer, and Member.
- Prevent duplicate club memberships for the same student.

### 📅 Event Management
- Organize college events.
- Manage event titles, dates, and venues.
- Maintain event budget information.
- Associate events with their respective clubs.

### 📈 Reports & Analytics
Generate reports for:
- Members per Club
- Upcoming Events
- Member List
- Event Budget Summary
- Club Summary

Export reports in **CSV format** for further use.

### 🔐 User Authentication
- Account registration and sign-in.
- Email validation.
- Password confirmation during registration.
- Password hashing before storing account credentials.

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 | Website structure |
| CSS3 | Styling and responsive interface |
| JavaScript | Application logic and interactivity |
| SQLite | Relational database |
| SQL.js | Running SQLite in the browser using WebAssembly |
| LocalStorage | Persisting browser database data |
| SQL | Database operations and queries |

## 🗄️ Database Design

The application uses SQLite with the following main tables:

| Table | Description |
|---|---|
| `Club` | Stores club details and categories |
| `Member` | Stores student information |
| `Event` | Stores event details and budgets |
| `Membership` | Connects students with clubs and their roles |
| `UserAccount` | Stores registered user account details |

**Database relationships:**
- One club can have multiple events.
- Students can join multiple clubs.
- Clubs can have multiple student members.
- Membership connects clubs and students.

## 📂 Project Structure

```text
College_Club_Management_System/
│
├── index.html
├── style.css
├── script.js
│
├── clubdb.sqlite
├── SQL.sqlite3-query
├── Untitled-1.sqlite3-query
│
├── sqlite-jdbc-3.36.0.3.jar
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- A modern web browser (Google Chrome recommended).
- Visual Studio Code.
- Live Server extension in VS Code.
- Internet connection to load the SQL.js library from its CDN.

### Installation & Execution

**1. Clone the repository**

```bash
git clone https://github.com/prachi-phatak/College_Club_Management_System.git
```

**2. Navigate to the project folder**

```bash
cd College_Club_Management_System
```

**3. Open the project in VS Code**

```bash
code .
```

**4. Run the application**

- Open `index.html` in VS Code.
- Right-click inside the editor.
- Select **Open with Live Server**.
- The application will open in your default browser.

## 💾 Data Storage

The application uses SQL.js to create and manage an SQLite database directly in the browser.

- Database operations are performed using SQL queries.
- Database changes are saved in browser LocalStorage.
- Existing browser data is loaded when the application is reopened in the same browser.

**Note:** The current implementation uses browser-side storage rather than a centralized server database. Data is therefore not automatically shared between different users or browsers.

## 🔑 Demo Account

The application initializes a sample administrator account:

| Field | Value |
|---|---|
| Email | `admin@clubsphere.com` |
| Password | `admin123` |

This is a demonstration account. Change or remove the default credentials before using the project with real user data.

## 🎯 Project Objectives

- Simplify college club administration.
- Organize student membership records.
- Improve event planning and coordination.
- Maintain structured and consistent database records.
- Generate reports for better management and decision-making.

## 🔮 Future Enhancements

- Role-based access for administrators, coordinators, and students.
- Centralized cloud database integration.
- Online event registration and attendance tracking.
- Event notifications and reminders.
- Advanced analytics and visual dashboards.
- Deployment as a publicly accessible web application.

## 👩‍💻 Author

**Prachi Phatak**

Computer Engineering Student | Full Stack Developer | AIML Enthusiast

- GitHub: [@prachi-phatak](https://github.com/prachi-phatak)
- Project Repository: [College Club Management System](https://github.com/prachi-phatak/College_Club_Management_System)

---

⭐ If you find this project useful, consider giving the repository a star!
