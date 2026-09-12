# 🧠 Boundary X - AI Model Training (KNN)

**Boundary X - AI Model Training (KNN)** is a web-based application that lets users collect camera samples and train their own image classifier directly in the browser using **MobileNet** and a **K-Nearest Neighbors (KNN) classifier**.

It connects to **BBC Micro:bit** via the **Web Bluetooth API** to control hardware based on the recognized class ID.

**No Node.js installation is required to use the published web app.** Open the site in a compatible browser and allow camera access. An internet connection is needed to load the libraries and AI model; Bluetooth control requires a browser that supports Web Bluetooth.

![Project Status](https://img.shields.io/badge/Status-Active-success)
![Platform](https://img.shields.io/badge/Platform-Web-blue)
![Tech](https://img.shields.io/badge/Stack-p5.js%20%7C%20ml5.js%20%7C%20KNN-orange)

## ✨ Key Features

### 1. 🎓 In-Browser Training (KNN)

- **Automatic Class IDs:** Add classes as `ID1`, `ID2`, `ID3` and so on, without entering names. Deleted IDs are not reused; a full reset starts again from ID1.
- **Tap or Hold to Train:** A short click or tap adds one sample. Holding for approximately 350 ms starts continuous collection at approximately 200 ms intervals, depending on device performance.
- **Collection Controls:** Collection stops when the input is released or canceled, the pointer leaves the button, or the page loses focus. Keyboard activation also supports single-sample collection.
- **Smart Square Crop:** The camera feed is center-cropped to a **1:1 aspect ratio (400 × 400)** before feature extraction.
- **Live Feedback:** Displays sample counts, the recognized ID, and classification confidence.
- **Collection Limits:** Supports up to **100 classes**, **500 samples per class**, and **2,000 samples in total**.

### 2. 💾 Model Download, Sharing & Import

- **JSON Download:** Save learned feature data, class IDs, the next ID number, and the mirror setting in one JSON file.
- **File Sharing:** Open the device's share sheet to send the file through an available app, such as an email app. If JSON file sharing is unsupported, the app downloads the file instead.
- **Model Import:** Restore a previously exported file without collecting the same camera samples again. Import replaces the current project after confirmation when classes already exist.
- **Validated Restore:** Invalid or incompatible files are rejected. Existing training data is retained if validation or classifier restoration fails.

> Exported files contain learned features, not original photos or MobileNet model weights. Import supports this app's version 1 JSON format, up to **32 MiB**; Teachable Machine model files and raw ml5 exports are not supported. Download your model before closing or refreshing the page, as training data is not automatically restored.

### 3. 🔗 Wireless Control (Web Bluetooth API)

- **Direct Connection:** Connects to a compatible micro:bit through the browser using the **Nordic UART Service**.
- **ID-Based Transmission:** Sends the recognized **class ID**, matching the ID displayed in the app.
- **Transmission Control:** Sends results when confidence exceeds **50%** and the ID changes or more than **500 ms** has elapsed since the last successful transmission.
- **Transmission Feedback:** Displays a successful send only after the Bluetooth write completes.

### 4. 📱 Responsive & Sticky UI

- **Mobile Portrait:** The camera view stays below the header while you scroll through the controls.
- **Mobile Landscape:** The camera and controls are displayed side by side on supported viewport sizes.
- **Responsive Header:** The back button stays on one line, and the camera offset follows the actual header height.
- **Camera Controls:** Supports **Front/Rear Camera Switching** and **Mirroring (Flip)**.

---

## 📡 Communication Protocol

When the AI recognizes a trained class with confidence above 50%, it sends the **class ID** followed by a newline character (`\n`) via Bluetooth UART.

**Data Format:**

```text
ID{ClassNumber}\n
```

**Examples:**

- **When ID1 is recognized:** `ID1\n`
- **When ID2 is recognized:** `ID2\n`
- **When active recognition stops:** `stop\n`

---

## 🛠️ Developer Testing (Optional)

**This section is for developers running automated tests. Web app users do not need Node.js, npm, or Playwright.**

To run the browser regression tests locally, install Node.js and run the following commands in the project directory:

```sh
npm install
npx playwright install chromium
npm test
```

The tests load the actual ml5 library and MobileNet model over the internet, use a simulated camera, and mock the operating-system sharing and Bluetooth interfaces. They do not send files to email apps or data to physical devices.

For an existing Microsoft Edge installation on Windows:

```powershell
$env:BROWSER_CHANNEL = 'msedge'
npm test
```

Test results are saved in `test-results/`. See [Validation Notes](VALIDATION.md) for the tested scenarios and device-testing limitations.

The app itself is a static website with **no build step**. Keep `index.html`, `style.css`, `sketch.js`, `model-file.js`, `training-input.js`, `support.js`, and `support.css` together when hosting it over HTTPS.

---

**Tech Stack:**

- **Frontend:** HTML5, CSS3
- **Creative Coding:** p5.js **0.9.0** (Canvas, Video Handling)
- **AI Engine:** ml5.js **0.12.2** (MobileNet Feature Extractor / KNN Classifier)
- **Model Storage:** JSON File Download / Import
- **File Sharing:** Web Share API, where supported
- **Connectivity:** Web Bluetooth API (BLE)

**License:**

- Copyright © 2024 Boundary X Co. All rights reserved.
- All rights to the source code and design of this project belong to BoundaryX.
- Web: [boundaryx.io](https://boundaryx.io)
- Contact: [boundaryx.io/contact](https://boundaryx.io/contact)

## In-app Help

Use Help in the header to open the support card. The read-only walkthrough covers camera setup, image collection, optional micro:bit connection, and JSON storage, with chapter navigation. Example links include the device-name program, a micro:bit project, and a servo project from the introduction page. Troubleshooting explains the 50% transmission threshold, the absence of automatic object-loss stopping, and model-file compatibility.

