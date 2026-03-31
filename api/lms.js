/**
 * ALKUPOLKU LMS API — Kuopio kotoutumiskoulutus tender backbone
 * GET /api/lms/* — teacher/admin + learner scoped routes
 */
import { query } from './db.js';
import { sendJson } from '../src/lib/middleware.js';

/**
 * Finnish language modules — OPH curriculum 2022 (kotoutumiskoulutus) structure.
 * Shells + mock content; teachers replace with real materials in lms_modules.content.
 */
/** Demo cohort counts on module cards (teacher overview) — static for tender demo */
const MODULE_COHORT_DEMO = {
  M1: { cohort_student_count: 3, cohort_badge_fi: 'Aktiivinen', cohort_badge_variant: 'green' },
  M2: { cohort_student_count: 4, cohort_badge_fi: 'Aktiivinen', cohort_badge_variant: 'green' },
  M3: { cohort_student_count: 2, cohort_badge_fi: 'Tulossa', cohort_badge_variant: 'amber' },
  M4: { cohort_student_count: 1, cohort_badge_fi: 'Tulossa', cohort_badge_variant: 'amber' },
  M5: { cohort_student_count: 0, cohort_badge_fi: 'Tulossa', cohort_badge_variant: 'gray' },
  M6: { cohort_student_count: 0, cohort_badge_fi: 'Tulossa', cohort_badge_variant: 'gray' },
  YX: { cohort_student_count: 0, cohort_badge_fi: 'Tulossa', cohort_badge_variant: 'gray' },
  EL: { cohort_student_count: 0, cohort_badge_fi: 'Tulossa', cohort_badge_variant: 'gray' },
};

function mergeModuleCohortDemo(obj) {
  const extra = MODULE_COHORT_DEMO[obj.code];
  return extra ? { ...obj, ...extra } : obj;
}

