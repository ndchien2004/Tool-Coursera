const SOLVE_QUIZ_ACTION = 'courseraTool.solveQuiz';
const REQUEST_TIMEOUT_MS = 45_000;

function cleanModelName(model) {
  return String(model || '').trim().replace(/^models\//i, '');
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function extractApiError(payload, fallback) {
  if (!payload) return fallback;
  if (typeof payload === 'string') return payload.slice(0, 500) || fallback;
  return payload.error?.message || payload.message || fallback;
}

async function fetchWithTimeout(url, init) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`AI request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds.`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function buildPrompts(questions) {
  const system = [
    'Answer the supplied quiz questions using only the option IDs in the input.',
    'Return only JSON in this exact shape:',
    '{"answers":[{"questionId":"q1","optionIds":["q1o2"],"answerText":""}]}',
    'For type "single", return exactly one option ID.',
    'For type "multiple", return every correct option ID.',
    'For type "text", put the answer in answerText and leave optionIds empty.',
    'Do not include explanations or markdown.'
  ].join('\n');

  return {
    system,
    user: JSON.stringify({ questions })
  };
}

function parseJsonResponse(text) {
  const cleaned = String(text || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (_error) {
    const objectStart = cleaned.indexOf('{');
    const objectEnd = cleaned.lastIndexOf('}');
    if (objectStart >= 0 && objectEnd > objectStart) {
      return JSON.parse(cleaned.slice(objectStart, objectEnd + 1));
    }

    const arrayStart = cleaned.indexOf('[');
    const arrayEnd = cleaned.lastIndexOf(']');
    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      return JSON.parse(cleaned.slice(arrayStart, arrayEnd + 1));
    }

    throw new Error('AI returned an invalid JSON response.');
  }
}

function normalizeAnswers(payload, questions) {
  const rawAnswers = Array.isArray(payload)
    ? payload
    : payload?.answers || payload?.items || payload?.data || payload?.result || [];

  if (!Array.isArray(rawAnswers)) {
    throw new Error('AI response does not contain an answers array.');
  }

  const questionById = new Map(questions.map((question) => [question.id, question]));
  const answers = [];

  rawAnswers.forEach((raw, index) => {
    if (raw == null) return;
    if (typeof raw !== 'object') raw = { optionIds: [raw] };

    const questionId = String(raw.questionId || raw.id || questions[index]?.id || '');
    const question = questionById.get(questionId) || questions[index];
    if (!question) return;

    let values = raw.optionIds ?? raw.correctOptionIds ?? raw.optionId ?? raw.answerIds ?? raw.answer;
    if (values == null) values = [];
    if (!Array.isArray(values)) values = [values];

    const optionIds = [];
    for (const value of values) {
      const exactId = question.options.find((option) => option.id === String(value));
      if (exactId) {
        optionIds.push(exactId.id);
        continue;
      }

      const numericIndex = Number.parseInt(String(value), 10);
      if (Number.isFinite(numericIndex) && question.options[numericIndex - 1]) {
        optionIds.push(question.options[numericIndex - 1].id);
        continue;
      }

      const normalizedValue = normalizeText(value);
      const byText = question.options.find((option) => normalizeText(option.text) === normalizedValue);
      if (byText) optionIds.push(byText.id);
    }

    answers.push({
      questionId: question.id,
      optionIds: [...new Set(optionIds)],
      answerText: String(raw.answerText ?? raw.text ?? '')
    });
  });

  if (!answers.length) {
    throw new Error('AI did not return any usable answers.');
  }

  return answers;
}

async function callGemini(apiKey, model, prompts) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const headers = {
    'Content-Type': 'application/json',
    'x-goog-api-key': apiKey
  };
  const body = {
    system_instruction: {
      parts: [{ text: prompts.system }]
    },
    contents: [{
      role: 'user',
      parts: [{ text: prompts.user }]
    }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json'
    }
  };

  let response = await fetchWithTimeout(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  let payload = await response.json().catch(() => null);

  const errorMessage = extractApiError(payload, '');
  if (!response.ok && response.status === 400 && /response.?mime|application\/json|json mode/i.test(errorMessage)) {
    response = await fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...body,
        generationConfig: {
          temperature: 0.1
        }
      })
    });
    payload = await response.json().catch(() => null);
  }

  if (!response.ok) {
    throw new Error(extractApiError(payload, `Gemini API failed with HTTP ${response.status}.`));
  }

  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('');

  if (!text) {
    const blockReason = payload?.promptFeedback?.blockReason;
    throw new Error(blockReason ? `Gemini blocked the request: ${blockReason}.` : 'Gemini returned an empty response.');
  }

  return parseJsonResponse(text);
}

async function callOpenAI(apiKey, model, prompts) {
  const requestBody = {
    model,
    messages: [
      { role: 'system', content: prompts.system },
      { role: 'user', content: prompts.user }
    ],
    temperature: 0.1,
    response_format: { type: 'json_object' }
  };

  let response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  let payload = await response.json().catch(() => null);

  // Some compatible or older chat models do not support response_format.
  if (!response.ok && response.status === 400) {
    delete requestBody.response_format;
    response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    payload = await response.json().catch(() => null);
  }

  if (!response.ok) {
    throw new Error(extractApiError(payload, `OpenAI API failed with HTTP ${response.status}.`));
  }

  const text = payload?.choices?.[0]?.message?.content;
  if (!text) throw new Error('OpenAI returned an empty response.');
  return parseJsonResponse(text);
}

async function solveQuiz(questions) {
  if (!Array.isArray(questions) || !questions.length) {
    throw new Error('No quiz questions were found on the page.');
  }

  const settings = await chrome.storage.local.get([
    'aiProvider',
    'model',
    'geminiAPI',
    'openaiAPI'
  ]);

  const storedModel = cleanModelName(settings.model);
  const normalizedModel = storedModel.toLowerCase();
  const modelProvider = /^(gpt-|o[134]-)/.test(normalizedModel)
    ? 'openai'
    : /^(gemini-|gemma-)/.test(normalizedModel)
      ? 'gemini'
      : '';
  const provider = modelProvider || String(settings.aiProvider || 'gemini').toLowerCase();
  const model = storedModel || (provider === 'openai' ? 'gpt-4o-mini' : 'gemini-2.5-flash');
  const apiKey = String(provider === 'openai' ? settings.openaiAPI || '' : settings.geminiAPI || '').trim();

  if (!apiKey) {
    throw new Error(`Missing ${provider === 'openai' ? 'OpenAI' : 'Gemini'} API key. Open extension settings and save a key first.`);
  }

  const prompts = buildPrompts(questions);
  const payload = provider === 'openai'
    ? await callOpenAI(apiKey, model, prompts)
    : await callGemini(apiKey, model, prompts);

  return {
    provider,
    model,
    answers: normalizeAnswers(payload, questions)
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.action !== SOLVE_QUIZ_ACTION) return undefined;

  solveQuiz(message.questions)
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => {
      console.error('[CourseraTool] AI quiz request failed:', error);
      sendResponse({
        ok: false,
        error: error?.message || 'Unknown AI request error.'
      });
    });

  return true;
});
