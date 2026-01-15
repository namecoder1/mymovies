# 🏠 MyMovies Home Server Setup Guide

This guide will help you set up **Famflix** on your home server (e.g., your old iMac) so you and your family can access it from anywhere, securely.

## 📋 Prerequisites

1.  **Docker Desktop**: Install [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/).
2.  **Tailscale**: Install [Tailscale](https://tailscale.com/download) on the server (iMac) and on any device (phone/laptop) that needs access.
3.  **Source Code**: Download this project folder to your iMac.
4.  **Environment Variables**: Make sure you have the `.env.local` file in the project folder with your API keys.

---

## 🚀 Setup Steps (Do this once on the Server)

1.  Open **Terminal** on your Mac.
2.  Navigate to the project folder.
3.  Build the application image:
    ```bash
    docker-compose build
    ```
    *(This might take a few minutes the first time)*

---

## ▶️ How to Run

### Option 1: The "One-Click" Script (Recommended)
I have included a file named `start.command`. 
1.  Double-click `start.command`.
2.  A terminal window will open showing the server starting.
3.  That's it!

### Option 2: Docker Desktop
1.  Open Docker Desktop.
2.  Go to "Containers".
3.  Find `famflix-app` and click the "Play" (Start) button.

---

## 🌍 Connecting Remotely (Family Access)

To let your relatives access the site from their cities:

1.  **Install Tailscale** on their device (iPhone, iPad, laptop, etc.).
2.  **Login** to your Tailscale network (you can share a link with them or add their device).
3.  **Get the Server IP**:
    *   Click the Tailscale icon on your Server's menu bar.
    *   Look for the "IP Address" (starts with `100.x.x.x`).
    *   Copy it.
4.  **Open in Browser**:
    On your relative's device, open their browser and go to:
    `http://<YOUR-TAILSCALE-IP>:3000`
    
    *Example: `http://100.101.102.103:3000`*

### MagicDNS (Optional but easier)
If you enable **MagicDNS** in your Tailscale Admin Console, you can just use the computer name:
`http://imac-server:3000`

---


## 🔋 Keep Alive (Important for Home Server)

For the site to be accessible 24/7, your Mac must not go to sleep completely. You want the **display** to turn off, but the **computer** to stay on.

### macOS (Ventura/Sonoma and newer):
1.  Open **System Settings** -> **Displays**.
2.  Click **Advanced...** (at the bottom).
3.  Turn ON **"Prevent automatic sleeping on power adapter when the display is off"**.
4.  Click **Done**.

### macOS (Older versions):
1.  Open **System Preferences** -> **Energy Saver**.
2.  Enable **"Prevent computer from sleeping automatically when the display is off"**.
3.  Uncheck "Put hard disks to sleep when possible".

_You can still let the screen turn off or set a screen saver. As long as the computer is powered, the server will run._
