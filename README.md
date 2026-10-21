# Camparify - Real-Time Ride Fare Comparison Engine

**Camparify** is a production-ready, full-stack Next.js 14 App Router application that compares real-time ride prices and pickup ETAs side-by-side between **Rapido** and **Bharat Taxi** across Indian cities (including Gorakhpur, Lucknow, Delhi, Varanasi, and 5,000+ districts).

---

## 🌟 Key Features

1. **Brand New UI & Default Light Mode with Dark Mode Toggle**:
   - Clean, modern default light theme with frosted glassmorphism.
   - 1-click **Dark Mode Toggle** (Sun ☀️ / Moon 🌙) in the navigation bar.

2. **OpenFreeMap Vector Map (No API Key Required)**:
   - Uses **OpenFreeMap.org** vector styles (`liberty` for light mode, `dark` for dark mode).
   - 100% free with zero limits, zero tracking, and no credit card or API keys.
   - Interactive draggable pins: **Set Pickup Pin (Blue 🔵)** and **Set Drop Pin (Red 🔴)**.
   - Automatic route polyline connecting pickup and drop points.

3. **User-Friendly Chart-Based Comparison**:
   - **Left Column**: Rapido Fare & Pickup ETA ⚡
   - **Center**: Vehicle Category (🛵 Bike, 🛺 Auto, 🚗 Cab Mini WagonR, 🚘 Sedan Dzire) with dynamic price comparison bar and savings tag.
   - **Right Column**: Bharat Taxi Fare & Pickup ETA 🚕

4. **1-Click Excel Report Export (.xlsx)**:
   - Download complete trip breakdown directly to formatted Excel workbook (`.xlsx`) using pure client-side processing (0ms backend load).

5. **100% Real Live Rates from Bharat Taxi**:
   - Live scraping from `https://www.bharattaxi.com/{citySlug}` (e.g., `bharattaxi.com/gorakhpur`).
   - Verified rates: Maruti Swift Dzire (₹12/Km), Ertiga/Innova (₹14-16/Km).
   - 0ms instant location autocomplete powered by verified city localities.

6. **Optimized for Vercel Serverless**:
   - Pre-configured for Mumbai (`bom1`) region for sub-15ms latency to Indian servers.
   - `maxDuration = 30` to prevent serverless timeouts.
   - Zero heavy Puppeteer/Chromium binaries (runs on lightweight `axios` + HTML parser).

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for Production / Vercel Serverless
```bash
npm run build
npm run start
```

---

## 📦 Deploy to Vercel

```bash
# Push to GitHub
git push -u origin main
```
Import `https://github.com/kanXer/comparify.git` into [Vercel](https://vercel.com) and click **Deploy**.
