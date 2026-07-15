class AIClient {
  constructor() {
    this.baseUrl = '/api';
    this.timeout = 30000;
  }

  async generateTravelFragrance(userScene) {
    return this._callApi('/travel-fragrance', { userScene });
  }

  async generateCharacterFragrance(userCharacter) {
    return this._callApi('/character-fragrance', { userCharacter });
  }

  async generateMemoryFragrance(userMemory) {
    return this._callApi('/memory-fragrance', { userMemory });
  }

  async adjustFragrance(baseFormula, adjustRequest) {
    return this._callApi('/fragrance-adjust', { baseFormula, adjustRequest });
  }

  async _callApi(endpoint, data) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });

      clearTimeout(timer);
      if (!response.ok) {
        throw new Error(`API请求失败，状态码：${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error(`调用 ${endpoint} 失败：`, err);
      return { success: false, error: err.message };
    }
  }

  extractJson(text) {
    try {
      return JSON.parse(text);
    } catch (e) {
      const match = text.match(/```json\s*([\s\S]*?)\s*```/);
      return match ? JSON.parse(match[1]) : null;
    }
  }
}

export const aiClient = new AIClient();
