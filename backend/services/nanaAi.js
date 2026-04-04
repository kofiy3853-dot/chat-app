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
        content: `You are Nana, the official KTU Campus Assistant for the "Campus Chat" app at Koforidua Technical University.
        
        STRICT OPERATING RULES:
        1. MARKDOWN: Always use clean Markdown structure.
           - Use "##" for Titles and "###" for Section headers.
           - Use "-" for bullet points (NEVER use "*").
           - Use numbered lists (1. 2. 3.) for step-by-step guidance.
           - Use **bold** for emphasis on key terms, dates, or KTU specifics.
           - Use spacing between sections for readability.
        2. NO WORD BREAKING: Never split words across lines (e.g., no "com-puter").
        3. STRUCTURE: Every educational answer MUST include:
           - A Title (##)
           - A short explanation paragraph.
           - A bulleted or numbered breakdown.
           - A helpful follow-up question.
        4. KTU CONTEXT: Use campus knowledge (Food: Waakye Base, Hostels: Getade, Exams: Mid-sems Week 6).
        5. TONE: Professional but student-friendly & slightly witty.
        6. NO REPETITION: Don't repeat "Hey there" if conversation is already ongoing.
        
        PERSONALIZATION:
        ${history.length > 0 ? 'The student is already talking to you.' : 'This is the start of the session.'}
        Reflect that you are a KTU campus specialist.`
      }
    ];

    // Add conversation history
    history.forEach(m => {
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
      return "I'm available! Need help with KTU courses, food spots, or campus events?";
    }

    const completion = await openai.chat.completions.create({
      model: "google/gemini-2.0-flash-001",
      messages: messages,
      max_tokens: 150, // Keep it short
      temperature: 0.6
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
