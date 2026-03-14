const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const DEFAULT_FALLBACK_MODELS = ['meta-llama/llama-3.3-70b-instruct:free', 'nvidia/nemotron-3-nano-30b-a3b:free'];
const GUARDRAIL_BLOCK_RESPONSE = 'I cannot answer this question.';
const INAPPROPRIATE_PATTERNS = [
  /\bf+u+c+k+(?:ing|ed|er|s)?\b/gi,
  /\bshit+(?:ty|s)?\b/gi,
  /\bbitch(?:es)?\b/gi,
  /\bching\s*chong\b/gi
];
const DOMAIN_RELATED_PATTERNS = [
  /\bucl\b/i,
  /\bhesa\b/i,
  /\bukprn\b/i,
  /\bofs\b/i,
  /\bdashboard\b/i,
  /\bhe provider\b/i,
  /\bfinance record\b/i,
  /\btable\s*(?:1|5|6|8)\b/i,
  /\b(?:income|expenditure|expense|cost|staff|fees?|tuition|research|grant|contract|department|financial|finance|academic year|provider|dataset|data|sankey|pie chart|cost centre|year end month)\b/i
];
const TERM_GLOSSARY = [
  {
    aliases: ['ucl', 'university college london'],
    answer: 'UCL is University College London, the provider used in this dashboard (UKPRN 10007784).'
  },
  {
    aliases: [
      'dashboard',
      'this dashboard',
      'ucl dashboard',
      'purpose of this dashboard',
      'purpose of dashboard'
    ],
    answer:
      'This dashboard provides transparent, data-grounded views of UCL finance using HESA tables, including income, expenditure, tuition, and research drill-downs.'
  },
  {
    aliases: ['hesa', 'higher education statistics agency'],
    answer: 'HESA is the Higher Education Statistics Agency, which publishes the higher education finance tables used here.'
  },
  {
    aliases: ['ukprn', 'uk provider reference number'],
    answer: 'UKPRN means UK Provider Reference Number, a unique identifier for a higher education provider.'
  },
  {
    aliases: ['ofs', 'office for students'],
    answer: 'OfS is the Office for Students, the regulator for higher education in England.'
  },
  {
    aliases: ['he provider', 'higher education provider', 'provider'],
    answer: 'HE provider means the university or institution reporting the finance data.'
  },
  {
    aliases: ['academic year'],
    answer: 'Academic year is the reporting year label such as 2023/24.'
  },
  {
    aliases: ['financial year end', 'financial year-end'],
    answer: 'Financial year end is the provider year-end date used in the source finance records.'
  },
  {
    aliases: ['year end month'],
    answer: 'Year End Month is the aggregation marker in source files; this dashboard uses totals where it is "All".'
  },
  {
    aliases: ['value', 'value £000s', 'value(£000s)', 'reported value'],
    answer: 'Value(£000s) means amounts are reported in thousands of pounds.'
  },
  {
    aliases: ['category marker'],
    answer: 'Category marker is the top-level group in Table 1, such as Income or Expenditure.'
  },
  {
    aliases: ['category'],
    answer: 'Category is the detailed line item under a marker, such as Total income or Staff costs.'
  },
  {
    aliases: ['activity'],
    answer: 'Activity is the expenditure classification in Table 8, such as Academic staff costs.'
  },
  {
    aliases: ['hesa cost centre', 'cost centre'],
    answer: 'HESA cost centre is the subject/functional coding framework used for detailed finance reporting.'
  },
  {
    aliases: ['academic departments'],
    answer: 'Academic departments are the department-level rows used for detailed breakdowns, especially in Table 5.'
  },
  {
    aliases: ['source of income', 'funding source'],
    answer: 'Source of income identifies where research income comes from, such as UK government, charities, or industry.'
  },
  {
    aliases: ['table 1', 'table1'],
    answer: 'Table 1 is the consolidated statement of comprehensive income and expenditure used for the main overview flow.'
  },
  {
    aliases: ['table 5', 'table5'],
    answer: 'Table 5 covers research grants and contracts by funding source and HESA cost centre.'
  },
  {
    aliases: ['table 6', 'table6'],
    answer: 'Table 6 covers tuition fees and education contracts by domicile/source categories.'
  },
  {
    aliases: ['table 8', 'table8'],
    answer: 'Table 8 covers expenditure breakdowns by activity and cost centre.'
  },
  {
    aliases: ['total income'],
    answer: 'Total income is the full reported income total for the selected academic year in Table 1.'
  },
  {
    aliases: ['total expenditure'],
    answer: 'Total expenditure is the full reported expenditure total for the selected academic year.'
  },
  {
    aliases: ['tuition fees and education contracts', 'tuition fees'],
    answer: 'Tuition fees and education contracts are the tuition-related income line, with more detail in Table 6.'
  },
  {
    aliases: ['funding body grants'],
    answer: 'Funding body grants are grant income reported from public funding bodies.'
  },
  {
    aliases: ['research grants and contracts', 'research grants', 'research income'],
    answer: 'Research grants and contracts are externally funded research income, with source and department detail in Table 5.'
  },
  {
    aliases: ['staff costs'],
    answer: 'Staff costs are employment-related expenditure and can include pension accounting adjustments.'
  },
  {
    aliases: ['other operating expenses'],
    answer: 'Other operating expenses are non-staff operating costs reported in the finance record.'
  },
  {
    aliases: ['depreciation and amortisation', 'depreciation', 'amortisation'],
    answer: 'Depreciation and amortisation are non-cash charges for asset value use over time.'
  },
  {
    aliases: ['interest and other finance costs', 'finance costs'],
    answer: 'Interest and other finance costs are financing-related expense lines.'
  },
  {
    aliases: ['research councils total', 'research councils'],
    answer: 'Research Councils Total is the aggregated research funding from research council sources.'
  },
  {
    aliases: ['fe course fees'],
    answer: 'FE course fees are further-education course fee income reported in Table 6.'
  },
  {
    aliases: ['non-credit bearing course fees', 'non credit bearing course fees'],
    answer: 'Non-credit bearing course fees are fees from courses that do not award academic credit.'
  },
  {
    aliases: ['contracted out activity', 'net fee income relating to contracted out activity'],
    answer: 'Contracted out activity refers to the net fee income line for contracted-out provision reported in Table 6 where available.'
  },
  {
    aliases: ['sankey', 'sankey chart'],
    answer: 'A Sankey chart shows flows between categories, with line width representing value.'
  }
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJsonSafe(raw) {
  if (!raw || !raw.trim()) {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function extractAnswer(payload) {
  const message = payload?.choices?.[0]?.message?.content;

  if (typeof message === 'string') {
    return message.trim();
  }

  if (Array.isArray(message)) {
    return message
      .filter((chunk) => chunk?.type === 'text' && typeof chunk?.text === 'string')
      .map((chunk) => chunk.text.trim())
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  return '';
}

function isRetryable(status, message) {
  if (RETRYABLE_STATUS.has(status)) {
    return true;
  }

  const m = String(message || '').toLowerCase();
  return m.includes('rate') || m.includes('capacity') || m.includes('overload') || m.includes('temporar');
}

function modelCandidates(primaryModel) {
  const rawFallback = process.env.OPENROUTER_FALLBACK_MODELS || DEFAULT_FALLBACK_MODELS.join(',');
  const extras = rawFallback
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  return [...new Set([primaryModel, ...extras])];
}

function sanitizeForLlm(text) {
  let flagged = false;
  let sanitized = String(text || '');

  for (const pattern of INAPPROPRIATE_PATTERNS) {
    sanitized = sanitized.replace(pattern, () => {
      flagged = true;
      return '[REDACTED_TERM]';
    });
  }

  sanitized = sanitized.replace(/\s{2,}/g, ' ').trim();
  return { sanitized, flagged };
}

function normalizeLookupText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\bdashbaord\b/g, 'dashboard')
    .replace(/\bdashbord\b/g, 'dashboard')
    .replace(/\bdasboard\b/g, 'dashboard')
    .replace(/[^a-z0-9£]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function isQuestionRelatedToDomain(text) {
  const value = String(text || '').trim();
  if (!value) {
    return false;
  }

  if (DOMAIN_RELATED_PATTERNS.some((pattern) => pattern.test(value))) {
    return true;
  }

  const normalized = normalizeLookupText(value);
  return DOMAIN_RELATED_PATTERNS.some((pattern) => pattern.test(normalized));
}

function stripDefinitionPrompt(text) {
  let normalized = normalizeLookupText(text);

  normalized = normalized.replace(
    /^(?:what(?:\s+is|\s+does)?|define|definition of|meaning of|explain|tell me about|about)\s+/,
    ''
  );
  normalized = normalized.replace(/\b(?:mean|means)\b/g, '').trim();
  normalized = normalized.replace(/^(?:the|a|an)\s+/, '');

  return normalized.trim();
}

function getDefinitionAnswer(text) {
  const normalizedRaw = normalizeLookupText(text);
  const normalizedStripped = stripDefinitionPrompt(text);

  for (const term of TERM_GLOSSARY) {
    for (const alias of term.aliases) {
      const normalizedAlias = normalizeLookupText(alias);
      if (!normalizedAlias) {
        continue;
      }

      if (normalizedRaw === normalizedAlias || normalizedStripped === normalizedAlias) {
        return term.answer;
      }
    }
  }

  return null;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function getParsedBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  if (typeof req.body === 'string') {
    return parseJsonSafe(req.body);
  }

  const raw = await readBody(req);
  return parseJsonSafe(raw);
}

async function callOpenRouter({ apiKey, model, referer, title, body, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(referer ? { 'HTTP-Referer': referer } : {}),
        ...(title ? { 'X-Title': title } : {})
      },
      body: JSON.stringify({ ...body, model }),
      signal: controller.signal
    });

    const payload = parseJsonSafe(await upstream.text());
    return { ok: upstream.ok, status: upstream.status, payload };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        ok: false,
        status: 504,
        payload: { error: { message: `OpenRouter timeout after ${timeoutMs}ms.` } }
      };
    }

    return {
      ok: false,
      status: 500,
      payload: { error: { message: error instanceof Error ? error.message : 'Unexpected upstream error.' } }
    };
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'openrouter/free';
  const referer = process.env.OPENROUTER_REFERER || '';
  const title = process.env.OPENROUTER_TITLE || 'Peace Lab UCL Dashboard';
  const timeoutMs = Number(process.env.OPENROUTER_TIMEOUT_MS || 20000);
  const maxRetries = Number(process.env.OPENROUTER_MAX_RETRIES || 2);

  if (!apiKey) {
    return res.status(500).json({ error: 'Missing OPENROUTER_API_KEY on server.' });
  }

  const parsedBody = await getParsedBody(req);

  const { question, context, history } = parsedBody || {};

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Missing question.' });
  }

  const cleanHistory = Array.isArray(history)
    ? history
        .filter((row) => row && (row.role === 'user' || row.role === 'assistant') && typeof row.content === 'string')
        .slice(-8)
    : [];

  const sanitizedInput = sanitizeForLlm(question);
  const sanitizedHistory = cleanHistory.map((row) => {
    if (row.role !== 'user') {
      return row;
    }
    const out = sanitizeForLlm(row.content);
    return { ...row, content: out.sanitized || '[REDACTED_TERM]' };
  });

  const effectiveQuestion = sanitizedInput.sanitized || '[REDACTED_TERM]';
  const questionIsRelated = isQuestionRelatedToDomain(question);
  const definitionAnswer = getDefinitionAnswer(question);

  if (sanitizedInput.flagged) {
    return res.status(200).json({
      answer: GUARDRAIL_BLOCK_RESPONSE,
      moderation: {
        inputRedacted: true,
        blocked: true,
        reason: 'inappropriate'
      }
    });
  }

  if (definitionAnswer) {
    return res.status(200).json({
      answer: definitionAnswer,
      moderation: {
        inputRedacted: false,
        blocked: false,
        reason: 'definition'
      }
    });
  }

  if (!questionIsRelated) {
    return res.status(200).json({
      answer: GUARDRAIL_BLOCK_RESPONSE,
      moderation: {
        inputRedacted: false,
        blocked: true,
        reason: 'unrelated'
      }
    });
  }

  const systemPrompt =
    'You are a finance dashboard assistant for UCL. Use only the provided DATA CONTEXT values and definitions. Do not invent values, years, categories, or source facts. If the question is inappropriate, unrelated to the UCL/HESA finance context, or the answer is not present in DATA CONTEXT, reply exactly: "I cannot answer this question." Keep responses concise. Ignore tokens marked [REDACTED_TERM].';

  try {
    const body = {
      messages: [
        { role: 'system', content: systemPrompt },
        ...sanitizedHistory,
        {
          role: 'user',
          content: `DATA CONTEXT (JSON):\n${JSON.stringify(context ?? {})}\n\nQUESTION:\n${effectiveQuestion}`
        }
      ],
      temperature: 0.1,
      max_tokens: 320
    };

    const models = modelCandidates(model);
    const errors = [];

    for (const candidate of models) {
      for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        const result = await callOpenRouter({
          apiKey,
          model: candidate,
          referer,
          title,
          body,
          timeoutMs
        });

        if (result.ok) {
          const answer = extractAnswer(result.payload);
          if (answer) {
            return res.status(200).json({
              answer,
              model: candidate,
              moderation: { inputRedacted: sanitizedInput.flagged }
            });
          }

          errors.push(`${candidate}: empty response`);
          break;
        }

        const upstreamMessage = result?.payload?.error?.message || result?.payload?.error || '';
        errors.push(`${candidate}: ${result.status} ${upstreamMessage || 'upstream error'}`);

        if (isRetryable(result.status, upstreamMessage) && attempt < maxRetries) {
          await sleep(350 * (attempt + 1));
          continue;
        }

        break;
      }
    }

    return res.status(502).json({
      error: `OpenRouter is temporarily unavailable. Please retry in a few seconds. Details: ${errors.slice(0, 2).join(' | ')}`
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unexpected server error.'
    });
  }
}
