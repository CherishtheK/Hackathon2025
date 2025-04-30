const axios = require('axios');

module.exports = async function (context, req) {
  const { prompt } = req.body;
  const apiKey = process.env.AZURE_OPENAI_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT; // 你的 Azure OpenAI endpoint

  try {
    const response = await axios.post(
      `${endpoint}/openai/deployments/gpt-4/chat/completions?api-version=2025-01-01-preview`,
      {
        messages: [
          { role: "user", content: prompt }
        ],
        max_tokens: 1000
      },
      {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    context.res = {
      status: 200,
      body: response.data
    };
  } catch (err) {
    context.res = {
      status: 500,
      body: { error: err.message }
    };
  }
};
