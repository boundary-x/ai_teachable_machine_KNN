/*
 * Boundary X: AI Model Training (KNN)
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

// [전송 제어 변수]
let lastSentData = "";    // 마지막으로 보낸 데이터
let lastSentTime = 0;     // 마지막 전송 시간
const SEND_INTERVAL = 500; // 재전송 주기 (ms)

// ID Mapping System
let idToNameMap = {}; 


// DOM Elements
let classInput, addClassBtn, classListContainer, resetBtn;
let resultLabel, resultConfidence, btDataDisplay;
let cameraResultBadge; 
let flipButton, switchCameraButton, connectBluetoothButton, disconnectBluetoothButton;
let startRecognitionButton, stopRecognitionButton; 
let canvas;

// Camera
let facingMode = "user";
let isFlipped = false;
let isVideoLoaded = false;

function setup() {
  canvas = createCanvas(400, 400);
  canvas.parent('p5-container');
  
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
    video: { facingMode: facingMode },
    audio: false
  };
  video = createCapture(constraints);
  video.hide();

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
  classInput = select('#class-input');
  addClassBtn = select('#add-class-btn');
  classListContainer = select('#class-list');
  resetBtn = select('#reset-model-btn');
  
  resultLabel = select('#result-label');
  resultConfidence = select('#result-confidence');
  btDataDisplay = select('#bluetooth-data-display');
  cameraResultBadge = select('#camera-result-badge');

  addClassBtn.mousePressed(addNewClass);
  classInput.elt.addEventListener("keypress", (e) => {
      if (e.key === "Enter") addNewClass();
  });
  
  resetBtn.mousePressed(resetModel);

  // Camera Controls
  flipButton = createButton("좌우 반전");
  flipButton.parent('camera-control-buttons');
  flipButton.addClass('start-button');
  flipButton.mousePressed(() => isFlipped = !isFlipped);

  switchCameraButton = createButton("전후방 전환");
  switchCameraButton.parent('camera-control-buttons');
  switchCameraButton.addClass('start-button');
  switchCameraButton.mousePressed(switchCamera);

  // Bluetooth Controls
  connectBluetoothButton = createButton("기기 연결");
  connectBluetoothButton.parent('bluetooth-control-buttons');
  connectBluetoothButton.addClass('start-button');
  connectBluetoothButton.mousePressed(connectBluetooth);

  disconnectBluetoothButton = createButton("연결 해제");
  disconnectBluetoothButton.parent('bluetooth-control-buttons');
  disconnectBluetoothButton.addClass('stop-button');
  disconnectBluetoothButton.mousePressed(disconnectBluetooth);

  // Recognition Controls
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

// === Logic: Class Management (ID Recycling) ===


function getNextId() {
    let id = 1;
    while (idToNameMap.hasOwnProperty(String(id))) {
        id++;
    }
    return String(id);
}

function addNewClass() {
    const className = classInput.value().trim();
    if (className === "") {
        alert("이름을 입력해주세요.");
        return;
    }

    // [UPDATED] getNextId 함수를 사용하여 ID 생성
    const currentId = getNextId();
    idToNameMap[currentId] = className; 

    const row = createDiv('');
    row.addClass('train-btn-row');
    row.parent(classListContainer);

    // 버튼 생성 시 ID와 이름을 함께 표시
    const trainBtn = createButton(
        `<span class="id-badge">ID ${currentId}</span>
         <span class="train-text">${className}</span>`
    );
    trainBtn.addClass('train-btn');
    trainBtn.parent(row);
    
    const countBadge = createSpan('0 data');
    countBadge.addClass('train-count');
    countBadge.parent(trainBtn);

    trainBtn.mousePressed(() => {
        addExample(currentId); 
        trainBtn.style('background', '#e0e0e0');
        setTimeout(() => trainBtn.style('background', '#f8f9fa'), 100);
    });

    const delBtn = createButton('×');
    delBtn.addClass('delete-class-btn');
    delBtn.parent(row);
    delBtn.mousePressed(() => {
        if(confirm(`[ID ${currentId}: ${className}] 클래스를 삭제하시겠습니까?`)) {
            knnClassifier.clearLabel(currentId);
            delete idToNameMap[currentId]; // 맵에서 삭제하여 ID 반납
            row.remove();
        }
    });

    classInput.value('');
}

function addExample(labelId) {
    if (!isModelReady || !isVideoLoaded) return;
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
        // nextClassId 초기화 불필요 (getNextId가 알아서 1부터 찾음)
        lastSentData = "";
        
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
        
        // 전송 상태 초기화
        lastSentData = "";
        lastSentTime = 0;
        
        cameraResultBadge.style('display', 'block');
        cameraResultBadge.html('인식 중...');
        classify(); 
    }
}

function stopClassify() {
    isPredicting = false;
    resultLabel.html("중지됨");
    resultLabel.style('color', '#666');
    resultConfidence.html("");
    
    // 인식 중지 시 stop 신호 즉시 전송
    sendBluetoothData("stop");
    lastSentData = "stop";
    
    btDataDisplay.html("전송됨: stop");
    btDataDisplay.style('color', '#EA4335');

    if(cameraResultBadge) {
        cameraResultBadge.style('display', 'none');
        cameraResultBadge.removeClass('high-confidence');
    }
}

function classify() {
    if (!isPredicting) return;
    if (knnClassifier.getNumLabels() <= 0) return;
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
        const currentTime = millis();

        resultLabel.html(`ID ${labelId} (${name})`);
        resultLabel.style('color', '#000');
        resultConfidence.html(`정확도: ${confidence.toFixed(0)}%`);

        const badgeText = `ID ${labelId} (${name}) | ${confidence.toFixed(0)}%`;
        cameraResultBadge.html(badgeText);
        
        if (confidence > 60) {
            cameraResultBadge.addClass('high-confidence');
        } else {
            cameraResultBadge.removeClass('high-confidence');
        }

        // [Bluetooth Logic] Hybrid Transmission
        if (isPredicting) {
             let dataToSend = `ID${labelId}`;
             
             // 1. 정확도 50% 이상만 처리
             if (confidence > 50) {
                 // 2. (데이터가 변했거나) OR (마지막 전송 후 0.5초 지남)
                 if (dataToSend !== lastSentData || currentTime - lastSentTime > SEND_INTERVAL) {
                     
                     sendBluetoothData(dataToSend);
                     
                     lastSentData = dataToSend;
                     lastSentTime = currentTime;
                     
                     btDataDisplay.html(`전송됨: ${dataToSend}`);
                     btDataDisplay.style('color', '#0f0');
                 }
             }
        } 
    }

    if (isPredicting) {
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

  let vw = video.width;
  let vh = video.height;
  let minDim = min(vw, vh); 
  
  let sx = (vw - minDim) / 2;
  let sy = (vh - minDim) / 2;

  push();
  if (isFlipped) {
    translate(width, 0);
    scale(-1, 1);
  }
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
