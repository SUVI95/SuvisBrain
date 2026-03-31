/**
 * ALKUPOLKU teacher sub-pages — rich demo UI (client-only, coherent mock data).
 * Expects window.__alkuTeacher = { esc, roster, teacherName, showToast }
 */
(function () {
  const LEVEL_OPTS = ['pre-A1', 'A1', 'A1.1', 'A1.2', 'A1.3', 'A2', 'A2.1', 'A2.2', 'B1', 'B1.1', 'B1.2', 'B2'];

  const HOPS = {
    'Pavel Sorokin': {
      tavoite: 'Siirtyä B2-tasolle ja hakea ICT-alan töihin Kuopiossa',
      vahvuudet: 'Kirjallinen ilmaisu, tekninen sanasto',
      kehitys: 'Puhuminen paineessa, slangisanat',
      tyo: 'Pohjois-Savo IT (valmis)',
      jatko: 'Ammatillinen jatkokoulutus tai suora työllistyminen',
      seuraava: 'YKI-testi huhtikuussa 2026',
      paivitetty: '2026-03-15',
      opettaja: true,
      day: 67,
    },
    'Amira Hassan': {
      tavoite: 'Saavuttaa A2 ja löytää harjoittelupaikka hoiva-alalta',
      vahvuudet: 'Motivaatio, läsnäolo, kuunteleminen',
      kehitys: 'Latinalainen kirjaimisto, puhuminen',
      tyo: 'ei vielä sovittu',
      jatko: 'Lähihoitajaopinnot tai kotityöpalvelut',
      seuraava: 'Moduuli 2 — tervehdykset ja arki',
      paivitetty: '2026-03-20',
      day: 38,
    },
    'Li Wei': {
      tavoite: 'A2-taso vahvaksi, työssäoppiminen IT-alalla',
      vahvuudet: 'Analyyttinen ajattelu, kirjallinen harjoittelu',
      kehitys: 'Suullinen rohkeus, arkikeskustelu',
      tyo: 'Pohjois-Savo IT (käynnissä)',
      jatko: 'Ohjelmistokehitys tai data-analyysi',
      seuraava: 'Moduuli 4 → 5 siirtymä, puheharjoittelu Knuutilla',
      paivitetty: '2026-03-22',
      day: 88,
    },
    'Hodan Farah': {
      tavoite: 'A2 vahvistus ja työssäoppiminen ravintola-alalla',
      vahvuudet: 'Sosiaalinen, oppii nopeasti suullisesti',
      kehitys: 'Kirjoittaminen, lomakkeet',
      tyo: 'Niiralan Kulma ry (palaveri sovittu)',
      jatko: 'Ravintola- tai catering-ala',
      seuraava: 'Työpaikkavierailun valmistelu',
      paivitetty: '2026-03-18',
      day: 72,
    },
    'Fatuma Warsame': {
      tavoite: 'A1 lujittaminen, säännöllinen harjoittelu',
      vahvuudet: 'Ymmärtäminen kehittyy hyvin',
      kehitys: 'Säännöllisyys, itseluottamus puhuessa',
      huomio: 'Poissa 8 päivää — yhteydenotto tehty 2026-03-25',
      seuraava: 'Helppo paluu — 5 min päivittäinen Knuut-harjoitus',
      paivitetty: '2026-03-25',
      day: 34,
    },
    'Leila Ahmadi': {
      tavoite: 'Vahvistaa A1.2 ja siirtyä työsanastoon',
      vahvuudet: 'Muisti, toistoharjoittelu',
      kehitys: 'Ääntäminen, pitkät lauseet',
      tyo: 'ei vielä sovittu',
      jatko: 'Palvelu- tai siivousala',
      seuraava: 'Moduuli 2 loppuun — perhe ja päivittäiset rutiinit',
      paivitetty: '2026-03-19',
      day: 45,
    },
    'Dmytro Kovalenko': {
      tavoite: 'A2.1 vahvaksi ja työssäoppiminen kiinteistöpalveluissa',
      vahvuudet: 'Ohjeiden ymmärtäminen, vuorovaikutus',
      kehitys: 'Viralliset lomakkeet, sähköposti',
      tyo: 'ISS Palvelut (työnantaja etsitty)',
      jatko: 'Kiinteistönhoito tai siivousalan sertifikaatti',
      seuraava: 'Työpaikkahaastattelu suomeksi',
      paivitetty: '2026-03-21',
      day: 58,
    },
    'Mariam Diallo': {
      tavoite: 'A1.1 → A1.2, arjen sujuvuus',
      vahvuudet: 'Rohkea osallistuminen, kysymysten tekeminen',
      kehitys: 'Kirjaimet, numerot, sanasto',
      tyo: 'ei vielä sovittu',
      jatko: 'Lähiala tai varasto',
      seuraava: 'Moduuli 2 — dialogit kaupassa',
      paivitetty: '2026-03-17',
      day: 41,
    },
    'Yusuf Ibrahim': {
      tavoite: 'Ensimmäiset viikot: rutiini ja perussanasto',
      vahvuudet: 'Motivaatio, läsnäolo',
      kehitys: 'Kirjaimet, lyhyet lauseet',
      tyo: 'ei vielä sovittu',
      jatko: 'Logistiikka tai rakennusapu',
      seuraava: 'Päivittäinen mikroharjoitus + tuki',
      paivitetty: '2026-03-28',
      day: 9,
    },
    'Oksana Petrenko': {
      tavoite: 'A2.2 vahvaksi ja jatko-opinnot tai työ',
      vahvuudet: 'Monipuolinen sanasto, palvelutilanteet',
      kehitys: 'YKI-puhe, kirjoitelman rakenne',
      tyo: 'Kuopion kaupunki (valmis, palaute kirjattu)',
      jatko: 'Sosiaali- ja terveysala tai jatkokoulutus',
      seuraava: 'YKI ilmoittautuminen kesälle',
      paivitetty: '2026-03-12',
      day: 96,
    },
  };

  const ASSESS_ROWS = [
    { n: 'Fatuma Warsame', ini: 'pre-A1', mid: 'A1.1 (arvio)', out: '', tgt: 'A2', ch: '+1', act: 'tuki' },
    { n: 'Leila Ahmadi', ini: 'A1.1', mid: 'A1.2', out: '', tgt: 'A2', ch: '+0.5', act: 'seuraa' },
    { n: 'Amira Hassan', ini: 'pre-A1', mid: 'A1.1', out: '', tgt: 'A2', ch: '+1', act: 'tuki' },
    { n: 'Hodan Farah', ini: 'A1.2', mid: 'A2.1', out: '', tgt: 'A2', ch: '+1', act: 'jatka' },
    { n: 'Dmytro Kovalenko', ini: 'A1.3', mid: 'A2.1', out: '', tgt: 'B1', ch: '+1', act: 'jatka' },
    { n: 'Li Wei', ini: 'A2.1', mid: 'A2.2', out: '', tgt: 'B1', ch: '+0.5', act: 'puhe+' },
    { n: 'Pavel Sorokin', ini: 'A1.3', mid: 'B1.1', out: 'B1.2', tgt: 'B1', ch: '+2', act: 'YKI' },
    { n: 'Mariam Diallo', ini: 'pre-A1', mid: 'A1.1', out: '', tgt: 'A2', ch: '+1', act: 'tuki' },
    { n: 'Yusuf Ibrahim', ini: 'pre-A1', mid: '', out: '', tgt: 'A1', ch: 'uusi', act: 'seuraa' },
    { n: 'Oksana Petrenko', ini: 'A1.2', mid: 'A2.1', out: 'A2.2', tgt: 'B1', ch: '+2', act: 'YKI?' },
  ];

  const YKI_ROWS = {
    'Pavel Sorokin': { l: 'ready', k: 'ready', ku: 'almost', p: 'almost', pct: 75, act: 'Ilmoita testiin' },
    'Oksana Petrenko': { l: 'ready', k: 'almost', ku: 'ready', p: 'practice', pct: 60, act: '2–3 vk puheharjoittelua' },
    'Li Wei': { l: 'almost', k: 'ready', ku: 'almost', p: 'practice', pct: 50, act: 'Puhe + kuuntelu' },
    'Dmytro Kovalenko': { l: 'almost', k: 'almost', ku: 'none', p: 'none', pct: 35, act: 'Jatka M5' },
  };

  const PASS_DEFAULT = [
    { n: 'Pavel Sorokin', h: 'done', e: 'done', t: 'done', f: 'plan' },
    { n: 'Oksana Petrenko', h: 'done', e: 'done', t: 'plan', f: 'na' },
    { n: 'Li Wei', h: 'done', e: 'prog', t: 'na', f: 'na' },
    { n: 'Hodan Farah', h: 'prog', e: 'plan', t: 'na', f: 'na' },
    { n: 'Dmytro Kovalenko', h: 'plan', e: 'plan', t: 'na', f: 'na' },
    { n: 'Amira Hassan', h: 'plan', e: 'na', t: 'na', f: 'na' },
  ];

  const PL_STAGES = [
    ['none', 'Ei aloitettu'],
    ['employer', 'Työnantaja etsitty'],
    ['briefing', 'Palaveri sovittu'],
    ['active', 'Käynnissä'],
    ['done', 'Valmis'],
    ['feedback', 'Palaute kirjattu'],
  ];

  const demo = {
    hopsSel: 'Pavel Sorokin',
    hopsNotes: '',
    hopsNotesAt: null,
    hopsGen: false,
    att: {},
    attMonthOpen: false,
    assessOut: {},
    plc: {},
    pass: {},
    yki: {},
    fbStudent: 'Hodan Farah',
    fbStars: { m: 4, k: 3, t: 4 },
    jatkoSel: 'Pavel Sorokin',
    contactsFilter: 'Kaikki',
    modalHtml: '',
  };

  function esc(s) {
    return window.__alkuTeacher.esc(s);
  }
  function roster() {
    return window.__alkuTeacher.roster();
  }
  function toast(m) {
    if (window.__alkuTeacher && typeof window.__alkuTeacher.showToast === 'function') window.__alkuTeacher.showToast(m);
  }
  function tname() {
    return window.__alkuTeacher.teacherName || 'Opettaja';
  }

  function fmtFi(d) {
    const x = new Date(d);
    const dd = String(x.getDate()).padStart(2, '0');
    const mm = String(x.getMonth() + 1).padStart(2, '0');
    return dd + '.' + mm + '.' + x.getFullYear();
  }

  function initAttState() {
    const days = ['2026-03-30', '2026-03-31', '2026-04-01', '2026-04-02', '2026-04-03'];
    const monPresent = {
      'Pavel Sorokin': true,
      'Oksana Petrenko': true,
      'Dmytro Kovalenko': true,
      'Hodan Farah': true,
      'Li Wei': true,
      'Leila Ahmadi': true,
      'Mariam Diallo': true,
    };
    roster().forEach(function (s) {
      if (!demo.att[s.id]) demo.att[s.id] = {};
      days.forEach(function (d, i) {
        if (demo.att[s.id][d] !== undefined) return;
        if (i === 0) {
          if (monPresent[s.name]) demo.att[s.id][d] = { st: 'present', note: '' };
          else if (['Amira Hassan', 'Fatuma Warsame', 'Yusuf Ibrahim'].includes(s.name))
            demo.att[s.id][d] = { st: 'absent', note: s.name === 'Fatuma Warsame' ? 'Poissa' : '' };
          else demo.att[s.id][d] = { st: 'absent', note: '' };
        } else if (i === 1) demo.att[s.id][d] = { st: '', note: '' };
        else demo.att[s.id][d] = { st: 'locked', note: '' };
      });
    });
  }

  function initPlc() {
    const map = {
      'Fatuma Warsame': 'none',
      'Leila Ahmadi': 'none',
      'Amira Hassan': 'none',
      'Mariam Diallo': 'none',
      'Yusuf Ibrahim': 'none',
      'Dmytro Kovalenko': 'employer',
      'Hodan Farah': 'briefing',
      'Li Wei': 'active',
      'Pavel Sorokin': 'done',
      'Oksana Petrenko': 'feedback',
    };
    roster().forEach(function (s) {
      if (!demo.plc[s.id]) {
        demo.plc[s.id] = {
          stage: map[s.name] || 'none',
          employer: '',
          contact: '',
          start: '',
          end: '',
          agr: [true, true, false],
          visits: [],
          studFb: '',
        };
      }
      const p = demo.plc[s.id];
      if (s.name === 'Dmytro Kovalenko') {
        p.employer = 'ISS Palvelut Oy';
        p.contact = 'jarmo.heikkinen@fi.issworld.com';
      }
      if (s.name === 'Hodan Farah') {
        p.employer = 'Niiralan Kulma ry';
        p.start = '2026-04-06';
      }
      if (s.name === 'Li Wei') {
        p.employer = 'Pohjois-Savo IT Oy';
        p.start = '2026-03-24';
        p.end = '2026-04-11';
      }
      if (s.name === 'Pavel Sorokin') {
        p.employer = 'Kuopio Ateriapalvelu';
        p.start = '2026-03-10';
        p.end = '2026-03-28';
      }
      if (s.name === 'Oksana Petrenko') {
        p.employer = 'Kuopion kaupunki';
        p.start = '2026-02-17';
        p.end = '2026-03-07';
      }
    });
  }

  function initPass() {
    PASS_DEFAULT.forEach(function (r) {
      const st = roster().find(function (x) {
        return x.name === r.n;
      });
      if (st) demo.pass[st.id] = { h: r.h, e: r.e, t: r.t, f: r.f };
    });
    roster().forEach(function (s) {
      if (!demo.pass[s.id]) demo.pass[s.id] = { h: 'na', e: 'na', t: 'na', f: 'na' };
    });
  }

  function initYki() {
    roster().forEach(function (s) {
      const y = YKI_ROWS[s.name];
      if (y) demo.yki[s.id] = { ...y };
      else demo.yki[s.id] = { l: 'none', k: 'none', ku: 'none', p: 'none', pct: Math.min(15, 5 + (s.name.length % 9)), act: 'Jatka opiskelua' };
    });
  }

  function ykiLabel(code) {
    if (code === 'ready') return '✓ valmis';
    if (code === 'almost') return '≈ melkein';
    if (code === 'practice') return '✗ harjoittelu';
    return '✗ ei vielä';
  }

  function cycleYki(code) {
    const o = ['none', 'almost', 'ready', 'practice'];
    const i = Math.max(0, o.indexOf(code));
    return o[(i + 1) % o.length];
  }

  const passCycle = ['na', 'plan', 'prog', 'done'];

  function cyclePass(code) {
    const i = passCycle.indexOf(code);
    return passCycle[(i + 1) % passCycle.length];
  }

  function renderHops() {
    const r = roster();
    const sel = demo.hopsSel;
    const h = HOPS[sel] || HOPS['Pavel Sorokin'];
    const day = h.day || 47;
    const pct = Math.min(100, Math.round((day / 120) * 100));
    const opts = r
      .map(function (s) {
        const lab = esc(s.name) + ' · ' + esc((s.cefr_level || 'A1').toUpperCase());
        return '<option value="' + esc(s.name) + '"' + (s.name === sel ? ' selected' : '') + '>' + lab + '</option>';
      })
      .join('');
    const extra = h.huomio ? '<div class="hops-field"><div class="hf-lbl">Huomio</div><div class="hf-val">' + esc(h.huomio) + '</div></div>' : '';
    const opRow =
      h.opettaja === true
        ? '<p class="icopy" style="margin-top:10px"><strong>Päivitetty:</strong> ' +
          esc(h.paivitetty) +
          ' · <strong>opettaja:</strong> ' +
          esc(tname()) +
          '</p>'
        : '<p class="icopy" style="margin-top:10px"><strong>Päivitetty:</strong> ' + esc(h.paivitetty) + '</p>';
    const milestones = [
      { d: 1, l: 'M1', done: true },
      { d: 30, l: 'M2', done: true },
      { d: 60, l: 'M3', done: day >= 60 },
      { d: 90, l: 'M4', done: day >= 90 },
      { d: 120, l: 'M5–6', done: false },
    ];
    const mlHtml = milestones
      .map(function (m, i) {
        const left = (m.d / 120) * 100;
        const cl = m.done ? 'done' : day >= m.d - 5 ? 'cur' : '';
        return '<span class="timeline-mile ' + cl + '" style="left:' + left + '%" title="' + esc(m.l) + '"></span>';
      })
      .join('');
    const showApprove = demo.hopsGen ? '<button type="button" class="btn-teal" id="btn-hops-approve" style="margin-left:8px">Hyväksy ja tallenna</button>' : '';
    document.getElementById('shell-hops-app').innerHTML =
      '<div class="card">' +
      '<label class="plbl" for="hops-student-select">Opiskelija</label>' +
      '<select id="hops-student-select" class="pselect" style="max-width:100%;margin-bottom:16px">' +
      opts +
      '</select>' +
      '<div class="hops-grid">' +
      '<div class="hops-field"><div class="hf-lbl">Tavoite</div><div class="hf-val" id="hops-tavoite">' +
      esc(h.tavoite) +
      '</div></div>' +
      '<div class="hops-field"><div class="hf-lbl">Vahvuudet</div><div class="hf-val">' +
      esc(h.vahvuudet) +
      '</div></div>' +
      '<div class="hops-field"><div class="hf-lbl">Kehityskohteet</div><div class="hf-val">' +
      esc(h.kehitys) +
      '</div></div>' +
      '<div class="hops-field"><div class="hf-lbl">Työssäoppiminen</div><div class="hf-val">' +
      esc(h.tyo || '—') +
      '</div></div>' +
      '<div class="hops-field"><div class="hf-lbl">Jatkosuunnitelma</div><div class="hf-val">' +
      esc(h.jatko || '—') +
      '</div></div>' +
      '<div class="hops-field"><div class="hf-lbl">Seuraava askel</div><div class="hf-val">' +
      esc(h.seuraava || '—') +
      '</div></div>' +
      extra +
      '</div>' +
      opRow +
      '<div class="timeline-120">' +
      '<div class="plbl">120 päivän polku</div>' +
      '<div class="timeline-track"><div class="timeline-fill" style="width:' +
      pct +
      '%"></div><div class="timeline-cur" style="left:' +
      pct +
      '%"></div>' +
      mlHtml +
      '</div>' +
      '<div class="timeline-lbls"><span>Päivä 1</span><span>Päivä ' +
      day +
      ' (tänään)</span><span>Päivä 120</span></div></div>' +
      '<div style="margin-top:16px;display:flex;flex-wrap:wrap;gap:10px;align-items:center">' +
      '<button type="button" class="btn-gen" id="btn-hops-gen"><span class="bico">✦</span><span class="blbl">Generoi HOPS datasta</span><span class="bspin"></span></button>' +
      showApprove +
      '</div>' +
      '<div class="card" style="margin-top:18px;padding:16px;box-shadow:var(--shadow)">' +
      '<div class="plbl">Opettajan muistiinnot</div>' +
      '<textarea id="hops-teacher-notes" class="notes-area" placeholder="Muistiinnot näkyvät vain opettajalle…">' +
      esc(demo.hopsNotes) +
      '</textarea>' +
      '<p class="icopy" id="hops-notes-meta">' +
      (demo.hopsNotesAt ? 'Viimeksi muokattu: ' + esc(demo.hopsNotesAt) : 'Ei tallennettuja muokkauksia') +
      '</p>' +
      '<button type="button" class="btn-teal" id="btn-hops-note-save">Tallenna muistiinpano</button>' +
      '</div></div>';
  }

  function renderAttendance() {
    initAttState();
    const days = [
      { k: '2026-03-30', l: 'Ma 30.3.' },
      { k: '2026-03-31', l: 'Ti 31.3. (tänään)' },
      { k: '2026-04-01', l: 'Ke 1.4.' },
      { k: '2026-04-02', l: 'To 2.4.' },
      { k: '2026-04-03', l: 'Pe 3.4.' },
    ];
    const r = roster();
    let rows = '';
    r.forEach(function (s) {
      let tds = '';
      days.forEach(function (d) {
        const cell = demo.att[s.id][d.k];
        const st = cell.st;
        let cls = 'att-cell';
        let sym = '';
        if (st === 'present') {
          cls += ' present';
          sym = '✓';
        } else if (st === 'absent') {
          cls += ' absent';
          sym = '✗';
        } else if (st === 'locked') cls += ' locked';
        const note = cell.note || '';
        const showNote = st === 'absent' && d.k === '2026-03-30';
        tds +=
          '<td><button type="button" class="' +
          cls +
          '" data-aid="' +
          esc(s.id) +
          '" data-d="' +
          esc(d.k) +
          '">' +
          sym +
          '</button>' +
          (showNote ? '<input class="att-note show" data-aid="' + esc(s.id) + '" data-d="' + esc(d.k) + '" value="' + esc(note) + '" placeholder="Syy…" />' : '') +
          '</td>';
      });
      rows += '<tr><td>' + esc(s.name) + '</td>' + tds + '</tr>';
    });
    const monthBlock = demo.attMonthOpen
      ? '<div class="card" style="margin-top:14px"><div class="card-title">Maaliskuu 2026 — läsnäolo %</div><table class="alku-table"><thead><tr><th>Opiskelija</th><th>%</th></tr></thead><tbody>' +
        r
          .map(function (s) {
            return '<tr><td>' + esc(s.name) + '</td><td>' + (60 + (s.name.length % 40)) + ' %</td></tr>';
          })
          .join('') +
        '</tbody></table></div>'
      : '';
    document.getElementById('shell-attendance-app').innerHTML =
      '<div class="att-stats">' +
      '<div class="att-stat-pill">Läsnäoloprosentti tällä viikolla: <strong>78 %</strong></div>' +
      '<div class="att-stat-pill">Peräkkäiset poissaolot (max): <strong>Fatuma 8 pv</strong> ⚠️</div>' +
      '<div class="att-stat-pill">Poissaolot tällä kuulla: <strong>23</strong></div></div>' +
      '<div class="att-alert">⚠️ <strong>Fatuma Warsame</strong> — 8 peräkkäistä poissaoloa. Laki edellyttää ilmoitusta työvoimaviranomaiselle. ' +
      '<button type="button" class="btn-muted" data-act="att-report">Tee ilmoitus</button> ' +
      '<button type="button" class="btn-teal" data-act="att-contact">Ota yhteyttä opiskelijaan</button></div>' +
      '<div class="card"><div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:12px">' +
      '<button type="button" class="btn-teal" id="btn-att-all-present">Merkitse kaikki läsnä (ti 31.3.)</button>' +
      '<button type="button" class="btn-muted" id="btn-att-month-toggle">' +
      (demo.attMonthOpen ? 'Piilota kuukausiyhteenveto' : 'Näytä kuukausiyhteenveto') +
      '</button></div>' +
      '<div class="att-grid-wrap"><table class="att-grid"><thead><tr><th>Opiskelija</th>' +
      days.map(function (d) {
        return '<th>' + esc(d.l) + '</th>';
      }).join('') +
      '</tr></thead><tbody>' +
      rows +
      '</tbody></table></div>' +
      monthBlock +
      '</div>';
  }

  function renderAssessment() {
    const opts = LEVEL_OPTS.map(function (o) {
      return '<option value="' + esc(o) + '">' + esc(o) + '</option>';
    }).join('');
    const rows = ASSESS_ROWS.map(function (row, idx) {
      const key = row.n;
      const outVal = demo.assessOut[key] !== undefined ? demo.assessOut[key] : row.out;
      return (
        '<tr data-aname="' +
        esc(key) +
        '"><td>' +
        esc(key) +
        '</td><td>' +
        esc(row.ini) +
        '</td><td>' +
        esc(row.mid) +
        '</td><td><select class="wf-pl-select assess-out" data-name="' +
        esc(key) +
        '">' +
        '<option value="">' +
        esc('—') +
        '</option>' +
        opts +
        '</select></td><td>' +
        esc(row.tgt) +
        '</td><td>' +
        esc(row.ch) +
        '</td><td>' +
        esc(row.act) +
        '</td><td><button type="button" class="btn-save-cefr row-save" data-name="' +
        esc(key) +
        '">Tallenna</button></td></tr>'
      );
    }).join('');
    const dots = ASSESS_ROWS.map(function (row) {
      const tone =
        row.act === 'tuki' ? 'amber' : row.act === 'YKI' || row.act === 'YKI?' ? 'purple' : row.n === 'Yusuf Ibrahim' ? 'red' : 'teal';
      return (
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="min-width:160px;font-size:12px;font-weight:600">' +
        esc(row.n) +
        '</span><span class="assess-dots"><span class="assess-dot on"></span><span class="assess-arrow">→</span><span class="assess-dot ' +
        (tone === 'teal' ? 'on' : '') +
        '"></span><span class="assess-arrow">→</span><span class="assess-dot"></span></span> <span style="font-size:11px;color:var(--text-body-muted)">' +
        esc(tone) +
        '</span></div>'
      );
    }).join('');
    document.getElementById('shell-assessment').innerHTML =
      '<div class="card">' +
      '<div class="alku-table-wrap"><table class="alku-table"><thead><tr><th>Opiskelija</th><th>Sisääntulo</th><th>Väliarvio</th><th>Päätösarvio</th><th>Tavoite</th><th>Muutos</th><th>Toimenpide</th><th></th></tr></thead><tbody>' +
      rows +
      '</tbody></table></div>' +
      '<p style="margin-top:14px"><button type="button" class="btn-teal" id="btn-assess-add">Lisää arviointimerkintä</button></p>' +
      '<div style="margin-top:18px"><div class="card-title">Edistyminen (viite)</div>' +
      dots +
      '</div></div>';
    ASSESS_ROWS.forEach(function (row) {
      const sel = Array.from(document.querySelectorAll('select.assess-out')).find(function (s) {
        return s.getAttribute('data-name') === row.n;
      });
      if (!sel) return;
      const v = demo.assessOut[row.n] !== undefined ? demo.assessOut[row.n] : row.out;
      if (v) sel.value = v;
    });
  }

  function renderPlacement() {
    initPlc();
    const byStage = {};
    PL_STAGES.forEach(function (x) {
      byStage[x[0]] = [];
    });
    roster().forEach(function (s) {
      byStage[demo.plc[s.id].stage].push(s);
    });
    const stats = '<div class="att-stats" style="margin-bottom:14px">' +
      '<div class="att-stat-pill">Valmistuneet: <strong>2/10</strong></div>' +
      '<div class="att-stat-pill">Käynnissä: <strong>2/10</strong></div>' +
      '<div class="att-stat-pill">Suunniteltu: <strong>1/10</strong></div>' +
      '<div class="att-stat-pill">Ei aloitettu: <strong>5/10</strong></div></div>';
    let kan = '<div class="kanban-wrap"><div class="kanban-row">';
    PL_STAGES.forEach(function (st) {
      const sid = st[0];
      const title = st[1];
      kan += '<div class="kanban-col"><h4>' + esc(title) + '</h4>';
      byStage[sid].forEach(function (s) {
        const p = demo.plc[s.id];
        const exp = '';
        kan +=
          '<div class="plc-card" data-pid="' +
          esc(s.id) +
          '"><div class="plc-name">' +
          esc(s.name) +
          ' <span class="cbadge ' +
          (s.cefr_level || 'A1').toLowerCase().slice(0, 2) +
          '">' +
          esc((s.cefr_level || 'A1').toUpperCase()) +
          '</span></div>' +
          '<div class="icopy" style="font-size:12px">' +
          esc(p.employer || '—') +
          '</div>' +
          '<div class="icopy" style="font-size:11px">' +
          (p.start ? fmtFi(p.start) : '') +
          (p.end ? ' – ' + fmtFi(p.end) : '') +
          '</div>' +
          '<button type="button" class="btn-muted plc-next" data-pid="' +
          esc(s.id) +
          '" style="margin-top:8px;width:100%">Siirrä →</button>' +
          '<div class="plc-detail"><label class="plbl">Yhteys</label><input class="wf-pl-inp" data-pid="' +
          esc(s.id) +
          '" data-f="contact" value="' +
          esc(p.contact) +
          '" />' +
          '<div style="margin-top:8px"><label><input type="checkbox" data-pid="' +
          esc(s.id) +
          '" data-a="0" ' +
          (p.agr[0] ? 'checked' : '') +
          '/> Opiskelija allekirjoittanut</label><br/>' +
          '<label><input type="checkbox" data-pid="' +
          esc(s.id) +
          '" data-a="1" ' +
          (p.agr[1] ? 'checked' : '') +
          '/> Työnantaja allekirjoittanut</label><br/>' +
          '<label><input type="checkbox" data-pid="' +
          esc(s.id) +
          '" data-a="2" ' +
          (p.agr[2] ? 'checked' : '') +
          '/> Opettaja allekirjoittanut</label></div>' +
          '<textarea class="notes-area" data-pid="' +
          esc(s.id) +
          '" data-f="vis" placeholder="Vierailun muistiinpano…" style="min-height:60px;margin-top:8px"></textarea>' +
          '<textarea class="notes-area" data-pid="' +
          esc(s.id) +
          '" data-f="sfb" placeholder="Opiskelijan palaute" style="min-height:50px">' +
          esc(p.studFb) +
          '</textarea>' +
          '<button type="button" class="btn-teal plc-save" data-pid="' +
          esc(s.id) +
          '" style="margin-top:6px">Tallenna kortti</button></div></div>';
      });
      kan += '</div>';
    });
    kan += '</div></div>';
    document.getElementById('shell-placement').innerHTML = stats + kan;
  }

  function renderYki() {
    initYki();
    let tr = '';
    roster().forEach(function (s) {
      const y = demo.yki[s.id];
      const cells = ['l', 'k', 'ku', 'p'].map(function (k) {
        return (
          '<td><button type="button" class="yki-cell" data-yid="' +
          esc(s.id) +
          '" data-f="' +
          k +
          '">' +
          esc(ykiLabel(y[k])) +
          '</button></td>'
        );
      }).join('');
      tr +=
        '<tr><td>' +
        esc(s.name) +
        '</td>' +
        cells +
        '<td>' +
        esc(String(y.pct)) +
        ' %</td><td>' +
        esc(y.act) +
        '</td><td>' +
        (s.name === 'Pavel Sorokin'
          ? '<button type="button" class="btn-teal btn-yki-modal" data-yname="' + esc(s.name) + '">Ilmoita testiin</button>'
          : '—') +
        '</td></tr>';
    });
    document.getElementById('shell-yki').innerHTML =
      '<div class="card"><div class="alku-table-wrap"><table class="alku-table"><thead><tr><th>Opiskelija</th><th>Luku</th><th>Kirjoitus</th><th>Kuuntelu</th><th>Puhuminen</th><th>Kokonaisvalmius</th><th>Toimenpide</th><th></th></tr></thead><tbody>' +
      tr +
      '</tbody></table></div>' +
      '<p class="icopy" style="margin-top:14px"><strong>Arvioitu YKI-valmius:</strong> Pavel — heti · Oksana — kesäkuu 2026 · Li Wei — syyskuu 2026</p></div>';
  }

  function renderPassit() {
    initPass();
    const cards = ['Hygieniapassi', 'EA1-tietoisuus', 'Työturvallisuuskortti', 'Tulipaloturvallisuus'];
    const keys = ['h', 'e', 't', 'f'];
    let tr = '';
    roster().forEach(function (s) {
      const p = demo.pass[s.id];
      let tds = '';
      keys.forEach(function (k, i) {
        const code = p[k];
        let cls = 'pass-dot ';
        let sym = '—';
        if (code === 'done') {
          cls += 'done';
          sym = '●';
        } else if (code === 'prog') {
          cls += 'prog';
          sym = '◐';
        } else if (code === 'plan') {
          cls += 'plan';
          sym = '○';
        } else {
          cls += 'na';
          sym = '—';
        }
        tds +=
          '<td><span class="' +
          cls +
          '" data-passid="' +
          esc(s.id) +
          '" data-passk="' +
          k +
          '" tabindex="0" role="button">' +
          sym +
          '</span></td>';
      });
      tr += '<tr><td>' + esc(s.name) + '</td>' + tds + '</tr>';
    });
    document.getElementById('shell-passit').innerHTML =
      '<div class="card"><div class="alku-table-wrap pass-grid"><table class="alku-table"><thead><tr><th>Opiskelija</th>' +
      cards
        .map(function (c) {
          return '<th>' + esc(c) + '</th>';
        })
        .join('') +
      '</tr></thead><tbody>' +
      tr +
      '</tbody></table></div>' +
      '<p class="icopy" style="margin-top:14px">Suoritetut passit tällä kaudella: <strong>6 kpl</strong><br/>Arvioitu kustannus: 6 × €50 = <strong>€300</strong><br/>Sisältyy OTP-hintaan ✓</p>' +
      '<button type="button" class="btn-teal" id="btn-pass-schedule">Lisää ajoitettu koulutus</button></div>';
  }

  function starRow(id, val) {
    let h = '';
    for (let i = 1; i <= 5; i++) {
      h += '<button type="button" class="star-btn' + (i <= val ? ' on' : '') + '" data-star="' + id + '" data-n="' + i + '">★</button>';
    }
    return '<div class="stars-row" id="row-' + id + '">' + h + '</div>';
  }

  function renderFeedback() {
    const r = roster();
    document.getElementById('shell-feedback').innerHTML =
      '<div class="shell-grid"><div class="card"><div class="card-title">Välipalaute</div>' +
      '<label class="plbl">Opiskelija</label><select id="fb-student" class="pselect" style="max-width:100%;margin-bottom:12px">' +
      roster()
        .map(function (s) {
          return '<option value="' + esc(s.name) + '"' + (s.name === demo.fbStudent ? ' selected' : '') + '>' + esc(s.name) + '</option>';
        })
        .join('') +
      '</select>' +
      '<div class="plbl">Motivaatio (1–5)</div>' +
      starRow('mot', demo.fbStars.m) +
      '<div class="plbl">Kielitaidon kehitys (1–5)</div>' +
      starRow('kieli', demo.fbStars.k) +
      '<div class="plbl">Työelämätaidot (1–5)</div>' +
      starRow('tyo', demo.fbStars.t) +
      '<div class="plbl">Erityistarpeet</div><textarea id="fb-erityis" class="notes-area" style="min-height:70px">Tarvitsee lisätukea kirjoittamisessa</textarea>' +
      '<div class="plbl">Opiskelijan toiveet</div><textarea id="fb-toive" class="notes-area" style="min-height:70px">Haluaa enemmän puheharjoittelua</textarea>' +
      '<div class="plbl">Opettajan arvio</div><textarea id="fb-op" class="notes-area" style="min-height:80px">Hodan edistyy hyvin suullisesti; kirjoittamiseen rutiinia.</textarea>' +
      '<div class="plbl">Suositus jatkolle</div><select id="fb-rec" class="pselect"><option>Jatka samalla tahdilla</option><option>Tehostus</option><option>Harkitse keskeyttämistä</option><option>YKI-valmistelu</option><option>Työllistyminen</option></select>' +
      '<button type="button" class="btn-teal" id="fb-save-v" style="margin-top:12px">Tallenna välipalaute</button></div>' +
      '<div class="card"><div class="card-title">Loppupalaute</div>' +
      '<label class="plbl">Saavutettu kielitaso</label><select id="fb-cefr" class="pselect"><option>A1</option><option>A2</option><option>B1</option><option>B2</option></select>' +
      '<label class="plbl" style="margin-top:10px;display:block">Jatkosuositus</label><select id="fb-jatko" class="pselect"><option>Jatkokoulutus</option><option>Työllistyminen</option><option>YKI</option></select>' +
      '<label style="display:block;margin-top:10px"><input type="checkbox" id="fb-tod" /> Todistus annettu</label>' +
      '<label style="display:block;margin-top:6px"><input type="checkbox" id="fb-kp" /> Koulutusportti-kirjaus tehty</label>' +
      '<button type="button" class="btn-teal" id="fb-save-l" style="margin-top:12px">Tallenna loppupalaute</button>' +
      '<button type="button" class="btn-muted" id="fb-preview-pdf" style="margin-top:10px">Esikatsele PDF</button></div></div>';
  }

  function renderReports() {
    document.getElementById('shell-reports').innerHTML =
      '<div id="print-report-root" class="card">' +
      '<div class="card-title">Raportin otsikko</div>' +
      '<p class="icopy"><strong>Tilaaja:</strong> Kuopion kaupunki, TyöNavigaattori<br/>' +
      '<strong>Diaarinumero:</strong> 2042/02.08.00/2026<br/>' +
      '<strong>Palveluntuottaja:</strong> HSBRIDGE AI / ALKUPOLKU<br/>' +
      '<strong>Raportointijakso:</strong> Maaliskuu 2026<br/>' +
      '<strong>Vastuuopettaja:</strong> ' +
      esc(tname()) +
      '</p>' +
      '<div class="card-title" style="margin-top:14px">Tilastot</div>' +
      '<ul class="alku-list"><li>Opiskelijamäärä: 10</li><li>Aloittaneet: 10</li><li>Keskeyttäneet: 0</li><li>Suorittaneet: 1 (Oksana Petrenko)</li>' +
      '<li>Harjoituskerrat yhteensä: 127</li><li>OTP-päivät (laskutus): 43.0</li><li>Läsnäoloprosentti: 78 %</li><li>YKI-testiin ohjattu: 1 (Pavel Sorokin)</li><li>Työssäoppiminen valmis: 2</li></ul>' +
      '<div class="card-title" style="margin-top:14px">Kielitasojakauma</div><p class="icopy">pre-A1: 3 · A1: 3 · A2: 3 · B1: 1</p>' +
      '<div style="margin-top:16px;display:flex;flex-wrap:wrap;gap:10px">' +
      '<button type="button" class="btn-teal" id="rep-copy-5182">Kopioi toteumaraportti (5182)</button>' +
      '<button type="button" class="btn-teal" id="rep-copy-5183">Kopioi loppuraportti (5183)</button>' +
      '<button type="button" class="btn-muted" id="rep-print-pdf">Lataa PDF-luonnos</button></div>' +
      '<div class="card-title" style="margin-top:18px">OTP-laskutus</div>' +
      '<table class="alku-table"><thead><tr><th>Jakso</th><th>OTP</th><th>€/OTP</th><th>Summa</th><th>Tila</th></tr></thead><tbody>' +
      '<tr><td>Maaliskuu 2026</td><td>43.0</td><td>50</td><td>2150 €</td><td>Laskuttamatta</td></tr></tbody></table></div>';
  }

  function renderJatko() {
    const side = roster()
      .map(function (s) {
        let st = '○ Ei aloitettu';
        if (s.name === 'Pavel Sorokin') st = '✓ Hyväksytty';
        if (s.name === 'Oksana Petrenko') st = '◐ Luonnos';
        return '<div style="font-size:13px;padding:6px 0;border-bottom:1px solid var(--border-subtle)"><strong>' + esc(s.name) + '</strong> — ' + st + '</div>';
      })
      .join('');
    document.getElementById('shell-jatko').innerHTML =
      '<div style="display:grid;grid-template-columns:1fr 260px;gap:16px;align-items:start">' +
      '<div class="card"><label class="plbl">Opiskelija</label><select id="jatko-sel" class="pselect">' +
      roster()
        .map(function (s) {
          return '<option value="' + esc(s.name) + '"' + (s.name === demo.jatkoSel ? ' selected' : '') + '>' + esc(s.name) + '</option>';
        })
        .join('') +
      '</select>' +
      '<div class="plbl" style="margin-top:12px">Saavutettu taso</div><p class="icopy" id="jatko-taso">B1.1 (arviointi)</p>' +
      '<div class="plbl">Suositeltava jatkopolku</div>' +
      '<label><input type="radio" name="jk" /> Työllistyminen suoraan</label><br/>' +
      '<label><input type="radio" name="jk" checked /> Ammatillinen koulutus</label><br/>' +
      '<label><input type="radio" name="jk" /> Lisäkotoutumiskoulutus</label><br/>' +
      '<label><input type="radio" name="jk" /> Korkeakouluopinnot</label><br/>' +
      '<label><input type="radio" name="jk" /> Muu</label>' +
      '<div class="plbl" style="margin-top:12px">Toimiala / ala</div><input type="text" class="wf-pl-inp" id="jk-ala" value="ICT, ohjelmistokehitys" style="max-width:100%" />' +
      '<div class="plbl" style="margin-top:12px">Konkreettiset seuraavat askeleet</div>' +
      '<textarea id="jk-askeleet" class="notes-area" style="min-height:120px">1. YKI-testi huhtikuussa 2026\n2. CV suomeksi — valmis\n3. Hakemus Savonia AMK:n tietojenkäsittelyn koulutusohjelmaan\n4. LinkedIn-profiili suomeksi</textarea>' +
      '<div class="plbl" style="margin-top:12px">Opiskelijan kommentti (Oppipolku)</div><p class="icopy" id="jk-opisk">Haluan hakea IT-alan töihin tai opiskelemaan tietojenkäsittelyä.</p>' +
      '<label style="display:block;margin-top:10px"><input type="checkbox" checked /> Digitaalinen suostumus</label>' +
      '<button type="button" class="btn-teal" id="jk-accept" style="margin-top:14px">Hyväksy jatkosuunnitelma</button></div>' +
      '<div class="card"><div class="card-title">Tila</div>' +
      side +
      '</div></div>';
  }

  const CRM = [
    {
      n: 'S-market Kuopio / Niemi-Oinas',
      ala: 'Kauppa ja logistiikka',
      y: 'Matti Virtanen',
      e: 'rekry.kuopio@smarket.fi',
      p: '017 555 0101',
      tarj: 'Myyntiassistentti / varastotyö',
      har: 'Oksana Petrenko (valmis 7.3.2026)',
      k: 'active',
      viim: '2026-03-10',
      mun: 'Kuopio',
    },
    {
      n: 'Pohjois-Savo IT Oy',
      ala: 'Teknologia',
      y: 'Sari Korhonen',
      e: 'hr@ps-it.fi',
      p: '',
      har: 'Li Wei (käynnissä), Pavel Sorokin (valmis)',
      k: 'active',
      viim: '2026-03-08',
      mun: 'Kuopio',
    },
    {
      n: 'Niiralan Kulma ry',
      ala: 'Sosiaali- ja terveysala',
      y: 'Kaisa Leinonen',
      e: 'kaisa.leinonen@niiralankulma.fi',
      har: 'Hodan Farah (palaveri sovittu 6.4.)',
      k: 'new',
      mun: 'Kuopio',
    },
    {
      n: 'ISS Palvelut Oy',
      ala: 'Kiinteistöpalvelut ja siivous',
      y: 'Jarmo Heikkinen',
      e: 'jarmo.heikkinen@fi.issworld.com',
      har: 'Dmytro Kovalenko (etsitään paikkaa)',
      k: 'nego',
      mun: 'Kuopio',
    },
    {
      n: 'Kuopion kaupunki / TyöNavigaattori',
      ala: 'Julkinen sektori',
      har: '—',
      k: 'tilaaja',
      mun: 'Kuopio',
    },
  ];

  const MUNS = ['Kaikki', 'Kuopio', 'Siilinjärvi', 'Lapinlahti', 'Suonenjoki', 'Rautalampi', 'Rautavaara', 'Kaavi', 'Keitele', 'Tervo', 'Tuusniemi', 'Vesanto'];

  function renderContacts() {
    const filt = demo.contactsFilter;
    const cards = CRM.filter(function (c) {
      return filt === 'Kaikki' || c.mun === filt;
    })
      .map(function (c) {
        const kunto =
          c.k === 'active'
            ? '● Aktiivinen kumppani'
            : c.k === 'new'
              ? '◐ Uusi kumppani'
              : c.k === 'nego'
                ? '◐ Neuvotteluvaihe'
                : '● Tilaaja (ei harjoittelupaikkoja)';
        return (
          '<div class="crm-card"><h3 style="font-size:16px;margin-bottom:8px">' +
          esc(c.n) +
          '</h3><p class="icopy">Ala: ' +
          esc(c.ala) +
          '</p>' +
          (c.y ? '<p class="icopy">Yhteyshenkilö: ' + esc(c.y) + '</p>' : '') +
          (c.e ? '<p class="icopy">Sähköposti: ' + esc(c.e) + '</p>' : '') +
          (c.p ? '<p class="icopy">Puhelin: ' + esc(c.p) + '</p>' : '') +
          (c.tarj ? '<p class="icopy">Tarjottu paikka: ' + esc(c.tarj) + '</p>' : '') +
          '<p class="crm-kunto">' +
          esc(kunto) +
          '</p><p class="icopy">Harjoittelijat: ' +
          esc(c.har) +
          '</p>' +
          (c.viim ? '<p class="icopy">Viimeksi yhteydessä: ' + fmtFi(c.viim) + '</p>' : '') +
          '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn-teal btn-crm">Ota yhteyttä</button><button type="button" class="btn-muted btn-crm-add">Lisää harjoittelija</button></div></div>'
        );
      })
      .join('');
    const munBt = MUNS.map(function (m) {
      return (
        '<button type="button" class="' +
        (m === filt ? 'active' : '') +
        '" data-mun="' +
        esc(m) +
        '">' +
        esc(m) +
        '</button>'
      );
    }).join('');
    document.getElementById('shell-contacts').innerHTML =
      '<div style="margin-bottom:12px"><button type="button" class="btn-teal" id="btn-add-employer">Lisää työnantaja</button></div>' +
      '<div class="mun-filter">' +
      munBt +
      '</div><div class="crm-grid">' +
      cards +
      '</div>';
  }

  function openModal(html) {
    const el = document.getElementById('modal-root');
    el.innerHTML = '<div class="modal-box">' + html + '</div>';
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
  }
  function closeModal() {
    const el = document.getElementById('modal-root');
    el.classList.remove('open');
    el.innerHTML = '';
    el.setAttribute('aria-hidden', 'true');
  }

  function initGlobalOnce() {
    if (demo._globalInit) return;
    demo._globalInit = true;
    document.getElementById('modal-root').addEventListener('click', function (e) {
      if (e.target.id === 'modal-root') closeModal();
    });
    document.addEventListener('change', function (e) {
      const t = e.target;
      if (t.id === 'hops-student-select') {
        demo.hopsSel = t.value;
        demo.hopsGen = false;
        renderHops();
        bindHops();
      }
      if (t.id === 'fb-student') demo.fbStudent = t.value;
      if (t.id === 'jatko-sel') demo.jatkoSel = t.value;
    });
  }

  function bindHops() {
    const gen = document.getElementById('btn-hops-gen');
    if (gen) {
      gen.onclick = function () {
        const b = gen;
        b.disabled = true;
        b.classList.add('loading');
        setTimeout(function () {
          const h = HOPS[demo.hopsSel];
          const he = document.getElementById('hops-teacher-notes');
          if (h && he) {
            he.value =
              'Tavoite: ' +
              h.tavoite +
              '\nVahvuudet: ' +
              h.vahvuudet +
              '\nKehitys: ' +
              h.kehitys +
              '\nSeuraava: ' +
              (h.seuraava || '');
          }
          demo.hopsGen = true;
          b.disabled = false;
          b.classList.remove('loading');
          renderHops();
          bindHops();
          toast('HOPS luonnos valmis');
        }, 1500);
      };
    }
    const appr = document.getElementById('btn-hops-approve');
    if (appr) {
      appr.onclick = function () {
        toast('HOPS tallennettu');
        demo.hopsGen = false;
        renderHops();
        bindHops();
      };
    }
    const ns = document.getElementById('btn-hops-note-save');
    if (ns) {
      ns.onclick = function () {
        const ta = document.getElementById('hops-teacher-notes');
        demo.hopsNotes = ta ? ta.value : '';
        demo.hopsNotesAt = fmtFi(new Date());
        const m = document.getElementById('hops-notes-meta');
        if (m) m.textContent = 'Viimeksi muokattu: ' + demo.hopsNotesAt;
        toast('Tallennettu ✓');
      };
    }
  }

  function bindAtt() {
    document.getElementById('shell-attendance-app').onclick = function (e) {
      const b = e.target.closest('.att-cell');
      if (!b || b.classList.contains('locked')) return;
      const id = b.dataset.aid;
      const d = b.dataset.d;
      const cur = demo.att[id][d];
      if (d === '2026-03-31' && (!cur.st || cur.st === '')) {
        cur.st = 'present';
      } else if (cur.st === 'present') cur.st = 'absent';
      else if (cur.st === 'absent') cur.st = '';
      else cur.st = 'present';
      renderAttendance();
      bindAtt();
    };
    const allp = document.getElementById('btn-att-all-present');
    if (allp)
      allp.onclick = function () {
        roster().forEach(function (s) {
          const c = demo.att[s.id]['2026-03-31'];
          if (c && c.st !== 'locked') c.st = 'present';
        });
        renderAttendance();
        bindAtt();
        toast('Tallennettu ✓');
      };
    const mt = document.getElementById('btn-att-month-toggle');
    if (mt)
      mt.onclick = function () {
        demo.attMonthOpen = !demo.attMonthOpen;
        renderAttendance();
        bindAtt();
      };
    document.querySelectorAll('[data-act="att-report"],[data-act="att-contact"]').forEach(function (x) {
      x.onclick = function () {
        toast('Tallennettu ✓');
      };
    });
  }

  function bindPlacement() {
    document.getElementById('shell-placement').onclick = function (e) {
      const card = e.target.closest('.plc-card');
      if (card && !e.target.closest('.plc-next') && !e.target.closest('.plc-save') && !e.target.closest('input') && !e.target.closest('textarea')) {
        card.classList.toggle('expanded');
      }
      const nx = e.target.closest('.plc-next');
      if (nx) {
        const id = nx.dataset.pid;
        const st = demo.plc[id].stage;
        const idx = PL_STAGES.findIndex(function (x) {
          return x[0] === st;
        });
        if (idx >= 0 && idx < PL_STAGES.length - 1) demo.plc[id].stage = PL_STAGES[idx + 1][0];
        renderPlacement();
        bindPlacement();
        toast('Siirretty');
      }
      const sv = e.target.closest('.plc-save');
      if (sv) {
        toast('Tallennettu ✓');
      }
    };
  }

  function bindPass() {
    document.getElementById('shell-passit').onclick = function (e) {
      const sp = e.target.closest('[data-passid]');
      if (!sp) return;
      const id = sp.dataset.passid;
      const k = sp.dataset.passk;
      demo.pass[id][k] = cyclePass(demo.pass[id][k]);
      renderPassit();
      bindPass();
    };
    const sch = document.getElementById('btn-pass-schedule');
    if (sch)
      sch.onclick = function () {
        openModal(
          '<h3>Ajoitettu koulutus</h3><p class="icopy">Valitse opiskelijat, korttityyppi, päivä ja paikka.</p>' +
            '<div class="modal-actions"><button type="button" class="btn-teal" id="m-close-sch">Tallenna</button><button type="button" class="btn-muted" id="m-x-sch">Peruuta</button></div>'
        );
        document.getElementById('m-close-sch').onclick = function () {
          closeModal();
          toast('Tallennettu ✓');
        };
        document.getElementById('m-x-sch').onclick = closeModal;
      };
  }

  function bindYki() {
    document.getElementById('shell-yki').onclick = function (e) {
      const c = e.target.closest('.yki-cell');
      if (c) {
        const id = c.dataset.yid;
        const f = c.dataset.f;
        demo.yki[id][f] = cycleYki(demo.yki[id][f]);
        renderYki();
        bindYki();
        return;
      }
      const m = e.target.closest('.btn-yki-modal');
      if (m) {
        openModal(
          '<h3>Ohjaa Pavel Sorokin YKI-testiin</h3><p class="icopy">Testi: Yleinen kielitutkinto, keskitaso.<br/>Seuraavat testipäivät Kuopiossa: toukokuu 2026 (tarkenna OPH).</p>' +
            '<div class="modal-actions"><button type="button" class="btn-teal" id="m-yki-save">Tallenna ohjaus Koulutusporttiin</button><button type="button" class="btn-muted" id="m-yki-x">Peruuta</button></div>'
        );
        document.getElementById('m-yki-save').onclick = function () {
          closeModal();
          toast('Tallennettu ✓');
        };
        document.getElementById('m-yki-x').onclick = closeModal;
      }
    };
  }

  function bindFeedback() {
    document.getElementById('shell-feedback').onclick = function (e) {
      const st = e.target.closest('.star-btn');
      if (st) {
        const id = st.dataset.star;
        const n = +st.dataset.n;
        if (id === 'mot') demo.fbStars.m = n;
        if (id === 'kieli') demo.fbStars.k = n;
        if (id === 'tyo') demo.fbStars.t = n;
        renderFeedback();
        bindFeedback();
      }
    };
    const sv = document.getElementById('fb-save-v');
    if (sv) sv.onclick = function () {
      toast('Välipalaute tallennettu');
    };
    const sl = document.getElementById('fb-save-l');
    if (sl) sl.onclick = function () {
      toast('Tallennettu ✓');
    };
    const pr = document.getElementById('fb-preview-pdf');
    if (pr)
      pr.onclick = function () {
        openModal(
          '<div style="font-family:serif"><div style="border-bottom:2px solid #3311DB;padding-bottom:8px;margin-bottom:12px"><strong>Knuut AI / ALKUPOLKU</strong> — Välipalaute</div>' +
            '<p><strong>Opiskelija:</strong> ' +
            esc(demo.fbStudent) +
            '</p><p>Motivaatio: ' +
            demo.fbStars.m +
            '/5 …</p></div><button type="button" class="btn-teal" id="m-pdf-x">Sulje</button>'
        );
        document.getElementById('m-pdf-x').onclick = closeModal;
      };
  }

  function bindReports() {
    const c2 = document.getElementById('rep-copy-5182');
    if (c2)
      c2.onclick = function () {
        navigator.clipboard.writeText(document.getElementById('print-report-root').innerText);
        toast('Kopioitu leikepöydälle');
      };
    const c3 = document.getElementById('rep-copy-5183');
    if (c3)
      c3.onclick = function () {
        navigator.clipboard.writeText(document.getElementById('print-report-root').innerText);
        toast('Kopioitu leikepöydälle');
      };
    const pr = document.getElementById('rep-print-pdf');
    if (pr) pr.onclick = function () {
      window.print();
    };
  }

  function bindJatko() {
    const a = document.getElementById('jk-accept');
    if (a) a.onclick = function () {
      toast('Jatkosuunnitelma hyväksytty');
    };
  }

  function bindContacts() {
    document.getElementById('shell-contacts').onclick = function (e) {
      const mun = e.target.closest('[data-mun]');
      if (mun) {
        demo.contactsFilter = mun.dataset.mun;
        document.querySelectorAll('.mun-filter button').forEach(function (b) {
          b.classList.toggle('active', b.dataset.mun === demo.contactsFilter);
        });
        renderContacts();
        bindContacts();
        return;
      }
      if (e.target.closest('.btn-crm') || e.target.closest('.btn-crm-add')) toast('Yhteys tallennettu (demo)');
      if (e.target.id === 'btn-add-employer') {
        openModal(
          '<h3>Uusi työnantaja</h3><input class="wf-pl-inp" placeholder="Yritys" style="width:100%;margin-bottom:8px"/>' +
            '<input class="wf-pl-inp" placeholder="Sähköposti" style="width:100%;margin-bottom:8px"/>' +
            '<select class="pselect" style="width:100%"><option>Kuopio</option><option>Siilinjärvi</option></select>' +
            '<div class="modal-actions"><button type="button" class="btn-teal" id="m-em-save">Tallenna</button><button type="button" class="btn-muted" id="m-em-x">Peruuta</button></div>'
        );
        document.getElementById('m-em-save').onclick = function () {
          closeModal();
          toast('Tallennettu ✓');
        };
        document.getElementById('m-em-x').onclick = closeModal;
      }
    };
  }

  function bindAssess() {
    document.getElementById('shell-assessment').onclick = function (e) {
      const b = e.target.closest('.row-save');
      if (b) {
        const name = b.dataset.name;
        const sel = document.querySelector('select.assess-out[data-name="' + name + '"]');
        if (sel) demo.assessOut[name] = sel.value;
        toast('Tallennettu ✓');
        return;
      }
      if (e.target.id === 'btn-assess-add') {
        openModal(
          '<h3>Uusi arviointimerkintä</h3><label class="plbl">Opiskelija</label><select class="pselect" id="am-s">' +
            roster()
              .map(function (s) {
                return '<option>' + esc(s.name) + '</option>';
              })
              .join('') +
            '</select><label class="plbl">Tyyppi</label><select class="pselect" id="am-t"><option>sisääntulo</option><option>väli</option><option>päätös</option></select>' +
            '<label class="plbl">Taso</label><select class="pselect" id="am-l">' +
            LEVEL_OPTS.map(function (o) {
              return '<option>' + o + '</option>';
            }).join('') +
            '</select><label class="plbl">Muistiinpano</label><textarea class="notes-area" id="am-n"></textarea>' +
            '<div class="modal-actions"><button type="button" class="btn-teal" id="am-save">Tallenna</button><button type="button" class="btn-muted" id="am-x">Peruuta</button></div>'
        );
        document.getElementById('am-save').onclick = function () {
          closeModal();
          toast('Tallennettu ✓');
        };
        document.getElementById('am-x').onclick = closeModal;
      }
    };
  }

  function renderAll() {
    initGlobalOnce();
    initAttState();
    initPlc();
    initPass();
    initYki();
    renderHops();
    bindHops();
    renderAttendance();
    bindAtt();
    renderAssessment();
    bindAssess();
    renderPlacement();
    bindPlacement();
    renderYki();
    bindYki();
    renderPassit();
    bindPass();
    renderFeedback();
    bindFeedback();
    renderReports();
    bindReports();
    renderJatko();
    bindJatko();
    renderContacts();
    bindContacts();
  }

  window.AlkuTeacherSubpages = { renderAll, renderHops };
})();
