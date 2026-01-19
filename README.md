# 🧠 Boundary X - AI Model Training (KNN)

**Boundary X - AI Model Training (KNN)** is a web-based educational tool that allows users to train their own Image Classification model directly in the browser using **ml5.js (KNN Classifier)**.

Unlike standard Teachable Machine integrations that load pre-trained models, this application enables **real-time data collection and training**. It connects to **BBC Micro:bit** via **Web Bluetooth (BLE)** to physically control hardware based on the recognized results.

![Project Status](https://img.shields.io/badge/Status-Active-success)
![Platform](https://img.shields.io/badge/Platform-Web-blue)
![Tech](https://img.shields.io/badge/Stack-p5.js%20%7C%20ml5.js%20(KNN)-yellow)

## ✨ Key Features

### 1. 🎓 In-Browser Training (KNN)
- **Real-time Learning:** Uses the `MobileNet` feature extractor and `KNN Classifier` to train new classes instantly without backend servers.
- **Dynamic Class Management:** Users can add custom classes (e.g., "Rock", "Paper"), collect image samples via the webcam, and delete classes as needed.
- **Immediate Feedback:** Displays the recognized class name and confidence level (%) in real-time.

### 2. 🔗 Wireless Control (Web Bluetooth API)
- **Direct Hardware Link:** Connects to **BBC Micro:bit** using the **Nordic UART Service**.
- **ID-Based Protocol:** Transmits a unique **Class ID** (e.g., `ID1`, `ID2`) to the hardware, making it easy to parse on the microcontroller side.

### 3. 📱 Responsive & Sticky UI
- **Cross-Platform:** Optimized for Desktop, Tablet, and Mobile devices using the `Pretendard` font system.
- **Sticky Canvas:**
    - **Mobile Portrait:** The camera view remains fixed (sticky) at the top (`70px`) while users manage training buttons below.
    - **Mobile Landscape:** The layout shifts to a side-by-side view with the camera fixed on the left.
- **Camera Tools:** Supports **Flip** (Mirroring) and **Switch Camera** (Front/Rear) features.

---

## 📡 Communication Protocol

When the AI recognizes a trained class, it sends the **Class ID** string followed by a newline character (`\n`) via Bluetooth UART.

**Data Format:**
```text
ID{ClassNumber}\n
```

**Examples:**
- **Class 1 (e.g., Apple) detected** `ID1\n`
- **Class 2 (e.g., Banana) detected** `ID2\n`
- **When classification stops:** `stop\n`
> (Note: The ClassNumber is assigned sequentially (1, 2, 3...) as you add classes in the UI.)

**Tech Stack:**
- **Frontend:** HTML5, CSS3
- **Creative Coding:** p5.js (Canvas, Video handling)
- **AI Engine:** ml5.js ml5.js (FeatureExtractor, KNNClassifier)
- **Connectivity:** Web Bluetooth API (BLE)

**License:**
- Copyright © 2024 Boundary X Co. All rights reserved.
- All rights to the source code and design of this project belong to BoundaryX.
- Web: boundaryx.io
- Contact: https://boundaryx.io/contact
