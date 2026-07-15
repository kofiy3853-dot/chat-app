const { OpenAI } = require('openai');
const { MorphClient } = require('@morphllm/morphsdk');
const prisma = require('../prisma/client');

// --- Morph Client (Fast Models, Router, Compact) ---
let morph = null;
let openai = null;

if (process.env.MORPH_API_KEY && process.env.MORPH_API_KEY !== 'set-your-morph-api-key-here') {
  morph = new MorphClient({ apiKey: process.env.MORPH_API_KEY });
  // Use Morph's OpenAI-compatible endpoint for Fast Models
  openai = new OpenAI({
    apiKey: process.env.MORPH_API_KEY,
    baseURL: 'https://api.morphllm.com/v1'
  });
  console.log('[Nana AI] Connected to Morph (Fast Models + Router + Compact)');
} else if (process.env.OPENROUTER_API_KEY) {
  // Fallback to OpenRouter if Morph key not set
  openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1'
  });
  console.log('[Nana AI] Connected to OpenRouter (fallback)');
} else {
  console.warn('[Nana AI] No API key set. Nana will use fallback responses.');
}

// Fixed system ID for Nana
const NANA_USER_ID = '7951b52c-b14e-486a-a802-8e0a9fa2495b';

// --- Model Router ---
// Maps difficulty labels to Morph model IDs
const MODEL_TIERS = {
  easy: 'morph-dsv4flash',       // DeepSeek V4 Flash — $0.139/1M in
  medium: 'morph-qwen36-27b',    // Qwen 3.6 27B — $0.289/1M in
  hard: 'morph-glm52-744b',      // GLM-5.2 744B — $1.10/1M in
  needs_info: 'morph-dsv4flash'  // Default to cheapest
};

const DEFAULT_MODEL = 'morph-dsv4flash';

/**
 * Route a prompt to the cheapest capable model via Morph Router.
 */
async function routeModel(userMessage) {
  if (!morph) return DEFAULT_MODEL;

  try {
    const res = await fetch('https://api.morphllm.com/v1/router/multimodel', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MORPH_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: userMessage,
        allowed_models: Object.values(MODEL_TIERS),
        policy: 'cost_efficient',
        default_model: DEFAULT_MODEL
      })
    });

    if (!res.ok) return DEFAULT_MODEL;
    const data = await res.json();
    const model = data.model || DEFAULT_MODEL;
    console.log(`[Nana Router] Difficulty: ${data.difficulty || 'unknown'} → Model: ${model}`);
    return model;
  } catch (err) {
    console.error('[Nana Router] Error:', err.message);
    return DEFAULT_MODEL;
  }
}

/**
 * Compress chat history using Morph Compact.
 * Returns compressed history array, or falls back to hard truncation.
 */
async function compactHistory(history, userMessage) {
  if (!morph || history.length <= 5) {
    return history.slice(-10);
  }

  try {
    // Format history as text for Compact
    const formatted = history.map(m => {
      const isNana = m.sender?.role === 'NANA' || m.senderId === NANA_USER_ID;
      const name = isNana ? 'Nana' : (m.sender?.name || 'Student');
      return `[${name}]: ${m.content || ''}`;
    }).join('\n');

    const result = await morph.compact({
      input: formatted,
      query: userMessage,
      compressionRatio: 0.5,
      preserveRecent: 3
    });

    // Parse compacted output back into message-like objects
    const lines = result.output.split('\n').filter(l => l.trim());
    const compacted = lines.map(line => {
      const nanaMatch = line.match(/^\[Nana\]:\s*(.*)/);
      if (nanaMatch) {
        return { role: 'assistant', content: nanaMatch[1] };
      }
      const userMatch = line.match(/^\[([^\]]+)\]:\s*(.*)/);
      if (userMatch) {
        return { role: 'user', content: userMatch[2] };
      }
      return null;
    }).filter(Boolean);

    if (compacted.length > 0) {
      const reduction = Math.round((1 - result.usage.compression_ratio) * 100);
      console.log(`[Nana Compact] Compressed ${history.length} messages → ${compacted.length} lines (${reduction}% reduction)`);
      return compacted;
    }
  } catch (err) {
    console.error('[Nana Compact] Error:', err.message);
  }

  // Fallback: hard truncation
  return history.slice(-10);
}

/**
 * Get context-aware AI response from Nana.
 * @param {string} userMessage - The message mentioning @Nana
 * @param {Array} history - Previous messages in the conversation
 * @param {object} user - The user object sending the message
 * @param {string|null} conversationId - Current conversation ID
 * @returns {Promise<string>}
 */
const getNanaAiResponse = async (userMessage, history = [], user = null, conversationId = null) => {
  if (!openai) {
    console.warn('[Assistant AI] AI connection is offline.');
    return "Hello! I'm your system assistant. My AI connection is currently offline, but I'm still here to help with what I can!";
  }

  try {
    // 1. Compress history (Compact or fallback truncation)
    const recentHistory = await compactHistory(history, userMessage);

    // 2. Fetch RAG context (course data)
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

    // 3. Build messages array
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

    // 4. Add conversation history (from Compact output or fallback)
    recentHistory.forEach(m => {
      // If compacted, messages already have role/content format
      if (m.role && m.content) {
        messages.push({ role: m.role, content: m.content });
        return;
      }
      // Original DB message format
      const isNana = m.sender?.role === 'NANA' || m.senderId === NANA_USER_ID;
      const senderName = isNana ? "Nana" : (m.sender?.name || "Student");
      messages.push({
        role: isNana ? "assistant" : "user",
        content: `[${senderName}]: ${m.content || ""}`
      });
    });

    // 5. Add current message if not already in history
    if (userMessage && userMessage.trim() && !recentHistory.find(h => h.content === userMessage)) {
       const senderName = user?.name || "Student";
       messages.push({
         role: "user",
         content: `[${senderName}]: ${userMessage}`
       });
    }

    if (messages.length === 1 && (!userMessage || !userMessage.trim())) {
      return "I'm available! Need help with KTU courses, food spots, or campus events?";
    }

    // 6. Route to optimal model (Router)
    const model = await routeModel(userMessage);

    // 7. Call Fast Model
    const completion = await openai.chat.completions.create({
      model: model,
      messages: messages,
      max_tokens: 1000,
      temperature: 0.7
    });

    const response = completion.choices[0].message.content;
    const tokens = completion.usage;
    console.log(`[Nana AI] Model: ${model} | Tokens: ${tokens?.prompt_tokens || '?'}in/${tokens?.completion_tokens || '?'}out | Response: ${response?.length || 0} chars`);
    return response;
  } catch (error) {
    console.error('[Nana AI Error]:', error);
    if (error.code === 'insufficient_quota' || (error.message && error.message.includes('quota'))) {
       return "I've talked a bit too much today and reached my limit! Try asking me again later.";
    }
    if (error.status === 401 || error.status === 403) {
      return `I'm having a little trouble connecting to my brain right now. (API Auth Error: ${error.message})`;
    }
    return `I'm having a little trouble thinking straight right now. Could you try asking me that again? (Debug: ${error.message})`;
  }
};

module.exports = { getNanaAiResponse, NANA_USER_ID };
