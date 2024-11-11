import { logController } from './logController';

function parseUrlParams() {
  const currentURL = window.location.href;
  if (currentURL.includes('?')) {
    // Split the URL by the ? character to get the search params
    const [, searchParams] = currentURL.split('?');
    const params = searchParams.split('&');

    // Extract the required parameters
    const jwtParam = params.find(param => param.startsWith('jwt='));
    const jwtValue = jwtParam ? jwtParam.split('=')[1] : null;
    logController.log("jwt:", jwtValue);
    const idParam = params.find(param => param.startsWith('id='));
    const idValue = idParam ? idParam.split('=')[1] : null;
    logController.log("App/Book id:", idValue);
    const levelParam = params.find(param => param.startsWith('unit='));
    const levelValue = levelParam ? levelParam.split('=')[1] : null;
    logController.log("level:", levelValue);
    const gameTimeParam = params.find(param => param.startsWith('gameTime='));
    const gameTimeValue = gameTimeParam ? gameTimeParam.split('=')[1] : null;
    logController.log("game Time:", gameTimeValue);
    const fallSpeedParam = params.find(param => param.startsWith('fallSpeed='));
    const fallSpeedValue = fallSpeedParam ? fallSpeedParam.split('=')[1] : null;
    logController.log("fall Speed:", fallSpeedValue);
    const removalParam = params.find(param => param.startsWith('removal='));
    const removalValue = removalParam ? removalParam.split('=')[1] : null;
    logController.log("removal:", removalValue);
    const modelParam = params.find(param => param.startsWith('model='));
    const modelValue = modelParam ? modelParam.split('=')[1] : null;
    logController.log("modelValue:", modelValue);
    const fpsParam = params.find(param => param.startsWith('fps='));
    const fpsValue = fpsParam ? fpsParam.split('=')[1] : null;
    logController.log("fpsValue:", fpsValue);

    return {
      jwt: jwtValue,
      id: idValue,
      levelKey: levelValue,
      gameTime: gameTimeValue,
      fallSpeed: fallSpeedValue,
      removal: removalValue !== null ? removalValue : 0,
      fps: fpsValue !== null ? fpsValue : 0,
      model: modelValue,
    };
  }

  return {
    jwt: null,
    id: null,
    levelKey: null,
    gameTime: null,
    fallSpeed: null,
    removal: 0,
    fps: 0,
    model: null,
  };
}

export { parseUrlParams };
