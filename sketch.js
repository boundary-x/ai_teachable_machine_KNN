/**
 * Boundary X: AI Model Training (KNN Version)
 * 1. 즉시 반응: 결과가 바뀌면 0초 만에 바로 전송 (딜레이 없음)
 * 2. 안전 장치: 같은 결과가 유지되더라도 0.5초(500ms)마다 재전송 (데이터 유실 방지)
 * 3. 스팸 방지: 정확도(Confidence)가 낮으면 전송 안 함
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

// [핵심] 전송 제어 변수
let lastSentData = "";    // 마지막으로 보낸 데이터 내용
let lastSentTime = 0;     // 마지막으로 보낸 시간 (millis)
const SEND_INTERVAL = 500; // 재전송 주기 (ms) - 0.5초

// ID Mapping System
let nextClassId = 1; 
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
    }
  }, 100);
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
  resetBtn.mousePressed(resetModel);

  // 카메라 컨트롤
  flipButton = createButton("좌우 반전");
  flipButton.parent('camera-control-buttons');
  flipButton.addClass('start-button');
  flipButton.mousePressed(() => isFlipped = !isFlipped);

  switchCameraButton = createButton("전후방 전환");
  switchCameraButton.parent('camera-control-buttons');
  switchCameraButton.addClass('start-button');
  switchCameraButton.mousePressed(switchCamera);

  // 블루투스 컨트롤
  connectBluetoothButton = createButton("기기 연결");
  connectBluetoothButton.parent('bluetooth-control-buttons');
  connectBluetoothButton.addClass('start-button');
  connectBluetoothButton.mousePressed(connectBluetooth);

  disconnectBluetoothButton = createButton("연결 해제");
  disconnectBluetoothButton.parent('bluetooth-control-buttons');
  disconnectBluetoothButton.addClass('stop-button');
  disconnectBluetoothButton.mousePressed(disconnectBluetooth);

  // 인식 제어
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
  if (video) {
      if (video.elt.srcObject) video.elt.srcObject.getTracks().forEach(track => track.stop());
      video.remove();
  }
  isVideoLoaded = false;
  facingMode = facingMode === "user" ? "environment" : "user";
  setTimeout(setupCamera, 500);
}

// === Logic: Class Management ===
function addNewClass() {
    const className = classInput.value().trim();
    if (className === "") return alert("이름을 입력해주세요.");

    const currentId = String(nextClassId++);
    idToNameMap[currentId] = className;

    const row = createDiv('').addClass('train-btn-row').parent(classListContainer);
    const trainBtn = createButton(`<span class="id-badge">ID ${currentId}</span><span class="train-text">${className}</span>`).addClass('train-btn').parent(row);
    const countBadge = createSpan('0 data').addClass('train-count').parent(trainBtn);

    trainBtn.mousePressed(() => {
        addExample(currentId);
        trainBtn.style('background', '#e0e0e0');
        setTimeout(() => trainBtn.style('background', '#f8f9fa'), 100);
    });

    const delBtn = createButton('×').addClass('delete-class-btn').parent(row);
    delBtn.mousePressed(() => {
        if(confirm(`[ID ${currentId}: ${className}] 클래스를 삭제하시겠습니까?`)) {
            knnClassifier.clearLabel(currentId);
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
        nextClassId = 1;
        lastSentData = ""; 
        classListContainer.html('');
        stopClassify();
    }
}

// === Logic: Classification Control ===
function startClassify() {
    if (knnClassifier.getNumLabels() <= 0) return alert("먼저 학습 데이터를 추가해주세요!");
    if (!isPredicting) {
        isPredicting = true;
        lastSentData = ""; // 초기화
        lastSentTime = 0;  // 시간 초기화
        cameraResultBadge.style('display', 'block');
        classify();
    }
}

function stopClassify() {
    isPredicting = false;
    resultLabel.html("중지됨");
    
    sendBluetoothData("stop");
    lastSentData = "stop"; 
    
    btDataDisplay.html("전송됨: stop");
    if(cameraResultBadge) cameraResultBadge.style('display', 'none');
}

function classify() {
    if (!isPredicting) return;
    const features = featureExtractor.infer(canvas);
    knnClassifier.classify(features, gotResults);
}

function gotResults(error, result) {
    if (error) return console.error(error);

    if (result.confidencesByLabel) {
        const labelId = result.label;
        const confidence = result.confidencesByLabel[labelId] * 100;
        const name = idToNameMap[labelId] || "알 수 없음";
        const currentTime = millis(); // 현재 시간 측정

        resultLabel.html(`ID ${labelId} (${name})`);
        resultConfidence.html(`정확도: ${confidence.toFixed(0)}%`);
        cameraResultBadge.html(`ID ${labelId} (${name}) | ${confidence.toFixed(0)}%`);
        
        if (isPredicting) {
             let dataToSend = `ID${labelId}`;
             
             
             if (confidence > 50) {
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

    if (isPredicting) requestAnimationFrame(classify);
}

function draw() {
  background(0);
  if (!isVideoLoaded) return;

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
    
    isConnected = true;
    bluetoothStatus = "연결됨: " + bluetoothDevice.name;
    updateBluetoothStatusUI(true);
  } catch (error) {
    bluetoothStatus = "연결 실패";
    updateBluetoothStatusUI(false, true);
  }
}

function disconnectBluetooth() {
  if (bluetoothDevice && bluetoothDevice.gatt.connected) bluetoothDevice.gatt.disconnect();
  isConnected = false;
  bluetoothStatus = "연결 해제됨";
  updateBluetoothStatusUI(false);
}

function updateBluetoothStatusUI(connected = false, error = false) {
  const statusElement = select('#bluetoothStatus');
  if(statusElement) {
      statusElement.html(`상태: ${bluetoothStatus}`);
      statusElement.class(connected ? 'status-connected' : (error ? 'status-error' : ''));
  }
}

async function sendBluetoothData(data) {
  if (!rxCharacteristic || !isConnected || isSendingData) return;
  try {
    isSendingData = true;
    const encoder = new TextEncoder();
    await rxCharacteristic.writeValue(encoder.encode(data + "\n"));
  } catch (error) {
    console.error("Error:", error);
  } finally {
    isSendingData = false;
  }
}
