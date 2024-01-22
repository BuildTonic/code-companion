const os = require('os');
const fs = require('graceful-fs');
const path = require('path');
const { _, debounce } = require('lodash');
const { ipcRenderer, shell } = require('electron');
const Store = require('electron-store');
const Sentry = require('@sentry/electron/renderer');
const { CaptureConsole } = require('@sentry/integrations');

const ViewController = require('./app/view_controller');
const ChatController = require('./app/chat_controller');
const OnboardingController = require('./app/onboarding_controller');

const { processFile, handleDrop } = require('./app/chat/file_handler');
const { modelOptions, defaultModel } = require('./app/static/models_config');

const localStorage = new Store();
const chatController = new ChatController();
const viewController = new ViewController();
const onboardingController = new OnboardingController();

const isWindows = process.platform === 'win32';
const isDevelopment = process.env.NODE_ENV === 'development';
let dataPath;

// Add bug tracking

if (!isDevelopment) {
  Sentry.init({
    dsn: 'https://87985c08c00b4f0c83989b182e9fbe95@o4505507137847296.ingest.sentry.io/4505507139485696',
    integrations: [new CaptureConsole()],
  });
}

// Register IPC events listeners
ipcRenderer.on('read-files', async (event, file) => {
  const { filePaths } = file;
  for (const filePath of filePaths) {
    processFile(filePath);
  }
});

ipcRenderer.on('directory-data', async (event, file) => {
  const { filePaths } = file;
  if (filePaths.length > 0) {
    chatController.agent.projectController.openProject(filePaths[0]);
  }
});

ipcRenderer.on('app-info', (event, data) => {
  const { version, userDataPath } = data;
  dataPath = userDataPath;
  document.getElementById('appVersion').innerText = version;
});

ipcRenderer.on('file-error', (event, errMessage) => {
  alert(`An error occurred reading the file: ${errMessage}`);
});

ipcRenderer.on('save-shortcut-triggered', () => {
  chatController.chat.history.showModal();
});

// Register event listeners
document.addEventListener('DOMContentLoaded', () => {
  viewController.buildDropdown('selectedModel', modelOptions, chatController.settings.selectedModel);
  viewController.initializeUIFormatting();
  viewController.changeTheme(chatController.settings.theme);
  chatController.clearChat();

  onboardingController.showAllTips();
});

const debouncedSubmit = debounce(chatController.processMessageChange, 100);
document.getElementById('messageInput').addEventListener('keydown', debouncedSubmit);

document.getElementById('reject_button').addEventListener('click', function () {
  chatController.agent.userDecision = false;
});

document.getElementById('approve_button').addEventListener('click', function () {
  chatController.agent.userDecision = true;
});

// Open links in actual web browser not in app
document.addEventListener('click', (event) => {
  viewController.handleClick(event);
});
