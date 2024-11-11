import Util from './util';
import { logController } from './logController';

export default {
  audioContext: null,
  audios: {},
  useAudioElement: false,

  init() {
    try {
      // Check if the Web Audio API is supported
      if (window.AudioContext || window.webkitAudioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        logController.log("Your browser supports the Web Audio API");
        this.useAudioElement = false;
      } else {
        // Fallback to an alternative audio solution, such as the <audio> element
        logController.log("Your browser does not support the Web Audio API. Using the <audio> element instead.");
        this.useAudioElement = true;
      }
    } catch (error) {
      console.error("Error initializing AudioContext:", error);
      // Fallback to an alternative audio solution, such as the <audio> element
      this.useAudioElement = true;
    }
  },
  preloadAudio(key, url, createAudioContext = false, volume = 1) {
    return new Promise((resolve, reject) => {

      if (this.useAudioElement) {
        let audio = new Audio();
        audio.src = url;
        audio.volume = volume;
        this.audios[key] = audio;
        resolve(audio);
      }
      else {
        let audio = { volume: volume, audioBuffer: null, audioContext: createAudioContext }
        let ajax = new XMLHttpRequest();
        ajax.open("GET", url, true);
        ajax.responseType = "arraybuffer"
        ajax.onload = () => {
          this.audioContext.decodeAudioData(
            ajax.response,
            (buffer) => {
              audio.audioBuffer = buffer;
              this.audios[key] = audio;
              resolve(audio);
            },
            (error) => { debugger }
          )
        }

        ajax.onerror = () => { debugger }
        ajax.send()
      }
    });
  },
  play(key, loop = false, volume = null) {
    //logController.log('Play sound: ' + key);
    if (!this.audios[key]) return;
    let audio = this.audios[key];
    if (!audio.audioBuffer) return false;
    let audioContext = (audio.audioContext) ? (new (window.AudioContext || window.webkitAudioContext)()) : this.audioContext;
    let source = audioContext.createBufferSource()
    if (!source) return false;
    source.buffer = audio.audioBuffer;
    source.loop = loop;
    if (!source.start) source.start = source.noteOn;
    if (!source.start) return false
    let gainNode = audioContext.createGain()
    gainNode.gain.value = volume || audio.volume
    source.connect(gainNode)
    gainNode.connect(audioContext.destination);
    source.start(0);

    source.addEventListener('ended', () => {
      source.stop();
    });

    audio.gainNode = gainNode
    return true

    /*if (this.audios[key] && this.audios[key].readyState>2) {
      this.stop(key);
      if (force) this.audios[key].currentTime = 0;
      this.audios[key].play();
    }*/
  },
  stop(key) {
    if (!this.audios[key]) return;
    let audio = this.audios[key];
    if (audio.gainNode) audio.gainNode.gain.value = 0;
  },
  pause(key) {
    if (!this.audios[key]) return;
    let audio = this.audios[key];
    if (audio.gainNode && audio.gainNode.context) audio.gainNode.context.suspend();
  },
  resume(key) {
    if (!this.audios[key]) return;
    let audio = this.audios[key];
    if (audio.gainNode && audio.gainNode.context) {
      audio.gainNode.gain.value = 1;
      audio.gainNode.context.resume();
    }
  },
  /*function setSoundVolume(sound, volume) {
  sound.volume = volume

  if(sound.gainNode)
    sound.gainNode.gain.value = volume
  }*/
  // How to use:
  //var mySound = loadSound("myFile.wav")
  // Then later after audio is unlocked and the sound is loaded:
  //playSound(mySound)
  // How to unlock all sounds:
  //var emptySound = loadSound("https://touchbasic.app/nothing.wav")
  //document.body.addEventListener('touchstart', function(){playSound(emptySound)}, false)

  //-----------------------------------------------------------------------------------------------
  preloadAudio_old(key, url, loop = false) {
    logController.log('in preloadAudio(' + key + ')');
    return new Promise((resolve, reject) => {
      let audio = new Audio(url);
      audio.preload = "auto";
      audio.loop = loop;
      audio.oncanplaythrough = () => {
        logController.log('audio(' + key + ') loaded.');
        resolve(audio);
      }
      audio.load();
      this.audios[key] = audio;
    });
  },
  //-----------------------------------------------------------------------------------------------
  preloadAudios(paramArray) {
    logController.log('in preloading audios....................................');
    Util.updateLoadingStatus("Loading Audio");
    let pArray = [];
    for (let [key, url, createAudioContext, volume] of paramArray) {
      pArray.push(this.preloadAudio(key, url, createAudioContext, volume));
    }
    return Promise.all(pArray);
  },
  //-----------------------------------------------------------------------------------------------
  play_old(key, force) {
    if (this.audios[key] && this.audios[key].readyState > 2) {
      this.stop(key);
      if (force) this.audios[key].currentTime = 0;
      this.audios[key].play();
    }
  },
  //-----------------------------------------------------------------------------------------------
  stop_old(key) {
    if (this.audios[key] && this.audios[key].readyState > 2) this.audios[key].pause();
  },
  //-----------------------------------------------------------------------------------------------
  stopAll(except = []) {
    for (let key in this.audios) if (!except.includes(key)) this.stop(key);
  },
  //-----------------------------------------------------------------------------------------------

}
