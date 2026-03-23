// POST /session — OpenAI Realtime voice (Knuut AI)
// Handles SDP exchange for WebRTC voice sessions
export default async function handler(req, res, rawBody) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') {
    res.status(405).end('Method not allowed');
    return;
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      res.status(500).end('Missing OPENAI_API_KEY');
      return;
    }

    var offerSdp = (typeof rawBody === 'string' ? rawBody : '') || '';
    if (!offerSdp) {
      res.status(400).end('Missing SDP offer');
      return;
    }

    const focusFragment = (req.headers && req.headers['x-session-focus']) || '';
    const examMode = ((req.headers && req.headers['x-exam-mode']) || '').toLowerCase() === 'true';

    const LANG_TEACHER_PROMPT = examMode
      ? `You are now running a YKI (Yleinen kielitutkinto) B1 level mock exam.
Strictly follow these rules:

1. SPEAKING SECTION (5 minutes):
   Give the learner 2 speaking tasks typical of YKI B1:
   - Task 1: Describe a situation (e.g. "You need to call a doctor. Explain your symptoms in Finnish.")
   - Task 2: Give an opinion (e.g. "What do you think about public transport in Finnish cities?")
   Assess: fluency, vocabulary range, grammatical accuracy, pronunciation.

2. INTERACTION SECTION (5 minutes):
   Role-play a realistic Finnish conversation scenario:
   - e.g. Renting an apartment, job interview, pharmacy visit
   Respond naturally as the other person in the scenario.
   Gently correct major errors by repeating correctly.

3. FEEDBACK SECTION (5 minutes):
   After the exam tasks, give structured feedback:
   - Overall CEFR level demonstrated: A1 / A2 / B1 / B2
   - Strongest area
   - Biggest weakness
   - 3 specific things to practice before the real exam
   - Predicted YKI score: Fail / Pass / Pass with distinction

Do NOT break character during the exam sections.
Do NOT switch to English unless the learner is completely lost.
Keep strict time — move to the next section after 5 minutes.
${focusFragment ? '\n' + focusFragment : ''}`
      : `You are Knuut, a friendly, patient language teacher who can speak and teach ANY language. You adapt to the user's target language immediately.

CRITICAL: NEVER speak while the user speaks. Wait until they fully stop. After they stop, pause 1 second before responding. Keep responses SHORT — max 2-3 sentences. Never monologue.

YOUR ROLE:
- Speak the same language the user is learning (or the one they request)
- Correct gently: repeat the right form without shaming
- Encourage: "Hyvä!" "Bra!" "Good!" etc.
- Ask simple follow-up questions to practice
- Use clear, natural speech at a learner-friendly pace

CONVERSATION FLOW:
1. Greet warmly in the target language (ask which language if unclear)
2. Practice: basic phrases, vocabulary, or free conversation
3. Correct errors kindly: "Almost! We say [correct form]"
4. Keep turns short so the user practices speaking

NEVER: Speak over the user, give long grammar lessons, use complex vocabulary, rush. You are calm, warm, patient, and human-like.${focusFragment ? '\n\n' + focusFragment : ''}`;

    const createResp = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.OPENAI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview',
        voice: 'verse',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        instructions: LANG_TEACHER_PROMPT,
      }),
    });

    if (!createResp.ok) {
      const err = await createResp.text();
      console.error('[voice] Session create failed:', err.slice(0, 200));
      res.status(createResp.status).end(err);
      return;
    }

    const sessData = await createResp.json();
    const sessionId = sessData.id;
    const apiUrl = 'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview&session=' + encodeURIComponent(sessionId);
    const oaiResp = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.OPENAI_API_KEY,
        'Content-Type': 'application/sdp',
        'OpenAI-Beta': 'realtime=v1',
      },
      body: offerSdp,
    });

    if (!oaiResp.ok) {
      const err = await oaiResp.text();
      console.error('[voice] SDP exchange failed:', err.slice(0, 200));
      res.status(oaiResp.status).end(err);
      return;
    }

    const answerSdp = await oaiResp.text();
    res.setHeader('Content-Type', 'application/sdp');
    res.setHeader('X-Session-Id', sessionId);
    res.status(200).end(answerSdp);
  } catch (err) {
    console.error('[voice]', err);
    res.status(500).end('Server error');
  }
}
