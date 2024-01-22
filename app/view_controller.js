const hljs = require('highlight.js/lib/common');
const { marked } = require('marked');
const { markedHighlight } = require('marked-highlight');
const autosize = require('autosize');

class ViewController {
  initializeUIFormatting() {
    marked.setOptions({
      renderer: new marked.Renderer(),
      pedantic: false,
      gfm: true,
      breaks: true,
      smartypants: false,
      xhtml: false,
    });
    marked.use(
      markedHighlight({
        langPrefix: 'language-',
        highlight(code, language) {
          if (hljs.getLanguage(language)) {
            return hljs.highlight(code, { language }).value;
          }
          return hljs.highlightAuto(code).value;
        },
      }),
    );
    const messageInput = document.getElementById('messageInput');
    autosize(messageInput);
  }

  handleClick(event) {
    let targetElement = event.target;

    if (targetElement.tagName === 'I' && targetElement.parentElement && targetElement.parentElement.tagName === 'A') {
      targetElement = targetElement.parentElement;
    }

    if (targetElement.tagName === 'A' && targetElement.href.startsWith('http')) {
      event.preventDefault();
      shell.openExternal(targetElement.href);
    }
  }

  buildDropdown(elementId, options, selectedOption) {
    const select = document.getElementById(elementId);
    Object.entries(options).forEach(([optionValue, optionText]) => {
      const option = document.createElement('option');
      option.value = optionValue;
      option.innerText = optionText;
      if (optionValue === selectedOption) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  }

  scrollToBottom() {
    const container = document.getElementById('search_result_container');
    const lastMessage = container.lastElementChild;

    if (lastMessage) {
      const rect = lastMessage.getBoundingClientRect();
      const bodyRect = document.body.getBoundingClientRect();
      const scrollPos = rect.bottom - bodyRect.top + 150; // offset from top of the body
      window.scrollTo({
        top: scrollPos,
        behavior: 'smooth',
      });
    }
  }

  async copyCode(block, button) {
    const code = block.querySelector('code');
    const text = code.innerText;
    await navigator.clipboard.writeText(text);
    button.innerHTML = '<i class="bi bi-clipboard-check"></i>';

    setTimeout(() => {
      button.innerHTML = '<i class="bi bi-clipboard"></i>';
    }, 1000);
  }

  addCopyCodeButtons() {
    const blocks = document.querySelectorAll('pre');
    blocks.forEach((block) => {
      block.classList.add('hljs');
      if (navigator.clipboard) {
        const button = document.createElement('button');
        button.classList.add('btn', 'btn-sm', 'position-absolute');
        button.style.top = '8px';
        button.style.right = '8px';
        button.innerHTML = '<i class="bi bi-clipboard"></i>';
        block.style.position = 'relative';
        block.appendChild(button);

        button.addEventListener('click', async () => {
          await this.copyCode(block, button);
        });
      }
    });
  }

  formatResponse(item) {
    const copyButton = `<button class="btn btn-sm" id=copyMessage${item.id} onclick="chatController.chat.copyFrontendMessage(${item.id})"><i class="bi bi-clipboard"></i></button>`;
    const deleteMessagesButton = `<button class="btn btn-sm" id=deleteMessage${item.id} onclick="chatController.chat.deleteMessagesAfterId(${item.id})"><i class="bi bi-trash"></i></button>`;
    const buttons = `<div class="col-auto pt-3">${deleteMessagesButton}${copyButton}</div>`;

    const roleIcons = {
      user: 'person',
      command: 'terminal',
      function: 'function',
      error: 'exclamation-triangle text-warning',
      info: 'info-circle',
      file: 'paperclip',
      onboarding: 'info-circle',
      default: 'chat-right-dots text-success',
    };

    const roleIcon = roleIcons[item.role] || roleIcons['default'];
    return this.createMessageHTML(roleIcon, item.content, buttons);
  }

  createMessageHTML(roleIcon, content, buttons = '') {
    return `<div class="row mt-3">
            <div class="col-auto pt-3">
                <i class="bi bi-${roleIcon}"></i>
              </div>
            <div class="col pt-3">
                ${content ? marked.parse(content) : ''}
            </div>
            ${buttons}
          </div>`;
  }

  changeTheme(theme) {
    const htmlElement = document.querySelector('html');
    htmlElement.setAttribute('data-bs-theme', theme);
    localStorage.set('theme', theme);

    const stylesheet = document.querySelector('link[href^="node_modules/highlight.js/styles/"]');
    if (theme === 'light') {
      stylesheet.href = 'node_modules/highlight.js/styles/github.css';
    } else {
      stylesheet.href = 'node_modules/highlight.js/styles/github-dark-dimmed.css';
    }

    ipcRenderer.send('theme-change', theme);
  }

  updateFooterMessage(message) {
    let messageToShow = message || '';
    if (chatController.conversationTokens > 0 && message) {
      messageToShow += ' | ';
    }
    if (chatController.conversationTokens > 0) {
      messageToShow += `Tokens: Last - ${chatController.lastRequestTokens}, Total - ${chatController.conversationTokens}`;
    }
    if (messageToShow) {
      document.getElementById('systemMessage').innerText = messageToShow;
    }
  }

  updateLoadingIndicator(show, message = 'Loading...') {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const loadingIndicatorMessage = document.getElementById('loadingMessage');
    if (show) {
      loadingIndicator.removeAttribute('hidden');
      loadingIndicatorMessage.innerText = message;
    } else {
      loadingIndicator.setAttribute('hidden', true);
      loadingIndicatorMessage.innerText = '';
    }
  }

  onShow() {
    messageInput.focus();
  }

  selectDirectory() {
    ipcRenderer.send('open-directory');
  }

  openFileDialogue() {
    ipcRenderer.send('open-file-dialog');
  }

  openFileInIDE(filePath) {
    const terminalCommand = `${chatController.settings.commandToOpenFile} "${filePath}"`;
    chatController.terminalSession.executeCommandWithoutOutput(terminalCommand);
  }
}

module.exports = ViewController;
