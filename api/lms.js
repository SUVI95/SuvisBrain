/**
 * ALKUPOLKU LMS API — Kuopio kotoutumiskoulutus tender backbone
 * GET /api/lms/* — teacher/admin + learner scoped routes
 */
import { query } from './db.js';
import { sendJson } from '../src/lib/middleware.js';

const MOCK = {
  tender: {
    client: 'Kuopion kaupunki / TyöNavigaattori',
    case_ref: '2042/02.08.00/2026',
    period: '1.6.2026 – 31.5.2027 (+ 2× option years)',
    group_size: '20–25',
    path_days: 120,
    otp_hours_per_unit: 7,
  },
  modules: [
    { code: 'M1', level: 'Pre-A1', theme: 'Latin alphabet, basic sounds, numbers', sort: 1 },
    { code: 'M2', level: 'A1.1', theme: 'Greetings, daily life, family', sort: 2 },
    { code: 'M3', level: 'A1.2', theme: 'Work vocabulary, asking for help', sort: 3 },
    { code: 'M4', level: 'A1.3', theme: 'Healthcare, services, transport', sort: 4 },
    { code: 'M5', level: 'A2.1', theme: 'Workplace Finnish, instructions', sort: 5 },
    { code: 'M6', level: 'A2.2', theme: 'Job seeking, interviews, YKI prep', sort: 6 },
    { code: 'YX', level: '+All', theme: 'Finnish society & culture (yhteiskuntatietous)', sort: 7 },
    { code: 'EL', level: '+All', theme: 'Life management (elämänhallinta)', sort: 8 },
  ],
  teachers: [
    { id: 't-demo-1', name: 'Suvi Virtanen', email: 'suvi.v@knuut.fi', teacher_kind: 'vastuuopettaja', credentials: 'YTM, 60op suomi/S2, pedagogiset 60op' },
    { id: 't-demo-2', name: 'Matti Korhonen', email: 'matti.k@knuut.fi', teacher_kind: 'ohjaaja', credentials: 'AMK, 15op aikuiskasvatus' },
  ],
  students: [
    {
      id: 's-mock-1',
      name: 'Amira Hassan',
      email: 'amira@test.fi',
      cefr_level: 'pre-A1',
      day_n: 14,
      attendance_streak: 5,
      consecutive_absences: 0,
      alert_tyovoima: false,
      module_progress: { M1: 72, M2: 0 },
      hops_summary: 'Aakkoset → perhesanastoa → ensimmäinen työhaastattelu',
      placement: null,
      yki_ready: false,
      otp_month: 12.5,
    },
    {
      id: 's-mock-2',
      name: 'Pavel Sorokin',
      email: 'pavel@test.fi',
      cefr_level: 'A1.2',
      day_n: 67,
      attendance_streak: 12,
      consecutive_absences: 0,
      alert_tyovoima: false,
      module_progress: { M3: 100, M4: 45, M5: 10 },
      hops_summary: 'Työvuorot ja ohjeet → palvelut → työssäoppiminen Kuopio Ateriapalvelu',
      placement: {
        employer: 'Kuopio Ateriapalvelu',
        supervisor: 'R. Nieminen',
        weeks: '2',
        credits: 8,
        status: 'active',
      },
      yki_ready: false,
      otp_month: 18.0,
    },
    {
      id: 's-mock-3',
      name: 'Li Wei',
      email: 'li@test.fi',
      cefr_level: 'A2',
      day_n: 108,
      attendance_streak: 20,
      consecutive_absences: 0,
      alert_tyovoima: false,
      module_progress: { M5: 100, M6: 88, YX: 40 },
      hops_summary: 'YKI keskitaso — työnhaku ja haastattelu',
      placement: { employer: 'Pohjois-Savo IT', supervisor: 'J. Laaksonen', weeks: '3', credits: 8, status: 'completed' },
      yki_ready: true,
      otp_month: 22.0,
    },
  ],
  hops_sample: {
    goals_120d: ['Aakkoset ja numerot', 'Arjen suomi', 'Työelämän peruskieli', 'Työssäoppiminen', 'YKI-valmius'],
    teacher_notes: 'Demo: HOPS päivitetään yhteistyössä opiskelijan kanssa.',
    student_visible: true,
  },
  placement_sample: {
    employer: 'Kuopion kaupunki / Terveyskeskus',
    address: 'Kuopio',
    supervisor_name: 'T. Laukkanen',
    start: '2026-09-01',
    end: '2026-09-19',
    credits: 8,
    agreement: { student_signed: true, employer_signed: true, teacher_signed: true },
    feedback_final: 'Hyvä työskentely; kommunikoi rohkeasti suomeksi.',
  },
  jatkosuunnitelma_sample: {
    options: ['Jatkokoulutus A2→B1', 'Työnhaku tukipalvelun kautta', 'Työkokeilu jatkuu'],
    student_comment: 'Haluan jatkaa ruoanvalmistuksen parissa.',
    status: 'draft',
  },
  otp_report_sample: {
    month: '2026-03',
    rows: [
      { student: 'Amira Hassan', otp_days: 12.5, hours: 87.5, partial_note: '2× 3.5h' },
      { student: 'Pavel Sorokin', otp_days: 18, hours: 126, partial_note: '—' },
      { student: 'Li Wei', otp_days: 22, hours: 154, partial_note: '1× 3.5h' },
    ],
    total_otp: 52.5,
  },
  yki_readiness_sample: {
    subtests: { read: 'ready', write: 'ready', listen: 'almost', speak: 'practice' },
    recommendation: 'Valmis keskitason YKI:ään 4–6 viikon intensiivillä.',
  },
  attendance_alert_rule: {
    consecutive_absence_limit: 5,
    notify: ['vastuuopettaja', 'työvoimaviranomainen'],
  },
  employer_contacts: [
    { id: 'ec1', name: 'Kuopio Ateriapalvelu', sector: 'Ruoka', contact: 'rekry@example.fi' },
    { id: 'ec2', name: 'Pohjois-Savo IT', sector: 'ICT', contact: 'hr@example.fi' },
  ],
  gdpr: {
    data_region: 'EU (Neon)',
    retention_years_min: 2,
    audit_log_enabled: true,
    koulutusportti_fields: [
      'enrollment_date',
      'dropout_date',
      'completion_date',
      'language_level_achieved',
      'jatkosuunnitelma',
      'new_training_recommendation',
    ],
  },
  /** OPH 2022 — arviointiasteikko (shell) */
  language_assessment: {
    framework: 'OPH perusopetus 2022 / kotoutumiskoulutus',
    scale: ['pre-A1', 'A1', 'A2', 'B1', 'B2'],
    notes: 'Kirjaa sisääntulo-, väli- ja päätöarviointi. Täyttö loppuraporttiin ja Koulutusporttiin.',
    sample_entry: { student: 'Pavel Sorokin', entry: 'A1.2', midpoint: 'A2 (arvio)', exit_target: 'A2' },
  },
  attendance_daily_sample: [
    { date: '2026-03-28', student: 'Amira Hassan', present: true, note: '' },
    { date: '2026-03-28', student: 'Pavel Sorokin', present: true, note: '' },
    { date: '2026-03-27', student: 'Li Wei', present: false, note: 'Sairas' },
  ],
  passi_tracking: [
    { student_id: 's-mock-1', items: [{ name: 'Hygieniapassi', status: 'suunnitteilla' }, { name: 'EA1-tietoisuus', status: 'ei aloitettu' }] },
    { student_id: 's-mock-2', items: [{ name: 'Hygieniapassi', status: 'suoritettu' }, { name: 'EA1-tietoisuus', status: 'käynnissä' }] },
    { student_id: 's-mock-3', items: [{ name: 'Hygieniapassi', status: 'suoritettu' }, { name: 'EA1-tietoisuus', status: 'suoritettu' }] },
  ],
  feedback_tilaaja: {
    interim: { title: 'Välipalaute (tilaajan lomake)', fields: ['Motivaatio', 'Työelämätaidot', 'Kieli', 'Toiveet'], format: 'PDF/Excel-vienti tulossa' },
    final: { title: 'Loppupalaute (tilaajan lomake)', fields: ['Kokonaisarvio', 'Jatko', 'Suositus'], format: 'Yhteys loppuraporttiin' },
  },
  final_report_kuopio: {
    forms: [
      { id: '5182', name: 'Kuopion kaupunki e-lomake (opiskelijakohtainen raportointi)', status: 'demo-vienti' },
      { id: '5183', name: 'Kuopion kaupunki e-lomake (lisä / täydennys)', status: 'demo-vienti' },
    ],
    export: 'PDF-luonnos + kenttäkartta Koulutusportti-synkkiin',
  },
  teacher_roles_help: {
    vastuuopettaja: 'Täysi pedagoginen vastuu, moduulit, raportit, HOPS-hyväksyntä.',
    ohjaaja: 'Läsnäolo, työssäoppiminen, tuki — rajattu muokkaus.',
  },
};

