import './styles.css';
import { App, type Route, type ScreenFactory } from './app';
import { GameAudio } from './audio';
import { avatarScreen } from './screen-avatar';
import { battleScreen } from './screen-battle';
import { levelMapScreen } from './screen-level-map';
import { missionsScreen } from './screen-missions';
import { settingsScreen } from './screen-settings';
import { titleScreen } from './screen-title';
import { Store } from './store';

const SCREENS: Record<Route['name'], ScreenFactory> = {
  title: titleScreen,
  settings: settingsScreen,
  avatar: avatarScreen,
  missions: missionsScreen,
  map: levelMapScreen,
  battle: battleScreen,
};

const stage = document.getElementById('game');
if (stage === null) throw new Error('Missing #game element');

const store = new Store();
const audio = new GameAudio(store);
const app = new App(stage, { store, audio }, (route) => SCREENS[route.name]);

const unlockAudio = (): void => {
  audio.unlock();
  window.removeEventListener('pointerdown', unlockAudio);
  window.removeEventListener('keydown', unlockAudio);
};
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);
document.addEventListener('visibilitychange', () => audio.setHidden(document.hidden));

app.go({ name: 'title' });
