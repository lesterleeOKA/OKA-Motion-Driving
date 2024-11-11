
import * as mpHands from '@mediapipe/hands';
import * as handdetection from '@tensorflow-models/hand-pose-detection';
import Camera from './camera';
import { RendererCanvas2d } from './renderer';
import Util from './util';
import View from './view';
import State from './state';
import Sound from './sound';
import { setupStats } from './stats_panel';
import { parseUrlParams } from './level';
import { audioFiles } from './mediaFile';
import QuestionManager from './question';
import { apiManager } from './apiManager';
import { logController } from './logController';

let detector
//let segmenter
let rafId;
let stats;
let startInferenceTime, numInferences = 0;
let inferenceTimeSum = 0, lastPanelUpdate = 0;
const bgImage = require('./images/headToWin/bg.png');
const fpsDebug = document.getElementById('stats');
let { jwt, id, levelKey, model, removal, fps, gameTime, fallSpeed } = parseUrlParams();
let holdTimeout;
//const ctx = canvas.getContext('2d');

/*async function createDetector() {
  const runtime = 'mediapipe';
  return posedetection.createDetector(posedetection.SupportedModels.BlazePose, {
    runtime,
    modelType: ['heavy', 'full', 'lite'].includes(model) ? model : 'lite',
    solutionPath: `@mediapipe/pose@0.5.1675469404`,
    enableSegmentation: removal === '1' ? true : false,
    smoothSegmentation: removal === '1' ? true : false,
  });
}*/