async function tryDbModules() {
  try {
    const r = await query(
      'SELECT code, level_label, theme, sort_order, content FROM lms_modules ORDER BY sort_order ASC NULLS LAST, code ASC',
      []
    );
    if (r.rows && r.rows.length > 0) return r.rows;
  } catch (e) {
    /* table may not exist yet */
  }
  return null;
}

export default async function lmsHandler(req, res, pathSegs) {
  const method = req.method || 'GET';
  const sub = pathSegs[1] || '';
  const user = req.user;
  if (!user) {
    sendJson(res, 401, { error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    return;
  }

  const isStaff = user.role === 'teacher' || user.role === 'admin';
  const isLearner = user.role === 'learner';

  try {
    if (sub === 'modules' && method === 'GET') {
      const rows = await tryDbModules();
      const modules = rows
        ? rows.map((x) => ({
            code: x.code,
            level: x.level_label,
            theme: x.theme,
            sort: x.sort_order,
            slots: { video: true, text: true, exercises: true, vocabulary: true, speaking: true, quiz: true },
            content: x.content || {},
          }))
        : MOCK.modules.map((m) => ({
            ...m,
            level: m.level,
            slots: { video: true, text: true, exercises: true, vocabulary: true, speaking: true, quiz: true },
            content: { title: `Moduuli ${m.code}`, body: 'Sisältö täydennetään OPH 2022 -mukaisesti.' },
          }));
      return sendJson(res, 200, { modules, tender: MOCK.tender });
    }

    if (sub === 'me' && method === 'GET' && isLearner) {
      const st = MOCK.students.find((s) => s.email && user.email && s.email.toLowerCase() === String(user.email).toLowerCase()) ||
        MOCK.students[0];
      return sendJson(res, 200, {
        profile: st,
        modules: MOCK.modules,
        hops: MOCK.hops_sample,
        jatkosuunnitelma: MOCK.jatkosuunnitelma_sample,
        notifications: [{ id: 1, type: 'message', text: 'Tervetuloa ALKUPOLKUun — demo', at: new Date().toISOString() }],
        diary_prompts: ['Päivä 1: Mitä opin tänään työpaikalla?'],
      });
    }

    if (isLearner) {
      sendJson(res, 403, { error: 'Forbidden', code: 'TEACHER_ONLY' });
      return;
    }

    if (sub === 'overview' && method === 'GET' && isStaff) {
      return sendJson(res, 200, {
        tender: MOCK.tender,
        teachers: MOCK.teachers,
        students: MOCK.students,
        attendance_rule: MOCK.attendance_alert_rule,
        attendance_log: MOCK.attendance_daily_sample,
        yki: MOCK.yki_readiness_sample,
        otp: MOCK.otp_report_sample,
        gdpr: MOCK.gdpr,
        employer_contacts: MOCK.employer_contacts,
        modules: MOCK.modules,
        hops: MOCK.hops_sample,
        jatkosuunnitelma: MOCK.jatkosuunnitelma_sample,
        placement: MOCK.placement_sample,
        language_assessment: MOCK.language_assessment,
        passi_tracking: MOCK.passi_tracking,
        feedback_tilaaja: MOCK.feedback_tilaaja,
        final_report_kuopio: MOCK.final_report_kuopio,
        teacher_roles_help: MOCK.teacher_roles_help,
        placement_sample: MOCK.placement_sample,
      });
    }

    if (sub === 'students' && method === 'GET' && isStaff) {
      return sendJson(res, 200, { students: MOCK.students });
    }

    if (sub === 'student' && pathSegs[2] && method === 'GET' && isStaff) {
      const st = MOCK.students.find((s) => s.id === pathSegs[2]) || MOCK.students[0];
      return sendJson(res, 200, {
        student: st,
        hops: MOCK.hops_sample,
        placement: st.placement || MOCK.placement_sample,
        jatkosuunnitelma: MOCK.jatkosuunnitelma_sample,
        feedback: { interim: [], final: [] },
      });
    }

    if (sub === 'builder' && method === 'GET' && isStaff) {
      return sendJson(res, 200, {
        modules: MOCK.modules,
        hint: 'Moduulirakenteen tallennus tietokantaan: aja migrations/003-alkupolku-lms.sql',
      });
    }

    if (sub === 'attendance' && method === 'POST' && isStaff) {
      return sendJson(res, 200, { ok: true, message: 'Demo: merkintä vastaanotettu (tietokantaintegraatio tulossa).' });
    }

    if (sub === 'hops' && method === 'POST' && isStaff) {
      return sendJson(res, 200, { ok: true, message: 'Demo: HOPS luonnos tallennettu.' });
    }

    sendJson(res, 404, { error: 'Not found', path: pathSegs.join('/') });
  } catch (err) {
    console.error('lms:', err);
    sendJson(res, 500, { error: 'LMS error' });
  }
}
