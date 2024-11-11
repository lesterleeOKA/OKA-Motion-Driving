import * as handdetection from '@tensorflow-models/hand-pose-detection';
import State from './state';
import Sound from './sound';
import Camera from './camera';
import Game from './headToWin';
import view from './view';
//import { logController } from './logController';


const fingerLookupIndices = {
  thumb: [0, 1, 2, 3, 4],
  indexFinger: [0, 5, 6, 7, 8],
  middleFinger: [0, 9, 10, 11, 12],
  ringFinger: [0, 13, 14, 15, 16],
  pinky: [0, 17, 18, 19, 20],
}; // for rendering each finger as a polyline

export class RendererCanvas2d {
  constructor(canvas) {
    this.ctx = canvas.getContext('2d');
    this.videoWidth = canvas.width;
    this.videoHeight = canvas.height;
    this.lastPoseValidValue = false;
    this.modelType = null;
    this.scoreThreshold = 0.75;
    this.triggerAudio = false;
    this.headKeypoints = ['nose', 'left_eye_inner', 'left_eye', 'left_eye_outer', 'right_eye_inner', 'right_eye', 'right_eye_outer', 'left_ear', 'right_ear'];
    this.headCircle = null;
    this.headCircleXScale = 0.9;
    this.headCircleYScale = 1.4;
    this.showSkeleton = false;
  }

  draw(rendererParams) {
    const [video, hands, isFPSMode, bodySegmentationCanvas, showMask = true] = rendererParams;
    this.videoWidth = video.width;
    this.videoHeight = video.height;
    this.ctx.canvas.width = this.videoWidth;
    this.ctx.canvas.height = this.videoHeight;

    this.lineHeight = this.videoHeight / 2.5;
    /*this.redBoxX = this.videoWidth / 3;
    this.redBoxY = this.videoHeight / 5 * 1;
    this.redBoxWidth = this.videoWidth / 3;
    this.redBoxHeight = this.videoHeight / 5 * 4;*/

    this.drawCtx(video, bodySegmentationCanvas);
    if (['prepare', 'counting3', 'counting2', 'counting1', 'counting0', 'playing', 'outBox'].includes(State.state)) {
      let isCurPoseValid = false;
      if (hands && hands.length > 0) {
        let ratio = video.width / video.videoWidth;
        this.drawResults(hands, ratio, isFPSMode);

        isCurPoseValid = this.isPoseValid(hands);
        if (isCurPoseValid && State.bodyInsideRedBox.value == true) {
          if (State.state == 'prepare' && State.getStateLastFor() > 3500) {
            State.changeState('counting3');
          } else if (State.state == 'counting3' && State.getStateLastFor() > 1000) {
            State.changeState('counting2');
          } else if (State.state == 'counting2' && State.getStateLastFor() > 1000) {
            State.changeState('counting1');
          } else if (State.state == 'counting1' && State.getStateLastFor() > 1000) {
            State.changeState('counting0');
          } else if (State.state == 'counting0' && State.getStateLastFor() > 1000) {
            State.changeState('playing', 'showStage');
          } else if (State.state == 'playing') {

            if (State.stageType == 'showStage' && State.getStateLastFor() > 1000) {
              //State.changeState('playing', 'showQstImg');
            } else if (State.stateType == 'waitAns') {
              if (State.selectedImg.value && State.selectedImg.lastFor > 1000) {
                //1秒掂到就得，唔駛倒數
                //State.changeState('playing', Game.checkAnswer() ? 'ansCorrect' : 'ansWrong');
                //State.changeState('playing', 'touched1');
              }
            } else if (State.stateType == 'touched1') {
              if (State.selectedImg.value && State.selectedImg.lastFor > 2000) {
                State.changeState('playing', 'touched2');
              } else if (!State.selectedImg.value) {
                State.changeState('playing', 'waitAns');
              }
            } else if (State.stateType == 'touched2') {
              if (State.selectedImg.value && State.selectedImg.lastFor > 3000) {
                //let isCorrect = Game.checkAnswer();
                // State.changeState('playing', isCorrect ? 'ansCorrect' : 'ansWrong');
              } else if (!State.selectedImg.value) {
                State.changeState('playing', 'waitAns');
              }
            }
          } else if (State.state == 'outBox' && State.bodyInsideRedBox.lastFor > 2000) {
            State.changeState('playing', 'waitAns');
          }
        }
      }
      this.drawHeadTracker(showMask);
      this.drawHorizontalLine(isCurPoseValid);
    }
  }

