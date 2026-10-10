/* =============================================================================
 * 竖屏提示横幅
 * -----------------------------------------------------------------------------
 * 为什么需要：
 *   本 Demo 是 16:9 横版动作游戏。手机上竖屏打开时，画面只有 354x199（占屏 21%），
 *   角色只有十几像素高，HR 会以为"这游戏打不开/没法玩"。
 *   横屏能到 473x266（38%），明显好转；电脑端最佳。
 *
 * 做法：只在「触屏设备 + 竖屏」时显示一条可关闭的横幅，其它情况完全不出现，
 *       不影响桌面端，也不与页面自带的触屏按键冲突（这里只加提示，不加操作）。
 * ========================================================================== */
(function () {
  'use strict';

  var isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (!isTouch) return;

  var css = document.createElement('style');
  css.textContent = [
    '#mh-banner{position:fixed;left:0;right:0;top:0;z-index:2000;display:none;',
    'align-items:flex-start;gap:10px;padding:11px 14px calc(11px + env(safe-area-inset-top));',
    'background:linear-gradient(180deg,#1d2630 0%,#161d26 100%);',
    'border-bottom:2px solid #c9a86a;box-shadow:0 6px 22px rgba(0,0,0,.55);',
    'font:13px/1.6 "Noto Sans SC",system-ui,-apple-system,sans-serif;color:#eae3d2;}',
    '#mh-banner .mh-ico{font-size:20px;line-height:1.1;flex:0 0 auto;margin-top:1px}',
    '#mh-banner .mh-tx{flex:1 1 auto;min-width:0}',
    '#mh-banner b{display:block;color:#f0cf8a;font-size:14px;letter-spacing:.02em;margin-bottom:3px}',
    '#mh-banner span{display:block;color:#c8c2b2;font-size:12px;line-height:1.65}',
    '#mh-banner button{-webkit-appearance:none;appearance:none;flex:0 0 auto;',
    'border:1px solid #7a6a4a;background:#2a3340;color:#e6dcc4;border-radius:16px;',
    'padding:7px 13px;font-size:12px;font-family:inherit;white-space:nowrap}',
    '#mh-banner button:active{background:#3a4552}',
    '@media (orientation:portrait){#mh-banner.mh-on{display:flex}}',
    /* 横幅出现时把页面内容顶下来，避免遮住「完整试炼」按钮 */
    'body.mh-shift{padding-top:92px}',
  ].join('\n');
  document.head.appendChild(css);

  var el = document.createElement('div');
  el.id = 'mh-banner';
  el.innerHTML =
    '<div class="mh-ico">📱</div>'
    + '<div class="mh-tx"><b>建議橫屏遊玩，或改用電腦打開</b>'
    + '<span>本 Demo 是橫版動作遊戲（16:9）。豎屏時畫面只有整屏的兩成，'
    + '橫過手機就能看清戰場；電腦端體驗最完整。</span></div>'
    + '<button type="button">知道了</button>';
  document.body.appendChild(el);

  function apply() {
    var portrait = window.innerHeight > window.innerWidth;
    var narrow = Math.min(window.innerWidth, window.innerHeight) < 560;
    var show = portrait && narrow && !el.dataset.done;
    el.classList.toggle('mh-on', show);
    document.body.classList.toggle('mh-shift', show);
  }

  el.querySelector('button').addEventListener('click', function () {
    el.dataset.done = '1';
    apply();
  });

  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', function () { setTimeout(apply, 250); });
  setTimeout(apply, 300);
  apply();
})();
