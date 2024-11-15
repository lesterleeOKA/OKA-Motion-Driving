import View from './view';
import Sound from './sound';
import Game from './spelling';
import { apiManager } from "./apiManager";
import { logController } from './logController';

export default {
  apiManager: apiManager,
  state: 'load', //load/instruction/prepare/count/play
  lastState: '',
  stateLastAt: +new Date(),
  stateLastFor: 0,
  stateType: '',
  isSoundOn: true,
  gameTime: null,
  fallSpeed: null,
  gamePauseData: {
    state: '',
    stateType: '',
  },
  bodyInsideRedBox: {
    value: false,
    lastAt: +new Date(),
    lastFor: 0
  },
  selectedImg: {
    value: '',
    lastAt: +new Date(),
    lastFor: 0
  },
  setPoseState(stateName, newValue) {
    let state = this[stateName];
    if (state.value == newValue) {
      state.lastFor = +new Date() - state.lastAt;
    } else {
      state.value = newValue;
      state.lastAt = +new Date();
      state.lastFor = 0;
    }
  },
  //-----------------------------------------------------------------------------------------------
  getStateLastFor() {
    this.stateLastFor = +new Date() - this.stateLastAt;
    return this.stateLastFor;
  },
  //-----------------------------------------------------------------------------------------------
  changeState(state, stateType = '') {
    if (this.state === 'finished')
      return;

    logController.log(state, stateType, this.lastState);
    if (this.state == state) {
      this.stateLastFor = +new Date() - this.stateLastAt;
      if (this.stateType == stateType) return;
    } else {
      this.lastState = this.state;
      this.state = state;
      this.stateLastAt = +new Date();
      this.stateLastFor = 0;
    }
    this.stateType = stateType;

    if (state == 'instruction') {
      Game.init(this.gameTime, this.fallSpeed);
      View.setProgressBar(false);
      View.hideTopLeftControl();
      View.hideTips();
      View.showCanvas();
      //View.hideCanvas();
      View.hideGame();
      View.hideFinished();
      View.showInstruction();
      Sound.stopAll();
      if (this.isSoundOn) {
        Sound.play('bgm', true);
        Sound.stopAll('bgm');
        //Sound.play('instruction');
      }
    } else if (state == 'prepare') {
      Game.init(this.gameTime, this.fallSpeed);
      View.hideFinished();
      View.showCanvas();
      View.hideInstruction();
      View.showGame();
      View.showPrepareBoard();
      Sound.stopAll('bgm');
      if (this.isSoundOn) Sound.play('prepare');
    } else if (state == 'counting3') {
      View.hidePrepareBoard();
      View.showCount(3);
      if (this.isSoundOn) setTimeout(() => Sound.play('countDown'), 250);
    } else if (state == 'counting2') {
      View.showCount(2);
      if (this.isSoundOn) setTimeout(() => Sound.play('countDown'), 250);
    } else if (state == 'counting1') {
      View.showCount(1);
      if (this.isSoundOn) setTimeout(() => Sound.play('countDown'), 250);
    } else if (state == 'counting0') {
      View.showCount(0);
      if (this.isSoundOn) {
        Sound.stopAll('bgm');
        setTimeout(() => Sound.play('start'), 250);
      }
    } else if (state == 'playing') {
      View.setProgressBar(apiManager.isLogined ? true : false);
      View.showTopLeftControl();
      switch (stateType) {
        case 'showStage':
          setTimeout(() => this.changeState('playing', 'showQstImg'), 1000);
          break;
        case 'showQstImg':
          this.changeState('playing', 'waitAns');
        case 'waitAns':
          View.hidePrepareBoard();
          Game.startCountTime();
          break;
        case 'ansWrong':
          if (this.isSoundOn) {
            Sound.stopAll(['bgm', 'lastTen']);
            Sound.play('ansWrong');
          }
          this.changeState('playing', 'waitAns');
          setTimeout(() => {
            this.setPoseState('selectedImg', '');
            if (state === 'playing')
              Game.moveToNextQuestion();
          }, 1000);
          break;
        case 'ansCorrect':
          if (this.isSoundOn) {
            Sound.stopAll(['bgm', 'lastTen']);
            Sound.play('ansCorrect');
          }
          this.changeState('playing', 'waitAns');
          setTimeout(() => {
            this.setPoseState('selectedImg', '');
            if (state === 'playing')
              Game.moveToNextQuestion();
          }, 1000);
          break;
      }

    } else if (state == 'showMusicOnOff') {
      Sound.stopAll(['bgm', 'lastTen']);
      View.hidePrepareBoard();
      View.showMusicOnOff();
    }
    else if (state == 'pause') {
      Sound.stopAll(['bgm', 'lastTen']);
      View.hidePrepareBoard();
      View.showExit();
    } else if (state == 'outBox') {
      if (stateType == 'outBox') {
        View.showHands(false);
        if (this.isSoundOn) Sound.play('outBox');
        //View.showTips('tipsOutBox');
        View.showPrepareBoard();
      }
    } else if (state == 'finished') {
      View.setProgressBar(false);
      View.hideTopLeftControl();
      View.hideTips();
      View.hideGame();
      View.showHands(false);
      View.showFinished();
      Sound.stopAll();
      if (this.isSoundOn) {
        Sound.stopAll('bgm');
        if (Game.score >= 30) {
          Sound.play('passGame');
          //logController.log("Play.........................p");
        }
        else {
          Sound.play('failGame');
          //logController.log("Play.........................f");
        }
      }
      Game.countUp(View.finishedScore, 0, Game.score, 2000);
      Game.showFinalStars();
      Game.stopCountTime();
      return;
    }
    else if (state == 'leave') {
      const hostname = window.location.hostname;
      let homePageUrl = '';

      if (hostname.includes('dev.openknowledge.hk')) {
        if (this.apiManager.isLogined) {
          this.apiManager.exitGameRecord(
            () => {
              logController.log("leave page, back to history");
              window.history.back();
            }
          );
        }
        else {
          homePageUrl = window.location.origin + '/RainbowOne/webapp/OKAGames/SelectGames/';
          window.open(homePageUrl, '_self');
        }
      }
      else if (hostname.includes('www.rainbowone.app')) {
        if (this.apiManager.isLogined) {
          this.apiManager.exitGameRecord(
            () => {
              logController.log("leave page, back to history");
              window.history.back();
            }
          );
        }
        else {
          homePageUrl = 'https://www.starwishparty.com';
          window.open(homePageUrl, '_self');
        }
      }
      else if (hostname.includes('localhost')) {
        location.reload();
      }
      else {
        logController.log("Quit Game");
        if (this.apiManager.isLogined) {
          this.apiManager.exitGameRecord(
            () => {
              location.hash = 'exit';
            }
          );
        }
        else {
          location.hash = 'exit';
        }
      }
    }

    if (state != 'playing') {
      Game.stopCountTime();
    }

  },

  setSound(status) {
    if (!this.isSoundOn && status) {
      View.musicBtn.classList.add('on');
      View.musicBtn.classList.remove('off');
      Sound.play('bgm', true);
      if (Game.isPlayLastTen) {
        Sound.play('lastTen', true);
      }
      this.isSoundOn = status;
    }

    if (this.isSoundOn && !status) {
      View.musicBtn.classList.remove('on');
      View.musicBtn.classList.add('off');
      Sound.stopAll();
      this.isSoundOn = status;
    }
  }
  //-----------------------------------------------------------------------------------------------
};
