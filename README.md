---

# Slack Connect

A full-stack application that allows users to connect to a Slack workspace, send messages to channels immediately, and schedule messages for future delivery.
This project demonstrates a secure **OAuth 2.0** flow, token management with refresh logic, and a reliable task scheduler.

**Tech Stack:**

* **Frontend:** React (TypeScript)
* **Backend:** Node.js (Express, TypeScript)
* **Database:** PostgreSQL
* **Deployment:** Frontend- NEtlify, Backend- Render

![Homepage](app_screenshots/homepage.png)

![Slack Auth](app_screenshots/slack_auth.png)

![Channels Dropdown](app_screenshots/channels_dropdown.png)

![Message Scheduler](app_screenshots/message_scheduler.png)

![Scheduled Message List](app_screenshots/scheduled_list.png)

---
# Deployed site LINK:
[Click Here](https://cobaltproject.netlify.app/)
---

## Detailed Setup Instructions

Follow these steps to get the application running locally.

---

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/Cobalt_Project.git
cd Cobalt_Project
```

---

### 2️⃣ Backend Setup

The backend handles all authentication, Slack API communication, and message scheduling.

#### **Prerequisites**

* **Node.js:** v18 or later
* **PostgreSQL:** Running instance required

#### **Database Configuration**

Open `psql` and run:

```sql
-- Create a new database
CREATE DATABASE slack_connect;

-- Create a new user with a secure password
CREATE USER my_app_user WITH PASSWORD 'your_secure_password';

-- Grant the user full permissions
GRANT ALL PRIVILEGES ON DATABASE slack_connect TO my_app_user;
```

---

#### **Slack App Configuration**

#3 [Use this Slack DemoApp I made](https://slack.com/oauth/v2/authorize?client_id=9341740205457.9355073540064&scope=chat:write,channels:read,groups:read,im:read,mpim:read,users:read&user_scope=channels:read,chat:write,im:read,mpim:read,groups:read,channels:write)
# **OR**
1. Go to [Slack API Apps](https://api.slack.com/apps) → Create new app **"From scratch"**

2. **Add Scopes** under **OAuth & Permissions**:

   **Bot Token Scopes**:

   * `chat:write`
   * `channels:read`
   * `groups:read`
   * `im:read`
   * `mpim:read`
   * `users:read`

   **User Token Scopes**:

   * `chat:write`
   * `channels:read`
   * `groups:read`
   * `im:read`
   * `mpim:read`

3. **Redirect URI** (OAuth & Permissions page):

   ```
   https://localhost:8080/auth/slack/callback
   ```

4. **Install App** to your workspace to approve permissions

5. **Get Credentials** (Basic Information page):

   * `Client ID`
   * `Client Secret`

---

#### **Running the Backend Server**

```bash
cd backend
```

##### Generate SSL Certificate:

```bash
# Windows (Git Bash)
MSYS_NO_PATHCONV=1 openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem \
-sha256 -days 365 -nodes \
-subj "/C=XX/ST=State/L=City/O=Organization/OU=OrgUnit/CN=localhost"
```

##### Create `.env` file in `backend`:

```env
SLACK_CLIENT_ID=YOUR_SLACK_CLIENT_ID
SLACK_CLIENT_SECRET=YOUR_SLACK_CLIENT_SECRET
SLACK_REDIRECT_URI=https://localhost:8080/auth/slack/callback
PORT=8080
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://my_app_user:your_secure_password@localhost:5432/slack_connect
```

##### Install Dependencies & Run:

```bash
npm i
npm run dev
```

Backend runs at: **[https://localhost:8080](https://localhost:8080)**

---

### 3️⃣ Frontend Setup

```bash
cd frontend
npm i
npm run dev
```

Frontend runs at: **[http://localhost:5173](http://localhost:5173)**

---

### 4️⃣ Access the Application

Open your browser → **[http://localhost:5173](http://localhost:5173)**
If prompted with a security warning for backend HTTPS, click **Advanced → Proceed to localhost**.

---

## Architectural Overview

### **Frontend**

* React Single Page Application built with TypeScript & Vite
* Handles UI and state management
* Uses Vite proxy to bypass HTTPS issues during development

### **Backend**

* Node.js + Express (TypeScript)
* Core API handling authentication, Slack API calls, and scheduling

### **Database**

* PostgreSQL stores:

  * User tokens
  * Scheduled messages

---

##  OAuth & Token Management

1. **Connect to Slack** → User is redirected to Slack authorization URL with required permissions
2. Slack returns a **temporary code** to `/auth/slack/callback`
3. Backend exchanges this code for:

   * **User Access Token** (`xoxp-`)
   * **Refresh Token**
4. Tokens & expiration time stored securely in DB
5. Backend refreshes tokens automatically when expired

---

##  Scheduled Task Handling

* **Scheduling**: Stores message, channel ID, and `send_at` time in DB
* **Execution**: Sends due messages and marks them as `sent`

---

## Challenges & Learnings

### **1. Local HTTPS for OAuth Redirect**

* **Problem:** Slack requires HTTPS redirect URIs, blocking local HTTP dev
  
* **Solution:** Generated self-signed SSL certificate using OpenSSL, ran backend over HTTPS without ngrok

### **2. Self-Signed Certificate Errors**

* **Problem:** Browser blocked API calls due to untrusted certificate
  
* **Solution:** Vite proxy forwards `/api` calls to backend over HTTPS

### **3. Fetching User-Specific Data**

* **Problem:** Channels list empty because backend used Bot Token instead of User Token
  
* **Solution:** Extracted `authed_user.access_token` from OAuth response & requested proper user scopes

### **4. Changed the package.json to always install the env dependencies**

### **5. Home Page -----> Autentication Page ------> Home Page loop**

* **Problem:** The deployed site stuck in the loop of going from home page to the slack api authentication page
  then back to the home page due to race condition. The redirection to the site and the user authentication was
  happening simultaneously.

* **Solution:** Wrote a robust app code code to always wait for user authentication first then redirect to the site URL.
  Then made sure the issue isn't being caused by something else like mismatch in env variables.

---
