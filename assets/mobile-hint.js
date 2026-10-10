/* =============================================================================
 * 手机端：竖屏提示 + 一键横屏
 * -----------------------------------------------------------------------------
 * 问题：本 Demo 是 16:9 横版动作游戏。手机上竖屏打开只有 354x199（占屏 21%），
 *       角色十几像素高，看起来像"打不开"。而很多人的手机锁了竖屏，
 *       即使把手机横过来，浏览器也不会跟着转。
 *
 * 解决：给一个按钮，不依赖系统自动旋转。
 *       ① 优先用原生：全屏 + screen.orientation.lock('landscape')
 *          （Android Chrome 支持，屏幕真的会转）
 *       ② 原生不支持（iOS Safari 没有 orientation.lock）→ 用 CSS 旋转兜底：
 *          把整页转 90° 并铺满视口，用户把手机横过来就是正的。
 *
 * 只加提示与横屏，不接管游戏按键（页面自带触屏按键保持不变）。
 * ========================================================================== */
(function () {
  'use strict';

  var isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (!isTouch) return;

  var CSS = [
    /* ---------- 提示横幅 ---------- */
    '#mh-banner{position:fixed;left:0;right:0;top:0;z-index:2000;display:none;',
    'align-items:flex-start;gap:10px;padding:11px 14px calc(11px + env(safe-area-inset-top));',
    'background:linear-gradient(180deg,#1d2630 0%,#161d26 100%);',
    'border-bottom:2px solid #c9a86a;box-shadow:0 6px 22px rgba(0,0,0,.55);',
    'font:13px/1.6 "Noto Sans SC",system-ui,-apple-system,sans-serif;color:#eae3d2;}',
    '#mh-banner .mh-ico{font-size:20px;line-height:1.1;flex:0 0 auto;margin-top:1px}',
    '#mh-banner .mh-tx{flex:1 1 auto;min-width:0}',
    '#mh-banner b{display:block;color:#f0cf8a;font-size:14px;letter-spacing:.02em;margin-bottom:3px}',
    '#mh-banner span{display:block;color:#c8c2b2;font-size:12px;line-height:1.65}',
    '#mh-banner .mh-btns{display:flex;flex-direction:column;gap:6px;flex:0 0 auto}',
    '#mh-banner button{-webkit-appearance:none;appearance:none;border-radius:16px;',
    'padding:7px 13px;font-size:12px;font-family:inherit;white-space:nowrap;',
    'border:1px solid #c9a86a;background:#3a2f1c;color:#ffd98f;font-weight:700}',
    '#mh-banner button.mh-ghost{border-color:#5b6672;background:#232b35;color:#b9c2cc;font-weight:400}',
    '#mh-banner button:active{filter:brightness(1.25)}',
    '@media (orientation:portrait){#mh-banner.mh-on{display:flex}}',
    'body.mh-shift{padding-top:96px}',
    /* ---------- CSS 旋转兜底（原生 orientation.lock 不可用时） ---------- */
    /* 旋转后 body 的「局部坐标系」被换轴了：
       局部宽 = 100vh、局部高 = 100vw。所以下面的宽高必须这样写，否则画面会跑出屏幕。 */
    'html.mh-ls,html.mh-ls body{overflow:hidden;height:100%;}',
    'html.mh-ls body{position:fixed;top:0;left:100vw;width:100vh;height:100vw;',
    'transform-origin:top left;transform:rotate(90deg);background:#0d1116;}',
    'html.mh-ls .masthead,html.mh-ls .briefing,html.mh-ls .canvas-caption,',
    'html.mh-ls .play-footer,html.mh-ls .design-strip,html.mh-ls .hud,',
    'html.mh-ls #mh-banner{display:none !important}',
    'html.mh-ls .app{padding:0 !important;margin:0 !important;max-width:none !important;',
    'width:100% !important;height:100% !important}',
    'html.mh-ls .layout{display:block !important;max-width:none !important;margin:0 !important;',
    'padding:0 !important;gap:0 !important}',
    'html.mh-ls .play-column{position:absolute !important;top:0 !important;left:0 !important;',
    'width:100vh !important;height:100vw !important;margin:0 !important;padding:0 !important;',
    'border:0 !important;border-radius:0 !important;box-shadow:none !important;background:#0d1116 !important}',
    'html.mh-ls .stage-frame{position:absolute !important;top:0 !important;left:0 !important;',
    'width:100vh !important;height:calc(100vw - 76px) !important;margin:0 !important;',
    'border:0 !important;border-radius:0 !important;background:#0d1116 !important;',
    'display:flex !important;align-items:center !important;justify-content:center !important}',
    'html.mh-ls .stage-frame canvas,html.mh-ls #stage{max-width:100% !important;',
    'max-height:100% !important;width:auto !important;height:auto !important;margin:0 !important}',
    'html.mh-ls .touch-controls{position:absolute !important;top:auto !important;',
    'bottom:0 !important;left:0 !important;right:auto !important;width:100vh !important;',
    'height:76px !important;margin:0 !important;box-sizing:border-box !important}',
    /* ---------- 退出按钮 ---------- */
    '#mh-exit{position:fixed;z-index:2100;display:none;top:calc(8px + env(safe-area-inset-top));',
    'right:10px;border:1px solid #5b6672;background:rgba(20,26,33,.85);color:#cdd6df;',
    'border-radius:14px;padding:6px 12px;font:12px "Noto Sans SC",system-ui,sans-serif}',
    'html.mh-ls #mh-exit{display:block}',
    /* ── A. 触屏按键重排 ─────────────────────────────────────────────
       原来 8 个键挤在一行，每个只有 40px 出头，手机上根本按不准。
       现在：左边只放移动（两个大圆键），右边 3×2 网格放战斗键。
       390px 宽屏算下来 142 + 10 + 186 = 338px，放得下。          */
    '@media (pointer: coarse) {',
    '  .demo-v2 .touch-controls{display:flex !important;align-items:center;',
    '    justify-content:space-between;gap:10px;padding:9px 12px !important;}',
    '  .demo-v2 .touch-controls .move-pad{display:flex;gap:10px;flex:0 0 auto;}',
    '  .demo-v2 .touch-controls .move-pad button{width:66px !important;height:66px !important;',
    '    min-width:66px !important;min-height:66px !important;border-radius:50% !important;',
    '    font-size:22px !important;padding:0 !important;}',
    '  .demo-v2 .touch-controls .action-pad{display:grid !important;',
    '    grid-template-columns:repeat(3,58px);gap:6px;flex:0 0 auto;}',
    '  .demo-v2 .touch-controls .action-pad button{width:58px !important;',
    '    height:52px !important;min-width:58px !important;min-height:52px !important;',
    '    border-radius:11px !important;font-size:13px !important;padding:0 !important;}',
    /* 「斩」是最常用的键，配色上单独区分，避免和「格挡」按混 */
    '  .demo-v2 .touch-controls .action-pad button.attack-key{background:#7d3126 !important;',
    '    border-color:#e89a78 !important;color:#ffe4d6 !important;font-size:15px !important;}',
    '  .demo-v2 .touch-controls .action-pad button.ultimate-key{background:#4a3c17 !important;',
    '    border-color:#d9b45f !important;color:#ffeab0 !important;}',
    '}',
    /* ── B. 游戏中常驻的暂停/菜单按钮 ───────────────────────────────
       手机没有 ESC 键，原来进了游戏就只能打到死才能回菜单。       */
    '#mh-pause{position:fixed;z-index:1500;display:none;align-items:center;',
    '  justify-content:center;top:calc(8px + env(safe-area-inset-top));right:10px;',
    '  width:42px;height:42px;border-radius:50%;border:1px solid #7a6a4a;',
    '  background:rgba(26,31,40,.88);color:#e6dcc4;font-size:17px;padding:0;',
    '  box-shadow:0 3px 12px rgba(0,0,0,.5);}',
    '#mh-pause:active{background:#3a4552}',
    /* ── C. 手机端：覆盖层必须能滚 ───────────────────────────────────
       策划模式的面板在手机上超出屏幕却滑不动，够不到「开始测试」。
       底部留出触屏按键的高度，免得按钮被压在按键栏下面。           */
    '@media (pointer: coarse) {',
    '  .demo-v2 .overlay{overflow-y:auto !important;-webkit-overflow-scrolling:touch !important;',
    '    align-items:flex-start !important;padding:18px 10px 150px !important;}',
    '  .demo-v2 .overlay-card{max-width:100% !important;margin:0 auto !important;}',
    '  .demo-v2 .overlay-actions button{min-height:46px;}',
    '  .demo-v2 .planner-actions button{min-height:44px;}',
    '}',
  ].join('\n');

  var style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  var banner = document.createElement('div');
  banner.id = 'mh-banner';
  banner.innerHTML =
    '<div class="mh-ico">📱</div>'
    + '<div class="mh-tx"><b>建議橫屏遊玩</b>'
    + '<span>本 Demo 是 16:9 橫版動作遊戲，豎屏時畫面只有整屏兩成。'
    + '點右邊按鈕可直接橫屏（手機鎖了旋轉也能用）。</span></div>'
    + '<div class="mh-btns"><button type="button" id="mh-go">橫屏開始</button>'
    + '<button type="button" class="mh-ghost" id="mh-skip">就用豎屏</button></div>';
  document.body.appendChild(banner);

  var exit = document.createElement('button');
  exit.id = 'mh-exit';
  exit.type = 'button';
  exit.textContent = '退出橫屏';
  document.body.appendChild(exit);

  // ---------- 原生横屏：全屏 + 方向锁 ----------
  function nativeLandscape() {
    var el = document.documentElement;
    var done = false;
    try {
      var p = el.requestFullscreen ? el.requestFullscreen()
        : el.webkitRequestFullscreen ? el.webkitRequestFullscreen() : null;
      if (p && p.then) p.then(lock).catch(lock);
    } catch (e) { lock(); }

    function lock() {
      try {
        var o = screen.orientation || screen.msOrientation || screen.mozOrientation;
        if (o && o.lock) {
          var r = o.lock('landscape');
          if (r && r.then) { r.then(function () { done = true; }); return done; }
          done = true;
        }
      } catch (e) { done = false; }
      return done;
    }
    return done;
  }

  // ---------- CSS 旋转兜底 ----------
  function cssLandscape() {
    document.documentElement.classList.add('mh-ls');
  }
  function exitLandscape() {
    document.documentElement.classList.remove('mh-ls');
    try {
      var o = screen.orientation;
      if (o && o.unlock) o.unlock();
    } catch (e) {}
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {}
    apply();
  }

  document.getElementById('mh-go').addEventListener('click', function () {
    var ok = nativeLandscape();
    // 原生方向锁没成功（iOS）→ 立刻上 CSS 旋转，保证一定能横过来
    setTimeout(function () {
      if (!ok) cssLandscape();
      banner.classList.remove('mh-on');
      document.body.classList.remove('mh-shift');
    }, 260);
  });

  document.getElementById('mh-skip').addEventListener('click', function () {
    banner.dataset.done = '1';
    apply();
  });

  exit.addEventListener('click', exitLandscape);

  function apply() {
    var portrait = window.innerHeight > window.innerWidth;
    // 手机真的转成横屏了（自动旋转是开的）→ 撤掉 CSS 旋转，否则会二次旋转把画面转歪
    if (!portrait && document.documentElement.classList.contains('mh-ls')) {
      document.documentElement.classList.remove('mh-ls');
    }
    var narrow = Math.min(window.innerWidth, window.innerHeight) < 560;
    var show = portrait && narrow && !banner.dataset.done
      && !document.documentElement.classList.contains('mh-ls');
    banner.classList.toggle('mh-on', show);
    document.body.classList.toggle('mh-shift', show);
  }

  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', function () { setTimeout(apply, 250); });
  apply();
  setTimeout(apply, 300);

  // ── B. 游戏中常驻的暂停/菜单按钮 ─────────────────────────────────
  // 手机没有 ESC，原来开局后只能打到死才能回菜单。
  var pauseBtn = document.createElement('button');
  pauseBtn.id = 'mh-pause';
  pauseBtn.type = 'button';
  pauseBtn.textContent = '⏸';
  pauseBtn.setAttribute('aria-label', '暂停与菜单');
  pauseBtn.addEventListener('click', function () {
    var s = window.ghostCanyonScene;
    if (!s) return;
    if (s.status === 'run' && typeof s.togglePause === 'function') s.togglePause();
  });
  document.body.appendChild(pauseBtn);

  // 只在「游戏进行中」显示——开始页/结算页已经有自己的按钮了，不要重复
  setInterval(function () {
    var s = window.ghostCanyonScene;
    var on = !!(s && s.status === 'run');
    pauseBtn.style.display = on ? 'flex' : 'none';
  }, 400);

  window.__mobileHintReady = true;
})();
