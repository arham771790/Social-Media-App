import { aiGenerateTags, aiSuggestCaptions, aiMediaAwareCaptions, aiTitleFromContent } from '../utils/aiClient.js';

class AIService {
  async suggestMediaAwareCaptions(data) {
    return aiMediaAwareCaptions(data);
  }

  async titleFromContent(data) {
    return aiTitleFromContent(data);
  }

  async generateTags(data) {
    return aiGenerateTags(data);
  }

  async suggestCaptions(data) {
    return aiSuggestCaptions(data);
  }
}

export default new AIService();
