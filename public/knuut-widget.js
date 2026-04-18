(function(){
  'use strict';
  var scriptEl = document.currentScript;
  /** Resolve once createWidget runs so data-api-base can override (embed on third-party sites). */
  var API_BASE = 'https://suvisbrain.vercel.app';

  var FONTS_LOADED = false;
  function loadFonts(){
    if(FONTS_LOADED) return;
    FONTS_LOADED=true;
    var l=document.createElement('link');
    l.rel='stylesheet';
    l.href='https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap';
    document.head.appendChild(l);
  }

  var CSS = '\
.knuut-widget{display:flex;flex-direction:column;align-items:center;gap:14px;font-family:"Inter",-apple-system,sans-serif;}\
.knuut-widget *{margin:0;padding:0;box-sizing:border-box;}\
.knuut-btn{background:linear-gradient(135deg,#1a73e8 0%,#0d47a1 100%);color:#fff;font-family:"Playfair Display",Georgia,serif;font-size:15px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;border:none;border-radius:100px;padding:20px 52px;cursor:pointer;box-shadow:0 0 40px rgba(26,115,232,.25),0 8px 32px rgba(0,0,0,.15);transition:all .35s cubic-bezier(.4,0,.2,1);display:flex;align-items:center;gap:12px;-webkit-tap-highlight-color:transparent;touch-action:manipulation;}\
.knuut-btn:hover{transform:scale(1.04);box-shadow:0 0 60px rgba(26,115,232,.45);}\
.knuut-btn:active{transform:scale(.98);}\
.knuut-btn:disabled{opacity:.6;cursor:wait;}\
.knuut-btn.active{background:linear-gradient(135deg,#ff6b6b 0%,#c0392b 100%);box-shadow:0 0 40px rgba(255,107,107,.3);}\
.knuut-btn .knuut-icon{flex-shrink:0;}\
.knuut-subtitle{color:rgba(255,255,255,.9);font-size:11px;font-weight:400;letter-spacing:.14em;text-transform:uppercase;}\
.knuut-timer-wrap{display:none;flex-direction:column;align-items:center;gap:6px;margin-top:10px;}\
.knuut-timer-wrap.visible{display:flex;}\
.knuut-timer{font-family:"Inter",monospace;font-size:42px;font-weight:300;letter-spacing:.06em;color:rgba(255,255,255,.85);transition:color .4s;}\
.knuut-timer.warn{color:#ff6b6b;animation:knuut-pulse 1s ease-in-out infinite;}\
@keyframes knuut-pulse{0%,100%{opacity:1}50%{opacity:.6}}\
.knuut-timer-label{font-size:10px;text-transform:uppercase;letter-spacing:.2em;color:rgba(255,255,255,.35);}\
.knuut-status{margin-top:8px;font-size:12px;color:rgba(255,255,255,.9);letter-spacing:.05em;min-height:18px;text-align:center;}\
.knuut-status.active{color:#fff;}\
.knuut-status.error{color:#ff6b6b;}\
.knuut-voice-bars{display:none;align-items:center;gap:3px;height:18px;}\
.knuut-btn.active .knuut-voice-bars{display:flex;}\
.knuut-btn.active .knuut-icon{display:none;}\
.knuut-vb{width:3px;border-radius:2px;background:#fff;transition:transform .08s;}\
.knuut-branding{font-size:11px;letter-spacing:.12em;color:rgba(255,255,255,.85);text-transform:uppercase;margin-top:12px;}\
.knuut-branding a{color:#fff;text-decoration:none;}\
.knuut-branding a:hover{color:#fff;text-decoration:underline;}\
@media(max-width:480px){.knuut-btn{padding:16px 36px;font-size:13px;}.knuut-timer{font-size:36px;}}\
';

  function injectCSS(){
    if(document.getElementById('knuut-widget-css')) return;
    var s=document.createElement('style'); s.id='knuut-widget-css'; s.textContent=CSS;
    document.head.appendChild(s);
  }

  function resolveApiBase(container){
    var attr = container && container.getAttribute('data-api-base');
    if(attr && String(attr).trim()){
      return String(attr).trim().replace(/\/$/,'');
    }
    if(scriptEl && scriptEl.src){
      try{ var u=new URL(scriptEl.src); return u.origin; }catch(e){}
    }
    if(typeof location !== 'undefined' && location.origin && location.origin !== 'null'){
      return location.origin;
    }
    return 'https://suvisbrain.vercel.app';
  }

  function createWidget(container){
    loadFonts();
    injectCSS();
    API_BASE = resolveApiBase(container);

    container.innerHTML = '\
<div class="knuut-widget">\
  <button class="knuut-btn" id="knuut-btn">\
    <svg class="knuut-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">\
      <rect x="0" y="9" width="3" height="6" rx="1.5" fill="#fff"/>\
      <rect x="5" y="5" width="3" height="14" rx="1.5" fill="#fff"/>\
      <rect x="10" y="2" width="3" height="20" rx="1.5" fill="#fff"/>\
      <rect x="15" y="5" width="3" height="14" rx="1.5" fill="#fff"/>\
      <rect x="20" y="9" width="3" height="6" rx="1.5" fill="#fff"/>\
    </svg>\
    <span class="knuut-voice-bars" id="knuut-voice-bars">\
      <span class="knuut-vb" style="height:6px"></span>\
      <span class="knuut-vb" style="height:12px"></span>\
      <span class="knuut-vb" style="height:18px"></span>\
      <span class="knuut-vb" style="height:12px"></span>\
      <span class="knuut-vb" style="height:6px"></span>\
    </span>\
    Puhu Knuut AI:lle\
  </button>\
  <span class="knuut-subtitle">Ilmainen \u2014 2 minuutin keskustelu</span>\
  <div class="knuut-timer-wrap" id="knuut-timer-wrap">\
    <div class="knuut-timer" id="knuut-timer">2:00</div>\
    <div class="knuut-timer-label">aikaa j\u00e4ljell\u00e4</div>\
  </div>\
  <div class="knuut-status" id="knuut-status"></div>\
  <div class="knuut-branding">Powered by <a href="https://hsbridge.ai" target="_blank" rel="noopener">HSBRIDGE AI</a></div>\
</div>';

    var btn = container.querySelector('#knuut-btn');
    var timerWrap = container.querySelector('#knuut-timer-wrap');
    var timerEl = container.querySelector('#knuut-timer');
    var statusEl = container.querySelector('#knuut-status');

    var pc, micStream, remoteAudioEl, oaiChannel;
    var isActive=false, isStarting=false;
    var timerInterval, timeLeft=120;
    var micAnalyserCtx, remoteAnalyserCtx;
    var sdpAnswerApplied=false, dataChannelOpen=false, conversationKicked=false;
    var voiceProvider='openai', serverInstructions='';

    function updateStatus(t,c){ statusEl.textContent=t; statusEl.className='knuut-status'+(c?' '+c:''); }
    function updateTimer(){
      var m=Math.floor(timeLeft/60), s=timeLeft%60;
      timerEl.textContent=m+':'+String(s).padStart(2,'0');
      timerEl.className='knuut-timer'+(timeLeft<=10?' warn':'');
    }

    var sessionInstructionsSent=false;

    function sendInstructions(){
      if(sessionInstructionsSent) return;
      if(!oaiChannel||oaiChannel.readyState!=='open'||!serverInstructions) return;
      sessionInstructionsSent=true;
      try{
        oaiChannel.send(JSON.stringify({type:'session.update',session:{type:'realtime',instructions:serverInstructions}}));
      }catch(e){sessionInstructionsSent=false;}
    }

    function sendResponseCreate(){
      if(!oaiChannel||oaiChannel.readyState!=='open') return;
      try{
        oaiChannel.send(JSON.stringify({type:'response.create'}));
      }catch(e){console.error('[Knuut]',e);}
    }

    function tryKick(){
      if(conversationKicked) return;
      if(!oaiChannel||oaiChannel.readyState!=='open') return;
      if(!sdpAnswerApplied||!dataChannelOpen) return;
      conversationKicked=true;
      sendInstructions();
      sendResponseCreate();
    }

    function micConstraintsPrimary(){
      var audio={
        channelCount:{ideal:1},
        echoCancellation:{ideal:true},
        noiseSuppression:{ideal:true},
        autoGainControl:{ideal:true}
      };
      try{
        if(typeof MediaTrackSupportedConstraints!=='undefined'&&MediaTrackSupportedConstraints.voiceIsolation){
          audio.voiceIsolation={ideal:true};
        }
      }catch(e){}
      return {audio:audio};
    }

    async function acquireMicStream(){
      if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
        throw new Error('Selain ei tue mikrofonia / Browser does not support microphone');
      }
      var tryList=[
        micConstraintsPrimary(),
        {audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1}},
        {audio:true},
        {audio:{channelCount:1}}
      ];
      var lastErr;
      for(var i=0;i<tryList.length;i++){
        try{return await navigator.mediaDevices.getUserMedia(tryList[i]);}catch(e){lastErr=e;}
      }
      throw lastErr;
    }

    function micErrorMessage(err){
      var n=(err&&err.name)||'';
      if(n==='NotAllowedError'||n==='PermissionDeniedError'){
        return 'Mikrofoni estetty — salli mikki selaimen asetuksista. / Microphone blocked — allow in browser settings.';
      }
      if(n==='NotReadableError'||n==='TrackStartError'){
        return 'Mikrofonia ei voi k\u00e4ynnist\u00e4\u00e4 — sulje muut v\u00e4lilehdet/sovellukset jotka k\u00e4ytt\u00e4v\u00e4t mikki\u00e4. / Mic in use or unavailable — close other tabs or apps using the microphone.';
      }
      if(n==='NotFoundError'||n==='DevicesNotFoundError'){
        return 'Mikrofonia ei l\u00f6ytynyt. / No microphone found.';
      }
      return (err&&err.message)||'Mikrofoni-virhe / Microphone error';
    }

    async function startSession(){
      if(isActive||isStarting) return;
      isStarting=true; btn.disabled=true;
      updateStatus('Pyydet\u00e4\u00e4n mikrofonia...','');
      try{
        sdpAnswerApplied=false; dataChannelOpen=false; conversationKicked=false; sessionInstructionsSent=false; serverInstructions='';

        micStream = await acquireMicStream();
        updateStatus('Yhdistet\u00e4\u00e4n...','');

        try{ var AC=window.AudioContext||window.webkitAudioContext; if(AC){var u=new AC();if(u.state==='suspended')await u.resume();u.close();} }catch(e){}

        var dcLabel='oai-events';
        voiceProvider='openai';
        try{
          var hr=await fetch(API_BASE+'/api/realtime-client-hints');
          var hj=await hr.json();
          if(hj.dataChannelLabel) dcLabel=hj.dataChannelLabel;
          if(hj.provider) voiceProvider=hj.provider;
        }catch(e){}

        updateStatus('Mikrofoni yhdistetty','');

        pc = new RTCPeerConnection({iceServers:[{urls:['stun:stun.l.google.com:19302']}]});

        if(!remoteAudioEl){
          remoteAudioEl=document.createElement('audio');
          remoteAudioEl.autoplay=true; remoteAudioEl.playsInline=true;
          remoteAudioEl.setAttribute('playsinline',''); remoteAudioEl.setAttribute('webkit-playsinline','');
          remoteAudioEl.muted=false; remoteAudioEl.volume=1;
          document.body.appendChild(remoteAudioEl);
        }

        pc.ontrack = async function(ev){
          var stream=(ev.streams&&ev.streams[0])||(ev.track?new MediaStream([ev.track]):null);
          if(!stream) return;
          remoteAudioEl.srcObject=stream; remoteAudioEl.muted=false; remoteAudioEl.volume=1;
          try{await remoteAudioEl.play();updateStatus('Kuuntelen...','active');}catch(e){}
          try{
            var A2=window.AudioContext||window.webkitAudioContext;
            if(!remoteAnalyserCtx) remoteAnalyserCtx=new A2();
            if(remoteAnalyserCtx.state==='suspended') await remoteAnalyserCtx.resume();
            var s2=remoteAnalyserCtx.createMediaStreamSource(stream);
            var a2=remoteAnalyserCtx.createAnalyser();a2.fftSize=256;s2.connect(a2);
            var b2=new Uint8Array(a2.frequencyBinCount);
            var bars=container.querySelectorAll('.knuut-vb');
            (function tR(){if(!isActive)return;a2.getByteFrequencyData(b2);var lv=b2.reduce(function(a,b){return a+b;},0)/(b2.length*255);bars.forEach(function(el,i){el.style.transform='scaleY('+(0.5+Math.min(1,lv*5)*(0.9+0.5*Math.cos(Date.now()/100+i))).toFixed(2)+')';el.style.transformOrigin='bottom';});requestAnimationFrame(tR);})();
          }catch(e){}
        };

        pc.oniceconnectionstatechange = function(){
          if(pc&&pc.iceConnectionState==='connected') updateStatus('Yhdistetty \u2014 puhu!','active');
        };

        micStream.getTracks().forEach(function(t){t.enabled=true;pc.addTrack(t,micStream);});

        oaiChannel = pc.createDataChannel(dcLabel);
        oaiChannel.onerror = function(ev){console.warn('[Knuut] dc error',ev);};
        oaiChannel.onopen = function(){
          dataChannelOpen=true;
          sendInstructions();
          tryKick();
        };
        oaiChannel.onmessage = function(ev){
          try{
            var o=JSON.parse(ev.data||'{}');
            console.log('[Knuut] dc msg:', o.type);
            if(o.type==='session.created') tryKick();
            if(o.type==='session.error'&&o.error) console.warn('[Knuut]',o.error);
            if(o.error&&o.error.message) console.warn('[Knuut]',o.error.message);
          }catch(e){}
        };

        var offer = (voiceProvider==='azure')
          ? await pc.createOffer()
          : await pc.createOffer({offerToReceiveAudio:true,offerToReceiveVideo:false});
        await pc.setLocalDescription(offer);

        var resp = await fetch(API_BASE+'/api/duunijobs-session',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({sdp:offer.sdp||''})
        });
        if(!resp.ok){
          var et=await resp.text();var em;
          try{
            var ej=JSON.parse(et);
            em=ej.error||et;
            if(ej.detail) em+=' — '+ej.detail;
          }catch(e){em=et;}
          throw new Error(em);
        }
        var data = await resp.json();

        if(data.voice_provider) voiceProvider=data.voice_provider;
        serverInstructions=data.instructions||'';
        timeLeft=(typeof data.cap_seconds==='number')?data.cap_seconds:120;

        var answerSdp=typeof data.answer==='string'?data.answer:(data.sdp||'');
        await pc.setRemoteDescription({type:'answer',sdp:answerSdp});
        sdpAnswerApplied=true;
        sendInstructions();
        tryKick();

        if(remoteAudioEl&&remoteAudioEl.srcObject){
          try{await remoteAudioEl.play();}catch(e){}
        }

        isActive=true;
        btn.textContent='Lopeta'; btn.classList.add('active');
        timerWrap.classList.add('visible');
        updateTimer();
        updateStatus('Puhu vapaasti!','active');

        timerInterval=setInterval(function(){
          timeLeft--;
          updateTimer();
          if(timeLeft<=0) stopSession();
        },1000);

      }catch(e){
        console.error(e);
        cleanup();
        var errMsg=e&&e.message;
        var isMicErr=e&&(e.name==='NotAllowedError'||e.name==='PermissionDeniedError'||e.name==='NotReadableError'||e.name==='TrackStartError'||e.name==='NotFoundError'||e.name==='DevicesNotFoundError'||(errMsg&&/Could not start audio source/i.test(errMsg)));
        updateStatus(isMicErr?micErrorMessage(e):(errMsg||'Virhe'),'error');
      }finally{
        isStarting=false; btn.disabled=false;
      }
    }

    function cleanup(){
      if(timerInterval){clearInterval(timerInterval);timerInterval=null;}
      isActive=false;
      btn.textContent='Puhu Knuut AI:lle'; btn.classList.remove('active');
      timerWrap.classList.remove('visible');
      try{if(pc)pc.close();}catch(e){}pc=null;oaiChannel=null;
      if(micStream){micStream.getTracks().forEach(function(t){t.stop();});micStream=null;}
      if(remoteAudioEl)remoteAudioEl.srcObject=null;
      if(micAnalyserCtx){try{micAnalyserCtx.close();}catch(e){}micAnalyserCtx=null;}
      if(remoteAnalyserCtx){try{remoteAnalyserCtx.close();}catch(e){}remoteAnalyserCtx=null;}
    }

    function stopSession(){cleanup();updateStatus('Keskustelu p\u00e4\u00e4ttyi \u2014 kiitos!','');timeLeft=120;updateTimer();}

    btn.addEventListener('click',function(e){e.preventDefault();if(isActive)stopSession();else startSession();});
  }

  function init(){
    var el = document.getElementById('knuut-widget');
    if(!el){
      var all = document.querySelectorAll('[data-knuut-widget]');
      if(all.length) el=all[0];
    }
    if(el) createWidget(el);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();

  window.KnuutWidget = { init: createWidget };
})();
