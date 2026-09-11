/**
 * HSBridge / Framer Knuut voice client.
 * Hosted on Cloud Run so Framer custom code cannot mangle WebRTC.
 *
 * Framer: keep KNUUT_INST + KnuutButton. Replace the old inline SRV script with:
 *   <script src="https://YOUR_CLOUD_RUN_URL/hsbridge-knuut.js"></script>
 */
(function () {
  'use strict';

  var DEFAULT_ORIGIN = 'https://knuut-voice-ojegdh2z7a-lz.a.run.app';
  var API_ORIGIN = (function () {
    if (typeof window !== 'undefined' && window.KNUUT_API_ORIGIN) {
      return String(window.KNUUT_API_ORIGIN).replace(/\/$/, '');
    }
    try {
      if (document.currentScript && document.currentScript.src) {
        return new URL(document.currentScript.src).origin;
      }
    } catch (e) {}
    return DEFAULT_ORIGIN;
  })();

  var FONT_HREFS = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
    'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;1,600&family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600&display=swap',
  ];

  function extractGoogleFontUrl(raw) {
    var d = String(raw || '')
      .replace(/&#x27;|&#39;|&apos;|%27/gi, "'");
    var m = d.match(/https:\/\/fonts\.googleapis\.com\/css2[^'"\s>]*/);
    return m ? m[0].replace(/&amp;/g, '&') : '';
  }

  function patchBrokenFontLinks() {
    document.querySelectorAll('link[rel="stylesheet"]').forEach(function (el) {
      var href = el.getAttribute('href') || el.href || '';
      if (href.indexOf('fonts.googleapis.com') === -1) return;
      if (href.charAt(0) === "'" || href.indexOf("&#") !== -1 || href.indexOf("/'") !== -1 || href.indexOf("%27") !== -1) {
        var ok = extractGoogleFontUrl(href);
        if (ok) el.href = ok;
        else el.parentNode && el.parentNode.removeChild(el);
      }
    });
  }

  function injectFonts() {
    FONT_HREFS.forEach(function (h) {
      if (document.querySelector('link[rel="stylesheet"][href="' + h + '"]')) return;
      var l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = h;
      document.head.appendChild(l);
    });
    patchBrokenFontLinks();
  }
  injectFonts();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectFonts);
  }
  try {
    new MutationObserver(patchBrokenFontLinks).observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}

  var pc, mic, active, connecting, sid, startedAt, transcripts, dc, remoteAudio;

  function instructions() {
    if (typeof window.KNUUT_INST === 'string' && window.KNUUT_INST.trim()) {
      return window.KNUUT_INST.trim();
    }
    return 'Olet Knuut, HSBridge Oy:n konsultti. Puhu lämmintä suomea. Max 2-3 lausetta. Yksi kysymys kerrallaan.';
  }

  function waitForIce(peer, ms) {
    return new Promise(function (resolve) {
      if (!peer || peer.iceGatheringState === 'complete') return resolve();
      var done = false;
      function finish() {
        if (done) return;
        done = true;
        peer.removeEventListener('icegatheringstatechange', onChange);
        resolve();
      }
      function onChange() {
        if (peer.iceGatheringState === 'complete') finish();
      }
      peer.addEventListener('icegatheringstatechange', onChange);
      setTimeout(finish, ms || 2500);
    });
  }

  function setOrbState(on) {
    var label = document.getElementById('knuut-orb-label');
    var wrap = document.getElementById('knuut-orb-wrapper');
    if (label) label.textContent = on ? 'Kuuntelen…' : 'Puhu Knuut AI:lle';
    if (wrap) wrap.setAttribute('data-active', on ? 'true' : 'false');
  }

  async function start() {
    if (active || connecting) return;
    connecting = true;
    try {
      mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });

      pc = new RTCPeerConnection({
        iceServers: [
          { urls: ['stun:stun.l.google.com:19302'] },
          { urls: ['stun:stun1.l.google.com:19302'] },
        ],
      });

      mic.getTracks().forEach(function (t) {
        t.enabled = true;
        pc.addTrack(t, mic);
      });

      if (!remoteAudio) {
        remoteAudio = document.createElement('audio');
        remoteAudio.autoplay = true;
        remoteAudio.playsInline = true;
        remoteAudio.setAttribute('playsinline', '');
        document.body.appendChild(remoteAudio);
      }

      pc.ontrack = function (ev) {
        var stream = (ev.streams && ev.streams[0]) || (ev.track ? new MediaStream([ev.track]) : null);
        if (!stream) return;
        remoteAudio.srcObject = stream;
        remoteAudio.play().catch(function () {});
      };

      pc.oniceconnectionstatechange = function () {
        if (!pc) return;
        if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') stop();
      };

      dc = pc.createDataChannel('oai-events');
      dc.onopen = function () {
        try {
          dc.send(JSON.stringify({ type: 'response.create' }));
        } catch (e) {}
      };
      dc.onmessage = function (e) {
        try {
          var o = JSON.parse(e.data || '{}');
          if (o.type === 'conversation.item.input_audio_transcription.completed' && o.transcript) {
            transcripts.push({ r: 'u', t: o.transcript });
          }
          if (
            (o.type === 'response.output_audio_transcript.done' || o.type === 'response.audio_transcript.done') &&
            o.transcript
          ) {
            transcripts.push({ r: 'a', t: o.transcript });
          }
        } catch (err) {}
      };

      var offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
      await pc.setLocalDescription(offer);
      await waitForIce(pc, 2500);
      var sdp = (pc.localDescription && pc.localDescription.sdp) || offer.sdp || '';
      if (!sdp || sdp.length < 200 || sdp.indexOf('m=audio') === -1) {
        throw new Error('Selain ei tuottanut kelvollista WebRTC-tarjousta');
      }

      var r = await fetch(API_ORIGIN + '/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sdp: sdp, instructions: instructions() }),
      });
      var answer = await r.text();
      if (!r.ok) throw new Error(answer || ('HTTP ' + r.status));
      sid = r.headers.get('X-Session-Id') || 's_' + Date.now();
      startedAt = Date.now();
      transcripts = [];
      await pc.setRemoteDescription({ type: 'answer', sdp: answer });
      active = true;
      connecting = false;
      setOrbState(true);
    } catch (e) {
      console.error('[Knuut]', e);
      stop();
    }
  }

  async function saveTranscript() {
    if (!sid || !transcripts || transcripts.length === 0) return;
    var d = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
    var tr = transcripts
      .map(function (x) {
        return (x.r === 'u' ? 'Asiakas' : 'Knuut') + ': ' + x.t;
      })
      .join('\n');
    try {
      await fetch(API_ORIGIN + '/api/conversation/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sid,
          transcript: tr,
          durationSeconds: d,
          source: 'hsbridgeai.fi',
        }),
        keepalive: true,
      });
    } catch (e) {}
  }

  async function stop() {
    active = false;
    connecting = false;
    setOrbState(false);
    await saveTranscript();
    try {
      if (pc) pc.close();
    } catch (e) {}
    pc = null;
    dc = null;
    if (mic) {
      mic.getTracks().forEach(function (t) {
        t.stop();
      });
      mic = null;
    }
    if (remoteAudio) remoteAudio.srcObject = null;
    sid = null;
    startedAt = null;
    transcripts = [];
  }

  function install() {
    window.knuutStart = start;
    window.knuutStop = stop;
  }

  install();
  var until = Date.now() + 8000;
  var ticker = setInterval(function () {
    install();
    if (Date.now() > until) clearInterval(ticker);
  }, 250);
  window.addEventListener('DOMContentLoaded', install);
  window.addEventListener('load', install);
  window.addEventListener('beforeunload', function () {
    if (active && sid) saveTranscript();
  });
  window.addEventListener('pagehide', function () {
    if (active && sid) saveTranscript();
  });
})();
