import { query } from './db.js';

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function requireTeacher(req, res) {
  if (!req.user || req.user.role !== 'teacher') {
    sendJson(res, 403, { error: 'Teacher access required' });
    return false;
  }
  return true;
}

function parsePath(pathname) {
  const actionMatch = pathname.match(/^\/api\/teacher-support\/learners\/([a-f0-9-]+)\/action$/);
  const profileMatch = pathname.match(/^\/api\/teacher-support\/learners\/([a-f0-9-]+)$/);
  return {
    learnerIdForAction: actionMatch ? actionMatch[1] : null,
    learnerIdForProfile: profileMatch ? profileMatch[1] : null,
  };
}

async function learnerVisibleToTeacher(learnerId, orgId) {
  const where = orgId ? 'id = $1 AND (org_id = $2 OR org_id IS NULL)' : 'id = $1';
  const params = orgId ? [learnerId, orgId] : [learnerId];
  const result = await query(`SELECT * FROM learners WHERE ${where} LIMIT 1`, params);
  return result.rows[0] || null;
}

export default async function teacherSupportHandler(req, res, pathname) {
  if (!requireTeacher(req, res)) return;

  const { learnerIdForAction, learnerIdForProfile } = parsePath(pathname || '');
  const orgId = req.user.org_id || null;

  if (req.method === 'GET' && learnerIdForProfile) {
    try {
      const learner = await learnerVisibleToTeacher(learnerIdForProfile, orgId);
      if (!learner) return sendJson(res, 404, { error: 'Learner not found' });
      const actions = await query(
        `SELECT id, action_type, note, metadata, created_at
         FROM teacher_actions
         WHERE learner_id = $1
         ORDER BY created_at DESC
         LIMIT 20`,
        [learnerIdForProfile]
      ).catch(() => ({ rows: [] }));
      return sendJson(res, 200, { learner, actions: actions.rows || [] });
    } catch (err) {
      console.error('GET /api/teacher-support/learners/:id', err);
      return sendJson(res, 500, { error: err.message });
    }
  }

  if (req.method === 'POST' && learnerIdForAction) {
    const body = req.body || {};
    const actionType = String(body.actionType || '').trim();
    const note = body.note == null ? null : String(body.note);
    const metadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : {};
    if (!actionType) return sendJson(res, 400, { error: 'actionType required' });

    try {
      const learner = await learnerVisibleToTeacher(learnerIdForAction, orgId);
      if (!learner) return sendJson(res, 404, { error: 'Learner not found' });

      const patch = {
        teacher_followup_flag: learner.teacher_followup_flag,
        teacher_last_action_at: 'now()',
      };

      if (actionType === 'mark_speaking_support') {
        patch.teacher_support_type = body.teacherSupportType || learner.teacher_support_type || 'guided speaking with sentence frames';
        patch.teacher_focus_area = body.teacherFocusArea || learner.teacher_focus_area || 'speaking confidence';
      }
      if (actionType === 'flag_followup') {
        patch.teacher_followup_flag = true;
      }
      if (actionType === 'clear_followup') {
        patch.teacher_followup_flag = false;
      }
      if (actionType === 'save_profile') {
        if (body.teacherFocusArea !== undefined) patch.teacher_focus_area = body.teacherFocusArea || null;
        if (body.teacherSupportType !== undefined) patch.teacher_support_type = body.teacherSupportType || null;
        if (body.teacherBarrier !== undefined) patch.teacher_barrier = body.teacherBarrier || null;
        if (body.teacherLifeContext !== undefined) patch.teacher_life_context = body.teacherLifeContext || null;
        if (body.teacherConfidenceNote !== undefined) patch.teacher_confidence_note = body.teacherConfidenceNote || null;
        if (body.teacherNextAction !== undefined) patch.teacher_next_action = body.teacherNextAction || null;
        if (body.learnerGoalDomain !== undefined) patch.learner_goal_domain = body.learnerGoalDomain || null;
      }

      const sets = [];
      const values = [learnerIdForAction];
      let idx = 2;
      Object.entries(patch).forEach(([key, value]) => {
        if (value === 'now()') sets.push(`${key} = now()`);
        else {
          sets.push(`${key} = $${idx}`);
          values.push(value);
          idx += 1;
        }
      });
      sets.push('updated_at = now()');

      await query(`UPDATE learners SET ${sets.join(', ')} WHERE id = $1`, values);
      await query(
        `INSERT INTO teacher_actions (learner_id, teacher_id, action_type, note, metadata)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [learnerIdForAction, req.user.id || null, actionType, note, JSON.stringify(metadata || {})]
      ).catch(() => null);

      const updated = await learnerVisibleToTeacher(learnerIdForAction, orgId);
      return sendJson(res, 200, { ok: true, learner: updated });
    } catch (err) {
      console.error('POST /api/teacher-support/learners/:id/action', err);
      return sendJson(res, 500, { error: err.message });
    }
  }

  return sendJson(res, 405, { error: 'Method not allowed' });
}
