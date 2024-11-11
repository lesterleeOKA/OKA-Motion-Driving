import View from './view';
import State from './state';

export default {
  stage: 0,
  question: 0,
  score: [ 0, 0, 0 ],
  time: 0,
  timer: null,
  timerRunning: false,
  correctImageStocks:[
    require("./images/answerImages/correct/handbook.png"),
    require("./images/answerImages/correct/HKID.png"),
    require("./images/answerImages/correct/id.png"),
    require("./images/answerImages/correct/octopuscard.png"),
    require("./images/answerImages/correct/passport.png"),
    require("./images/answerImages/correct/school_id.png")
  ],
  wrongImageStocks:[
    require("./images/answerImages/wrong/case.png"),
    require("./images/answerImages/wrong/color.png"),
    require("./images/answerImages/wrong/glasses.png"),
    require("./images/answerImages/wrong/gloves.png"),
    require("./images/answerImages/wrong/lemontea.png"),
    require("./images/answerImages/wrong/pencil.png"),
    require("./images/answerImages/wrong/plants.png"),
    require("./images/answerImages/wrong/schoolbag.png"),
    require("./images/answerImages/wrong/toy.png")
  ],
  lastCorrectImageUsed: [],
  lastWrongImageUsed: [],
  maxUsedImageNum: 3,
  stages: [
    { //第一關
      questions: [
        { //第一題
          totalImgNum:1,
          correctImgNum:1
        }, { //第二題
          totalImgNum:1,
          correctImgNum:1
        }, { //第三題
          totalImgNum:1,
          correctImgNum:1
        }
      ]
    }, { //第二關
      questions: [
        { //第一題
          totalImgNum:2,
          correctImgNum:1
        }, { //第二題
          totalImgNum:2,
          correctImgNum:1
        }, { //第三題
          totalImgNum:2,
          correctImgNum:1
        }
      ]
    }, { //第三關
      questions: [
        { //第一題
          totalImgNum:4,
          correctImgNum:2
        }, { //第二題
          totalImgNum:4,
          correctImgNum:2
        }, { //第三題
          totalImgNum:4,
          correctImgNum:2
        }
      ]
    }
  ],
  //-----------------------------------------------------------------------------------------------
  init() {
    this.stage = 0;
    this.question = 0;
    this.score = [ 0, 0, 0 ];
    this.time = 0;
    this.addScore(0);
    this.stopCountTime();
    View.scoreBoard.className = "scoreBoard";
  },
  //-----------------------------------------------------------------------------------------------
  addScore(mark) {
    let newScore = this.score[this.stage] + mark;
    if (newScore<0) newScore = 0;
    this.score[this.stage] = newScore;
    View.scoreText.innerText = this.score[this.stage];
  },
  //-----------------------------------------------------------------------------------------------
  getImgUrls(stageNo, questionNo) {
    let questionObj = this.stages[stageNo].questions[questionNo];
    let urls = [];
    for (let i=0; i<questionObj.correctImgNum; i++) {
      let pickUrl = null;
      while (!pickUrl || urls.includes(pickUrl) || this.lastCorrectImageUsed.includes(pickUrl)) pickUrl = this.correctImageStocks[Math.floor(Math.random() * (this.correctImageStocks.length - 1))];
      this.lastCorrectImageUsed.push(pickUrl);
      if (this.lastCorrectImageUsed.length > this.maxUsedImageNum) this.lastCorrectImageUsed.shift();
      urls.push(pickUrl);
    }
    for (let j=0; j<(questionObj.totalImgNum - questionObj.correctImgNum); j++) {
      let pickUrl = null;
      while (!pickUrl || urls.includes(pickUrl) || this.lastCorrectImageUsed.includes(pickUrl)) pickUrl = this.wrongImageStocks[Math.floor(Math.random() * (this.wrongImageStocks.length - 1))];
      this.lastWrongImageUsed.push(pickUrl);
      if (this.lastWrongImageUsed.length > this.maxUsedImageNum) this.lastWrongImageUsed.shift();
      urls.push(pickUrl);
    }
    return urls;
  },
  shuffle(array) {
    let currentIndex = array.length,  randomIndex;
    while (currentIndex != 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
  },
  getRandomPosition() {
    let imgSize = 33;
    let imgSizePx = Math.min(View.renderer.videoWidth, View.renderer.videoHeight) * imgSize / 100;
    let imgSizeW = imgSizePx / View.renderer.videoWidth *100;
    let imgSizeH = imgSizePx / View.renderer.videoHeight *100;
    return this.shuffle([
      {minX:0, minY:7, maxX:50-imgSizeW, maxY:40-imgSizeH },
      {minX:50, minY:7, maxX:100-imgSizeW, maxY:40-imgSizeH },
      {minX:0, minY:40, maxX:33-imgSizeW, maxY:100-imgSizeH },
      {minX:67, minY:40, maxX:100-imgSizeW, maxY:100-imgSizeH }
    ]).map(cfg=>({
      x: Math.floor(Math.random() * (cfg.maxX - cfg.minX)) + cfg.minX,
      y: Math.floor(Math.random() * (cfg.maxY - cfg.minY)) + cfg.minY,
      size: imgSize,
      sizeW: imgSizeW,
      sizeH: imgSizeH
    }));
  },
  createOptionWrapper(url) {
    let optionWrapper = document.createElement('div');
    optionWrapper.classList.add("optionWrapper");
    let option =  document.createElement('img');
    option.classList.add("option");
    option.src = url;
    optionWrapper.appendChild(option);
    return optionWrapper;
  },
  setImgs() {
    View.optionArea.innerHTML = '';
    let urls = this.getImgUrls(this.stage, this.question);
    let positions = this.getRandomPosition();

    urls.map((url, i)=>{
      let optionWrapper = this.createOptionWrapper(url);
      optionWrapper.classList.add("show");
      optionWrapper.classList.add(this.correctImageStocks.includes(url) ? "correct" : "wrong");
      
      optionWrapper.style.width = positions[i].sizeW + '%';
      optionWrapper.style.height = positions[i].sizeH + '%';
      optionWrapper.style.left = positions[i].x + '%';
      optionWrapper.style.top = positions[i].y + '%';

      View.optionArea.appendChild(optionWrapper);
    });

    /*for (let i=0; i<View.optionWrappers.length; i++) {
      let optionWrapper = View.optionWrappers[i];
      if (urls[i]) {
        let optionImg = optionWrapper.querySelector('img');
        optionImg.src = urls[i];
        optionWrapper.classList.add("show");
        
        optionWrapper.style.width = positions[i].sizeW + '%';
        optionWrapper.style.height = positions[i].sizeH + '%';
        optionWrapper.style.left = positions[i].x + '%';
        optionWrapper.style.top = positions[i].y + '%';
      } else {
        optionWrapper.classList.remove("show");
      }
    }*/
  },
  checkAnswer() {
    if (State.selectedImg.value.classList.contains('correct')) {
      //答岩1分，答錯唔扣分
      this.addScore(1);
      return true;
    } else {
      //this.addScore(-1);
      return false;
    }
  },
  canGoNextQuestion() {
    if (this.stages[this.stage].questions[this.question + 1]) {
      this.question = this.question + 1;
      return true;
    } else {
      return false;
    }
  },
  canGoNextStage() {
    if (this.stages[this.stage + 1]) {
      this.stage = this.stage + 1;
      this.question = 0
      return true;
    } else {
      return false;
    }
  },
  getCurTimeString() {
    let min = Math.floor(this.time / 60);
    let sec = Math.floor(this.time % 60);
    return `${min < 10 ? '0' :''}${min}:${sec < 10 ? '0' :''}${sec}`;
  },
  startCountTime() {
    if (!this.timerRunning) {
      this.timer = setInterval(()=>{
        this.time++;
        //View.timeText.innerText = this.getCurTimeString();
      }, 1000);
      this.timerRunning = true;
    }
  },
  stopCountTime() {
    if (this.timerRunning) {
      clearInterval(this.timer);
      this.timerRunning = false;
    }
    //View.timeText.innerText = this.getCurTimeString();
  }
};