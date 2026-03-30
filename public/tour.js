/**
 * ALKUPOLKU — Shepherd.js v11 product tours (shared).
 * Pages load shepherd.min.js + shepherd.css from CDN, then this file, then AlkuTour.init*().
 */
(function (global) {
  'use strict';

  var STORAGE_PREFIX = 'alkupolku_tour_done_';
  var MOBILE_MAX = 900;

  function isMobile() {
    try {
      return global.matchMedia && global.matchMedia('(max-width: ' + MOBILE_MAX + 'px)').matches;
    } catch (e) {
      return global.innerWidth <= MOBILE_MAX;
    }
  }

  function markDone(pageKey) {
    try {
      localStorage.setItem(STORAGE_PREFIX + pageKey, '1');
    } catch (e) {}
  }

  function isDone(pageKey) {
    try {
      return !!localStorage.getItem(STORAGE_PREFIX + pageKey);
    } catch (e) {
      return false;
    }
  }

  function injectStyles() {
    if (document.getElementById('alku-tour-styles')) return;
    var s = document.createElement('style');
    s.id = 'alku-tour-styles';
    s.textContent =
      ':root{' +
      '--color-background-primary: var(--surface, #ffffff);' +
      '--color-text-primary: var(--secondary-900, #1b2559);' +
      '--color-border-tertiary: var(--secondary-400, #e9edf7);' +
      '--border-radius-lg: var(--radius, 20px);' +
      '}' +
      '.shepherd-theme-alkupolku.shepherd-element{' +
      'background:var(--color-background-primary);' +
      'color:var(--color-text-primary);' +
      'border:1px solid var(--color-border-tertiary);' +
      'border-radius:var(--border-radius-lg);' +
      'box-shadow:var(--card-shadow, 0 8px 40px rgba(27,37,89,0.12));' +
      'max-width:min(420px,92vw);' +
      '}' +
      '.shepherd-theme-alkupolku .shepherd-header{padding:14px 16px 0;}' +
      '.shepherd-theme-alkupolku .shepherd-title{' +
      'font-size:17px;font-weight:700;color:var(--color-text-primary);' +
      '}' +
      '.shepherd-theme-alkupolku .shepherd-text{' +
      'font-size:14px;line-height:1.55;color:var(--text-body-muted, #475569);' +
      'padding:0 16px 12px;' +
      '}' +
      '.shepherd-theme-alkupolku .shepherd-footer{' +
      'border-top:1px solid var(--color-border-tertiary);' +
      'padding:12px 16px 14px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:flex-end;' +
      '}' +
      '.shepherd-theme-alkupolku .alku-tour-progress{' +
      'font-size:12px;color:var(--text-body-soft, #5c6578);margin:0 0 10px;font-weight:600;' +
      '}' +
      '.shepherd-theme-alkupolku .shepherd-button.shepherd-button-secondary{' +
      'background:transparent;border:none;color:var(--text-body-muted);font-weight:600;font-size:13px;' +
      'cursor:pointer;text-decoration:underline;padding:8px 10px;margin-right:auto;' +
      '}' +
      '.shepherd-theme-alkupolku .shepherd-button.btn,' +
      '.shepherd-theme-alkupolku .shepherd-button.shepherd-button-primary{' +
      'border-radius:12px;font-weight:600;font-size:14px;padding:10px 18px;cursor:pointer;font-family:inherit;' +
      '}' +
      '.shepherd-theme-alkupolku .shepherd-button.btn-outline,' +
      '.shepherd-theme-alkupolku .shepherd-button--back{' +
      'background:var(--surface, #fff);color:var(--brand-600, #3311db);' +
      'border:1px solid var(--brand-500, #422afb);' +
      '}' +
      '.shepherd-theme-alkupolku .shepherd-button.btn-primary,' +
      '.shepherd-theme-alkupolku .shepherd-button--next,' +
      '.shepherd-theme-alkupolku .shepherd-button--final{' +
      'background:var(--brand-500, #422afb);color:#fff;border:none;' +
      '}' +
      '.shepherd-theme-alkupolku .shepherd-button:hover{filter:brightness(0.97);}' +
      '.shepherd-modal-overlay-container{z-index:998 !important;}' +
      '.shepherd-element{z-index:999 !important;}' +
      '#alku-tour-replay{' +
      'position:fixed;bottom:20px;right:20px;z-index:1000;' +
      'width:44px;height:44px;border-radius:50%;border:1px solid var(--color-border-tertiary);' +
      'background:var(--color-background-primary);color:var(--brand-600);' +
      'font-size:20px;font-weight:700;cursor:pointer;box-shadow:var(--card-shadow);' +
      'display:flex;align-items:center;justify-content:center;font-family:inherit;' +
      '}' +
      '#alku-tour-replay:hover{filter:brightness(0.98);}' +
      'body.shepherd-active #alku-tour-replay{z-index:1001;}';
    document.head.appendChild(s);
  }

  function safeQuery(sel) {
    if (!sel) return null;
    try {
      return typeof sel === 'string' ? document.querySelector(sel) : sel();
    } catch (e) {
      return null;
    }
  }

  function sideFor(desktop) {
    return isMobile() ? 'bottom' : desktop;
  }

  function progressHtml(i, total) {
    return '<p class="alku-tour-progress">Step ' + i + ' of ' + total + '</p>';
  }

  function makeStepButtons(tour, pageKey, stepIndex, totalSteps, isFirst, isLast, finalLabel, finalAction) {
    var buttons = [
      {
        text: 'Skip tour',
        classes: 'shepherd-button-secondary',
        action: function () {
          markDone(pageKey);
          return tour.cancel();
        }
      }
    ];
    if (!isFirst) {
      buttons.push({
        text: 'Back',
        classes: 'shepherd-button--back btn btn-outline',
        action: function () {
          return tour.back();
        }
      });
    }
    if (isLast) {
      buttons.push({
        text: finalLabel || 'Done',
        classes: 'shepherd-button--final btn btn-primary',
        action: function () {
          markDone(pageKey);
          if (typeof finalAction === 'function') finalAction();
          return tour.complete();
        }
      });
    } else {
      buttons.push({
        text: 'Next',
        classes: 'shepherd-button--next btn btn-primary',
        action: function () {
          return tour.next();
        }
      });
    }
    return buttons;
  }

  function addAnchoredStep(tour, pageKey, opts) {
    var stepIndex = opts.stepIndex;
    var totalSteps = opts.totalSteps;
    var title = opts.title;
    var body = opts.body;
    var selector = opts.selector;
    var desktopSide = opts.desktopSide || 'bottom';
    var id = opts.id;
    var onShow = opts.onShow;
    var onHide = opts.onHide;

    var el = safeQuery(selector);
    if (!el) return false;

    var stepConf = {
      id: id,
      title: title,
      text: progressHtml(stepIndex, totalSteps) + '<p style="margin:0">' + body + '</p>',
      classes: 'shepherd-theme-alkupolku',
      attachTo: {
        element: el,
        on: sideFor(desktopSide)
      },
      scrollTo: false,
      canClickTarget: true,
      beforeShowPromise: function () {
        var step = this;
        if (step.options.attachTo) {
          step.options.attachTo.on = sideFor(desktopSide);
        }
        try {
          el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        } catch (e) {}
        return new Promise(function (resolve) {
          setTimeout(resolve, 320);
        });
      },
      buttons: makeStepButtons(tour, pageKey, stepIndex, totalSteps, opts.isFirst, opts.isLast, opts.finalLabel, opts.finalAction)
    };
    if (onShow || onHide) {
      stepConf.when = { show: onShow, hide: onHide };
    }
    tour.addStep(stepConf);
    return true;
  }

  function addCenterStep(tour, pageKey, opts) {
    tour.addStep({
      id: opts.id,
      title: opts.title,
      text: progressHtml(opts.stepIndex, opts.totalSteps) + '<p style="margin:0">' + opts.body + '</p>',
      classes: 'shepherd-theme-alkupolku',
      scrollTo: false,
      buttons: makeStepButtons(tour, pageKey, opts.stepIndex, opts.totalSteps, opts.isFirst, opts.isLast, opts.finalLabel, opts.finalAction)
    });
  }

  function buildOppipolkuTour() {
    var pageKey = 'oppipolku';

    var raw = [
      { type: 'anchor', id: 'op-1', sel: '#dash-greeting', side: 'bottom', title: 'Your learning home', body: 'Your current Finnish level, today\'s goal and your streak. Everything starts here.' },
      { type: 'anchor', id: 'op-2', sel: '#level-bar-a11y', side: 'bottom', title: 'Your level tracker', body: 'You start at 0 and work toward A2. Every session moves this bar.' },
      { type: 'anchor', id: 'op-3', sel: '#tour-micro-practice', side: 'bottom', title: '5-minute daily practice', body: 'One word, one pronunciation, one dialogue. Done in 5 minutes. Mark it done to keep your streak.' },
      { type: 'anchor', id: 'op-4', sel: '.nav-item[data-sec="modules"]', side: 'right', title: 'OPH 2022 learning modules', body: 'Your course follows the official Finnish integration curriculum. Each module has voice practice built in.' },
      { type: 'anchor', id: 'op-5', sel: 'a.knuut-banner', side: 'top', title: 'Knuut — your AI Finnish tutor', body: 'Practice speaking Finnish anytime. Knuut speaks your language when you get stuck. No judgment, no pressure.' },
      { type: 'anchor', id: 'op-6', sel: '.nav-item[data-sec="alphabet"]', side: 'right', title: 'Latin alphabet', body: 'New to the Latin alphabet? Start here. Tap any letter to hear it.' },
      { type: 'anchor', id: 'op-7', sel: '.nav-item[data-sec="passports"]', side: 'right', title: 'Workplace preparation', body: 'Before your work placement, practice Finnish for your specific workplace — kitchen, warehouse, care work.' },
      { type: 'anchor', id: 'op-8', sel: '.nav-item[data-sec="yki"]', side: 'right', title: 'YKI test preparation', body: 'When you are ready, practice all four parts of the national language test here.' },
      { type: 'anchor', id: 'op-9', sel: '#btn-notif', side: 'bottom', title: 'Your teacher sees your progress', body: 'Your teacher monitors your sessions automatically. If you struggle, they will reach out.' }
    ];

    var resolved = [];
    for (var i = 0; i < raw.length; i++) {
      try {
        var r = raw[i];
        if (r.type === 'anchor') {
          var node = safeQuery(r.sel);
          if (node) resolved.push(r);
        }
      } catch (e) {}
    }

    var totalSteps = resolved.length + 1;
    var tour = new global.Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        classes: 'shepherd-theme-alkupolku',
        scrollTo: true,
        cancelIcon: { enabled: false }
      }
    });

    for (var j = 0; j < resolved.length; j++) {
      var rr = resolved[j];
      var isFirst = j === 0;
      var isLast = false;
      addAnchoredStep(tour, pageKey, {
        id: rr.id,
        selector: rr.sel,
        desktopSide: rr.side,
        title: rr.title,
        body: rr.body,
        stepIndex: j + 1,
        totalSteps: totalSteps,
        isFirst: isFirst,
        isLast: isLast,
        pageKey: pageKey
      });
    }

    addCenterStep(tour, pageKey, {
      id: 'op-final',
      title: 'You are ready to start',
      body: 'Your teacher will guide you. Knuut is here anytime. Let\'s begin.',
      stepIndex: totalSteps,
      totalSteps: totalSteps,
      isFirst: resolved.length === 0,
      isLast: true,
      finalLabel: 'Start learning',
      finalAction: function () {
        var home = document.getElementById('etusivu-section') || document.getElementById('sec-dashboard');
        if (home) {
          try {
            home.scrollIntoView({ block: 'start', behavior: 'smooth' });
          } catch (e) {}
        }
      }
    });

    tour.on('cancel', function () {
      markDone(pageKey);
    });
    tour.on('complete', function () {
      markDone(pageKey);
    });

    return tour;
  }

  function buildTeacherTour() {
    var pageKey = 'teacher';

    var raw = [
      { id: 'td-1', sel: '.triage-board', side: 'bottom', title: 'Your class at a glance', body: 'All 25 students, their current level, last session, and alerts. Sorted by who needs attention most.' },
      { id: 'td-2', sel: '#cefr-filters', side: 'right', title: 'Real-time language levels', body: 'Level updates automatically after every practice session. No manual testing needed.' },
      { id: 'td-3', sel: '#daily-command', side: 'bottom', title: 'Automatic alerts', body: 'If a student\'s scores drop or they have not practiced in 3 days, you see it here before they fall behind.' },
      { id: 'td-4', sel: '.nav-item[data-sec="hops"]', side: 'right', title: 'Individual study plans', body: 'HOPS for each student. The platform prefills data from their sessions — you review and approve.' },
      { id: 'td-5', sel: '.nav-item[data-sec="attendance"]', side: 'right', title: 'Attendance tracking', body: 'Students check in via Oppipolku. You see who is present without chasing anyone.' },
      { id: 'td-6', sel: '.nav-item[data-sec="yki"]', side: 'right', title: 'YKI readiness', body: 'When a student\'s level is high enough for the mid-level test, it flags here automatically.' },
      { id: 'td-7', sel: '.nav-item[data-sec="passit"]', side: 'right', title: 'Card and passport tracking', body: 'Track which students have completed hygiene passport, first aid, and work safety training.' },
      { id: 'td-8', sel: '.nav-item[data-sec="placement"]', side: 'right', title: 'Work placement management', body: 'Track each student\'s placement status, employer contact, and visit schedule in one place.' },
      { id: 'td-9', sel: '.nav-item[data-sec="reports"]', side: 'right', title: 'Monthly reports', body: 'Generate the city\'s required monthly toteumaraportti from real attendance and progress data.' }
    ];

    var resolved = [];
    for (var i = 0; i < raw.length; i++) {
      try {
        var r = raw[i];
        if (safeQuery(r.sel)) resolved.push(r);
      } catch (e) {}
    }

    var totalSteps = resolved.length + 1;
    var tour = new global.Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        classes: 'shepherd-theme-alkupolku',
        scrollTo: true,
        cancelIcon: { enabled: false }
      }
    });

    for (var j = 0; j < resolved.length; j++) {
      var rr = resolved[j];
      addAnchoredStep(tour, pageKey, {
        id: rr.id,
        selector: rr.sel,
        desktopSide: rr.side,
        title: rr.title,
        body: rr.body,
        stepIndex: j + 1,
        totalSteps: totalSteps,
        isFirst: j === 0,
        isLast: false
      });
    }

    addCenterStep(tour, pageKey, {
      id: 'td-final',
      title: 'Your dashboard is ready',
      body: '25 students, one screen, everything automated. Your job is teaching — let the platform handle the tracking.',
      stepIndex: totalSteps,
      totalSteps: totalSteps,
      isFirst: resolved.length === 0,
      isLast: true,
      finalLabel: 'Got it',
      finalAction: null
    });

    tour.on('cancel', function () {
      markDone(pageKey);
    });
    tour.on('complete', function () {
      markDone(pageKey);
    });

    return tour;
  }

  function buildKnuutTour() {
    var pageKey = 'knuut';

    var raw = [
      {
        type: 'anchor',
        id: 'kn-2',
        sel: function () {
          return document.querySelector('.mode-tabs') || document.getElementById('oph-context-hint');
        },
        side: 'bottom',
        title: 'Choose your topic',
        body: 'Pick your current OPH module or a workplace type and Knuut practices exactly that vocabulary with you.'
      },
      {
        type: 'anchor',
        id: 'kn-3',
        sel: '#knuut-panic-btn',
        side: 'left',
        title: 'Lost? Press this',
        body: 'Knuut switches to your language instantly. No shame in asking for help — that is what it is for.',
        onShow: function () {
          var p = document.getElementById('knuut-panic-btn');
          if (p) {
            p.dataset.alkuTourPrev = p.style.display || '';
            p.style.display = 'inline-block';
          }
        },
        onHide: function () {
          var p = document.getElementById('knuut-panic-btn');
          if (p && p.dataset.alkuTourPrev !== undefined) {
            p.style.display = p.dataset.alkuTourPrev;
            delete p.dataset.alkuTourPrev;
          }
        }
      },
      {
        type: 'anchor',
        id: 'kn-4',
        sel: '#knuut-talk-btn',
        side: 'top',
        title: 'Every session counts',
        body: 'When you finish, your progress saves to your brain graph and your teacher sees the session summary.'
      }
    ];

    var resolved = [];
    resolved.push({ type: 'center', id: 'kn-1', title: 'Meet Knuut', body: 'Knuut is your AI Finnish conversation partner. It speaks your language when you need help.' });

    for (var i = 0; i < raw.length; i++) {
      try {
        var item = raw[i];
        if (item.type === 'anchor' && safeQuery(item.sel)) {
          resolved.push(item);
        }
      } catch (e) {}
    }

    var totalSteps = resolved.length + 1;
    var tour = new global.Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        classes: 'shepherd-theme-alkupolku',
        scrollTo: true,
        cancelIcon: { enabled: false }
      }
    });

    for (var j = 0; j < resolved.length; j++) {
      var rr = resolved[j];
      if (rr.type === 'center') {
        addCenterStep(tour, pageKey, {
          id: rr.id,
          title: rr.title,
          body: rr.body,
          stepIndex: j + 1,
          totalSteps: totalSteps,
          isFirst: j === 0,
          isLast: false
        });
        continue;
      }
      addAnchoredStep(tour, pageKey, {
        id: rr.id,
        selector: rr.sel,
        desktopSide: rr.side,
        title: rr.title,
        body: rr.body,
        stepIndex: j + 1,
        totalSteps: totalSteps,
        isFirst: j === 0,
        isLast: false,
        onShow: rr.onShow,
        onHide: rr.onHide
      });
    }

    addCenterStep(tour, pageKey, {
      id: 'kn-final',
      title: 'Ready to practice',
      body: 'Speak naturally. Make mistakes. That is how you learn. Knuut is patient.',
      stepIndex: totalSteps,
      totalSteps: totalSteps,
      isFirst: false,
      isLast: true,
      finalLabel: 'Start practicing',
      finalAction: null
    });

    tour.on('cancel', function () {
      markDone(pageKey);
    });
    tour.on('complete', function () {
      markDone(pageKey);
    });

    return tour;
  }

  function wireReplay(pageKey, runTour) {
    var existing = document.getElementById('alku-tour-replay');
    if (existing) existing.remove();

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'alku-tour-replay';
    btn.setAttribute('aria-label', 'Replay product tour');
    btn.textContent = '?';
    btn.addEventListener('click', function () {
      runTour();
    });
    document.body.appendChild(btn);
  }

  function boot(pageKey, factory) {
    if (!global.Shepherd) {
      console.warn('Shepherd.js not loaded; tour disabled.');
      return;
    }
    injectStyles();

    function run() {
      var t = factory();
      t.start();
    }

    wireReplay(pageKey, run);

    if (!isDone(pageKey)) {
      setTimeout(function () {
        run();
      }, 800);
    }
  }

  global.AlkuTour = {
    initOppipolku: function () {
      boot('oppipolku', buildOppipolkuTour);
    },
    initTeacher: function () {
      boot('teacher_dashboard', buildTeacherTour);
    },
    initKnuut: function () {
      boot('knuut', buildKnuutTour);
    },
    _markDone: markDone,
    _isDone: isDone
  };
})(typeof window !== 'undefined' ? window : this);
