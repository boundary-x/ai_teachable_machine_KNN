/*
 * Boundary X: AI Model Training (KNN) — ml5 0.12.2
 */
const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const UART_RX_CHARACTERISTIC_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
const SEND_INTERVAL = 500;
let bluetoothDevice = null, rxCharacteristic = null;
let isConnected = false, bluetoothStatus = "연결 대기 중";
let sendQueue = Promise.resolve();
let lastSentData = "", lastSentTime = 0;
let video, canvas, featureExtractor, knnClassifier;
let isModelReady = false, isVideoLoaded = false, isPredicting = false, isBusy = false;
let modelLoadFailed = false;
let predictionEpoch = 0, pendingPrediction = Promise.resolve();
let classIds = [], nextClassId = 1;
let isFlipped = false, facingMode = "user", cameraCheck;
let training;
const byId = id => document.getElementById(id);
const setText = (id, value) => { byId(id).textContent = value; };
function trainingStatus(message) { setText("training-status", message); }
function fileStatus(message) { setText("file-status", message); }

function setup() {
  canvas = createCanvas(400, 400);
  canvas.parent("p5-container");
  knnClassifier = ml5.KNNClassifier();
  createUI();
  setupCamera();
  featureExtractor = ml5.featureExtractor("MobileNet", { version: 1, alpha: 0.25 }, () => {
    isModelReady = true;
    updateReadyStatus();
  });
  featureExtractor.ready.catch(error => {
    console.error(error);
    isModelReady = false;
    modelLoadFailed = true;
    updateReadyStatus();
  });
}
function createUI() {
  training = TrainingInput.createController({
    collect: addExample,
    onStart: () => { if (isPredicting) stopClassify(); }
  });
  byId("add-class-btn").addEventListener("click", addNewClass);
  byId("reset-model-btn").addEventListener("click", resetModel);
  byId("download-model-btn").addEventListener("click", downloadModel);
  byId("share-model-btn").addEventListener("click", shareModel);
  byId("import-model-btn").addEventListener("click", () => {
    training.stop();
    byId("model-file-input").click();
  });
  byId("model-file-input").addEventListener("change", event => importModel(event.target.files[0]));
  const button = (text, parent, handler, className = "start-button", id) => {
    const element = document.createElement("button");
    element.type = "button";
    element.className = className;
    element.textContent = text;
    if (id) element.id = id;
    element.addEventListener("click", handler);
    byId(parent).appendChild(element);
  };
  button("좌우 반전", "camera-control-buttons", () => {
    training.stop(); stopClassify(); isFlipped = !isFlipped;
  });
  button("전후방 전환", "camera-control-buttons", switchCamera);
  button("기기 연결", "bluetooth-control-buttons", connectBluetooth);
  button("연결 해제", "bluetooth-control-buttons", disconnectBluetooth, "stop-button");
  button("인식 시작", "recognition-control-buttons", startClassify, "start-button", "start-recognition-btn");
  button("인식 중지", "recognition-control-buttons", stopClassify, "stop-button");
  const suspend = () => { training.stop(); stopClassify(); };
  window.addEventListener("blur", suspend);
  window.addEventListener("pagehide", suspend);
  document.addEventListener("visibilitychange", () => { if (document.hidden) suspend(); });
  const header = document.querySelector("header");
  const resizeHeader = () => document.documentElement.style.setProperty("--header-height", header.getBoundingClientRect().height + "px");
  new ResizeObserver(resizeHeader).observe(header);
  resizeHeader();
  updateControls();
}
function updateControls() {
  const ready = isModelReady && isVideoLoaded && !isBusy;
  document.querySelectorAll(".train-btn").forEach(button => { button.disabled = !ready; });
  document.querySelectorAll(".delete-class-btn, #add-class-btn, #reset-model-btn, #import-model-btn, #camera-control-buttons button")
    .forEach(button => { button.disabled = isBusy; });
  const hasSamples = knnClassifier.getNumLabels() > 0;
  byId("download-model-btn").disabled = isBusy || !hasSamples;
  byId("share-model-btn").disabled = isBusy || !hasSamples;
  byId("start-recognition-btn").disabled = !ready || !hasSamples;
}
function updateReadyStatus() {
  trainingStatus(modelLoadFailed
    ? "AI 모델을 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 새로고침해주세요."
    : isModelReady && isVideoLoaded
    ? "짧게 누르면 1개, 길게 누르면 연속 학습합니다."
    : !isVideoLoaded ? "카메라 권한과 연결을 확인해주세요. 카메라를 준비하고 있습니다."
    : "AI 모델을 불러오고 있습니다.");
  updateControls();
}
function setupCamera() {
  clearInterval(cameraCheck);
  isVideoLoaded = false;
  video = createCapture({ video: { facingMode }, audio: false });
  video.elt.setAttribute("playsinline", "");
  video.elt.muted = true;
  video.hide();
  cameraCheck = setInterval(() => {
    if (video && video.elt.readyState >= 2 && video.width > 0) {
      isVideoLoaded = true;
      clearInterval(cameraCheck);
      updateReadyStatus();
    }
  }, 100);
  updateControls();
}
function switchCamera() {
  if (isBusy) return;
  training.stop();
  stopClassify();
  clearInterval(cameraCheck);
  isVideoLoaded = false;
  if (video) {
    if (video.elt.srcObject) video.elt.srcObject.getTracks().forEach(track => track.stop());
    video.remove();
    video = null;
  }
  facingMode = facingMode === "user" ? "environment" : "user";
  setupCamera();
}
function addNewClass() {
  if (isBusy) return;
  if (classIds.length >= ModelFile.MAX_CLASSES || nextClassId >= Number.MAX_SAFE_INTEGER - 1) {
    trainingStatus("ID는 최대 100개까지 추가할 수 있습니다."); return;
  }
  const id = String(nextClassId++);
  classIds.push(id);
  renderClass(id);
  updateControls();
}
function renderClass(id) {
  const row = document.createElement("div");
  row.className = "train-btn-row";
  row.dataset.id = id;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "train-btn";
  button.dataset.id = id;
  button.setAttribute("aria-label", "ID" + id + " 학습: 짧게 누르면 1개, 길게 누르면 연속 수집");
  for (const [className, text] of [["id-badge", "ID" + id], ["train-text", "학습하기"], ["train-count", "0개"]]) {
    const span = document.createElement("span");
    span.className = className; span.textContent = text; button.appendChild(span);
  }
  training.bind(button, id);
  row.appendChild(button);
  const remove = document.createElement("button");
  remove.type = "button"; remove.className = "delete-class-btn"; remove.textContent = "×";
  remove.setAttribute("aria-label", "ID" + id + " 삭제");
  remove.addEventListener("click", () => deleteClass(id));
  row.appendChild(remove);
  byId("class-list").appendChild(row);
  updateButtonCount(id);
}
function updateButtonCount(id) {
  const button = document.querySelector('.train-btn[data-id="' + id + '"]');
  if (button) button.querySelector(".train-count").textContent = (knnClassifier.getCountByLabel()[id] || 0) + "개";
}
function addExample(id) {
  if (isBusy || !isModelReady || !isVideoLoaded || !video || !classIds.includes(id)) return false;
  if (isPredicting) stopClassify();
  const counts = knnClassifier.getCountByLabel();
  if ((counts[id] || 0) >= ModelFile.MAX_PER_CLASS ||
      Object.values(counts).reduce((sum, count) => sum + count, 0) >= ModelFile.MAX_SAMPLES) {
    trainingStatus("학습 한도에 도달했습니다. ID당 500개, 전체 2,000개까지 수집할 수 있습니다.");
    return false;
  }
  let features;
  try {
    draw();
    features = featureExtractor.infer(canvas);
    knnClassifier.addExample(features, id);
    updateButtonCount(id);
    updateControls();
    trainingStatus("ID" + id + " · " + knnClassifier.getCountByLabel()[id] + "개 수집됨");
    return true;
  } catch (error) {
    console.error(error);
    trainingStatus("샘플 수집에 실패했습니다. 카메라 상태를 확인해주세요.");
    return false;
  } finally {
    if (features) features.dispose();
  }
}
async function pauseForChange() {
  training.stop();
  stopClassify();
  await pendingPrediction;
}
async function deleteClass(id) {
  if (isBusy) return;
  training.stop();
  if (!confirm("ID" + id + "와 해당 학습 데이터를 삭제할까요?")) return;
  isBusy = true; updateControls();
  try {
    await pauseForChange();
    if (knnClassifier.getCountByLabel()[id]) knnClassifier.clearLabel(id);
    classIds = classIds.filter(item => item !== id);
    document.querySelector('.train-btn-row[data-id="' + id + '"]').remove();
    setText("result-label", "데이터 변경됨");
    trainingStatus("ID" + id + "를 삭제했습니다. 다른 ID 번호는 유지됩니다.");
  } finally { isBusy = false; updateControls(); }
}
async function resetModel() {
  if (isBusy) return;
  training.stop();
  if (!confirm("모든 ID와 학습 데이터를 초기화할까요?")) return;
  isBusy = true; updateControls();
  try {
    await pauseForChange();
    knnClassifier.clearAllLabels();
    classIds = []; nextClassId = 1;
    byId("class-list").replaceChildren();
    setText("result-label", "데이터 없음");
    trainingStatus("초기화했습니다. ID1부터 추가할 수 있습니다.");
    fileStatus("학습한 뒤 모델을 다운로드하거나 공유하세요.");
  } finally { isBusy = false; updateControls(); }
}
function makeModelFile() {
  training.stop();
  const model = ModelFile.serialize(knnClassifier, classIds, nextClassId, isFlipped);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = new File([JSON.stringify(model)], "boundary-x-knn-" + stamp + ".json", { type: "application/json" });
  if (file.size > ModelFile.MAX_BYTES) throw new Error("파일이 32MB를 초과합니다. 학습 데이터를 줄여주세요.");
  return file;
}
function downloadFile(file) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url; link.download = file.name; link.hidden = true;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function downloadModel() {
  if (isBusy) return;
  try {
    downloadFile(makeModelFile());
    fileStatus("JSON 다운로드를 요청했습니다. 브라우저의 다운로드 또는 파일 앱을 확인해주세요.");
  } catch (error) { fileStatus(error.message); }
}
async function shareModel() {
  if (isBusy) return;
  try {
    // Synchronous file construction preserves the click's user activation for share().
    const file = makeModelFile();
    if (!navigator.share || !navigator.canShare || !navigator.canShare({ files: [file] })) {
      downloadFile(file);
      fileStatus("이 브라우저는 JSON 파일 공유를 지원하지 않아 다운로드했습니다. 파일을 메일 등에 첨부해주세요.");
      return;
    }
    isBusy = true; updateControls();
    await navigator.share({ files: [file], title: "Boundary X 학습 모델" });
    fileStatus("공유 앱에 파일을 전달했습니다. 최종 전송 여부는 선택한 앱에서 확인해주세요.");
  } catch (error) {
    fileStatus(error.name === "AbortError" ? "공유를 취소했습니다."
      : "파일을 공유하지 못했습니다. ‘모델 다운로드’로 저장한 뒤 첨부해주세요.");
  } finally { isBusy = false; updateControls(); }
}
async function importModel(file) {
  if (!file || isBusy) return;
  isBusy = true; training.stop(); updateControls();
  let candidate = null;
  try {
    if (file.size > ModelFile.MAX_BYTES) throw new Error("32MB 이하의 JSON 파일을 선택해주세요.");
    const model = ModelFile.parse(await file.text());
    if (classIds.length && !confirm("가져오면 현재 ID와 학습 데이터를 교체합니다. 계속할까요?")) {
      fileStatus("가져오기를 취소했습니다. 기존 데이터는 유지됩니다."); return;
    }
    fileStatus("모델을 가져오고 있습니다.");
    await pauseForChange();
    candidate = ml5.KNNClassifier();
    await ModelFile.restore(candidate, model, ml5.tf);
    const previous = knnClassifier;
    knnClassifier = candidate; candidate = null;
    classIds = model.classes.map(entry => entry.id);
    nextClassId = model.nextClassId;
    isFlipped = model.settings.isFlipped;
    byId("class-list").replaceChildren();
    classIds.forEach(renderClass);
    previous.dispose();
    setText("result-label", "모델 준비됨");
    setText("result-confidence", "");
    const total = Object.values(knnClassifier.getCountByLabel()).reduce((a, b) => a + b, 0);
    fileStatus(classIds.length + "개 ID · " + total + "개 샘플을 가져왔습니다. 인식 시작을 눌러주세요.");
    updateReadyStatus();
  } catch (error) {
    console.error(error);
    fileStatus("가져오기 실패: " + error.message);
  } finally {
    if (candidate) candidate.dispose();
    byId("model-file-input").value = "";
    isBusy = false; updateControls();
  }
}
function startClassify() {
  if (isPredicting || isBusy || !isModelReady || !isVideoLoaded || !knnClassifier.getNumLabels()) return;
  training.stop();
  isPredicting = true;
  const epoch = ++predictionEpoch;
  lastSentData = ""; lastSentTime = 0;
  byId("camera-result-badge").style.display = "block";
  setText("camera-result-badge", "인식 중...");
  pendingPrediction.then(() => { if (isPredicting && epoch === predictionEpoch) classify(epoch); });
}
function stopClassify() {
  const wasPredicting = isPredicting;
  isPredicting = false; predictionEpoch++;
  if (wasPredicting) {
    setText("result-label", "중지됨");
    setText("result-confidence", "");
    transmit("stop", predictionEpoch);
  }
  byId("camera-result-badge").style.display = "none";
}
function classify(epoch) {
  if (!isPredicting || epoch !== predictionEpoch) return;
  pendingPrediction = (async () => {
    let features;
    try {
      if (!isVideoLoaded || !video || !knnClassifier.getNumLabels()) { stopClassify(); return; }
      features = featureExtractor.infer(canvas);
      const result = await knnClassifier.classify(features);
      if (!isPredicting || epoch !== predictionEpoch) return;
      const id = result.label;
      if (!classIds.includes(id)) return;
      const confidence = result.confidencesByLabel[id] * 100;
      setText("result-label", "ID" + id);
      setText("result-confidence", "신뢰도: " + confidence.toFixed(0) + "%");
      setText("camera-result-badge", "ID" + id + " | " + confidence.toFixed(0) + "%");
      if (confidence > 50 && ("ID" + id !== lastSentData || Date.now() - lastSentTime > SEND_INTERVAL)) {
        await transmit("ID" + id, epoch);
      }
    } catch (error) {
      console.error(error);
      if (epoch === predictionEpoch) { stopClassify(); trainingStatus("인식에 실패했습니다. 카메라와 학습 데이터를 확인해주세요."); }
    } finally { if (features) features.dispose(); }
    if (isPredicting && epoch === predictionEpoch) requestAnimationFrame(() => classify(epoch));
  })();
}
function draw() {
  background(0);
  if (!isVideoLoaded || !video || video.width === 0) {
    fill(255); textAlign(CENTER); text("카메라 로딩 중...", width / 2, height / 2); return;
  }
  const size = min(video.width, video.height);
  push();
  if (isFlipped) { translate(width, 0); scale(-1, 1); }
  image(video, 0, 0, width, height, (video.width - size) / 2, (video.height - size) / 2, size, size);
  pop();
}
async function connectBluetooth() {
  try {
    if (!navigator.bluetooth) throw new Error("이 브라우저는 블루투스 연결을 지원하지 않습니다.");
    if (bluetoothDevice && bluetoothDevice.gatt.connected) return;
    bluetoothDevice = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: "BBC micro:bit" }], optionalServices: [UART_SERVICE_UUID]
    });
    bluetoothDevice.addEventListener("gattserverdisconnected", disconnected);
    const server = await bluetoothDevice.gatt.connect();
    const service = await server.getPrimaryService(UART_SERVICE_UUID);
    rxCharacteristic = await service.getCharacteristic(UART_RX_CHARACTERISTIC_UUID);
    isConnected = true; bluetoothStatus = "연결됨: " + bluetoothDevice.name;
    lastSentData = ""; updateBluetoothStatusUI();
  } catch (error) {
    bluetoothStatus = "연결 실패: " + error.message;
    updateBluetoothStatusUI();
  }
}
function disconnected() {
  isConnected = false; rxCharacteristic = null;
  bluetoothStatus = "연결 해제됨";
  updateBluetoothStatusUI();
  setText("bluetooth-data-display", "전송 대기: 기기 연결 필요");
}
function disconnectBluetooth() {
  if (bluetoothDevice && bluetoothDevice.gatt.connected) bluetoothDevice.gatt.disconnect();
  disconnected();
  bluetoothDevice = null;
}
function updateBluetoothStatusUI() {
  setText("bluetoothStatus", "상태: " + bluetoothStatus);
  byId("bluetoothStatus").classList.toggle("status-connected", isConnected);
}
function transmit(data, epoch) {
  const target = rxCharacteristic;
  // Serialize writes, preserving stop after an in-flight UART write.
  const operation = sendQueue.then(async () => {
    if (data !== "stop" && epoch !== predictionEpoch) return;
    if (!isConnected || !target || target !== rxCharacteristic) {
      setText("bluetooth-data-display", "전송 대기: 기기 연결 필요"); return;
    }
    try {
      await target.writeValue(new TextEncoder().encode(data + "\n"));
      if (epoch !== predictionEpoch) return;
      lastSentData = data; lastSentTime = Date.now();
      setText("bluetooth-data-display", "전송됨: " + data);
    } catch (error) {
      if (epoch === predictionEpoch) setText("bluetooth-data-display", "전송 실패: 연결을 확인해주세요.");
    }
  });
  sendQueue = operation.catch(() => {});
  return operation;
}