async function createDetector() {
  const runtime = 'mediapipe';
  return handdetection.createDetector(handdetection.SupportedModels.MediaPipeHands, {
    runtime,
    modelType: ['full', 'lite'].includes(model) ? model : 'full',
    maxHands: 2,
    solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${mpHands.VERSION}`
  });
}

async function checkGuiUpdate() {
  window.cancelAnimationFrame(rafId);

  if (detector != null) {
    detector.dispose();
  }

  try {
    detector = await createDetector();
  } catch (error) {
    detector = null;
    alert(error);
  }
}

async function renderResult() {
  if (Camera.video.readyState < 2) {
    await new Promise((resolve) => {
      Camera.video.onloadeddata = () => {
        resolve(video);
      };
    });
  }

  let hands = null;
  let segmentation = null;
  let compositeCanvas = null;

  // Detector can be null if initialization failed (for example when loading
  // from a URL that does not exist).
  if (detector != null) {
    beginEstimatePosesStats();
    try {
      hands = await detector.estimateHands(
        Camera.video,
        { flipHorizontal: true });

      //logController.log(poses[0]);
    } catch (error) {
      detector.dispose();
      detector = null;
      alert(error);
    }

    /*if (segmentation && segmentation.length > 0) {
      Util.updateLoadingStatus("Setting Removal");
      const binaryMask = await bodySegmentation.toBinaryMask(
        segmentation, { r: 0, g: 0, b: 0, a: 0 }, { r: 0, g: 0, b: 0, a: 255 },
        false, 0.65
      );

      // Create a composite canvas for the final output
      compositeCanvas = document.createElement('canvas');
      const compositeContext = compositeCanvas.getContext('2d');
      compositeCanvas.width = Camera.videoStream.width;
      compositeCanvas.height = Camera.videoStream.height;
      // Create a temporary canvas to hold the video and mask
      const videoCanvas = document.createElement('canvas');
      const videoContext = videoCanvas.getContext('2d');
      videoCanvas.width = compositeCanvas.width;
      videoCanvas.height = compositeCanvas.height;
      // Draw the video stream onto the temporary canvas
      videoContext.drawImage(Camera.video, 0, 0, videoCanvas.width, videoCanvas.height);
      //await bodySegmentation.drawMask(videoCanvas, Camera.videoStream, binaryMask, 1, 0);
      // Get the ImageData of the video
      const videoImageData = videoContext.getImageData(0, 0, videoCanvas.width, videoCanvas.height);
      const videoData = videoImageData.data;

      // Get the ImageData of the background image
      const backgroundImageData = compositeContext.getImageData(0, 0, compositeCanvas.width, compositeCanvas.height);
      const backgroundData = backgroundImageData.data;

      // Modify the video image data to replace non-body pixels with background image pixels
      const maskImageData = new ImageData(new Uint8ClampedArray(binaryMask.data), binaryMask.width, binaryMask.height);
      const maskData = maskImageData.data;

      for (let i = 0; i < maskData.length; i += 4) {
        if (maskData[i + 3] !== 0) {
          videoData[i] = backgroundData[i];
          videoData[i + 1] = backgroundData[i + 1];
          videoData[i + 2] = backgroundData[i + 2];
          videoData[i + 3] = backgroundData[i + 3];
        }
      }

      // Put the modified video image data back onto the video canvas
      videoContext.putImageData(videoImageData, 0, 0);
      compositeContext.drawImage(videoCanvas, 0, 0, compositeCanvas.width, compositeCanvas.height);
    }*/
    endEstimatePosesStats();
  }

  let fpsMode = fps === '1' ? true : false;
  let showMask = !apiManager.isLogined || (apiManager.settings.show_mask && apiManager.settings.show_mask === 1) ? true : false;

  if (removal === '1') {
    if (compositeCanvas) View.renderer.draw([Camera.video, poses, fpsMode, compositeCanvas, showMask]);
  }
  else {
    View.renderer.draw([Camera.video, hands, fpsMode, null, showMask]);
  }
  Util.updateLoadingStatus("Game is Ready");
}

function beginEstimatePosesStats() {
  if (fps === '1') {
    startInferenceTime = (performance || Date).now();
  }
}

function endEstimatePosesStats() {
  if (fps === '1') {
    const endInferenceTime = (performance || Date).now();
    inferenceTimeSum += endInferenceTime - startInferenceTime;
    ++numInferences;

    const panelUpdateMilliseconds = 1000;
    if (endInferenceTime - lastPanelUpdate >= panelUpdateMilliseconds) {
      const averageInferenceTime = inferenceTimeSum / numInferences;
      inferenceTimeSum = 0;
      numInferences = 0;
      stats.customFpsPanel.update(
        1000.0 / averageInferenceTime, 120 /* maxValue */);
      lastPanelUpdate = endInferenceTime;
    }
  }
}

async function renderPrediction() {
  if (!detector) await checkGuiUpdate();

  await renderResult();

  rafId = requestAnimationFrame(renderPrediction);
};

function setAPIImage(imageElement, url) {
  if (imageElement === null || url === null) return;
  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.blob(); // Get the image as a Blob
    })
    .then(blob => {
      const objectUrl = URL.createObjectURL(blob); // Create a URL for the Blob
      imageElement.style.backgroundImage = `url(${objectUrl})`; // Set the body background
      logController.log("load " + imageElement.id + " set successfully.");
    })
    .catch(error => {
      console.error("Error loading image:", error);
    });
}

function gameSetup() {
  if (apiManager.isLogined) {
    let previewImageUrl = (apiManager.settings.previewGameImageUrl && apiManager.settings.previewGameImageUrl !== '') ? apiManager.settings.previewGameImageUrl : null;
    State.gameTime = apiManager.settings.gameTime;
    State.fallSpeed = apiManager.settings.fallSpeed;
    logController.log("settings gameTime:", State.gameTime);
    logController.log("settings object speed:", apiManager.settings.fallSpeed);
    logController.log("settings removal:", apiManager.settings.removal);
    logController.log("settings detectionModel:", apiManager.settings.detectionModel);

    removal = apiManager.settings.removal === 1 ? '1' : '0';
    model = apiManager.settings.detectionModel === 1 ? 'full' : 'lite';

    if (removal === '1') {
      let bgUrl = (apiManager.settings.backgroundImageUrl && apiManager.settings.backgroundImageUrl !== '') ? apiManager.settings.backgroundImageUrl : bgImage;
      setAPIImage(document.getElementById('bgImage'), bgUrl);
    }
    setAPIImage(document.getElementById('previewImg'), previewImageUrl);
    View.setPlayerIcon(apiManager.iconDataUrl);
    View.setPlayerName(apiManager.loginName);
    View.setInstructionContent(apiManager.settings.instructionContent);
    View.preloadUsedImages(apiManager.settings.option_item_images);
    View.setHeadTrackerMask(apiManager.settings.mask_url);
    logController.log("Completed load files!!!!!!!!!!!!!!!!");
  }
  else {
    View.preloadUsedImages(null);
    if (removal === '1') {
      setAPIImage(document.getElementById('bgImage'), bgImage);
    }
  }
}

async function init() {
  logController.log('in init()');
  Util.loadingStart();

  // Initialize sounds and preload images concurrently
  await Promise.all([
    Sound.init()
  ]);

  Util.updateLoadingStatus("Loading Data");
  State.gameTime = gameTime;
  State.fallSpeed = fallSpeed;
  // Load question data and handle callbacks
  await new Promise((resolve, reject) => {
    QuestionManager.checkIsLogin(
      jwt,
      id,
      levelKey,
      () => {
        gameSetup();
        resolve();
      },
      (error) => {
        logController.error("An error occurred while loading questions:", error);
        View.showLoginErrorPopup();
        reject();
      }
    );
  });
  // Calculate viewport height for mobile
  let vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);

  // Set up event listeners
  setupEventListeners();

  // Add onbeforeunload event handler
  window.onbeforeunload = function (e) {
    if (State.state === 'leave') return;

    logController.log("Calling OnClose from Browser!");
    apiManager.exitGameRecord(
      () => {
        logController.log("Quit Game");
      }
    );
    const dialogText = "Your game has been saved! Would you like to continue unloading the page?";
    e.returnValue = dialogText; // For most browsers
    return dialogText;
  };

  const defaultAudios = [
    ['bgm', require('./audio/bgm.mp3'), false, 0.5],
    ['btnClick', require('./audio/btnClick.wav')],
    ['countDown', require('./audio/countDown.mp3')],
    ['score', require('./audio/score.mp3')],
    //['instruction', require('./audio/instruction.mp3')],
    ['prepare', require('./audio/prepare.mp3')],
    ['start', require('./audio/start.mp3')],
    /*['finished', require('./audio/finished.mp3')],*/
    ['passGame', require('./audio/passgame.mp3')],
    ['failGame', require('./audio/failgame.mp3')],
    ['outBox', require('./audio/outBox.mp3')],
    ['poseValid', require('./audio/poseValid.mp3')],
    ['ansCorrect', require('./audio/ansCorrect.mp3')],
    ['ansWrong', require('./audio/ansWrong.mp3')],
    ['lastTen', require('./audio/dingding.wav')],
  ];

  let questionsAudio = null;

  if (apiManager.isLogined) {
    questionsAudio = QuestionManager.mediaType === 'audio' ? QuestionManager.apiMedia : [];
  }
  else {
    const additionalAudios = audioFiles;
    questionsAudio = levelKey
      ? additionalAudios.filter(([key]) => key.includes(levelKey))
      : additionalAudios;
  }

  const audiosToPreload = [...defaultAudios, ...questionsAudio];

  await Promise.all([
    Sound.preloadAudios(audiosToPreload),
    Camera.getVideo()
  ]);
}

function handleButtonClick(e) {
  if (State.isSoundOn) Sound.play('btnClick');
  switch (e.currentTarget) {
    case View.startBtn:
      if (State.isSoundOn) {
        Sound.play('btnClick');
      }
      State.changeState('prepare');
      break;
    case View.exitBtn:
      cleanup();
      if (State.isSoundOn) {
        Sound.play('btnClick');
      }
      State.gamePauseData.state = State.state;
      State.gamePauseData.stateType = State.stateType;

      apiManager.exitGameRecord(
        () => {
          logController.log("Quit Game");
          setTimeout(() => {
            State.changeState('leave');
          }, 500);
        }
      );
      break;
    case View.motionBtn:
      if (State.isSoundOn) {
        Sound.play('btnClick');
      }
      State.gamePauseData.state = State.state;
      State.gamePauseData.stateType = State.stateType;

      if (View.motionBtn.classList.contains('on')) {
        View.motionBtn.classList.add('off');
        View.motionBtn.classList.remove('on');
        View.renderer.showSkeleton = false;
      }
      else if (View.motionBtn.classList.contains('off')) {
        View.motionBtn.classList.remove('off');
        View.motionBtn.classList.add('on');
        View.renderer.showSkeleton = true;
      }
      break;
    case View.musicBtn:
      if (State.state !== 'showMusicOnOff') {
        if (State.isSoundOn) {
          Sound.play('btnClick');
        }
        State.gamePauseData.state = State.state;
        State.gamePauseData.stateType = State.stateType;
        State.changeState('showMusicOnOff');
      }
      //toggleSound();
      break;
    case View.reloadBtn:
      if (State.isSoundOn) {
        Sound.play('btnClick');
      }
      location.reload();
      break;
    case View.instructionBtn:
      if (State.isSoundOn) {
        Sound.play('btnClick');
      }
      break;
    case View.backHomeBtnOfFinished:
      cleanup();
      if (State.isSoundOn) {
        Sound.play('btnClick');
      }
      State.state = '';
      setTimeout(() => {
        State.changeState('leave');
      }, 500);
      break;
    case View.playAgainBtn:
      if (State.isSoundOn) {
        Sound.play('btnClick');
        Sound.play('bgm', true);
      }
      State.state = '';
      State.changeState('prepare');
      break;
    case View.backHomeBtnOfExit:
      cleanup();
      if (State.isSoundOn) {
        Sound.play('btnClick');
      }
      View.hideExit();
      State.state = '';
      setTimeout(() => {
        State.changeState('leave');
      }, 500);
      break;
    case View.continuebtn:
      if (State.isSoundOn) {
        Sound.play('btnClick');
      }
      View.hideExit();
      State.changeState(State.gamePauseData.state, State.gamePauseData.stateType);
      break;
    case View.offBtn:
      if (State.isSoundOn) {
        Sound.play('btnClick');
      }
      View.hideMusicOnOff();
      State.changeState(State.gamePauseData.state, State.gamePauseData.stateType);
      State.setSound(false);
      break;
    case View.onBtn:
      if (State.isSoundOn) {
        Sound.play('btnClick');
      }
      View.hideMusicOnOff();
      State.changeState(State.gamePauseData.state, State.gamePauseData.stateType);
      State.setSound(true);
      break;
  }
}

let isHolding = false;
function startHold() {
  if (!isHolding) { // Only set the timeout if not already holding
    isHolding = true; // Mark as holding
    holdTimeout = setTimeout(() => {
      View.renderer.showSkeleton = !View.renderer.showSkeleton;
      fps = View.renderer.showSkeleton ? '1' : '0';
      fpsDebug.style.opacity = View.renderer.showSkeleton ? 1 : 0;
      stats = View.renderer.showSkeleton ? setupStats() : null;
      logController.log(`Show Skeleton ${View.renderer.showSkeleton ? 'enabled' : 'disabled'}`);
    }, 3000); // 3 seconds
  }
}
function endHold() {
  clearTimeout(holdTimeout);
  isHolding = false;
}

function handleButtonTouch(e) {
  switch (e.currentTarget) {
    case View.startBtn:
      View.startBtn.classList.add('touched');
      break;
    case View.exitBtn:
      View.exitBtn.classList.add('touched');
      break;
    case View.motionBtn:
      View.motionBtn.classList.add('touched');
      break;
    case View.musicBtn:
      View.musicBtn.classList.add('touched');
      break;
    case View.onBtn:
      View.onBtn.classList.add('touched')
      break;
    case View.offBtn:
      View.offBtn.classList.add('touched')
      break;
    case View.backHomeBtnOfFinished:
      View.backHomeBtnOfFinished.classList.add('touched');
      break;
    case View.playAgainBtn:
      View.playAgainBtn.classList.add('touched');
      break;
    case View.reloadBtn:
      View.reloadBtn.classList.add('touched');
      break;
  }
}

function handleButtonTouchLeave(e) {
  switch (e.currentTarget) {
    case View.startBtn:
      View.startBtn.classList.remove('touched');
      break;
    case View.exitBtn:
      View.exitBtn.classList.remove('touched');
      break;
    case View.motionBtn:
      View.motionBtn.classList.remove('touched');
      break;
    case View.musicBtn:
      View.musicBtn.classList.remove('touched');
      break;
    case View.onBtn:
      View.onBtn.classList.remove('touched');
      break;
    case View.offBtn:
      View.offBtn.classList.remove('touched');
      break;
    case View.backHomeBtnOfFinished:
      View.backHomeBtnOfFinished.classList.remove('touched');
      break;
    case View.playAgainBtn:
      View.playAgainBtn.classList.remove('touched');
      break;
    case View.reloadBtn:
      View.reloadBtn.classList.remove('touched');
      break;
  }
}

function setupEventListeners() {
  const buttons = [
    View.startBtn,
    View.exitBtn,
    View.motionBtn,
    View.musicBtn,
    View.backHomeBtnOfFinished,
    View.playAgainBtn,
    View.onBtn,
    View.offBtn,
    View.reloadBtn
  ];

  buttons.forEach(button => {
    button.addEventListener('pointerdown', handleButtonTouch);
    button.addEventListener('pointerup', handleButtonTouchLeave);
    button.addEventListener('click', handleButtonClick);
  });

  View.fpsModeBtn.addEventListener('pointerdown', startHold);
  View.fpsModeBtn.addEventListener('pointerup', endHold);
  View.fpsModeBtn.addEventListener('mousedown', startHold);
  View.fpsModeBtn.addEventListener('mouseup', endHold);
  View.fpsModeBtn.addEventListener('mouseleave', endHold);
}


async function app() {
  //logController.log('in app()');
  /*if (location.protocol !== 'https:') {
    location.replace(`https:${location.href.substring(location.protocol.length)}`);
  }*/

  if (fps === '1') {
    fpsDebug.style.opacity = 1;
    stats = setupStats();
  }

  init().then(() => {
    setTimeout(() => {
      Camera.initSetup();
      //(new FPSMeter({ ui: true })).start();
      createDetector().then((detector) => {
        logController.log('initial detector model............................');
        Util.updateLoadingStatus("Loading Model");
        //logController.log(detector);
        //const canvas = document.getElementById('output');
        View.renderer = new RendererCanvas2d(View.canvas);
        renderPrediction().then(() => {
          Util.loadingComplete().then(() => {
            State.changeState('instruction');
          });
        })
      });
    }, 1000);
  });

};

//-------------------------------------------------------------------------------------------------
async function cleanup() {
  // Dispose the detector if it is created
  if (detector) {
    await detector.dispose(); // Ensure we await the dispose method if it's asynchronous
    detector = null;
  }
  // Stop the camera if it's running
  if (Camera.video) {
    Camera.video.srcObject.getTracks().forEach(track => {
      track.stop(); // Stop each track
    });
    Camera.video.srcObject = null; // Clear the video source
  }
  if (State.isSoundOn) {
    Sound.stopAll();
  }
  logController.log("Cleanup completed.");
}
//-------------------------------------------------------------------------------------------------
app();
//-------------------------------------------------------------------------------------------------
