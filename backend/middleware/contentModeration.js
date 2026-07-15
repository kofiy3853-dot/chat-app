const { MorphClient } = require('@morphllm/morphsdk');

let morph = null;
if (process.env.MORPH_API_KEY && process.env.MORPH_API_KEY !== 'set-your-morph-api-key-here') {
  morph = new MorphClient({ apiKey: process.env.MORPH_API_KEY });
} else {
  console.warn('[MODERATION] MORPH_API_KEY not set. Content moderation is disabled.');
}

const MODERATION_DISABLED = process.env.MODERATION_DISABLED === 'true';

/**
 * Run Morph Reflexes on text content.
 * @param {string} text - Content to classify
 * @param {string[]} models - Reflex models to run (default: ['guardrail'])
 * @returns {Promise<{ allowed: boolean, flags: string[]}>}
 */
async function moderateContent(text, models = ['guardrail']) {
  if (MODERATION_DISABLED || !morph || !text || text.trim().length === 0) {
    return { allowed: true, flags: [] };
  }

  try {
    const results = await Promise.all(
      models.map(model =>
        morph.reflex.predict({ model, text }).catch(err => {
          console.error(`[MODERATION] Reflex "${model}" failed:`, err.message);
          return { selected: [], label: null };
        })
      )
    );

    const flags = [];
    for (const result of results) {
      if (result.selected && result.selected.length > 0) {
        flags.push(...result.selected);
      }
    }

    const blocked = flags.some(f => f === 'true' || f === 'jailbreak');

    if (blocked) {
      console.warn(`[MODERATION] Content blocked. Flags: [${flags.join(', ')}]`);
    }

    return { allowed: !blocked, flags };
  } catch (err) {
    console.error('[MODERATION] Error:', err.message);
    return { allowed: true, flags: [] };
  }
}

module.exports = { moderateContent };
