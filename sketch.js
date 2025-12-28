/**
 * sketch.js
 * Boundary X: AI Model Training (KNN Version)
 * Features: MobileNet Feature Extraction + KNN, Real-time Learning
 */

// Bluetooth UUIDs
const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const UART_TX_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const UART_RX_CHARACTERISTIC_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

let bluetoothDevice = null;
let rxCharacteristic = null;
let txCharacteristic = null;
let isConnected = false;
let bluetoothStatus = "연결 대기 중";
let isSendingData = false;

// ML Variables
let video;
let featureExtractor;
let knnClassifier;
let isModelReady = false;
let isPredicting = false; 

// ID Mapping System
let nextClassId = 1; 
let idToNameMap = {}; 

// DOM Elements
let classInput, addClassBtn, classListContainer, resetBtn;
let resultLabel, resultConfidence, btDataDisplay;
let flipButton, switchCameraButton, connectBluetoothButton, disconnectBluetoothButton;
let startRecognitionButton, stopRecognitionButton; 
let canvas;

// Camera
let facingMode = "user";
let isFlipped = false;
let isVideoLoaded = false;

function setup() {
  // 1:1 정사각형 캔버스 생성
  canvas = createCanvas(400, 400);
  canvas.parent('p5-container');
  
  // MobileNet 특징 추출기 로드
  featureExtractor = ml5.featureExtractor('MobileNet', modelReady);
  knnClassifier = ml5.KNNClassifier();

  setupCamera();
  createUI();
}

function modelReady() {
  console.log("MobileNet Feature Extractor Loaded!");
  isModelReady = true;
}

function setupCamera() {
  let constraints = {
    video: {
      facingMode: facingMode
    },
    audio: false
  };
  video = createCapture(constraints);
  video.hide();

  // 비디오 로드 확인
  let videoLoadCheck = setInterval(() => {
    if (video.elt.readyState >= 2 && video.width > 0) {
      isVideoLoaded = true;
      clearInterval(videoLoadCheck);
      console.log(`Video Stream Ready: ${video.width}x${video.height}`);
    }
  }, 100);
}

function stopVideo() {
    if (video) {
        if (video.elt.srcObject) {
            video.elt.srcObject.getTracks().forEach(track => track.stop());
        }
        video.remove();
        video = null;
    }
}

function createUI() {
  // DOM Selectors
  classInput = select('#class-input');
  addClassBtn = select('#add-class-btn');
  classListContainer = select('#class-list');
  resetBtn = select('#reset-model-btn');
  
  resultLabel = select('#result-label');
  resultConfidence = select('#result-confidence');
  btDataDisplay = select('#bluetooth-data-display');

  // Input Events
  addClassBtn.mousePressed(addNewClass);
  classInput.elt.addEventListener("keypress", (e) => {
      if (e.key === "Enter") addNewClass();
  });
  
  resetBtn.mousePressed(resetModel);

  // 1. Camera Buttons
  flipButton = createButton("좌우 반전");
  flipButton.parent('camera-control-buttons');
  flipButton.addClass('start-button');
  flipButton.mousePressed(() => isFlipped = !isFlipped);

  switchCameraButton = createButton("전후방 전환");
  switchCameraButton.parent('camera-control-buttons');
  switchCameraButton.addClass('start-button');
  switchCameraButton.mousePressed(switchCamera);

  // 2. Bluetooth Buttons
  connectBluetoothButton = createButton("기기 연결");
  connectBluetoothButton.parent('bluetooth-control-buttons');
  connectBluetoothButton.addClass('start-button');
  connectBluetoothButton.mousePressed(connectBluetooth);

  disconnectBluetoothButton = createButton("연결 해제");
  disconnectBluetoothButton.parent('bluetooth-control-buttons');
  disconnectBluetoothButton.addClass('stop-button');
  disconnectBluetoothButton.mousePressed(disconnectBluetooth);

  // 3. Recognition Control Buttons
  startRecognitionButton = createButton("인식 시작");
  startRecognitionButton.parent('recognition-control-buttons');
  startRecognitionButton.addClass('start-button');
  startRecognitionButton.mousePressed(startClassify);

  stopRecognitionButton = createButton("인식 중지");
  stopRecognitionButton.parent('recognition-control-buttons');
  stopRecognitionButton.addClass('stop-button');
  stopRecognitionButton.mousePressed(stopClassify);

  updateBluetoothStatusUI();
}

