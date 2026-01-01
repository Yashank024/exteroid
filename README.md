# EXTEROID | Cosmic Scale Excel Automation 🌌

**Excel Power at Cosmic Scale | Professional Browser-Based Data Tools**

EXTEROID is a futuristic, high-performance data operations platform featuring three powerful tools: AI-powered OCR for image-to-data conversion, intelligent Excel file consolidation, and advanced data cleaning automation—all running **100% locally in your browser** with complete privacy protection.

[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Local-success.svg)](./privacy.html)
[![Version](https://img.shields.io/badge/Version-2.0-00f0ff.svg)](.)
[![License](https://img.shields.io/badge/License-Proprietary-7000ff.svg)](.)

## 🎯 Features Overview

EXTEROID combines three specialized tools into one seamless "cosmic" interface:

### 1. 🖼️ OCR Image / Document to Excel (ImgDoc)
Extract structured tables from images, PDFs, and scanned documents using advanced OCR technology.

**Key Capabilities:**
- **Local OCR Engine**: Integrated Tesseract.js for private, client-side text extraction.
- **Document Analysis**: Automatically detects document type and structure.
- **Smart Column Discovery**: Uses spatial and semantic analysis to identify table columns.
- **Table Reconstruction**: Rebuilds rows and columns from unstructured OCR data.
- **Data Cleaning**: Integrated tools to trim whitespace, remove duplicates, and validate data before export.
- **Batch Processing**: Handle multiple images/PDFs in one go.

### 2. 🪄 Smart Excel Automation (SmartExcel)
No-code data cleaning, transformation, and validation suite.

**Key Capabilities:**
- **Comprehensive Cleaning**:
  - Remove empty rows and duplicates.
  - Trim whitespace and fix line breaks.
  - Normalize text case (Title Case, UPPERCASE).
- **Smart Formatting**:
  - Auto-format mobile numbers (+91).
  - Validate and clean email addresses.
  - Normalize currency and dates.
- **Column Operations**: Rename, merge, split, or exclude columns via a visual interface.
- **Validation Engine**: Detect and flag invalid rows based on strict rules.
- **Real-time Preview**: See changes instantly before exporting.

### 3. 🔗 Excel Consolidator
Merge and consolidate multiple Excel files with intelligent column mapping (Feature available in suite).

**Key Capabilities:**
- **Intelligent Merging**: Combine data from multiple sources.
- **Column Mapping**: Smart detection of matching columns across files.
- **Conflict Resolution**: Tools to handle data discrepancies.

---

## 💻 Tech Stack & Design

EXTEROID is built with modern web technologies to deliver a premium, app-like experience without any backend dependencies.

### Core Technologies
- **HTML5 & CSS3**: Semantic markup with advanced CSS variables and layouts.
- **Vanilla JavaScript (ES6+)**: High-performance, dependency-free core logic.
- **Three.js**: Powering the "Cosmic Galaxy" visualization on the landing page.

### Libraries & Tools
- **Tesseract.js**: For client-side Optical Character Recognition (OCR).
- **SheetJS (XLSX)**: For reading and writing Excel spreadsheets in the browser.
- **FontAwesome**: For UI icons.
- **Google Fonts**: 'Orbitron' (Headers) and 'Inter' (Body) for futuristic typography.

### Design System ("Cosmic Scale")
- **Visuals**: Dark space theme (`#020205`) with Electric Cyan (`#00f0ff`) and Deep Violet (`#7000ff`) accents.
- **Glassmorphism**: Frosted glass UI elements for a modern feel.
- **Animations**: Cinematic fade-ins, parallax effects, and interactive 3D galaxy background.

---

## 🚀 Getting Started

Since EXTEROID runs entirely in the browser, no complex installation is required.

1. **Clone or Download** the repository.
2. **Open `index.html`** in any modern web browser (Chrome, Edge, Firefox, Safari).
   - *Note: For best performance with modules and CORS-restricted features, serve the folder using a local server (e.g., Live Server in VS Code, or `python -m http.server`).*
3. **Navigate**: Use the main dashboard to launch any of the three tools.

---

## 📁 Project Structure

```
EXTEROID/
│
├── index.html                  # Main Landing Page (3D Galaxy)
├── README.md                   # Project Documentation
├── about.html                  # About Page
├── contact.html                # Contact Page
├── features.html               # Features Overview
├── privacy.html                # Privacy Policy
├── robots.txt                  # SEO Configuration
├── sitemap.xml                 # SEO Sitemap
│
├── css/                        # Global Styles
│   └── styles.css
│
├── js/                         # Global Scripts
│   └── boxanimate.js           # Animation utilities
│
└── features_pages/             # Tool Implementations
    │
    ├── smartexcel.html         # Smart Excel Automation Tool
    ├── imgdoc.html             # Image/OCR to Excel Tool
    ├── consolidator.html       # File Consolidator Tool
    │
    ├── css/                    # Tool-specific Styles
    │   ├── smartexcel.css
    │   ├── imgdoc.css
    │   └── consolidator.css
    │
    └── js/                     # Tool-specific Logic
        ├── smartexcel.js
        ├── imgdoc.js
        └── consolidator.js
```

---

## 🔒 Privacy & Security

**100% Local Processing**
EXTEROID is designed with a "Privacy First" architecture. All data processing—OCR, file parsing, cleaning, and consolidation—happens **exclusively within your browser**.

- **No Server Uploads**: Your files never leave your device.
- **No Data Retention**: We do not store or track your sensitive data.
- **Offline Capable**: Once loaded, core features can function without an active internet connection (dependent on cached libraries).

---

## 🐛 Known Limitations

- **OCR Performance**: Text extraction speed and accuracy depend on image quality and device processing power.
- **Browser Memory**: Extremely large datasets (hundreds of thousands of rows) may hit browser memory limits.
- **Mobile Experience**: While responsive, complex data operations are best performed on desktop screens.

---

## 📄 License & Usage

© 2025 EXTEROID. All rights reserved.

This project is proprietary software. Unauthorized copying, distribution, or modification is prohibited.

---

<div align="center">
    <p><strong>Excel Power. Cosmic Scale.</strong></p>
    <p>Made with ❤️ for data enthusiasts.</p>
</div>