  checkCircleRectIntersection(
    circleX, circleY, circleRadius,
    rectLeft, rectTop, rectRight, rectBottom
  ) {
    // Calculate the distance between the circle center and the closest point on the rectangle
    let distanceX = Math.max(rectLeft - circleX, 0, circleX - rectRight);
    let distanceY = Math.max(rectTop - circleY, 0, circleY - rectBottom);

    // Check if the distance is less than the circle radius
    let distanceSquared = distanceX * distanceX + distanceY * distanceY;
    return distanceSquared <= (circleRadius * circleRadius);
  }

  isPoseValid(hands) {
    if (hands != null) {

      let isBodyOutBox = hands.length === 0 ? true : false;

      State.setPoseState('bodyInsideRedBox', !isBodyOutBox);
      if (isBodyOutBox) {
        if (State.state == 'playing') State.changeState('outBox', 'outBox');
        //logController.log('outBox', 'outBox');
        //this.drawHeadTracker(false);
        return false;
      }
      //檢查是否有選到圖
      /* let optionWrappers = document.querySelectorAll('.canvasWrapper > .optionArea > .optionWrapper.show');
       let canvasWrapper = document.querySelector('.canvasWrapper');
       if (State.state == 'playing' && ['waitAns'].includes(State.stateType)) {

         let touchingWord = [];
         if (this.headCircle) {

           const canvasWrapperRect = canvasWrapper.getBoundingClientRect();
           //logController.log(this.headCircle);
           for (let option of optionWrappers) {
             const optionRect = option.getBoundingClientRect();
             if (
               (this.headCircle.x + (this.headCircle.radius * this.headCircleXScale)) > (optionRect.left - canvasWrapperRect.left) &&
               (this.headCircle.x - (this.headCircle.radius * this.headCircleXScale)) < (optionRect.right - canvasWrapperRect.left) &&
               (this.headCircle.y + (this.headCircle.radius * this.headCircleYScale)) > (optionRect.top - canvasWrapperRect.top) &&
               (this.headCircle.y - (this.headCircle.radius * this.headCircleYScale)) < (optionRect.bottom - canvasWrapperRect.top)
             ) {
               touchingWord.push(option);
             }
           }
         }
         else {
           headTracker.style.display = 'none';
         }

         for (let option of optionWrappers) {
           if (touchingWord.includes(option) && !option.classList.contains('touch')) {
             State.setPoseState('selectedImg', option);
             //logController.log("touch ", option);
             Game.fillWord(option, this.headCircle);
           }
         }

         if (touchingWord.length === 0) State.setPoseState('selectedImg', '');
       }
       else if (State.state == 'playing' && ['wrong'].includes(State.stateType)) {
         for (let option of optionWrappers) option.classList.remove('touch');
         State.changeState('playing', 'waitAns');
       }*/

      return true;
    } else {
      return false;
    }
  }

  drawHorizontalLine(isCurPoseValid) {
    const centerY = this.lineHeight; // Calculate the vertical center of the screen
    const startX = 0; // Start of the line (left edge)
    const endX = this.videoWidth; // End of the line (right edge)

    this.ctx.beginPath();
    this.ctx.lineWidth = isCurPoseValid ? 5 : Math.max(10, this.videoHeight * 0.01);
    this.ctx.moveTo(startX, centerY); // Move to the start of the line
    this.ctx.lineTo(endX, centerY); // Draw the line to the end point
    this.ctx.strokeStyle = isCurPoseValid ? '#FFFFFF' : '#ff0000';
    this.ctx.stroke();

    if (!this.lastPoseValidValue && isCurPoseValid && State.isSoundOn) {
      Sound.play('poseValid');
    }
    this.lastPoseValidValue = isCurPoseValid;
  }

  drawHeadTracker(status = true) {
    if (this.headCircle) {
      if (status) {
        const xInVw = (this.headCircle.x / window.innerWidth) * 100;
        const maxWidth = this.headCircle.radius * 2 / window.innerWidth * 130;
        const width = `calc(${maxWidth}vw)`;
        const left = `calc(${xInVw}vw - ${maxWidth / 2}vw)`;
        const offsetY = Math.max(10, this.headCircle.radius / 1.6);
        const top = `calc(${this.headCircle.y - this.headCircle.radius - offsetY}px)`;

        view.showHeadTracker(true, width, left, top);
      }
      else {
        view.showHeadTracker(false);
      }
    }
  }