function switchCamera() {
  stopVideo();
  isVideoLoaded = false;
  facingMode = facingMode === "user" ? "environment" : "user";
  setTimeout(setupCamera, 500);
}

// === Logic: Class Management ===

function addNewClass() {
    const className = classInput.value().trim();
    if (className === "") {
        alert("이름을 입력해주세요.");
        return;
    }

    const currentId = String(nextClassId++);
    idToNameMap[currentId] = className; 

    // UI Row
    const row = createDiv('');
    row.addClass('train-btn-row');
    row.parent(classListContainer);

    // Train Button
    const trainBtn = createButton(
        `<span class="id-badge">ID ${currentId}</span>
         <span class="train-text">${className}</span>`
    );
    trainBtn.addClass('train-btn');
    trainBtn.parent(row);
    
    // Count Badge
    const countBadge = createSpan('0 data');
    countBadge.addClass('train-count');
    countBadge.parent(trainBtn);

    // [핵심] 학습 버튼 클릭 시 KNN에 예제 추가
    trainBtn.mousePressed(() => {
        addExample(currentId); 
        
        // 클릭 애니메이션
        trainBtn.style('background', '#e0e0e0');
        setTimeout(() => trainBtn.style('background', '#f8f9fa'), 100);
    });

    // Delete Button
    const delBtn = createButton('×');
    delBtn.addClass('delete-class-btn');
    delBtn.parent(row);
    delBtn.mousePressed(() => {
        if(confirm(`[ID ${currentId}: ${className}] 클래스를 삭제하시겠습니까?`)) {
            knnClassifier.clearLabel(currentId); // 해당 라벨 데이터 삭제
            row.remove();
        }
    });

    classInput.value('');
}

function addExample(labelId) {
    if (!isModelReady || !isVideoLoaded) {
      console.warn("Model or Video not ready");
      return;
    }

    // [중요] 캔버스의 현재 이미지를 특징으로 변환하여 KNN에 추가
    // 캔버스 자체를 넘겨주면, draw()에서 그려진 Square Crop된 이미지가 학습됨
    const features = featureExtractor.infer(canvas);
    knnClassifier.addExample(features, labelId);
    
    updateButtonCount(labelId);
}

function updateButtonCount(labelId) {
    const count = knnClassifier.getCountByLabel()[labelId];
    const buttons = document.querySelectorAll('.train-btn');
    buttons.forEach(btn => {
        if (btn.innerText.includes(`ID ${labelId}`)) {
            const badge = btn.querySelector('.train-count');
            if(badge) badge.innerText = `${count} data`;
        }
    });
}

function resetModel() {
    if(confirm("모든 학습 데이터를 삭제하시겠습니까?")) {
        knnClassifier.clearAllLabels();
        idToNameMap = {};
        nextClassId = 1;
        
        classListContainer.html(''); 
        resultLabel.html("데이터 없음");
        resultConfidence.html("");
        btDataDisplay.html("전송 데이터: 대기 중...");
        btDataDisplay.style('color', '#666');
        
        stopClassify(); 
    }
}

// === Logic: Classification Control ===

function startClassify() {
    if (knnClassifier.getNumLabels() <= 0) {
        alert("먼저 학습 데이터를 추가해주세요!");
        return;
    }
    if (!isPredicting) {
        isPredicting = true;
        classify(); 
    }
}

function stopClassify() {
    isPredicting = false;
    resultLabel.html("중지됨");
    resultLabel.style('color', '#666');
    resultConfidence.html("");
    
    sendBluetoothData("stop");
    btDataDisplay.html("전송됨: stop");
    btDataDisplay.style('color', '#EA4335');
}

