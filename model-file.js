/* File format for the pinned ml5 0.12.2 MobileNet/KNN implementation. */
(function (root) {
  "use strict";
  const FORMAT = "boundary-x-knn";
  const MAX_BYTES = 32 * 1024 * 1024;
  const MAX_CLASSES = 100;
  const MAX_PER_CLASS = 500;
  const MAX_SAMPLES = 2000;
  const FEATURES = 256;
  const ENGINE = Object.freeze({
    library: "ml5", version: "0.12.2", model: "MobileNet",
    modelVersion: 1, alpha: 0.25, features: FEATURES,
    embedding: "module_apply_default/MobilenetV1/Logits/global_pool",
    preprocessing: "center-square-400-to-224-v1", k: 3
  });
  function check(ok, message) {
    if (!ok) throw new Error(message);
  }
  function validate(file) {
    check(file && file.format === FORMAT && file.version === 1,
      "이 앱에서 내보낸 모델 JSON(버전 1)을 선택해주세요.");
    check(file.engine && Object.keys(ENGINE).every(key => file.engine[key] === ENGINE[key]),
      "현재 앱과 특징 추출 모델 또는 설정이 다른 파일입니다.");
    check(file.settings && typeof file.settings.isFlipped === "boolean", "좌우 반전 설정이 올바르지 않습니다.");
    check(Array.isArray(file.classes) && file.classes.length > 0 && file.classes.length <= MAX_CLASSES,
      "클래스 목록이 올바르지 않습니다.");
    let total = 0;
    let maxId = 0;
    const ids = new Set();
    for (const entry of file.classes) {
      check(entry && typeof entry.id === "string" && /^[1-9]\d*$/.test(entry.id) &&
        Number.isSafeInteger(Number(entry.id)), "ID가 올바르지 않습니다.");
      check(!ids.has(entry.id), "중복된 ID가 있습니다.");
      ids.add(entry.id);
      maxId = Math.max(maxId, Number(entry.id));
      check(Array.isArray(entry.shape) && entry.shape.length === 2 &&
        Number.isInteger(entry.shape[0]) && entry.shape[0] >= 0 &&
        entry.shape[0] <= MAX_PER_CLASS && entry.shape[1] === FEATURES,
        "학습 데이터의 크기가 올바르지 않습니다.");
      check(entry.dtype === "float32" && Array.isArray(entry.data) &&
        entry.data.length === entry.shape[0] * FEATURES, "학습 데이터가 누락되었거나 손상되었습니다.");
      total += entry.shape[0];
      check(total <= MAX_SAMPLES, "전체 샘플은 2,000개까지 가져올 수 있습니다.");
      for (let row = 0; row < entry.shape[0]; row++) {
        let norm = 0;
        for (let col = 0; col < FEATURES; col++) {
          const value = entry.data[row * FEATURES + col];
          check(typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 1.001,
            "학습 데이터에 올바르지 않은 숫자가 있습니다.");
          norm += value * value;
        }
        check(Math.abs(norm - 1) < 0.01, "학습 특징 데이터가 손상되었습니다.");
      }
    }
    check(total > 0, "학습 샘플이 없는 파일입니다.");
    check(Number.isSafeInteger(file.nextClassId) && file.nextClassId > maxId &&
      file.nextClassId < Number.MAX_SAFE_INTEGER, "다음 ID 번호가 올바르지 않습니다.");
    return file;
  }
  function serialize(classifier, ids, nextClassId, isFlipped) {
    const dataset = classifier.getClassifierDataset();
    // ml5 0.12.2 stores tensors by internal index, NOT by the displayed ID.
    // Keep this version-specific translation in this adapter, including gaps after deletion.
    const labels = classifier.mapStringToIndex;
    const classes = ids.map(id => {
      const tensor = dataset[labels.indexOf(id)];
      return {
        id, shape: tensor ? Array.from(tensor.shape) : [0, FEATURES],
        dtype: "float32", data: tensor ? Array.from(tensor.dataSync()) : []
      };
    });
    return validate({
      format: FORMAT, version: 1, createdAt: new Date().toISOString(),
      engine: { ...ENGINE }, settings: { isFlipped }, nextClassId, classes
    });
  }
  async function restore(classifier, file, tf) {
    validate(file);
    let loaded = 0;
    // ml5.load()/setClassifierDataset() do not rebuild the underlying KNN label
    // metadata reliably. Replay saved features (no camera/model inference) through
    // addExample so both ml5 and tfjs initialize their label mappings.
    for (const entry of file.classes) {
      for (let row = 0; row < entry.shape[0]; row++) {
        const tensor = tf.tensor2d(entry.data.slice(row * FEATURES, (row + 1) * FEATURES), [1, FEATURES]);
        try { classifier.addExample(tensor, entry.id); }
        finally { tensor.dispose(); }
        if (++loaded % 25 === 0) await tf.nextFrame();
      }
    }
    return classifier;
  }
  function parse(text) {
    let file;
    try { file = JSON.parse(text); }
    catch (_) { throw new Error("JSON 파일을 읽을 수 없습니다. 파일이 손상되었는지 확인해주세요."); }
    return validate(file);
  }
  const api = { serialize, restore, validate, parse, ENGINE, MAX_BYTES, MAX_CLASSES, MAX_PER_CLASS, MAX_SAMPLES };
  root.ModelFile = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