const MODULES_OPH2022 = [
  {
    code: 'M1',
    module_index: 1,
    level: 'Pre-A1',
    theme: 'Latin alphabet, basic sounds, numbers',
    theme_fi:
      'Aloitamme alusta — latinalainen aakkoset, äänteet ja numerot. Ei aiempaa tietoa tarvita.',
    sort: 1,
    cross_cutting: false,
    mock: {
      video: 'Demo: äänteet ja kirjaimet A–Ö',
      text: 'Tervetuloa moduuliin 1. Harjoitellaan aakkoset ja numerot 1–20.',
      exercises: ['Yhdistä kirjain ja äänne', 'Kirjoita numero sanana'],
      vocabulary: ['aakkoset', 'numero', 'vokaali', 'konsonantti'],
      speaking: 'Lausu aakkoset ääneen hitaasti.',
      quiz: 'Alkutasoitus: aakkoset ja numerot',
    },
  },
  {
    code: 'M2',
    module_index: 2,
    level: 'A1.1',
    theme: 'Greetings, daily life, family',
    theme_fi: 'Tervehdykset, arki, perhe',
    sort: 2,
    cross_cutting: false,
    mock: {
      video: 'Demo: tervehdykset ja esittäytyminen',
      text: 'Minun nimi on… Minulla on perhe…',
      exercises: ['Täytä dialogi', 'Kuka tämä on?'],
      vocabulary: ['terve', 'hyvää päivää', 'perhe', 'lapset'],
      speaking: 'Esittele itsesi ja perheesi lyhyesti.',
      quiz: 'Tasoitus: arjen sanasto',
    },
  },
  {
    code: 'M3',
    module_index: 3,
    level: 'A1.2',
    theme: 'Work vocabulary, asking for help',
    theme_fi: 'Työsanasto, avun pyytäminen',
    sort: 3,
    cross_cutting: false,
    mock: {
      video: 'Demo: työpaikalla — pyydä apua kohteliaasti',
      text: 'Voisitteko auttaa? En ymmärrä ohjetta.',
      exercises: ['Muodollinen pyyntö', 'Kuuntele ja toista'],
      vocabulary: ['vuoro', 'tauko', 'apu', 'ohje'],
      speaking: 'Harjoittele pyytämään apua työtilanteessa.',
      quiz: 'Työsanasto A1.2',
    },
  },
  {
    code: 'M4',
    module_index: 4,
    level: 'A1.3',
    theme: 'Healthcare, services, transport',
    theme_fi: 'Terveydenhuolto, palvelut, liikenne',
    sort: 4,
    cross_cutting: false,
    mock: {
      video: 'Demo: terveyskeskuksessa',
      text: 'Minulla on aika. Missä on odotus? Tarvitsen reseptin.',
      exercises: ['Ajanvaraus', 'Bussilippu'],
      vocabulary: ['aika', 'sairas', 'bussi', 'lippu'],
      speaking: 'Kuvitteellinen käynti terveysasemalla.',
      quiz: 'Palvelutilanteet',
    },
  },
  {
    code: 'M5',
    module_index: 5,
    level: 'A2.1',
    theme: 'Workplace Finnish, instructions',
    theme_fi: 'Työelämän suomi, ohjeet',
    sort: 5,
    cross_cutting: false,
    mock: {
      video: 'Demo: työturvallisuus ja ohjeet',
      text: 'Työvuoro alkaa kello… Käytä suojavarusteita.',
      exercises: ['Ohjeen järjestys', 'Turvamerkit'],
      vocabulary: ['vuorolista', 'suojat', 'varoitus'],
      speaking: 'Toista ohje omin sanoin.',
      quiz: 'Työpaikan peruskieli',
    },
  },
  {
    code: 'M6',
    module_index: 6,
    level: 'A2.2',
    theme: 'Job seeking, interviews, YKI prep',
    theme_fi: 'Työnhaku, haastattelu, YKI-valmennus',
    sort: 6,
    cross_cutting: false,
    mock: {
      video: 'Demo: työhaastattelu',
      text: 'Kertokaa itsestänne. Miksi haette tätä työtä?',
      exercises: ['CV sanasto', 'YKI-testin rakenne'],
      vocabulary: ['kokemus', 'vahvuus', 'hakemus'],
      speaking: 'Lyhyt haastatteluharjoitus.',
      quiz: 'YKI-keskitaso — lähtötaso',
    },
  },
  {
    code: 'YX',
    module_index: 7,
    level: '+All',
    theme: 'Finnish society & culture (yhteiskuntatietous)',
    theme_fi: 'Yhteiskuntatietous ja suomalainen kulttuuri',
    sort: 7,
    cross_cutting: true,
    mock: {
      video: 'Demo: yhteiskunta ja palvelut Suomessa',
      text: 'Oikeudet, velvollisuudet, äänestäminen — perusteet.',
      exercises: ['Palvelut kartalla', 'Keskusteluaiheita'],
      vocabulary: ['kunta', 'palvelu', 'laki'],
      speaking: 'Keskustelu: arki Suomessa.',
      quiz: 'Yhteiskuntatietous — mini',
    },
  },
  {
    code: 'EL',
    module_index: 8,
    level: '+All',
    theme: 'Life management (elämänhallinta)',
    theme_fi: 'Elämänhallinta ja hyvinvointi',
    sort: 8,
    cross_cutting: true,
    mock: {
      video: 'Demo: talous ja arjen suunnittelu',
      text: 'Budjetti, tavoitteet, tuki — peruskäsitteet.',
      exercises: ['Arjen tavoitteet', 'Apua mistä?'],
      vocabulary: ['tavoite', 'aika', 'tuki'],
      speaking: 'Pieni tavoite itselle — kerro suomeksi.',
      quiz: 'Elämänhallinta — mini',
    },
  },
];

function parseContentJson(raw) {
  if (raw == null) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const o = JSON.parse(raw);
      return typeof o === 'object' && o && !Array.isArray(o) ? o : {};
    } catch {
      return {};
    }
  }
  return {};
}

function shellContent(m) {
  return {
    title_fi: `Moduuli ${m.module_index}: ${m.theme_fi}`,
    title_en: `Module ${m.module_index}: ${m.theme}`,
    body: m.mock.text,
    oph: 'OPH 2022 — kotoutumiskoulutus',
    video: m.mock.video,
    exercises: m.mock.exercises,
    vocabulary: m.mock.vocabulary,
    speaking: m.mock.speaking,
    quiz: m.mock.quiz,
  };
}

