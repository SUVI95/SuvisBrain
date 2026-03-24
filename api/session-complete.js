// api/session-complete.js — post-session brain update via OpenRouter
import { query } from './db.js';
import { removePersonalData } from '../src/lib/safe-ai.js';
import { getEmbedding } from '../src/lib/embeddings.js';

async function setNodeEmbedding(nodeId, label) {
  const embedding = await getEmbedding(label);
  if (embedding && Array.isArray(embedding)) {
    try {
      await query(
        'UPDATE brain_nodes SET embedding = $1::vector WHERE id = $2',
        [JSON.stringify(embedding), nodeId]
      );
    } catch (e) {
      console.error('session-complete: set embedding:', e.message);
    }
  }
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const CEFR_ORDER = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };

function isNoiseTopic(label) {
  if (!label || typeof label !== 'string') return true;
  const s = label.trim();
  if (s.length < 6) return true;
  if (!s.includes(' ') && s.length < 8) return true;
  return false;
}

const MODELS = [
  'arcee-ai/trinity-large-preview:free',
  'arcee-ai/trinity-mini:free',
  'google/gemma-3-4b-it:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'google/gemma-3-12b-it:free',
  'google/gemma-3-27b-it:free',
];

const KEYS = [
  process.env.OPENROUTER_API_KEY,
  process.env.OPENROUTER_API_KEY_2,
].filter(Boolean);

async function analyseTranscript(transcript) {
  const safeInput = removePersonalData(transcript || '');
  const prompt = `You are analysing a Finnish language learning session transcript.
Extract learning data and return ONLY valid JSON, no other text.

Transcript:
${safeInput}

Return this exact JSON structure:
{
  "summary": "2-3 sentence summary of the session in English",
  "topics_practiced": [
    { "label": "exact topic name", "confidence_delta": 0.1 }
  ],
  "topics_struggled": [
    { "label": "exact topic name", "confidence_delta": -0.05 }
  ],
  "new_topics": [
    { "label": "new topic encountered", "type": "Skill" }
  ],
  "cefr_level_demonstrated": "A1"
}

Rules:
- confidence_delta is always positive for practiced (0.05 to 0.2)
- confidence_delta is always negative for struggled (-0.05 to -0.1)
- type for new_topics must be one of: Skill, Memory, Conversation
- cefr_level_demonstrated must be one of: A1, A2, B1, B2, C1`;

  for (const model of MODELS) {
    for (const key of KEYS) {
      try {
        const response = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://suvisbrain.vercel.app',
          },
          body: JSON.stringify({
            model,
            max_tokens: 1000,
            messages: [{ role: 'user', content: prompt }],
          }),
        });

        const data = await response.json();

        if (data.error) {
          console.log(`Model ${model} key ${key.slice(-6)}: ${data.error.message}`);
          continue;
        }

        const text = data.choices?.[0]?.message?.content || '';
        if (!text) continue;

        const clean = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);
        console.log(`SUCCESS with model: ${model}`);
        return parsed;
      } catch (err) {
        console.log(`Failed ${model}:`, err.message);
        continue;
      }
    }
  }

  console.error('All models rate limited or failed');
  return null;
}

async function scoreCefrRubric(transcript) {
  const safeInput = removePersonalData(transcript || '');
  const prompt = `You are a CEFR-certified assessor. Score this YKI mock speaking exam transcript against the CEFR rubric.

Transcript:
${safeInput}

Return ONLY valid JSON:
{
  "cefr_level": "A1|A2|B1|B2|C1|C2",
  "brief_feedback": "1-2 sentences in English"
}

Apply CEFR criteria: range, accuracy, fluency, interaction. Be strict but fair.`;

  for (const model of MODELS) {
    for (const key of KEYS) {
      try {
        const response = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://suvisbrain.vercel.app',
          },
          body: JSON.stringify({
            model,
            max_tokens: 300,
            messages: [{ role: 'user', content: prompt }],
          }),
        });

        const data = await response.json();

        if (data.error) {
          console.log(`Cefr model ${model} key ${key.slice(-6)}: ${data.error.message}`);
          continue;
        }

        const text = data.choices?.[0]?.message?.content || '';
        if (!text) continue;

        const clean = text.replace(/```json|```/g, '').trim();
        return JSON.parse(clean);
      } catch (err) {
        console.log(`Cefr failed ${model}:`, err.message);
        continue;
      }
    }
  }

  console.error('All CEFR models rate limited or failed');
  return null;
}

