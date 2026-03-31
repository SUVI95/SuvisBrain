(function () {
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const ICONS = {
    calendar: '<svg class="pi" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><line x1="16" y1="3" x2="16" y2="7"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="3" y1="11" x2="21" y2="11"/></svg>',
    flame: '<svg class="pi" viewBox="0 0 24 24"><path d="M12 3c2 3 5 5 5 9a5 5 0 1 1-10 0c0-2 1-4 3-6 0 2 1 3 2 4 0-2 0-4 0-7z"/></svg>',
    star: '<svg class="pi" viewBox="0 0 24 24"><polygon points="12 3 15 9 22 10 17 15 18 22 12 19 6 22 7 15 2 10 9 9 12 3"/></svg>',
    book: '<svg class="pi" viewBox="0 0 24 24"><path d="M4 5a3 3 0 0 1 3-3h13v18H7a3 3 0 0 0-3 3z"/><path d="M7 2v21"/></svg>',
    check: '<svg class="pi" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
    mic: '<svg class="pi" viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><line x1="12" y1="18" x2="12" y2="22"/></svg>',
    speaker: '<svg class="pi" viewBox="0 0 24 24"><polygon points="11 5 6 9 3 9 3 15 6 15 11 19 11 5"/><path d="M15 9a4 4 0 0 1 0 6"/><path d="M17.5 6.5a8 8 0 0 1 0 11"/></svg>',
    mapPin: '<svg class="pi" viewBox="0 0 24 24"><path d="M12 22s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    type: '<svg class="pi" viewBox="0 0 24 24"><polyline points="4 7 4 4 20 4 20 7"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="8" y1="20" x2="16" y2="20"/></svg>',
    home: '<svg class="pi" viewBox="0 0 24 24"><path d="M3 10 12 3l9 7"/><path d="M5 10v11h14V10"/><path d="M10 21v-6h4v6"/></svg>',
    briefcase: '<svg class="pi" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/></svg>',
    award: '<svg class="pi" viewBox="0 0 24 24"><circle cx="12" cy="8" r="5"/><path d="M8 13l-2 8 6-3 6 3-2-8"/></svg>',
    users: '<svg class="pi" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M14 20a5 5 0 0 1 7 0"/></svg>',
    coffee: '<svg class="pi" viewBox="0 0 24 24"><path d="M3 8h14v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/><path d="M17 10h2a3 3 0 1 1 0 6h-2"/></svg>',
    lunch: '<svg class="pi" viewBox="0 0 24 24"><path d="M3 2v7"/><path d="M7 2v7"/><path d="M3 6h4"/><path d="M5 9v13"/><path d="M14 2v20"/><path d="M18 2c2 2 2 6 0 8h-4V2z"/></svg>',
    edit: '<svg class="pi" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    target: '<svg class="pi" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="2"/></svg>',
    spark: '<svg class="pi" viewBox="0 0 24 24"><path d="M12 3v5"/><path d="M12 16v5"/><path d="M3 12h5"/><path d="M16 12h5"/><path d="m5 5 3 3"/><path d="m16 16 3 3"/><path d="m19 5-3 3"/><path d="m8 16-3 3"/></svg>',
    bell: '<svg class="pi" viewBox="0 0 24 24"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>',
    teacher: '<svg class="pi" viewBox="0 0 24 24"><path d="M3 6l9-4 9 4-9 4-9-4z"/><path d="M6 8v5c0 2 3 4 6 4s6-2 6-4V8"/><circle cx="19" cy="13" r="1.5"/></svg>',
    file: '<svg class="pi" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    send: '<svg class="pi" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    quote: '<svg class="pi" viewBox="0 0 24 24"><path d="M9 8H5v6h4V8z"/><path d="M19 8h-4v6h4V8z"/></svg>'
  };

  const EMOJI_ICON_MAP = {
    '📅': ICONS.calendar,
    '🔥': ICONS.flame,
    '⭐': ICONS.star,
    '📚': ICONS.book,
    '✅': ICONS.check,
    '🎙️': ICONS.mic,
    '🔊': ICONS.speaker,
    '📍': ICONS.mapPin,
    '🔤': ICONS.type,
    '🏠': ICONS.home,
    '💼': ICONS.briefcase,
    '🏆': ICONS.award,
    '👥': ICONS.users,
    '☕': ICONS.coffee,
    '🍽️': ICONS.lunch,
    '📝': ICONS.edit,
    '🎯': ICONS.target,
    '💡': ICONS.spark,
    '🔔': ICONS.bell,
    '👩‍🏫': ICONS.teacher,
    '📓': ICONS.file,
    '📨': ICONS.send,
    '💭': ICONS.quote
  };

  function iconify(container) {
    if (!container) return;
    let html = container.innerHTML;
    Object.keys(EMOJI_ICON_MAP).forEach(function (k) {
      html = html.split(k).join(EMOJI_ICON_MAP[k]);
    });
    container.innerHTML = html;
  }

  function stripRemainingEmoji(container) {
    if (!container) return;
    const emojiRe = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
    container.querySelectorAll('*').forEach(function (el) {
      if (el.children.length) return;
      if (typeof el.textContent === 'string' && el.textContent) {
        el.textContent = el.textContent.replace(emojiRe, '').replace(/\s{2,}/g, ' ').trim();
      }
    });
  }

  const user = {
    id: 'pavel-profile',
    name: 'Pavel Sorokin',
    role: 'learner',
    native: 'Ukrainian',
    cefr: 'Pre-A1 → A1.1',
    day: 14,
    totalDays: 120,
    streak: 3,
    xpWeek: 340,
    xpTotal: 1840,
    module: 'M1',
    moduleProgress: 60,
    placementDay: 6,
    placementTotal: 15,
  };

  const state = {
    xpWeek: user.xpWeek,
    xpTotal: user.xpTotal,
    dailyDone: false,
    alphabetLearned: new Set(['A', 'E', 'I', 'O', 'U', 'M', 'N', 'S', 'T', 'K', 'L', 'R']),
    alphaQuizTarget: null,
    alphaStreak: 4,
    selfScores: [3, 4, 3, 2],
    selfMood: '3',
    vocabTheme: 'tyovuoro',
    vocabMode: 'table',
    flashIndex: 2,
    grammarAnswers: {},
    ykiTab: 'read',
    ykiRead: {},
    ykiListenPlayed: false,
    passStatus: {
      hygien: '○ Ei aloitettu',
      ea1: '◐ Käynnissä',
      safety: '○ Ei aloitettu',
      fire: '○ Ei aloitettu',
    },
    diaryTags: ['palaveri', 'muistiinpano', 'ohjelma'],
    notifications: [
      { id: 1, unread: true, type: '📅 Aikataulu · 31.3.2026 klo 08:30', text: 'Tänään: ryhmätunti klo 09:00 salissa B2', en: 'Today: group lesson 9:00 in room B2', sender: 'Järjestelmä (auto)' },
      { id: 2, unread: true, type: '👩‍🏫 Opettaja · 30.3.2026 klo 16:00', text: 'Hei Pavel! Muista kirjoittaa työpäiväkirjaan perjantaihin mennessä. Hyvää työtä tällä viikolla!', en: 'Hi Pavel! Remember your diary entry by Friday. Great work this week! — Anna', sender: 'Anna Korhonen' },
      { id: 3, unread: false, type: '🏆 Saavutus · 28.3.2026', text: "Uusi saavutus: 'Puhua rohkeasti' — 3 puheharjoittelua peräkkäin Knuutilla!", en: "New achievement: 'Speak Bravely' — 3 consecutive speaking sessions!" },
      { id: 4, unread: false, type: '📚 Moduuli · 27.3.2026', text: 'Moduuli 1 — 60% valmis! Latinalainen kirjaimisto täysin opittu ✓', en: 'Module 1 — 60% complete! Latin alphabet fully learned ✓' },
    ],
  };

  const VOCAB = {
    tyovuoro: [
      ['tyovuoro', 'work shift', 'рабочая смена', 'وردية', true],
      ['esimies', 'supervisor', 'начальник', 'مشرف', true],
      ['tauko', 'break', 'перерыв', 'استراحة', true],
      ['kollega', 'colleague', 'коллега', 'زميل', true],
      ['palkka', 'salary', 'зарплата', 'راتب', true],
      ['ylityo', 'overtime', 'сверхурочные', 'عمل إضافي', false],
      ['sairausloma', 'sick leave', 'больничный', 'إجازة مرضية', false],
      ['varoitus', 'warning', 'предупреждение', 'تحذير', false],
      ['vuorolista', 'shift list', 'график смен', 'جدول المناوبات', false],
      ['palaveri', 'meeting', 'совещание', 'اجتماع', false],
      ['hakemus', 'application', 'заявка', 'طلب', false],
      ['ansioluettelo', 'CV', 'резюме', 'سيرة ذاتية', false],
      ['sahkoposti', 'email', 'электронная почта', 'بريد إلكتروني', false],
      ['kuitata', 'acknowledge', 'подтвердить', 'تأكيد', false],
      ['ohje', 'instruction', 'инструкция', 'تعليمات', false],
      ['turvakortti', 'safety card', 'карта безопасности', 'بطاقة السلامة', false],
      ['vuokra', 'rent', 'аренда', 'إيجار', false],
      ['tyosopimus', 'work contract', 'трудовой договор', 'عقد عمل', false],
      ['koeaika', 'trial period', 'испытательный срок', 'فترة تجربة', false],
      ['vuorovastaava', 'shift lead', 'старший смены', 'مشرف المناوبة', false],
      ['tavoite', 'goal', 'цель', 'هدف', false],
      ['projekti', 'project', 'проект', 'مشروع', false],
      ['tehtava', 'task', 'задача', 'مهمة', false],
      ['raportti', 'report', 'отчёт', 'تقرير', false],
    ],
  };

  const SECTION_TITLES = {
    dashboard: 'Etusivu',
    schedule: 'Ohjelma & polku',
    modules: 'Moduulit',
    alphabet: 'Aakkoset',
    self: 'Itsearviointi',
    homework: 'Kotitehtävät',
    vocab: 'Sanastot',
    grammar: 'Kielioppi',
    lesson: 'Päivän tunti',
    yki: 'YKI',
    passports: 'Passit & valmennus',
    diary: 'Työpäiväkirja',
    hops: 'Opiskelupolku',
    jatko: 'Jatkosuunnitelma',
    notifications: 'Ilmoitukset',
  };

  function speak(text, lang) {
    if (!('speechSynthesis' in window)) {
      toast('Ääni ei ole käytettävissä tässä selaimessa.');
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang || 'fi-FI';
    u.rate = 0.9;
    speechSynthesis.speak(u);
  }

  function toast(msg) {
    let t = document.getElementById('pp-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'pp-toast';
      t.className = 'pp-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 1800);
  }

  function showSection(id) {
    document.querySelectorAll('.section').forEach(function (s) { s.classList.remove('active'); });
    const sec = document.getElementById('sec-' + id);
    if (sec) sec.classList.add('active');
    const b = document.getElementById('hz-breadcrumb-page');
    if (b) b.textContent = SECTION_TITLES[id] || 'Oppipolku';
    document.querySelectorAll('.nav-item[data-sec]').forEach(function (n) { n.classList.remove('active'); });
    const nav = document.querySelector('.nav-item[data-sec="' + id + '"]');
    if (nav) nav.classList.add('active');
  }

  function updateHeaderBits() {
    document.getElementById('sb-name').textContent = user.name;
    document.getElementById('sb-level').textContent = user.cefr;
    document.getElementById('sb-avatar').textContent = 'PS';
    const unread = state.notifications.filter(function (n) { return n.unread; }).length;
    const badge = document.getElementById('notif-count');
    if (badge) {
      badge.textContent = String(unread);
      badge.style.display = unread ? 'inline-block' : 'none';
    }
  }

  function renderDashboard() {
    const sec = document.getElementById('sec-dashboard');
    sec.innerHTML = '' +
      '<div class="page-header"><div class="page-title">Etusivu</div><div class="page-sub">Tervetuloa takaisin, Pavel.</div></div>' +
      '<div class="pp-hero">' +
      '<div style="font-size:26px;font-weight:800;color:var(--secondary-900)">Hei Pavel! 👋</div>' +
      '<div style="margin-top:6px;font-size:16px;color:var(--secondary-900);font-weight:700">Päivä 14 / 120 — olet matkalla. Tänään on tiistai. Tunti alkaa klo 09:00. Sinulla on 1 kotitehtävä odottamassa.</div>' +
      '<div style="margin-top:8px;font-size:14px;color:var(--text-body-soft)">Привет, Павел! День 14 из 120.</div>' +
      '<div style="font-size:14px;color:var(--text-body-soft)">Day 14 of 120 — keep going.</div>' +
      '</div>' +
      '<div class="pp-card" style="margin-bottom:14px">' +
      '<div style="font-weight:800">CEFR-polku · CEFR path</div>' +
      '<div class="pp-level-track">' +
      '<span class="pp-stop"><span class="pp-dot done"></span>PRE-A1</span><span>────</span>' +
      '<span class="pp-stop"><span class="pp-dot active"></span>A1.1</span><span>────</span>' +
      '<span class="pp-stop"><span class="pp-dot"></span>A1.2</span><span>────</span>' +
      '<span class="pp-stop"><span class="pp-dot"></span>A2.1</span><span>────</span>' +
      '<span class="pp-stop"><span class="pp-dot"></span>A2</span>' +
      '</div>' +
      '<div class="pp-soft">12% kohti A2-tavoitetta · 12% toward A2</div>' +
      '<div class="pp-soft">Arv. valmistuminen: syyskuu 2026 · Est. completion: September 2026</div>' +
      '</div>' +
      '<div class="pp-metric-grid">' +
      '<div class="pp-metric"><div class="pp-soft">🔥 Putki</div><div class="pp-kpi" id="kpi-streak">3 päivää</div></div>' +
      '<div class="pp-metric"><div class="pp-soft">⭐ XP tällä viikolla</div><div class="pp-kpi"><span id="kpi-xp-week">' + state.xpWeek + '</span> / 500</div></div>' +
      '<div class="pp-metric"><div class="pp-soft">📚 Moduuli</div><div class="pp-kpi">M1 → M2 siirtymä</div></div>' +
      '<div class="pp-metric"><div class="pp-soft">✅ Tänään</div><div class="pp-kpi" id="kpi-daily">1/3 tehtävää tehty</div></div>' +
      '</div>' +
      '<div class="pp-card" style="margin-bottom:14px">' +
      '<div style="font-weight:800;margin-bottom:8px">Daily micro-practice</div>' +
      '<div class="pp-card" style="margin-bottom:8px"><strong>Step 1 — Päivän sana</strong><div>työvuoro / work shift / рабочая смена / وردية عمل</div><div style="margin-top:8px"><button type="button" class="btn btn-outline" id="btn-tts-word">🔊 Kuuntele</button></div></div>' +
      '<div class="pp-card" style="margin-bottom:8px"><strong>Step 2 — Lausu ääneen</strong><div>Minun työvuoroni alkaa kello kahdeksan.</div><div class="pp-soft">Y-kirjain: huulet pyöreiksi kuin u mutta kieli ylhäällä · Round lips like u but tongue up</div><div style="margin-top:8px"><button type="button" class="btn btn-outline" id="btn-tts-sentence">🔊 Kuuntele</button></div></div>' +
      '<div class="pp-card"><strong>Step 3 — Päivän dialogi</strong><div>👤 Milloin sinun työvuorosi alkaa?</div><div>🗣️ Minun vuoroni alkaa kello kahdeksan.</div>' +
      '<div class="pp-row" style="margin-top:8px"><a class="btn btn-primary" href="knuut.html?topic=tyovuoro" style="text-decoration:none">🎙️ Harjoittele Knuutin kanssa</a><button type="button" class="btn btn-outline" id="btn-micro-done">✅ Merkitse tehty</button><span id="micro-msg" class="pp-soft"></span></div></div>' +
      '</div>' +
      '<div class="pp-card" style="margin-bottom:14px">' +
      '<div style="font-weight:800;margin-bottom:10px">Finland Journey</div>' +
      '<div class="pp-journey">' +
      '<div class="pp-ms done">📍 Alku (day 1)<br><small>DONE ✓</small></div>' +
      '<div class="pp-ms done">🔤 Aakkoset (day 7)<br><small>DONE ✓</small></div>' +
      '<div class="pp-ms current">🏠 Arki (day 30)<br><small>current</small></div>' +
      '<div class="pp-ms locked">💼 Työ (day 60)<br><small>locked</small></div>' +
      '<div class="pp-ms locked">🏆 A2 (day 120)<br><small>locked</small></div>' +
      '</div></div>' +
      '<div class="pp-card" style="margin-bottom:14px"><div style="font-weight:800;margin-bottom:8px">Today\'s schedule preview</div>' +
      '<div>09:00 👥 Ryhmätunti — Moduuli 2: Tervehdykset</div><div>10:45 ☕ Tauko 15 min</div><div>11:00 🎙️ Knuut-harjoitus — puhuminen</div><div>12:30 🍽️ Lounas</div><div>13:30 📝 Sanasto — työsanasto M2</div></div>' +
      '<div class="pp-card" style="background:#f0fdfa;border-color:#99f6e4"><strong>💡 Tiesitkö?</strong> Pavel — olet harjoitellut 14 päivää peräkkäin. 86 päivää jäljellä A2-tasolle. Did you know? 86 days to A2.</div>';

    document.getElementById('btn-tts-word').addEventListener('click', function () { speak('työvuoro', 'fi-FI'); });
    document.getElementById('btn-tts-sentence').addEventListener('click', function () { speak('Minun työvuoroni alkaa kello kahdeksan.', 'fi-FI'); });
    document.getElementById('btn-micro-done').addEventListener('click', function () {
      if (state.dailyDone) return toast('Hienoa! Tämä on jo merkitty tänään.');
      state.dailyDone = true;
      state.xpWeek += 50;
      state.xpTotal += 50;
      document.getElementById('kpi-xp-week').textContent = String(state.xpWeek);
      document.getElementById('kpi-daily').textContent = '2/3 tehtävää tehty';
      document.getElementById('micro-msg').textContent = 'Tehty! +50 XP 🎉';
      toast('Hienoa! Tehty! +50 XP 🎉');
    });
  }

  function renderSchedule() {
    const sec = document.getElementById('sec-schedule');
    sec.innerHTML = '' +
      '<div class="page-header"><div class="page-title">Ohjelma & polku</div><div class="page-sub">Pavelin päivä ja 120 päivän suunnitelma</div></div>' +
      '<div class="pp-grid-2">' +
      '<div class="pp-card"><div style="font-weight:800;margin-bottom:8px">Today\'s schedule</div>' +
      scheduleRow('09:00–10:30', '👥 Ryhmätunti', 'Sali B2', 'Opettaja', 'Moduuli 2 — Tervehdykset ja arki', '<button class="btn btn-primary btn-join">Liity tunnille</button>') +
      scheduleRow('10:45–11:00', '☕ Tauko', '—', '—', '', '') +
      scheduleRow('11:00–12:00', '🎙️ Knuut-harjoitus', 'Verkko / Online', 'Knuut', 'Puheharjoittelu — tervehdykset, esittäytyminen', '<a class="btn btn-outline" href="knuut.html?module=M2">Avaa Knuut</a>') +
      scheduleRow('12:30–13:15', '🍽️ Lounas', '—', '—', '', '') +
      scheduleRow('13:30–15:00', '📝 Sanasto + kirjoitus', 'Verkko / Online', 'Ryhmä', 'Moduuli 2 sanasto + 3 lausetta kotitehtäväksi', '') +
      '</div>' +
      '<div class="pp-card"><div style="font-weight:800;margin-bottom:8px">120-day path</div>' +
      phaseCard('Phase 1 — Päivät 1-20 ✓ VALMIS', 'Aakkoset, äänteet, numerot 1-100, esittäytyminen', 'Progress: 14/20 päivää ████████░░', 'M1-kirjainharjoitus, mikrodialogit, 24 sanan perusta.') +
      phaseCard('Phase 2 — Päivät 21-50 → KÄYNNISSÄ', 'Arjen suomi: koti, kauppa, terveys, perhe', 'Progress: 0/30 päivää ░░░░░░░░░░ · Alkaa pian', 'M2-keskustelut, arjen asiointi, opettajan väliarvio.') +
      phaseCard('Phase 3 — Päivät 51-80 🔒', 'Työelämän suomi: työvuoro, ohjeet, kysymykset', '', 'Työsanasto, työpaikan dialogit, palautesykli.') +
      phaseCard('Phase 4 — Päivät 81-100 🔒', 'Työssäoppiminen: käytännön harjoittelu', '', 'Harjoittelujaksot ja päiväkirja.') +
      phaseCard('Phase 5 — Päivät 101-120 🔒', 'YKI-valmistelu ja loppuarviointi', '', 'YKI-harjoitukset ja jatkopolun lukitus.') +
      '</div></div>' +
      '<div class="pp-card" style="margin-top:12px"><strong>Upcoming milestones</strong><div>🎯 Päivä 20: Moduuli 1 valmis — kielitaitotesti</div><div>🎯 Päivä 30: Väliarviointi opettajan kanssa</div><div>🎯 Päivä 45: Työsanasto — harjoittelupaikkainfo</div></div>';
    sec.querySelectorAll('.btn-join').forEach(function (b) { b.addEventListener('click', function () { toast('Hienoa! Tunti avattu.'); }); });
    sec.querySelectorAll('.pp-phase').forEach(function (p) { p.addEventListener('click', function () { p.classList.toggle('open'); }); });
  }

  function scheduleRow(time, name, place, lang, desc, action) {
    return '<div class="pp-card" style="margin-bottom:8px"><div class="pp-row"><strong style="min-width:110px">' + esc(time) + '</strong><span>' + esc(name) + '</span><span class="pp-soft">' + esc(place) + '</span><span class="pp-chip blue">' + esc(lang) + '</span></div>' + (desc ? '<div class="pp-soft" style="margin-top:6px">' + esc(desc) + '</div>' : '') + (action ? '<div style="margin-top:8px">' + action + '</div>' : '') + '</div>';
  }
  function phaseCard(title, subtitle, prog, detail) {
    return '<div class="pp-phase"><div><strong>' + esc(title) + '</strong></div><div class="pp-soft">' + esc(subtitle) + '</div>' + (prog ? '<div class="pp-soft">' + esc(prog) + '</div>' : '') + '<div class="detail">' + esc(detail) + '</div></div>';
  }

  function renderModules() {
    const sec = document.getElementById('sec-modules');
    sec.innerHTML = '' +
      '<div class="page-header"><div class="page-title">Moduulit</div><div class="page-sub">Pavel — olet nyt Moduulissa 1 (Pre-A1). Seuraava: Moduuli 2.</div></div>' +
      '<div class="pp-card" style="margin-bottom:12px">Progress bar: M1 ██████░░░░ 60% valmis</div>' +
      '<div class="pp-grid-2">' +
      '<div class="pp-card" style="border-top:4px solid #14b8a6"><span class="pp-chip teal">Aktiivinen</span><h3 style="margin-top:8px">Moduuli 1 · Pre-A1</h3><p class="pp-soft">Latinalainen kirjaimisto, äänteet, numerot — aloitamme alusta.</p><div class="pp-soft">Progress: 60% ██████░░░░</div><div class="pp-row" style="margin-top:8px"><span class="pp-chip">📹 Video</span><span class="pp-chip">📝 Tehtävät</span><span class="pp-chip">🔤 Sanasto 24 sanaa</span><span class="pp-chip">🎙️ Puheharjoitus</span></div><div class="pp-soft" style="margin-top:8px">Harjoiteltu eilen · practiced yesterday</div><div class="pp-row" style="margin-top:10px"><a href="knuut.html?module=M1&topic=puheharjoitus" class="btn btn-primary" style="text-decoration:none">Jatka → Puheharjoitus</a><a href="knuut.html?module=M1&mode=voice" class="btn btn-outline" style="text-decoration:none">Ääniharjoitus Knuutin kanssa</a></div></div>' +
      '<div class="pp-card" style="border-top:4px solid #f59e0b"><span class="pp-chip amber">Seuraava</span><h3 style="margin-top:8px">Moduuli 2 · A1.1</h3><p class="pp-soft">Tervehdykset, arki, perhe — ensimmäiset oikeat keskustelut</p><div class="pp-soft">Avautuu päivänä 21 · Unlocks day 21</div><div class="pp-row" style="margin-top:8px"><span class="pp-chip gray">📹 Video</span><span class="pp-chip gray">📝 8 tehtävää</span><span class="pp-chip gray">🔤 32 sanaa</span><span class="pp-chip gray">🎙️ Dialogi</span></div><button class="btn btn-outline" style="margin-top:10px">🔒 Lukittu — päivä 21</button></div>' +
      '</div>' +
      '<div class="pp-grid-4" style="margin-top:12px">' +
      '<div class="pp-card"><span class="pp-chip gray">Aukeaa · pv 51</span><div><strong>M3 · A1.2</strong></div><div class="pp-soft">Työsanasto, avun pyytäminen</div></div>' +
      '<div class="pp-card"><span class="pp-chip gray">pv 81</span><div><strong>M4 · A2.1</strong></div><div class="pp-soft">Työssäoppiminen</div></div>' +
      '<div class="pp-card"><span class="pp-chip gray">pv 96</span><div><strong>M5 · A2.1+</strong></div><div class="pp-soft">IT-sanasto</div></div>' +
      '<div class="pp-card"><span class="pp-chip gray">pv 108</span><div><strong>M6-M8 · A2</strong></div><div class="pp-soft">YKI-valmius</div></div>' +
      '</div>' +
      '<div class="pp-card" style="margin-top:12px"><button class="btn btn-outline" id="btn-vocab-toggle">M1 sanasto — 14/24 opittu (avaa/sulje)</button><div id="m1-vocab-wrap" class="pp-word-grid" style="margin-top:10px"></div></div>';
    const words = [['yksi', 'one', 'один'], ['kaksi', 'two', 'два'], ['kolme', 'three', 'три'], ['neljä', 'four', 'четыре'], ['hei', 'hello', 'привет'], ['moi', 'hi', 'привет'], ['kiitos', 'thanks', 'спасибо'], ['ole hyvä', 'you\'re welcome', 'пожалуйста'], ['kyllä', 'yes', 'да'], ['ei', 'no', 'нет'], ['minä', 'I', 'я'], ['sinä', 'you', 'ты']];
    const wrap = document.getElementById('m1-vocab-wrap');
    wrap.innerHTML = words.map(function (w, i) { return '<div class="pp-word ' + (i < 7 ? 'learned' : '') + '"><div style="font-weight:800">' + esc(w[0]) + '</div><div class="pp-soft">' + esc(w[1]) + '</div><div class="pp-soft">' + esc(w[2]) + '</div></div>'; }).join('');
    let open = true;
    document.getElementById('btn-vocab-toggle').addEventListener('click', function () {
      open = !open;
      wrap.style.display = open ? 'grid' : 'none';
    });
  }

  function renderAlphabet() {
    const sec = document.getElementById('sec-alphabet');
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ'.split('');
    const hint = { Y: 'huomio', Ä: 'erityinen', Ö: 'erityinen', Å: 'erityinen', J: 'huomio' };
    sec.innerHTML = '' +
      '<div class="page-header"><div class="page-title">Suomen aakkoset — A–Ö</div><div class="page-sub">29 kirjainta · kuuntele ja harjoittele · FI + EN + RU</div></div>' +
      '<div class="pp-grid-2"><div class="pp-card"><div style="font-weight:800">Letter grid</div><div id="alpha-grid-prem" style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin-top:10px"></div><div style="margin-top:10px">Opit kirjaimet: <span id="alpha-learned-count">' + state.alphabetLearned.size + '</span> / 29 ████████░░░░░</div></div>' +
      '<div class="pp-card"><div style="font-weight:800">Kirjoitusharjoitus</div><div class="pp-row" style="margin-top:8px"><button class="btn btn-outline" id="btn-alpha-new">🔊 Uusi kirjain</button><button class="btn btn-outline" id="btn-alpha-replay">🔊 Kuuntele uudelleen</button></div><input id="alpha-answer" class="lesson-input" style="margin-top:8px;max-width:120px" /><button class="btn btn-primary" id="btn-alpha-check" style="margin-top:8px">Tarkista</button><div id="alpha-msg" class="pp-soft" style="margin-top:8px"></div><div id="alpha-streak" class="pp-soft">Peräkkäin oikein: ' + state.alphaStreak + ' 🔥</div></div></div>' +
      '<div class="pp-card" id="alpha-detail" style="margin-top:12px"><strong>Valitse kirjain</strong></div>' +
      '<div class="pp-grid-3" style="margin-top:12px">' +
      '<div class="pp-card"><strong>Y</strong><div class="pp-soft">Ei sama kuin englannin Y. Huulet pyöreiksi — kuin ü saksaksi.</div><div class="pp-row" style="margin-top:8px"><button class="btn btn-outline btn-snd" data-t="työ">🔊 työ</button><button class="btn btn-outline btn-snd" data-t="yö">🔊 yö</button><button class="btn btn-outline btn-snd" data-t="pysäkki">🔊 pysäkki</button></div></div>' +
      '<div class="pp-card"><strong>Ä</strong><div class="pp-soft">Avoimempi kuin A.</div><div class="pp-row" style="margin-top:8px"><button class="btn btn-outline btn-snd" data-t="ä">🔊 ä</button><button class="btn btn-outline btn-snd" data-t="tänään">🔊 tänään</button><button class="btn btn-outline btn-snd" data-t="päivä">🔊 päivä</button></div></div>' +
      '<div class="pp-card"><strong>Double letters</strong><div class="pp-soft">Pitkä äänne = kaksi kirjainta. tuli ≠ tulli</div><div class="pp-row" style="margin-top:8px"><button class="btn btn-outline btn-snd" data-t="tuli">🔊 tuli</button><button class="btn btn-outline btn-snd" data-t="tulli">🔊 tulli</button></div></div>' +
      '</div>';
    const g = document.getElementById('alpha-grid-prem');
    g.innerHTML = letters.map(function (l) {
      const cls = hint[l] === 'erityinen' ? 'teal' : (hint[l] === 'huomio' ? 'amber' : 'green');
      return '<button class="pp-card btn-alpha-letter" data-letter="' + l + '" style="padding:10px;border-color:' + (cls === 'teal' ? '#14b8a6' : cls === 'amber' ? '#f59e0b' : '#22c55e') + '">' + l + '<div class="pp-soft">' + l.toLowerCase() + ' · ' + (hint[l] || 'helppo') + '</div></button>';
    }).join('');
    g.querySelectorAll('.btn-alpha-letter').forEach(function (b) {
      b.addEventListener('click', function () {
        const l = b.getAttribute('data-letter');
        document.getElementById('alpha-detail').innerHTML = '<strong>' + l + ' / ' + l.toLowerCase() + '</strong><div class="pp-soft">EN: sounds like ... · RU: как ... · AR: مثل ...</div><div class="pp-row" style="margin-top:8px"><button class="btn btn-outline" id="btn-alpha-speak">🔊 Kuuntele</button><button class="btn btn-primary" id="btn-alpha-learn">✓ Opin tämän</button></div>';
        document.getElementById('btn-alpha-speak').addEventListener('click', function () { speak(l, 'fi-FI'); });
        document.getElementById('btn-alpha-learn').addEventListener('click', function () {
          state.alphabetLearned.add(l);
          document.getElementById('alpha-learned-count').textContent = String(state.alphabetLearned.size);
          toast('Hienoa! Kirjain merkitty opituksi.');
        });
      });
    });
    document.getElementById('btn-alpha-new').addEventListener('click', function () {
      const t = letters[Math.floor(Math.random() * letters.length)];
      state.alphaQuizTarget = t;
      speak(t, 'fi-FI');
      document.getElementById('alpha-msg').textContent = 'Kuuntele ja kirjoita kirjain.';
    });
    document.getElementById('btn-alpha-replay').addEventListener('click', function () {
      if (state.alphaQuizTarget) speak(state.alphaQuizTarget, 'fi-FI');
    });
    document.getElementById('btn-alpha-check').addEventListener('click', function () {
      const v = (document.getElementById('alpha-answer').value || '').trim().toUpperCase();
      if (!state.alphaQuizTarget) return (document.getElementById('alpha-msg').textContent = 'Paina ensin Uusi kirjain.');
      if (v === state.alphaQuizTarget) {
        state.alphaStreak += 1;
        document.getElementById('alpha-msg').textContent = '✓ Oikein! +5 XP';
        toast('Hienoa! Oikein! +5 XP');
      } else {
        state.alphaStreak = 0;
        document.getElementById('alpha-msg').textContent = 'Ei — tämä oli ' + state.alphaQuizTarget + '. Kuuntele uudelleen.';
      }
      document.getElementById('alpha-streak').textContent = 'Peräkkäin oikein: ' + state.alphaStreak + ' 🔥';
    });
    sec.querySelectorAll('.btn-snd').forEach(function (b) { b.addEventListener('click', function () { speak(b.getAttribute('data-t'), 'fi-FI'); }); });
  }

  function renderSelf() {
    const sec = document.getElementById('sec-self');
    const items = [
      ['🗣️', 'Uskallan puhua suomea tänään', 'I feel brave enough to speak Finnish today', 'Я чувствую себя достаточно смелым, чтобы говорить по-фински сегодня'],
      ['👂', 'Ymmärrän oppitunnin sisällön', 'I understand what we studied today', 'Я понимаю, что мы изучали сегодня'],
      ['💼', 'Osaan tämän viikon työsanastoa', "I know this week's work vocabulary", 'Я знаю рабочую лексику этой недели'],
      ['🙋', 'Uskallan pyytää apua suomeksi', 'I can ask for help in Finnish', 'Я могу попросить помощь по-фински'],
    ];
    sec.innerHTML = '<div class="page-header"><div class="page-title">Itsearviointi</div><div class="page-sub">Tuesday 31.3.2026 · Päivä 14</div></div><div class="pp-card" style="margin-bottom:12px"><strong>Päivän check-in · Daily self-check</strong><div class="pp-soft">Ei arvosanaa — tämä on sinulle ja opettajallesi. No grade — this is for you and your teacher. لا درجات — هذا لك ولمعلمك.</div></div><div id="self-items"></div><div class="pp-card" style="margin-top:10px"><strong>😊 Miltä tänään tuntuu?</strong><div class="pp-emoji" id="mood-row"></div></div><div class="pp-card" style="margin-top:10px"><strong>Rohkeus puhua — viime 7 pv</strong><div style="font-family:monospace;margin-top:6px">2, 2, 3, 3, 3, 4, 3</div></div><button class="btn btn-primary" id="btn-self-submit" style="margin-top:12px">Lähetä check-in · Submit</button>';
    const container = document.getElementById('self-items');
    container.innerHTML = items.map(function (it, i) {
      return '<div class="pp-card" style="margin-bottom:8px"><div><strong>' + it[0] + ' ' + esc(it[1]) + '</strong></div><div class="pp-soft">' + esc(it[2]) + '</div><div class="pp-soft">' + esc(it[3]) + '</div><div class="pp-stars" data-i="' + i + '">' + [1, 2, 3, 4, 5].map(function (n) { return '<button data-s="' + n + '" class="' + (n <= state.selfScores[i] ? 'on' : '') + '">★</button>'; }).join('') + '</div></div>';
    }).join('');
    container.querySelectorAll('.pp-stars').forEach(function (row) {
      row.querySelectorAll('button').forEach(function (b) {
        b.addEventListener('click', function () {
          const i = Number(row.getAttribute('data-i'));
          const s = Number(b.getAttribute('data-s'));
          state.selfScores[i] = s;
          row.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', Number(x.getAttribute('data-s')) <= s); });
        });
      });
    });
    const emojis = ['1', '2', '3', '4', '5'];
    const mr = document.getElementById('mood-row');
    mr.innerHTML = emojis.map(function (e) { return '<button class="' + (e === state.selfMood ? 'on' : '') + '" title="Mood ' + e + '">' + e + '</button>'; }).join('');
    mr.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { state.selfMood = b.textContent; mr.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); }); });
    document.getElementById('btn-self-submit').addEventListener('click', function () { toast('Hienoa! Opettajasi näkee vastauksesi. +10 XP'); });
  }

  function renderHomework() {
    const sec = document.getElementById('sec-homework');
    sec.innerHTML = '' +
      '<div class="page-header"><div class="page-title">Kotitehtävät</div><div class="page-sub">Pieni kerrallaan — olet hyvässä vauhdissa.</div></div>' +
      '<div class="pp-row" style="margin-bottom:10px"><span class="pp-chip teal">✅ Tehty: 1</span><span class="pp-chip amber">⏳ Odottaa: 1</span><span class="pp-chip gray">❌ Myöhässä: 0</span></div>' +
      '<div class="pp-card"><span class="pp-chip amber">⏳ ODOTTAA · Due Fri 2.4.2026</span><h3 style="margin-top:8px">Kirjoita 5 lausetta: päiväni työpaikalla</h3><div class="pp-soft">Write 5 sentences about your day at work</div><div class="pp-row" style="margin:8px 0"><span class="pp-chip">M2</span><span class="pp-chip">Kirjoittaminen</span></div><div class="pp-soft">Käytä sanoja: työvuoro, esimies, tauko, kollega.</div><textarea id="hw-text" class="writing-area" placeholder="Kirjoita tähän... / Write here... / Напишите здесь..."></textarea><div class="pp-soft"><span id="hw-count">0</span> / min. 100 merkkiä</div><button id="btn-hw-send" class="btn btn-primary" style="margin-top:8px">📤 Lähetä</button></div>' +
      '<div class="pp-card" style="margin-top:10px;background:#ecfdf5"><span class="pp-chip teal">✅ LÄHETETTY · 29.3.2026</span><h3 style="margin-top:8px">Kuuntele äänite ja vastaa (M1)</h3><div class="pp-row"><span class="pp-chip">M1</span><span class="pp-chip">Kuuntelu</span></div><div class="pp-soft">Vastauksesi: Minä olen Pavel. Minä asun Kuopiossa. Minulla on työ.</div><div>💬 Hyvä Pavel! Lauseet ovat selkeitä. Harjoittele vielä: minulla ON.</div><div>⭐⭐⭐⭐ (4/5)</div></div>' +
      '<div class="pp-card" style="margin-top:10px"><span class="pp-chip gray">🔒 Available from pv 21</span><h3 style="margin-top:8px">M2 — Esittäydy videolle (30 sek)</h3><div class="pp-soft">Record yourself introducing yourself in Finnish — 30 seconds</div><button class="btn btn-outline" style="margin-top:8px">🔒 Avautuu päivänä 21</button></div>' +
      '<div class="pp-card" style="margin-top:10px;background:#f0fdfa">Pavel — olet lähettänyt 3 kotitehtävää. Hienoa työtä! / Great work! / Отличная работа!</div>';
    const ta = document.getElementById('hw-text');
    const cnt = document.getElementById('hw-count');
    ta.addEventListener('input', function () { cnt.textContent = String(ta.value.length); });
    document.getElementById('btn-hw-send').addEventListener('click', function () { toast('Hienoa! Kotitehtävä lähetetty. +30 XP'); });
  }

  function renderVocab() {
    const sec = document.getElementById('sec-vocab');
    const themes = [
      ['tyovuoro', '💼 Työvuoro'], ['terveys', '🏥 Terveys'], ['koti', '🏠 Koti'], ['kauppa', '🛒 Kauppa'],
      ['liikenne', '🚌 Liikenne'], ['tervehdykset', '👋 Tervehdykset'], ['numerot', '🔢 Numerot'], ['aika', '📅 Aika'],
    ];
    const words = VOCAB.tyovuoro;
    sec.innerHTML = '<div class="page-header"><div class="page-title">Sanastot</div><div class="page-sub">Interaktiivinen sanastopankki</div></div><div class="pp-row" id="v-theme-row">' + themes.map(function (t) { return '<button class="topic-chip ' + (t[0] === state.vocabTheme ? 'active' : '') + '" data-theme="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div><div class="pp-card" style="margin:10px 0">Työvuoro-sanasto: 8 / 24 sanaa opittu ███░░░░░</div><div class="pp-row"><button class="btn ' + (state.vocabMode === 'table' ? 'btn-primary' : 'btn-outline') + '" id="btn-mode-table">📋 Taulukko</button><button class="btn ' + (state.vocabMode === 'flash' ? 'btn-primary' : 'btn-outline') + '" id="btn-mode-flash">🃏 Korttipeli</button></div><div id="vocab-body" style="margin-top:10px"></div>';
    function drawBody() {
      const body = document.getElementById('vocab-body');
      if (state.vocabMode === 'table') {
        body.innerHTML = '<div class="pp-card"><table class="vocab-table"><thead><tr><th>FI</th><th>EN</th><th>RU</th><th>AR</th><th>Status</th></tr></thead><tbody>' + words.map(function (w, i) { return '<tr class="' + (w[4] ? 'learned' : '') + '"><td>' + esc(w[0]) + '</td><td>' + esc(w[1]) + '</td><td>' + esc(w[2]) + '</td><td dir="rtl">' + esc(w[3]) + '</td><td><button class="btn btn-outline btn-v-tts" data-i="' + i + '">🔊</button> <button class="btn btn-outline btn-v-learn" data-i="' + i + '">' + (w[4] ? '✓ opittu' : '○ Opin') + '</button></td></tr>'; }).join('') + '</tbody></table></div>';
        body.querySelectorAll('.btn-v-tts').forEach(function (b) { b.addEventListener('click', function () { speak(words[Number(b.getAttribute('data-i'))][0], 'fi-FI'); }); });
        body.querySelectorAll('.btn-v-learn').forEach(function (b) { b.addEventListener('click', function () { words[Number(b.getAttribute('data-i'))][4] = true; drawBody(); toast('Hienoa! Sana merkitty opituksi.'); }); });
      } else {
        const w = words[state.flashIndex];
        body.innerHTML = '<div class="pp-card" style="text-align:center"><div style="font-size:40px;font-weight:800">' + esc(w[0]) + '</div><button class="btn btn-outline" id="btn-f-tts">🔊 Kuuntele</button><button class="btn btn-outline" id="btn-f-flip">Käännä · Flip</button><div id="f-back" class="pp-hidden" style="margin-top:10px"><div>' + esc(w[1]) + '</div><div>' + esc(w[2]) + '</div><div dir="rtl">' + esc(w[3]) + '</div></div><div class="pp-row" style="justify-content:center;margin-top:10px"><button class="btn btn-primary" id="btn-f-know">✓ Osaan</button><button class="btn btn-outline" id="btn-f-again">↩ Kertaa uudelleen</button></div><div class="pp-soft">Kortti ' + (state.flashIndex + 1) + ' / 24</div></div>';
        document.getElementById('btn-f-tts').addEventListener('click', function () { speak(w[0], 'fi-FI'); });
        document.getElementById('btn-f-flip').addEventListener('click', function () { document.getElementById('f-back').classList.toggle('pp-hidden'); });
        document.getElementById('btn-f-know').addEventListener('click', function () { w[4] = true; state.flashIndex = (state.flashIndex + 1) % words.length; drawBody(); toast('Loistavaa! Seuraava kortti.'); });
        document.getElementById('btn-f-again').addEventListener('click', function () { state.flashIndex = (state.flashIndex + 1) % words.length; drawBody(); });
      }
    }
    drawBody();
    document.getElementById('btn-mode-table').addEventListener('click', function () { state.vocabMode = 'table'; renderVocab(); });
    document.getElementById('btn-mode-flash').addEventListener('click', function () { state.vocabMode = 'flash'; renderVocab(); });
  }

  function renderGrammar() {
    const sec = document.getElementById('sec-grammar');
    sec.innerHTML = '' +
      '<div class="page-header"><div class="page-title">Kielioppi</div><div class="page-sub">Mini-lessons with practice</div></div>' +
      '<div class="gram-card"><strong>Kysymyssanat (Question words)</strong><table class="vocab-table"><tbody><tr><td>Mitä?</td><td>What?</td><td>Что?</td><td dir="rtl">ماذا؟</td></tr><tr><td>Missä?</td><td>Where?</td><td>Где?</td><td dir="rtl">أين؟</td></tr><tr><td>Milloin?</td><td>When?</td><td>Когда?</td><td dir="rtl">متى؟</td></tr><tr><td>Kuka?</td><td>Who?</td><td>Кто?</td><td dir="rtl">من؟</td></tr><tr><td>Miten?</td><td>How?</td><td>Как?</td><td dir="rtl">كيف؟</td></tr><tr><td>Miksi?</td><td>Why?</td><td>Почему?</td><td dir="rtl">لماذا؟</td></tr></tbody></table><div class="pp-qa">_____ on vessa? <input id="g-q1" class="lesson-input" style="max-width:120px"> <button class="btn btn-outline" id="g-q1-btn">Tarkista</button> <span id="g-q1-msg"></span></div></div>' +
      '<div class="gram-card"><strong>Minulla on / Minulla ei ole</strong><div class="pp-soft">Finnish has no verb to have. В финском нет глагола иметь.</div><div class="pp-qa">Minulla ___ auto. <button class="btn btn-outline g-on" data-a="on">on</button> <button class="btn btn-outline g-on" data-a="ei ole">ei ole</button> <span id="g-q2-msg"></span></div></div>' +
      '<div class="gram-card"><strong>Verbin taivutus: olla</strong><table class="vocab-table"><tbody><tr><td>Minä olen</td><td>I am</td><td>Я есть</td></tr><tr><td>Sinä olet</td><td>You are</td><td>Ты есть</td></tr><tr><td>Hän on</td><td>He/she is</td><td>Он/она есть</td></tr><tr><td>Me olemme</td><td>We are</td><td>Мы есть</td></tr><tr><td>Te olette</td><td>You are</td><td>Вы есть</td></tr><tr><td>He ovat</td><td>They are</td><td>Они есть</td></tr></tbody></table></div>' +
      '<div class="pp-card"><strong>Päivän haaste · Daily challenge</strong><div>Muodosta lause: minä + olla + Kuopiossa</div><input id="g-ch" class="lesson-input" style="margin-top:8px"><button class="btn btn-primary" id="g-ch-btn" style="margin-top:8px">Tarkista</button><div id="g-ch-msg" class="pp-soft"></div></div>';
    document.getElementById('g-q1-btn').addEventListener('click', function () { document.getElementById('g-q1-msg').textContent = (/missä/i.test(document.getElementById('g-q1').value) ? '✓ Oikein' : 'Vastaus: Missä'); });
    sec.querySelectorAll('.g-on').forEach(function (b) { b.addEventListener('click', function () { document.getElementById('g-q2-msg').textContent = b.getAttribute('data-a') === 'ei ole' ? '✓ Oikein' : 'Kokeile uudelleen'; }); });
    document.getElementById('g-ch-btn').addEventListener('click', function () {
      const ok = /minä olen kuopiossa/i.test(document.getElementById('g-ch').value.trim());
      document.getElementById('g-ch-msg').textContent = ok ? '✓ Minä olen Kuopiossa. +15 XP 🎉' : 'Malli: Minä olen Kuopiossa.';
      if (ok) toast('Hienoa! Päivän haaste onnistui. +15 XP');
    });
  }

  function renderLesson() {
    const sec = document.getElementById('sec-lesson');
    const topics = ['👋 Tervehdykset ja esittäytyminen', '🛒 Kaupassa asiointi', '🏥 Lääkärissä', '🔢 Numerot ja hinnat', '👨‍👩‍👧 Perhe ja koti', '💼 Työ ja työvuoro'];
    sec.innerHTML = '<div class="page-header"><div class="page-title">Päivän tunti</div><div class="page-sub">Knuut harjoittelee kanssasi tätä aihetta.</div></div><div class="pp-grid-3" id="lesson-topics">' + topics.map(function (t, i) { return '<button class="pp-topic ' + (i === 0 ? 'active' : '') + '">' + esc(t) + '</button>'; }).join('') + '</div><div class="pp-card" style="margin-top:12px"><div class="msg-ai">Hei Pavel! Harjoitellaan tänään tervehdyksiä. Hi Pavel! Let\'s practice greetings today. Привет, Павел! Давайте практиковать приветствия. Miten sanot good morning?</div><div class="msg-user">Hyvää huomenta!</div><div class="msg-ai">Mahtavaa! Oikein! 🎉 Nyt: kuinka sinä voit?</div><div class="clearfix"></div><a class="btn btn-primary" href="knuut.html?topic=greetings" style="text-decoration:none">▶ Jatka tuntia · Continue lesson</a></div><div class="pp-card" style="margin-top:10px"><button class="btn btn-outline" id="btn-panic">🆘 En ymmärrä · I don\'t understand</button><div id="panic-wrap" class="pp-hidden" style="margin-top:8px"><div>Ei hätää! Knuut selittää sinulle venäjäksi.</div><a class="btn btn-primary" href="knuut.html?help_language=ru&topic=greetings" style="text-decoration:none;margin-top:8px">Avaa selitys venäjäksi</a></div></div>';
    document.getElementById('btn-panic').addEventListener('click', function () { document.getElementById('panic-wrap').classList.toggle('pp-hidden'); });
    sec.querySelectorAll('#lesson-topics .pp-topic').forEach(function (b) { b.addEventListener('click', function () { sec.querySelectorAll('#lesson-topics .pp-topic').forEach(function (x) { x.classList.remove('active'); }); b.classList.add('active'); toast('Aihe päivitetty: ' + b.textContent); }); });
  }

  function renderYki() {
    const sec = document.getElementById('sec-yki');
    sec.innerHTML = '<div class="page-header"><div class="page-title">YKI</div><div class="page-sub">Pavel — YKI-valmius tällä hetkellä</div></div><div class="pp-grid-2"><div class="pp-card">Lukeminen: ████████░░ 75% — Lähes valmis<br>Kirjoittaminen: ██████░░░░ 58% — Harjoittele lisää<br>Kuuntelu: ███████░░░ 65% — Edistyy hyvin<br>Puhuminen: ████░░░░░░ 42% — Tarvitsee harjoittelua<br><br><strong>Kokonaisvalmius: 60% · Arv. testivalmius: kesäkuu 2026</strong></div><div class="pp-card"><div class="pp-row"><button class="btn yki-tab-btn btn-primary" data-tab="read">Lukeminen</button><button class="btn yki-tab-btn btn-outline" data-tab="listen">Kuuntelu</button><button class="btn yki-tab-btn btn-outline" data-tab="write">Kirjoittaminen</button><button class="btn yki-tab-btn btn-outline" data-tab="speak">Puhuminen</button></div><div id="yki-tab-body" style="margin-top:10px"></div></div></div>';
    function drawTab() {
      const b = document.getElementById('yki-tab-body');
      if (state.ykiTab === 'read') {
        b.innerHTML = '<div class="inline-note">"Matti asuu Kuopiossa... Hänellä on kaksi lasta."</div><div class="pp-qa">Q1: Missä Matti asuu?<br><button class="btn btn-outline yki-r" data-q="1" data-ok="0">Helsingissä</button> <button class="btn btn-outline yki-r" data-q="1" data-ok="1">Kuopiossa</button> <button class="btn btn-outline yki-r" data-q="1" data-ok="0">Tampereella</button><div id="yki-r1" class="pp-soft"></div></div><div class="pp-qa">Q2: Milloin Matti aloittaa työn?<br><button class="btn btn-outline yki-r" data-q="2" data-ok="0">Kello 8</button> <button class="btn btn-outline yki-r" data-q="2" data-ok="1">Kello 9</button> <button class="btn btn-outline yki-r" data-q="2" data-ok="0">Kello 10</button><div id="yki-r2" class="pp-soft"></div></div><div class="pp-qa">Q3: Mitä Matti juo ennen töitä?<br><button class="btn btn-outline yki-r" data-q="3" data-ok="0">Teetä</button> <button class="btn btn-outline yki-r" data-q="3" data-ok="0">Mehua</button> <button class="btn btn-outline yki-r" data-q="3" data-ok="1">Kahvia</button><div id="yki-r3" class="pp-soft"></div></div><div id="yki-r-score" class="pp-soft"></div>';
        b.querySelectorAll('.yki-r').forEach(function (btn) {
          btn.addEventListener('click', function () {
            const q = btn.getAttribute('data-q');
            const ok = btn.getAttribute('data-ok') === '1';
            state.ykiRead[q] = ok;
            document.getElementById('yki-r' + q).textContent = ok ? '✓ Oikein! +10 XP' : 'Ei aivan, kokeile uudelleen.';
            const done = [1, 2, 3].every(function (n) { return typeof state.ykiRead[String(n)] === 'boolean'; });
            if (done) {
              const score = Object.values(state.ykiRead).filter(Boolean).length;
              document.getElementById('yki-r-score').textContent = score + '/3 ' + (score === 3 ? '✓ Erinomainen!' : 'Jatka harjoittelua.');
            }
          });
        });
      } else if (state.ykiTab === 'listen') {
        b.innerHTML = '<div>🔊 Kuuntele ja vastaa</div><button class="btn btn-primary" id="btn-yki-play">▶ Play</button><div id="yki-transcript" class="pp-soft" style="margin-top:8px"></div><div class="pp-qa">Milloin kauppa on auki?<br><button class="btn btn-outline yki-l" data-ok="1">Klo 10–14</button> <button class="btn btn-outline yki-l" data-ok="0">Klo 9–15</button> <button class="btn btn-outline yki-l" data-ok="0">Klo 11–13</button><div id="yki-l-msg" class="pp-soft"></div></div>';
        document.getElementById('btn-yki-play').addEventListener('click', function () {
          speak('Huomenna on lauantai. Kauppa on auki kello kymmenestä kahteen.', 'fi-FI');
          setTimeout(function () { document.getElementById('yki-transcript').textContent = 'Huomenna on lauantai. Kauppa on auki kello kymmenestä kahteen.'; }, 3000);
        });
        b.querySelectorAll('.yki-l').forEach(function (x) { x.addEventListener('click', function () { document.getElementById('yki-l-msg').textContent = x.getAttribute('data-ok') === '1' ? '✓ Oikein!' : 'Ei vielä, kuuntele uudelleen.'; }); });
      } else if (state.ykiTab === 'write') {
        b.innerHTML = '<div class="pp-card"><div><strong>Kirjoita sairauslomateksti</strong> (40-60 sanaa)</div><textarea class="writing-area" id="yki-w-t">Hei Matti,\nMinulla on kuume tänään. En voi tulla töihin huomenna. Anteeksi. Minä palaan töihin perjantaina jos voin.\nTerveisin, Pavel</textarea><div class="pp-soft">Word count: 28 / 40-60 sanaa</div><button class="btn btn-primary" id="btn-yki-feedback">🤖 Pyydä Knuutin palaute</button><div id="yki-w-msg" class="pp-soft"></div></div>';
        document.getElementById('btn-yki-feedback').addEventListener('click', function () {
          const msg = document.getElementById('yki-w-msg');
          msg.textContent = 'Arvioidaan...';
          setTimeout(function () {
            msg.innerHTML = 'Hyvä aloitus Pavel! Muutama vinkki:<br>✓ Rakenne on oikein<br>→ Lisää: "Lääkäri sanoi..."<br>→ Tarkista: "jos voin" → "jos vointini sallii"<br>Arvio: B1-tasoa kohti 🎯';
            toast('Hienoa! Palaute valmis.');
          }, 1500);
        });
      } else {
        b.innerHTML = '<div class="pp-card"><strong>Kerro itsestäsi 30 sekuntia.</strong><div style="font-size:28px;font-weight:800;margin:8px 0">00:30</div><a class="btn btn-primary" href="knuut.html?mode=yki_speaking" style="text-decoration:none">🎙️ Aloita puhuminen</a><div class="pp-soft" style="margin-top:8px">Harjoittele ensin Knuutin kanssa ennen oikeaa testiä.</div><a class="btn btn-outline" href="knuut.html?mode=yki_speaking&prep=1" style="margin-top:8px;text-decoration:none">🎙️ Harjoittele Knuutin kanssa</a></div>';
      }
    }
    drawTab();
    sec.querySelectorAll('.yki-tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.ykiTab = btn.getAttribute('data-tab');
        sec.querySelectorAll('.yki-tab-btn').forEach(function (b) { b.className = 'btn yki-tab-btn btn-outline'; });
        btn.className = 'btn yki-tab-btn btn-primary';
        drawTab();
      });
    });
  }

  function renderPassports() {
    const sec = document.getElementById('sec-passports');
    sec.innerHTML = '<div class="page-header"><div class="page-title">Passit & valmennus</div><div class="page-sub">Pavel — passien tilanne</div></div><div class="pp-grid-2"><div class="pp-card"><strong>🧼 Hygieniapassi</strong><div>' + state.passStatus.hygien + '</div><div class="pp-soft">Ravintola, kahvila, kauppa-ala</div><button class="btn btn-outline pass-up" data-k="hygien">Aloita valmistautuminen</button></div><div class="pp-card"><strong>🩹 EA1-tietoisuus</strong><div>' + state.passStatus.ea1 + '</div><div class="pp-soft">Päättyy 15.4.2026 — 60% valmis</div><div class="pp-soft">██████░░░░</div></div><div class="pp-card"><strong>🦺 Työturvallisuuskortti</strong><div>' + state.passStatus.safety + '</div><div class="pp-soft">Suositellaan kaikille</div><button class="btn btn-outline pass-up" data-k="safety">Aloita valmistautuminen</button></div><div class="pp-card"><strong>🔥 Tulipaloturvallisuus</strong><div>' + state.passStatus.fire + '</div><div class="pp-soft">Jos työssäoppimispaikka vaatii</div><button class="btn btn-outline pass-up" data-k="fire">Aloita valmistautuminen</button></div></div><div class="pp-card" style="margin-top:12px"><strong>Harjoittele työpaikan suomea ennen harjoittelua</strong><div class="pp-grid-3" style="margin-top:10px">' + [
      ['🍳 Keittiö ja ravintola', '22 keskeistä sanaa', 'kitchen'],
      ['📦 Varasto ja logistiikka', '18 keskeistä sanaa', 'warehouse'],
      ['🛒 Myymälä ja asiakaspalvelu', '25 keskeistä sanaa', 'retail'],
      ['🧹 Siivous ja hoiva', '20 keskeistä sanaa', 'care'],
      ['🖥️ Toimisto ja IT', '30 keskeistä sanaa', 'office'],
      ['🏗️ Rakennus ja kiinteistö', '16 keskeistä sanaa', 'construction'],
    ].map(function (c) { return '<div class="pp-card"><div><strong>' + esc(c[0]) + '</strong></div><div class="pp-soft">' + esc(c[1]) + '</div><a href="knuut.html?workplace_prep=' + c[2] + '" class="btn btn-outline" style="margin-top:8px;text-decoration:none">🎙️ Harjoittele Knuutin kanssa</a></div>'; }).join('') + '</div></div><div class="pp-card" style="margin-top:12px"><strong>Hygieniapassi prep question</strong><div class="pp-qa">Milloin pitää pestä kädet?<br><button class="btn btn-outline hq" data-ok="1">Ennen ruoan käsittelyä</button> <button class="btn btn-outline hq" data-ok="0">Vain lounaan jälkeen</button> <button class="btn btn-outline hq" data-ok="0">Kerran päivässä</button><div id="hq-msg" class="pp-soft"></div></div></div>';
    sec.querySelectorAll('.hq').forEach(function (b) { b.addEventListener('click', function () { document.getElementById('hq-msg').textContent = b.getAttribute('data-ok') === '1' ? '✓ Oikein! Ennen ja jälkeen ruoan käsittelyn.' : 'Kokeile uudelleen.'; }); });
    sec.querySelectorAll('.pass-up').forEach(function (b) { b.addEventListener('click', function () { toast('Hienoa! Valmennus avattu.'); }); });
  }

  function renderDiary() {
    const sec = document.getElementById('sec-diary');
    sec.innerHTML = '<div class="page-header"><div class="page-title">Työpäiväkirja</div><div class="page-sub">Pohjois-Savo IT · 24.3–11.4.2026 · Päivä 6 / 15</div></div><div class="pp-card" style="margin-bottom:10px">👩‍🏫 Opettajan kysymys tänään: Kerro yksi uusi suomen sana jonka opit tänään. Miten käytit sitä?</div><div class="pp-card"><div><strong>Date</strong>: 31.3.2026</div><div style="margin-top:8px"><strong>Mitä tein tänään?</strong><textarea class="writing-area" id="diary-do">Osallistuin tiimipalaveriin. Kirjoitin muistiinpanoja suomeksi. Opin uuden ohjelman.</textarea></div><div style="margin-top:8px"><strong>Kenen kanssa puhuin suomea?</strong><div><label><input type="radio" name="diary-sp" checked> Esimiehen kanssa</label> <label><input type="radio" name="diary-sp"> Kollegoiden kanssa</label> <label><input type="radio" name="diary-sp"> Asiakkaiden kanssa</label> <label><input type="radio" name="diary-sp"> Kaikkien kanssa</label></div></div><div style="margin-top:8px"><strong>Vaikeat sanat</strong><div id="tag-row"></div><input id="tag-input" class="lesson-input" placeholder="Lisää sana + Enter"></div><div style="margin-top:8px"><strong>Tunnelma tänään</strong><div id="diary-mood" class="pp-emoji"><button>😔</button><button>😐</button><button class="on">🙂</button><button>😊</button><button>😄</button></div></div><button class="btn btn-primary" id="btn-diary-save" style="margin-top:8px">📤 Tallenna merkintä</button></div><div class="pp-card" style="margin-top:10px"><strong>Past entries</strong>' +
      '<div class="pp-card" style="margin-top:8px">📅 28.3.2026 😊<div class="pp-soft">Ensimmäinen päivä... Opin: kahvihuone, avaimet, kulkulupa.</div><div class="pp-soft">[kahvihuone] [kulkulupa]</div></div>' +
      '<div class="pp-card" style="margin-top:8px">📅 29.3.2026 🙂<div class="pp-soft">Palaveri klo 10. En ymmärtänyt kaikkea mutta kirjoitin muistiinpanoja.</div></div>' +
      '<div class="pp-card" style="margin-top:8px">📅 30.3.2026 😊<div class="pp-soft">Autoin uuden kollegan kanssa. Puhuimme paljon suomea.</div></div></div>';
    function drawTags() {
      const row = document.getElementById('tag-row');
      row.innerHTML = state.diaryTags.map(function (t, i) { return '<span class="pp-chip blue" style="margin-right:6px">' + esc(t) + ' <button class="btn-tag-x" data-i="' + i + '">x</button> <button class="btn-tag-s" data-i="' + i + '">🔊</button></span>'; }).join('');
      row.querySelectorAll('.btn-tag-x').forEach(function (b) { b.addEventListener('click', function () { state.diaryTags.splice(Number(b.getAttribute('data-i')), 1); drawTags(); }); });
      row.querySelectorAll('.btn-tag-s').forEach(function (b) { b.addEventListener('click', function () { speak(state.diaryTags[Number(b.getAttribute('data-i'))], 'fi-FI'); }); });
    }
    drawTags();
    document.getElementById('tag-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        const v = e.target.value.trim();
        if (!v) return;
        state.diaryTags.push(v);
        e.target.value = '';
        drawTags();
      }
    });
    document.getElementById('btn-diary-save').addEventListener('click', function () { toast('Hienoa! Päiväkirjamerkintä tallennettu.'); });
  }

  function renderHops() {
    const sec = document.getElementById('sec-hops');
    sec.innerHTML = '<div class="page-header"><div class="page-title">Opiskelupolku / HOPS</div><div class="page-sub">Päivitetty: 15.3.2026 · Opettaja: Anna Korhonen</div></div><div class="pp-card" style="background:#f0fdfa;border-color:#14b8a6"><strong>📍 Olet nyt: Päivä 14 / 120</strong><div>Taso: Pre-A1 → A1.1 siirtymävaihe</div><div>Seuraava tavoite: Moduuli 2 aloitus (pv 21)</div><div>Arvioitu valmistuminen: Syyskuu 2026</div></div><div style="margin-top:10px">' +
      phaseCard('Phase 1 — VALMIS ✓ (days 1-20)', 'Aakkoset, äänteet, numerot 1-100 · Opittua: 24 sanaa, 29 kirjainta ✓', 'Saavutettu: A1.1 lähestyy', 'Teacher note: Pavel edistyy hyvin. Rohkeus puhua kasvaa päivä päivältä. 🌱') +
      phaseCard('Phase 2 — KÄYNNISSÄ → (days 21-50)', 'Arjen suomi: tervehdykset, koti, kauppa, perhe', 'Tavoite: A1.1 · Aloitus: päivä 21', 'Pavel: "Pystyä ostamaan ruokaa kaupasta suomeksi"') +
      phaseCard('Phase 3 — Aukeaa myöhemmin (days 51-80)', 'Työelämän suomi: työvuoro, ohjeet, kysymykset', '', 'Pavel: Haluan oppia IT-sanastoa · Opettaja: lisätty M5:een ✓') +
      phaseCard('Phase 4 — TYÖSSÄOPPIMINEN (days 81-100)', 'Pohjois-Savo IT — ohjelmointi ja IT-tuki', '', 'Ohjaaja: Sari Korhonen · Tavoite: 8 op työssäoppiminen suomen kielessä') +
      phaseCard('Phase 5 — YKI & JATKO (days 101-120)', 'YKI-testi (keskitaso) · Jatkosuunnitelma', '', 'Tavoite jälkeen: AMK-haku tai IT-alan työ') +
      '</div><div class="pp-card" style="margin-top:10px;background:#fffbeb"><strong>💭 Pavel kirjoitti:</strong> "Haluan oppia suomea niin hyvin että pääsen opiskelemaan tietojenkäsittelyä Savoniaan. Tai ehkä löydän ensin työn IT-alalta." <span class="pp-soft">Written 14.3.2026</span></div><div class="pp-card" style="margin-top:10px"><strong>Anna Korhonen · 15.3.2026</strong><div class="pp-soft">Pavel on motivoitunut ja säännöllinen. Suosittelen lisää puheharjoittelua Knuutin kanssa illalla. IT-sanasto lisätty Moduuli 5:een Pavelin toiveen mukaan.</div></div>';
    sec.querySelectorAll('.pp-phase').forEach(function (p) { p.addEventListener('click', function () { p.classList.toggle('open'); }); });
  }

  function renderJatko() {
    const sec = document.getElementById('sec-jatko');
    sec.innerHTML = '<div class="page-header"><div class="page-title">Jatkosuunnitelma</div><div class="page-sub">Laadittu yhdessä: Pavel + opettaja</div></div><div class="pp-card" style="border-left:4px solid #14b8a6"><strong>📚 Suositeltava polku Pavel Sorokinille: Ammatillinen jatkokoulutus → ICT-ala</strong></div><div class="pp-card" style="margin-top:10px"><div><strong>Step 1 (now → May 2026)</strong> Vahvista A2 — YKI-testi huhtikuussa <span class="pp-chip amber">◐ Käynnissä</span></div><div style="margin-top:8px"><strong>Step 2 (May → August 2026)</strong> Hae Savonia AMK — tietojenkäsittely <span class="pp-chip gray">○ Seuraava vaihe</span> <a class="pp-btn-link" href="#">📋 Hakuohjeet</a></div><div style="margin-top:8px"><strong>Step 3 (September 2026)</strong> Aloita opinnot tai etsi IT-alan työtä Kuopiosta <span class="pp-chip gray">○ Seuraava vaihe</span></div></div><div class="pp-card" style="margin-top:10px"><strong>Pavel\'s own words</strong><div class="pp-soft">"Minä haluan hakea tietojenkäsittelyn koulutusohjelmaan... Englantini on hyvä joten voisin hakea englanninkieliseen ohjelmaan." — Pavel, 28.3.2026</div></div><div class="pp-grid-3" style="margin-top:10px"><div class="pp-card"><strong>Savonia AMK — tietojenkäsittely 2026</strong><br><a class="btn btn-outline" href="#">Avaa hakuopas</a></div><div class="pp-card"><strong>TE-palvelut — IT-alan työnhaku</strong><br><a class="btn btn-outline" href="#">Avaa</a></div><div class="pp-card"><strong>LinkedIn suomeksi — IT-ammattilaisille</strong><br><a class="btn btn-outline" href="#">Avaa</a></div></div><div class="pp-card" style="margin-top:10px"><strong>Lisää oma kommentti</strong><textarea id="jatko-comment" class="writing-area" placeholder="Kirjoita ajatuksesi jatkosuunnitelmasta..."></textarea><button class="btn btn-primary" id="btn-jatko-send2" style="margin-top:8px">📨 Lähetä opettajalle</button></div>';
    document.getElementById('btn-jatko-send2').addEventListener('click', function () { toast('✓ Kommentti lähetetty! Opettajasi näkee sen.'); });
  }

  function renderNotifications() {
    const sec = document.getElementById('sec-notifications');
    sec.innerHTML = '<div class="page-header"><div class="page-title">Ilmoitukset</div><div class="page-sub">Ajantasaiset viestit ja saavutukset</div></div><div id="notif-cards"></div><div class="pp-card" style="margin-top:10px"><strong>🏆 Saavutukset · Achievements</strong><div class="pp-row" style="margin-top:8px"><span class="pp-chip teal">🔥 3-päivän putki</span><span class="pp-chip teal">📝 1. kotitehtävä lähetetty</span><span class="pp-chip teal">🎙️ Rohkea puhuja</span></div></div>';
    const cards = document.getElementById('notif-cards');
    cards.innerHTML = state.notifications.map(function (n) {
      return '<div class="pp-notif ' + (n.unread ? 'unread' : '') + '" data-id="' + n.id + '"><div class="pp-row"><strong>' + esc(n.type) + '</strong>' + (n.unread ? '<span style="width:8px;height:8px;background:#2563eb;border-radius:50%"></span>' : '<span class="pp-chip gray">Luettu</span>') + '</div><div style="margin-top:6px">' + esc(n.text) + '</div><div class="pp-soft">' + esc(n.en) + '</div>' + (n.sender ? '<div class="pp-soft">Sender: ' + esc(n.sender) + '</div>' : '') + (n.unread ? '<button class="btn btn-outline btn-mark" style="margin-top:8px">✓ Merkitse luetuksi</button>' : '<button class="btn btn-outline btn-mark" style="margin-top:8px">🎙️ Jatka harjoittelua</button>') + '</div>';
    }).join('');
    cards.querySelectorAll('.btn-mark').forEach(function (b) {
      b.addEventListener('click', function () {
        const card = b.closest('.pp-notif');
        const id = Number(card.getAttribute('data-id'));
        const n = state.notifications.find(function (x) { return x.id === id; });
        if (n && n.unread) {
          n.unread = false;
          updateHeaderBits();
          renderNotifications();
          toast('Merkittiin luetuksi. Hienoa!');
        } else {
          location.href = 'knuut.html?topic=speaking';
        }
      });
    });
  }

  function attachGlobalNav() {
    document.querySelectorAll('.nav-item[data-sec]').forEach(function (el) {
      el.addEventListener('click', function () { showSection(el.getAttribute('data-sec')); });
    });
    const notifBtn = document.getElementById('btn-notif');
    if (notifBtn) notifBtn.addEventListener('click', function () { showSection('notifications'); });
    const logout = document.getElementById('opp-logout');
    if (logout) logout.addEventListener('click', function () {
      ['knuut_token', 'knuut_user', 'sb_token', 'sb_user'].forEach(function (k) { localStorage.removeItem(k); });
      toast('Kirjauduttu ulos.');
      setTimeout(function () { location.href = '/login.html'; }, 500);
    });
  }

  function renderAll() {
    updateHeaderBits();
    renderDashboard();
    renderSchedule();
    renderModules();
    renderAlphabet();
    renderSelf();
    renderHomework();
    renderVocab();
    renderGrammar();
    renderLesson();
    renderYki();
    renderPassports();
    renderDiary();
    renderHops();
    renderJatko();
    renderNotifications();
    iconify(document.body);
    stripRemainingEmoji(document.body);
  }

  attachGlobalNav();
  renderAll();
  showSection('dashboard');
})();