function modulesForApi(fromDbRows) {
  if (fromDbRows && fromDbRows.length > 0) {
    return fromDbRows.map((x) => {
      const shell = MODULES_OPH2022.find((m) => m.code === x.code);
      const base = shell || {};
      const c = parseContentJson(x.content);
      const merged = shell ? { ...shellContent(shell), ...c } : { ...c };
      return mergeModuleCohortDemo({
        code: x.code,
        module_index: base.module_index ?? null,
        level: x.level_label,
        theme: x.theme,
        theme_fi: base.theme_fi || null,
        sort: x.sort_order,
        cross_cutting: base.cross_cutting ?? false,
        slots: { video: true, text: true, exercises: true, vocabulary: true, speaking: true, quiz: true },
        mock: base.mock || {},
        content: merged,
      });
    });
  }
  return MODULES_OPH2022.map((m) =>
    mergeModuleCohortDemo({
      code: m.code,
      module_index: m.module_index,
      level: m.level,
      theme: m.theme,
      theme_fi: m.theme_fi,
      sort: m.sort,
      cross_cutting: m.cross_cutting,
      slots: { video: true, text: true, exercises: true, vocabulary: true, speaking: true, quiz: true },
      mock: m.mock,
      content: shellContent(m),
    })
  );
}

const MOCK = {
  tender: {
    client: 'Kuopion kaupunki / TyöNavigaattori',
    case_ref: '2042/02.08.00/2026',
    period: '1.6.2026 – 31.5.2027 (+ 2× option years)',
    group_size: '20–25',
    path_days: 120,
    otp_hours_per_unit: 7,
  },
  modules: MODULES_OPH2022.map((m) => ({
    code: m.code,
    level: m.level,
    theme: m.theme,
    sort: m.sort,
  })),
  teachers: [
    { id: 't-demo-1', name: 'Suvi Virtanen', email: 'suvi.v@knuut.fi', teacher_kind: 'vastuuopettaja', credentials: 'YTM, 60op suomi/S2, pedagogiset 60op' },
    { id: 't-demo-2', name: 'Matti Korhonen', email: 'matti.k@knuut.fi', teacher_kind: 'ohjaaja', credentials: 'AMK, 15op aikuiskasvatus' },
  ],
  students: [
    {
      id: 's-mock-1',
      name: 'Fatuma Warsame',
      email: 'fatuma.w@example.com',
      cefr_level: 'A1',
      mother_tongue: 'Somali',
      day_n: 42,
      attendance_streak: 3,
      consecutive_absences: 0,
      alert_tyovoima: false,
      module_progress: { M1: 85, M2: 20 },
      hops_summary: 'Aakkoset → arki → seuraava väliarviointi',
      placement: null,
      yki_ready: false,
      otp_month: 11.0,
    },
    {
      id: 's-mock-2',
      name: 'Leila Ahmadi',
      email: 'leila.a@example.com',
      cefr_level: 'A1',
      mother_tongue: 'Dari',
      day_n: 55,
      attendance_streak: 8,
      consecutive_absences: 0,
      alert_tyovoima: false,
      module_progress: { M1: 100, M2: 72 },
      hops_summary: 'Tervehdykset → perhe → palvelut',
      placement: null,
      yki_ready: false,
      otp_month: 14.5,
    },
    {
      id: 's-mock-3',
      name: 'Amira Hassan',
      email: 'amira.h@example.com',
      cefr_level: 'A1',
      mother_tongue: 'Arabic',
      day_n: 38,
      attendance_streak: 6,
      consecutive_absences: 0,
      alert_tyovoima: false,
      module_progress: { M1: 100, M2: 55 },
      hops_summary: 'Numerot ja palvelut → työsanasto seuraavaksi',
      placement: null,
      yki_ready: false,
      otp_month: 12.0,
    },
    {
      id: 's-mock-4',
      name: 'Hodan Farah',
      email: 'hodan.f@example.com',
      cefr_level: 'A2',
      mother_tongue: 'Somali',
      day_n: 90,
      attendance_streak: 14,
      consecutive_absences: 0,
      alert_tyovoima: false,
      module_progress: { M2: 100, M3: 60, M4: 10 },
      hops_summary: 'Työvuorot → palvelut → työssäoppiminen (Niirala)',
      placement: { employer: 'Niiralan Kulma ry', supervisor: '—', weeks: '—', credits: 8, status: 'briefing' },
      yki_ready: false,
      otp_month: 17.0,
    },
    {
      id: 's-mock-5',
      name: 'Dmytro Kovalenko',
      email: 'dmytro.k@example.com',
      cefr_level: 'A2',
      mother_tongue: 'Ukrainian',
      day_n: 72,
      attendance_streak: 10,
      consecutive_absences: 0,
      alert_tyovoima: false,
      module_progress: { M2: 100, M3: 88, M4: 30 },
      hops_summary: 'Ohjeet työpaikalla → työssäoppiminen (ISS)',
      placement: { employer: 'ISS Palvelut', supervisor: 'HR', weeks: '3', credits: 8, status: 'employer_pending' },
      yki_ready: false,
      otp_month: 16.0,
    },
    {
      id: 's-mock-6',
      name: 'Li Wei',
      email: 'li.wei@example.com',
      cefr_level: 'A2',
      mother_tongue: 'Mandarin',
      day_n: 100,
      attendance_streak: 18,
      consecutive_absences: 0,
      alert_tyovoima: false,
      module_progress: { M4: 100, M5: 40 },
      hops_summary: 'Liikenne ja palvelut → YKI-suunta',
      placement: null,
      yki_ready: false,
      otp_month: 20.0,
    },
    {
      id: 's-mock-7',
      name: 'Pavel Sorokin',
      email: 'pavel.s@example.com',
      cefr_level: 'B1',
      mother_tongue: 'Russian',
      day_n: 110,
      attendance_streak: 20,
      consecutive_absences: 0,
      alert_tyovoima: false,
      module_progress: { M4: 100, M5: 90, M6: 45 },
      hops_summary: 'YKI-keskustelu → työnhaku',
      placement: {
        employer: 'S-market Kuopio',
        supervisor: 'Vuoropäällikkö',
        weeks: '2',
        credits: 8,
        status: 'active',
      },
      yki_ready: true,
      otp_month: 19.0,
    },
    {
      id: 's-mock-8',
      name: 'Mariam Diallo',
      email: 'mariam.d@example.com',
      cefr_level: 'A1',
      mother_tongue: 'French (Guinea)',
      day_n: 48,
      attendance_streak: 7,
      consecutive_absences: 0,
      alert_tyovoima: false,
      module_progress: { M1: 100, M2: 48 },
      hops_summary: 'Perhe ja arki → työsanasto',
      placement: null,
      yki_ready: false,
      otp_month: 13.0,
    },
    {
      id: 's-mock-9',
      name: 'Yusuf Ibrahim',
      email: 'yusuf.i@example.com',
      cefr_level: 'A1',
      mother_tongue: 'Somali',
      day_n: 5,
      attendance_streak: 2,
      consecutive_absences: 0,
      alert_tyovoima: false,
      module_progress: { M1: 35, M2: 0 },
      hops_summary: 'Ensimmäinen viikko — aakkoset ja tervehdykset',
      placement: null,
      yki_ready: false,
      otp_month: 4.0,
    },
    {
      id: 's-mock-10',
      name: 'Oksana Petrenko',
      email: 'oksana.p@example.com',
      cefr_level: 'A2',
      mother_tongue: 'Ukrainian',
      day_n: 95,
      attendance_streak: 16,
      consecutive_absences: 0,
      alert_tyovoima: false,
      module_progress: { M3: 100, M4: 80 },
      hops_summary: 'Palvelut → valmis työssäoppiminen Kuopion kaupunki',
      placement: {
        employer: 'Kuopion kaupunki',
        supervisor: 'Ohjaaja',
        weeks: '3',
        credits: 8,
        status: 'completed',
      },
      yki_ready: true,
      otp_month: 18.5,
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
      { student: 'Fatuma Warsame', otp_days: 11, hours: 77, partial_note: '—' },
      { student: 'Leila Ahmadi', otp_days: 14.5, hours: 101.5, partial_note: '—' },
      { student: 'Amira Hassan', otp_days: 12, hours: 84, partial_note: '2× 3.5h' },
      { student: 'Hodan Farah', otp_days: 17, hours: 119, partial_note: '—' },
      { student: 'Dmytro Kovalenko', otp_days: 16, hours: 112, partial_note: '—' },
      { student: 'Li Wei', otp_days: 20, hours: 140, partial_note: '1× 3.5h' },
      { student: 'Pavel Sorokin', otp_days: 19, hours: 133, partial_note: '—' },
      { student: 'Mariam Diallo', otp_days: 13, hours: 91, partial_note: '—' },
      { student: 'Yusuf Ibrahim', otp_days: 4, hours: 28, partial_note: 'aloitusviikko' },
      { student: 'Oksana Petrenko', otp_days: 18.5, hours: 129.5, partial_note: '—' },
    ],
    total_otp: 145.0,
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
    sample_entry: { student: 'Pavel Sorokin', entry: 'B1', midpoint: 'B1 (vahvistettu)', exit_target: 'YKI keskitaso' },
  },
  attendance_daily_sample: [
    { date: '2026-03-30', student: 'Pavel Sorokin', present: true, note: '' },
    { date: '2026-03-30', student: 'Dmytro Kovalenko', present: true, note: '' },
    { date: '2026-03-30', student: 'Oksana Petrenko', present: true, note: '' },
    { date: '2026-03-29', student: 'Fatuma Warsame', present: false, note: 'Sairas' },
    { date: '2026-03-29', student: 'Leila Ahmadi', present: true, note: '' },
    { date: '2026-03-29', student: 'Li Wei', present: false, note: 'Poissa' },
  ],
  passi_tracking: [
    { student_id: 's-mock-1', items: [{ name: 'Hygieniapassi', status: 'suunnitteilla' }, { name: 'EA1-tietoisuus', status: 'ei aloitettu' }] },
    { student_id: 's-mock-2', items: [{ name: 'Hygieniapassi', status: 'käynnissä' }, { name: 'EA1-tietoisuus', status: 'ei aloitettu' }] },
    { student_id: 's-mock-3', items: [{ name: 'Hygieniapassi', status: 'käynnissä' }, { name: 'EA1-tietoisuus', status: 'ei aloitettu' }] },
    { student_id: 's-mock-4', items: [{ name: 'Hygieniapassi', status: 'suoritettu' }, { name: 'EA1-tietoisuus', status: 'käynnissä' }] },
    { student_id: 's-mock-5', items: [{ name: 'Hygieniapassi', status: 'suoritettu' }, { name: 'EA1-tietoisuus', status: 'käynnissä' }] },
    { student_id: 's-mock-6', items: [{ name: 'Hygieniapassi', status: 'suoritettu' }, { name: 'EA1-tietoisuus', status: 'suoritettu' }] },
    { student_id: 's-mock-7', items: [{ name: 'Hygieniapassi', status: 'suoritettu' }, { name: 'EA1-tietoisuus', status: 'suoritettu' }] },
    { student_id: 's-mock-8', items: [{ name: 'Hygieniapassi', status: 'käynnissä' }, { name: 'EA1-tietoisuus', status: 'ei aloitettu' }] },
    { student_id: 's-mock-9', items: [{ name: 'Hygieniapassi', status: 'ei aloitettu' }, { name: 'EA1-tietoisuus', status: 'ei aloitettu' }] },
    { student_id: 's-mock-10', items: [{ name: 'Hygieniapassi', status: 'suoritettu' }, { name: 'EA1-tietoisuus', status: 'suoritettu' }] },
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
  /** Learner-only enrichments (GET /api/lms/me) */
  learner_schedule: [
    { time: '09:00', icon: '👥', label_fi: 'Ryhmätunti (suomi)', label_en: 'Group lesson', label_ar: 'درس جماعي' },
    { time: '10:45', icon: '☕', label_fi: 'Tauko', label_en: 'Break', label_ar: 'استراحة' },
    { time: '11:00', icon: '💬', label_fi: 'Keskustelu / Knuut', label_en: 'Speaking / Knuut', label_ar: 'محادثة' },
    { time: '12:30', icon: '🍽️', label_fi: 'Lounas', label_en: 'Lunch', label_ar: 'غداء' },
    { time: '13:30', icon: '📝', label_fi: 'Työelämän sanasto', label_en: 'Work vocabulary', label_ar: 'مفردات العمل' },
  ],
  learning_path_milestones: [
    { day: 1, label_fi: 'Aakkoset & äänteet', done: true },
    { day: 30, label_fi: 'A1.1 — arki', done: true },
    { day: 60, label_fi: 'A1.2 — työ', done: false },
    { day: 90, label_fi: 'A2.1 — työpaikka', done: false },
    { day: 120, label_fi: 'A2 — tavoite', done: false },
  ],
  homework_demo: [
    { id: 'hw1', title_fi: 'Kirjoita 5 lausetta: päiväni työpaikalla', title_en: 'Write 5 sentences: my day at work', due: '2026-04-02', status: 'pending' },
    { id: 'hw2', title_fi: 'Kuuntele äänite ja vastaa kysymyksiin (M3)', title_en: 'Listen and answer (M3)', due: '2026-04-05', status: 'submitted' },
  ],
  self_assessment_demo: [
    { id: 'sa1', q_fi: 'Pystyn tervehtimään ja esittelemään itseni suomeksi.', q_en: 'I can greet and introduce myself in Finnish.', q_ar: 'أستطيع التحية والتعريف بنفسي بالفنلندية.', scale: '1–5' },
    { id: 'sa2', q_fi: 'Ymmärrän yksinkertaisia työohjeita.', q_en: 'I understand simple work instructions.', q_ar: 'أفهم تعليمات العمل البسيطة.', scale: '1–5' },
    { id: 'sa3', q_fi: 'Uskallan pyytää apua suomeksi.', q_en: 'I dare to ask for help in Finnish.', q_ar: 'أجرؤ على طلب المساعدة بالفنلندية.', scale: '1–5' },
  ],
  vocabulary_banks: [
    {
      theme_fi: 'Työvuoro',
      theme_en: 'Work shift',
      words: [
        { fi: 'vuoro', en: 'shift', ar: 'وردية' },
        { fi: 'tauko', en: 'break', ar: 'استراحة' },
        { fi: 'esimies', en: 'supervisor', ar: 'مشرف' },
      ],
    },
    {
      theme_fi: 'Terveydenhuolto',
      theme_en: 'Healthcare',
      words: [
        { fi: 'aika', en: 'appointment', ar: 'موعد' },
        { fi: 'särky', en: 'pain', ar: 'ألم' },
      ],
    },
  ],
  grammar_reference: [
    { topic_fi: 'Kysymyssanat (mitä, missä, milloin)', topic_en: 'Question words', example: 'Missä on vessa? Milloin tauko?' },
    { topic_fi: 'Genetiivi (minun, sinun)', topic_en: 'Genitive', example: 'Minun vuoroni alkaa kello 8.' },
    { topic_fi: 'Verbityypit (1–5) — lyhyt', topic_en: 'Verb types', example: 'Asua, syödä, mennä…' },
  ],
  passport_prep: {
    hygiene: {
      title_fi: 'Hygieniapassi — valmistautuminen',
      title_en: 'Hygiene passport — prep',
      bullets_fi: ['Käsienpesu oikein', 'Elintarvikehygienia', 'Allergiat ja ristikontaminaatio'],
      bullets_en: ['Hand washing', 'Food hygiene', 'Allergens'],
    },
    first_aid: {
      title_fi: 'Ensiapu — perustietoisuus (ei korvaa kurssia)',
      title_en: 'First aid — awareness (not a course)',
      bullets_fi: ['Soita 112 hätätilanteessa', 'Tunnista tajuton', 'Älä liikuta loukkaantunutta turhaan'],
      bullets_en: ['Call 112 in emergency', 'Recognize unconscious person'],
    },
  },
  notifications_demo: [
    { id: 'n1', type: 'schedule', text_fi: 'Huomenna tunti klo 9 siirtyy saliin B2.', text_en: 'Tomorrow 9:00 class moves to room B2.', at: '2026-03-29T08:00:00Z', read: false },
    { id: 'n2', type: 'message', text_fi: 'Opettaja: Muista työpäiväkirjan merkintä perjantaihin mennessä.', text_en: 'Teacher: Remember diary entry by Friday.', at: '2026-03-28T14:00:00Z', read: false },
  ],
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

async function getMicroPracticeState(learnerId) {
  try {
    const r = await query(
      `SELECT day::text AS day, word_key, completed_at
       FROM learner_micro_practice WHERE learner_id = $1 ORDER BY day DESC LIMIT 120`,
      [learnerId]
    );
    const rows = r.rows || [];
    const daySet = new Set(rows.map((x) => String(x.day).slice(0, 10)));
    const today = new Date().toISOString().slice(0, 10);
    const completedToday = daySet.has(today);
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 400; i++) {
      const ds = d.toISOString().slice(0, 10);
      if (daySet.has(ds)) {
        streak += 1;
        d.setDate(d.getDate() - 1);
      } else if (streak === 0 && i === 0) {
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return { completed_today: completedToday, streak, recent_days: rows.slice(0, 21) };
  } catch (e) {
    if (e.code === '42P01') return { completed_today: false, streak: 0, recent_days: [] };
    throw e;
  }
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
      const modules = modulesForApi(rows);
      return sendJson(res, 200, {
        modules,
        tender: MOCK.tender,
        curriculum: { ref: 'OPH 2022', label_fi: 'Kotoutumiskoulutus — moduulirakenne' },
      });
    }

    if (sub === 'me' && method === 'GET' && isLearner) {
      const st = MOCK.students.find((s) => s.email && user.email && s.email.toLowerCase() === String(user.email).toLowerCase()) ||
        MOCK.students[0];
      const modRows = await tryDbModules();
      let micro = { completed_today: false, streak: 0, recent_days: [] };
      try {
        micro = await getMicroPracticeState(user.id);
      } catch (e) {
        console.error('lms me micro:', e.message);
      }
      return sendJson(res, 200, {
        profile: st,
        modules: modulesForApi(modRows),
        hops: MOCK.hops_sample,
        jatkosuunnitelma: MOCK.jatkosuunnitelma_sample,
        notifications: MOCK.notifications_demo,
        diary_prompts: [
          'Päivä: Mitä opin tänään työpaikalla? (What did you learn?)',
          'Kenen kanssa puhuin? (Who did I speak with?)',
        ],
        schedule: MOCK.learner_schedule,
        learning_path: MOCK.learning_path_milestones,
        homework: MOCK.homework_demo,
        self_assessment: MOCK.self_assessment_demo,
        vocabulary: MOCK.vocabulary_banks,
        grammar: MOCK.grammar_reference,
        passport_prep: MOCK.passport_prep,
        micro_practice: micro,
        ui_hints: {
          progress_label_fi: 'Edistyminen kohti A2',
          progress_label_en: 'Progress toward A2',
          multilingual_note_fi: 'Vähän suomea? Käytä kuvakkeita ja alla olevia käännöksiä.',
        },
      });
    }

    if (sub === 'jatko-comment' && method === 'POST' && isLearner) {
      return sendJson(res, 200, { ok: true, message: 'Kommentti vastaanotettu (demo). Opettaja näkee myöhemmin.' });
    }

    if (sub === 'homework' && method === 'POST' && isLearner) {
      return sendJson(res, 200, { ok: true, message: 'Lähetys vastaanotettu (demo).' });
    }

    if (sub === 'micro-practice' && isLearner) {
      const uid = user.id;
      if (method === 'POST') {
        const wordKey = req.body && req.body.word_key ? String(req.body.word_key).slice(0, 80) : '';
        const day =
          req.body && req.body.day
            ? String(req.body.day).slice(0, 10)
            : new Date().toISOString().slice(0, 10);
        if (!wordKey) return sendJson(res, 400, { error: 'word_key required' });
        try {
          await query(
            `INSERT INTO learner_micro_practice (learner_id, day, word_key) VALUES ($1, $2::date, $3)
             ON CONFLICT (learner_id, day) DO UPDATE SET word_key = EXCLUDED.word_key, completed_at = now()`,
            [uid, day, wordKey]
          );
          const st = await getMicroPracticeState(uid);
          return sendJson(res, 200, { ok: true, micro_practice: st });
        } catch (e) {
          if (e.code === '42P01') return sendJson(res, 503, { error: 'Run migration 007-learner-micro-practice.sql' });
          throw e;
        }
      }
      if (method === 'GET') {
        return sendJson(res, 200, await getMicroPracticeState(uid));
      }
      return sendJson(res, 405, { error: 'Method not allowed' });
    }

    if (isLearner) {
      sendJson(res, 403, { error: 'Forbidden', code: 'TEACHER_ONLY' });
      return;
    }

    if (sub === 'overview' && method === 'GET' && isStaff) {
      const modRows = await tryDbModules();
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
        modules: modulesForApi(modRows),
        curriculum: { ref: 'OPH 2022', label_fi: 'Kotoutumiskoulutus — moduulirakenne' },
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
      const modRows = await tryDbModules();
      return sendJson(res, 200, {
        modules: modulesForApi(modRows),
        curriculum: { ref: 'OPH 2022', label_fi: 'Kotoutumiskoulutus — moduulirakenne' },
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
