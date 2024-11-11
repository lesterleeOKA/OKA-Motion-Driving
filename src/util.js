
import View from './view';
import { logController } from './logController';

export default {

  percentValue: 0,
  timer: null,
  loadingStatus: null,
  loadingText: null,
  loadingDots: 0,


  loadingStart(retry = 0) {
    logController.log('in loadingStart(), retry:' + retry);
    if (retry > 25) return;

    let greenBar = document.getElementById("greenBar");
    this.loadingText = document.querySelector('.loadingFont');
    this.loadingStatus = document.querySelector('.loadingFontFixed');
    this.updateLoadingStatus("Now Loading");

    if (View.loadingBarWrapper && greenBar) {
      View.loadingBarWrapper.style.display = "flex";
      this.timer = setInterval(() => {
        let greenBar = document.getElementById("greenBar");
        if (greenBar) {
          if (this.percentValue >= 95 && this.timer) clearInterval(this.timer);
          if (!this.percentValue) this.percentValue = 50;
          this.loadingDots = (this.loadingDots + 1) % 4;
          this.loadingText.textContent = `${'.'.repeat(this.loadingDots)}`;
          //greenBar.style.width = this.percentValue + "%";

          let rightPosition = (100 - this.percentValue) + "%";
          greenBar.style.setProperty('--progress-right', rightPosition);

          this.percentValue += ((95 - this.percentValue) / 3);
        } else {
          if (this.timer) clearInterval(this.timer);
        }
      }, 1000);
    } else {
      setTimeout(() => this.loadingStart(retry + 1), 200);
    }

  },

  updateLoadingStatus(statusMsg) {
    this.loadingStatus.textContent = `${statusMsg}`;
  },

  loadingComplete() {
    return new Promise((resolve, reject) => {
      this.percentValue = 100;
      this.loadingDots = (this.loadingDots + 1) % 4;
      this.loadingText.textContent = `${'.'.repeat(this.loadingDots)}`;
      if (this.timer) clearInterval(this.timer);

      let greenBar = document.getElementById("greenBar");
      if (greenBar) {
        greenBar.style.setProperty('--progress-right', '0%');

        //greenBar.style.width = this.percentValue + "%";
        setTimeout(() => {
          if (View.loadingBarWrapper) View.loadingBarWrapper.style.display = "none";
          resolve();
        }, 1000);
      } else {
        resolve();
      }
    });
  }

}
