const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const artifacts = process.env.TEST_ARTIFACTS || path.join(root, "test-results");
fs.mkdirSync(artifacts,{recursive:true});
const server = http.createServer((req,res)=>{
  const url = decodeURIComponent(req.url.split("?")[0]);
  const target = path.join(root, url === "/" ? "/index.html" : url);
  if(!target.startsWith(root+path.sep)) { res.writeHead(403);res.end();return; }
  fs.readFile(target,(err,buf)=>{ if(err){res.writeHead(404);res.end();return;}
    res.setHeader("Content-Type",target.endsWith(".js")?"application/javascript":target.endsWith(".css")?"text/css":"text/html");res.end(buf); });
});
const checks=[];
function pass(name){checks.push(name); console.log("PASS",name);}
(async()=>{
  await new Promise(r=>server.listen(0,"127.0.0.1",r));
  const browser = await chromium.launch({
    ...(process.env.BROWSER_CHANNEL ? {channel:process.env.BROWSER_CHANNEL} : {}),
    headless:true, args:["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream"]
  });
  try {
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const errors=[];
    page.on("pageerror",e=>errors.push(e.message));
    await page.goto("http://127.0.0.1:"+server.address().port,{waitUntil:"networkidle",timeout:60000});
    await page.waitForFunction(()=>isModelReady && isVideoLoaded,null,{timeout:60000});
    assert.equal(await page.evaluate(()=>ml5.version),"0.12.2");
    pass("Real ml5 0.12.2 + MobileNet + simulated camera load");
    page.on("dialog",dialog=>dialog.accept());

    await page.locator("#add-class-btn").click();
    const train=page.locator('.train-btn[data-id="1"]');
    await train.click();
    assert.equal(await page.evaluate(()=>knnClassifier.getCountByLabel()["1"]),1);
    pass("Mouse tap adds exactly one sample (no click duplication)");
    await train.focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.evaluate(()=>knnClassifier.getCountByLabel()["1"]),2);
    pass("Keyboard activation adds one sample");

    await train.scrollIntoViewIfNeeded();
    let rect=await train.boundingBox();
    await page.mouse.move(rect.x+20,rect.y+20);
    await page.mouse.down();
    await page.waitForTimeout(850);
    await page.mouse.up();
    const held=await page.evaluate(()=>knnClassifier.getCountByLabel()["1"]);
    assert.ok(held>=4,"Hold should collect repeatedly");
    await page.waitForTimeout(500);
    assert.equal(await page.evaluate(()=>knnClassifier.getCountByLabel()["1"]),held);
    pass("Hold repeats and release stops without an extra sample");

    await train.dispatchEvent("pointerdown",{pointerId:1,pointerType:"mouse",isPrimary:true,button:0,clientX:rect.x+20,clientY:rect.y+20});
    await train.dispatchEvent("pointercancel",{pointerId:1});
    await page.waitForTimeout(450);
    assert.equal(await page.evaluate(()=>knnClassifier.getCountByLabel()["1"]),held);
    pass("Pointer cancellation stops collection");

    // Real Touch events, delivered through Chromium's input protocol.
    const cdp=await page.context().newCDPSession(page);
    const point={x:Math.round(rect.x+20),y:Math.round(rect.y+20)};
    await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[point]});
    await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(()=>knnClassifier.getCountByLabel()["1"]),held+1);
    await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[point]});
    await page.waitForTimeout(750);
    await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
    const touchHeld=await page.evaluate(()=>knnClassifier.getCountByLabel()["1"]);
    assert.ok(touchHeld>=held+3);
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(()=>knnClassifier.getCountByLabel()["1"]),touchHeld);
    pass("Touch tap and touch hold work without synthetic-mouse duplicates");

    await page.locator("#add-class-btn").click();
    await page.locator("#add-class-btn").click();
    await page.locator("#add-class-btn").click(); // empty ID4 must survive export
    await page.evaluate(()=>{
      addExample("2"); addExample("3");
    });
    await page.locator('.train-btn-row[data-id="2"] .delete-class-btn').click();
    await page.waitForFunction(()=>!classIds.includes("2"));
    await page.locator("#add-class-btn").click();
    assert.deepEqual(await page.evaluate(()=>classIds),["1","3","4","5"]);
    pass("Deleted IDs are not recycled; empty classes are retained");
    const roundtrip = await page.evaluate(async()=>{
      isFlipped=true;
      const features=featureExtractor.infer(canvas);
      try {
        const before=await knnClassifier.classify(features);
        const exported=ModelFile.serialize(knnClassifier,classIds,nextClassId,isFlipped);
        const copy=ml5.KNNClassifier();
        try {
          await ModelFile.restore(copy, JSON.parse(JSON.stringify(exported)), ml5.tf);
          const after=await copy.classify(features);
          return {before,after,shape:exported.classes[0].shape,counts:copy.getCountByLabel(),original:knnClassifier.getCountByLabel()};
        } finally {copy.dispose();}
      } finally {features.dispose();}
    });
    assert.equal(roundtrip.before.label,roundtrip.after.label);
    assert.deepEqual(roundtrip.before.confidencesByLabel,roundtrip.after.confidencesByLabel);
    assert.deepEqual(roundtrip.counts,roundtrip.original);
    assert.equal(roundtrip.shape[1],256);
    pass("Real KNN round trip preserves labels, confidence and counts after internal-index gaps");

    const downloadPromise=page.waitForEvent("download");
    await page.locator("#download-model-btn").click();
    const download=await downloadPromise;
    const modelPath=path.join(artifacts,"roundtrip.json");
    await download.saveAs(modelPath);
    const model=JSON.parse(fs.readFileSync(modelPath,"utf8"));
    assert.equal(model.format,"boundary-x-knn");
    assert.equal(model.settings.isFlipped,true);
    assert.deepEqual(model.classes.map(c=>c.id),["1","3","4","5"]);
    pass("JSON download contains model, ID sequence and mirror setting");

    await page.locator("#reset-model-btn").click();
    await page.waitForFunction(()=>classIds.length===0);
    await page.locator("#model-file-input").setInputFiles(modelPath);
    await page.waitForFunction(()=>!isBusy && classIds.length===4);
    assert.deepEqual(await page.evaluate(()=>knnClassifier.getCountByLabel()),roundtrip.counts);
    assert.equal(await page.evaluate(()=>isFlipped),true);
    await page.locator("#add-class-btn").click();
    assert.equal(await page.evaluate(()=>classIds.at(-1)),"6");
    pass("File import restores counts, empty IDs, mirror and next ID");

    const beforeInvalid=await page.evaluate(()=>JSON.stringify(ModelFile.serialize(knnClassifier,classIds,nextClassId,isFlipped)));
    const invalidCases=[
      ["malformed","{"],
      ["wrong-version",JSON.stringify({...model,version:999})],
      ["wrong-engine",JSON.stringify({...model,engine:{...model.engine,features:1024}})],
      ["duplicate-id",JSON.stringify({...model,classes:[model.classes[0],model.classes[0]]})],
      ["wrong-shape",JSON.stringify({...model,classes:[{...model.classes[0],shape:[1,1]}]})],
      ["non-finite",JSON.stringify({...model,classes:[{...model.classes[0],data:model.classes[0].data.map((v,i)=>i===0?null:v)}]})],
      ["wrong-next-id",JSON.stringify({...model,nextClassId:1})]
    ];
    for(const [name,text] of invalidCases){
      await page.locator("#model-file-input").setInputFiles({name:name+".json",mimeType:"application/json",buffer:Buffer.from(text)});
      await page.waitForFunction(()=>!isBusy);
      assert.match(await page.locator("#file-status").textContent(),/실패/);
      const after=await page.evaluate(()=>ModelFile.serialize(knnClassifier,classIds,nextClassId,isFlipped));
      const before=JSON.parse(beforeInvalid); delete before.createdAt; delete after.createdAt;
      assert.deepEqual(after,before);
    }
    pass("Malformed/incompatible/duplicate/invalid-data files leave existing model unchanged");

    await page.evaluate(()=>{
      window.originalFactory=ml5.KNNClassifier;
      ml5.KNNClassifier=()=>({addExample:()=>{throw new Error("simulated load failure");},dispose:()=>{}});
    });
    await page.locator("#model-file-input").setInputFiles(modelPath);
    await page.waitForFunction(()=>!isBusy);
    assert.match(await page.locator("#file-status").textContent(),/simulated load failure/);
    assert.equal(await page.evaluate(()=>classIds.at(-1)),"6");
    await page.evaluate(()=>{ml5.KNNClassifier=window.originalFactory;});
    pass("Classifier-load failure leaves the previous model usable");

    // Mock only the OS share boundary: never send files to a real app.
    await page.evaluate(()=>{
      Object.defineProperty(navigator,"canShare",{configurable:true,value:()=>false});
    });
    const fallbackDownload=page.waitForEvent("download");
    await page.locator("#share-model-btn").click();
    await fallbackDownload;
    assert.match(await page.locator("#file-status").textContent(),/지원하지 않아/);
    pass("Unsupported file sharing falls back to JSON download");
    await page.evaluate(()=>{
      Object.defineProperty(navigator,"canShare",{configurable:true,value:()=>true});
      Object.defineProperty(navigator,"share",{configurable:true,value:async payload=>{
        window.shared={name:payload.files[0].name,type:payload.files[0].type,size:payload.files[0].size,active:navigator.userActivation.isActive};
      }});
    });
    await page.locator("#share-model-btn").click();
    assert.ok(await page.evaluate(()=>window.shared.active && window.shared.type==="application/json" && window.shared.size>0));
    assert.match(await page.locator("#file-status").textContent(),/공유 앱에/);
    pass("Supported share receives JSON File while user activation is active");
    await page.evaluate(()=>Object.defineProperty(navigator,"share",{configurable:true,value:async()=>{throw new DOMException("cancel","AbortError");}}));
    await page.locator("#share-model-btn").click();
    assert.match(await page.locator("#file-status").textContent(),/취소/);
    assert.equal(await page.locator("#download-model-btn").isEnabled(),true);
    pass("Share cancellation restores controls");

    // Test real inference cancellation and repeated start/stop.
    await page.evaluate(()=>{startClassify();stopClassify();startClassify();});
    await page.waitForFunction(()=>document.getElementById("result-label").textContent.startsWith("ID"));
    await page.evaluate(()=>stopClassify());
    await page.waitForTimeout(300);
    assert.equal(await page.locator("#result-label").textContent(),"중지됨");
    pass("Stopped inference cannot overwrite the stopped UI");

    const memory=await page.evaluate(async()=>{
      await pendingPrediction;
      for(let i=0;i<10;i++) addExample("1");
      const before=ml5.tf.memory().numTensors;
      for(let i=0;i<40;i++) addExample("1");
      const after=ml5.tf.memory().numTensors;
      return {before,after};
    });
    assert.ok(memory.after-memory.before<=2,JSON.stringify(memory));
    pass("40 additional samples do not leak temporary tensors");

    // Stop must survive repeated stop/blur while a UART write is pending.
    const writes=await page.evaluate(async()=>{
      const values=[];
      isConnected=true;
      rxCharacteristic={writeValue:async bytes=>{await new Promise(r=>setTimeout(r,20));values.push(new TextDecoder().decode(bytes));}};
      isPredicting=true;
      const first=transmit("ID1",predictionEpoch);
      await new Promise(r=>setTimeout(r,1));
      stopClassify();stopClassify();
      await first;await sendQueue;
      isConnected=false;rxCharacteristic=null;
      return values;
    });
    assert.deepEqual(writes,["ID1\n","stop\n"]);
    pass("Queued UART stop survives repeated cancellation; writes remain ordered");

    for(const [width,height] of [[320,740],[360,800],[390,844],[430,932],[768,1024],[844,390],[1280,900]]){
      await page.setViewportSize({width,height});
      await page.evaluate(()=>window.scrollTo(0,0));
      await page.waitForTimeout(400);
      const layout=await page.evaluate(()=>{
        const header=document.querySelector("header").getBoundingClientRect();
        const button=document.querySelector(".back-button");
        const br=button.getBoundingClientRect();
        const range=document.createRange();range.selectNodeContents(button);
        const camera=document.querySelector(".canvas-container").getBoundingClientRect();
        const labelRange=document.createRange();
        labelRange.selectNodeContents(document.querySelector(".train-text"));
        const trainRect=document.querySelector(".train-btn").getBoundingClientRect();
        const labelRect=document.querySelector(".train-text").getBoundingClientRect();
        return {overflow:document.documentElement.scrollWidth>innerWidth,
          lines:range.getClientRects().length,within:br.right<=innerWidth && br.left>=0,
          cameraBelow:camera.top>=header.bottom-1,
          trainingLines:labelRange.getClientRects().length,
          trainingWithin:labelRect.bottom<=trainRect.bottom && labelRect.right<=trainRect.right};
      });
      assert.equal(layout.overflow,false,width+"px overflow");
      assert.equal(layout.lines,1,width+"px back button wraps");
      assert.ok(layout.within && layout.cameraBelow,width+"px overlap");
      assert.equal(layout.trainingLines,1,width+"px training text wraps");
      assert.ok(layout.trainingWithin,width+"px training text overflow");
      if(width===390 || width===844 || width===1280)
        await page.screenshot({path:path.join(artifacts,"layout-"+width+".png"),fullPage:true});
    }
    pass("320–1280px portrait/landscape layouts have no overflow, wrapped back button or camera/header overlap");
    assert.deepEqual(errors,[]);
    pass("No uncaught browser errors");
    fs.writeFileSync(path.join(artifacts,"results.json"),JSON.stringify({checks,memory,roundtrip,errors},null,2));
    console.log("Completed",checks.length,"checks");
  } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
