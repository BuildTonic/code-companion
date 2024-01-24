const SYSTEM_PROMPT = 'Respond with JSON in the specified format below: ';

const DEFAULT_MODEL = 'gpt-3.5-turbo-1106';
const MODELS_WITH_JSON_SUPPORT = ['gpt-3.5-turbo-1106', 'gpt-4-1106-preview'];

class BackgroundTask {
  constructor(chatController) {
    this.messages = [];
    this.client = chatController.openai;
    this.chatController = chatController;
  }

  async run({ prompt, format, temperature = 1.0 }) {
    try {
      const messages = this.buildMessages(format, prompt);
      const config = {
        messages: messages,
        temperature: temperature,
      };

      config.model = this.chatController.settings.baseUrl ? this.chatController.selectedModel : DEFAULT_MODEL;
      if (MODELS_WITH_JSON_SUPPORT.includes(config.model)) {
        config.response_format = { type: 'json_object' };
      }

      const chatCompletion = await this.client.chat.completions.create(config);
      const response = JSON.parse(chatCompletion.choices[0].message.content).result;
      this.log(messages, response);
      return response;
    } catch (error) {
      console.error(error);
    }
  }

  buildMessages(format, prompt) {
    return [
      {
        role: 'system',
        content: `${SYSTEM_PROMPT}\n${JSON.stringify({ result: format })}`,
      },
      {
        role: 'user',
        content: prompt,
      },
    ];
  }

  log(messages, response) {
    if (isDevelopment) console.log('BackgroundTask: ' + JSON.stringify(messages) + ' ' + JSON.stringify(response));
  }
}

module.exports = BackgroundTask;
