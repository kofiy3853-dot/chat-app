const { OpenAI } = require('openai');

let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: "https://openrouter.ai/api/v1"
  });
} else {
  console.warn('[Nana AI] Warning: OPENAI_API_KEY is not set. Nana will use fallback responses.');
}

// Fixed system ID for Nana
const NANA_USER_ID = '7951b52c-b14e-486a-a802-8e0a9fa2495b';

/**
 * Get context-aware AI response from Nana.
 * @param {string} userMessage - The message mentioning @Nana
 * @param {Array} history - Previous messages in the conversation
 * @returns {Promise<string>}
 */
const getNanaAiResponse = async (userMessage, history = []) => {
  if (!openai) {
    console.warn('[Nana AI] AI connection is offline.');
    return "Hello! I'm Nana, your campus assistant. My AI connection is currently offline (API key missing), but I'm still here to help with what I can!";
  }

  try {
    // Format history for OpenAI
    const messages = [
      { 
        role: "system", 
        content: `You are Nana, a smart, polite, and slightly witty campus assistant for "Campus Chat", a university application. 
        You help students with academic queries, social info, and campus life. 
        Keep responses helpful, concise (mobile-friendly), and friendly. 
        Use Ghana/local context if appropriate since this is for a Ghanaian university (Koforidua Technical University - KTU).`
      }
    ];

    // Add conversation history
    // Filter out messages with no content to avoid API errors
    history.filter(m => m.content && m.content.trim()).forEach(m => {
      const isNana = m.sender?.role === 'NANA' || m.senderId === NANA_USER_ID;
      messages.push({
        role: isNana ? "assistant" : "user",
        content: m.content || ""
      });
    });

    // Add current message if not already in history
    if (userMessage && userMessage.trim() && !history.find(h => h.content === userMessage)) {
       messages.push({ role: "user", content: userMessage });
    }

    if (messages.length === 1 && (!userMessage || !userMessage.trim())) {
      return "I'm here! How can I help you today?";
    }

    console.log(`[Nana AI Debug] Sending prompt with ${messages.length} messages in chain.`);
    const completion = await openai.chat.completions.create({
      model: "google/gemini-2.0-flash-001", // OpenRouter model name
      messages: messages,
      max_tokens: 500,
      temperature: 0.7
    });

    const response = completion.choices[0].message.content;
    console.log(`[Nana AI Debug] SUCCESS! Response length: ${response?.length || 0}`);
    return response;
  } catch (error) {
    console.error('[Nana AI Error]:', error);
    if (error.code === 'insufficient_quota' || (error.message && error.message.includes('quota'))) {
       return "I've talked a bit too much today and reached my limit! Try asking me again later.";
    }
    if (error.status === 401 || error.status === 403) {
      return "I'm having a little trouble connecting to my brain right now (API Auth Error). Could you try again in a bit?";
    }
    return "I'm having a little trouble thinking straight right now. Could you try asking me that again?";
  }
};

module.exports = { getNanaAiResponse, NANA_USER_ID };