function classify() {
    if (!isPredicting) return;
    if (knnClassifier.getNumLabels() <= 0) return;

    // 현재 캔버스 이미지에서 특징 추출 후 분류
    const features = featureExtractor.infer(canvas);
    knnClassifier.classify(features, gotResults);
}

function gotResults(error, result) {
    if (error) {
        console.error(error);
        return;
    }

    if (result.confidencesByLabel) {
        const labelId = result.label;
        const confidence = result.confidencesByLabel[labelId] * 100;
        const name = idToNameMap[labelId] || "알 수 없음";

        resultLabel.html(`ID ${labelId} (${name})`);
        resultLabel.style('color', '#000');
        resultConfidence.html(`정확도: ${confidence.toFixed(0)}%`);

        if (isPredicting) {
             // 데이터 전송 (I{id} 포맷)
             let dataToSend = `I${labelId}`;
             sendBluetoothData(dataToSend);
             
             btDataDisplay.html(`전송됨: ${dataToSend}`);
             btDataDisplay.style('color', '#0f0');
        } 
    }

    if (isPredicting) {
        // 약간의 딜레이를 주어 과부하 방지 (선택 사항)
        requestAnimationFrame(classify); 
    }
}

// === P5 Draw Loop ===

function draw() {
  background(0);

  if (!isVideoLoaded || video.width === 0) {
      fill(255);
      textAlign(CENTER);
      text("카메라 로딩 중...", width/2, height/2);
      return;
  }

  // Center Crop Logic
  let vw = video.width;
  let vh = video.height;
  let minDim = min(vw, vh); // 정사각형 한 변
  
  let sx = (vw - minDim) / 2;
  let sy = (vh - minDim) / 2;

  push();
  if (isFlipped) {
    translate(width, 0);
    scale(-1, 1);
  }
  // 캔버스(400x400)에 꽉 차게 중앙 크롭하여 그리기
  image(video, 0, 0, width, height, sx, sy, minDim, minDim);
  pop();
}

/* --- Bluetooth Logic --- */

async function connectBluetooth() {
  try {
    bluetoothDevice = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: "BBC micro:bit" }],
      optionalServices: [UART_SERVICE_UUID]
    });

    const server = await bluetoothDevice.gatt.connect();
    const service = await server.getPrimaryService(UART_SERVICE_UUID);
    rxCharacteristic = await service.getCharacteristic(UART_RX_CHARACTERISTIC_UUID);
    txCharacteristic = await service.getCharacteristic(UART_TX_CHARACTERISTIC_UUID);

    isConnected = true;
    bluetoothStatus = "연결됨: " + bluetoothDevice.name;
    updateBluetoothStatusUI(true);
    
  } catch (error) {
    console.error("Connection failed", error);
    bluetoothStatus = "연결 실패";
    updateBluetoothStatusUI(false, true);
  }
}

function disconnectBluetooth() {
  if (bluetoothDevice && bluetoothDevice.gatt.connected) {
    bluetoothDevice.gatt.disconnect();
  }
  isConnected = false;
  bluetoothStatus = "연결 해제됨";
  rxCharacteristic = null;
  txCharacteristic = null;
  bluetoothDevice = null;
  updateBluetoothStatusUI(false);
}

function updateBluetoothStatusUI(connected = false, error = false) {
  const statusElement = select('#bluetoothStatus');
  if(statusElement) {
      statusElement.html(`상태: ${bluetoothStatus}`);
      statusElement.removeClass('status-connected');
      statusElement.removeClass('status-error');
      
      if (connected) {
        statusElement.addClass('status-connected');
      } else if (error) {
        statusElement.addClass('status-error');
      }
  }
}

async function sendBluetoothData(data) {
  if (!rxCharacteristic || !isConnected) return;
  if (isSendingData) return;

  try {
    isSendingData = true;
    const encoder = new TextEncoder();
    await rxCharacteristic.writeValue(encoder.encode(data + "\n"));
  } catch (error) {
    console.error("Error sending data:", error);
  } finally {
    isSendingData = false;
  }
}
