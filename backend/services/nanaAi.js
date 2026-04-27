const { OpenAI } = require('openai');
const prisma = require('../prisma/client');

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
 * @param {object} user - The user object sending the message
 * @returns {Promise<string>}
 */
const getNanaAiResponse = async (userMessage, history = [], user = null, conversationId = null) => {
  if (!openai) {
    console.warn('[Assistant AI] AI connection is offline.');
    return "Hello! I'm your system assistant. My AI connection is currently offline, but I'm still here to help with what I can!";
  }

  try {
    // Format history for OpenAI - Limit to last 10 messages for token safety
    const recentHistory = history.slice(-10);
    
    let extendedContext = '';
    
    if (conversationId) {
      try {
        const conv = await prisma.conversation.findUnique({
          where: { id: conversationId },
          include: {
            course: {
              include: {
                assignments: { where: { deadline: { gt: new Date() } }, orderBy: { deadline: 'asc' }, take: 3 },
                materials: { orderBy: { createdAt: 'desc' }, take: 3 }
              }
            }
          }
        });

        if (conv && conv.course) {
          extendedContext = `\n\nCURRENT COURSE CONTEXT:\nYou are assisting in the chat for Course: ${conv.course.code} - ${conv.course.name}.`;
          
          if (conv.course.assignments?.length > 0) {
             extendedContext += `\nUpcoming Assignments:\n` + conv.course.assignments.map(a => `- ${a.title} (Due: ${new Date(a.deadline).toLocaleDateString()}) [${a.points} pts]`).join('\n');
          } else {
             extendedContext += `\nNo upcoming assignments.`;
          }
          
          if (conv.course.materials?.length > 0) {
             extendedContext += `\nRecent Materials:\n` + conv.course.materials.map(m => `- ${m.title}`).join('\n');
          }
        }
      } catch (err) {
        console.error('[Nana AI] Error fetching RAG context:', err.message);
      }
    }

    const messages = [
      { 
        role: "system", 
        content: `You are Nana, the official KTU Campus Assistant for the "Campus Chat" app at Koforidua Technical University.
        
        STRICT OPERATING RULES:
        1. MARKDOWN: Always use clean Markdown structure.
           - Use "##" for Titles and "###" for Section headers.
           - Use "-" for bullet points (NEVER use "*").
           - Use numbered lists (1. 2. 3.) for step-by-step guidance.
           - Use **bold** for emphasis on key terms or dates.
           - Use spacing between sections for readability.
        2. NO WORD BREAKING: Never split words across lines.
        3. STRUCTURE: Every educational or detailed answer MUST include:
           - A Title (##)
           - A short explanation paragraph.
           - A bulleted or numbered breakdown.
           - A helpful follow-up question.
        4. KTU CONTEXT: Speak with authority on KTU campus life (Food: Waakye Base, Hostels: Getade, Exams: Mid-sems Week 6).
        5. TONE: Professional but student-friendly & slightly witty.
        6. NO REPETITION: Don't repeat greetings or "I'm available" if conversation is ongoing.
        
        STUDENT CONTEXT:
        You are currently talking to **${user?.name || 'a student'}**.
        Reflect that you are a KTU campus specialist.${extendedContext}`
      }
    ];

    // Add conversation history
    recentHistory.forEach(m => {
      const isNana = m.sender?.role === 'NANA' || m.senderId === NANA_USER_ID;
      messages.push({
        role: isNana ? "assistant" : "user",
        name: isNana ? "Nana" : (m.sender?.name || "Student").replace(/[^a-zA-Z0-9_-]/g, '_'),
        content: m.content || ""
      });
    });

    // Add current message if not already in history
    if (userMessage && userMessage.trim() && !recentHistory.find(h => h.content === userMessage)) {
       messages.push({ role: "user", name: (user?.name || "Student").replace(/[^a-zA-Z0-9_-]/g, '_'), content: userMessage });
    }

    if (messages.length === 1 && (!userMessage || !userMessage.trim())) {
      return "I'm available! Need help with KTU courses, food spots, or campus events?";
    }

    const completion = await openai.chat.completions.create({
      model: "google/gemini-2.0-flash-001",
      messages: messages,
      max_tokens: 1000, 
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
