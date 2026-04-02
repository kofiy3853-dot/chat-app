const { OpenAI } = require('openai');

let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} else {
  console.warn('[Nana AI] Warning: OPENAI_API_KEY is not set. Nana will use fallback responses.');
}

/**
 * Get context-aware AI response from Nana.
 * @param {string} userMessage - The message mentioning @Nana
 * @param {Array} history - Previous messages in the conversation
 * @returns {Promise<string>}
 */
const getNanaAiResponse = async (userMessage, history = []) => {
  if (!openai) {
    return "Hello! I'm Nana, your campus assistant. My AI connection is currently offline (API key missing), but I'm still here to help with what I can!";
  }

  try {
    const nanaUserId = '7951b52c-b14e-486a-a802-8e0a9fa2495b';
    
    // Format history for OpenAI
    const messages = [
      { 
        role: "system", 
        content: `You are Nana, a smart, polite, and slightly witty campus assistant for "Campus Chat", a university application. 
        You help students with academic queries, social info, and campus life. 
        Current User's Name: ${history.length > 0 ? history[history.length-1].sender?.name || 'Student' : 'Student'}.
        Keep responses helpful, concise (mobile-friendly), and friendly. 
        Use Ghana/local context if appropriate since this is for a Ghanaian university (KTU).`
      }
    ];

    // Add conversation history
    history.forEach(m => {
      messages.push({
        role: m.senderId === nanaUserId ? "assistant" : "user",
        content: m.content || ""
      });
    });

    // Add current message if not already in history
    if (!history.find(h => h.content === userMessage)) {
       messages.push({ role: "user", content: userMessage });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      max_tokens: 500,
      temperature: 0.7
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('[Nana AI Error]:', error);
    if (error.code === 'insufficient_quota') {
       return "I've talked a bit too much today and reached my limit! Try asking me again later.";
    }
    return "I'm having a little trouble thinking straight right now. Could you try asking me that again?";
  }
};

module.exports = { getNanaAiResponse };
