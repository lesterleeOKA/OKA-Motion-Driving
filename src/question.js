import Questions from '../static/json/questions.json';
import { imageFiles } from './mediaFile';
import { apiManager, HostName } from "./apiManager";
import { logController } from './logController';
import Util from './util';

const hostname = window.location.hostname;

const QuestionManager = {
  questionField: null,
  QUESTION_TYPE: Object.freeze({
    questions: [],
  }),
  preloadedImages: [],
  preloadedImagesItem: [],
  apiMedia: [],
  mediaType: '',
  questionType: '',

  preloadImagesFile() {
    logController.log("preloadedImages", this.preloadedImages);
    this.preloadedImages.forEach((item) => {
      const img = new Image();
      img.id = item[0];
      img.src = item[1];
      this.preloadedImagesItem.push(img);
      Util.updateLoadingStatus("Loading Images");
    });

    logController.log("preloadedImagesItem", this.preloadedImagesItem);
  },

  checkIsLogin: function (jwt = null, appId = null, levelkey = null, onCompleted = null, onError = null) {
    if (jwt && typeof jwt === 'string' && jwt.trim() !== '' &&
      appId && typeof appId === 'string' && appId.trim() !== '') {
      logController.log("JWT and App ID are valid.");
      apiManager.isLogined = true;
      this.loadQuestionData(jwt, appId, levelkey, onCompleted, onError);
    }
    else {
      apiManager.isLogined = false;
      logController.log("Missing JWT and App ID.");
      this.loadQuestionFromJson(levelkey, onCompleted);
    }
  },

  loadQuestionData: async function (jwt = null, appId = null, levelkey = null, onCompleted = null, onError = null) {
    try {
      await apiManager.postGameSetting(jwt, appId, () => this.loadQuestionFromJson(levelkey, onCompleted), () => onError());
    } catch (error) {
      if (onError) onError();
      logController.error('Error loading JSON data:', error);
    }
  },

  loadQuestionFromJson: async function (levelkey = null, onCompleted = null) {
    let questionsJsonPath;
    let questions;
    let mediaFiles;

    logController.log("Account Logined", apiManager.isLogined);
    if (apiManager.questionJson && apiManager.isLogined) {
      questions = apiManager.questionJson;
      this.questionType = questions[0].questionType;
      logController.log("question Type:", this.questionType);
      if (questions[0].media && Array.isArray(questions[0].media)) {
        mediaFiles = questions[0].media;
        if (mediaFiles.length > 0) {
          this.mediaType = getMediaType(mediaFiles[0]);
          logController.log("mediaType:", this.mediaType);
          questions.forEach((question) => {
            const key = question.qid;
            const url = HostName.blobMedia + question.media;
            this.apiMedia.push([key, url]);
            Util.updateLoadingStatus("Loading Medias");
          });
          logController.log("apiMedia files:", this.apiMedia);
        } else {
          logController.log("No media files available for the first question");
        }
      } else {
        logController.log("No media property or not an array for the first question");
      }
      this.QUESTION_TYPE = { questions: questions };
    }
    else {
      logController.log("hostname", hostname);

      if (hostname.includes('dev.openknowledge.hk') ||
        hostname.includes('www.rainbowone.app')
      ) {
        // We're in the build context, use the relative path
        questionsJsonPath = './json/questions.json';
        const response = await fetch(questionsJsonPath);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${questionsJsonPath}: ${response.statusText}`);
        }
        questions = await response.json();
        logController.log(questions);
      } else {
        // We're in the development context, use the relative path
        questions = Questions;
        logController.log(questions);
      }

      this.QUESTION_TYPE = {
        questions: questions.questions,
      };
    }

    if (onCompleted) onCompleted();
    this.loadQuestionType(levelkey);
  },

  loadQuestionType: function (levelKey) {
    let question = null;
    if (levelKey) {
      question = {
        questions: this.QUESTION_TYPE.questions.filter(item => item.qid.includes(levelKey)),
      };
      this.preloadedImages = imageFiles.filter(img => img[0].includes(levelKey));
    }
    else {
      question = { questions: this.QUESTION_TYPE.questions };
      if (apiManager.isLogined) {
        if (this.mediaType === 'picture')
          this.preloadedImages = this.apiMedia;
      }
      else {
        this.preloadedImages = imageFiles;
      }
    }
    if (question.questions.length > 0)
      this.questionField = Object.freeze(question);

    if (this.preloadedImages !== null && this.preloadedImages !== undefined && this.preloadedImages.length > 0)
      this.preloadImagesFile();

    logController.log("Filtered: ", this.questionField);
  },
};

function getMediaType(mediaPath) {
  // Get the file extension
  const extension = mediaPath.split('.').pop().toLowerCase();
  const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a'];
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'];

  if (audioExtensions.includes(extension)) {
    return 'audio';
  } else if (imageExtensions.includes(extension)) {
    return 'picture';
  } else {
    return 'unknown';
  }
}

export default QuestionManager;
