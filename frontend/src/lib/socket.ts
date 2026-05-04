// compatibility bridge
export { socketManager as default, socketManager } from './socketManager';
export const connectSocket = (token) => import('./socketManager').then(m => m.socketManager.connect(token));
export const getSocket = () => import('./socketManager').then(m => m.socketManager.getSocket());
// etc... 
// Actually, it's better to just update imports where used if they are few.
