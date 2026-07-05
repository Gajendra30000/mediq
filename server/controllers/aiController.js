const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'openrouter/free'; // Auto-routes to currently available free models on OpenRouter

const callOpenRouter = async (systemPrompt, messages, maxTokens = 500) => {
  let apiMessages = [];
  if (systemPrompt) {
    apiMessages.push({ role: 'system', content: systemPrompt });
  }
  
  if (typeof messages === 'string') {
    apiMessages.push({ role: 'user', content: messages });
  } else if (Array.isArray(messages)) {
    apiMessages = apiMessages.concat(messages);
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:3000',
      'X-Title': 'MediQueue',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: apiMessages,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('OpenRouter response error raw:', err);
    throw new Error(`OpenRouter API error: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

exports.suggestSpecialty = async (req, res) => {
  try {
    const { symptoms } = req.body;
    if (!symptoms || !symptoms.length) {
      return res.status(400).json({ message: 'Symptoms required' });
    }

    const system = `You are a medical triage assistant. Given a list of symptoms, suggest the most appropriate medical specialty or specialties the patient should consult. Be concise and practical. Return ONLY valid JSON, no markdown, no preamble.`;

    const user = `Symptoms: ${symptoms.join(', ')}

Return JSON in this exact format:
{
  "primarySpecialty": "Cardiologist",
  "secondarySpecialties": ["General Physician"],
  "reasoning": "One sentence reason",
  "urgency": "routine|same_day|urgent|emergency"
}`;

    const text = await callOpenRouter(system, user);
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    res.json(result);
  } catch (err) {
    // Graceful fallback
    res.json({
      primarySpecialty: 'General Physician',
      secondarySpecialties: [],
      reasoning: 'Please consult a general physician first.',
      urgency: 'routine',
    });
  }
};

exports.checkInteractions = async (req, res) => {
  try {
    const { medications } = req.body;
    if (!medications || medications.length < 2) {
      return res.json({ warnings: [], safe: true });
    }

    const system = `You are a clinical pharmacist assistant. Check for drug interactions. Return ONLY valid JSON, no markdown.`;

    const medList = medications.map((m) => `${m.medicine} ${m.dosage || ''}`).join(', ');
    const user = `Check interactions for: ${medList}

Return JSON:
{
  "safe": true/false,
  "warnings": [
    { "drugs": ["Drug A", "Drug B"], "severity": "mild|moderate|severe", "description": "brief description" }
  ]
}`;

    const text = await callOpenRouter(system, user);
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    res.json(result);
  } catch (err) {
    res.json({ warnings: [], safe: true, error: 'Check unavailable' });
  }
};

exports.summarizeReviews = async (req, res) => {
  try {
    const { doctorId } = req.body;
    const { Review } = require('../models/ReviewNotification');

    const reviews = await Review.find({ doctorId })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('doctorRating comment tags');

    if (reviews.length < 5) {
      return res.json({ summary: null, message: 'Not enough reviews for summary' });
    }

    const reviewTexts = reviews
      .filter((r) => r.comment)
      .slice(0, 20)
      .map((r) => `Rating: ${r.doctorRating}/5 — "${r.comment}"`)
      .join('\n');

    const system = `You are summarizing patient reviews for a doctor profile page. Be objective, highlight both positives and any recurring concerns. Keep it to 2-3 sentences. Never make up specific claims.`;

    const user = `Summarize these ${reviews.length} patient reviews in 2-3 sentences for display on a doctor profile page:\n\n${reviewTexts}`;

    const summary = await callOpenRouter(system, user, 200);

    res.json({
      summary,
      totalReviews: reviews.length,
      avgRating: (reviews.reduce((s, r) => s + r.doctorRating, 0) / reviews.length).toFixed(1),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAdminInsight = async (req, res) => {
  try {
    const { hospitalStats, departmentLoads } = req.body;

    const system = `You are a hospital operations advisor. Given current load data, provide a brief, actionable 2-sentence insight for the hospital admin. Be specific and practical.`;

    const user = `Hospital stats today:
- Total patients: ${hospitalStats.totalToday}
- Avg wait: ${hospitalStats.avgWaitMinutes} min
- Doctors on duty: ${hospitalStats.doctors}

Department loads:
${departmentLoads.map((d) => `- ${d.name}: ${d.current}/${d.capacity} patients (${d.status})`).join('\n')}

What should the admin prioritize right now?`;

    const insight = await callOpenRouter(system, user, 150);
    res.json({ insight });
  } catch (err) {
    res.json({ insight: null });
  }
};

exports.chat = async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: 'Messages array required' });
    }

    const system = `You are a helpful and empathetic AI healthcare assistant for the MediQueue platform. 
You can provide general health advice, explain medical terms, and give information about medicines.
IMPORTANT: Always remind patients that you are an AI, not a doctor, and they should consult a healthcare professional for serious concerns. Keep answers concise and user friendly.`;

    const text = await callOpenRouter(system, messages, 800);
    res.json({ text });
  } catch (err) {
    console.error('AI chat error:', err);
    res.status(500).json({ message: err.message, text: 'Sorry, the AI service is currently unavailable. Please try again later.' });
  }
};
