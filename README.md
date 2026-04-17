# EcoTrack - Food Waste Monitoring & Prediction System

A full-stack web application for tracking, analyzing, and predicting food waste using AI-powered forecasting and smart recommendations.


##  Features

-  **Real-time Dashboard** - Track waste, cost, and CO₂ impact
- **Waste Logging** - Record food waste with category, weight, cost, and reason
-  **Inventory Management** - Track items with expiry date alerts
- **AI Predictions** - Linear regression-based 7-day waste forecast
-  **Smart Recommendations** - Personalized tips to reduce waste
- **Advanced Analytics** - Top wasted items, reasons, cost analysis
-  **Reports & Export** - CSV/JSON export for compliance

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript, Chart.js
- **Backend**: Node.js, Express.js
- **Database**: SQLite (via better-sqlite3)

## Quick Start

### Prerequisites
- Node.js 16+ and npm

### Installation

`

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Development Mode

```bash
npm run dev
```

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/waste` | Get all waste logs |
| POST | `/api/waste` | Create waste log |
| DELETE | `/api/waste/:id` | Delete waste log |
| GET | `/api/inventory` | Get inventory items |
| POST | `/api/inventory` | Add inventory item |
| DELETE | `/api/inventory/:id` | Delete inventory item |
| GET | `/api/stats` | Dashboard statistics |
| GET | `/api/stats/daily/:days` | Daily waste trend |
| GET | `/api/stats/categories` | Category breakdown |
| GET | `/api/predictions` | 7-day AI forecast |