  drawCtx(video, bodySegmentationCanvas) {
    if (Camera.constraints.video.facingMode == 'user') {
      this.ctx.translate(this.videoWidth, 0);
      this.ctx.scale(-1, 1);
    }
    /*this.ctx.drawImage(bodySegmentationCanvas ? bodySegmentationCanvas : video, 0, 0, this.videoWidth, this.videoHeight);
    if (Camera.constraints.video.facingMode == 'user') {
      this.ctx.translate(this.videoWidth, 0);
      this.ctx.scale(-1, 1);
    }*/
    // Draw the current video frame or the body segmentation canvas
    this.ctx.drawImage(bodySegmentationCanvas ? bodySegmentationCanvas : video, 0, 0, this.videoWidth, this.videoHeight);
    //this.enhanceSharpness();
    if (Camera.constraints.video.facingMode == 'user') {
      this.ctx.translate(this.videoWidth, 0);
      this.ctx.scale(-1, 1);
    }
  }

  enhanceSharpness() {
    const imageData = this.ctx.getImageData(0, 0, this.videoWidth, this.videoHeight);
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const outputData = this.ctx.createImageData(width, height);
    const output = outputData.data;

    // 锐化卷积核
    const kernel = [
      [0, -1, 0],
      [-1, 5, -1],
      [0, -1, 0]
    ];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        let r = 0, g = 0, b = 0;

        // 应用卷积核
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixelIdx = ((y + ky) * width + (x + kx)) * 4;
            r += data[pixelIdx] * kernel[ky + 1][kx + 1];
            g += data[pixelIdx + 1] * kernel[ky + 1][kx + 1];
            b += data[pixelIdx + 2] * kernel[ky + 1][kx + 1];
          }
        }
        // 限制 RGB 值在 0-255 之间
        output[idx] = Math.min(Math.max(r, 0), 255);     // R
        output[idx + 1] = Math.min(Math.max(g, 0), 255); // G
        output[idx + 2] = Math.min(Math.max(b, 0), 255); // B
        output[idx + 3] = 255; // Alpha
      }
    }
    // 将处理后的数据绘制回 Canvas
    this.ctx.putImageData(outputData, 0, 0);
  }

  clearCtx() {
    this.ctx.clearRect(0, 0, this.videoWidth, this.videoHeight);
  }

  drawResults(hands, ratio, isFPSMode) {
    // Sort by right to left hands.
    hands.sort((hand1, hand2) => {
      if (hand1.handedness < hand2.handedness) return 1;
      if (hand1.handedness > hand2.handedness) return -1;
      return 0;
    });

    // Pad hands to clear empty scatter GL plots.
    while (hands.length < 2) hands.push({});

    for (let i = 0; i < hands.length; ++i) {
      this.drawResult(hands[i], ratio);
    }
  }

  drawResult(hand, ratio) {
    if (hand.keypoints != null) {
      this.drawKeypoints(hand.keypoints, hand.handedness, ratio);
    }
  }

  drawKeypoints(keypoints, handedness, ratio) {
    const keypointsArray = keypoints;
    this.ctx.fillStyle = handedness === 'Left' ? 'Red' : 'Blue';
    this.ctx.strokeStyle = 'White';
    this.ctx.lineWidth = 10;

    for (let i = 0; i < keypointsArray.length; i++) {
      const y = keypointsArray[i].x * ratio; // Scale x coordinate
      const x = keypointsArray[i].y * ratio; // Scale y coordinate
      this.drawPoint(x - 2, y - 2, 3); // Adjusted drawing of the point
    }

    const fingers = Object.keys(fingerLookupIndices);
    for (let i = 0; i < fingers.length; i++) {
      const finger = fingers[i];
      const points = fingerLookupIndices[finger].map(idx => ({
        x: keypoints[idx].x * ratio, // Scale x coordinate
        y: keypoints[idx].y * ratio // Scale y coordinate
      }));
      this.drawPath(points, false);
    }
  }

  drawPath(points, closePath) {
    const region = new Path2D();
    region.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      region.lineTo(point.x, point.y);
    }

    if (closePath) {
      region.closePath();
    }
    this.ctx.stroke(region);
  }

  drawPoint(y, x, r) {
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, 2 * Math.PI);
    this.ctx.fill();
  }


}
