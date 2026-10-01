# CookBook 🍳

<div align="center">

<p align="center">
  <strong>A modern, distraction-free digital cookbook and kitchen companion engineered for dynamic ingredient scaling, guided step-by-step cook timers, and intuitive recipe management.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> &bull;
  <a href="#demo">Live Demo</a> &bull;
  <a href="#tech-stack">Tech Stack</a> &bull;
  <a href="#getting-started">Getting Started</a> &bull;
  <a href="#project-structure">Project Structure</a> &bull;
  <a href="#roadmap">Roadmap</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active%20Development-success?style=flat-square" alt="Status" />
  <img src="https://img.shields.io/badge/Platform-Web%20%7C%20Mobile--First%20PWA-1d4ed8?style=flat-square&logo=googlechrome&logoColor=white" alt="Platform" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen?style=flat-square" alt="PRs Welcome" />
</p>

</div>

---

## Overview

**CookBook** is designed to solve common frustrations in digital home cooking: cluttered food blogs filled with ads, auto-locking screens during messy food prep, and rigid ingredient ratios that require manual math when scaling for dinner parties or meal prep.

Built with a mobile-first philosophy, **CookBook** provides a fast, minimal, and responsive interface that lives comfortably on your kitchen countertop tablet or phone.

---

## Features

### 📖 Curated Digital Recipe Catalog
- **Structured Ingredients & Procedures:** Every recipe separates marinades, bases, garnishes, and cook times into organized, logical blocks.
- **Dietary & Category Tagging:** Instant classification by protein (chicken, lamb, beef, vegetarian), cooking method (Instant Pot, grill, roast, slow cook), and cuisine profile.

### ⚖️ Dynamic Yield & Serving Scaler
- **One-Touch Multiplier:** Instantly toggle yield (e.g., 2, 4, 8 servings) or input custom portion counts.
- **Automatic Ingredient Math:** Automatically recalculates spices, liquid volumes, and solid weights while preserving culinary proportions.
- **Unit Conversion:** Quick toggling between Metric ($g$, $mL$) and Imperial ($oz$, $tbsp$, $tsp$, $cups$).

### ⏱️ Hands-Free Interactive Cook Mode
- **Countertop-Friendly Typography:** Ultra-clean, high-contrast typography designed for effortless glanceability from across the kitchen counter.
- **Integrated Multi-Timers:** Context-aware timers embedded directly in procedural steps (e.g., pressure release countdowns, oven bake cycles, searing intervals).
- **Screen Wake Lock API:** Prevents mobile screens from dimming or sleeping while cooking with messy hands.

### 🛒 Smart Grocery List Generator
- **Ingredient Aggregation:** Add single dishes or full weekly meal plans to a centralized grocery list.
- **Pantry Check-Off:** Consolidates common aromatics and pantry staples so you only buy what you need.

### 🔍 Instant Search & Pantry Match
- **Zero-Latency Filtering:** Fuzzy search by recipe title, cuisine, prep time, or available ingredients in your fridge.
- **Offline Reliability:** Progressive Web App (PWA) architecture with local caching for uninterrupted cooking without internet access.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React / Next.js / TypeScript *(or Modern ES6+ / Vanilla TS)* |
| **Styling & Design** | Tailwind CSS / CSS Custom Properties, Responsive Mobile-First Grid |
| **Icons & Visuals** | Lucide Icons, Custom SVG Illustrations |
| **Web APIs** | Screen Wake Lock API, Web Audio API (Timer Chimes), Web Storage / IndexedDB |
| **Build & Tooling** | Vite / Next Build, ESLint, Prettier |
| **Deployment** | Vercel / GitHub Pages |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- `npm`, `pnpm`, or `yarn`

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mohawkwarriors/CookBook.git
   cd CookBook
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or: pnpm install / yarn install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000` (or `http://localhost:5173` if using Vite).

### Production Build

```bash
npm run build
npm run preview
```

---

## Project Structure

```text
CookBook/
├── public/
│   ├── favicon.ico
│   ├── manifest.json            # PWA Web App Manifest
│   └── icons/                   # App icons & badges
├── src/
│   ├── assets/                  # High-res photography & SVG diagrams
│   ├── components/              # Modular UI components
│   │   ├── CookMode/            # Fullscreen guided timer & step tracker
│   │   ├── RecipeCard/          # Card overview with prep & cook metadata
│   │   ├── RecipeDetail/        # In-depth breakdown with dynamic ratio scaler
│   │   ├── SearchBar/           # Real-time search & tag filters
│   │   └── GroceryList/         # Aggregated checklist modal
│   ├── data/                    # JSON / Markdown recipe databases
│   │   └── recipes.json         # Structured recipe repository
│   ├── hooks/                   # Custom React hooks (useWakeLock, useTimer, useScaling)
│   ├── types/                   # TypeScript interfaces & data models
│   ├── utils/                   # Unit converter & fraction formatting helpers
│   ├── App.tsx                  # Application entry & routing
│   └── main.tsx                 # Root mount
├── package.json
└── README.md
```

---

## Recipe Schema Example

Recipes are stored as clean, structured JSON schemas to enable programmatic scaling, timer extraction, and automated grocery listing:

```json
{
  "id": "persian-saffron-chicken",
  "title": "Persian Saffron Chicken Skewers",
  "category": "Main Course",
  "cuisine": "Persian / Middle Eastern",
  "prepTimeMinutes": 20,
  "cookTimeMinutes": 35,
  "defaultServings": 4,
  "tags": ["High-Protein", "Oven-Baked", "Gluten-Free"],
  "ingredients": [
    { "name": "Chicken Thigh", "amount": 1, "unit": "lb", "notes": "cubed" },
    { "name": "Lemon Juice", "amount": 1, "unit": "whole", "notes": "freshly squeezed" },
    { "name": "Saffron", "amount": 1, "unit": "pinch", "notes": "bloomed in 2 tbsp warm water" },
    { "name": "Red Onion", "amount": 1, "unit": "whole", "notes": "pureed" }
  ],
  "steps": [
    { "order": 1, "instruction": "Combine chicken, pureed onion, lemon juice, salt, pepper, and bloomed saffron. Marinate for 2-4 hours." },
    { "order": 2, "instruction": "Preheat oven to 350°F (175°C). Thread chicken onto skewers and place elevated on a wire rack over a baking tray." },
    { "order": 3, "instruction": "Bake for 35 minutes until golden and internal temperature reaches 165°F.", "timerSeconds": 2100 }
  ]
}
```

---

## Roadmap

- [x] Responsive recipe browsing & detail drawers
- [x] Dynamic ingredient ratio scaling engine
- [x] Step-by-step Cook Mode with embedded countdown timers
- [ ] Voice-controlled navigation (hands-free step advance)
- [ ] Camera / OCR recipe scanner to import paper recipe cards
- [ ] Nutritional macro breakdown (calories, protein, carbs, fat)
- [ ] Multi-language support & printable recipe cards

---

## Contributing

Contributions, feedback, and recipe additions are always welcome!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/NewFeature`)
3. Commit your Changes (`git commit -m 'Add NewFeature'`)
4. Push to the Branch (`git push origin feature/NewFeature`)
5. Open a Pull Request

---

## License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<div align="center">
  <sub>Crafted with precision by <a href="https://github.com/mohawkwarriors">Mohammed Saahir Essa</a></sub>
</div>