export default async function sessionCompleteHandler(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'POST only' }));
    return;
  }

  const { transcript, agent_id, duration_s, learner_language, learner_id, is_mock_exam, is_yki_exam } = req.body || {};

  if (!transcript || transcript.length < 50) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Transcript too short' }));
    return;
  }

  try {
    if (KEYS.length === 0) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'OPENROUTER_API_KEY not set' }));
      return;
    }

    const analysis = await analyseTranscript(transcript);

    const title = is_mock_exam
      ? `YKI mock exam — ${new Date().toLocaleDateString('fi-FI')}`
      : `Session ${new Date().toLocaleDateString('fi-FI')}`;

    const orgId = req.user?.org_id || null;
    const episodeCols = orgId
      ? 'agent_id, learner_id, title, summary, language, duration_s, raw_transcript, org_id'
      : 'agent_id, learner_id, title, summary, language, duration_s, raw_transcript';
    const episodeVals = orgId
      ? '$1, $2, $3, $4, $5, $6, $7, $8'
      : '$1, $2, $3, $4, $5, $6, $7';
    const episodeParams = [
      agent_id != null ? agent_id : null,
      learner_id != null ? learner_id : null,
      title,
      analysis ? analysis.summary : '',
      learner_language != null ? learner_language : 'fi',
      duration_s != null ? duration_s : 0,
      transcript,
    ];
    if (orgId) episodeParams.push(orgId);

    const episodeResult = await query(
      `INSERT INTO episodes (${episodeCols}) VALUES (${episodeVals}) RETURNING id`,
      episodeParams
    );
    const episodeId = episodeResult.rows[0].id;

    if (!analysis) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        episode_id: episodeId,
        warning: 'AI analysis unavailable — brain not updated this session',
        topics_updated: 0,
        new_nodes_created: 0,
      }));
      return;
    }

    let cefrScore = null;
    if (is_mock_exam) {
      const scored = await scoreCefrRubric(transcript);
      cefrScore = (scored && scored.cefr_level) || analysis.cefr_level_demonstrated;
    }
    const isYki = is_yki_exam || is_mock_exam;
    if (isYki) {
      try {
        await query(
          `UPDATE episodes SET metadata = jsonb_set(COALESCE(metadata, '{}'), '{is_yki_exam}', 'true') WHERE id = $1`,
          [episodeId]
        );
        if (cefrScore) {
          await query(
            `UPDATE episodes SET metadata = jsonb_set(COALESCE(metadata, '{}'), '{cefr_score}', $2::jsonb) WHERE id = $1`,
            [episodeId, JSON.stringify(cefrScore)]
          );
        }
      } catch (e) {
        console.error('session-complete: episode metadata:', e.message);
      }
    }

    if (!is_mock_exam) {
      const practicedLabels = new Set();
      const skillNodeIds = [];

      const practiced = (analysis.topics_practiced || []).filter((t) => !isNoiseTopic(t?.label));
      const struggled = (analysis.topics_struggled || []).filter((t) => !isNoiseTopic(t?.label));

      // STEP 1 — Update confidence on existing skill nodes
      for (const topic of practiced) {
        try {
          const existing = await query(
            'SELECT id, metadata FROM brain_nodes WHERE LOWER(label) = LOWER($1)',
            [topic.label]
          );
          if (existing.rows.length === 0) continue;
          const row = existing.rows[0];
          const current = parseFloat(row.metadata?.confidence_score ?? 0.5) || 0.5;
          const delta = parseFloat(topic.confidence_delta) || 0.1;
          const newScore = Math.min(1, Math.max(0, current + delta));
          const isoNow = new Date().toISOString();
          const newEntry = JSON.stringify({ t: isoNow, c: newScore });
          const metaUpdate = learner_id
            ? `jsonb_set(jsonb_set(COALESCE(metadata, '{}'), '{confidence_score}', to_jsonb($2::float)), '{learner_id}', to_jsonb($4::text))`
            : `jsonb_set(COALESCE(metadata, '{}'), '{confidence_score}', to_jsonb($2::float))`;
          const practicedParams = learner_id ? [row.id, newScore, newEntry, learner_id] : [row.id, newScore, newEntry];
          await query(
            `UPDATE brain_nodes SET
              metadata = ${metaUpdate},
              confidence_history = COALESCE(confidence_history, '[]'::jsonb) || jsonb_build_array($3::jsonb),
              updated_at = now()
            WHERE id = $1`,
            practicedParams
          );
          practicedLabels.add(topic.label);
          skillNodeIds.push(row.id);
        } catch (e) {
          console.error('session-complete: practiced update:', e.message);
        }
      }
      for (const topic of struggled) {
        try {
          const existing = await query(
            'SELECT id, metadata FROM brain_nodes WHERE LOWER(label) = LOWER($1)',
            [topic.label]
          );
          if (existing.rows.length === 0) continue;
          const row = existing.rows[0];
          const current = parseFloat(row.metadata?.confidence_score ?? 0.5) || 0.5;
          const delta = parseFloat(topic.confidence_delta) || -0.05;
          const newScore = Math.min(1, Math.max(0, current + delta));
          const isoNow = new Date().toISOString();
          const newEntry = JSON.stringify({ t: isoNow, c: newScore });
          const metaUpdate = learner_id
            ? `jsonb_set(jsonb_set(COALESCE(metadata, '{}'), '{confidence_score}', to_jsonb($2::float)), '{learner_id}', to_jsonb($4::text))`
            : `jsonb_set(COALESCE(metadata, '{}'), '{confidence_score}', to_jsonb($2::float))`;
          const struggledParams = learner_id ? [row.id, newScore, newEntry, learner_id] : [row.id, newScore, newEntry];
          await query(
            `UPDATE brain_nodes SET
              metadata = ${metaUpdate},
              confidence_history = COALESCE(confidence_history, '[]'::jsonb) || jsonb_build_array($3::jsonb),
              updated_at = now()
            WHERE id = $1`,
            struggledParams
          );
          practicedLabels.add(topic.label);
          skillNodeIds.push(row.id);
        } catch (e) {
          console.error('session-complete: struggled update:', e.message);
        }
      }

      // STEP 2 — Create new skill/memory nodes for new_topics
      let nelliId = null;
      if (agent_id) {
        try {
          const nelliRes = await query("SELECT id FROM agents WHERE name = 'Nelli' LIMIT 1");
          if (nelliRes.rows.length > 0) nelliId = nelliRes.rows[0].id;
        } catch (_) {}
      }
      const agentForNew = nelliId || agent_id;

      const coreRes = await query(`SELECT id FROM brain_nodes WHERE type = 'Core' LIMIT 1`);
      const coreId = coreRes.rows.length > 0 ? coreRes.rows[0].id : null;

      for (const topic of analysis.new_topics || []) {
        try {
          const t = topic.type === 'Memory' || topic.type === 'Conversation' ? topic.type : 'Skill';
          const existing = await query(
            'SELECT id FROM brain_nodes WHERE LOWER(label) = LOWER($1)',
            [topic.label]
          );
          if (existing.rows.length > 0) continue;
          const meta = JSON.stringify({
            confidence_score: 0.5,
            source: 'session',
            ...(learner_id && { learner_id }),
          });
          const hist = JSON.stringify([{ t: new Date().toISOString(), c: 0.5 }]);
          const bnCols = orgId
            ? 'label, type, agent_id, metadata, confidence_history, org_id'
            : 'label, type, agent_id, metadata, confidence_history';
          const bnVals = orgId ? '$1, $2, $3, $4::jsonb, $5::jsonb, $6' : '$1, $2, $3, $4::jsonb, $5::jsonb';
          const bnParams = orgId ? [topic.label, t, agentForNew, meta, hist, orgId] : [topic.label, t, agentForNew, meta, hist];
          const newNode = await query(
            `INSERT INTO brain_nodes (${bnCols}) VALUES (${bnVals}) RETURNING id`,
            bnParams
          );
          setNodeEmbedding(newNode.rows[0].id, topic.label).catch(() => {});
          if (coreId) {
            await query(
              `INSERT INTO brain_edges (source_id, target_id, value) VALUES ($1, $2, 1)`,
              [coreId, newNode.rows[0].id]
            );
          }
        } catch (e) {
          console.error('session-complete: new topic:', e.message);
        }
      }

      // STEP 3 — Save Conversation node for this session
      try {
        let convLabel = (analysis.summary || '').slice(0, 50).trim() || 'Session';
        if (/\d{8,}/.test(convLabel)) convLabel = 'Session';
        const convMeta = JSON.stringify({
          confidence_score: 0.8,
          session_id: episodeId,
        });
        const convCols = orgId ? 'label, type, agent_id, metadata, org_id' : 'label, type, agent_id, metadata';
        const convVals = orgId ? '$1, \'Conversation\', $2, $3::jsonb, $4' : '$1, \'Conversation\', $2, $3::jsonb';
        const convParams = orgId ? [convLabel, agent_id, convMeta, orgId] : [convLabel, agent_id, convMeta];
        const convNode = await query(
          `INSERT INTO brain_nodes (${convCols}) VALUES (${convVals}) RETURNING id`,
          convParams
        );
        const convId = convNode.rows[0].id;
        setNodeEmbedding(convId, convLabel).catch(() => {});
        for (const skillId of skillNodeIds) {
          try {
            await query(
              `INSERT INTO brain_edges (source_id, target_id, value) VALUES ($1, $2, 1)`,
              [convId, skillId]
            );
          } catch (_) {
            /* edge may exist */
          }
        }
      } catch (e) {
        console.error('session-complete: conversation node:', e.message);
      }

      // STEP 4 — Update learner CEFR if warranted
      if (learner_id && analysis.cefr_level_demonstrated) {
        try {
          const learnerRes = await query(
            'SELECT cefr_level, agent_id FROM learners WHERE id = $1',
            [learner_id]
          );
          if (learnerRes.rows.length > 0) {
          const learner = learnerRes.rows[0];
          const currentLevel = learner.cefr_level || 'A1';
          const demonstrated = String(analysis.cefr_level_demonstrated).trim().toUpperCase();
          const currentOrd = CEFR_ORDER[currentLevel] || 0;
          const demoOrd = CEFR_ORDER[demonstrated] || 0;
          if (demoOrd > currentOrd) {
            const countRes = await query(
              `SELECT COUNT(*)::int as c FROM brain_nodes
               WHERE type = 'Skill'
                 AND COALESCE((metadata->>'confidence_score')::float, 0) >= 0.75
                 AND (metadata->>'learner_id' = $1 OR metadata->>'learner_id' IS NULL)`,
              [learner_id]
            );
            const count = (countRes.rows?.[0]?.c) ?? 0;
            if (count >= 5) {
              await query(
                'UPDATE learners SET cefr_level = $2, updated_at = now() WHERE id = $1',
                [learner_id, demonstrated]
              );
              const reachedLabel = `Reached ${demonstrated}`;
              const existingReached = await query(
                'SELECT id FROM brain_nodes WHERE LOWER(label) = LOWER($1)',
                [reachedLabel]
              );
              if (existingReached.rows.length === 0) {
                const reachedCols = orgId ? 'label, type, metadata, confidence_history, org_id' : 'label, type, metadata, confidence_history';
                const reachedVals = orgId ? '$1, \'Memory\', $2::jsonb, $3::jsonb, $4' : '$1, \'Memory\', $2::jsonb, $3::jsonb';
                const reachedParams = orgId
                  ? [reachedLabel, JSON.stringify({ confidence_score: 1.0 }), JSON.stringify([{ t: new Date().toISOString(), c: 1.0 }]), orgId]
                  : [reachedLabel, JSON.stringify({ confidence_score: 1.0 }), JSON.stringify([{ t: new Date().toISOString(), c: 1.0 }])];
                const reachedNode = await query(
                  `INSERT INTO brain_nodes (${reachedCols}) VALUES (${reachedVals}) RETURNING id`,
                  reachedParams
                );
                setNodeEmbedding(reachedNode.rows[0].id, reachedLabel).catch(() => {});
                if (coreId) {
                  await query(
                    `INSERT INTO brain_edges (source_id, target_id, value) VALUES ($1, $2, 1)`,
                    [coreId, reachedNode.rows[0].id]
                  );
                }
              }
            }
          }
          }
        } catch (e) {
          console.error('session-complete: CEFR update:', e.message);
        }
      }

      // STEP 5 — Learner-specific memory
      if (learner_id) {
        try {
          const learnerRes = await query(
            'SELECT agent_id FROM learners WHERE id = $1',
            [learner_id]
          );
          const learnerAgentId = (learnerRes.rows?.[0]?.agent_id) || agent_id;
          for (const topic of struggled) {
            try {
              const label = `Struggles with ${topic.label}`;
              const existing = await query(
                'SELECT id FROM brain_nodes WHERE LOWER(label) = LOWER($1)',
                [label]
              );
              if (existing.rows.length > 0) continue;
              const struggleCols = orgId ? 'label, type, agent_id, metadata, org_id' : 'label, type, agent_id, metadata';
              const struggleVals = orgId ? '$1, \'Memory\', $2, $3::jsonb, $4' : '$1, \'Memory\', $2, $3::jsonb';
              const struggleParams = orgId
                ? [label, learnerAgentId, JSON.stringify({ confidence_score: 0.6, learner_id }), orgId]
                : [label, learnerAgentId, JSON.stringify({ confidence_score: 0.6, learner_id })];
              const newNode = await query(
                `INSERT INTO brain_nodes (${struggleCols}) VALUES (${struggleVals}) RETURNING id`,
                struggleParams
              );
              setNodeEmbedding(newNode.rows[0].id, label).catch(() => {});
              if (coreId) {
                await query(
                  `INSERT INTO brain_edges (source_id, target_id, value) VALUES ($1, $2, 1)`,
                  [coreId, newNode.rows[0].id]
                );
              }
            } catch (e) {
              console.error('session-complete: struggles memory:', e.message);
            }
          }
          for (const topic of practiced) {
            try {
              const existing = await query(
                'SELECT id, metadata FROM brain_nodes WHERE LOWER(label) = LOWER($1)',
                [topic.label]
              );
              if (existing.rows.length === 0) continue;
              const score = parseFloat(existing.rows[0].metadata?.confidence_score ?? 0) || 0;
              if (score < 0.85) continue;
              const label = `Mastered ${topic.label}`;
              const existingMastered = await query(
                'SELECT id FROM brain_nodes WHERE LOWER(label) = LOWER($1)',
                [label]
              );
              if (existingMastered.rows.length > 0) continue;
              const masteredCols = orgId ? 'label, type, agent_id, metadata, org_id' : 'label, type, agent_id, metadata';
              const masteredVals = orgId ? '$1, \'Memory\', $2, $3::jsonb, $4' : '$1, \'Memory\', $2, $3::jsonb';
              const masteredParams = orgId
                ? [label, learnerAgentId, JSON.stringify({ confidence_score: 1.0, learner_id }), orgId]
                : [label, learnerAgentId, JSON.stringify({ confidence_score: 1.0, learner_id })];
              const newNode = await query(
                `INSERT INTO brain_nodes (${masteredCols}) VALUES (${masteredVals}) RETURNING id`,
                masteredParams
              );
              setNodeEmbedding(newNode.rows[0].id, label).catch(() => {});
              if (coreId) {
                await query(
                  `INSERT INTO brain_edges (source_id, target_id, value) VALUES ($1, $2, 1)`,
                  [coreId, newNode.rows[0].id]
                );
              }
            } catch (e) {
              console.error('session-complete: mastered memory:', e.message);
            }
          }
        } catch (e) {
          console.error('session-complete: learner memory:', e.message);
        }
      }
    }

    const practicedCount = (analysis?.topics_practiced || []).filter((t) => !isNoiseTopic(t?.label)).length +
      (analysis?.topics_struggled || []).filter((t) => !isNoiseTopic(t?.label)).length;
    const created = analysis.new_topics?.length || 0;
    if (!is_mock_exam) {
      console.log(`Brain update: ${practiced} practiced/struggled, ${created} new topics`);
    }
    const payload = {
      success: true,
      episode_id: episodeId,
      summary: analysis.summary,
      topics_updated: is_mock_exam ? 0 : practicedCount,
      new_nodes_created: is_mock_exam ? 0 : created,
      cefr_level: analysis.cefr_level_demonstrated,
    };
    if (is_mock_exam && cefrScore) payload.cefr_score = cefrScore;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  } catch (err) {
    console.error('session-complete error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}
