(() => {
  'use strict';

  const WIDTH = 960;          // 画布/视口宽度，也是场地宽度
  // 场地宽度 = 视口宽度：**不做地图滚动**（滚动玩起来很不舒服）。
  // 想让屏幕"感觉更大"，靠的是压缩 Boss 与技能的范围占比，而不是延申地图。
  // 注意：下面所有 clamp / 地面宽度 / 弹道边界都派生自这个常量，
  // 所以它就是唯一的场地开关，改回 1360 就恢复宽场地。
  const WORLD_W = 960;
  // 最终自爆：瞄准时长、锁定后给的逃跑时间、突进时长、爆炸半径（=判定半径）
  const DIVE_AIM = 1.4;
  const DIVE_ESCAPE = 1.0;
  const DIVE_RUSH = 0.5;
  const DIVE_RADIUS = 110;
  const HEIGHT = 540;
  const FLOOR = 466;
  const ELITE_MAX_HP = 420;
  const BOSS_MAX_HP = 900;
  // P5「亡者归来」：血条自燃烧尽的秒数。到 P5 时血量从这个时间全额往下掉，
  // 玩家输出可以把血条压得更低，因此「撑到烧完」与「直接打死」都算通关。
  const PHASE5_BURN_SECONDS = 35;
  // 烈焰残渣：技能落点留下的燃烧地面，是 P5 压迫感的主来源
  // 场地留白：原来残渣半径 78 / 持续 7 秒，几下就把场地铺满了，
  // 玩家没有立足点。现在缩小并缩短，压迫感靠密度而不是靠铺满。
  const EMBER_LIFE = 5.0;
  const EMBER_RADIUS = 56;
  // 骸骨巨手：法术形态（P1-P4）与附身形态（P5）血量不同
  const HAND_TRAP_HP = 140;
  // 巨手抓取半径：预警圈和判定必须用同一个值，否则「看到多少」和「实际多少」不一致
  const HAND_GRAB_R = 62;
  const HAND_REACH = 250;
  const HAND_ATTACHED_HP = 200;
  // 祈祷术
  const PRAY_DURATION = 1.6;
  const PRAY_COOLDOWN = 18;
  const PRAY_HEAL = 45;

  // 对话剧本。
  // 背景：幽影峡谷本是关隘。三百年前关隘破了，守将没能合上裂隙，
  // 自己也被裂隙吞了进去——从此留在里面，成了"守门的"。下去的骑士有十九个，
  // 一个都没回来。玩家是第二十个。
  // 基调：巫妖不是卡通反派，他疲惫、记得每一个死者的名字；
  //       他最后要拉玩家一起走，不是因为恨，是因为这里太安静了。
  const STORY = {
    intro: [
      { who: '旁白', color: 0x8fa8c8, text: '此地名幽影。三百年前它是一道关隘。关隘破了，就再没合上。' },
      { who: '旁白', color: 0x8fa8c8, text: '每年都有人下去。上头管这叫"试炼"——叫"坟场"就没人肯来了。' },
      { who: '骑士', color: 0xcfe0ff, text: '……我数过。下去过十九个。' },
      { who: '骑士', color: 0xcfe0ff, text: '我是第二十个。' },
    ],
    eliteDown: [
      { who: '幽影守卫', color: 0xb98cff, text: '（甲胄里没有身体，只有风穿过）……口令。' },
      { who: '幽影守卫', color: 0xb98cff, text: '……口令不对。三百年了。没人记得口令。' },
      { who: '裂隙巫妖', color: 0xff8a5c, text: '（声音像是从很深的水底传来）让他进来。' },
      { who: '裂隙巫妖', color: 0xff8a5c, text: '他都走到这儿了。别浪费。' },
      { who: '裂隙巫妖', color: 0xff8a5c, text: '我认识每一个。我记得他们所有的名字。' },
      // ④ 提前做的选择会影响最后：尊重它 -> 正常自爆；挑衅它 -> 激怒，自爆快到几乎躲不掉
      { who: '骑士', color: 0xcfe0ff, text: '（裂隙在等你开口——）', choices: [
        { label: '我只是路过。', flag: 'calm', reply: [
          { who: '裂隙巫妖', color: 0xff8a5c, text: '……路过。好。那就快点走完。' },
        ] },
        { label: '你守了三百年。你叫什么名字？', flag: 'respect', reply: [
          { who: '裂隙巫妖', color: 0xff8a5c, text: '（沉默了很久）……很久没人问过了。' },
          { who: '裂隙巫妖', color: 0xff8a5c, text: '进来吧。我会认真跟你打完。' },
        ] },
        { label: '第二十个，也不会是最后一个。', flag: 'taunt', reply: [
          { who: '裂隙巫妖', color: 0xff3a12, text: '……（裂隙里的风突然停了）' },
          { who: '裂隙巫妖', color: 0xff3a12, text: '好。好得很。' },
          { who: '旁白', color: 0x8fa8c8, text: '你听见了锁链绷紧的声音。' },
        ] },
      ] },
    ],
    revive: [
      { who: '骑士', color: 0xcfe0ff, text: '结束了。你输了。' },
      { who: '裂隙巫妖', color: 0xff8a5c, text: '（骨架散落一地，声音反而更清楚了）输？孩子。' },
      { who: '裂隙巫妖', color: 0xff8a5c, text: '我不是在跟你打。我是在等第十九个。' },
      { who: '骑士', color: 0xcfe0ff, text: '……什么意思。' },
      { who: '裂隙巫妖', color: 0xff8a5c, text: '你数过十九个。那是我数的。' },
      { who: '裂隙巫妖', color: 0xff8a5c, text: '你身上这甲，是第七个的。左边护肩内侧有刻痕，是他妹妹的名字。' },
      { who: '裂隙巫妖', color: 0xff6a3a, text: '我烧掉它的时候，他一直在喊那个名字。' },
      { who: '裂隙巫妖', color: 0xff6a3a, text: '所以别说"结束"。我们才刚开始。' },
    ],
    burnout: [
      { who: '裂隙巫妖', color: 0xff8a5c, text: '（火焰在吞噬它自己）……终于。' },
      { who: '裂隙巫妖', color: 0xff8a5c, text: '三百年了，终于有人把我打到这一步。' },
      { who: '骑士', color: 0xcfe0ff, text: '放开吧。你已经不用守了。' },
      { who: '裂隙巫妖', color: 0xff8a5c, text: '你知道这里最糟的是什么吗？' },
      { who: '裂隙巫妖', color: 0xff6a3a, text: '是安静。这里太安静了。' },
      { who: '裂隙巫妖', color: 0xff6a3a, text: '我不会一个人走。' },
    ],
    survived: [
      { who: '旁白', color: 0x8fa8c8, text: '裂隙合上了。没有人回答。' },
      { who: '騎士', color: 0xcfe0ff, text: '（你走上前，想說點什麼——）', choices: [
        { label: '你的名字。你還沒說你的名字。', reply: [
          { who: '裂隙巫妖', color: 0xff8a5c, text: '（很輕）……埃德加。關隘守將，第七任。' },
          { who: '裂隙巫妖', color: 0xff8a5c, text: '很久沒人叫過了。' },
          { who: '旁白', color: 0x8fa8c8, text: '風停了。峽谷第一次真正安靜下來。' },
        ] },
        { label: '你不用再守了。安息吧。', reply: [
          { who: '裂隙巫妖', color: 0xff8a5c, text: '……我守了三百年。' },
          { who: '裂隙巫妖', color: 0xff8a5c, text: '這句話，我等了二十個人。' },
          { who: '旁白', color: 0x8fa8c8, text: '灰燼落回地面。沒有人再站起來。' },
        ] },
        { label: '我記不住你的臉，但我會記住你的聲音。', reply: [
          { who: '裂隙巫妖', color: 0xff8a5c, text: '（停頓很久）……那就夠了。' },
          { who: '裂隙巫妖', color: 0xff8a5c, text: '十九個下去的人，沒有一個這麼說。' },
          { who: '旁白', color: 0x8fa8c8, text: '你轉身往回走，沒有回頭。' },
        ] },
      ] },
    ],
    tookIt: [
      { who: '裂隙巫妖', color: 0xff8a5c, text: '（最後一絲聲音，幾乎是溫柔的）……抓到你了。' },
      { who: '旁白', color: 0x8fa8c8, text: '第二十個，和第二十一個。' },
      { who: '騎士', color: 0xcfe0ff, text: '（倒在地上的你，還能說最後一句——）', choices: [
        { label: '……至少這次，有人記得我。', reply: [
          { who: '裂隙巫妖', color: 0xff8a5c, text: '我會記得。跟他們一起。' },
          { who: '旁白', color: 0x8fa8c8, text: '峽谷裡終於不那麼安靜了。' },
        ] },
        { label: '第二十一個，也不會是最後一個。', reply: [
          { who: '裂隙巫妖', color: 0xff8a5c, text: '（笑）我知道。我一直在等。' },
          { who: '旁白', color: 0x8fa8c8, text: '關隘的燈，又亮了一盞。' },
        ] },
        { label: '（什麼都沒說）', reply: [
          { who: '裂隙巫妖', color: 0xff8a5c, text: '……也好。安靜點，也很好。' },
          { who: '旁白', color: 0x8fa8c8, text: '沒有人再說話。峽谷合上了。' },
        ] },
      ] },
    ],
  };
  const ULTIMATE_REQUIRED = 70;
  const ULTIMATE_RANGE = 320;
  const STORAGE = {
    warmup: { name: '峡谷入口 · 热身教学', goal: '靠近影卫，观察抬剑；试一次格挡或近身弹反。', palette: [0x13202b, 0x25404a, 0x926b52] },
    pressure: { name: '回音峡道 · 双威胁', goal: '先处理近战逼近，再留意远处直线投射物。', palette: [0x111e2b, 0x2e4551, 0x9a6656] },
    rest: { name: '断桥检查点 · 收尾休整', goal: '补充生命与耐力，沿右侧入口挑战精英与首领。', palette: [0x15252b, 0x344944, 0x8cb38f] },
    boss: { name: '断桥试炼 · 精英与首领', goal: '击败幽影守卫精英，迎战裂隙巫妖。', palette: [0x161b2b, 0x393149, 0x987ce0] },
  };

  const CLIPS = [
    ['Idle', 51, 12, -1], ['Run', 22, 30, -1], ['Jump', 30, 38, 0],
    ['Block', 18, 40, 0], ['BlockIdle', 21, 28, -1],
    ['Slash', 46, 64, 0], ['Slash2', 101, 132, 0], ['Slash3', 51, 72, 0],
    ['Attack1', 31, 48, 0], ['Impact', 24, 38, 0], ['Impact2', 30, 42, 0],
    ['Death', 70, 40, 0], ['PowerUp', 72, 90, 0],
  ];

  // 战斗音效键名。音频文件为本项目原创程序合成（44.1kHz 16-bit PCM WAV），
  // 全部为项目原创，不含第三方素材。
  const COMBAT_SFX = [
    'sfx_slash_1', 'sfx_slash_2', 'sfx_slash_3', 'sfx_hit_flesh',
    'sfx_guard_break', 'sfx_death', 'sfx_dodge', 'sfx_ultimate',
    'sfx_boss_tell', 'sfx_soulburst', 'sfx_soulfire', 'sfx_soulfire_hit',
    'sfx_shift', 'sfx_rune_mark', 'sfx_rune_burst', 'sfx_boss_hurt',
    'sfx_boss_phase', 'sfx_boss_death', 'sfx_enemy_death',
  ];

  // 三段连击。duration 是总时长，activeFrom~activeTo 是判定帧窗口。
  // 原来一套三连要 0.72+0.78+0.84 再加三段间隔 = 2.70 秒，前摇后摇都拖，
  // 现在压到 1.74 秒。伤害不动，所以是纯手感提升（DPS 顺带提高 36%）。
  const ATTACKS = [
    { anim: 'hero-attack', damage: 14, duration: 0.46, activeFrom: 0.15, activeTo: 0.25, reach: 112 },
    { anim: 'hero-attack', damage: 20, duration: 0.50, activeFrom: 0.18, activeTo: 0.29, reach: 124 },
    { anim: 'hero-attack', damage: 30, duration: 0.58, activeFrom: 0.23, activeTo: 0.36, reach: 138 },
  ];

  const BOSS_MOVES = {
    slash: { label: '幽影横斩', tell: 0.86, active: 0.16, recover: 1.08, damage: 18, guardable: true, parryable: true, range: 158, type: 'slash' },
    shot: { label: '暗影投射物', tell: 0.72, active: 0.16, recover: 0.72, damage: 14, guardable: true, parryable: false, range: 0, type: 'shot' },
    rush: { label: '影袭突进', tell: 0.94, active: 0.48, recover: 1.15, damage: 26, guardable: false, parryable: true, range: 88, type: 'rush' },
    wave: { label: '地面震荡', tell: 1.12, active: 0.22, recover: 1.02, damage: 22, guardable: false, parryable: false, range: 0, type: 'wave' },
  };
  const ELITE_MOVES = {
    slash: { ...BOSS_MOVES.slash, label: '幽影重斩', tell: 0.72, active: 0.2, recover: 0.62, damage: 26, range: 178 },
    shot: { ...BOSS_MOVES.shot, label: '暗影连弩', tell: 0.60, recover: 0.48, damage: 19 },
    rush: { ...BOSS_MOVES.rush, label: '影袭突进', tell: 0.76, active: 0.5, recover: 0.68, damage: 34, range: 104 },
    wave: { ...BOSS_MOVES.wave, label: '盾震', tell: 0.96, active: 0.3, recover: 0.66, damage: 26 },
  };

  // Controlled strings keep test runs comparable while reducing one-pattern farming.
  // 精英分三段：越往后招式越多、出手越快（phaseSpeed/phaseGap 按 phase 取值）
  const ELITE_PATTERNS = {
    1: [['slash', 'shot', 'slash', 'wave'], ['shot', 'slash', 'shot', 'wave']],
    2: [['slash', 'rush', 'shot', 'slash', 'wave'], ['shot', 'rush', 'slash', 'wave', 'slash']],
    3: [['rush', 'slash', 'wave', 'rush', 'shot', 'slash'], ['slash', 'rush', 'wave', 'slash', 'shot', 'rush']],
  };
  const RIFT_PATTERNS = {
    1: [['slash', 'shot', 'gaze', 'slash'], ['gaze', 'shot', 'slash', 'shot']],
    // ② 招式压到 4 招：形状、颜色、预警各不相同，玩家才分得清
    2: [['slash', 'hand', 'tide', 'wave'], ['tide', 'hand', 'slash', 'rush']],
    3: [['hand', 'slash', 'gaze', 'souls'], ['rush', 'hand', 'tide', 'wave']],
    4: [['rush', 'souls', 'tide', 'wave'], ['hand', 'gaze', 'souls', 'slash']],
    // P5：不再有喘息段落，四式法术高频循环，靠密度压垮玩家
    // ② P5 只留 4 招，全都是「一眼能认出来」的：
    //    冲撞（横冲）/ 抓取（手伸出）/ 震爆（圆环）/ 锤击（手高举）
    //    砍掉：魂火环伺、焚天、焚身乱舞——它们和上面几招在红圈上长得太像了
    5: [['rush', 'handGrab', 'shock', 'slash'],
        ['handSlam', 'bloom', 'rush', 'handGrab']],
    // 第二阶段：招式更密，隕石雨穿插其中
    '5b': [['meteor', 'shock', 'dash', 'handGrab'],
           ['dash', 'bloom', 'meteor', 'souls'],
           ['handGrab', 'shock', 'dash', 'bloom']],
  };
  const RIFT_MOVES = {
    slash: { ...BOSS_MOVES.slash, label: '靈魂震爆', tell: 1.45, active: 0.22, recover: 1.3, damage: 22, range: 205 },
    shot: { ...BOSS_MOVES.shot, label: '追魂冥火', tell: 1.08, recover: 1.1, damage: 12 },
    rush: { ...BOSS_MOVES.rush, label: '幽魂換位', tell: 1.22, active: 0.56, recover: 1.3, damage: 28, range: 96 },
    wave: { ...BOSS_MOVES.wave, label: '亡魂印爆', tell: 1.35, active: 0.34, recover: 1.25, damage: 24, range: 92 },
    // ② 焚天：全屏只有一处安全口
    burn: { ...BOSS_MOVES.wave, label: '焚天', tell: 1.9, active: 0.4, recover: 1.5, damage: 34, range: 96, guardable: false, parryable: false },
    // D 删掉「裂隙牵引」：被强制拽着走体验差，而且和巨手抓取功能重叠
    // B 骸骨巨手：从地下窜出抓人。躲开就没事，被抓住要打碎它
    hand: { ...BOSS_MOVES.wave, label: '骸骨巨手', tell: 1.55, active: 0.5, recover: 1.15, damage: 30, range: 88, guardable: false, parryable: false },
    // C 燃烧形态：巨手长在身上，锤击与抓取
    handSlam: { ...BOSS_MOVES.wave, label: '巨手錘擊', tell: 1.30, active: 0.42, recover: 1.05, damage: 38, range: 128, guardable: false, parryable: false },
    handGrab: { ...BOSS_MOVES.wave, label: '巨手抓取', tell: 1.45, active: 0.45, recover: 1.0, damage: 34, range: 250, guardable: false, parryable: false },
    // ── 普通巫妖：法术类 ──────────────────────────────
    // 魂噬：一次放出 6 顆追蹤魂球，逼玩家持續移動（追蹤類壓力）
    souls: { ...BOSS_MOVES.wave, label: '魂噬', tell: 1.05, active: 3.4, recover: 0.95, damage: 14, range: 0, guardable: false, parryable: false },
    // 冥河之潮：貼地衝擊波，必須跳起來躲
    tide: { ...BOSS_MOVES.wave, label: '冥河之潮', tell: 0.95, active: 0.85, recover: 0.70, damage: 16, range: 0, guardable: false, parryable: false },
    // 亡魂凝視：準星追蹤後射出一道貫穿的豎線。法術 → 可彈反，但只回能量不給架勢
    gaze: { ...BOSS_MOVES.wave, label: '亡魂凝視', tell: 1.05, active: 0.35, recover: 0.75, damage: 20, range: 0, guardable: false, parryable: true },
    // ── 火焰巫妖：近身震盪 + 序列火柱 ────────────────
    shock: { ...BOSS_MOVES.wave, label: '焚天震盪', tell: 0.85, active: 0.35, recover: 0.90, damage: 18, range: 0, guardable: false, parryable: false },
    bloom: { ...BOSS_MOVES.wave, label: '獄火華', tell: 1.10, active: 1.40, recover: 0.70, damage: 15, range: 0, guardable: false, parryable: false },
    // 第二阶段：焚身衝刺。横向高速冲过全场，留下火痕
    dash: { ...BOSS_MOVES.rush, label: '焚身衝刺', tell: 0.92, active: 0.55, recover: 0.85, damage: 22, range: 0, guardable: false, parryable: false },
    // 第二阶段：隕石雨。火球沿一个方向依次砸落
    meteor: { ...BOSS_MOVES.wave, label: '隕石雨', tell: 1.2, active: 2.8, recover: 0.9, damage: 16, range: 0, guardable: false, parryable: false },
    // ④ 焚身乱舞：连续瞬移乱窜，每段落点留火
    blitz: { ...BOSS_MOVES.wave, label: '焚身乱舞', tell: 1.0, active: 2.1, recover: 1.0, damage: 22, range: 0, guardable: false, parryable: false },
  };

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const pct = (value, max) => `${clamp((value / max) * 100, 0, 100)}%`;

  class EncounterScene extends Phaser.Scene {
    constructor() {
      super({ key: 'GhostCanyonEncounter' });
      this.status = 'ready';
      this.mode = 'full';
      this.room = 'warmup';
      this.roomIndex = 0;
      this.elapsed = 0;
      this.stats = this.freshStats();
      this.touch = { left: false, right: false, guard: false };
      this.lastRun = null;
      this.messageTimer = 0;
      this.story = { stage: 'hidden' };
    }

    freshStats() {
      return { hits: 0, whiffs: 0, blocks: 0, guardAttempts: 0, guardBreaks: 0, parries: 0, parryAttempts: 0, parryMisses: 0, dodgeAttempts: 0, dodgeSuccesses: 0, bossWhiffs: 0, bossWhiffsByMove: { slash: 0, rush: 0, wave: 0 }, hitsTaken: 0, hitsTakenBySource: {}, damageBySource: {}, jumps: 0, damageTaken: 0, enemyKills: 0 };
    }

    preload() {
      for (const [clip] of CLIPS) {
        this.load.atlas(clip, `assets/knight/${clip}.png`, `assets/knight/${clip}.json`);
      }
      for (const clip of ['idle', 'run', 'attack', 'jump', 'dead', 'hurt']) {
        this.load.spritesheet(`hero-${clip}`, `assets/hero/${clip}.png`, { frameWidth: 240, frameHeight: 315 });
      }
      // 战斗音效：项目原创程序合成（见 素材来源.md）
      this.load.audio('sfx-parry', 'assets/audio/sfx_parry.wav');
      this.load.audio('sfx-hit', 'assets/audio/sfx_hurt.wav');
      this.load.audio('sfx-guard', 'assets/audio/sfx_guard.wav');
      for (const key of COMBAT_SFX) this.load.audio(key, `assets/audio/${key}.wav`);
      // Boss 技能特效序列帧（本项目原创程序生成）
      this.load.spritesheet('fx_soulburst', 'assets/fx/fx_soulburst.png', { frameWidth: 160, frameHeight: 160 });
      this.load.spritesheet('fx_rune', 'assets/fx/fx_rune.png', { frameWidth: 192, frameHeight: 112 });
      this.load.spritesheet('fx_rift', 'assets/fx/fx_rift.png', { frameWidth: 128, frameHeight: 208 });
      this.load.spritesheet('fx_soulfire', 'assets/fx/fx_soulfire.png', { frameWidth: 64, frameHeight: 64 });
      this.load.spritesheet('fx_soulfire_hit', 'assets/fx/fx_soulfire_hit.png', { frameWidth: 96, frameHeight: 96 });
      // P5「亡者归来」用的赤红火焰版：形状与判定时序和紫色版完全一致，只换配色
      this.load.spritesheet('fx_soulburst_crimson', 'assets/fx/fx_soulburst_crimson.png', { frameWidth: 160, frameHeight: 160 });
      this.load.spritesheet('fx_rune_crimson', 'assets/fx/fx_rune_crimson.png', { frameWidth: 192, frameHeight: 112 });
      this.load.spritesheet('fx_rift_crimson', 'assets/fx/fx_rift_crimson.png', { frameWidth: 128, frameHeight: 208 });
      this.load.spritesheet('fx_soulfire_crimson', 'assets/fx/fx_soulfire_crimson.png', { frameWidth: 64, frameHeight: 64 });
      this.load.spritesheet('fx_soulfire_hit_crimson', 'assets/fx/fx_soulfire_hit_crimson.png', { frameWidth: 96, frameHeight: 96 });
      this.load.spritesheet('fx_flame', 'assets/fx/fx_flame.png', { frameWidth: 80, frameHeight: 120 });
      // 隕石雨：离线渲染的白热核心 + 燃烧拖尾 + 落地火环
      this.load.spritesheet('fx_meteor', 'assets/fx/fx_meteor.png', { frameWidth: 96, frameHeight: 200 });
      this.load.spritesheet('fx_meteor_impact', 'assets/fx/fx_meteor_impact.png', { frameWidth: 160, frameHeight: 160 });
      // 骸骨巨手：离线渲染的成品图，比代码盲画几何图形可控得多。
      // 4 帧开合——只做张开/攥紧两张的话，贴图会在 curl=0.5 处硬切。
      for (let hi = 0; hi < 4; hi += 1) this.load.image(`hand_c${hi}`, `assets/fx/hand_c${hi}.png`);
    }

    create() {
      this.physics.world.gravity.y = 1280;
      this.physics.world.setBounds(38, 0, WIDTH - 76, FLOOR + 15);
      this.physics.world.setBoundsCollision(true, true, true, false);
      this.makeAnimations();
      this.makeHeroAnimations();
      this.makeFxAnimations();
      // 地面必须覆盖最宽的那种场地。原来按 WIDTH 算（右边缘只到 990），
      // 而 Boss 战的物理边界放到了 1322 —— 玩家走过 990 就踩空掉下去。
      // 非 Boss 关卡的物理边界仍然收在 922，所以这里加长不会有副作用。
      this.floorBody = this.add.rectangle(WORLD_W / 2, FLOOR + 35, WORLD_W + 60, 70, 0x000000, 0);
      this.physics.add.existing(this.floorBody, true);

      this.player = this.physics.add.sprite(180, FLOOR, 'hero-idle', 0);
      this.player.setOrigin(0.5, 1);
      this.player.setDepth(12);
      this.player.setScale(0.64);
      this.player.body.setSize(60, 108);
      this.player.body.setOffset((this.player.width - 60) / 2, this.player.height - 108);
      this.player.setCollideWorldBounds(true);
      this.physics.add.collider(this.player, this.floorBody);
      this.player.play('hero-idle');

      this.bossShadow = this.add.ellipse(746, FLOOR + 4, 170, 26, 0x05080d, 0.52).setDepth(7).setVisible(false);
      this.bossSprite = this.add.sprite(746, FLOOR, 'Idle', 'Idle0000').setDepth(10).setScale(1.2).setTint(0xe7798e).setVisible(false);
      this.bossSprite.setOriginFromFrame();
      this.bossSprite.play('knight-idle');
      this.bossAura = this.add.graphics().setDepth(8);
      this.riftArt = this.add.graphics().setDepth(11);
      this.bossAdornment = this.add.graphics().setDepth(14);

      this.entities = [];
      this.projectiles = [];
      this.effects = [];
      this.roomGraphics = this.add.graphics().setDepth(-20);
      this.telegraph = this.add.graphics().setDepth(5);
      this.fxGraphics = this.add.graphics().setDepth(24);
      // A UI 必须固定在屏幕上，否则相机滚动时会跟着世界跑掉
      this.hudGraphics = this.add.graphics().setDepth(30).setScrollFactor(0);
      this.doorGraphics = this.add.graphics().setDepth(4);
      this.bossLabel = this.add.text(WIDTH / 2, 7, '', { fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif', fontSize: '12px', color: '#f5dfcf', fontStyle: 'bold', letterSpacing: 2 }).setOrigin(0.5, 0).setDepth(31).setVisible(false).setScrollFactor(0);
      // 架势标签：让玩家读得出「还差多少破架势」，而不是盯着一条没有刻度的细线
      this.postureLabel = this.add.text(206, 61, '', { fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif', fontSize: '10px', color: '#e0c187' }).setOrigin(0, 0).setDepth(31).setVisible(false).setScrollFactor(0);
      this.prayLabel = this.add.text(52, 61, '', { fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif', fontSize: '11px', color: '#b9e8c0' }).setOrigin(0, 0).setDepth(31).setScrollFactor(0);
      this.handLabel = this.add.text(206, 73, '', { fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif', fontSize: '10px', color: '#e0d4f0' }).setOrigin(0, 0).setDepth(31).setVisible(false).setScrollFactor(0);
      this.actionCaption = this.add.text(WIDTH / 2, 77, '', { fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif', fontSize: '12px', color: '#f2d6a1', stroke: '#0b1119', strokeThickness: 4, align: 'center' }).setOrigin(0.5).setDepth(31).setAlpha(0);

      this.playerState = { hp: 100, maxHp: 100, stamina: 100, energy: 0, invuln: 0, invulnSource: '', guardBreak: 0, guardRecover: 0, parryWindow: 0, parryCooldown: 0, parryPending: false, parryAnim: 0, dodgeTimer: 0, dodgeCooldown: 0, ultimateTimer: 0, hurtTimer: 0, attack: null, attackCooldown: 0, comboIndex: 0, comboGrace: 0, combo: 0, facing: 1, lastGuard: 0, groundHits: 0 };
      this.boss = { hp: BOSS_MAX_HP, maxHp: BOSS_MAX_HP, phase: 1, encounter: 'rift', mode: 'hidden', timer: 0, move: '', sequence: 0, lastMove: '', slashCount: 0, slashTempo: 'slow', moveActive: 0, moveRecover: 0, posture: 0, hurtTimer: 0, hitResolved: false, targetX: 0, facing: -1, rushHit: false, ghostTimer: 0 };

      this.keys = this.input.keyboard.addKeys({
        pray: Phaser.Input.Keyboard.KeyCodes.R,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        leftArrow: Phaser.Input.Keyboard.KeyCodes.LEFT,
        right: Phaser.Input.Keyboard.KeyCodes.D,
        rightArrow: Phaser.Input.Keyboard.KeyCodes.RIGHT,
        jump: Phaser.Input.Keyboard.KeyCodes.SPACE,
        up: Phaser.Input.Keyboard.KeyCodes.W,
        upArrow: Phaser.Input.Keyboard.KeyCodes.UP,
        attack: Phaser.Input.Keyboard.KeyCodes.J,
        guard: Phaser.Input.Keyboard.KeyCodes.F,
        parry: Phaser.Input.Keyboard.KeyCodes.E,
        dodge: Phaser.Input.Keyboard.KeyCodes.SHIFT,
        dodgeAlt: Phaser.Input.Keyboard.KeyCodes.X,
        ultimate: Phaser.Input.Keyboard.KeyCodes.K,
        ultimateAlt: Phaser.Input.Keyboard.KeyCodes.Z,
        pause: Phaser.Input.Keyboard.KeyCodes.ESC,
      });
      this.input.keyboard.on('keydown-SPACE', (event) => {
        // 对话优先：有对话框时空格是"继续"，不再是跳跃
        if (this.dialogueActive) {
          event.preventDefault();
          this.advanceDialogue();
          return;
        }
        // 没有对话时，空格用来快进过场的等待拍
        if (this.skipPendingBeat()) { event.preventDefault(); return; }
        if (this.status === 'story') {
          event.preventDefault();
          this.skipStory();
        }
      });
      this.input.keyboard.on('keydown-ENTER', () => { if (this.dialogueActive) this.advanceDialogue(); else this.skipPendingBeat(); });
      // Esc：有对话就整段跳过，没有就加速过场
      this.input.keyboard.on('keydown-ESC', () => {
        if (this.dialogueActive) this.skipAllDialogue();
        else this.skipPendingBeat();
      });
      this.input.on('pointerdown', () => {
        if (this.dialogueActive) this.advanceDialogue();
        else this.skipPendingBeat();
      });
      this.input.keyboard.addCapture([Phaser.Input.Keyboard.KeyCodes.SPACE, Phaser.Input.Keyboard.KeyCodes.UP, Phaser.Input.Keyboard.KeyCodes.LEFT, Phaser.Input.Keyboard.KeyCodes.RIGHT]);

      // 策划测试快捷键：1/2/3/4 切 Boss 阶段，Q 补满能量，H 回满血
      // ③ 有选项时数字键优先用来选台词，否则才是策划测试切阶段
      this.input.keyboard.on('keydown-ONE', () => { if (this.choiceActive()) this.pickChoice(0); else this.debugSetPhase(1); });
      this.input.keyboard.on('keydown-TWO', () => { if (this.choiceActive()) this.pickChoice(1); else this.debugSetPhase(2); });
      this.input.keyboard.on('keydown-THREE', () => { if (this.choiceActive()) this.pickChoice(2); else this.debugSetPhase(3); });
      this.input.keyboard.on('keydown-FOUR', () => { if (this.choiceActive()) this.pickChoice(3); else this.debugSetPhase(4); });
      this.input.keyboard.on('keydown-Q', () => { if (this.debugMode) { this.playerState.energy = ULTIMATE_REQUIRED; this.setMessage('策划测试：能量已补满。'); } });
      this.input.keyboard.on('keydown-H', () => { if (this.debugMode) { this.playerState.hp = this.playerState.maxHp || 100; this.setMessage('策划测试：生命已回满。'); } });
      // ② 10000 血承伤测试：会真的掉血，用来量每一招的伤害
      this.input.keyboard.on('keydown-B', () => this.toggleTestHp());

      this.room = 'warmup';
      this.roomIndex = 0;
      this.buildRoom('warmup');
      this.status = 'ready';
      this.updateUi();
      this.attachUi();
      window.ghostCanyonScene = this;
      window.startGhostCanyon = (mode) => this.begin(mode === 'boss' ? 'boss' : 'full');
      window.toggleGhostPause = () => this.togglePause();
      this.setMessage('先熟悉移动，再通过抬剑预警练习格挡或弹反。');
    }

    makeAnimations() {
      for (const [clip, count, frameRate, repeat] of CLIPS) {
        const key = `knight-${clip.toLowerCase()}`;
        // Several source atlases include their variant number before the clip name.
        const framePrefix = ({ Block: '1Block', Slash2: '2Slash', Slash3: '3Slash', Attack1: '1Attack', Impact2: '2Impact' })[clip] || clip;
        this.anims.create({
          key,
          frames: this.anims.generateFrameNames(clip, { prefix: framePrefix, start: 0, end: count - 1, zeroPad: 4 }),
          frameRate,
          repeat,
          skipMissedFrames: true,
        });
      }
      // 横斩"挥剑段"子动画：只取剑从身后挥出到水平的帧（约15-26），
      // 剑刃完全水平在第22帧，对应子动画约60%处，与伤害判定对齐
      this.anims.create({
        key: 'knight-slash3-swing',
        frames: this.anims.generateFrameNames('Slash3', { prefix: '3Slash', start: 15, end: 26, zeroPad: 4 }),
        frameRate: 72,
        repeat: 0,
        skipMissedFrames: true,
      });
    }

    makeFxAnimations() {
      // [动画键, 贴图键, 起始帧, 结束帧, 帧率, 是否循环]
      const defs = [
        ['fx-soulburst', 'fx_soulburst', 0, 11, 30, 0],
        // 亡魂印拆成两段：蓄力段播完停在帧 7（蓄满），爆发段单独触发，
        // 这样 burst 的那一帧才能和 resolveBossMove 的判定瞬间对齐。
        ['fx-rune-charge', 'fx_rune', 0, 7, 6, 0],
        ['fx-rune-burst', 'fx_rune', 8, 13, 18, 0],
        ['fx-rift', 'fx_rift', 0, 9, 24, 0],
        ['fx-soulfire', 'fx_soulfire', 0, 7, 14, -1],
        ['fx-soulfire-hit', 'fx_soulfire_hit', 0, 7, 26, 0],
        ['fx-soulburst-crimson', 'fx_soulburst_crimson', 0, 11, 30, 0],
        ['fx-rune-charge-crimson', 'fx_rune_crimson', 0, 7, 6, 0],
        ['fx-rune-burst-crimson', 'fx_rune_crimson', 8, 13, 18, 0],
        ['fx-rift-crimson', 'fx_rift_crimson', 0, 9, 24, 0],
        ['fx-soulfire-crimson', 'fx_soulfire_crimson', 0, 7, 14, -1],
        ['fx-soulfire-hit-crimson', 'fx_soulfire_hit_crimson', 0, 7, 26, 0],
        ['fx-flame', 'fx_flame', 0, 15, 18, -1],
        ['fx-meteor', 'fx_meteor', 0, 11, 22, -1],
        ['fx-meteor-impact', 'fx_meteor_impact', 0, 9, 22, 0],
      ];
      for (const [key, texture, start, end, frameRate, repeat] of defs) {
        this.anims.create({ key, frames: this.anims.generateFrameNumbers(texture, { start, end }), frameRate, repeat });
      }
    }

    makeHeroAnimations() {
      const clips = [
        ['idle', 10, 11, -1], ['run', 10, 16, -1],
        ['attack', 10, 15, 0], ['jump', 10, 14, 0], ['dead', 10, 12, 0],
        // 受击：10 帧 / 24fps ≈ 0.417s，与 playerDamage 里的 p.hurtTimer = 0.42 对齐
        ['hurt', 10, 24, 0],
      ];
      for (const [clip, end, frameRate, repeat] of clips) {
        this.anims.create({ key: `hero-${clip}`, frames: this.anims.generateFrameNumbers(`hero-${clip}`, { start: 0, end: end - 1 }), frameRate, repeat });
      }
    }

    attachUi() {
      document.querySelector('#startBtn').addEventListener('click', () => this.status === 'paused' ? this.togglePause() : this.begin('full'));
      document.querySelector('#bossBtn').addEventListener('click', () => this.begin('boss'));
      const plannerPanel = document.querySelector('#plannerPanel');
      document.querySelector('#debugBtn').addEventListener('click', () => { plannerPanel.hidden = !plannerPanel.hidden; });
      document.querySelector('#plannerCancel').addEventListener('click', () => { plannerPanel.hidden = true; });
      // ① 策划模式专用：左下角浮动「退出策劃模式」。
      //    原来进了策划模式就没有出口，只能刷新页面。
      if (!document.getElementById('debugExit')) {
        const dbgExit = document.createElement('button');
        dbgExit.id = 'debugExit';
        dbgExit.type = 'button';
        dbgExit.textContent = '⏻ 退出策劃模式';
        dbgExit.style.cssText = [
          'position:fixed', 'left:10px', 'bottom:calc(10px + env(safe-area-inset-bottom))',
          'z-index:1200', 'display:none', 'border:1px solid #c9a86a',
          'background:rgba(32,25,14,.92)', 'color:#ffd98f', 'border-radius:16px',
          'padding:8px 14px', 'font:12px/1 "Noto Sans SC",system-ui,sans-serif',
          'box-shadow:0 3px 12px rgba(0,0,0,.5)', 'cursor:pointer',
        ].join(';');
        dbgExit.addEventListener('click', () => this.exitDebug());
        document.body.appendChild(dbgExit);
      }
      document.querySelector('#plannerStart').addEventListener('click', () => {
        this.debugConfig = {
          stage: document.querySelector('#plannerStage').value,
          godMode: !document.querySelector('#plannerDamage').checked
        };
        plannerPanel.hidden = true;
        this.begin('debug', this.debugConfig);
      });
      document.querySelector('#pauseBtn').addEventListener('click', () => this.togglePause());
      document.querySelector('#restartBtn').addEventListener('click', () => this.begin(this.mode, this.debugConfig));
      document.querySelector('#soundBtn').addEventListener('click', () => this.toggleSound());
      document.querySelector('#storyNext').addEventListener('click', () => this.showStoryChoice());
      document.querySelector('#storySkip').addEventListener('click', () => this.skipStory());
      document.querySelector('#challengeRiftBtn').addEventListener('click', () => this.acceptRiftChallenge());
      document.querySelector('#leaveRiftBtn').addEventListener('click', () => this.declineRiftChallenge());

      document.querySelectorAll('[data-action]').forEach((button) => {
        const action = button.dataset.action;
        button.addEventListener('pointerdown', (event) => {
          event.preventDefault();
          button.classList.add('is-held');
          if (action === 'left' || action === 'right' || action === 'guard') {
            this.touch[action] = true;
            try { button.setPointerCapture(event.pointerId); } catch (_) { /* Pointer capture is optional. */ }
          } else {
            this.performAction(action);
          }
        });
        const release = () => {
          button.classList.remove('is-held');
          if (action === 'left' || action === 'right' || action === 'guard') this.touch[action] = false;
        };
        ['pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave'].forEach((name) => button.addEventListener(name, release));
      });
    }

    buildRoom(room) {
      const info = STORAGE[room];
      const g = this.roomGraphics;
      if (!g) return;
      const [top, middle, accent] = info.palette;
      g.clear();
      const topRgb = Phaser.Display.Color.IntegerToRGB(top);
      const midRgb = Phaser.Display.Color.IntegerToRGB(middle);
      for (let i = 0; i < 10; i += 1) {
        const t = i / 9;
        const r = Math.round(topRgb.r + (midRgb.r - topRgb.r) * t);
        const gg = Math.round(topRgb.g + (midRgb.g - topRgb.g) * t);
        const b = Math.round(topRgb.b + (midRgb.b - topRgb.b) * t);
        g.fillStyle((r << 16) | (gg << 8) | b, 1).fillRect(0, i * 38, WIDTH, 42);
      }
      g.fillStyle(0x26303c, 0.56).fillTriangle(0, 302, 235, 135, 464, 302);
      g.fillStyle(0x202d39, 0.73).fillTriangle(255, 306, 520, 124, 790, 306);
      g.fillStyle(0x1a2631, 0.8).fillTriangle(570, 311, 798, 157, 1014, 311);
      g.fillStyle(0x0d141d, 0.8).fillRect(0, 337, WIDTH, 90);

      const pillarColor = room === 'boss' ? 0x27283a : 0x27343e;
      for (let i = 0; i < 7; i += 1) {
        const x = 28 + i * 151;
        const width = 29 + ((i * 13) % 22);
        const height = 138 + ((i * 47) % 108);
        g.fillStyle(pillarColor, 0.86).fillRect(x, FLOOR - height, width, height);
        g.fillStyle(0x8c9aa0, 0.14).fillRect(x + 4, FLOOR - height, 3, height);
        g.fillStyle(accent, 0.13).fillRect(x - 5, FLOOR - height - 8, width + 10, 7);
        g.lineStyle(1, 0xa8bac1, 0.12).lineBetween(x + width, FLOOR - height + 18, x + width + 12, FLOOR - height + 5);
      }

      g.fillStyle(0x141a20, 1).fillRect(0, FLOOR, WIDTH, HEIGHT - FLOOR);
      g.fillStyle(0x627176, 0.4).fillRect(0, FLOOR, WIDTH, 2);
      g.fillStyle(accent, 0.25).fillRect(0, FLOOR + 5, WIDTH, 2);
      for (let i = 0; i < 28; i += 1) {
        const x = (i * 83 + 19) % WIDTH;
        const y = FLOOR + 15 + ((i * 29) % 54);
        g.lineStyle(1, i % 3 === 0 ? 0x83959a : 0x46565e, 0.28).lineBetween(x, y, x + 15 + (i % 19), y + ((i % 2) ? 2 : -3));
      }
      g.fillStyle(accent, room === 'boss' ? 0.22 : 0.12).fillCircle(480, 264, room === 'boss' ? 180 : 116);
      g.fillStyle(0xc7d7cf, 0.15).fillCircle(480, 258, room === 'boss' ? 83 : 54);
      g.fillStyle(0x131a22, 0.92).fillCircle(480, 258, room === 'boss' ? 66 : 42);

      if (room === 'pressure') {
        g.fillStyle(0xb7504b, 0.2).fillRect(390, FLOOR - 7, 96, 9);
        g.lineStyle(1, 0xf19a73, 0.6).lineBetween(390, FLOOR - 9, 486, FLOOR - 9);
      }
      if (room === 'rest') {
        g.fillStyle(0x82d19c, 0.22).fillCircle(480, FLOOR - 65, 46);
        g.fillStyle(0x9de8b4, 0.68).fillTriangle(480, FLOOR - 102, 495, FLOOR - 65, 480, FLOOR - 34);
        g.fillStyle(0x54a87b, 0.7).fillTriangle(480, FLOOR - 102, 465, FLOOR - 65, 480, FLOOR - 34);
      }
      if (room === 'boss') {
        g.fillStyle(0x131621, 0.5).fillRect(0, 92, WIDTH, 235);
        for (let i = 0; i < 5; i += 1) {
          const x = 46 + i * 215;
          g.lineStyle(2, 0xc4958b, 0.22).lineBetween(x, 95, x + 10, FLOOR - 8);
          g.lineStyle(1, 0xe5c08a, 0.2).lineBetween(x + 18, 126, x + 5, FLOOR - 14);
        }
      }
      this.drawDoor();
    }

    drawDoor() {
      const g = this.doorGraphics;
      if (!g) return;
      g.clear();
      if (this.room === 'boss') return;
      // ⑤ 热身关的门被幽影封住：必须成功弹反一次才开。
      // 只看文字提示是学不会弹反的，第一次遇到必然是乱按——必须强制练一次。
      const sealed = this.room === 'warmup' && this.stats.parries < 1 && !this.warmupSealLifted;
      const open = this.entities.length === 0 && !sealed;
      const color = open ? 0x89d6ab : sealed ? 0xc98aff : 0x58646c;
      g.fillStyle(0x101720, 0.95).fillRoundedRect(867, FLOOR - 116, 64, 116, 18);
      g.lineStyle(2, color, open ? 0.88 : sealed ? 0.85 : 0.5).strokeRoundedRect(867, FLOOR - 116, 64, 116, 18);
      g.fillStyle(color, open ? 0.2 : sealed ? 0.16 : 0.08).fillRoundedRect(875, FLOOR - 107, 48, 103, 15);
      if (sealed) {
        // 封印：交叉的幽影锁链
        g.lineStyle(3, 0xc98aff, 0.9).lineBetween(875, FLOOR - 104, 923, FLOOR - 12);
        g.lineBetween(923, FLOOR - 104, 875, FLOOR - 12);
        g.lineStyle(1, 0xead4ff, 0.8).strokeCircle(899, FLOOR - 58, 15);
      }
      if (open) {
        g.fillStyle(0xe3c68c, 0.95).fillCircle(899, FLOOR - 57, 5);
        g.lineStyle(2, 0xc6e3c8, 0.45).lineBetween(899, FLOOR - 38, 899, FLOOR - 94);
      }
    }

    begin(mode, debugConfig = this.debugConfig) {
      this.mode = mode;
      this.debugMode = mode === 'debug';
      this.debugConfig = this.debugMode ? { stage: debugConfig?.stage || 'rift-p1', godMode: Boolean(debugConfig?.godMode) } : null;
      this.godMode = this.debugMode && this.debugConfig.godMode;
      this.status = 'run';
      this.elapsed = 0;
      this.stats = this.freshStats();
      this.lastRun = null;
      this.combo = 0;
      this.touch.left = false;
      this.touch.right = false;
      this.touch.guard = false;
      this.story.stage = 'hidden';
      document.querySelector('#storyOverlay').hidden = true;
      this.clearEncounterObjects();
      const p = this.playerState;
      Object.assign(p, { hp: this.godMode ? 10000 : 100, maxHp: this.godMode ? 10000 : 100, stamina: 100, energy: (mode === 'boss' || this.debugMode) ? (this.godMode ? ULTIMATE_REQUIRED : 40) : 0, invuln: 0, invulnSource: '', guardBreak: 0, guardRecover: 0, parryWindow: 0, parryCooldown: 0, parryPending: false, parryAnim: 0, dodgeTimer: 0, dodgeCooldown: 0, ultimateTimer: 0, hurtTimer: 0, attack: null, attackCooldown: 0, comboIndex: 0, comboGrace: 0, combo: 0, facing: 1, lastGuard: 0, groundHits: 0 });
      this.player.setVisible(true).clearTint().setFlipX(false);
      this.player.play('hero-idle');
      this.player.setPosition((mode === 'boss' || this.debugMode) ? 216 : 132, FLOOR);
      this.player.body.reset(this.player.x, FLOOR);
      this.player.body.setVelocity(0, 0);
      this.boss = { hp: BOSS_MAX_HP, maxHp: BOSS_MAX_HP, phase: 1, encounter: 'rift', mode: 'hidden', timer: 0, move: '', sequence: 0, lastMove: '', slashCount: 0, slashTempo: 'slow', moveActive: 0, moveRecover: 0, posture: 0, hurtTimer: 0, hitResolved: false, targetX: 0, facing: -1, rushHit: false, ghostTimer: 0 };
      this.bossSprite.setTexture('Idle', 'Idle0000').setOriginFromFrame().setScale(1.2).setVisible(false).setPosition(746, FLOOR).setTint(0xe7798e).setFlipX(true).play('knight-idle');
      this.bossShadow.setVisible(false);
      const debugRoom = this.debugMode ? ({ warmup: 'warmup', pressure: 'pressure', rest: 'rest' }[this.debugConfig.stage] || 'boss') : null;
      this.roomIndex = mode === 'boss' || (this.debugMode && debugRoom === 'boss') ? 3 : 0;
      this.room = mode === 'boss' ? 'boss' : (debugRoom || 'warmup');
      this.buildRoom(this.room);
      this.physics.world.resume();
      document.querySelector('#overlay').classList.add('hidden');
      document.querySelector('#statusDot').classList.add('live');
      document.querySelector('#startBtn').innerHTML = '完整试炼 <b>→</b>';
      document.querySelector('#bossBtn').innerHTML = '直达 Boss <b>↗</b>';
      document.querySelector('#resultSummary').hidden = true;
      this.playMusic('normal');
      // 开场叙事：只在完整流程讲，直达 Boss 不打断练习
      if (mode === 'full') {
        this.time.delayedCall(600, () => { if (this.status === 'run') this.startDialogue(STORY.intro); });
      }
      if (this.debugMode) this.setMessage(`${this.godMode ? '【无敌策划测试】' : '【承伤策划测试】'}快捷键：1/2/3/4 切换巫妖阶段，Q 补满能量，H 回满血。`);
      else this.setMessage(mode === 'boss' ? 'Boss 练习模式：生命与耐力已补满，先认清首领招式预警。' : '热身区：单一近战敌人先教会你观察抬剑与近身距离。');
      if (mode === 'boss' || (this.debugMode && debugRoom === 'boss')) {
        const stage = this.debugConfig?.stage || '';
        this.enterBoss(stage === 'elite' ? false : true);
        if (this.debugMode && stage.startsWith('rift-p')) this.debugSetPhase(Number(stage.slice(-1)));
      } else {
        this.enterRoom(this.debugMode ? ({ warmup: 0, pressure: 1, rest: 2 }[this.debugConfig.stage] || 0) : 0, true);
      }
      const music = document.querySelector('#bgm');
      if (music) music.play().catch(() => {});
      this.updateUi();
    }

    clearEncounterObjects() {
      for (const item of this.entities || []) item.sprite.destroy();
      // 弹幕是普通对象（不是 Sprite），必须走 clearProjectile 去销毁它挂着的
      // core/fx/glow 三个精灵。原来这里直接调 shot.destroy()，
      // 只要重开或换场景时有弹幕存活就会抛 TypeError 整个崩掉。
      for (const shot of this.projectiles || []) this.clearProjectile(shot);
      this.entities = [];
      this.projectiles = [];
      this.telegraph && this.telegraph.clear();
      this.stopBossFlames();
      this.embers = [];
      this.boss.orbs = null;
      this.boss.blitzSpots = null;
      this.meteorRain = null;
      this.meteorCount = 0;
      this.boss.tide = null;
      this.boss.gaze = null;
      this.boss.bloom = null;
      if (this.boss.souls) {
        this.boss.souls.forEach((o) => {
          if (o.spr) o.spr.destroy();
          if (o.halo) o.halo.destroy();
        });
        this.boss.souls = null;
      }
      this.boss.hand = null;
      this.boss.handGone = false;
      this.playerState.grabbed = null;
      if (this.grabGfx) this.grabGfx.clear();
      if (this.grabText) this.grabText.setVisible(false);
      if (this.handGfx) this.handGfx.clear();
      if (this.prayGfx) this.prayGfx.clear();
      if (this.emberGfx) this.emberGfx.clear();
      if (this.pullGfx) this.pullGfx.clear();
      if (this.orbGfx) this.orbGfx.clear();
    }

    enterRoom(index, first = false) {
      this.roomIndex = index;
      const rooms = ['warmup', 'pressure', 'rest', 'boss'];
      this.room = rooms[index];
      this.buildRoom(this.room);
      this.player.setPosition(first ? 150 : 132, FLOOR);
      this.player.body.reset(this.player.x, FLOOR);
      this.player.body.setVelocity(0, 0);
      if (this.room === 'warmup') {
        this.spawnEnemy(570, 'guard', 72, 0);
        this.setMessage('热身：影卫抬剑时按住 F 可减伤；在最后一瞬按 E 可弹反。');
      } else if (this.room === 'pressure') {
        this.spawnEnemy(620, 'guard', 86, 0.3);
        this.spawnEnemy(836, 'ranged', 62, 1.15);
        this.setMessage('压力段：近战与远程分批蓄力；注意远程投射物方向。');
      } else if (this.room === 'rest') {
        const p = this.playerState;
        p.hp = Math.min(100, p.hp + 28);
        p.stamina = 100;
        p.energy = Math.min(100, p.energy + 15);
        this.setMessage('检查点：生命恢复 28，格挡耐力补满。往右进入 Boss 战。');
      } else {
        this.enterBoss(false);
      }
      this.updateUi();
    }

    enterBoss(practice = false) {
      this.room = 'boss';
      this.buildRoom('boss');
      this.clearEncounterObjects();
      this.boss.encounter = practice ? 'rift' : 'elite';
      this.boss.maxHp = practice ? BOSS_MAX_HP : ELITE_MAX_HP;
      this.boss.hp = this.boss.maxHp;
      this.boss.phase = 1;
      this.boss.sequence = 0;
      this.boss.slashCount = 0;
      this.boss.slashTempo = 'slow';
      this.boss.posture = 0;
      this.boss.lastMove = '';
      this.boss.mode = 'intro';
      this.boss.timer = 1.35;
      this.boss.move = '';
      this.boss.hitResolved = false;
      this.setBossAppearance();
      this.bossSprite.setPosition(746, FLOOR).setFlipX(true).setVisible(this.boss.encounter !== 'rift');
      this.playBossAnimation('knight-powerup');
      this.bossShadow.setVisible(true).setPosition(746, FLOOR + 4);
      this.updateBossMoveCardCopy();
      this.player.setPosition(practice ? 216 : 175, FLOOR);
      this.player.body.reset(this.player.x, FLOOR);
      this.player.body.setVelocity(0, 0);
      this.bossLabel.setVisible(true);
      this.setMessage(practice ? '裂隙巫妖登场：看清法术圈、分层魂火和落点符印，移动与跳躍都能創造安全窗口。' : '幽影守卫精英登场：击败它后，裂隙巫妖将从裂隙现身。');
    }

    setBossAppearance() {
      if (this.boss.encounter === 'rift') {
        this.bossSprite.setVisible(false).setAngle(0);
        this.riftArt.setVisible(true);
        this.bossLabel.setColor('#d9bbff');
      } else {
        this.riftArt.clear().setVisible(false);
        this.bossSprite.setTexture('Idle', 'Idle0000').setOriginFromFrame().setScale(1.2).setTint(0xe7798e).setVisible(true);
        this.bossLabel.setColor('#f5dfcf');
      }
    }

    playBossAnimation(animation) {
      if (this.boss.encounter === 'rift') {
        this.bossArtPose = animation;
        this.bossSprite.setVisible(false).setAngle(0);
        return;
      }
      this.bossSprite.setTint(this.boss.encounter === 'rift' ? this.riftBossTint() : 0xe7798e);
      this.bossSprite.setAngle(0);
      this.bossSprite.play(animation, true);
    }

    riftBossTint() {
      return this.boss.phase === 4 ? 0x9865c4 : this.boss.phase === 3 ? 0x7954a6 : this.boss.phase === 2 ? 0x684895 : 0x5d407f;
    }

    drawFinalBoss() {
      const aura = this.bossAura;
      const gear = this.bossAdornment;
      const art = this.riftArt;
      aura.clear();
      gear.clear();
      art.clear();
      if (this.room !== 'boss' || this.boss.encounter !== 'rift' || this.boss.mode === 'hidden' || this.boss.hp <= 0) return;

      const x = this.bossSprite.x;
      const bob = Math.sin(this.elapsed * 2.7) * 7;
      const pulse = 0.75 + Math.sin(this.elapsed * 3.7) * 0.12;
      const phaseColor = this.boss.phase === 5 ? 0xff6a2a
        : this.boss.phase === 4 ? 0xff9af4 : this.boss.phase === 3 ? 0xc78cff : 0x9e77f5;
      const fiery = this.boss.phase === 5 && this.boss.revived;
      // 火焰精灵跟随本体（bob 同步），非 P5 或已倒下时隐藏
      if (this.bossFlames) {
        for (const fl of this.bossFlames) {
          fl.s.setPosition(x + fl.ox, FLOOR + fl.oy + bob).setVisible(fiery && this.boss.hp > 0);
        }
      }
      const cast = this.boss.mode === 'tell' || this.boss.mode === 'active';
      const reach = this.boss.mode === 'tell' ? 1.12 : this.boss.mode === 'active' ? 1.06 : 1;
      const base = FLOOR - 38 + bob;
      const headY = FLOOR - 286 + bob;
      const flare = this.boss.hurtTimer > 0 ? 0xffddfb : phaseColor;

      aura.fillStyle(0x35174f, 0.3).fillCircle(x, FLOOR - 184 + bob, 136 * pulse);
      aura.lineStyle(5, phaseColor, 0.3 + pulse * 0.18).strokeCircle(x, FLOOR - 194 + bob, 108 + Math.sin(this.elapsed * 1.3) * 7);
      aura.lineStyle(2, 0xe7d4ff, 0.34).strokeCircle(x, FLOOR - 194 + bob, 84);
      aura.lineStyle(1, phaseColor, 0.56).beginPath();
      for (let i = 0; i < 8; i += 1) {
        const angle = this.elapsed * 0.3 + i * Math.PI / 4;
        const sx = x + Math.cos(angle) * 106;
        const sy = FLOOR - 194 + bob + Math.sin(angle) * 106;
        aura.lineBetween(sx, sy, sx + Math.cos(angle) * 16, sy + Math.sin(angle) * 16);
        aura.fillStyle(i % 2 ? 0xeee0ff : phaseColor, 0.76).fillCircle(sx, sy, 3);
        const runeX = x + Math.cos(angle + Math.PI / 8) * 128;
        const runeY = FLOOR - 194 + bob + Math.sin(angle + Math.PI / 8) * 128;
        aura.lineStyle(2, 0xe9d6ff, 0.48).lineBetween(runeX - 5, runeY, runeX + 5, runeY);
        aura.lineBetween(runeX, runeY - 5, runeX, runeY + 5);
      }

      // ===== P5「焚身形态」：完全另画一个本体，不再是紫袍巫妖加几簇火 =====
      if (fiery && this.boss.hp > 0) {
        this.drawBossFiery(art, aura, x, bob, phaseColor);
        return;
      }

      art.fillStyle(0x0c0914, 0.96).fillPoints([
        { x: x - 45, y: FLOOR - 254 + bob }, { x: x - 91 * reach, y: FLOOR - 205 + bob },
        { x: x - 68, y: base - 62 }, { x: x - 112, y: base - 14 },
        { x: x - 68, y: base - 22 }, { x: x - 38, y: base + 2 },
        { x: x, y: base - 24 }, { x: x + 42, y: base + 4 },
        { x: x + 73, y: base - 25 }, { x: x + 108, y: base - 8 },
        { x: x + 71, y: base - 75 }, { x: x + 47, y: FLOOR - 254 + bob },
      ], true);
      art.fillStyle(0x292039, 0.98).fillPoints([
        { x: x - 39, y: FLOOR - 252 + bob }, { x: x - 70, y: FLOOR - 203 + bob },
        { x: x - 45, y: base - 24 }, { x: x - 8, y: base - 40 },
        { x: x + 25, y: base - 26 }, { x: x + 65, y: FLOOR - 201 + bob },
        { x: x + 39, y: FLOOR - 252 + bob },
      ], true);
      art.fillStyle(0x5d3976, 0.82).fillPoints([
        { x: x - 37, y: FLOOR - 245 + bob }, { x: x - 7, y: FLOOR - 227 + bob },
        { x: x - 17, y: base - 45 }, { x: x - 42, y: base - 14 },
      ], true);
      art.fillStyle(0x5d3976, 0.82).fillPoints([
        { x: x + 18, y: FLOOR - 231 + bob }, { x: x + 40, y: FLOOR - 249 + bob },
        { x: x + 60, y: base - 22 }, { x: x + 39, y: base - 4 },
      ], true);
      art.fillStyle(0x39314a, 0.98).fillPoints([
        { x: x - 42, y: FLOOR - 243 + bob }, { x: x - 72 * reach, y: FLOOR - 252 + bob },
        { x: x - 84 * reach, y: FLOOR - 220 + bob }, { x: x - 56, y: FLOOR - 198 + bob },
        { x: x - 30, y: FLOOR - 213 + bob },
      ], true);
      art.fillStyle(0x39314a, 0.98).fillPoints([
        { x: x + 39, y: FLOOR - 243 + bob }, { x: x + 70 * reach, y: FLOOR - 253 + bob },
        { x: x + 85 * reach, y: FLOOR - 219 + bob }, { x: x + 56, y: FLOOR - 197 + bob },
        { x: x + 30, y: FLOOR - 213 + bob },
      ], true);
      art.lineStyle(3, 0xb49ac8, 0.86).lineBetween(x - 60, FLOOR - 241 + bob, x - 39, FLOOR - 217 + bob);
      art.lineBetween(x + 61, FLOOR - 241 + bob, x + 39, FLOOR - 217 + bob);
      art.fillStyle(0x17101f, 0.98).fillPoints([
        { x: x - 26, y: FLOOR - 239 + bob }, { x: x, y: FLOOR - 224 + bob },
        { x: x + 27, y: FLOOR - 240 + bob }, { x: x + 22, y: FLOOR - 200 + bob },
        { x: x, y: FLOOR - 186 + bob }, { x: x - 23, y: FLOOR - 201 + bob },
      ], true);
      art.lineStyle(3, 0xd0bfdc, 0.88).lineBetween(x, FLOOR - 221 + bob, x, FLOOR - 188 + bob);
      for (let rib = 0; rib < 4; rib += 1) {
        const ribY = FLOOR - 218 + bob + rib * 8;
        art.lineStyle(2, 0xc5b8d2, 0.78).beginPath();
        art.moveTo(x - 5, ribY).lineTo(x - 18, ribY + 3).lineTo(x - 23, ribY + 7);
        art.moveTo(x + 5, ribY).lineTo(x + 18, ribY + 3).lineTo(x + 23, ribY + 7).strokePath();
      }
      art.fillStyle(phaseColor, 0.94).fillPoints([
        { x: x, y: FLOOR - 238 + bob }, { x: x + 8, y: FLOOR - 226 + bob },
        { x: x, y: FLOOR - 214 + bob }, { x: x - 8, y: FLOOR - 226 + bob },
      ], true);
      art.lineStyle(3, 0xb8a3ca, 0.86).lineBetween(x - 32, FLOOR - 189 + bob, x + 32, FLOOR - 189 + bob);
      art.fillStyle(0x8d6ea5, 0.94).fillCircle(x, FLOOR - 189 + bob, 6);
      art.fillStyle(0x100d19, 1).fillPoints([
        { x: x - 42, y: headY + 40 }, { x: x - 52, y: headY + 9 },
        { x: x - 38, y: headY - 22 }, { x: x - 17, y: headY - 39 },
        { x: x + 17, y: headY - 39 }, { x: x + 41, y: headY - 16 },
        { x: x + 49, y: headY + 15 }, { x: x + 31, y: headY + 39 },
      ], true);
      art.fillStyle(0xc7bed2, this.boss.hurtTimer > 0 ? 1 : 0.95).fillPoints([
        { x: x - 30, y: headY + 26 }, { x: x - 34, y: headY + 4 },
        { x: x - 22, y: headY - 17 }, { x: x - 7, y: headY - 25 },
        { x: x + 18, y: headY - 20 }, { x: x + 30, y: headY + 1 },
        { x: x + 23, y: headY + 25 }, { x: x + 9, y: headY + 34 },
        { x: x - 12, y: headY + 34 },
      ], true);
      art.fillStyle(0x24192e, 1).fillTriangle(x - 27, headY + 1, x - 4, headY - 5, x - 20, headY + 13);
      art.fillStyle(0x24192e, 1).fillTriangle(x + 5, headY - 5, x + 28, headY + 1, x + 18, headY + 13);
      if (fiery) {
        // P5：眼窝换成跳动的火焰色，而不是平涂
        const flick = 0.72 + Math.sin(this.elapsed * 17) * 0.18 + Math.sin(this.elapsed * 31) * 0.10;
        art.fillStyle(0xff3a12, 0.55 * flick + 0.3).fillCircle(x - 16, headY + 3, 9);
        art.fillStyle(0xff3a12, 0.55 * flick + 0.3).fillCircle(x + 17, headY + 3, 9);
        art.fillStyle(0xffd27a, 0.95).fillCircle(x - 16, headY + 3, 4);
        art.fillStyle(0xffd27a, 0.95).fillCircle(x + 17, headY + 3, 4);
        // 骨架之间透出的火光
        art.fillStyle(0xff5a1e, 0.42 * flick + 0.18).fillCircle(x, FLOOR - 206 + bob, 26);
        art.fillStyle(0xffb45c, 0.5 * flick + 0.2).fillCircle(x, FLOOR - 200 + bob, 13);
      } else {
        art.fillStyle(flare, 0.98).fillCircle(x - 16, headY + 3, 5);
        art.fillStyle(flare, 0.98).fillCircle(x + 17, headY + 3, 5);
      }
      art.fillStyle(0x392941, 0.95).fillTriangle(x, headY + 5, x - 5, headY + 20, x + 5, headY + 20);
      art.lineStyle(3, 0x493458, 0.95).lineBetween(x - 15, headY + 27, x + 14, headY + 27);
      art.lineStyle(2, 0x41354d, 0.95).lineBetween(x - 26, headY + 15, x - 18, headY + 25);
      art.lineBetween(x + 26, headY + 15, x + 18, headY + 25);
      for (let tooth = -2; tooth <= 2; tooth += 1) {
        art.lineStyle(1, 0xeee4f2, 0.86).lineBetween(x + tooth * 5, headY + 27, x + tooth * 5, headY + 32);
      }

      art.lineStyle(8, 0x4d395e, 0.98).beginPath();
      art.moveTo(x - 34, headY - 26).lineTo(x - 48, headY - 45).lineTo(x - 54, headY - 74)
        .lineTo(x - 36, headY - 58).lineTo(x - 22, headY - 43).lineTo(x, headY - 64)
        .lineTo(x + 21, headY - 43).lineTo(x + 40, headY - 60).lineTo(x + 52, headY - 76)
        .lineTo(x + 48, headY - 43).lineTo(x + 34, headY - 25).strokePath();
      art.lineStyle(3, 0xd8c3ed, 0.92).lineBetween(x - 1, headY - 62, x - 2, headY - 43);
      art.fillStyle(0xf4d7ff, 0.9).fillCircle(x, headY - 63, 5);

      const orbX = x + 75;
      const orbY = FLOOR - 224 + bob + (cast ? -16 : Math.sin(this.elapsed * 2) * 7);
      art.lineStyle(10, 0x21192a, 0.98).beginPath();
      art.moveTo(x + 36, FLOOR - 221 + bob).lineTo(x + 53, FLOOR - 204 + bob).lineTo(orbX - 10, orbY + 7).strokePath();
      art.lineStyle(4, 0xa99abb, 0.94).lineBetween(x + 38, FLOOR - 220 + bob, orbX - 10, orbY + 7);
      art.lineStyle(3, 0xdfd1e9, 0.92).lineBetween(x + 47, FLOOR - 212 + bob, orbX - 8, orbY + 2);
      art.lineStyle(3, 0xdfd1e9, 0.92).lineBetween(x + 51, FLOOR - 205 + bob, orbX - 5, orbY + 8);
      art.lineStyle(3, 0xdfd1e9, 0.92).lineBetween(x + 54, FLOOR - 198 + bob, orbX - 10, orbY + 14);
      art.fillStyle(0x28183a, 0.98).fillCircle(orbX, orbY, cast ? 25 : 19);
      art.fillStyle(flare, 0.88).fillCircle(orbX, orbY, cast ? 14 : 10);
      art.lineStyle(2, 0xdcc4ff, 0.75).strokeCircle(orbX, orbY, cast ? 31 : 24);
      for (let i = 0; i < 4; i += 1) {
        const angle = this.elapsed * 1.5 + i * Math.PI / 2;
        art.fillStyle(0xe9cfff, 0.84).fillCircle(orbX + Math.cos(angle) * 28, orbY + Math.sin(angle) * 28, 3);
      }
      for (let i = 0; i < 5; i += 1) {
        const chainX = x - 67 + i * 31;
        const chainY = FLOOR - 110 + bob + Math.sin(this.elapsed * 2 + i) * 5;
        art.lineStyle(2, 0xa288b2, 0.54).lineBetween(chainX, chainY - 19, chainX + Math.sin(i + this.elapsed) * 4, chainY + 8);
        art.fillStyle(0xcfc1dd, 0.7).fillCircle(chainX, chainY + 9, 2);
      }
      gear.lineStyle(2, phaseColor, 0.78).strokeCircle(x, FLOOR - 194 + bob, 54);
      gear.lineStyle(1, 0xe8d5ff, 0.72).lineBetween(x - 18, FLOOR - 194 + bob, x + 18, FLOOR - 194 + bob);
      gear.lineStyle(1, 0xe8d5ff, 0.72).lineBetween(x, FLOOR - 212 + bob, x, FLOOR - 176 + bob);
    }

    showRiftStory() {
      this.status = 'story';
      this.physics.world.pause();
      this.story.stage = 'narrative';
      document.querySelector('#overlay').classList.add('hidden');
      document.querySelector('#storyNarrative').hidden = false;
      document.querySelector('#storyChoice').hidden = true;
      document.querySelector('#storyOverlay').hidden = false;
      document.querySelector('#statusDot').classList.remove('live');
    }

    showStoryChoice() {
      if (this.status !== 'story') return;
      this.story.stage = 'choice';
      document.querySelector('#storyNarrative').hidden = true;
      document.querySelector('#storyChoice').hidden = false;
      document.querySelector('#challengeRiftBtn').focus();
    }

    skipStory() {
      if (this.status === 'story' && this.story.stage === 'narrative') this.showStoryChoice();
    }

    acceptRiftChallenge() {
      if (this.status !== 'story' || this.story.stage !== 'choice') return;
      document.querySelector('#storyOverlay').hidden = true;
      this.status = 'run';
      this.physics.world.resume();
      this.enterRiftLord();
    }

    declineRiftChallenge() {
      if (this.status !== 'story' || this.story.stage !== 'choice') return;
      document.querySelector('#storyOverlay').hidden = true;
      this.status = 'leave';
      this.physics.world.pause();
      document.querySelector('#overlayTitle').textContent = '你暂缓追入裂隙';
      document.querySelector('#overlayText').textContent = '幽影峡谷暂时恢复了寂静。裂隙仍在远处等待；你可以重新挑战整段试炼，或直接进入幕后黑手的战场。';
      document.querySelector('#startBtn').innerHTML = '重新进入峡谷 <b>↻</b>';
      document.querySelector('#bossBtn').innerHTML = '之后直面巫妖 <b>↗</b>';
      document.querySelector('#resultSummary').hidden = true;
      document.querySelector('#overlay').classList.remove('hidden');
    }

    update(time, delta) {
      if (this.status !== 'run') return;
      const dt = Math.min(delta / 1000, 0.05);
      this.elapsed += dt;
      this.messageTimer = Math.max(0, this.messageTimer - dt);
      this.updateDialogue(dt);
      // ① 对话期间必须整体冻结。原来只停了 玩家/敌人/Boss，
      // 漏了 updateProjectiles——玩家在念台词时会被飞来的冥火打死。
      // 这里直接早退，只保留画面演出与 UI，玩法逻辑一律不跑。
      if (this.dialogueActive) {
        this.drawEmbers();
        this.drawOrbs();
        this.drawGrabUi();
        this.drawFinalBoss();
        this.drawPlayerDefense();
        this.drawBossBars();
        this.drawVignette();
        this.updateUi();
        return;
      }
      this.updateFinalDive(dt);
      this.updatePray(dt);
      this.updateHand(dt);
      this.updatePlayer(dt);
      this.updateEnemies(dt);
      this.updateBoss(dt);
      this.updateOrbs(dt);
      this.updateMeteorRain(dt);
      this.updateTide(dt);
      this.updateGaze(dt);
      this.updateBloom(dt);
      this.updateSouls(dt);
      this.updateProjectiles(dt);
      this.updateEffects(dt);
      this.updateEmbers(dt);
      this.drawEmbers();
      this.drawOrbs();
      this.drawHand();
      this.drawPray();
      this.drawFinalBoss();
      this.updateTelegraph();
      this.drawPlayerDefense();
      this.drawGrabUi();
      this.drawDebugPanel();
      this.drawBossBars();
      this.drawDoor();
      this.drawVignette();
      this.updateCamera();
      this.updateUi();
    }

    updatePlayer(dt) {
      const p = this.playerState;
      const justDown = Phaser.Input.Keyboard.JustDown;
      // 被骸骨巨手抓住：完全无法移动，只能按 J 打巨手
      if (p.grabbed) {
        // ② 安全网：只要手已经没了（被打碎 / Boss 燃尽 / 清场），立刻放开。
        // 手没了的时候 updateHand 会直接 return，抓取计时器不再递减，
        // 没有这层保护玩家会被永久钉住。
        if (!this.boss.hand || this.boss.hand.destroyed) {
          this.releaseGrab(false);
          return;
        }
        this.player.body.setVelocity(0, 0);
        // 抖动：一眼看出被控住了，而不是站着不动
        this.player.x = p.grabbed.x + Math.sin(this.elapsed * 42) * 3.2;
        this.player.play('hero-hurt', true);
        // 攻击键的轮询在函数后半段，这里是提前 return 的，
        // 必须自己把 J 的判定和冷却补回来，否则玩家永远打不碎巨手。
        p.attackCooldown = Math.max(0, p.attackCooldown - dt);
        if (justDown(this.keys.attack)) this.tryAttack();
        return;
      }
      // 祈祷中：不能移动，也不能起手攻击
      if (p.prayTimer > 0) {
        this.player.body.setVelocityX(0);
        this.player.play('hero-idle', true);
        return;
      }
      // 攻击结束后把动画速度还原，否则会连带把跑步/待机也放快
      if (!p.attack && this.player.anims.timeScale !== 1) this.player.anims.timeScale = 1;
      p.invuln = Math.max(0, p.invuln - dt);
      if (p.invuln === 0) p.invulnSource = '';
      p.guardBreak = Math.max(0, p.guardBreak - dt);
      p.guardRecover = Math.max(0, p.guardRecover - dt);
      p.parryCooldown = Math.max(0, p.parryCooldown - dt);
      p.parryAnim = Math.max(0, p.parryAnim - dt);
      p.dodgeCooldown = Math.max(0, p.dodgeCooldown - dt);
      p.ultimateTimer = Math.max(0, p.ultimateTimer - dt);
      p.prayTimer = Math.max(0, (p.prayTimer || 0) - dt);
      p.prayCooldown = Math.max(0, (p.prayCooldown || 0) - dt);
      p.hurtTimer = Math.max(0, p.hurtTimer - dt);
      p.attackCooldown = Math.max(0, p.attackCooldown - dt);
      p.comboGrace = Math.max(0, p.comboGrace - dt);
      if (p.parryWindow > 0) {
        p.parryWindow = Math.max(0, p.parryWindow - dt);
        if (p.parryWindow === 0 && p.parryPending) {
          p.parryPending = false;
          this.stats.parryMisses += 1;
          p.guardRecover = 0.16;
          this.setMessage('彈反時機落空：看Boss動作接近出手時再按 E。');
        }
      }
      const faceLeft = this.keys.left.isDown || this.keys.leftArrow.isDown || this.touch.left;
      const faceRight = this.keys.right.isDown || this.keys.rightArrow.isDown || this.touch.right;
      const faceInput = (faceRight ? 1 : 0) - (faceLeft ? 1 : 0);
      if (faceInput !== 0) {
        p.facing = faceInput;
        this.player.setFlipX(faceInput < 0);
      }
      if (p.attack) this.advanceAttack(dt);

      if (justDown(this.keys.pause)) this.togglePause();
      if (justDown(this.keys.jump) || justDown(this.keys.up) || justDown(this.keys.upArrow)) this.jump();
      if (justDown(this.keys.attack)) this.tryAttack();
      // ① 弹反必须是「重新按下」：按住不放只算一次。
      //    原来用 JustDown，实测按住会反复触发，parryWindow 被无限刷新，
      //    等于窗口一直开着 —— 弹反变成必然成功。
      const _parryNow = this.keys.parry.isDown;
      if (_parryNow && !this._parryWasDown) this.parry();
      this._parryWasDown = _parryNow;
      if (justDown(this.keys.dodge) || justDown(this.keys.dodgeAlt)) this.dodge();
      if (justDown(this.keys.ultimate) || justDown(this.keys.ultimateAlt)) this.ultimate();
      if (justDown(this.keys.pray)) this.pray();

      const guardHeld = this.keys.guard.isDown || this.touch.guard;
      // 举盾即时取消攻击动作（guard cancel），避免"已经按F却还在攻击里被打"
      if (guardHeld && p.attack && p.guardBreak <= 0 && p.guardRecover <= 0) {
        p.attack = null;
        p.attackCooldown = 0.12;
      }
      const left = this.keys.left.isDown || this.keys.leftArrow.isDown || this.touch.left;
      const right = this.keys.right.isDown || this.keys.rightArrow.isDown || this.touch.right;
      const move = (right ? 1 : 0) - (left ? 1 : 0);
      const blocking = guardHeld && p.stamina > 0 && p.guardBreak <= 0 && p.guardRecover <= 0 && p.dodgeTimer <= 0 && p.ultimateTimer <= 0 && !p.attack;
      if (move !== 0) {
        p.facing = move;
        this.player.setFlipX(move < 0);
      }

      if (p.dodgeTimer > 0) {
        p.dodgeTimer = Math.max(0, p.dodgeTimer - dt);
        this.player.body.setVelocityX(p.facing * 425);
        if (Math.random() < dt * 13) this.spawnAfterImage(this.player, 0x9dd8c8, 0.2);
      } else if (p.ultimateTimer > 0 || p.guardBreak > 0 || p.guardRecover > 0 || p.hurtTimer > 0) {
        this.player.body.setVelocityX(0);
      } else {
        const moveScale = blocking ? 0.48 : p.attack ? 0.34 : 1;
        this.player.body.setVelocityX(move * (move ? 245 * moveScale : 0));
      }

      if (guardHeld && !blocking && p.stamina <= 0 && p.guardBreak <= 0) {
        p.guardBreak = 0.42;
        this.playSfx('sfx_guard_break', 0.34);
        this.setMessage('耐力耗尽：格挡破防，暂时不能防守。');
      }
      if (blocking) {
        p.stamina = Math.max(0, p.stamina - 4 * dt);
        p.lastGuard = 0;
      } else {
        p.lastGuard += dt;
        if (p.lastGuard > 0.72) p.stamina = Math.min(100, p.stamina + 26 * dt);
      }

      if (p.ultimateTimer > 0) {
        this.player.play('hero-attack', true);
      } else if (p.hurtTimer > 0) {
        this.player.play('hero-hurt', true);
      } else if (p.guardBreak > 0) {
        this.player.play('hero-jump', true);
      } else if (p.parryAnim > 0) {
        this.player.play('hero-attack', true);
      } else if (!p.attack && p.dodgeTimer <= 0 && p.guardRecover <= 0) {
        if (!this.player.body.blocked.down && !this.player.body.touching.down) this.player.play('hero-jump', true);
        else if (blocking) this.player.play('hero-idle', true);
        else if (Math.abs(this.player.body.velocity.x) > 25) this.player.play('hero-run', true);
        else this.player.play('hero-idle', true);
      }
      // 受击白闪已烘焙进 hero-hurt 序列帧（冲击帧整帧白化），
      // 这里不再叠加 tint，否则 0.42s 内会被双重染色、盔甲细节全糊。
      if (p.ultimateTimer > 0) this.player.setTint(0xffd77a);
      else this.player.clearTint();

      // ⑤ 教学门：热身关必须先成功弹反一次，门才会开
      const parryGate = this.room === 'warmup' && this.stats.parries < 1;
      // ② 防死锁：热身关的门要求「成功弹反一次」才开。
      //    如果玩家一直弹不中，就会被永久卡住——作品集 Demo 不能出现硬卡死。
      //    清完小怪 20 秒仍未弹反成功，封印自动消退。
      if (this.room === 'warmup' && this.entities.length === 0
          && this.stats.parries < 1 && !this.warmupSealLifted) {
        this.warmupSealTimer = (this.warmupSealTimer || 0) + dt;
        if (this.warmupSealTimer > 20) {
          this.warmupSealLifted = true;
          this.setMessage('封印自行消退了——出口已開。下次在敵人抬手的瞬間按 E 試試彈反。');
        } else if ((this.warmupSealTimer % 6) < dt && this.warmupSealTimer > 6) {
          this.setMessage(`封印還在：需要成功彈反一次。按 E 彈反，或等 ${Math.ceil(20 - this.warmupSealTimer)} 秒後封印自動消退。`);
        }
      }
      if (this.room !== 'boss' && this.player.x > 882 && this.entities.length === 0 && !parryGate) {
        this.enterRoom(this.roomIndex + 1);
      } else if (parryGate && this.player.x > 830 && this.entities.length === 0) {
        this.parryGateTimer = (this.parryGateTimer || 0) - dt;
        if (this.parryGateTimer <= 0) {
          this.parryGateTimer = 5;
          this.setMessage('門被幽影封住了。按 E 精準彈反接下近衛的一次攻擊，封印才會碎。');
        }
      }
      this.player.x = clamp(this.player.x, 52, this.arenaMaxX());
    }

    performAction(action) {
      if (this.status !== 'run') return;
      if (action === 'jump') this.jump();
      else if (action === 'attack') this.tryAttack();
      else if (action === 'guard') this.touch.guard = true;
      else if (action === 'parry') this.parry();
      else if (action === 'dodge') this.dodge();
      else if (action === 'ultimate') this.ultimate();
      else if (action === 'pray') this.pray();
    }

    jump() {
      const p = this.playerState;
      if (this.status !== 'run' || !this.player.body.blocked.down && !this.player.body.touching.down) return;
      if (p.guardBreak > 0 || p.attack || p.dodgeTimer > 0 || p.ultimateTimer > 0) return;
      this.player.body.setVelocityY(-555);
      this.stats.jumps += 1;
      this.setMessage('起跳：地面震荡可通过跳跃跨过。');
    }

    tryAttack() {
      if (this.status !== 'run') return;
      const p = this.playerState;
      // 被抓住时，攻击直接打在巨手身上——打碎才能脱身
      if (p.grabbed) {
        if (p.attackCooldown > 0) return;
        p.attackCooldown = 0.32;
        this.player.play('hero-attack', true);
        this.spawnBurst(p.grabbed.x, FLOOR - 92, 0xe8d19a, 14);
        this.playSfx('sfx-hit', 0.32);
        this.damageHand(24);
        return;
      }
      if (p.guardBreak > 0 || p.guardRecover > 0 || p.dodgeTimer > 0 || p.ultimateTimer > 0 || p.hurtTimer > 0) return;
      if (p.attack) {
        if (!p.attack.queued && p.attack.timer >= p.attack.duration * 0.45 && p.attack.timer <= p.attack.duration * 0.82 && p.comboIndex < 2) {
          p.attack.queued = true;
          this.setMessage('连段已接续：第三击伤害高，但收招更长。');
        }
        return;
      }
      if (p.attackCooldown > 0) return;
      if (p.comboGrace <= 0) p.comboIndex = 0;
      this.startAttack(p.comboIndex);
    }

    startAttack(index) {
      const p = this.playerState;
      const move = ATTACKS[index];
      p.comboIndex = index;
      p.attack = { ...move, timer: 0, hit: false, queued: false, index, facing: p.facing };
      // 三段连击各有一版音高递增的挥砍声，听感上能分辨连段进度
      this.playSfx(`sfx_slash_${index + 1}`, 0.30);
      // hero-attack 序列帧固定是 10 帧 @15fps = 0.667 秒。
      // 动作加速后如果不同步加快播放，挥砍会在半途被截断——那就反而更迟钝了。
      // 这里按 duration 反推 timeScale，让动画正好铺满整个招式。
      this.player.play(move.anim);
      this.player.anims.timeScale = (10 / 15) / move.duration;
      p.attackCooldown = 0.07;
    }

    advanceAttack(dt) {
      const p = this.playerState;
      const attack = p.attack;
      attack.timer += dt;
      if (!attack.hit && attack.timer >= attack.activeFrom && attack.timer <= attack.activeTo) {
        attack.hit = true;
        this.resolvePlayerAttack(attack);
      }
      if (attack.timer >= attack.duration) {
        const queued = attack.queued && attack.index < 2;
        p.attack = null;
        p.attackCooldown = 0.06;
        if (queued) {
          p.comboGrace = 0.9;
          this.startAttack(attack.index + 1);
        } else {
          p.comboGrace = 0.95;
          p.comboIndex = 0;
          p.combo = 0;
        }
      }
    }

    resolvePlayerAttack(attack) {
      const p = this.playerState;
      const target = this.room === 'boss' && this.boss.mode !== 'hidden' && this.boss.hp > 0
        ? { x: this.bossSprite.x, y: this.bossSprite.y, boss: true }
        : this.nearestEnemy();
      if (!target) {
        this.stats.whiffs += 1;
        this.setMessage('揮空：調整面向與距離，等敵人進入攻擊範圍。');
        return;
      }
      if (target.boss && (this.boss.mode === 'intro' || this.boss.mode === 'transition')) {
        this.stats.whiffs += 1;
        this.setMessage('Boss 階段演出期間暫不可受擊；保留奧義，等招式或收招時再出手。');
        this.spawnSlashTrail(attack.index);
        return;
      }
      const dx = target.x - this.player.x;
      // ① 贴身宽恕对所有目标生效，不再只给 Boss。
      //    站在宽敌人「边缘」时，它的中心点可能已经落到你身后，
      //    原来的朝向判定会算成背身 → 明明贴着打却挥空。
      const closeOverlap = Math.abs(dx) <= 72;
      const inFront = closeOverlap || Math.sign(dx || 1) === attack.facing;
      // ① 跳跃时玩家 y 会抬起约 150px，原来固定的 <104 会让所有空中挥砍落空。
      // 改成按「对地高度差」判定：空中挥砍能打到地面目标，地面挥砍仍是严格同层。
      const airBonus = this.isPlayerAirborne() ? 200 : 0;
      const sameLane = Math.abs(target.y - this.player.y) < 104 + airBonus;
      // ② 判定不能只算中心到中心：敌人越宽，剑尖碰到它「边缘」时中心距越大。
      //    把目标半宽算进来，做到「视觉碰到 = 判定成立」；上限 52px 防止变成隔空打击。
      const targetHalfW = target.boss
        ? (this.bossSprite.displayWidth || 0) * 0.5
        : (target.sprite && target.sprite.displayWidth ? target.sprite.displayWidth * 0.5 : 0);
      const edgeReach = attack.reach + Math.min(52, targetHalfW);
      if (!inFront || Math.abs(dx) > edgeReach || !sameLane) {
        this.stats.whiffs += 1;
        this.setMessage('揮空：攻擊只判定前方有效距離，不會隔空或背身命中。');
        this.spawnSlashTrail(attack.index);
        return;
      }
      if (target.boss) {
        const recovery = this.boss.mode === 'recover' || this.boss.mode === 'broken';
        // ② 原来普通命中只有 ×0.38，一套三连（14+20+30）实际只打 24 点，
        // 1100 血要磨 46 套，纯折磨。现在普通 ×0.72、收招/破架 ×1.6，
        // 既保证「打收招明显更赚」，又让普通输出不至于像白打。
        const multiplier = recovery ? 1.6 : 0.72;
        const damage = Math.max(1, Math.round(attack.damage * multiplier));
        this.damageBoss(damage, recovery);
        p.combo += 1;
        p.energy = Math.min(100, p.energy + 4);
        this.stats.hits += 1;
        this.spawnSlashTrail(attack.index);
      } else {
        const enemy = this.entities.find((item) => !item.dead && item.sprite === target.sprite);
        if (!enemy) return;
        enemy.hp -= attack.damage;
        this.playSfx('sfx_hit_flesh', 0.32);
        enemy.hurtTimer = 0.16;
        enemy.sprite.body.setVelocityX(0);
        enemy.sprite.play('knight-impact', true);
        enemy.sprite.setTint(0xf4d9b8);
        this.time.delayedCall(90, () => { if (enemy.sprite.active) enemy.sprite.setTint(0xd58972); });
        p.combo += 1;
        p.energy = Math.min(100, p.energy + 5);
        this.stats.hits += 1;
        this.spawnSlashTrail(attack.index);
        this.floatText(enemy.sprite.x, enemy.sprite.y - 95, `-${attack.damage}`, '#f5d8a5');
        if (enemy.hp <= 0) this.killEnemy(enemy);
      }
    }

    nearestEnemy() {
      let best = null;
      let bestDistance = Infinity;
      for (const enemy of this.entities) {
        if (enemy.dead) continue;
        const distance = Math.abs(enemy.sprite.x - this.player.x);
        if (distance < bestDistance) { best = enemy; bestDistance = distance; }
      }
      if (!best) return null;
      return { x: best.sprite.x, y: best.sprite.y, sprite: best.sprite };
    }

    spawnEnemy(x, type, hp, delay = 0) {
      const sprite = this.physics.add.sprite(x, FLOOR, 'Idle', 'Idle0000');
      sprite.setOriginFromFrame().setScale(type === 'ranged' ? 0.72 : 0.78).setTint(type === 'ranged' ? 0xd3a67e : 0xd58972).setDepth(11).setFlipX(true);
      // Ground enemies are not meant to jump or fall; keep them on the arena floor.
      sprite.body.setAllowGravity(false);
      sprite.body.setSize(38, 74);
      sprite.body.setOffset((sprite.width - 38) / 2, sprite.height - 74);
      sprite.setCollideWorldBounds(true);
      this.physics.add.collider(sprite, this.floorBody);
      sprite.play('knight-idle');
      this.entities.push({ sprite, type, hp, state: delay > 0 ? 'wait' : 'approach', timer: delay, cooldown: type === 'ranged' ? 1.2 : 0.5, dead: false, hurtTimer: 0, lockedX: this.player.x, hitResolved: false });
    }

    updateEnemies(dt) {
      for (const enemy of this.entities) {
        if (enemy.dead) continue;
        enemy.hurtTimer = Math.max(0, enemy.hurtTimer - dt);
        enemy.cooldown = Math.max(0, enemy.cooldown - dt);
        if (enemy.hurtTimer > 0) continue;
        const dx = this.player.x - enemy.sprite.x;
        const distance = Math.abs(dx);
        const facing = Math.sign(dx || -1);
        const attackFacing = enemy.state === 'tell' || enemy.state === 'active'
          ? (enemy.lockedDirection || facing)
          : facing;
        enemy.sprite.setFlipX(attackFacing < 0);
        if (enemy.state === 'wait') {
          enemy.timer -= dt;
          if (enemy.timer <= 0) enemy.state = 'approach';
        } else if (enemy.state === 'approach') {
          if (enemy.type === 'guard' && distance > 124) {
            enemy.sprite.body.setVelocityX(facing * 118);
            enemy.sprite.play('knight-run', true);
          } else {
            enemy.sprite.body.setVelocityX(0);
            enemy.sprite.play('knight-idle', true);
            if (enemy.cooldown <= 0) {
              enemy.state = 'tell';
              enemy.timer = enemy.type === 'guard' ? 0.7 : 0.88;
              enemy.lockedX = this.player.x;
              enemy.lockedDirection = facing;
              enemy.hitResolved = false;
              enemy.sprite.play(enemy.type === 'guard' ? 'knight-attack1' : 'knight-powerup', true);
              this.setMessage(enemy.type === 'guard' ? '影衛抬劍：面向它格擋，貼身可試彈反。' : '影弩蓄力：投射物沿直線飛來，可跳、閃或正面格擋。');
            }
          }
        } else if (enemy.state === 'tell') {
          enemy.sprite.body.setVelocityX(0);
          enemy.timer -= dt;
          if (enemy.timer <= 0) {
            enemy.state = 'active';
            enemy.timer = 0.17;
            enemy.hitResolved = false;
            if (enemy.type === 'ranged') {
              this.spawnProjectile(enemy.sprite.x + enemy.lockedDirection * 36, FLOOR - 88, enemy.lockedDirection, 270, 15, '影弩');
            } else if (Math.abs(this.player.x - enemy.sprite.x) <= 132 && Math.sign(this.player.x - enemy.sprite.x || 1) === enemy.lockedDirection) {
              // ① 弹反范围必须 ≥ 判定范围：range 132 > parryRange 106 会形成死区
              //    （被打中但弹不了）。Boss 招式上一轮已修，这条是小怪。
              this.resolveIncoming({ source: '影衛突刺', damage: 19, attackerX: enemy.sprite.x, range: 132, guardable: true, parryable: true, parryRange: 152 });
            } else {
              this.setMessage('影衛突刺落空：它不會在出手後追蹤你。');
            }
          }
        } else if (enemy.state === 'active') {
          enemy.timer -= dt;
          if (enemy.timer <= 0) {
            enemy.state = 'recover';
            enemy.timer = enemy.type === 'guard' ? 0.86 : 1.1;
            enemy.sprite.play('knight-impact2', true);
          }
        } else if (enemy.state === 'recover') {
          enemy.timer -= dt;
          if (enemy.timer <= 0) {
            enemy.state = 'approach';
            enemy.cooldown = enemy.type === 'guard' ? 0.55 : 0.9;
          }
        }
      }
      this.entities = this.entities.filter((enemy) => !enemy.dead || enemy.sprite.active);
    }

    killEnemy(enemy) {
      enemy.dead = true;
      this.playSfx('sfx_enemy_death', 0.34);
      enemy.sprite.body.enable = false;
      enemy.sprite.play('knight-death', true);
      this.stats.enemyKills += 1;
      this.playerState.energy = Math.min(100, this.playerState.energy + 14);
      this.time.delayedCall(600, () => { if (enemy.sprite.active) enemy.sprite.destroy(); });
      this.setMessage('影衛被擊倒：前方闸门开放，进入下一段。');
    }

    spawnProjectile(x, y, direction, speed, damage, source) {
      const color = source === '影弩' ? 0xe6a06c : source === '追魂冥火' ? 0xb98cff : 0xe17d9b;
      if (source === '追魂冥火') this.playSfx('sfx_soulfire', 0.30);
      const glow = this.add.ellipse(x, y, 38, 22, color, 0.25).setDepth(13);
      // 追魂冥火换成序列帧球体；影弩保留原来的纯色圆点样式。
      const soul = source === '追魂冥火';
      const core = soul ? null : this.add.circle(x, y, 8, color, 0.95).setDepth(14);
      const sf = this.skillFx('fx-soulfire', 'fx_soulfire');
      const fx = soul ? this.add.sprite(x, y, sf.tex, 0).setDepth(14).setScale(0.66).play(sf.anim) : null;
      this.projectiles.push({ x, y, direction, speed, damage, source, age: 0, core, fx, glow, color });
    }

    updateProjectiles(dt) {
      for (const shot of this.projectiles) {
        shot.age += dt;
        shot.x += shot.direction * shot.speed * dt;
        if (shot.core) shot.core.setPosition(shot.x, shot.y);
        if (shot.fx) shot.fx.setPosition(shot.x, shot.y);
        shot.glow.setPosition(shot.x, shot.y);
        shot.glow.setScale(1 + Math.sin(shot.age * 17) * 0.08);
        if (shot.age > 4 || shot.x < 20 || shot.x > WORLD_W + 20) {
          shot.dead = true;
          continue;
        }
        const close = Math.abs(shot.x - this.player.x) < 29 && Math.abs(shot.y - (this.player.y - 72)) < 48;
        if (close) {
          // 法术可以弹，但标成 spell——弹反它不给 Boss 架势，所以不会让它掉血
          const result = this.resolveIncoming({ source: shot.source, damage: shot.damage, attackerX: shot.x - shot.direction * 18, range: 65, guardable: true, parryable: true, parryRange: 82, spell: true });
          if (result !== 'none') {
            shot.dead = true;
            this.playSfx('sfx_soulfire_hit', 0.28);
            const sh = this.skillFx('fx-soulfire-hit', 'fx_soulfire_hit');
            this.spawnFx(sh.anim, sh.tex, shot.x, shot.y, 0.7, 25);
          }
        }
      }
      for (const shot of this.projectiles) {
        if (shot.dead) this.clearProjectile(shot);
      }
      this.projectiles = this.projectiles.filter((shot) => !shot.dead);
    }

    updateBoss(dt) {
      const b = this.boss;
      if (this.room !== 'boss' || b.mode === 'hidden') return;
      b.hurtTimer = Math.max(0, b.hurtTimer - dt);
      b.ghostTimer = Math.max(0, b.ghostTimer - dt);

      // P4 残血回血（反拖延机制）：停止攻击超过 4 秒，Boss 汲取暗影之力回血
      b.regenIdle = (b.regenIdle || 0) + dt;
      b.regenFxTimer = Math.max(0, (b.regenFxTimer || 0) - dt);
      const REGEN_CAP = b.maxHp * 0.38;
      if (b.encounter === 'rift' && b.phase === 4 && b.regenIdle > 4 && b.hp < REGEN_CAP && b.mode !== 'transition' && b.mode !== 'intro' && b.mode !== 'broken') {
        const before = b.hp;
        b.hp = Math.min(REGEN_CAP, b.hp + 9 * dt);
        if (b.regenFxTimer <= 0) {
          b.regenFxTimer = 0.28;
          // 回血必须一眼看出是"回"不是"掉"。原来用红色粒子 + 红色数字，
          // 玩家会误以为有什么东西在打 Boss（包括以为是自己的技能打到自己）。
          // 改成绿色 + 「回復」字样 + 上浮粒子。
          this.spawnBurst(this.bossSprite.x, FLOOR - 112, 0x6fe0a8, 8);
          const heal = Math.max(1, Math.round(b.hp - before));
          this.floatText(this.bossSprite.x, FLOOR - 224, `回復 +${heal}`, '#8affc0');
          for (let i = 0; i < 3; i += 1) {
            // 注意：b 是 this.boss（状态对象），bossSprite 在 Scene 上，必须是 this.bossSprite
            const mote = this.add.circle(this.bossSprite.x + (Math.random() - 0.5) * 70,
              FLOOR - 60 - Math.random() * 60, 2.4, 0x8affc0, 0.9).setDepth(22);
            this.tweens.add({ targets: mote, y: mote.y - 70 - Math.random() * 50, alpha: 0,
              duration: 620 + Math.random() * 260, onComplete: () => mote.destroy() });
          }
          this.setMessage('裂隙巫妖正在汲取暗影之力回血！快攻擊它打斷回復！');
        }
      }

      if (b.mode === 'burnout') { b.timer -= dt; return; }
      this.updateBossEmbers(dt);

      if (b.mode === 'revive') {
        b.timer -= dt;
        if (b.timer <= 0) {
          b.mode = 'idle';
          b.timer = 0.35;
          b.sequence = 0;
          this.setMessage('亡者归来：它的生命开始自燃——撑到烧尽，或者直接把它打散。');
        }
        return;
      }

      if (b.mode === 'intro') {
        b.timer -= dt;
        if (b.timer <= 0) {
          b.mode = 'idle';
          b.timer = 0.8;
          b.sequence = 0;
          b.slashCount = 0;
          b.slashTempo = 'slow';
          this.playBossAnimation('knight-idle');
          this.setMessage(b.encounter === 'elite' ? '精英戰：幽影橫斬可格擋；正面近身抓準時機按 E 彈反。' : '裂隙巫妖現身：留意靈魂震爆、追魂冥火與地面亡魂印。');
        }
        return;
      }

      // P5 自燃烧条：血量被时间持续往下拉，但玩家输出可以把它压得更低
      if (b.phase === 5 && b.revived) {
        b.burn = Math.max(0, (b.burn ?? PHASE5_BURN_SECONDS) - dt);
        // 第二阶段：烧条过半就换招、提速，并来一次明确的表现
        const p5s = (b.burn / PHASE5_BURN_SECONDS) > 0.5 ? 1 : 2;
        if (p5s !== b.p5Stage) {
          const first = b.p5Stage === undefined;
          b.p5Stage = p5s;
          if (p5s === 2 && !first) {
            b.sequence = 0;
            b.mode = 'transition';
            b.timer = 0.85;
            b.move = '';
            b.hitResolved = true;
            this.playSfx('sfx_boss_phase', 0.55);
            this.cameras.main.flash(300, 220, 70, 30);
            this.cameras.main.shake(480, 0.014);
            this.setMessage('亡者歸來 · 第二階段：它開始下隕石雨了。');
            for (let i = 0; i < 3; i += 1) {
              this.time.delayedCall(i * 160, () => {
                const rf = this.skillFx('fx-soulburst', 'fx_soulburst');
                this.spawnFx(rf.anim, rf.tex, this.bossSprite.x, FLOOR - 40, 3 + i, 9);
              });
            }
          }
        }
        const cap = b.maxHp * (b.burn / PHASE5_BURN_SECONDS);
        if (b.hp > cap) b.hp = cap;
        if (b.hp <= 0) {
          this.beginBossBurnout();
          return;
        }
        // ③ 灼热光环：贴近会被持续灼伤。
        // 没有它，P5 的最优解就是「站远处等 35 秒」，玩家没有任何决策；
        // 有了它，就必须「进→打一套→退」，把生存和输出真正绑在一起。
        const dist = Math.abs(this.player.x - this.bossSprite.x);
        // ⑤ 越近烧得越快：140px 边缘约 2 点/次，贴脸约 11 点/次，间隔也从 1.0s 缩到 0.38s
        if (dist < 140 && this.playerState.hurtTimer <= 0 && this.playerState.invuln <= 0) {
          const closeness = 1 - dist / 140;
          this.heatAccum = (this.heatAccum || 0) + dt;
          if (this.heatAccum >= 1.0 - 0.62 * closeness) {
            this.heatAccum = 0;
            const burnDmg = Math.max(2, Math.round(2 + 9 * closeness));
            this.floatText(this.player.x, this.player.y - 122, `灼傷 ${burnDmg}`, '#ff9a5c');
            this.playerDamage('灼熱光環', burnDmg);
          }
        } else {
          this.heatAccum = 0;
        }
      }

      const dx = this.player.x - this.bossSprite.x;
      const facing = Math.sign(dx || -1);
      if (b.mode === 'idle' || b.mode === 'recover') {
        b.facing = facing;
        this.bossSprite.setFlipX(facing < 0);
        // ③ 裂隙巫妖原来在待机时完全不移动，玩家绕远就安全了，压迫感全无。
        // 现在距离拉开就朝玩家漂移（比精英慢，但仍会贴上来）。
        const chase = b.encounter === 'elite' ? 218 : 260;
        // ③ 原来巫妖待机漂移只有 104（比精英 138 还慢），P5 最凶的形态反而最慢。
        //    改成按阶段提速：P5 一/二阶段 190 / 224。
        const chaseSpeed = b.encounter === 'elite' ? 138
          : (b.phase === 5 && b.revived ? (b.p5Stage === 2 ? 224 : 190)
            : b.phase >= 3 ? 132 : 104);
        if (b.mode === 'idle' && Math.abs(dx) > chase && b.hp > 0) {
          this.bossSprite.body && this.bossSprite.body.setVelocityX(facing * chaseSpeed * 1.05);
          this.bossSprite.x = clamp(this.bossSprite.x + facing * chaseSpeed * dt, 90, this.bossMaxX());
          if (b.encounter === 'elite') this.playBossAnimation('knight-run');
        } else {
          this.playBossAnimation('knight-idle');
        }
      }

      // ④ 裂隙牵引：直接剥夺玩家对站位的控制权，把他往灼热光环里拽。
      // 这才是压迫感的核心——不是躲不掉，而是"站不住"。
      if (b.mode === 'active' && b.move === 'pull' && b.encounter === 'rift') {
        const dir = Math.sign(this.bossSprite.x - this.player.x) || -1;
        const k = 1 - Math.max(0, b.timer) / Math.max(0.01, b.moveActive);
        this.player.x = clamp(this.player.x + dir * (170 + 300 * k) * dt, 52, this.arenaMaxX());
        if (!this.pullGfx) this.pullGfx = this.add.graphics().setDepth(24);
        const pg = this.pullGfx;
        pg.clear();
        for (let i = -1; i <= 1; i += 1) {
          pg.lineStyle(3, 0xff4d14, 0.22 + Math.random() * 0.30);
          pg.lineBetween(this.bossSprite.x, FLOOR - 206 + i * 40, this.player.x, this.player.y - 74 + i * 22);
          pg.lineStyle(1, 0xffd27a, 0.30 + Math.random() * 0.35);
          pg.lineBetween(this.bossSprite.x, FLOOR - 206 + i * 40, this.player.x, this.player.y - 74 + i * 22);
        }
        if (Math.random() < 0.35) this.spawnBurst(this.player.x, this.player.y - 70, 0xff6a2a, 2);
      } else if (this.pullGfx) {
        this.pullGfx.clear();
      }

      // ② 焚身衝刺：横向高速掠过，沿路留火，撞到就掉血。
      // 和乱舞的区别：乱舞是瞬移点，冲刺是一条持续移动的线。
      if (b.mode === 'active' && b.move === 'dash' && b.encounter === 'rift') {
        const dir = b.dashDir || b.facing;
        this.bossSprite.x = clamp(this.bossSprite.x + dir * 1180 * dt, 90, this.bossMaxX());
        b.dashTrailT = (b.dashTrailT || 0) - dt;
        if (b.dashTrailT <= 0) {
          b.dashTrailT = 0.055;
          this.spawnEmber(this.bossSprite.x, 40);
          const ghost = this.add.rectangle(this.bossSprite.x, FLOOR - 175, 84, 270, 0xff6a2a, 0.24).setDepth(9);
          this.tweens.add({ targets: ghost, alpha: 0, duration: 300, onComplete: () => ghost.destroy() });
          this.spawnBurst(this.bossSprite.x, FLOOR - 120, 0xffd27a, 4);
        }
        // 坐标在 this.player 上，playerState 只有状态。原来写成 playerState.x，
        // 得到 undefined → NaN < 82 → false，所以冲刺永远撞不到人。
        if (Math.abs(this.player.x - this.bossSprite.x) < 82
            && this.playerState.invuln <= 0 && this.playerState.hurtTimer <= 0) {
          this.playerDamage('焚身衝刺', 22);
        }
      }

      // ④ 焚身乱舞：连续瞬移到 4 个随机落点，每段落点都会烧起来，贴着会被撞伤。
      // 这是"到处乱飞乱窜"的那一招。
      if (b.mode === 'active' && b.move === 'blitz' && b.blitzSpots && b.blitzSpots.length) {
        b.blitzT = (b.blitzT || 0) - dt;
        if (b.blitzT <= 0) {
          b.blitzT = 0.30;
          this.spawnEmber(this.bossSprite.x, 58);
          this.spawnBurst(this.bossSprite.x, FLOOR - 140, 0xffb45c, 22);
          const nx = b.blitzSpots[b.blitzIdx % b.blitzSpots.length];
          b.blitzIdx = (b.blitzIdx || 0) + 1;
          // 残影
          const ghost = this.add.rectangle(this.bossSprite.x, FLOOR - 170, 70, 250, 0xff6a2a, 0.28).setDepth(9);
          this.tweens.add({ targets: ghost, alpha: 0, duration: 320, onComplete: () => ghost.destroy() });
          this.bossSprite.setFlipX(nx < this.bossSprite.x);
          this.bossSprite.x = nx;
          this.spawnBurst(nx, FLOOR - 140, 0xffd27a, 26);
          this.cameras.main.shake(120, 0.004);
          if (Math.abs(this.player.x - nx) < 74) this.playerDamage('焚身亂舞', 20);
        }
      }

      if (b.mode === 'idle') {
        b.timer -= dt;
        if (b.timer <= 0) this.startBossMove();
      } else if (b.mode === 'tell') {
        b.timer -= dt;
        if (b.encounter === 'rift') this.playBossAnimation('knight-powerup');
        else if (b.move === 'rush' && b.timer < 0.42) this.playBossAnimation('knight-run');
        else if (b.move === 'wave' && b.timer < 0.7) this.playBossAnimation('knight-powerup');
        if (b.timer <= 0) {
          b.mode = 'active';
          b.timer = b.moveActive;
          b.hitResolved = false;
          b.rushHit = false;
          if (b.move === 'slash' && b.encounter === 'elite') this.playBossAnimation('knight-slash3-swing');
          if (b.move === 'burn' && b.encounter === 'rift') this.castSkyBurn();
          if (b.move === 'pull' && b.encounter === 'rift') this.castRiftPull();
          if (b.move === 'blitz' && b.encounter === 'rift') this.castBlitz();
          if (b.move === 'meteor' && b.encounter === 'rift') this.castMeteorRain();
          if (b.move === 'dash' && b.encounter === 'rift') this.castDash();
          if (b.move === 'tide' && b.encounter === 'rift') this.castTide();
          if (b.move === 'gaze' && b.encounter === 'rift') this.castGaze();
          if (b.move === 'shock' && b.encounter === 'rift') this.castShock();
          if (b.move === 'bloom' && b.encounter === 'rift') this.castBloom();
          if (b.move === 'souls' && b.encounter === 'rift') this.castSouls();
          if (b.move === 'hand') this.castHand();
          if (b.move === 'handSlam') this.castHandSlam();
          if (b.move === 'handGrab') this.castHandGrab();
          // ② 精英原来完全没有技能特效，只有地面预警线；补一套
          if (b.encounter === 'elite') this.spawnEliteMoveFx(b.move);
          if (b.move === 'shot') {
            const distanceToPlayer = Math.abs(this.player.x - this.bossSprite.x);
            const spawnOffset = Math.min(55, Math.max(0, distanceToPlayer - 12));
            const moveDef = this.bossMoves().shot;
            const originX = this.bossSprite.x + b.facing * spawnOffset;
            if (b.encounter === 'rift') {
              // ③ P5 魂火连射：5 条弹道、弹速 430（原来 3 条 / 285），并且打两轮
              const rapid = b.phase === 5 && b.revived;
              const lanes = rapid
                ? [FLOOR - 64, FLOOR - 110, FLOOR - 156, FLOOR - 202, FLOOR - 244]
                : b.phase >= 3 ? [FLOOR - 72, FLOOR - 132, FLOOR - 192] : [FLOOR - 72, FLOOR - 146];
              const shotSpeed = rapid ? 430 : 285;
              lanes.forEach((laneY, index) => this.spawnProjectile(originX, laneY, b.facing, shotSpeed + index * 26, moveDef.damage, moveDef.label));
              if (rapid) {
                // 第二轮错开高度，躲过第一轮不代表安全
                this.time.delayedCall(250, () => {
                  if (this.status !== 'run' || !this.boss.revived || this.boss.phase !== 5) return;
                  lanes.forEach((laneY, index) => this.spawnProjectile(
                    this.bossSprite.x + this.boss.facing * 56, laneY + 23, this.boss.facing,
                    shotSpeed + index * 26, moveDef.damage, moveDef.label));
                });
              }
            } else {
              this.spawnProjectile(originX, FLOOR - 100, b.facing, 345, moveDef.damage, moveDef.label);
            }
            b.hitResolved = true;
            this.updateMoveCard('shot', '飞行中');
          }
          if (b.move === 'wave' && b.encounter === 'elite') this.playBossAnimation('knight-attack1');
        }
      } else if (b.mode === 'active') {
        b.timer -= dt;
        if (b.move === 'rush') {
          if (b.encounter === 'rift') {
            if (!b.hitResolved && !b.rushHit && b.timer <= b.moveActive * 0.58) {
              b.rushHit = true;
              b.hitResolved = true;
              this.spawnBurst(b.targetX, FLOOR - 111, 0xc18aff, 22);
              this.bossSprite.x = b.targetX;
              this.bossShadow.x = b.targetX;
              this.resolveBossMove('rush');
            }
            if (b.timer <= 0 && !b.hitResolved) {
              b.hitResolved = true;
              this.stats.bossWhiffs += 1;
              this.stats.bossWhiffsByMove.rush += 1;
            }
          } else {
            const direction = Math.sign(b.targetX - this.bossSprite.x);
            const step = Math.min(Math.abs(b.targetX - this.bossSprite.x), 640 * dt);
            b.facing = direction || b.facing;
            this.bossSprite.setFlipX(b.facing < 0);
            this.bossSprite.x += direction * step;
            if (b.ghostTimer <= 0) {
              b.ghostTimer = 0.07;
              this.spawnAfterImage(this.bossSprite, 0xc87491, 0.23);
            }
            if (!b.hitResolved && Math.abs(this.bossSprite.x - this.player.x) <= this.bossMoves().rush.range + 20 && Math.sign(this.player.x - this.bossSprite.x || 1) === b.facing) {
              b.hitResolved = true;
              this.resolveBossMove('rush');
            }
            if (b.timer <= 0 && !b.hitResolved) {
              b.hitResolved = true;
              this.stats.bossWhiffs += 1;
              this.stats.bossWhiffsByMove.rush += 1;
              this.setMessage('突進落空：Boss 沒有碰到你，方向鎖定後不會修正路徑。');
            }
          }
        } else if (!b.hitResolved) {
          // 横斩等剑刃挥到水平（约 active 走过 58%）；震荡在 active 生效即判定
          const moveDef = this.bossMoves()[b.move];
          const hitThreshold = b.move === 'slash' ? b.moveActive * 0.42 : b.moveActive * 0.98;
          if (b.timer <= hitThreshold) {
            b.hitResolved = true;
            this.resolveBossMove(b.move);
          }
        }
        if (b.timer <= 0 && b.mode === 'active') {
          // 「压哨衔接」：高阶段有概率打完不回收招，下一招的预警直接跟上。
          // 压迫感的来源是「节奏不给你喘息」，不是「预警更短」——
          // 预警时长必须保留，否则会变成不公平而不是有压迫感。
          const chainChance = { 1: 0, 2: 0, 3: 0.30, 4: 0.45, 5: 0.65 }[b.phase] || 0;
          const streak = b.chainStreak || 0;
          if (b.encounter === 'rift' && b.hp > 0 && streak < 2 && Math.random() < chainChance) {
            b.chainStreak = streak + 1;
            b.mode = 'idle';
            b.timer = 0;          // 待机归零 → 下一帧立刻 startBossMove()
            b.move = '';
            b.hitResolved = true;
            this.setMessage(`第 ${b.chainStreak + 1} 段——它沒有收招，下一招直接跟上。`);
          } else {
            // 连段用完（或没触发）→ 必须给一个真实的反击窗口，保证公平
            if (streak >= 2) this.setMessage('連段結束：這是你的完整反擊窗口。');
            b.chainStreak = 0;
            this.beginBossRecovery(b.moveRecover * this.phaseSpeed());
          }
        }
      } else if (b.mode === 'recover') {
        b.timer -= dt;
        if (b.timer <= 0) {
          b.mode = 'idle';
          b.timer = b.encounter === 'elite' ? 0.46 : 0.62 * this.phaseGap();
          b.move = '';
        }
      } else if (b.mode === 'broken') {
        b.timer -= dt;
        if (b.timer <= 0) {
          b.mode = 'idle';
          b.timer = b.encounter === 'elite' ? 0.46 : 0.62 * this.phaseGap();
          b.move = '';
          b.posture = 0;
          this.setMessage('守衛恢復架勢；留意下一輪招式序列。');
        }
      } else if (b.mode === 'transition') {
        b.timer -= dt;
        if (b.timer <= 0) {
          b.mode = 'idle';
          b.timer = 0.85;
          b.sequence = 0;
          if (b.phase === 4) {
            b.slashCount = 0;
            this.setMessage('P4：多重裂隙开启，魂火变为三层；慢、快灵魂震爆仍保持固定节奏交替。');
          } else if (b.phase === 2) this.setMessage('P2：幽魂换位加入，传送落点会提前显现圆形符文。');
          else this.setMessage('P3：亡魂印爆加入；紫色符印锁定你的位置，及时离开或跳起。');
        }
      }
    }

    debugSetPhase(phase) {
      if (!this.debugMode || this.status !== 'run') return;
      if (this.room === 'boss' && this.boss.encounter !== 'rift') return;
      // 各阶段测试血量取区间中段，保证稳定落在该阶段
      const testHp = { 1: 800, 2: 570, 3: 340, 4: 130 };
      if (this.room !== 'boss') {
        this.room = 'boss';
        this.roomIndex = 3;
        this.enterBoss(true);
      }
      const b = this.boss;
      // 【火焰形態】按鍵切的是「階段 1 / 2」，不是血量階段。
      // 原来直接改 b.phase 会让 revived 与 phase 对不上，外观退回普通巫妖。
      if (b.revived) {
        if (phase > 2) {
          this.setMessage('火焰形態只有兩個階段：【1】第一階段（不下隕石雨）　【2】第二階段（隕石雨 + 衝刺）。');
          return;
        }
        b.p5Stage = phase;
        // 燒條比例決定階段：第二階段要壓到 50% 以下
        b.burn = PHASE5_BURN_SECONDS * (phase === 2 ? 0.30 : 0.85);
        b.hp = b.maxHp * (b.burn / PHASE5_BURN_SECONDS);
        b.phase = 5;
        b.mode = 'idle';
        b.timer = 0.3;
        b.sequence = 0;
        b.move = '';
        b.hitResolved = true;
        this.setMessage(`【策劃測試】火焰形態 · 第 ${phase} 階段（燒條剩 ${Math.round(b.burn)} 秒 / ${PHASE5_BURN_SECONDS}）。`);
        return;
      }
      b.hp = testHp[phase];
      b.phase = phase;
      b.mode = 'idle';
      b.timer = 0.3;
      b.sequence = 0;
      b.move = '';
      b.hitResolved = true;
      b.regenIdle = 0;
      const music = document.querySelector('#bgm');
      if (music) { music.playbackRate = 1.0; music.play().catch(() => {}); }
      this.setMessage(`【策划测试】已跳至 P${phase}，Boss 血量设为 ${testHp[phase]}。`);
    }

    // 阶段节奏倍率：返回的是「时长倍率」，越小越快。
    // P1 为基准，之后每升一阶收紧一档；P4 整套出招时长约为 P1 的 74%。
    // 影响 pre-warning(tell) 与收招(recover) —— 即玩家的反应窗口与输出窗口。
    phaseSpeed() {
      const table = { 1: 1.0, 2: 0.90, 3: 0.82, 4: 0.74, 5: 0.55 };
      return table[this.boss.phase] || 1.0;
    }

    // 招式之间的间隔单独收得更紧：它只影响出招密度，不压缩玩家的反应时间，
    // 所以可以比 phaseSpeed 更激进，用来制造「越来越喘不过气」的压力。
    phaseGap() {
      // 第二阶段再收紧一档，解决「后半段感觉不出招」的问题
      // ④ P5 再压一档：它是「自燃倒计时」形态，本来就该缠着你不放
      if (this.boss.encounter === 'rift' && this.boss.phase === 5 && this.boss.p5Stage === 2) return 0.15;
      const table = { 1: 1.0, 2: 0.85, 3: 0.72, 4: 0.60, 5: 0.22 };
      return table[this.boss.phase] || 1.0;
    }

    startBossMove() {
      const b = this.boss;
      // 第二阶段（烧条过半）换成 '5b' 那套
      const pkey = b.encounter === 'rift' && b.phase === 5 && b.p5Stage === 2 ? '5b' : b.phase;
      const patterns = (b.encounter === 'rift' ? RIFT_PATTERNS : ELITE_PATTERNS)[pkey] || RIFT_PATTERNS[5];
      const sequenceLength = patterns[0].length;
      const cycle = Math.floor(b.sequence / sequenceLength);
      const pattern = patterns[cycle % patterns.length];
      let patternIndex = b.sequence % sequenceLength;
      if (pattern[patternIndex] === b.lastMove) patternIndex = (patternIndex + 1) % sequenceLength;
      let move = pattern[patternIndex];
      // C 附身巨手被打碎后，锤击与抓取永久失效
      if (b.handGone && (move === 'handSlam' || move === 'handGrab')) move = 'slash';
      b.sequence = cycle * sequenceLength + patternIndex + 1;
      // ⑥ 连招：P3+ 时幽魂换位之后有 55% 概率直接接灵魂震爆，
      // 而且前摇缩短 40%——四招独立循环太好读了，每招都能"躲完就喘"，没有压迫。
      const combo = b.encounter === 'rift' && b.phase >= 3 && b.lastMove === 'rush'
        && b.mode !== 'broken' && Math.random() < 0.55;
      if (combo) move = 'slash';
      b.lastMove = move;
      b.move = move;
      b.mode = 'tell';
      const moveDef = this.bossMoves()[move];
      b.slashTempo = move === 'slash' && b.encounter === 'rift'
        ? (b.slashCount++ % 2 === 0 ? 'slow' : 'fast')
        : '';
      b.moveActive = move === 'slash' && b.slashTempo === 'slow' ? 0.22 : moveDef.active;
      b.moveRecover = move === 'slash' && b.slashTempo === 'slow' ? 1.3 : move === 'slash' && b.encounter === 'rift' ? 0.95 : moveDef.recover;
      const tell = move === 'slash' && b.slashTempo === 'slow' ? 1.45 : move === 'slash' && b.slashTempo === 'fast' ? 0.82 : moveDef.tell;
      b.timer = tell * this.phaseSpeed() * (combo ? 0.6 : 1);
      b.hitResolved = false;
      b.handLocked = false;
      b.chainStreak = 0;          // 新招式开始 → 连段重新计数
      // ⑤ P3+ 並行施法：出主招的同時另外射一輪冥火。
      //    單一威脅永遠只有一個答案，並行才會逼玩家做取捨。
      if (b.encounter === 'rift' && b.phase >= 3 && move !== 'shot' && Math.random() < 0.42) {
        const lanes = [FLOOR - 96, FLOOR - 176];
        const shotDef = this.bossMoves().shot;
        this.time.delayedCall(430, () => {
          if (this.status !== 'run' || this.boss.hp <= 0) return;
          lanes.forEach((ly, i) => this.spawnProjectile(
            this.bossSprite.x + this.boss.facing * 52, ly, this.boss.facing,
            292 + i * 26, shotDef.damage, shotDef.label));
        });
      }
      // ② 这里**不能**清 tide/gaze/bloom/souls——
      //    它们是自清理的（各自的 update 完会自己置 null），
      //    而「压哨衔接」会让 startBossMove 在上一招还没播完时就被调用，
      //    硬清会把獄火華放到一半的火柱打断（玩家反馈：站柱子上不掉血）。
      b.shockDone = false;
      // 预警音：本作核心是“看懂预警”，声音和视觉预警必须同时到
      this.playSfx('sfx_boss_tell', 0.26);
      if (move === 'wave') this.playSfx('sfx_rune_mark', 0.24);
      b.rushHit = false;
      b.facing = Math.sign(this.player.x - this.bossSprite.x) || -1;
      const dashLimit = 295;
      b.moveRange = move === 'slash' && b.encounter === 'rift' ? (b.slashTempo === 'fast' ? 145 : moveDef.range) : moveDef.range;
      b.targetX = move === 'rush' && b.encounter === 'rift'
        ? clamp(this.player.x - b.facing * 150, 120, this.bossMaxX() - 30)
        : move === 'rush'
          ? clamp(this.player.x, Math.max(90, this.bossSprite.x - dashLimit), Math.min(this.bossMaxX(), this.bossSprite.x + dashLimit))
        : clamp(this.player.x, 90, this.bossMaxX());
      b.sealX = clamp(this.player.x, 90, this.bossMaxX());
      if (move === 'wave' && b.encounter === 'rift') {
        // 蓄力段 8 帧 @6fps ≈ 1.33s，与 wave 的 tell(1.35s) 基本一致，
        // 播完即自动销毁，正好在判定瞬间让位给 fx-rune-burst。
        const rc = this.skillFx('fx-rune-charge', 'fx_rune');
        this.spawnFx(rc.anim, rc.tex, b.sealX, FLOOR - 30, 1.05, 6);
      }
      if (move === 'rush' && b.encounter === 'rift') {
        const rf = this.skillFx('fx-rift', 'fx_rift');
        this.spawnFx(rf.anim, rf.tex, b.targetX, FLOOR - 104, 1, 9);
      }
      this.bossSprite.setFlipX(b.facing < 0);
      const slowSlash = move === 'slash' && b.slashTempo === 'slow';
      this.playBossAnimation(b.encounter === 'rift' || move === 'wave' || slowSlash ? 'knight-powerup' : 'knight-attack1');
      const tempoHint = move === 'slash' && b.encounter === 'rift' ? `${b.slashTempo === 'slow' ? '慢速大范围震爆：尽早拉开。' : '快速小范围震爆：及时退开或跳起。'} ` : '';
      this.setMessage(`${tempoHint}${moveDef.label}：${this.moveHint(move)}`);
      this.updateMoveCard(move, move === 'slash' && b.encounter === 'rift' ? (b.slashTempo === 'slow' ? '慢速震爆' : '快速震爆') : '预警');
    }

    bossMoves() {
      return this.boss.encounter === 'rift' ? RIFT_MOVES : ELITE_MOVES;
    }

    moveHint(move) {
      if (move === 'slash') return this.boss.encounter === 'rift' ? `靈魂震爆向周圍擴散，${this.boss.slashTempo === 'slow' ? '長蓄力、大範圍' : '短蓄力、小範圍'}；拉開距離、跳躍或近身彈反。` : '正面靠近即可格擋；出手前約 0.4 秒按 E 可彈反。';
      if (move === 'shot') return this.boss.encounter === 'rift' ? '裂隙放出多道分層冥火；觀察高度，移動或跳躍穿過彈幕。' : '投射物不接受彈反；跳/閃避，或面向它格擋。';
      if (move === 'rush') return this.boss.encounter === 'rift' ? '幽魂換位會標記傳送落點；離開落點圓環避開衝擊。' : '突進方向已鎖定；跳過路徑、閃避，或在近身按 E。';
      return this.boss.encounter === 'rift' ? '亡魂印鎖定腳下位置後爆發；走出紫色符印或跳起避開。' : '不可格擋：跳起越過地面波，或進入兩側高亮安全區。';
    }

    resolveBossMove(move) {
      const b = this.boss;
      const def = this.bossMoves()[move];
      // 出手音与上面的预警音成对，形成“预备→释放”的听觉对比
      const release = { slash: 'sfx_soulburst', shot: 'sfx_soulfire', rush: 'sfx_shift', wave: 'sfx_rune_burst' }[move];
      if (release) this.playSfx(release, 0.34);
      if (move === 'slash') {
        if (b.encounter === 'rift') {
          const distance = Math.abs(this.player.x - this.bossSprite.x);
          const range = b.slashTempo === 'fast' ? 145 : def.range;
          this.spawnBurst(this.bossSprite.x, FLOOR - 125, b.slashTempo === 'fast' ? 0xffbf86 : 0xb994ff, 20);
          // 序列帧环按实际判定半径缩放，保证画面读到的范围和 hitbox 一致
          const sb = this.skillFx('fx-soulburst', 'fx_soulburst');
          this.spawnFx(sb.anim, sb.tex, this.bossSprite.x, FLOOR - 24, range / 58, 9);
          // 烈焰残渣：震爆环的边缘开始烧。刻意不烧 Boss 脚下——
          // 否则配合贴身灼烧会让玩家完全无法靠近输出，P5 就不可通关了。
          if (b.phase === 5 && b.revived) {
            this.spawnEmber(this.bossSprite.x - range * 0.72, 62);
            this.spawnEmber(this.bossSprite.x + range * 0.72, 62);
          }
          if (distance <= range && this.isPlayerGrounded()) {
            // ① 弹反范围必须 ≥ 判定范围，否则会出现「被打中但弹不了」的死区
            this.resolveIncoming({ source: def.label, damage: def.damage, attackerX: this.bossSprite.x, range, guardable: true, parryable: true, parryRange: range + 20 });
          } else {
            this.stats.bossWhiffs += 1;
            this.stats.bossWhiffsByMove.slash += 1;
            this.playerState.energy = Math.min(100, this.playerState.energy + 8);
            this.setMessage(this.isPlayerAirborne() ? '跃起避開靈魂震爆：成功利用高度规避。' : '靈魂震爆未及遠處：趁巫妖收招反擊。');
          }
          return;
        }
        const inFront = Math.sign(this.player.x - this.bossSprite.x || 1) === b.facing;
        if (inFront && Math.abs(this.player.x - this.bossSprite.x) <= def.range && this.isPlayerGrounded()) {
          this.resolveIncoming({ source: def.label, damage: def.damage, attackerX: this.bossSprite.x, range: def.range, guardable: true, parryable: true, parryRange: def.range + 20 });
        } else {
          this.setMessage('横斩落空：離開刀路後可在守衛收招時反擊。');
          this.stats.bossWhiffs += 1;
          this.stats.bossWhiffsByMove.slash += 1;
        }
      } else if (move === 'shot') {
        // The shot itself resolves on contact. The warning line and projectile use this locked direction.
        this.updateMoveCard('shot', '飛行中');
      } else if (move === 'rush') {
        if (b.encounter === 'rift') {
          if (Math.abs(this.player.x - this.bossSprite.x) <= def.range && this.isPlayerGrounded()) {
            this.resolveIncoming({ source: def.label, damage: def.damage, attackerX: this.bossSprite.x, range: def.range, guardable: false, parryable: false, parryRange: 0 });
          } else {
            this.stats.bossWhiffs += 1;
            this.stats.bossWhiffsByMove.rush += 1;
            this.playerState.energy = Math.min(100, this.playerState.energy + 8);
            this.setMessage('成功避开幽魂换位冲击：巫妖在传送后露出破绽。');
          }
          return;
        }
        const inFront = Math.sign(this.player.x - this.bossSprite.x || 1) === b.facing;
        if (inFront && Math.abs(this.player.x - this.bossSprite.x) <= def.range + 20 && this.isPlayerGrounded()) {
          this.resolveIncoming({ source: def.label, damage: def.damage, attackerX: this.bossSprite.x, range: def.range + 20, guardable: false, parryable: true, parryRange: def.range + 50 });
        }
      } else if (move === 'wave') {
        if (b.encounter === 'rift') {
          const escaped = this.isPlayerAirborne() || Math.abs(this.player.x - b.sealX) > def.range;
          this.spawnBurst(b.sealX, FLOOR - 24, 0xcf83ff, 18);
          const rb = this.skillFx('fx-rune-burst', 'fx_rune');
          this.spawnFx(rb.anim, rb.tex, b.sealX, FLOOR - 30, 1.05, 6);
          // 符印炸开后原地继续烧：玩家刚站的地方变成禁区，逼他持续换位
          if (b.phase === 5 && b.revived) this.spawnEmber(b.sealX, 84);
          if (escaped) {
            this.stats.bossWhiffs += 1;
            this.stats.bossWhiffsByMove.wave += 1;
            this.playerState.energy = Math.min(100, this.playerState.energy + 10);
            this.setMessage('亡魂印爆发：你已离开符印范围，规避成功。');
            this.floatText(this.player.x, this.player.y - 126, '規避成功', '#c9b1fa');
          } else {
            this.resolveIncoming({ source: def.label, damage: def.damage, attackerX: this.player.x, range: 0, guardable: false, parryable: false, parryRange: 0 });
          }
          return;
        }
        const p = this.player;
        const safeLeft = p.x >= 52 && p.x <= 244;
        const safeRight = p.x >= 716 && p.x <= 916;
        const safeRiftSide = this.boss.encounter === 'rift' && this.player.x >= 52 && this.player.x <= 244;
        if (this.isPlayerAirborne() || (this.boss.encounter === 'rift' ? safeRiftSide : safeLeft || safeRight)) {
          this.stats.bossWhiffs += 1;
          this.stats.bossWhiffsByMove.wave += 1;
          this.playerState.energy = Math.min(100, this.playerState.energy + 10);
          this.setMessage(this.isPlayerAirborne() ? '跳躍越過地脈爆裂：成功讀懂高度解法。' : '進入亮起的側區：成功避開地脈爆裂。');
          this.floatText(p.x, p.y - 126, '規避成功', '#aee1bf');
        } else {
          this.resolveIncoming({ source: def.label, damage: def.damage, attackerX: this.bossSprite.x, range: 800, guardable: false, parryable: false, parryRange: 0, dodgeable: false });
        }
      }
    }

    beginBossRecovery(duration) {
      const b = this.boss;
      b.mode = 'recover';
      // ③ 「技能不连贯」的根源就在这个 0.72 秒硬下限：每招打完都强制站桩 0.72 秒，
      // 玩家能安心打完一整套。P3+ 放开下限，让招式真正咬在一起。
      const floor = b.encounter === 'rift' && b.phase >= 3 ? 0.40 : 0.72;
      b.timer = Math.max(floor, duration);
      b.move = b.move || 'slash';
      this.playBossAnimation('knight-impact2');
      this.setMessage('Boss 收招：完整傷害窗口，接一到兩段連擊後拉開距離。');
      this.updateMoveCard(b.move, '反擊窗口');
    }

    resolveIncoming({ source, damage, attackerX, range, guardable, parryable, parryRange = 110, dodgeable = true, spell = false }) {
      const p = this.playerState;
      if (this.status !== 'run') return 'invulnerable';
      const dodgeIFrame = p.invuln > 0 && p.invulnSource === 'dodge';
      if (p.invuln > 0 && !(dodgeIFrame && !dodgeable)) {
        if (dodgeIFrame && !p.dodgeSuccessCounted) {
          p.dodgeSuccessCounted = true;
          this.stats.dodgeSuccesses += 1;
        }
        return dodgeIFrame ? 'dodge' : 'invulnerable';
      }
      const distance = Math.abs(attackerX - this.player.x);
      // ② 贴身 90px 内不再要求朝向：压在你身上的攻击应该能弹，
      // 否则「离得近反而弹不了」非常反直觉，而且移动中朝向会乱变。
      const inFront = Math.abs(attackerX - this.player.x) <= 90
        || Math.sign(attackerX - this.player.x || 1) === p.facing;

      if (p.parryWindow > 0 && p.parryPending && parryable && inFront && distance <= parryRange) {
        p.parryPending = false;
        p.parryWindow = 0;
        p.parryAnim = 0.26;
        p.guardRecover = 0.1;
        // ② 弹反的代价是「时机 + 距离 + 朝向」，收益必须配得上：
        // 耐力返还 18、能量 28、架势 52（两次即可破架势）。
        p.stamina = Math.min(100, p.stamina + 18);
        p.energy = Math.min(100, p.energy + 28);
        this.stats.parries += 1;
        this.player.play('hero-attack', true);
        this.spawnBurst(this.player.x + p.facing * 35, this.player.y - 85, 0xe8d19a, 26);
        this.spawnBurst(this.player.x + p.facing * 35, this.player.y - 85, 0xfff0c8, 12);
        this.cameras.main.shake(120, 0.004);
        this.playSfx('sfx-parry', 0.42);
        if (spell) {
          // ① 彈反法術：只回能量與耐力。不給架勢 = 不會破防 = Boss 不掉血。
          this.setMessage(`彈反法術 ${source}！能量 +28、耐力返還 18（法術不會讓它架勢崩潰）。`);
          this.floatText(this.player.x + p.facing * 26, this.player.y - 132, '彈反法術', '#bfe8ff');
          return 'parry';
        }
        this.setMessage(`精準彈反 ${source}！架勢 -52、能量 +28、耐力返還 18，趁硬直反擊。`);
        this.floatText(this.player.x + p.facing * 26, this.player.y - 132, '精準彈反', '#f2d99f');
        if (this.room === 'boss') {
          const before = this.boss.posture;
          this.boss.posture = Math.min(100, this.boss.posture + 52);
          this.floatText(this.bossSprite.x, FLOOR - 250, `架勢 ${before}→${this.boss.posture}`, '#ffd9a0');
          if (this.boss.posture >= 100) this.breakBossPosture();
          else if (this.boss.mode === 'active' || this.boss.mode === 'tell') this.beginBossRecovery(1.0);
        }
        return 'parry';
      }

      const guardHeld = this.keys.guard.isDown || this.touch.guard;
      if (guardHeld) this.stats.guardAttempts += 1;
      // 命中判定瞬间兜底取消攻击，保证举盾即时生效
      if (guardHeld && p.attack && p.guardBreak <= 0) p.attack = null;
      const guarding = guardHeld && p.guardBreak <= 0 && p.guardRecover <= 0 && p.ultimateTimer <= 0 && !p.attack && p.stamina > 0;
      if (guarding && guardable && inFront && distance <= Math.max(range, 70)) {
        const cost = source === '暗影投射物' || source === '影弩' ? 19 : 24;
        if (p.stamina >= cost) {
          p.stamina -= cost;
          p.lastGuard = 0;
          p.invuln = 0.22;
          p.invulnSource = 'block';
          p.energy = Math.min(100, p.energy + 5);
          this.stats.blocks += 1;
          this.player.play('hero-idle', true);
          this.cameras.main.shake(54, 0.0018);
          this.playSfx('sfx-guard', 0.22);
          const chip = this.godMode ? 0 : Math.max(1, Math.round(damage * 0.25));
          p.hp = Math.max(0, p.hp - chip);
          this.stats.damageTaken += chip;
          this.stats.damageBySource[source] = (this.stats.damageBySource[source] || 0) + chip;
          this.setMessage(`格擋 ${source}：傷害降低 75%，耐力 -${cost}。`);
          this.floatText(this.player.x, this.player.y - 117, '格擋', '#b7d8c4');
          if (p.hp <= 0) this.endRun(false);
          return 'block';
        }
        p.stamina = 0;
        p.guardBreak = 0.76;
        this.stats.guardBreaks += 1;
        this.setMessage('格擋破防：耐力不夠承受本次攻擊，暫時無法防守。');
        this.playerDamage(source, Math.ceil(damage * 1.15));
        return 'break';
      }

      if (p.parryWindow > 0 && p.parryPending && (!parryable || !inFront || distance > parryRange)) {
        p.parryWindow = 0;
        p.parryPending = false;
        p.guardRecover = 0.16;
        this.stats.parryMisses += 1;
        const reason = !parryable ? '這招不可彈反' : (!inFront ? '需要正面朝向' : '距離過遠');
        this.setMessage(`彈反失敗：${reason}；改用格擋、跳躍或閃避。`);
      }
      if (this.playerState.dodgeTimer > 0 && dodgeable) {
        if (!p.dodgeSuccessCounted) {
          p.dodgeSuccessCounted = true;
          this.stats.dodgeSuccesses += 1;
        }
        return 'dodge';
      }
      this.playerDamage(source, damage, dodgeIFrame && !dodgeable);
      return 'hit';
    }

    playerDamage(source, damage, ignoreDodgeIFrame = false) {
      const p = this.playerState;
      if (this.godMode) {
        // 策划测试模式：不掉血，仅记录一次"理论受击"用于观察判定
        this.stats.hitsTakenBySource[source] = (this.stats.hitsTakenBySource[source] || 0) + 1;
        this.floatText(this.player.x, this.player.y - 116, '無敵', '#7fd0ff');
        return;
      }
      if ((p.invuln > 0 && !ignoreDodgeIFrame) || this.status !== 'run') return;
      p.hp = Math.max(0, p.hp - damage);
      p.invuln = 0.86;
      p.invulnSource = 'hit';
      p.hurtTimer = 0.42;
      p.attack = null;
      p.ultimateTimer = 0;
      p.combo = 0;
      // 祈祷被打断：跪地回血的风险就在这里，被打到就白读
      if (p.prayTimer > 0) {
        p.prayTimer = 0;
        this.setMessage('祈禱被打斷了——回血失敗，冷卻照算。');
      }
      p.comboIndex = 0;
      p.comboGrace = 0;
      p.energy = Math.max(0, p.energy - 6);
      this.stats.hitsTaken += 1;
      this.stats.hitsTakenBySource[source] = (this.stats.hitsTakenBySource[source] || 0) + 1;
      this.stats.damageBySource[source] = (this.stats.damageBySource[source] || 0) + damage;
      this.stats.damageTaken += damage;
      this.cameras.main.shake(110, 0.004);
      this.playSfx('sfx-hit', 0.3);
      this.spawnBurst(this.player.x, this.player.y - 76, 0xe58b79, 10);
      this.floatText(this.player.x, this.player.y - 116, `-${damage}`, '#f29a85');
      this.setMessage(`${source} 命中：生命 -${damage}；受擊後有短暫保護時間。`);
      this.player.play('hero-hurt', true);
      if (p.hp <= 0) this.endRun(false);
    }

    parry() {
      const p = this.playerState;
      if (this.status !== 'run' || p.parryCooldown > 0 || p.guardBreak > 0 || p.hurtTimer > 0 || p.dodgeTimer > 0 || p.ultimateTimer > 0 || p.attack) return;
      // ② 窗口 0.55 → 0.40：按住混不过去了，但也不能过短——
      //    弹反是「看到金色提示环再按」，窗口要容得下人的反应时间。
      //    失手冷却保持 0.24，按空了不至于干等太久。
      p.parryWindow = 0.45;
      p.parryCooldown = 0.24;
      p.parryPending = true;
      p.parryAnim = 0.26;
      this.stats.parryAttempts += 1;
      this.player.play('hero-attack', true);
      this.setMessage('彈反窗口 0.45 秒：看到金色提示環再按 E，按住不放無效。');
    }

    dodge() {
      const p = this.playerState;
      if (this.status !== 'run' || p.dodgeCooldown > 0 || p.guardBreak > 0 || p.hurtTimer > 0 || p.ultimateTimer > 0 || p.attack) return;
      p.dodgeTimer = 0.25;
      p.dodgeCooldown = 0.72;
      this.playSfx('sfx_dodge', 0.28);
      p.dodgeSuccessCounted = false;
      if (p.invuln <= 0.25) {
        p.invuln = 0.25;
        p.invulnSource = 'dodge';
      }
      this.stats.dodgeAttempts += 1;
      this.player.play('hero-run', true);
      this.spawnAfterImage(this.player, 0xa9d8ca, 0.28);
    }

    ultimate() {
      const p = this.playerState;
      if (this.room === 'boss' && (this.boss.mode === 'intro' || this.boss.mode === 'transition')) {
        this.setMessage('Boss 階段演出期間暫不可受擊；保留奧義，等招式或收招時再用。');
        return;
      }
      if (this.status !== 'run') return;
      if (p.energy < ULTIMATE_REQUIRED) {
        this.setMessage(`破陣能量不足：${Math.floor(p.energy)} / ${ULTIMATE_REQUIRED}。命中、格擋與彈反可累積。`);
        return;
      }
      if (p.ultimateTimer > 0) return;              // 已經在放，不必提示
      // ① 每一种真的放不出来的情况都要说清楚。
      // 原来只有「能量不足」有提示，其余全是静默 return——
      // 玩家打完一套按 K 被吞掉，屏幕上看不到任何反馈，会以为按键坏了。
      if (p.guardBreak > 0) {
        this.setMessage(`奧義未發動：格擋破防中，還要 ${p.guardBreak.toFixed(1)} 秒。`);
        return;
      }
      if (p.hurtTimer > 0) { this.setMessage('奧義未發動：受擊硬直中，站穩再放。'); return; }
      if (p.dodgeTimer > 0) { this.setMessage('奧義未發動：翻滾中。'); return; }
      // 攻击 / 弹反 / 格挡后摇直接打断：想接奥义就该让他接，
      // 这是「按了没反应」最常见的来源。
      if (p.attack || p.parryAnim > 0 || p.guardRecover > 0) {
        p.attack = null;
        p.parryAnim = 0;
        p.guardRecover = 0;
      }

      const targets = this.room === 'boss' ? [] : this.entities.filter((enemy) => {
        const dx = enemy.sprite.x - this.player.x;
        return !enemy.dead && Math.abs(dx) <= ULTIMATE_RANGE && Math.sign(dx || 1) === p.facing && Math.abs(enemy.sprite.y - this.player.y) <= 110;
      });
      if (this.room === 'boss') {
        const dx = this.bossSprite.x - this.player.x;
        if (Math.abs(dx) > ULTIMATE_RANGE || Math.sign(dx || 1) !== p.facing || Math.abs(this.bossSprite.y - this.player.y) > 110) {
          this.setMessage(`奧義未發動：需面向 Boss 並進入 ${ULTIMATE_RANGE}px 範圍，能量不消耗。`);
          return;
        }
      } else if (targets.length === 0) {
        this.setMessage(`奧義未發動：前方 ${ULTIMATE_RANGE}px 內沒有目標，能量不消耗。`);
        return;
      }

      p.energy = this.godMode ? ULTIMATE_REQUIRED : 0;
      p.ultimateTimer = 0.9;
      if (p.invuln <= 0.5) {
        p.invuln = 0.5;
        p.invulnSource = 'ultimate';
      }
      // 蓄力动画：先顿一下并放大，再爆发
      this.player.play('hero-attack', true);
      this.player.setTint(0xffe9a8);
      this.tweens.add({ targets: this.player, scaleX: 0.64 * 1.18, scaleY: 0.64 * 1.18, duration: 130, yoyo: true, ease: 'Quad.Out', onComplete: () => this.player.clearTint() });
      // 奥义：低频蓄力轰鸣 + 延迟的命中层，取代原来借用的界面音效
      this.playSfx('sfx_ultimate', 0.45);
      this.time.delayedCall(150, () => this.playSfx('sfx_hit_flesh', 0.34));
      // 金色全屏闪光 + 强震屏 + 短暂慢动作
      this.cameras.main.flash(200, 255, 214, 120);
      this.cameras.main.shake(260, 0.009);
      this.time.timeScale = 0.45;
      this.time.delayedCall(140, () => { this.time.timeScale = 1; });
      this.spawnBurst(this.player.x + p.facing * 128, this.player.y - 80, 0xe8cd8e, 34);
      if (this.room === 'boss') {
        this.damageBoss(130, this.boss.mode === 'recover' || this.boss.mode === 'broken');
        if (this.boss.mode === 'tell' || this.boss.mode === 'active') this.beginBossRecovery(0.85);
      } else {
        for (const enemy of targets) {
          enemy.hp -= 65;
          enemy.sprite.setTint(0xffe8b5);
          if (enemy.hp <= 0) this.killEnemy(enemy);
        }
      }
      this.setMessage('破陣奧義命中：前方範圍造成重擊；Boss 招式可能被打斷，但 130 点伤害不足以跳过一个完整阶段。');
    }

    damageBoss(amount, vulnerable) {
      const b = this.boss;
      if (b.hp <= 0 || b.mode === 'hidden' || b.mode === 'intro' || b.mode === 'transition') return;
      const damage = Math.max(1, Math.round(amount));
      b.hp = Math.max(0, b.hp - damage);
      b.regenIdle = 0; // 命中打断回血
      b.hurtTimer = 0.15;
      this.playSfx('sfx_boss_hurt', 0.26);
      b.posture = Math.min(100, b.posture + 5);
      this.bossSprite.setTint(0xffdfc4);
      this.time.delayedCall(90, () => { if (this.bossSprite.active) this.boss.encounter === 'rift' ? this.bossSprite.clearTint() : this.bossSprite.setTint(0xe7798e); });
      this.spawnBurst(bossCenterX(this.bossSprite), FLOOR - 112, vulnerable ? 0xf3d4a0 : 0xb8cedb, vulnerable ? 12 : 7);
      this.floatText(this.bossSprite.x, FLOOR - 224, `-${damage}`, vulnerable ? '#f6d79f' : '#c9d6dc');
      this.cameras.main.shake(vulnerable ? 74 : 45, vulnerable ? 0.0022 : 0.0012);
      if (b.phase === 5) {
        // 让「输出能加速烧条」这件事被玩家看见，否则 P5 的输出像是在白打
        this.floatText(this.bossSprite.x + 40, FLOOR - 262, '爆燃', '#ffb45c');
        this.setMessage(`亡者歸來：命中加速自燃 -${damage}。血條被壓得比燒條更低，繼續打。`);
      } else if (vulnerable) this.setMessage(`命中恢復中的Boss：-${damage}。這是完整輸出窗口。`);
      else this.setMessage(`命中Boss：-${damage}；招式收招時傷害更高。`);
      if (b.hp <= 0) {
        if (b.encounter === 'elite') {
          // 先让巫妖说话，再弹原有的分支界面
          this.startDialogue(STORY.eliteDown, () => this.showRiftStory());
          return;
        }
        // 裂隙巫妖第一次被打空不会死：进入 P5「亡者归来」
        if (!b.revived) {
          this.playSfx('sfx_boss_death', 0.5);
          this.beginBossRevive();
          return;
        }
        // P5 里被打死 = 通关，同样走燃尽演出
        this.beginBossBurnout();
        return;
      }
      // A 精英也吃阶段：三段，越后越快
      if (b.encounter === 'elite') {
        const eliteNext = b.hp <= b.maxHp / 3 ? 3 : b.hp <= b.maxHp * 2 / 3 ? 2 : 1;
        if (eliteNext !== b.phase) this.transitionBossPhase(eliteNext);
      }
      const nextPhase = b.hp <= b.maxHp / 4 ? 4 : b.hp <= b.maxHp / 2 ? 3 : b.hp <= b.maxHp * 3 / 4 ? 2 : 1;
      // P5 是终结阶段，不再按血量切阶段
      if (b.encounter === 'rift' && b.phase < 5 && nextPhase !== b.phase) this.transitionBossPhase(nextPhase);
    }

    // P5「焚身形态」。整体放大、剪影完全不同：焦黑残袍 + 外露发光骨架 +
    // 裂开的头骨 + 燃烧利爪 + 环绕骨片。这里只用 Graphics 画几何，
    // 火焰交给火焰精灵，两者叠在一起才有"整个人烧起来了"的观感。
    drawBossFiery(art, aura, x, bob, phaseColor) {
      const S = 1.18;
      const P = (dx, dy) => ({ x: x + dx * S, y: FLOOR + bob + dy * S });
      const t = this.elapsed;
      const flick = 0.74 + Math.sin(t * 17) * 0.16 + Math.sin(t * 31) * 0.10;

      // --- 环绕的骨片：随时间公转，带明暗变化
      for (let i = 0; i < 7; i += 1) {
        const a = t * 0.85 + i * (Math.PI * 2 / 7);
        const bx = x + Math.cos(a) * 118 * S;
        const by = FLOOR - 188 + bob + Math.sin(a) * 46;
        const lit = Math.sin(a) > 0 ? 0.95 : 0.45;
        const s2 = 0.8 + Math.sin(a) * 0.25;
        art.fillStyle(0xe6dcf0, lit).fillPoints([
          { x: bx - 8 * s2, y: by }, { x: bx, y: by - 5 * s2 },
          { x: bx + 8 * s2, y: by }, { x: bx + 2 * s2, y: by + 5 * s2 },
          { x: bx - 4 * s2, y: by + 5 * s2 },
        ], true);
      }

      // --- 焦黑残袍：比原来短，下摆烧成不规则缺口
      art.fillStyle(0x120a14, 0.98).fillPoints([
        P(-50, -152), P(-72, -116), P(-56, -74), P(-78, -34), P(-44, -8),
        P(-16, -38), P(0, -10), P(14, -40), P(44, -6), P(76, -36),
        P(58, -80), P(74, -118), P(48, -154),
      ], true);
      // 残袍上透出的余烬缝
      for (let k = 0; k < 5; k += 1) {
        const ex = -44 + k * 22;
        art.fillStyle(0xff5a1e, 0.30 * flick + 0.18).fillPoints([
          P(ex, -140), P(ex + 9, -104), P(ex + 4, -60), P(ex - 5, -96),
        ], true);
      }

      // --- 外露的发光脊椎与肋骨（发白热，是视觉重点）
      art.fillStyle(0xff8a3a, 0.30 * flick + 0.22).fillCircle(x, FLOOR - 214 + bob, 40);
      art.lineStyle(7, 0xff6a24, 0.9).lineBetween(P(0, -252).x, P(0, -252).y, P(0, -170).x, P(0, -170).y);
      art.lineStyle(3, 0xfff0d0, 0.95).lineBetween(P(0, -252).x, P(0, -252).y, P(0, -170).x, P(0, -170).y);
      for (let rib = 0; rib < 6; rib += 1) {
        const ry = -248 + rib * 15;
        const w = 30 + rib * 3;
        art.lineStyle(4, 0xffb45c, 0.92).beginPath();
        art.moveTo(P(-4, ry).x, P(-4, ry).y).lineTo(P(-w, ry + 9).x, P(-w, ry + 9).y).lineTo(P(-w - 10, ry + 20).x, P(-w - 10, ry + 20).y);
        art.moveTo(P(4, ry).x, P(4, ry).y).lineTo(P(w, ry + 9).x, P(w, ry + 9).y).lineTo(P(w + 10, ry + 20).x, P(w + 10, ry + 20).y);
        art.strokePath();
        // 肋间透出的火
        if (rib < 5) {
          art.fillStyle(0xff4d14, 0.26 * flick + 0.14).fillCircle(P(0, ry + 8).x, P(0, ry + 8).y, 15);
        }
      }
      // 胸骨核心：一颗白热的炉心
      art.fillStyle(0xff3a10, 0.42 * flick + 0.28).fillCircle(P(0, -206).x, P(0, -206).y, 20);
      art.fillStyle(0xffd27a, 0.98).fillCircle(P(0, -206).x, P(0, -206).y, 9);
      art.fillStyle(0xfffdf2, 1).fillCircle(P(0, -206).x, P(0, -206).y, 4);

      // --- 拉长的燃烧双臂 + 利爪
      for (const side of [-1, 1]) {
        art.lineStyle(7, 0x1a0f1c, 1).lineBetween(P(side * 38, -250).x, P(side * 38, -250).y, P(side * 104, -226).x, P(side * 104, -226).y);
        art.lineStyle(4, 0xd9cbe2, 0.9).lineBetween(P(side * 38, -250).x, P(side * 38, -250).y, P(side * 104, -226).x, P(side * 104, -226).y);
        for (let c = -1; c <= 1; c += 1) {
          art.lineStyle(3, 0xffc078, 0.9).lineBetween(
            P(side * 104, -226).x, P(side * 104, -226).y,
            P(side * (120 + c * 6), -204 + c * 10).x, P(side * (120 + c * 6), -204 + c * 10).y);
        }
      }

      // --- 裂开的头骨：外轮廓加深，顶部开一道裂口喷火
      const headY = FLOOR - 336 + bob;
      art.fillStyle(0x140c18, 1).fillPoints([
        { x: x - 50, y: headY + 47 }, { x: x - 61, y: headY + 11 },
        { x: x - 45, y: headY - 26 }, { x: x - 20, y: headY - 46 },
        { x: x + 20, y: headY - 46 }, { x: x + 48, y: headY - 19 },
        { x: x + 58, y: headY + 18 }, { x: x + 37, y: headY + 46 },
      ], true);
      art.fillStyle(0xd8cfe0, 0.96).fillPoints([
        { x: x - 36, y: headY + 30 }, { x: x - 40, y: headY + 5 },
        { x: x - 26, y: headY - 20 }, { x: x - 8, y: headY - 29 },
        { x: x + 21, y: headY - 24 }, { x: x + 35, y: headY + 1 },
        { x: x + 27, y: headY + 29 }, { x: x + 11, y: headY + 40 },
        { x: x - 14, y: headY + 40 },
      ], true);
      // 顶部裂缝 + 喷出的火
      art.fillStyle(0xff4d14, 0.5 * flick + 0.3).fillPoints([
        { x: x - 14, y: headY - 30 }, { x: x + 2, y: headY - 58 },
        { x: x + 16, y: headY - 26 }, { x: x + 4, y: headY - 12 },
      ], true);
      art.fillStyle(0xfff0c8, 0.95).fillPoints([
        { x: x - 6, y: headY - 26 }, { x: x + 2, y: headY - 42 },
        { x: x + 8, y: headY - 24 }, { x: x + 2, y: headY - 16 },
      ], true);
      // 眼窝：炽白核心
      art.fillStyle(0xff3a12, 0.45 * flick + 0.35).fillCircle(x - 18, headY + 3, 12);
      art.fillStyle(0xff3a12, 0.45 * flick + 0.35).fillCircle(x + 19, headY + 3, 12);
      art.fillStyle(0xffe9a8, 1).fillCircle(x - 18, headY + 3, 5);
      art.fillStyle(0xffe9a8, 1).fillCircle(x + 19, headY + 3, 5);
      // 牙关
      for (let k = -2; k <= 2; k += 1) {
        art.lineStyle(2, 0xffb45c, 0.8).lineBetween(x + k * 7, headY + 24, x + k * 7, headY + 31);
      }

      // --- 脚下的火环
      art.fillStyle(0xff4d14, 0.22 * flick + 0.12).fillCircle(x, FLOOR + bob - 8, 96 * S);
      // 灼热光环的边界圈：让「贴太近会被烧」这件事是看得见的，而不是暗算
      art.lineStyle(2, 0xff6a2a, 0.26 + Math.sin(t * 6) * 0.14).strokeCircle(x, FLOOR + bob - 6, 118 * S);
      art.lineStyle(1, 0xffb45c, 0.18 + Math.sin(t * 6 + 1.6) * 0.10).strokeCircle(x, FLOOR + bob - 6, 118 * S - 6);
    }

    // P5 复活过场：4.4 秒七个节拍。
    // 原来是"闪一下 + 一行字"，玩家来不及反应就进了 P5；
    // 这里压暗画面 + 逐句台词 + 火焰爆发，把"它变成了别的东西"讲清楚。
    beginBossRevive() {
      const b = this.boss;
      const bx = this.bossSprite.x;
      b.revived = true;
      b.phase = 5;
      b.p5Stage = 1;
      b.mode = 'revive';
      b.timer = 4.4;
      b.hp = b.maxHp;
      b.burn = PHASE5_BURN_SECONDS;
      b.posture = 0;
      b.move = '';
      b.sequence = 0;
      b.lastMove = '';
      b.hitResolved = true;
      b.facing = -1;
      this.bossSprite.setFlipX(true);
      this.bossLabel.setText('裂隙巫妖 · P5 · 亡者归来');
      this.bossLabel.setColor('#ff8a5c');
      this.updateMoveCard('slash', '亡者归来');
      this.playMusic('p5');
      const ringFx = () => this.skillFx('fx-soulburst', 'fx_soulburst');

      // 节拍 1：倒下
      this.cameras.main.flash(420, 130, 10, 6);
      this.cameras.main.shake(460, 0.017);
      this.playSfx('sfx_boss_death', 0.55);
      this.spawnBurst(bx, FLOOR - 150, 0xff5a1e, 46);
      this.spawnBurst(bx, FLOOR - 90, 0x2a1a2e, 30);
      this.setMessage('裂隙巫妖的骨架散了架，重重砸在地上。');

      // 节拍 2：死寂 —— 压暗 + 推近，然后交给对话框演
      this.time.delayedCall(900, () => {
        this.cameras.main.zoomTo(1.14, 700);
        this.dimScreen(0.62, 500);
      });
      this.deferBeat(1600, () => {
        this.startDialogue(STORY.revive, () => this.igniteFieryForm(bx));
      });
    }

    // 对话结束后点火：这才是"形态切换"真正发生的一刻
    igniteFieryForm(bx) {
      const b = this.boss;
      this.dimScreen(0, 260);
      this.cameras.main.flash(340, 255, 220, 170);
      this.cameras.main.shake(620, 0.02);
      this.cameras.main.zoomTo(1.0, 520);
      this.playSfx('sfx_boss_phase', 0.55);
      this.playSfx('sfx_rune_burst', 0.4);
      const ringFx = () => this.skillFx('fx-soulburst', 'fx_soulburst');
      for (let i = 0; i < 3; i += 1) {
        this.time.delayedCall(i * 170, () => {
          const rf = ringFx();
          this.spawnFx(rf.anim, rf.tex, bx, FLOOR - 40, 3.2 + i * 1.5, 9);
        });
      }
      this.spawnBurst(bx, FLOOR - 170, 0xffb45c, 54);
      this.startBossFlames();
      // C 燃烧形态：两条骸骨巨手直接从肩膀上长出来，常驻，可被摧毁且不再生
      this.makeHand(2, HAND_ATTACHED_HP);
      b.handGone = false;
      this.setMessage('兩隻骸骨巨手從它肩上長了出來——打碎它們，就能廢掉錘擊與抓取。');
      b.mode = 'idle';
      b.timer = 0.5;
      b.sequence = 0;
      b.hitResolved = true;
      this.playerState.invuln = Math.max(this.playerState.invuln, 2.0);
      this.setMessage('亡者归来：它的生命正在自燃。撑到烈焰烧尽，或者抢先把它打散。');
    }

    // 燃尽终曲：血条烧空或被直接打死时走这里，3.6 秒熄灭演出后才结算。
    beginBossBurnout() {
      const b = this.boss;
      if (this.status !== 'run' || b.mode === 'burnout') return;
      const bx = this.bossSprite.x;
      b.mode = 'burnout';
      b.timer = 3.6;
      b.hp = 0;
      this.playerState.invuln = Math.max(this.playerState.invuln, 4.5);
      this.playerState.hurtTimer = 0;
      this.playMusic('burnout');
      // 骨臂是精灵不是 Graphics：Boss 都烧没了，手不能还杵在地图上
      this.stopBossFlames();
      // ① 手没了就必须先放开玩家，否则 grabbed 永远不会清除，
      // 玩家会被一只不存在的手永久钉住
      this.releaseGrab(false);
      b.hand = null;
      // ② Boss 都烧没了，追蹤球不能还在场上追（玩家反馈：死了还放球）
      if (b.souls) {
        b.souls.forEach((o) => { if (o.spr) o.spr.destroy(); if (o.halo) o.halo.destroy(); });
        b.souls = null;
      }
      if (this.handSprites) {
        for (const k of Object.keys(this.handSprites)) {
          if (this.handSprites[k]) this.handSprites[k].destroy();
        }
        this.handSprites = null;
      }
      this.playSfx('sfx_boss_death', 0.6);
      this.cameras.main.shake(820, 0.02);
      this.cameras.main.flash(320, 255, 214, 150);
      // 火焰暴涨
      if (this.bossFlames) {
        for (const f of this.bossFlames) { f.s.setScale(f.s.scaleX * 1.7, f.s.scaleY * 1.7); }
      }
      this.setMessage('烈焰终于烧穿了它自己。');
      const ringFx = () => this.skillFx('fx-soulburst', 'fx_soulburst');
      for (let i = 0; i < 4; i += 1) {
        this.time.delayedCall(i * 150, () => {
          const rf = ringFx();
          this.spawnFx(rf.anim, rf.tex, bx, FLOOR - 46, 2.6 + i * 1.3, 9);
        });
      }
      this.spawnBurst(bx, FLOOR - 170, 0xffd27a, 64);
      this.spawnBurst(bx, FLOOR - 100, 0xff5a1e, 52);
      this.spawnBurst(bx, FLOOR - 40, 0xff3a10, 40);
      // 熄灭：火焰散掉，镜头推近余烬
      this.time.delayedCall(1500, () => {
        this.stopBossFlames();
        this.cameras.main.zoomTo(1.16, 800);
        this.setMessage('骨架连同火焰一起塌成一堆余烬。');
      });
      this.time.delayedCall(2400, () => { this.spawnBurst(bx, FLOOR - 30, 0x8a7a6a, 26); });
      // 它不会安安静静地死——残骸聚成一颗核，做最后一次自爆突进
      this.deferBeat(2800, () => {
        this.startDialogue(STORY.burnout, () => this.beginFinalDive(bx));
      });
    }

    // ==================== 最终自爆突进 ====================
    // 锁定 2.2 秒（地面有预警圈）→ 0.4 秒突进 → 爆炸。
    // 走位或闪避无敌帧都能躲开；被命中吃 45 伤害，若因此阵亡就是战败。
    beginFinalDive(bx) {
      if (this.status !== 'run') return;
      const by = FLOOR - 150;
      this.cameras.main.zoomTo(1.0, 500);
      // ⑤ 原来就是两个纯色圆，难怪假。重做成：多层光晕 + 白热核心 +
      // 绕着核心转的火焰精灵 + 不断掉落的拖尾火星。
      const halo = this.add.circle(bx, by, 58, 0xff2a06, 0.30).setDepth(25);
      const mid = this.add.circle(bx, by, 36, 0xff6a1e, 0.62).setDepth(26);
      const core = this.add.circle(bx, by, 17, 0xfff6dc, 1).setDepth(28);
      const flames = [];
      for (let i = 0; i < 5; i += 1) {
        const fl = this.add.sprite(bx, by, 'fx_flame', 0)
          .setOrigin(0.5, 0.5).setDepth(27).setScale(0.36).play('fx-flame');
        fl.anims.timeScale = 1.7 + i * 0.08;
        fl.setFrame(i * 3 % 16);
        flames.push(fl);
      }
      const reticle = this.add.graphics().setDepth(30);
      this.finalDive = { halo, mid, core, flames, reticle, t: 0, locked: false, tx: this.player.x, ty: this.player.y, done: false, trailT: 0 };
      this.playSfx('sfx_boss_tell', 0.42);
      // ④ 被挑衅过就很快：逃跑窗口从 1.0 秒压到 0.4 秒，非常难躲
      this.finalDive.escape = this.storyFlag === 'taunt' ? 0.4 : DIVE_ESCAPE;
      if (this.storyFlag === 'taunt') this.setMessage('它被激怒了——这次自爆没有给你留时间。');
      this.setMessage('烧红的核浮在半空，开始锁定你——离开地面上的红圈。');
    }

    updateFinalDive(dt) {
      const d = this.finalDive;
      if (!d || d.done) return;
      d.t += dt;
      const pulse = 1 + Math.sin(this.elapsed * 18) * 0.13;
      // 环绕核心旋转的火焰 + 彗尾火星
      if (d.flames) {
        for (let i = 0; i < d.flames.length; i += 1) {
          const a = this.elapsed * (2.6 + i * 0.4) + i * (Math.PI * 2 / d.flames.length);
          d.flames[i].setPosition(d.core.x + Math.cos(a) * 30, d.core.y + Math.sin(a) * 27);
          d.flames[i].setFlipX(Math.cos(a) < 0);
        }
        d.mid.setPosition(d.core.x, d.core.y).setScale(pulse);
        d.halo.setPosition(d.core.x, d.core.y).setScale(1 + Math.sin(this.elapsed * 7) * 0.1);
        d.trailT = (d.trailT || 0) - dt;
        if (d.trailT <= 0) {
          d.trailT = 0.035;
          const dot = this.add.circle(d.core.x + (Math.random() - 0.5) * 26, d.core.y + (Math.random() - 0.5) * 26,
            2 + Math.random() * 3, Math.random() < 0.5 ? 0xffd27a : 0xff5a1e, 0.9).setDepth(24);
          this.tweens.add({ targets: dot, y: dot.y + 26 + Math.random() * 30, alpha: 0, scale: 0.2,
            duration: 380 + Math.random() * 260, onComplete: () => dot.destroy() });
        }
      }
      if (!d.locked) {
        // 锁定阶段：预警圈跟着玩家实时移动
        d.tx = this.player.x;
        d.ty = this.player.y;
        const dx = this.player.x - d.core.x, dy = (this.player.y - 42) - d.core.y;
        d.reticle.clear();
        d.reticle.lineStyle(2, 0xff4d14, 0.5).lineBetween(d.core.x, d.core.y, d.core.x + dx, d.core.y + dy);
        d.reticle.lineStyle(3, 0xffd27a, 0.9).strokeCircle(this.player.x, FLOOR - 3, 52 * pulse);
        d.reticle.lineStyle(2, 0xfff0c8, 0.75).strokeCircle(this.player.x, FLOOR - 3, 34);
        d.halo.setScale(pulse);
        d.core.setScale(1 + Math.sin(this.elapsed * 22) * 0.14);
        if (d.t >= DIVE_AIM) {
          d.locked = true;
          d.tx = this.player.x;
          d.lockT = d.t;
          // 清掉此前的无敌，让"最后一下"真的算数
          this.playerState.invuln = 0;
          this.playSfx('sfx_boss_tell', 0.6);
          this.cameras.main.shake(260, 0.008);
          this.setMessage(`鎖定了！離開紅圈——有 ${(d.escape || DIVE_ESCAPE).toFixed(1)} 秒。`);
          // 落点定死，之后不再跟随玩家
          this.time.delayedCall((d.escape || DIVE_ESCAPE) * 1000, () => {
            if (!this.finalDive || this.finalDive.done) return;
            const moveTargets = [d.core, d.mid, d.halo].concat(d.flames || []);
            this.tweens.add({
              targets: moveTargets,
              x: d.tx,
              y: FLOOR - 34,
              duration: DIVE_RUSH * 1000,
              ease: 'Quad.In',
              onComplete: () => this.resolveFinalDive(d.tx),
            });
          });
        }
        return;
      }
      // ===== 锁定阶段：地面画出真正的爆炸范围，并一直留到落地 =====
      // （原来这里只写了 d.reticle.clear()，落点标记在最需要的时候消失了）
      d.reticle.clear();
      const kEscape = Math.max(0, Math.min(1, (d.t - DIVE_AIM) / (d.escape || DIVE_ESCAPE)));
      this.drawCountdown(d.reticle, d.tx, FLOOR - 4, DIVE_RADIUS, kEscape, 0xfff0c8, 0xff4d14);
      d.reticle.lineStyle(2, 0xffd27a, 0.65).strokeCircle(d.tx, FLOOR - 4, DIVE_RADIUS * 0.55);
      d.reticle.lineStyle(4, 0xfff0c8, 0.9).lineBetween(d.tx - 22, FLOOR - 26, d.tx + 22, FLOOR + 18);
      d.reticle.lineBetween(d.tx + 22, FLOOR - 26, d.tx - 22, FLOOR + 18);
      // 闪烁提示：一直喊到落地，避免玩家没看到
      d.warnT = (d.warnT || 0) - dt;
      if (d.warnT <= 0) {
        d.warnT = 0.45;
        this.floatText(d.tx, FLOOR - 128, '離開紅圈！', '#ff6a2a');
      }
      d.core.setPosition(d.core.x, FLOOR - 150 - Math.sin(this.elapsed * 14) * 6);
    }

    resolveFinalDive(lockTx) {
      const d = this.finalDive;
      if (!d || d.done) return;
      d.done = true;
      // 判定半径和地面画的圈完全一致，玩家看到多少就是多少
      const dist = Math.abs(this.player.x - lockTx);
      // 爆炸
      this.cameras.main.flash(300, 255, 190, 130);
      this.cameras.main.shake(680, 0.019);
      this.playSfx('sfx_rune_burst', 0.55);
      const ringFx = () => this.skillFx('fx-soulburst', 'fx_soulburst');
      for (let i = 0; i < 4; i += 1) {
        this.time.delayedCall(i * 120, () => {
          const rf = ringFx();
          this.spawnFx(rf.anim, rf.tex, lockTx, FLOOR - 40, 2.4 + i * 1.1, 9);
        });
      }
      this.cameras.main.flash(200, 255, 240, 210);
      this.spawnBurst(lockTx, FLOOR - 90, 0xfff6dc, 40);
      this.spawnBurst(lockTx, FLOOR - 60, 0xffd27a, 72);
      this.spawnBurst(lockTx, FLOOR - 30, 0xff4d14, 60);
      this.spawnBurst(lockTx, FLOOR - 10, 0xff3a10, 44);
      this.spawnEmber(lockTx, 108);
      // 火柱从爆点窜起
      for (let i = -1; i <= 1; i += 1) this.eruptColumn(lockTx + i * 70);
      if (d.core) d.core.destroy();
      if (d.mid) d.mid.destroy();
      if (d.halo) d.halo.destroy();
      if (d.flames) d.flames.forEach((f) => f && f.destroy());
      if (d.reticle) d.reticle.destroy();
      this.finalDive = null;
      const hit = dist <= DIVE_RADIUS;
      if (hit) {
        this.playerDamage('亡者自爆', 45);
      } else {
        // 躲开了要给明确的正面反馈，不然玩家不知道自己是不是运气好
        this.floatText(this.player.x, FLOOR - 150, '躲開了！', '#9fe8c0');
        this.playSfx('sfx_dodge', 0.4);
        this.setMessage('你跑出了爆炸範圍——最後一下躲過去了。');
      }
      this.time.delayedCall(1100, () => {
        if (this.status !== 'run') return;   // 被炸死的话走战败结算
        this.startDialogue(hit ? STORY.tookIt : STORY.survived, () => {
          if (this.status === 'run') this.endRun(true);
        });
      });
    }

    // ==================== 骸骨巨手 / 祈祷术 ====================
    // 巨手不是从地里冒出来的，是巫妖**从自己肩膀上伸出去的骷髅臂**。
    //   P1-P4：念咒后一条骨臂从肩膀窜出去抓人；抓空或到期会缩回去并移除。
    //   P5：两条骨臂常驻连在双肩，可锤击可抓取，共用 200 血条，打碎后不再生。
    handAnchorX(side) { return this.bossSprite.x + side * 44; }

    makeHand(count, hp) {
      const b = this.boss;
      b.hand = {
        count,
        hp,
        maxHp: hp,
        attached: count === 2,
        destroyed: false,
        state: count === 2 ? 'idle' : 'grabOut',
        t: 0,
        ext: count === 2 ? 1 : 0,
        checked: false,
        // 手指开合：curl 是当前值，curlTarget 是目标，中间平滑过渡
        curl: 0,
        curlTarget: 0,
        grabPending: 0,
        grabX: 0,
        targetX: this.player.x,
      };
    }

    // 骨臂末端（手掌）的位置：按状态在"垂在身侧"和"伸出去"之间插值
    handTip(h, side) {
      const bx = this.bossSprite.x;
      // 原来垂到 FLOOR-34（几乎贴地），看起来像掉在地上而不是长在身上
      const restX = bx + side * 86;
      const restY = FLOOR - 148;
      const reachX = h.targetX ?? this.player.x;
      if (h.state === 'slamUp') return { x: reachX, y: FLOOR - 330 };
      if (h.state === 'slamDown') return { x: reachX + side * 20, y: FLOOR - 26 };
      const k = h.state === 'grabOut' ? h.ext : h.state === 'retract' ? h.ext : 0;
      return { x: restX + (reachX - restX) * k, y: restY + (FLOOR - 86 - restY) * k };
    }

    // 一根骨头：两端粗、中段细（骨腰）。用六边形，比等宽线条像骨骼得多。
    drawBone(g, x1, y1, x2, y2, w1, w2, dark, bone) {
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const mw = Math.min(w1, w2) * 0.5;
      const poly = (k) => ([
        { x: x1 + nx * Math.max(0.5, w1 - k), y: y1 + ny * Math.max(0.5, w1 - k) },
        { x: mx + nx * Math.max(0.5, mw - k * 0.5), y: my + ny * Math.max(0.5, mw - k * 0.5) },
        { x: x2 + nx * Math.max(0.5, w2 - k), y: y2 + ny * Math.max(0.5, w2 - k) },
        { x: x2 - nx * Math.max(0.5, w2 - k), y: y2 - ny * Math.max(0.5, w2 - k) },
        { x: mx - nx * Math.max(0.5, mw - k * 0.5), y: my - ny * Math.max(0.5, mw - k * 0.5) },
        { x: x1 - nx * Math.max(0.5, w1 - k), y: y1 - ny * Math.max(0.5, w1 - k) },
      ]);
      g.fillStyle(dark, 0.97).fillPoints(poly(0), true);
      g.fillStyle(bone, 0.96).fillPoints(poly(3.5), true);
      g.fillStyle(dark, 0.97).fillCircle(x1, y1, w1);
      g.fillStyle(bone, 0.97).fillCircle(x1, y1, Math.max(1, w1 - 3));
      g.fillStyle(dark, 0.97).fillCircle(x2, y2, w2);
      g.fillStyle(bone, 0.97).fillCircle(x2, y2, Math.max(1, w2 - 2.5));
    }

    // 一根手指：三节指骨，curl 控制蜷曲（张开 0，抓住 1）
    drawFinger(g, x, y, angle, len, curl, dark, bone) {
      let px = x, py = y, a = angle;
      for (let i = 0; i < 3; i += 1) {
        const L = len * (0.46 - i * 0.08);
        a += curl * 0.62;
        const qx = px + Math.cos(a) * L, qy = py + Math.sin(a) * L;
        const w = 8.5 - i * 2.1;
        this.drawBone(g, px, py, qx, qy, w, Math.max(2, w - 1.6), dark, bone);
        px = qx; py = qy;
      }
    }

    // 一整只骷髅手：梯形掌骨 + 四指 + 拇指
    drawSkeletalHand(g, cx, cy, side, scale, curl, dark, bone, fiery) {
      const dx = side > 0 ? 1 : -1;
      const pw = 23 * scale;
      // 掌骨板
      g.fillStyle(dark, 0.97).fillPoints([
        { x: cx - dx * 17 * scale, y: cy - pw * 0.70 },
        { x: cx + dx * 13 * scale, y: cy - pw * 0.98 },
        { x: cx + dx * 13 * scale, y: cy + pw * 0.98 },
        { x: cx - dx * 17 * scale, y: cy + pw * 0.70 },
      ], true);
      g.fillStyle(bone, 0.96).fillPoints([
        { x: cx - dx * 16 * scale, y: cy - pw * 0.50 },
        { x: cx + dx * 12 * scale, y: cy - pw * 0.74 },
        { x: cx + dx * 12 * scale, y: cy + pw * 0.74 },
        { x: cx - dx * 16 * scale, y: cy + pw * 0.50 },
      ], true);
      // 四指
      const base = side > 0 ? 0 : Math.PI;
      for (let i = 0; i < 4; i += 1) {
        const a = base + (i - 1.5) * 0.30;
        const len = (35 - Math.abs(i - 1.5) * 5) * scale;
        this.drawFinger(g, cx + dx * 12 * scale, cy + (i - 1.5) * pw * 0.48, a, len, curl, dark, bone);
      }
      // 拇指：从掌根斜着伸出去
      this.drawFinger(g, cx - dx * 7 * scale, cy + pw * 0.80, base + (side > 0 ? 1.2 : -1.2),
        29 * scale, curl, dark, bone);
      if (fiery) {
        const fl = 0.8 + Math.sin(this.elapsed * 12) * 0.2;
        g.fillStyle(0xff4d14, 0.26 * fl).fillCircle(cx, cy, 24 * scale);
        g.fillStyle(0xffd27a, 0.55 * fl).fillCircle(cx, cy, 9 * scale);
      }
    }

    // 整条骨臂：肩窝 -> 上臂 -> 肘 -> 前臂 -> 手
    drawArm(g, ax, ay, tipX, tipY, side, scale, curl, dark, bone, fiery) {
      const midX = (ax + tipX) / 2 + side * 14 * scale;
      const midY = Math.min(ay, tipY) - 20 * scale;
      // 肩窝
      g.fillStyle(dark, 0.97).fillCircle(ax, ay, 15 * scale);
      g.fillStyle(bone, 0.97).fillCircle(ax, ay, 11 * scale);
      g.fillStyle(dark, 0.97).fillCircle(ax, ay, 5 * scale);
      // 上臂 / 前臂：上臂更粗
      this.drawBone(g, ax, ay, midX, midY, 13 * scale, 10 * scale, dark, bone);
      this.drawBone(g, midX, midY, tipX, tipY, 10 * scale, 7.5 * scale, dark, bone);
      this.drawSkeletalHand(g, tipX, tipY, side, scale, curl, dark, bone, fiery);
      if (fiery) {
        g.fillStyle(0xff5a1e, 0.16).fillCircle(midX, midY, 16 * scale);
      }
    }

    // B 活着的时候：念咒召唤一条骨臂从身体里窜出去抓人
    castHand() {
      const b = this.boss;
      const hx = this.boss.handX ?? this.player.x;
      this.makeHand(1, HAND_TRAP_HP);
      this.boss.hand.targetX = hx;
      this.playSfx('sfx_rune_burst', 0.34);
      this.cameras.main.shake(260, 0.007);
      this.spawnBurst(this.handAnchorX(1), FLOOR - 250, 0xe4dcee, 26);
      this.boss.hand.curl = 0;
      this.boss.hand.curlTarget = 0;
      this.boss.hand.checked = false;
      this.boss.hand.reachable = true;   // 召唤版的目标点已经预判过，正常判定
      // ③ 抓取与拍地交替：巨手不只会抓，也会砸
      b.handCastCount = (b.handCastCount || 0) + 1;
      if (b.handCastCount % 2 === 0) {
        this.boss.hand.slam = true;
        this.setMessage('骸骨巨手高高抬起——它要拍下来了。');
      } else {
        this.setMessage('骸骨巨手張著手指從它身上伸出來——離開那條軌跡。');
      }
    }

    // ③ 召唤形态的拍地：抬手 -> 砸下（和燃烧形态共用同一套冲击反馈）
    slamImpact(hx) {
      this.cameras.main.shake(560, 0.017);
      this.cameras.main.flash(130, 255, 230, 190);
      this.playSfx('sfx_boss_death', 0.3);
      for (let i = 0; i < 3; i += 1) {
        const ring = this.add.circle(hx, FLOOR - 6, 130, 0x000000, 0)
          .setStrokeStyle(7, 0xe8e0f0, 0.9).setDepth(20).setScale(0.15);
        this.tweens.add({ targets: ring, scale: 1 + i * 0.3, alpha: 0,
          duration: 460 + i * 90, onComplete: () => ring.destroy() });
      }
      for (let i = 0; i < 22; i += 1) {
        const dust = this.add.circle(hx + (Math.random() - 0.5) * 120, FLOOR - 8,
          2 + Math.random() * 4, Math.random() < 0.5 ? 0xd8cfe0 : 0x9a8fa8, 0.9).setDepth(21);
        this.tweens.add({ targets: dust, y: dust.y - 40 - Math.random() * 70,
          x: dust.x + (Math.random() - 0.5) * 90, alpha: 0, scale: 0.3,
          duration: 420 + Math.random() * 320, onComplete: () => dust.destroy() });
      }
      this.spawnBurst(hx, FLOOR - 20, 0xd8cfe0, 40);
      this.spawnEmber(hx, 62);
      const inZone = Math.abs(this.player.x - hx) <= 104;
      if (inZone && this.isPlayerGrounded()) {
        this.resolveIncoming({ source: '骸骨巨手拍擊', damage: 30, attackerX: hx, range: 106, guardable: false, parryable: false });
      } else {
        this.stats.bossWhiffs += 1;
        this.setMessage('巨手拍空——跳起來或跑出圈都行。');
      }
    }

    // C 燃烧形态：两条骨臂锤击
    castHandSlam() {
      const h = this.boss.hand;
      if (!h || h.destroyed) return;
      h.state = 'slamUp';
      h.targetX = this.boss.handX ?? this.player.x;
      h.curlTarget = 0.35;              // 抬起来的时候手半张着
      this.playSfx('sfx_rune_burst', 0.42);
      this.setMessage('巨手高高舉起——要砸下來了。');
      // 抬手要慢，玩家才读得出来；原来 240ms 一晃就过去
      this.time.delayedCall(500, () => {
        if (!this.boss.hand || this.boss.hand.destroyed) return;
        const hx = this.boss.hand.targetX;
        const h2 = this.boss.hand;
        h2.state = 'slamDown';
        h2.curlTarget = 1;
        this.cameras.main.shake(620, 0.019);
        this.cameras.main.flash(150, 255, 230, 190);
        this.playSfx('sfx_boss_death', 0.34);
        // 三圈扩散尘环 + 碎屑往上炸
        for (let i = 0; i < 3; i += 1) {
          const ring = this.add.circle(hx, FLOOR - 6, 130, 0x000000, 0)
            .setStrokeStyle(7, 0xe8e0f0, 0.9).setDepth(20).setScale(0.15);
          this.tweens.add({ targets: ring, scale: 1 + i * 0.3, alpha: 0,
            duration: 460 + i * 90, onComplete: () => ring.destroy() });
        }
        for (let i = 0; i < 26; i += 1) {
          const dust = this.add.circle(hx + (Math.random() - 0.5) * 120, FLOOR - 8,
            2 + Math.random() * 4, Math.random() < 0.5 ? 0xd8cfe0 : 0x9a8fa8, 0.9).setDepth(21);
          this.tweens.add({ targets: dust, y: dust.y - 40 - Math.random() * 70,
            x: dust.x + (Math.random() - 0.5) * 90, alpha: 0, scale: 0.3,
            duration: 420 + Math.random() * 320, onComplete: () => dust.destroy() });
        }
        this.spawnBurst(hx, FLOOR - 20, 0xd8cfe0, 44);
        this.spawnBurst(hx, FLOOR - 40, 0xff8a3a, 34);
        this.spawnEmber(hx, 62);
        this.eruptColumn(hx - 74);
        this.eruptColumn(hx + 74);
        const inZone = Math.abs(this.player.x - hx) <= 104;
        if (inZone && this.isPlayerGrounded()) {
          this.resolveIncoming({ source: '巨手錘擊', damage: this.bossMoves().handSlam.damage, attackerX: hx, range: 106, guardable: false, parryable: false });
        } else {
          this.stats.bossWhiffs += 1;
          this.setMessage('巨手錘擊落空——跳起來或跑出圈都行。');
        }
        this.time.delayedCall(420, () => {
          if (!this.boss.hand || this.boss.hand.destroyed) return;
          this.boss.hand.state = 'idle';
          this.boss.hand.curlTarget = 0;
        });
      });
    }

    // C 燃烧形态：两条骨臂抓取
    castHandGrab() {
      const h = this.boss.hand;
      if (!h || h.destroyed) return;
      const dir = this.boss.facing;
      const px = this.player.x - this.bossSprite.x;
      const inPath = dir > 0 ? (px >= 0 && px <= HAND_REACH) : (px <= 0 && -px <= HAND_REACH);
      // 也走「张开伸手 -> 攥紧」的过程，而不是瞬间锁住
      h.state = 'grabOut';
      // ① 关键修复：不在伸手范围内就只伸到最大射程，并且标记为「抓不到」。
      // 原来无条件锁定玩家位置，手会一路伸到人身上，多远都能抓。
      h.reachable = inPath;
      h.targetX = inPath ? this.player.x : this.bossSprite.x + dir * HAND_REACH;
      h.ext = 0;
      h.curl = 0;
      h.curlTarget = 0;
      h.checked = false;
      h.grabPending = 0;
      this.playSfx('sfx_boss_tell', 0.46);
      if (!inPath) this.setMessage('巨手伸出去了，但你不在它的路徑上。');
    }

    beginGrab(x, attached) {
      const p = this.playerState;
      const b = this.boss;
      if (!b.hand || b.hand.destroyed) return;
      p.grabbed = { timer: 3.2, x, attached };
      b.hand.curlTarget = 1;        // 手指攥紧
      b.hand.grabPending = 0;
      p.attack = null;
      p.dodgeTimer = 0;
      this.player.body.setVelocity(0, 0);
      this.cameras.main.shake(240, 0.007);
      this.playSfx('sfx_boss_hurt', 0.4);
      this.setMessage('被骸骨巨手抓住了！按 J 一直打，把手打碎才能脱身。');
      this.stats.hitsTaken += 1;
    }

    releaseGrab(thrown) {
      const p = this.playerState;
      if (!p.grabbed) return;
      const x = p.grabbed.x;
      p.grabbed = null;
      if (this.boss.hand) { this.boss.hand.curlTarget = 0; this.boss.hand.checked = true; }
      p.invuln = Math.max(p.invuln, 0.7);
      p.invulnSource = 'grab-release';
      if (thrown) {
        this.playerDamage('骸骨巨手', 32);
        this.player.x = clamp(x + (this.bossSprite.x > x ? -120 : 120), 52, this.arenaMaxX());
      }
    }

    damageHand(amount) {
      const h = this.boss.hand;
      if (!h || h.destroyed) return;
      h.hp = Math.max(0, h.hp - amount);
      const tip = this.handTip(h, 1);
      this.floatText(tip.x, tip.y - 40, `-${amount}`, '#f6d79f');
      if (h.hp <= 0) this.destroyHand();
    }

    destroyHand() {
      const h = this.boss.hand;
      if (!h || h.destroyed) return;
      h.destroyed = true;
      h.hp = 0;
      const bx = this.bossSprite.x;
      // 被打碎就散成骨屑消失，不能留在原地
      for (const side of (h.attached ? [-1, 1] : [1])) {
        this.spawnBurst(bx + side * 62, FLOOR - 150, 0xe6dcf0, 40);
        this.spawnBurst(bx + side * 62, FLOOR - 150, 0xffd27a, 22);
      }
      this.cameras.main.shake(340, 0.009);
      this.playSfx('sfx_boss_death', 0.42);
      this.releaseGrab(false);
      this.boss.hand = null;
      if (this.handGfx) this.handGfx.clear();
      if (this.handSprites) {
        for (const k of Object.keys(this.handSprites)) {
          if (this.handSprites[k]) this.handSprites[k].destroy();
        }
        this.handSprites = null;
      }
      if (h.attached) {
        this.boss.handGone = true;
        this.setMessage('兩隻骸骨巨手都被打碎了——它們不會再長出來，巫妖失去了錘擊與抓取。');
      } else {
        this.setMessage('你打碎了骸骨巨手，從抓取中掙脫。');
      }
    }

    updateHand(dt) {
      const b = this.boss;
      const p = this.playerState;
      const h = b.hand;
      if (!h || h.destroyed) return;
      h.t += dt;

      // 手指平滑开合。攥紧比张开慢，才有"夹住"的重量感——
      // 原来 curl 是 0/1 瞬切，过程完全看不见。
      const ct = h.curlTarget || 0;
      if (Math.abs(h.curl - ct) > 0.002) {
        const rate = ct > h.curl ? 4.2 : 6.5;
        const step = Math.min(Math.abs(ct - h.curl), rate * dt);
        h.curl += Math.sign(ct - h.curl) * step;
      }

      // ③ 拍地版：抬手半秒 -> 砸下
      if (h.slam && h.state === 'grabOut' && !h.slamFired) {
        h.curlTarget = 0.35;
        h.state = 'slamUp';
      }
      if (h.slam && h.state === 'slamUp' && h.t > 0.5) {
        h.slamFired = true;
        h.state = 'slamDown';
        h.curlTarget = 1;
        this.slamImpact(this.handTip(h, 1).x);
        this.time.delayedCall(360, () => { if (b.hand) b.hand.state = 'retract'; });
      }
      if (h.state === 'retract') {
        h.ext = Math.max(0, h.ext - dt * 4.2);
        h.curlTarget = 0;
        if (h.ext <= 0 && !h.attached) {
          b.hand = null;
          this.hideHandSprites();
          if (this.handGfx) this.handGfx.clear();
          return;
        }
      }
      if (h.slam && h.state !== 'grabOut') return;
      // 伸爪：张开 -> 伸出去 -> 碰到就攥（攥到底才真正锁住玩家）
      if (h.state === 'grabOut' && !p.grabbed && !h.checked) {
        h.curlTarget = 0;
        h.ext = Math.min(1, h.ext + dt * 3.4);
        if (h.ext >= 0.99) {
          h.checked = true;
          const tip = this.handTip(h, 1);
          // ① h.reachable === false 表示「这一次本来就够不着」，不做抓取判定
          const reachable = h.reachable === false ? false
            : h.attached
              ? Math.abs(this.player.x - tip.x) < HAND_GRAB_R && p.invuln <= 0
              : Math.abs(this.player.x - tip.x) < HAND_GRAB_R && this.isPlayerGrounded() && p.invuln <= 0;
          if (reachable) {
            h.curlTarget = 1;
            h.grabPending = 0.22;      // 攥到底需要的时间
            h.grabX = tip.x;
            this.playSfx('sfx_boss_tell', 0.4);
          } else {
            h.curlTarget = 0;
            this.setMessage(h.attached ? '巨手抓空——你不在它的路徑上。' : '骸骨巨手抓空了——你離開了它的伸爪軌跡。');
          }
        }
      }

      // 攥到底 -> 真正抓住
      if (h.grabPending > 0) {
        h.grabPending -= dt;
        if (h.grabPending <= 0 && !p.grabbed) {
          h.grabPending = 0;
          this.beginGrab(h.grabX, h.attached);
        }
      }

      if (h.attached) {
        // 附身巨手：常驻，抓住时把玩家钉在手上
        if (p.grabbed) p.grabbed.x = this.bossSprite.x + b.facing * 96;
      } else if (!p.grabbed) {
        // 召唤版：伸完 -> 张开手 -> 缩回去 -> 直接移除
        if (h.state === 'grabOut' && h.t > 1.05) { h.state = 'retract'; h.curlTarget = 0; }
        if (h.state === 'retract') {
          h.ext = Math.max(0, h.ext - dt * 4.2);
          if (h.ext <= 0) {
            b.hand = null;
            this.hideHandSprites();
            if (this.handGfx) this.handGfx.clear();
            return;
          }
        }
      }

      if (!p.grabbed) return;
      p.grabbed.timer -= dt;
      if (p.grabbed.timer <= 0) this.releaseGrab(true);
    }

    drawHand() {
      const h = this.boss.hand;
      if (!h || h.destroyed) { this.hideHandSprites(); return; }
      if (!this.handSprites) this.handSprites = {};
      // 按 curl 选帧：0~1 映射到 4 帧，手指合拢的过程就是连续的
      const lvl = Math.max(0, Math.min(3, Math.floor((h.curl || 0) * 3.999)));
      const key = `hand_c${lvl}`;
      const sides = h.attached ? [-1, 1] : [1];
      const ARM_PX = 431;                 // 图内肩窝到指尖的长度
      const ORIGIN_X = 34 / 470;
      const ORIGIN_Y = 66 / 190;
      for (const side of sides) {
        const ax = this.handAnchorX(side);
        const ay = FLOOR - 250;
        const tip = this.handTip(h, side);
        const dist = Math.hypot(tip.x - ax, tip.y - ay);
        const sp = this.handSprites[side] || this.add.sprite(ax, ay, key).setDepth(17);
        this.handSprites[side] = sp;
        // 必须显式设回可见：hideHandSprites 会把所有手设成不可见，
        // 而复用旧精灵时如果不恢复，P5 就会只显示一只手
        sp.setVisible(true);
        sp.setTexture(key);
        sp.setOrigin(ORIGIN_X, ORIGIN_Y);
        sp.setPosition(ax, ay);
        sp.setRotation(Math.atan2(tip.y - ay, tip.x - ax));
        // 转到角度后再上下翻转 = 水平镜像，左手才不会倒过来
        sp.setFlipY(side < 0);
        // 长度按实际距离缩放：手精确落在目标点，伸爪时整条臂变长
        sp.setScale(Math.max(0.30, Math.min(1.15, dist / ARM_PX)));
        // 燃烧形态偏暖色
        if (h.attached) sp.setTint(0xffe0c0); else sp.clearTint();
      }
      // 不再需要的另一侧要藏起来
      if (!h.attached && this.handSprites[-1]) {
        this.handSprites[-1].setVisible(false);
      } else if (h.attached && this.handSprites[-1]) {
        this.handSprites[-1].setVisible(true);
      }
    }

    hideHandSprites() {
      if (!this.handSprites) return;
      for (const k of Object.keys(this.handSprites)) {
        if (this.handSprites[k]) this.handSprites[k].setVisible(false);
      }
    }

    // E 祈祷术：跪地回血，但期间完全不能动，被打断就白读
    pray() {
      const p = this.playerState;
      if (this.status !== 'run') return;
      if (p.grabbed) { this.setMessage('被抓住了，先打碎巨手！'); return; }
      if (p.prayTimer > 0) return;
      if (p.prayCooldown > 0) { this.setMessage(`祈禱術冷卻中：${p.prayCooldown.toFixed(1)} 秒。`); return; }
      if (p.hp >= (p.maxHp || 100)) { this.setMessage('生命已滿，不需要祈禱。'); return; }
      if (!this.isPlayerGrounded()) return;
      if (p.guardBreak > 0 || p.attack || p.dodgeTimer > 0 || p.ultimateTimer > 0 || p.hurtTimer > 0) return;
      p.prayTimer = PRAY_DURATION;
      p.prayCooldown = PRAY_COOLDOWN;
      p.attack = null;
      this.player.play('hero-idle', true);
      this.playSfx('sfx_rune_mark', 0.34);
      this.setMessage('祈禱中：不能移動與攻擊，被打到就會中斷。');
    }

    updatePray(dt) {
      const p = this.playerState;
      if (p.prayTimer <= 0) return;
      p.prayTimer -= dt;
      p.hp = Math.min(p.maxHp || 100, p.hp + (PRAY_HEAL / PRAY_DURATION) * dt);
      if (Math.random() < 0.4) {
        const dot = this.add.circle(this.player.x + (Math.random() - 0.5) * 46, FLOOR - 20, 2.4, 0xffe9a8, 0.95).setDepth(22);
        this.tweens.add({ targets: dot, y: dot.y - 80 - Math.random() * 40, alpha: 0, duration: 620, onComplete: () => dot.destroy() });
      }
      if (p.prayTimer <= 0) {
        this.playSfx('sfx-parry', 0.26);
        this.setMessage('祈禱完成：生命回復。');
      }
    }

    drawPray() {
      if (!this.prayGfx) this.prayGfx = this.add.graphics().setDepth(21);
      const g = this.prayGfx;
      g.clear();
      const p = this.playerState;
      if (p.prayTimer > 0) {
        const k = 1 - p.prayTimer / PRAY_DURATION;
        g.fillStyle(0xffe9a8, 0.15).fillCircle(this.player.x, FLOOR - 6, 52 + k * 20);
        g.lineStyle(3, 0xffd76a, 0.9).strokeCircle(this.player.x, FLOOR - 6, 52 + k * 20);
        g.lineStyle(2, 0xfff6dc, 0.75).strokeCircle(this.player.x, FLOOR - 6, 32 + k * 12);
      }
      if (this.prayLabel) {
        this.prayLabel.setText(p.prayTimer > 0 ? '祈禱中…'
          : p.prayCooldown > 0 ? `祈禱 R · ${Math.ceil(p.prayCooldown)}s` : '祈禱 R · 就緒');
        this.prayLabel.setColor(p.prayTimer > 0 ? '#ffe9a8' : p.prayCooldown > 0 ? '#7f8a9e' : '#b9e8c0');
      }
    }

    // ==================== 环伺 / 乱舞 / 精英特效 ====================
    // ③ 魂火环伺（精英版是影刃环伺）：火球绕身旋转，接触灼伤，并定期朝玩家发射。
    // 这是"环绕身子的法术"。
    castOrbit() {
      const b = this.boss;
      const rift = b.encounter === 'rift';
      const count = rift ? (b.phase === 5 ? 6 : 4) : 4;
      b.orbs = [];
      for (let i = 0; i < count; i += 1) {
        b.orbs.push({
          a: i * (Math.PI * 2 / count),
          r: rift ? 132 : 112,
          spd: (rift ? 1.55 : 1.95) * (i % 2 ? 1 : -1),
          fireT: 0.7 + i * 0.30,
          x: this.bossSprite.x,
          y: FLOOR - 210,
        });
      }
      this.playSfx('sfx_boss_phase', 0.34);
      this.setMessage(rift
        ? '魂火環伺：火球繞著它轉，碰到會被灼傷，也會朝你發射——先離開圈。'
        : '影刃環伺：刃在它身邊轉，別站在圈上。');
    }

    updateOrbs(dt) {
      const b = this.boss;
      if (!b.orbs || !b.orbs.length) return;
      if (b.mode !== 'active') { b.orbs = null; return; }
      const rift = b.encounter === 'rift';
      // 圆心下移到身体中心，半径加大，整圆才能扫到地面
      const cx = this.bossSprite.x;
      const cy = FLOOR - 168;
      for (const o of b.orbs) {
        o.a += o.spd * dt;
        // 原来竖直方向压扁成 0.42，鬼火一直飘在身体上方，根本烧不到地面的主角。
        // 改成整圆 360 度环绕，会扫到玩家高度，必须靠跳跃或走位躲。
        o.x = cx + Math.cos(o.a) * o.r;
        o.y = cy + Math.sin(o.a) * o.r;
        o.fireT -= dt;
        if (o.fireT <= 0) {
          o.fireT = rift ? 1.35 : 1.1;
          const dir = Math.sign(this.player.x - o.x) || -1;
          this.spawnProjectile(o.x, o.y, dir, rift ? 340 : 300, rift ? 11 : 13, rift ? '魂火環伺' : '影刃環伺');
        }
        // 接触伤害：改成真正的二维距离判定，配合 360 度环绕
        const near = Math.hypot(this.player.x - o.x, (this.player.y - 34) - o.y) < 46;
        if (near && this.playerState.invuln <= 0 && this.playerState.hurtTimer <= 0) {
          this.floatText(this.player.x, this.player.y - 120, '灼傷', '#ff9a5c');
          this.playerDamage(rift ? '魂火環伺' : '影刃環伺', rift ? 9 : 11);
        }
      }
    }

    drawOrbs() {
      if (!this.orbGfx) this.orbGfx = this.add.graphics().setDepth(23);
      const g = this.orbGfx;
      g.clear();
      const b = this.boss;
      if (!b.orbs || !b.orbs.length) return;
      const rift = b.encounter === 'rift';
      const t = this.elapsed;
      for (const o of b.orbs) {
        const pulse = 0.9 + Math.sin(t * 9 + o.a) * 0.12;
        if (rift) {
          g.fillStyle(0xff4d14, 0.22).fillCircle(o.x, o.y, 30 * pulse);
          g.fillStyle(0xffb45c, 0.55).fillCircle(o.x, o.y, 18 * pulse);
          g.fillStyle(0xfff6dc, 0.95).fillCircle(o.x, o.y, 8);
          g.lineStyle(2, 0xffd27a, 0.6).strokeCircle(o.x, o.y, 26 * pulse);
        } else {
          g.fillStyle(0x2b1a44, 0.85).fillCircle(o.x, o.y, 17 * pulse);
          g.fillStyle(0xc98aff, 0.9).fillCircle(o.x, o.y, 9);
          g.lineStyle(3, 0xead4ff, 0.8).lineBetween(o.x - 20, o.y, o.x + 20, o.y);
          g.lineStyle(2, 0xb98cff, 0.7).strokeCircle(o.x, o.y, 24 * pulse);
        }
      }
    }

    // ② 精英的技能特效。原来精英一招一式只有地面预警线，打完什么都没有，
    // 手感像在打木桩——这是"太垃圾"的一半原因。
    spawnEliteMoveFx(move) {
      const x = this.bossSprite.x;
      const y = FLOOR - 150;
      const fx = (anim, tex, sx, sy, sc, dp) => this.spawnFx(anim, tex, sx, sy, sc, dp);
      if (move === 'slash') {
        fx('fx-rift', 'fx_rift', x + this.boss.facing * 70, FLOOR - 110, 1.15, 9);
        this.spawnBurst(x + this.boss.facing * 80, FLOOR - 120, 0xc9a0ff, 26);
        this.cameras.main.shake(140, 0.005);
      } else if (move === 'rush') {
        fx('fx-soulburst', 'fx_soulburst', x, FLOOR - 26, 1.5, 9);
        this.spawnBurst(x, y, 0xb98cff, 30);
      } else if (move === 'wave') {
        fx('fx-rune-burst', 'fx_rune', x, FLOOR - 30, 1.1, 6);
        this.spawnBurst(x, FLOOR - 24, 0xc98aff, 24);
      } else if (move === 'shot') {
        this.spawnBurst(x + this.boss.facing * 60, FLOOR - 120, 0xd9b8ff, 16);
      }
    }

    // ④ 焚身乱舞：先选好 4 个落点
    castBlitz() {
      const b = this.boss;
      b.blitzSpots = [];
      for (let i = 0; i < 4; i += 1) b.blitzSpots.push(130 + Math.random() * 700);
      b.blitzIdx = 0;
      b.blitzT = 0;
      this.playSfx('sfx_boss_tell', 0.45);
      this.cameras.main.shake(260, 0.007);
      this.setMessage('焚身亂舞：它開始在場上亂竄——每一段落點都會燒起來。');
    }

    // ==================== 烈焰残渣 / 焚天 / 裂隙牵引 ====================
    // ① 残渣：技能落点留下燃烧地面，把竞技场一格一格烧成禁区
    spawnEmber(x, r) {
      if (!this.embers) this.embers = [];
      // 同位置已经有残渣就不重复堆，避免叠加出瞬间暴毙
      if (this.embers.some((e) => Math.abs(e.x - x) < 40)) return;
      this.embers.push({ x, r: r || EMBER_RADIUS, life: EMBER_LIFE, max: EMBER_LIFE, seed: Math.random() * 6.28 });
    }

    updateEmbers(dt) {
      if (!this.embers || !this.embers.length) return;
      for (const e of this.embers) e.life -= dt;
      this.embers = this.embers.filter((e) => e.life > 0);
      if (this.status !== 'run' || this.dialogueActive) return;
      const p = this.playerState;
      if (p.invuln > 0 || p.hurtTimer > 0) return;
      for (const e of this.embers) {
        if (Math.abs(this.player.x - e.x) <= e.r) {
          this.emberAccum = (this.emberAccum || 0) + dt;
          if (this.emberAccum >= 0.62) {
            this.emberAccum = 0;
            this.floatText(this.player.x, this.player.y - 118, '踩到殘火', '#ff8a4c');
            this.playerDamage('烈焰殘渣', 3);
          }
          return;
        }
      }
      this.emberAccum = 0;
    }

    drawEmbers() {
      if (!this.emberGfx) this.emberGfx = this.add.graphics().setDepth(7);
      const g = this.emberGfx;
      g.clear();
      if (!this.embers || !this.embers.length) return;
      const t = this.elapsed;
      for (const e of this.embers) {
        const f = e.life / e.max;
        const pulse = 0.88 + Math.sin(t * 7 + e.seed) * 0.12;
        g.fillStyle(0xff4d14, 0.17 * f + 0.05).fillCircle(e.x, FLOOR - 6, e.r * pulse);
        g.fillStyle(0xff8a3a, 0.13 * f + 0.04).fillCircle(e.x, FLOOR - 6, e.r * 0.70 * pulse);
        g.lineStyle(2, 0xffb45c, 0.32 * f + 0.10).strokeCircle(e.x, FLOOR - 6, e.r * pulse);
        for (let i = 0; i < 4; i += 1) {
          const ox = Math.sin(t * 3 + i * 2.1 + e.seed) * e.r * 0.55;
          const fl = 0.5 + Math.sin(t * 9 + i * 1.7 + e.seed) * 0.3;
          g.fillStyle(0xffd27a, 0.5 * f).fillCircle(e.x + ox, FLOOR - 14 - fl * 20, 3 + fl * 4);
        }
      }
    }

    // 火柱：喷发 → 留残渣
    eruptColumn(x) {
      for (let i = 0; i < 4; i += 1) {
        this.time.delayedCall(i * 65, () => {
          const fl = this.add.sprite(x + (Math.random() - 0.5) * 34, FLOOR - 6, 'fx_flame', 0)
            .setOrigin(0.5, 1).setDepth(18).setScale(0.85 + Math.random() * 0.5).play('fx-flame');
          fl.anims.timeScale = 1.7;
          this.tweens.add({ targets: fl, alpha: 0, duration: 760, delay: 240, onComplete: () => fl.destroy() });
        });
      }
      this.spawnBurst(x, FLOOR - 40, 0xffd27a, 30);
      this.spawnBurst(x, FLOOR - 96, 0xff5a1e, 24);
      this.spawnEmber(x, 96);
    }

    // 隕石雨：火球沿一个方向一颗接一颗砸下来
    // ── 冥河之潮：貼地衝擊波，跳起來躲 ──────────────────
    castTide() {
      const b = this.boss;
      b.tide = { x: this.bossSprite.x + b.facing * 40, dir: b.facing, t: 0 };
      this.playSfx('sfx_boss_tell', 0.42);
      this.cameras.main.shake(240, 0.006);
      this.setMessage('冥河之潮：貼地的衝擊波掃過來——跳起來躲。');
    }

    updateTide(dt) {
      const b = this.boss;
      const t = b.tide;
      if (!t) return;
      t.t += dt;
      t.x += t.dir * 520 * dt;
      if (Math.random() < 0.7) this.spawnBurst(t.x, FLOOR - 16, 0x9fe0ff, 3);
      if (this.isPlayerGrounded() && Math.abs(this.player.x - t.x) < 46
          && this.playerState.invuln <= 0 && this.playerState.hurtTimer <= 0) {
        this.playerDamage('冥河之潮', 16);
      }
      if (t.t > 3.4 || t.x < -60 || t.x > WORLD_W + 60) b.tide = null;
    }

    // ── 亡魂凝視：準星追蹤 → 鎖定 → 貫穿豎線 ────────────
    castGaze() {
      const b = this.boss;
      b.gaze = { x: this.player.x, t: 0, fired: true, hitDone: false };
      this.playSfx('sfx_rune_burst', 0.42);
      this.cameras.main.shake(220, 0.008);
      // 光束：從巫妖頭部射向鎖定的地面位置。
      // 之前這裡只有粒子，沒有畫光束，玩家看到的是「亮一下、掉血」——
      // 每一下傷害都必須有看得見的來源。
      const ox = this.bossSprite.x;
      const oy = FLOOR - 188;
      const tx = b.gaze.x;
      const ty = FLOOR - 34;
      const len = Math.hypot(tx - ox, ty - oy);
      const ang = Math.atan2(ty - oy, tx - ox);
      const cx = ox + Math.cos(ang) * len * 0.5;
      const cy = oy + Math.sin(ang) * len * 0.5;
      // 三層：外暈 / 主體 / 亮芯。逐層更亮更細，讀起來像「一擊貫穿」。
      [[52, 0x5b2fa0, 0.26, 520], [26, 0xb98cff, 0.72, 430], [9, 0xf4e9ff, 1.0, 330]]
        .forEach(([w, color, alpha, dur], i) => {
          const beam = this.add.rectangle(cx, cy, len, w, color, alpha)
            .setRotation(ang).setDepth(26 + i);
          this.tweens.add({
            targets: beam, alpha: 0, scaleY: 0.12, duration: dur, ease: 'Quad.easeOut',
            onComplete: () => beam.destroy(),
          });
        });
      // 命中點：地面炸開 + 焦痕殘留
      const scorch = this.add.ellipse(tx, FLOOR - 6, 92, 20, 0xd8b4ff, 0.55).setDepth(25);
      this.tweens.add({ targets: scorch, alpha: 0, scaleX: 1.6, duration: 760,
        onComplete: () => scorch.destroy() });
      this.spawnBurst(tx, FLOOR - 26, 0xf4e9ff, 30);
      this.spawnBurst(tx, FLOOR - 96, 0xd8b4ff, 20);
      this.spawnBurst(ox, oy, 0xb98cff, 16);
      this.cameras.main.flash(110, 190, 150, 255);
      this.setMessage('亡魂凝視：貫穿豎線已射出，橫向離開那條線即可。');
    }

    updateGaze(dt) {
      const g = this.boss.gaze;
      if (!g) return;
      g.t += dt;
      if (!g.hitDone && g.t < 0.30
          && Math.abs(this.player.x - g.x) < 46
          && this.playerState.invuln <= 0 && this.playerState.hurtTimer <= 0) {
        g.hitDone = true;
        this.playerDamage('亡魂凝視', 20);
      }
      if (g.t > 0.55) this.boss.gaze = null;
    }

    // ── 魂噬：一次六顆追蹤魂球 ──────────────────────────
    castSouls() {
      const b = this.boss;
      b.souls = [];
      const n = 6;
      for (let i = 0; i < n; i += 1) {
        // 先扇形散開，之後各自轉向玩家——散開是為了覆蓋面，轉向是為了追
        const ang = -Math.PI / 2 + (i - (n - 1) / 2) * 0.40;
        const sp = 150;
        const spr = this.add.circle(this.bossSprite.x, FLOOR - 150, 13, 0xb98cff, 0.92)
          .setDepth(23).setStrokeStyle(3, 0xefe0ff, 0.9);
        const halo = this.add.circle(this.bossSprite.x, FLOOR - 150, 22, 0x8b5cf6, 0.28).setDepth(22);
        b.souls.push({
          x: this.bossSprite.x, y: FLOOR - 150,
          vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
          life: 3.6, hit: false, spr, halo,
        });
      }
      this.playSfx('sfx_rune_burst', 0.5);
      this.cameras.main.shake(300, 0.009);
      this.setMessage('魂噬：六顆魂球會一路追著你——保持移動，別停下來。');
    }

    updateSouls(dt) {
      const b = this.boss;
      const arr = b.souls;
      if (!arr || !arr.length) return;
      const px = this.player.x;
      const py = this.player.y - 90;
      for (let i = arr.length - 1; i >= 0; i -= 1) {
        const o = arr[i];
        // 追蹤：朝玩家轉向，但轉向速率有限——追得到，但不是躲不掉
        const dx = px - o.x;
        const dy = py - o.y;
        const d = Math.hypot(dx, dy) || 1;
        const turn = 300 * dt;
        o.vx += (dx / d) * turn;
        o.vy += (dy / d) * turn;
        const sp = Math.hypot(o.vx, o.vy) || 1;
        const cap = 205;
        if (sp > cap) { o.vx = (o.vx / sp) * cap; o.vy = (o.vy / sp) * cap; }
        o.x += o.vx * dt;
        o.y += o.vy * dt;
        o.life -= dt;
        if (o.spr) o.spr.setPosition(o.x, o.y);
        if (o.halo) o.halo.setPosition(o.x, o.y);
        if (Math.random() < 0.45) this.spawnBurst(o.x, o.y, 0xd8b4ff, 1);
        if (!o.hit && Math.abs(o.x - this.player.x) < 34
            && Math.abs(o.y - (this.player.y - 80)) < 72
            && this.playerState.invuln <= 0) {
          o.hit = true;
          this.playerDamage('魂噬', 14);
          // ① 命中即爆开消失。原来只标记 hit，球还会飄 4 秒才消失，
          //    玩家看到的是「打中了却还在场上飘」= 残留。
          this.spawnBurst(o.x, o.y, 0xd8b4ff, 16);
          if (o.spr) o.spr.destroy();
          if (o.halo) o.halo.destroy();
          arr.splice(i, 1);
          continue;
        }
        // ① 撞墙就要消失。原来写的是 x < -60 / x > WORLD_W+60，
        //    但场地墙在 44 / WORLD_W-44——球撞墙后还能飞 100px，会堆在墙边不动。
        if (o.life <= 0 || o.y > FLOOR + 40 || o.x < 46 || o.x > WORLD_W - 46) {
          if (o.spr) o.spr.destroy();
          if (o.halo) o.halo.destroy();
          arr.splice(i, 1);
        }
      }
      if (!arr.length) b.souls = null;
    }

    // ── 焚天震盪：近身爆發，把玩家彈飛 ──────────────────
    castShock() {
      const b = this.boss;
      b.shockDone = true;
      this.playSfx('sfx_rune_burst', 0.55);
      this.cameras.main.shake(380, 0.014);
      this.cameras.main.flash(180, 255, 150, 60);
      for (let i = 0; i < 3; i += 1) {
        const ring = this.add.circle(this.bossSprite.x, FLOOR - 40, 40 + i * 34, 0x000000, 0)
          .setStrokeStyle(6 - i, 0xff8a3a, 0.9).setDepth(21);
        this.tweens.add({ targets: ring, scale: 2.6, alpha: 0, duration: 420 + i * 90,
          onComplete: () => ring.destroy() });
      }
      this.spawnBurst(this.bossSprite.x, FLOOR - 60, 0xffd27a, 30);
      this.spawnBurst(this.bossSprite.x, FLOOR - 90, 0xff5a1e, 22);
      const dx = this.player.x - this.bossSprite.x;
      if (Math.abs(dx) < 140 && this.playerState.invuln <= 0) {
        this.playerDamage('焚天震盪', 18);
        // 震盪的核心作用是「把人推开」而不是伤害：清掉你的站位，逼你重新接近
        const push = Math.sign(dx || this.boss.facing) || 1;
        this.player.body.setVelocityX(push * 620);
        this.player.body.setVelocityY(-340);
        this.playerState.hurtTimer = Math.max(this.playerState.hurtTimer, 0.45);
        this.floatText(this.player.x, this.player.y - 150, '被彈飛', '#ffb45c');
      }
    }

    // ── 獄火華：地面依序噴出火柱，跟著節奏換位置 ────────
    castBloom() {
      const b = this.boss;
      const spots = [];
      const base = this.player.x;
      // ③ 5 → 7 根，間隔更寬，覆蓋面更大（玩家反馈：太简单）
      for (let i = 0; i < 7; i += 1) {
        let x = base + (i - 3) * 118 + (Math.random() - 0.5) * 46;
        x = Math.max(64, Math.min(this.arenaMaxX() - 24, x));
        spots.push(x);
      }
      b.bloom = { spots, t: 0, fired: 0 };
      this.playSfx('sfx_boss_tell', 0.46);
      this.setMessage('獄火華：火柱會一根一根噴上來，跟著節奏換位置，別站在同一點。');
    }

    updateBloom(dt) {
      const bl = this.boss.bloom;
      if (!bl) return;
      bl.t += dt;
      while (bl.fired < bl.spots.length && bl.t >= 0.20 + bl.fired * 0.19) {
        const bx = bl.spots[bl.fired];
        bl.fired += 1;
        this.spawnBurst(bx, FLOOR - 30, 0xffd27a, 18);
        this.spawnBurst(bx, FLOOR - 76, 0xff5a1e, 12);
        // ③ 柱子加高加粗，并叠一层亮芯；判定宽度与视觉对齐（±42）
        const col = this.add.rectangle(bx, FLOOR - 150, 58, 300, 0xff5a1e, 0.42).setDepth(24);
        const core = this.add.rectangle(bx, FLOOR - 120, 26, 240, 0xffd88a, 0.75).setDepth(25);
        this.tweens.add({ targets: col, alpha: 0, scaleX: 0.35, duration: 420,
          onComplete: () => col.destroy() });
        this.tweens.add({ targets: core, alpha: 0, scaleX: 0.2, duration: 320,
          onComplete: () => core.destroy() });
        this.cameras.main.shake(140, 0.006);
        if (Math.abs(this.player.x - bx) < 42 && this.playerState.invuln <= 0
            && this.playerState.hurtTimer <= 0) {
          this.playerDamage('獄火華', 16);
        }
      }
      if (bl.fired >= bl.spots.length && bl.t > 2.4) this.boss.bloom = null;
    }

    castDash() {
      const b = this.boss;
      // 朝玩家那一侧冲，冲之前先定好方向（这样玩家能靠走位骗反方向）
      b.dashDir = Math.sign(this.player.x - this.bossSprite.x) || b.facing;
      b.facing = b.dashDir;
      b.dashTrailT = 0;
      this.playSfx('sfx_boss_tell', 0.5);
      this.cameras.main.shake(300, 0.008);
      this.setMessage('焚身衝刺：它要貼地衝過來了——跳起來或往側面閃。');
    }

    castMeteorRain() {
      const b = this.boss;
      const dir = b.facing;
      this.meteorRain = {
        t: 0,
        dir,
        spawned: 0,
        count: 7,
        startX: dir > 0 ? 30 : WORLD_W - 30,
        step: 0.30,
      };
      this.playSfx('sfx_boss_tell', 0.5);
      this.cameras.main.shake(260, 0.007);
      this.setMessage('隕石雨：火球沿著一個方向一顆一顆砸下來——跟著節拍往反方向走。');
    }

    updateMeteorRain(dt) {
      const r = this.meteorRain;
      if (!r) return;
      r.t += dt;
      while (r.spawned < r.count && r.t >= r.spawned * r.step) {
        const i = r.spawned;
        r.spawned += 1;
        const tx = r.startX + r.dir * (40 + i * 108);
        if (tx < 40 || tx > this.arenaMaxX() - 8) continue;
        this.spawnMeteor(tx);
      }
      if (r.spawned >= r.count && !this.meteorCount) this.meteorRain = null;
    }

    spawnMeteor(tx) {
      const lean = 150;                       // 斜着砸下来
      const dur = 640;
      const sx = tx - lean;
      const sy = -90;
      const ey = FLOOR - 22;
      this.meteorCount = (this.meteorCount || 0) + 1;
      // 陨石本体：白热核心在"头"（图内偏下），所以原点压在 0.78 处，
      // 再按下落方向旋转——头永远朝着落点。
      const sp = this.add.sprite(sx, sy, 'fx_meteor', 0)
        .setOrigin(0.5, 0.78).setDepth(24).setScale(0.92).play('fx-meteor');
      sp.anims.timeScale = 1.5;
      sp.setRotation(Math.atan2(ey - sy, tx - sx) - Math.PI / 2);
      // 地面落点圈：和判定范围一致，玩家看到多少就是多少
      const mark = this.add.circle(tx, FLOOR - 4, 62, 0xff4d14, 0.16)
        .setStrokeStyle(4, 0xff8a3a, 0.9).setDepth(20);
      // 落地前把落点圈“收紧”，读起来像倒计时
      this.tweens.add({ targets: mark, scale: 0.82, duration: dur, ease: 'Quad.In' });
      this.tweens.add({
        targets: [sp], x: tx, y: ey, duration: dur, ease: 'Quad.In',
        onComplete: () => {
          sp.destroy(); mark.destroy();
          this.meteorCount = Math.max(0, this.meteorCount - 1);
          this.meteorImpact(tx);
        },
      });
    }

    meteorImpact(tx) {
      this.cameras.main.shake(170, 0.005);
      this.playSfx('sfx_hit_flesh', 0.24);
      // 落地火环序列帧
      const boom = this.add.sprite(tx, FLOOR - 42, 'fx_meteor_impact', 0)
        .setDepth(25).setScale(0.7).play('fx-meteor-impact');
      boom.once('animationcomplete', () => boom.destroy());
      const boom2 = this.add.sprite(tx, FLOOR - 90, 'fx_meteor_impact', 0)
        .setDepth(25).setScale(0.42).play('fx-meteor-impact');
      boom2.once('animationcomplete', () => boom2.destroy());
      this.spawnBurst(tx, FLOOR - 24, 0xffd27a, 20);
      this.spawnBurst(tx, FLOOR - 46, 0xff5a1e, 14);
      if (Math.abs(this.player.x - tx) <= 62 && this.isPlayerGrounded()) {
        this.playerDamage('隕石雨', this.bossMoves().meteor.damage);
      }
    }

    // ② 焚天：全屏只有一处安全口
    castSkyBurn() {
      const zones = this.boss.burnZones || [];
      if (!zones.length) return;
      this.cameras.main.shake(460, 0.012);
      this.playSfx('sfx_rune_burst', 0.45);
      this.playSfx('sfx_boss_phase', 0.28);
      let hit = null;
      for (const z of zones) {
        if (z.safe) continue;
        this.eruptColumn(z.x);
        if (Math.abs(this.player.x - z.x) < 70) hit = z;
      }
      const safe = zones.find((z) => z.safe);
      if (safe) {
        this.floatText(safe.x, FLOOR - 96, '安全', '#9fe8c0');
        this.playSfx('sfx_guard', 0.14);
      }
      if (hit) this.playerDamage('焚天', this.bossMoves().burn.damage);
      this.setMessage('焚天：地面被烧穿，只剩一处没被点燃。');
      this.boss.burnZones = null;
      this.emberAccum = 0;
    }

    // ④ 裂隙牵引
    castRiftPull() {
      this.playSfx('sfx_boss_tell', 0.42);
      this.cameras.main.shake(240, 0.005);
      this.setMessage('裂隙牵引：它要把你拽进火里——顶住方向键往外跑。');
    }

    // ⑥ 残血红色暗角：越接近死亡，屏幕边缘越红、越随心跳脉动
    // 退出策劃模式，回到主菜单
    exitDebug() {
      this.debugMode = false;
      this.testHpMode = false;
      this.godMode = false;
      if (this.debugConfig) this.debugConfig.godMode = false;
      // 血量测试可能把上限改成了 10000，这里复位，避免影响下一局
      const p = this.playerState;
      p.maxHp = 100;
      p.hp = 100;
      p.energy = 0;
      if (this.debugPanel) this.debugPanel.setVisible(false);
      const _de = document.getElementById('debugExit');
      if (_de) _de.style.display = 'none';
      // 清场：把这一局留下的敌人 / 弹幕 / 手 / 陨石都收掉
      this.clearEncounterObjects();
      if (this.handSprites) {
        Object.keys(this.handSprites).forEach((k) => {
          if (this.handSprites[k]) this.handSprites[k].destroy();
        });
        this.handSprites = null;
      }
      this.meteorRain = null;
      this.meteorCount = 0;
      if (this.handGfx) this.handGfx.clear();
      if (this.grabGfx) this.grabGfx.clear();
      if (this.grabText) this.grabText.setVisible(false);
      // 回到主菜单：把标题、正文、按钮文字一起复位
      document.querySelector('#overlayTitle').textContent = '讀招、應對，再抓住反擊窗口';
      document.querySelector('#overlayText').textContent = '通過熱身與高壓遭遇進入檢查點，先擊敗幽影守衛精英，再決定是否挑戰裂隙巫妖。用普攻、格擋、彈反與閃避應對敵人。';
      document.querySelector('#startBtn').innerHTML = '完整試煉 <b>→</b>';
      document.querySelector('#bossBtn').innerHTML = '直達 Boss <b>↗</b>';
      document.querySelector('#resultSummary').hidden = true;
      document.querySelector('#plannerPanel').hidden = true;
      document.querySelector('#overlay').classList.remove('hidden');
      document.querySelector('#statusDot').classList.remove('live');
      this.status = 'menu';
      this.setMessage('已退出策劃模式，回到主菜單。');
    }

    // ② 10000 血承伤测试：关掉无敌，改成高血量，伤害正常结算
    toggleTestHp() {
      if (!this.debugMode) return;
      this.testHpMode = !this.testHpMode;
      const p = this.playerState;
      if (this.testHpMode) {
        this.godMode = false;
        if (this.debugConfig) this.debugConfig.godMode = false;
        p.maxHp = 10000;
        p.hp = 10000;
        this.stats.damageBySource = {};
        this.stats.damageTaken = 0;
        this.stats.hitsTaken = 0;
        this.setMessage('【血量測試】生命 10000，會正常承受傷害——站著量每一招打多少。');
      } else {
        p.maxHp = 100;
        p.hp = 100;
        this.setMessage('【血量測試】關閉，回復正常生命。');
      }
    }

    // 策划模式面板：按键表 + 故事标记 + 实时承伤统计
    drawDebugPanel() {
      const _dbgExit = document.getElementById('debugExit');
      if (_dbgExit) _dbgExit.style.display = this.debugMode && this.status === 'run' ? 'block' : 'none';
      if (!this.debugMode) { if (this.debugPanel) this.debugPanel.setVisible(false); return; }
      if (!this.debugPanel) {
        this.debugPanel = this.add.text(10, 92, '', {
          fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif', fontSize: '11px',
          color: '#9fe8c0', lineSpacing: 5,
        }).setDepth(33).setScrollFactor(0);
      }
      const rows = Object.entries(this.stats.damageBySource || {})
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k} ${v}`).join('　');
      this.debugPanel.setText([
        this.boss.revived
          ? '策劃測試　【1-2】火焰形態階段　【Q】能量　【H】回滿血　【P】暫停'
          : '策劃測試　【1-4】巫妖階段　【Q】能量　【H】回滿血　【P】暫停',
        `【B】血量測試 ${this.testHpMode ? '開(10000血)' : '關'}`,
        `累計承傷 ${this.stats.damageTaken}　受擊 ${this.stats.hitsTaken} 次　各招式：${rows || '（尚未受擊）'}`,
      ]).setVisible(true);
    }

    drawVignette() {
      if (!this.vigGfx) this.vigGfx = this.add.graphics().setDepth(47).setScrollFactor(0);
      const g = this.vigGfx;
      g.clear();
      const p = this.playerState;
      const fiery = this.boss.phase === 5 && this.boss.revived;
      const hpFactor = Math.max(0, 1 - p.hp / 55);
      const danger = (fiery ? 0.10 : 0) + hpFactor * 0.62;
      if (danger <= 0.03) return;
      const pulse = 0.72 + Math.sin(this.elapsed * 4.2) * 0.28;
      for (let i = 0; i < 5; i += 1) {
        const k = i / 5;
        g.lineStyle(24, 0x8a0f08, danger * pulse * (0.30 - k * 0.05));
        g.strokeRect(-2 + k * 22, -2 + k * 22, WIDTH + 4 - k * 44, HEIGHT + 4 - k * 44);
      }
    }

    // ==================== SLG 式对话系统 ====================
    startDialogue(lines, onDone) {
      if (!lines || !lines.length) { if (onDone) onDone(); return; }
      this.dialogueQueue = lines.slice();
      this.dialogueOnDone = onDone || null;
      this.dialogueActive = true;
      this.dialogueShown = 0;
      this.dialogueAccum = 0;
      // 压暗场景：玩法已经完全冻结了，但画面不暗下来玩家会以为游戏还在跑
      this.dimScreen(0.34, 180);
      this.buildDialoguePanel();
      this.showDialogueLine();
    }

    buildDialoguePanel() {
      if (this.dlgGfx) return;
      const font = 'Segoe UI, Microsoft YaHei, sans-serif';
      const px = 36, ph = 126, pw = WIDTH - px * 2, py = HEIGHT - ph - 22;
      this.dlgGfx = this.add.graphics().setDepth(60).setScrollFactor(0);
      this.dlgGfx.fillStyle(0x0a0c13, 0.92).fillRoundedRect(px, py, pw, ph, 12);
      this.dlgGfx.lineStyle(2, 0x6a5a8a, 0.85).strokeRoundedRect(px, py, pw, ph, 12);
      this.dlgGfx.fillStyle(0x151a26, 1).fillRoundedRect(px + 14, py + 14, 84, 84, 10);
      this.dlgPortrait = this.add.text(px + 56, py + 56, '', { fontFamily: font, fontSize: '38px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5).setDepth(62).setScrollFactor(0);
      this.dlgName = this.add.text(px + 114, py + 16, '', { fontFamily: font, fontSize: '17px', fontStyle: 'bold', color: '#ffffff' }).setDepth(62).setScrollFactor(0);
      this.dlgBody = this.add.text(px + 114, py + 46, '', { fontFamily: font, fontSize: '15px', color: '#dde5f4', lineSpacing: 7, wordWrap: { width: pw - 150 } }).setDepth(62).setScrollFactor(0);
      this.dlgHint = this.add.text(px + pw - 16, py + ph - 24, '空格 / 点击 继续　·　Esc 跳過全部', { fontFamily: font, fontSize: '12px', color: '#8f9ab3' }).setOrigin(1, 0).setDepth(62).setScrollFactor(0);
      // 右上角的跳过按钮：不想看剧情的玩家一键推完，而不是被按住看
      this.dlgSkip = this.add.text(px + pw - 16, py + 12, '跳過 ▸', { fontFamily: font, fontSize: '13px', color: '#c9b98f' })
        .setOrigin(1, 0).setDepth(63).setScrollFactor(0).setInteractive({ useHandCursor: true });
      this.dlgSkip.on('pointerover', () => this.dlgSkip.setColor('#ffe9b0'));
      this.dlgSkip.on('pointerout', () => this.dlgSkip.setColor('#c9b98f'));
      this.dlgSkip.on('pointerdown', (pointer, lx, ly, event) => {
        if (event && event.stopPropagation) event.stopPropagation();
        this.skipAllDialogue();
      });
    }

    showDialogueLine() {
      const line = this.dialogueQueue[0];
      if (!line) { this.endDialogue(); return; }
      const hex = '#' + line.color.toString(16).padStart(6, '0');
      this.dlgName.setText(line.who).setColor(hex);
      this.dlgPortrait.setText(line.who.slice(0, 1)).setColor(hex);
      this.dialogueShown = 0;
      this.dialogueAccum = 0;
      if (line.choices) {
        // 等玩家选：直接把提示语整句显示出来，不走打字机
        this.dlgBody.setText(line.text || '');
        this.dialogueShown = (line.text || '').length;
        this.buildChoicePanel(line);
      } else {
        this.clearChoicePanel();
        this.dlgBody.setText('');
      }
    }

    updateDialogue(dt) {
      if (!this.dialogueActive || !this.dlgBody) return;
      const line = this.dialogueQueue[0];
      if (!line) return;
      if (line.choices) { this.dlgHint.setAlpha(0.4); return; }
      const full = line.text;
      if (this.dialogueShown < full.length) {
        this.dialogueAccum += dt;
        while (this.dialogueAccum >= 0.028 && this.dialogueShown < full.length) {
          this.dialogueAccum -= 0.028;
          this.dialogueShown += 1;
        }
        this.dlgBody.setText(full.slice(0, this.dialogueShown));
      }
      const done = this.dialogueShown >= full.length;
      const blink = Math.sin(this.elapsed * 5) > -0.2;
      this.dlgHint.setAlpha(done ? (blink ? 0.95 : 0.3) : 0.22);
    }

    advanceDialogue() {
      if (!this.dialogueActive) return;
      const line = this.dialogueQueue[0];
      if (!line) { this.endDialogue(); return; }
      if (line.choices) return;   // 选项句必须点选，空格不能跳过
      // 还在打字：先补全整句，不急着翻页
      if (this.dialogueShown < line.text.length) {
        this.dialogueShown = line.text.length;
        this.dlgBody.setText(line.text);
        return;
      }
      this.playSfx('sfx_guard', 0.10);
      this.dialogueQueue.shift();
      if (!this.dialogueQueue.length) this.endDialogue();
      else this.showDialogueLine();
    }

    endDialogue() {
      if (!this.dialogueActive) return;
      this.dialogueActive = false;
      this.dimScreen(0, 180);
      const cb = this.dialogueOnDone;
      this.dialogueOnDone = null;
      this.dialogueQueue = [];
      this.clearChoicePanel();
      for (const key of ['dlgGfx', 'dlgName', 'dlgBody', 'dlgPortrait', 'dlgHint', 'dlgSkip']) {
        if (this[key]) { this[key].destroy(); this[key] = null; }
      }
      if (cb) cb();
    }

    // 过场的一拍。存下来是为了让玩家能按空格/点击直接跳过等待，
    // 而不是干等两秒才轮到对话。用 done 标记防止到点后重复触发。
    deferBeat(ms, fn) {
      const token = { done: false, fn };
      this.pendingBeat = token;
      this.time.delayedCall(ms, () => {
        if (token.done) return;
        token.done = true;
        if (this.pendingBeat === token) this.pendingBeat = null;
        fn();
      });
    }

    skipPendingBeat() {
      const t = this.pendingBeat;
      if (!t || t.done) return false;
      t.done = true;
      this.pendingBeat = null;
      t.fn();
      return true;
    }

    // ② 当前这句是不是等玩家选的句子
    choiceActive() {
      return !!(this.dialogueActive && this.dialogueQueue && this.dialogueQueue[0]
        && this.dialogueQueue[0].choices);
    }

    buildChoicePanel(line) {
      this.clearChoicePanel();
      const font = 'Segoe UI, Microsoft YaHei, sans-serif';
      const px = 36, ph = 126, py = HEIGHT - ph - 22;
      this.choiceObjs = [];
      line.choices.forEach((c, i) => {
        const t = this.add.text(px + 116, py + 30 + i * 27, `${i + 1}. ${c.label}`, {
          fontFamily: font, fontSize: '15px', color: '#ffe9b0',
        }).setDepth(64).setScrollFactor(0).setInteractive({ useHandCursor: true });
        t.on('pointerover', () => t.setColor('#ffffff'));
        t.on('pointerout', () => t.setColor('#ffe9b0'));
        t.on('pointerdown', (pointer, lx, ly, event) => {
          if (event && event.stopPropagation) event.stopPropagation();
          this.pickChoice(i);
        });
        this.choiceObjs.push(t);
      });
    }

    clearChoicePanel() {
      if (!this.choiceObjs) return;
      for (const t of this.choiceObjs) if (t) t.destroy();
      this.choiceObjs = null;
    }

    // ② 玩家选了一句台词：把该选项的回应接到队列前面
    pickChoice(i) {
      const line = this.dialogueQueue && this.dialogueQueue[0];
      if (!line || !line.choices || !line.choices[i]) return;
      const c = line.choices[i];
      if (c.flag) this.storyFlag = c.flag;   // ④ 选择会影响后面的自爆难度与结局
      this.clearChoicePanel();
      this.playSfx('sfx-parry', 0.22);
      this.dialogueQueue.shift();
      if (c.reply && c.reply.length) this.dialogueQueue.unshift(...c.reply);
      if (!this.dialogueQueue.length) { this.endDialogue(); return; }
      this.showDialogueLine();
    }

    // 一次性推完整段对话（对话框右上角的「跳過」，Esc 同效）
    skipAllDialogue() {
      if (!this.dialogueActive) return;
      this.dialogueQueue = [];
      this.endDialogue();
    }

    // 被巨手抓住时的提示：全部画在玩家头顶，玩家不用移开视线
    drawGrabUi() {
      const p = this.playerState;
      const grabbed = !!p.grabbed;
      if (!grabbed) {
        if (this.grabGfx) this.grabGfx.clear();
        if (this.grabText) this.grabText.setVisible(false);
        return;
      }
      if (!this.grabGfx) this.grabGfx = this.add.graphics().setDepth(29);
      const g = this.grabGfx;
      g.clear();
      const t = this.elapsed;
      const px = p.grabbed.x;
      const bx = px - 96;
      const by = this.player.y - 196;
      // 挣扎光环：脉冲，读起来是「我在被控住」
      g.lineStyle(3, 0xff6a2a, 0.45 + Math.sin(t * 14) * 0.3)
        .strokeCircle(px, this.player.y - 62, 34 + Math.sin(t * 10) * 5);
      g.lineStyle(2, 0xffd27a, 0.5 + Math.sin(t * 14 + 1.2) * 0.3)
        .strokeCircle(px, this.player.y - 62, 46 + Math.sin(t * 10 + 1.2) * 5);
      // 提示框
      g.fillStyle(0x0a0c13, 0.90).fillRoundedRect(bx, by, 192, 52, 8);
      g.lineStyle(2, 0xff8a3a, 0.95).strokeRoundedRect(bx, by, 192, 52, 8);
      // 巨手剩余血量
      const h = this.boss.hand;
      if (h && !h.destroyed) {
        const k = Math.max(0, h.hp / h.maxHp);
        g.fillStyle(0x2a1a22, 1).fillRoundedRect(bx + 14, by + 34, 164, 10, 5);
        g.fillStyle(0xd8cfe0, 1).fillRoundedRect(bx + 14, by + 34, 164 * k, 10, 5);
        g.lineStyle(1, 0xff8a3a, 0.8).strokeRoundedRect(bx + 14, by + 34, 164, 10, 5);
      }
      if (!this.grabText) {
        this.grabText = this.add.text(bx + 96, by + 17, '', {
          fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
          fontSize: '15px', fontStyle: 'bold', color: '#ffd27a',
        }).setOrigin(0.5, 0.5).setDepth(30);
      }
      const hpTxt = h && !h.destroyed ? `　${Math.ceil(h.hp)}` : '';
      this.grabText.setVisible(true);
      this.grabText.setText(`按 J 攻擊，打碎巨手掙脫！${hpTxt}`);
      this.grabText.setPosition(bx + 96, by + 17);
      this.grabText.setAlpha(0.62 + Math.sin(t * 11) * 0.38);
    }

    // 全屏压暗层（过场用）。没有就建一个，之后复用。
    dimScreen(alpha, ms) {
      if (!this.dimOverlay) {
        this.dimOverlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, 0).setDepth(48).setScrollFactor(0);
      }
      this.tweens.add({ targets: this.dimOverlay, alpha, duration: Math.max(1, ms) });
    }

    enterRiftLord() {
      const b = this.boss;
      for (const shot of this.projectiles) this.clearProjectile(shot);
      this.projectiles = [];
      b.encounter = 'rift';
      b.maxHp = BOSS_MAX_HP;
      b.hp = BOSS_MAX_HP;
      b.phase = 1;
      b.mode = 'intro';
      b.timer = 2.1;
      b.sequence = 0;
      b.slashCount = 0;
      b.slashTempo = 'slow';
      b.lastMove = '';
      b.posture = 0;
      b.move = '';
      b.hitResolved = true;
      b.regenIdle = 0;
      this.setBossAppearance();
      this.bossSprite.setPosition(746, FLOOR).setFlipX(true).setAngle(0);
      this.bossShadow.setFillStyle(0x211636, 0.68);
      this.updateBossMoveCardCopy();
      this.playSfx('sfx_boss_phase', 0.45);
      this.cameras.main.flash(380, 115, 70, 190);
      this.cameras.main.shake(300, 0.007);
      this.spawnBurst(746, FLOOR - 130, 0xb374f5, 36);
      this.bossLabel.setText('裂隙巫妖 · P1');
      this.setMessage('精英幽影守卫被击败！裂隙开启——操纵暗影的巫妖现身，留意多层魂火与地面咒印。');
    }

    transitionBossPhase(phase) {
      const b = this.boss;
      b.phase = phase;
      this.playSfx('sfx_boss_phase', 0.42);
      b.mode = 'transition';
      b.timer = 1.15;
      b.sequence = 0;
      b.slashCount = 0;
      b.posture = Math.min(b.posture, 54);
      b.move = '';
      b.hitResolved = true;
      this.playBossAnimation('knight-powerup');
      const flashColor = phase === 4 ? [180, 40, 50] : phase === 3 ? [150, 70, 90] : phase === 2 ? [92, 89, 132] : [129, 89, 132];
      this.cameras.main.flash(220, flashColor[0], flashColor[1], flashColor[2]);
      // Keep the final phase tense without speeding up the attack read.
      const music = document.querySelector('#bgm');
      if (music) {
        music.playbackRate = 1.0;
        music.volume = phase === 4 ? 0.9 : 0.6;
        music.play().catch(() => {});
      }
      if (phase === 4) {
        if (b.encounter === 'rift') this.bossSprite.setTint(0xc98aff);
        else this.bossSprite.setTint(0xff3b3b);
        this.cameras.main.shake(260, 0.008);
        this.setMessage('P4：巫妖开启第三道裂隙；魂火变为三层，震爆慢快交替，亡魂印继续锁定地面。');
      } else if (phase === 3) {
        this.setMessage('P3 转阶：巫妖开始刻下亡魂印；离开锁定圆印，或在爆发前跳起。');
      } else if (phase === 2) {
        this.setMessage('P2 转阶：幽魂换位加入；传送落点会先亮起，再发生范围冲击。');
      }
    }

    breakBossPosture() {
      const b = this.boss;
      b.posture = 100;
      b.mode = 'broken';
      b.timer = 1.6;
      b.move = '';
      b.hitResolved = true;
      this.playBossAnimation('knight-impact2');
      this.bossSprite.setTint(0xf0cd93);
      this.time.delayedCall(1600, () => { if (this.bossSprite.active) this.boss.encounter === 'rift' ? this.bossSprite.clearTint() : this.bossSprite.setTint(0xe7798e); });
      this.cameras.main.shake(180, 0.005);
      this.spawnBurst(this.bossSprite.x, FLOOR - 112, 0xf1d49d, 22);
      this.setMessage('巫妖架勢崩潰！獲得 1.6 秒高額反擊窗口，並且直接削掉一截血。');
      // ① 破架势直接削血：这是玩家「主动推进阶段」的杠杆。
      // 放在最后调用，因为它可能直接把 Boss 打进下一阶段、甚至打空进入 P5。
      // ② 破架势是玩家主动压缩阶段的杠杆，7% 偏小，提到 10%
      const chunk = Math.max(1, Math.round(b.maxHp * 0.10));
      this.damageBoss(chunk, true);
    }

    updateTelegraph() {
      const g = this.telegraph;
      g.clear();
      if (this.room === 'boss' && this.boss.mode === 'tell') {
        const move = this.boss.move;
        // 可弹反的招式：在玩家身上画金色环，告诉玩家「这一招能弹」
        const parryableNow = move === 'slash' || move === 'rush';
        if (parryableNow && this.boss.encounter === 'rift') {
          const pulse = 0.55 + Math.sin(this.elapsed * 9) * 0.35;
          g.lineStyle(3, 0xffd76a, pulse).strokeCircle(this.player.x, this.player.y - 62, 46);
          g.lineStyle(2, 0xfff6dc, pulse * 0.8).strokeCircle(this.player.x, this.player.y - 62, 34);
        }
        // P5 一切预警改成炽红，和幽紫阶段形成强烈对比
        if (this.boss.phase === 5 && this.boss.revived) {
          const hot = this.boss.slashTempo === 'fast' ? 0xffd27a : 0xff4d14;
          const r5 = this.boss.moveRange || 150;
          if (move === 'slash') {
            g.fillStyle(hot, 0.16).fillCircle(this.bossSprite.x, FLOOR - 4, r5);
            g.lineStyle(4, hot, 0.85).strokeCircle(this.bossSprite.x, FLOOR - 4, r5);
            g.lineStyle(2, 0xfff0c8, 0.5).strokeCircle(this.bossSprite.x, FLOOR - 4, r5 * 0.7);
          } else if (move === 'shot') {
            const shotEnd = this.boss.facing > 0 ? WORLD_W - 40 : 40;
            const lanes = this.boss.phase >= 3 ? [72, 132, 192] : [72, 146];
            for (const lane of lanes) {
              g.lineStyle(4, 0xff4d14, 0.34).lineBetween(this.bossSprite.x, FLOOR - lane, shotEnd, FLOOR - lane);
              g.lineStyle(1, 0xffd27a, 0.8).lineBetween(this.bossSprite.x, FLOOR - lane, shotEnd, FLOOR - lane);
              g.fillStyle(0xffd27a, 0.8).fillCircle(this.bossSprite.x, FLOOR - lane, 8);
            }
          } else if (move === 'rush') {
            g.fillStyle(0xff4d14, 0.22).fillCircle(this.boss.targetX, FLOOR - 4, this.bossMoves().rush.range);
            g.lineStyle(4, 0xff8a3a, 0.9).strokeCircle(this.boss.targetX, FLOOR - 4, this.bossMoves().rush.range);
            g.lineStyle(2, 0xfff0c8, 0.8).strokeCircle(this.boss.targetX, FLOOR - 4, 18);
          } else if (move === 'burn') {
            // ② 焚天：5 个区域烧 4 个，只留一个安全口
            if (!this.boss.burnZones) {
              // 5 区改 4 区、半径 96 改 70：原来几乎把地面铺满，没有安全走位空间
              const safe = Math.floor(Math.random() * 4);
              this.boss.burnZones = [0, 1, 2, 3].map((i) => ({ x: 150 + i * 220, safe: i === safe }));
            }
            for (const z of this.boss.burnZones) {
              if (z.safe) {
                g.fillStyle(0x2f6b4a, 0.20).fillCircle(z.x, FLOOR - 5, 70);
                g.lineStyle(3, 0x8fe0b0, 0.85).strokeCircle(z.x, FLOOR - 5, 70);
                g.lineStyle(2, 0xd8ffe8, 0.7).lineBetween(z.x - 20, FLOOR - 5, z.x + 20, FLOOR - 5);
                g.lineBetween(z.x, FLOOR - 25, z.x, FLOOR + 15);
              } else {
                const kb = Math.max(0, Math.min(1, (this.bossMoves().burn.tell * this.phaseSpeed() - this.boss.timer) / Math.max(0.01, this.bossMoves().burn.tell * this.phaseSpeed())));
                this.drawCountdown(g, z.x, FLOOR - 5, 70, kb, 0xfff0c8, 0xff4d14);
                g.lineStyle(2, 0xff8a3a, 0.55).strokeCircle(z.x, FLOOR - 5, 54);
              }
            }
          } else if (move === 'hand') {
            // B 骸骨巨手预警：前 55% 追踪、后 45% 锁定。
            // 锁定这件事必须让玩家看出来，否则被抓会觉得是暗算。
            const total = this.bossMoves().hand.tell * this.phaseSpeed();
            const elapsed = Math.max(0, total - this.boss.timer);
            if (!this.boss.handLocked) {
              // ④ 预判玩家 0.28 秒后的位置：站着不动会被抓，直线跑也会被抓，
              //    必须变向才能甩掉——这才叫"会抓人"。
              this.boss.handX = clamp(this.player.x + this.player.body.velocity.x * 0.28,
                60, this.arenaMaxX() - 8);
              if (elapsed >= total * 0.55) {
                this.boss.handLocked = true;
                this.playSfx('sfx_boss_tell', 0.5);
                this.cameras.main.shake(150, 0.004);
              }
            }
            const hx = this.boss.handX ?? this.player.x;
            const lock = this.boss.handLocked;
            // ② 圈半径 = 实际抓取半径，看到多少就是多少
            this.drawCountdown(g, hx, FLOOR - 5, HAND_GRAB_R, elapsed / Math.max(0.01, total), 0xfff0c8, 0xff4d14);
            g.lineStyle(2, 0xfff0c8, 0.6).strokeCircle(hx, FLOOR - 5, HAND_GRAB_R * 0.55);
            if (lock) {
              g.lineStyle(3, 0xfff0c8, 0.95).lineBetween(hx - 26, FLOOR - 31, hx + 26, FLOOR + 21);
              g.lineBetween(hx + 26, FLOOR - 31, hx - 26, FLOOR + 21);
            }
          } else if (move === 'handSlam') {
            // C 锤击预警：巨手高举 → 落点大圈 → 砸下
            const total = this.bossMoves().handSlam.tell * this.phaseSpeed();
            const elapsed = Math.max(0, total - this.boss.timer);
            if (!this.boss.handLocked) {
              // ④ 锤击同样预判，往你跑的方向提前量
              this.boss.handX = clamp(this.player.x + this.player.body.velocity.x * 0.24,
                60, this.arenaMaxX() - 8);
              if (elapsed >= total * 0.5) this.boss.handLocked = true;
            }
            const hx = this.boss.handX ?? this.player.x;
            const k = Math.max(0, Math.min(1, elapsed / Math.max(0.01, total)));
            this.drawCountdown(g, hx, FLOOR - 5, 104, k, 0xfff0c8, 0xff2a06);
            g.lineStyle(3, 0xff8a3a, 0.5).strokeCircle(hx, FLOOR - 5, 104 * (0.35 + k * 0.65));
            g.lineStyle(6, 0xffd27a, 0.85).lineBetween(hx - 40, FLOOR - 5, hx + 40, FLOOR - 5);
            g.lineBetween(hx, FLOOR - 45, hx, FLOOR + 35);
          } else if (move === 'handGrab') {
            // C 抓取预警：朝玩家方向的横向长条，看得见伸过来的路径
            const dir = this.boss.facing;
            g.fillStyle(0xff4d14, 0.18).fillRect(Math.min(this.bossSprite.x, this.bossSprite.x + dir * 250), FLOOR - 118, 250, 118);
            g.lineStyle(4, 0xff8a3a, 0.9).lineBetween(this.bossSprite.x, FLOOR - 96, this.bossSprite.x + dir * 250, FLOOR - 96);
            g.lineStyle(2, 0xfff0c8, 0.7).lineBetween(this.bossSprite.x, FLOOR - 40, this.bossSprite.x + dir * 250, FLOOR - 40);
            g.lineStyle(3, 0xffd27a, 0.9).strokeCircle(this.player.x, FLOOR - 3, 42);
          } else if (move === 'tide') {
            // 冥河之潮：貼地長條 + 倒計時環，答案就是「跳」
            const dir = this.boss.facing;
            const y0 = FLOOR - 34;
            const k = Math.max(0, Math.min(1, 1 - this.boss.timer / Math.max(0.01, this.bossMoves().tide.tell * this.phaseSpeed())));
            g.fillStyle(0x2ea8ff, 0.10 + k * 0.16).fillRect(0, y0, WIDTH, 34);
            g.lineStyle(4, 0x9fe0ff, 0.9).lineBetween(0, y0, WIDTH, y0);
            g.lineStyle(3, 0xffffff, 0.7).lineBetween(this.bossSprite.x, y0, this.bossSprite.x + dir * 120, y0);
            g.lineStyle(3, 0x9fe0ff, 0.85).strokeCircle(this.bossSprite.x, FLOOR - 60, 40);
          } else if (move === 'gaze') {
            // 亡魂凝視：準星追著玩家，鎖定後往兩側走
            const k = Math.max(0, Math.min(1, 1 - this.boss.timer / Math.max(0.01, this.bossMoves().gaze.tell * this.phaseSpeed())));
            g.fillStyle(0xb07aff, 0.10 + k * 0.14).fillRect(this.player.x - 46, 0, 92, FLOOR);
            g.lineStyle(2 + k * 2, 0xd8b4ff, 0.9).lineBetween(this.player.x - 46, 0, this.player.x - 46, FLOOR);
            g.lineBetween(this.player.x + 46, 0, this.player.x + 46, FLOOR);
            this.drawCountdown(g, this.player.x, FLOOR - 5, 46, k, '#d8b4ff', 0x6b3fa0);
          } else if (move === 'souls') {
            // 魂噬：頭頂聚起六顆魂球，預告「會追你」
            const k = Math.max(0, Math.min(1, 1 - this.boss.timer / Math.max(0.01, this.bossMoves().souls.tell * this.phaseSpeed())));
            for (let i = 0; i < 6; i += 1) {
              const ang = -Math.PI / 2 + (i - 2.5) * 0.40;
              const rr = 40 + k * 74;
              const ox = this.bossSprite.x + Math.cos(ang) * rr;
              const oy = FLOOR - 150 + Math.sin(ang) * rr * 0.5;
              g.fillStyle(0xb98cff, 0.22 + k * 0.4).fillCircle(ox, oy, 11 + k * 4);
              g.lineStyle(2, 0xefe0ff, 0.85).strokeCircle(ox, oy, 11 + k * 4);
            }
            g.lineStyle(2, 0xd8b4ff, 0.55).strokeCircle(this.bossSprite.x, FLOOR - 150, 96);
          } else if (move === 'shock') {
            // 焚天震盪：近身紅圈收縮，代表「會被彈飛」
            const k = Math.max(0, Math.min(1, 1 - this.boss.timer / Math.max(0.01, this.bossMoves().shock.tell * this.phaseSpeed())));
            const rr = 160 - k * 26;
            g.fillStyle(0xff4d14, 0.10 + k * 0.16).fillCircle(this.bossSprite.x, FLOOR - 40, rr);
            g.lineStyle(5, 0xff8a3a, 0.92).strokeCircle(this.bossSprite.x, FLOOR - 40, rr);
            this.drawCountdown(g, this.bossSprite.x, FLOOR - 5, 60, k, '#ffd9a0', 0xff4d14);
          } else if (move === 'bloom') {
            // 獄火華：地面浮現五個落點，依序噴發
            const k = Math.max(0, Math.min(1, 1 - this.boss.timer / Math.max(0.01, this.bossMoves().bloom.tell * this.phaseSpeed())));
            const base = this.player.x;
            for (let i = 0; i < 7; i += 1) {
              const bx = Math.max(64, Math.min(this.arenaMaxX() - 24, base + (i - 3) * 118));
              g.fillStyle(0xff4d14, 0.10 + k * 0.16).fillCircle(bx, FLOOR - 5, 46);
              g.lineStyle(4, 0xff8a3a, 0.85).strokeCircle(bx, FLOOR - 5, 46);
            }
            this.drawCountdown(g, base, FLOOR - 5, 170, k, '#ffd9a0', 0xff4d14);
          } else if (move === 'dash') {
            // 冲刺预警：贴地的一条长带，明确「它要从哪边冲过来」
            const dir = this.boss.facing;
            const y0 = FLOOR - 118;
            const total0 = this.bossMoves().dash.tell * this.phaseSpeed();
            const k0 = Math.max(0, Math.min(1, (total0 - this.boss.timer) / Math.max(0.01, total0)));
            g.fillStyle(0xff2a06, 0.10 + k0 * 0.20).fillRect(0, y0, WIDTH, 118);
            g.lineStyle(4, 0xff8a3a, 0.9).lineBetween(0, y0, WIDTH, y0);
            const edge = dir > 0 ? 0 : WIDTH;
            g.lineStyle(5, 0xffd27a, 0.9).lineBetween(edge, y0, edge + dir * (60 + k0 * 90), y0);
            g.lineStyle(3, 0xfff0c8, 0.8).strokeCircle(this.bossSprite.x, FLOOR - 60, 44);
          } else if (move === 'wave') {
            const radius = this.bossMoves().wave.range;
            g.fillStyle(0xff4d14, 0.34).fillCircle(this.boss.sealX, FLOOR - 5, radius);
            g.lineStyle(4, 0xffb45c, 0.95).strokeCircle(this.boss.sealX, FLOOR - 5, radius);
            g.lineStyle(2, 0xfff0c8, 0.85).lineBetween(this.boss.sealX - 19, FLOOR - 5, this.boss.sealX + 19, FLOOR - 5);
            g.lineBetween(this.boss.sealX, FLOOR - 24, this.boss.sealX, FLOOR + 14);
          }
          return;
        }
        if (move === 'slash') {
          if (this.boss.encounter === 'rift') {
            const radius = this.boss.moveRange;
            const tint = this.boss.slashTempo === 'fast' ? 0xffc56b : 0x86d8ff;
            g.fillStyle(tint, 0.12).fillCircle(this.bossSprite.x, FLOOR - 4, radius);
            g.lineStyle(3, tint, 0.74).strokeCircle(this.bossSprite.x, FLOOR - 4, radius);
            g.lineStyle(1, 0xf5e6ff, 0.44).strokeCircle(this.bossSprite.x, FLOOR - 4, radius * 0.72);
          } else {
          const range = this.bossMoves().slash.range;
          const left = Math.min(this.bossSprite.x, this.bossSprite.x + this.boss.facing * range);
          const right = Math.max(this.bossSprite.x, this.bossSprite.x + this.boss.facing * range);
          const tint = 0xe9bf80;
          g.fillStyle(tint, 0.15).fillRoundedRect(left, FLOOR - 78, right - left, 25, 7);
          g.lineStyle(2, tint, 0.72).lineBetween(left, FLOOR - 80, right, FLOOR - 80);
          }
        } else if (move === 'shot') {
          const shotEnd = this.boss.facing > 0 ? WORLD_W - 40 : 40;
          const shotColor = this.boss.encounter === 'rift' ? 0xc98aff : 0xe78a81;
          const lanes = this.boss.encounter === 'rift' ? (this.boss.phase >= 3 ? [72, 132, 192] : [72, 146]) : [100];
          for (const lane of lanes) {
            g.lineStyle(3, shotColor, 0.3).lineBetween(this.bossSprite.x, FLOOR - lane, shotEnd, FLOOR - lane);
            g.lineStyle(1, shotColor, 0.72).lineBetween(this.bossSprite.x, FLOOR - lane, shotEnd, FLOOR - lane);
            g.fillStyle(shotColor, 0.72).fillCircle(this.bossSprite.x, FLOOR - lane, 8);
          }
        } else if (move === 'rush') {
          if (this.boss.encounter === 'rift') {
            g.fillStyle(0xc48aff, 0.2).fillCircle(this.boss.targetX, FLOOR - 4, this.bossMoves().rush.range);
            g.lineStyle(3, 0xe0b4ff, 0.82).strokeCircle(this.boss.targetX, FLOOR - 4, this.bossMoves().rush.range);
            g.lineStyle(2, 0xf5e5ff, 0.72).strokeCircle(this.boss.targetX, FLOOR - 4, 18);
          } else {
            const x = Math.min(this.bossSprite.x, this.boss.targetX);
            const w = Math.max(44, Math.abs(this.bossSprite.x - this.boss.targetX));
            g.fillStyle(0xd85e66, 0.18).fillRoundedRect(x, FLOOR - 87, w, 15, 7);
            g.lineStyle(2, 0xee8d83, 0.74).lineBetween(x, FLOOR - 89, x + w, FLOOR - 89);
            g.fillStyle(0xf2a38d, 0.7).fillCircle(this.boss.targetX, FLOOR - 89, 7);
          }
        } else if (move === 'wave') {
          if (this.boss.encounter === 'rift') {
            const radius = this.bossMoves().wave.range;
            g.fillStyle(0x9b4bd2, 0.3).fillCircle(this.boss.sealX, FLOOR - 5, radius);
            g.lineStyle(3, 0xe2a8ff, 0.9).strokeCircle(this.boss.sealX, FLOOR - 5, radius);
            g.lineStyle(2, 0xf0d8ff, 0.8).lineBetween(this.boss.sealX - 19, FLOOR - 5, this.boss.sealX + 19, FLOOR - 5);
            g.lineStyle(2, 0xf0d8ff, 0.8).lineBetween(this.boss.sealX, FLOOR - 24, this.boss.sealX, FLOOR + 14);
          } else {
            const dangerColor = 0xd65767;
            // 场地加宽后，危险区要一直画到新边界——否则 917 之后那段
            // 没有图示，玩家会以为那里是安全的（其实不是）。
            g.fillStyle(dangerColor, 0.22).fillRect(245, FLOOR - 14, WORLD_W - 245, 17);
            g.lineStyle(2, 0xed7788, 0.8).lineBetween(245, FLOOR - 16, WORLD_W, FLOOR - 16);
            g.fillStyle(0x75c9bd, 0.2).fillRoundedRect(52, FLOOR - 6, 192, 7, 3);
            g.fillStyle(0x75c9bd, 0.2).fillRoundedRect(716, FLOOR - 6, 200, 7, 3);
            g.lineStyle(2, 0xa4e1d1, 0.82).lineBetween(52, FLOOR - 8, 244, FLOOR - 8);
            g.lineStyle(2, 0xa4e1d1, 0.82).lineBetween(716, FLOOR - 8, 916, FLOOR - 8);
            g.fillStyle(0xd4f0d4, 0.88).fillCircle(148, FLOOR - 24, 3);
            g.fillStyle(0xd4f0d4, 0.88).fillCircle(812, FLOOR - 24, 3);
          }
        }
      }
      for (const enemy of this.entities) {
        if (enemy.dead || enemy.state !== 'tell') continue;
        const c = enemy.type === 'ranged' ? 0xe9b477 : 0xe78678;
        if (enemy.type === 'ranged') {
          const endX = enemy.lockedDirection > 0 ? WORLD_W - 28 : 28;
          g.lineStyle(2, c, 0.55).lineBetween(enemy.sprite.x, FLOOR - 88, endX, FLOOR - 88);
          g.fillStyle(c, 0.75).fillCircle(enemy.sprite.x + enemy.lockedDirection * 24, FLOOR - 88, 6);
        } else {
          const endX = enemy.sprite.x + enemy.lockedDirection * 132;
          const left = Math.min(enemy.sprite.x, endX), right = Math.max(enemy.sprite.x, endX);
          g.lineStyle(2, c, 0.65).lineBetween(left, FLOOR - 66, right, FLOOR - 66);
          g.fillStyle(c, 0.18).fillRoundedRect(left, FLOOR - 60, right - left, 10, 4);
        }
      }
    }

    drawBossBars() {
      const g = this.hudGraphics;
      g.clear();
      if (this.room !== 'boss' || (this.boss.encounter !== 'rift' && !this.bossSprite.visible) || this.boss.hp <= 0) return;
      const x = 206, y = 28, width = 548;
      g.fillStyle(0x090e16, 0.88).fillRoundedRect(x, y, width, 13, 5);
      const rift = this.boss.encounter === 'rift';
      // P5「亡者归来」的血条必须也是烧着的。
      // 整场 P5 的视觉语言都换成了火（焚身形态、赤红术式、烈焰残渣、红色暗角），
      // 血条却还停在幽紫——这是自相矛盾的，玩家一眼看得出"没做完"。
      const p5bar = rift && this.boss.phase === 5 && this.boss.revived;
      const barColor = p5bar
        ? (Math.sin(this.elapsed * 9) > 0 ? 0xff6a1e : 0xffa63a)
        : rift
          ? (this.boss.phase === 4 ? 0xf5a2ff : this.boss.phase === 3 ? 0xc98aff : this.boss.phase === 2 ? 0x9f7bea : 0x8068cb)
          : 0xe17b83;
      if (p5bar) {
        // 条底垫一层跳动的火光，读起来像"这条血正在烧"
        g.fillStyle(0xff4d14, 0.22 + Math.sin(this.elapsed * 11) * 0.10).fillRoundedRect(x - 2, y, width + 4, 17, 6);
      }
      g.fillStyle(barColor, 1).fillRoundedRect(x + 2, y + 2, (width - 4) * (this.boss.hp / this.boss.maxHp), 9, 4);
      g.lineStyle(1, 0xd9c9b3, 0.62).strokeRoundedRect(x, y, width, 13, 5);
      // ④ 架势条：原来只有 6px 高、没有刻度，玩家读不出"还差多少破架势"。
      // 现在加粗到 9px，并在 60% / 100% 处画刻度（两次弹反即破）。
      const py2 = y + 21;
      g.fillStyle(0x111722, 0.85).fillRoundedRect(x, py2, width, 9, 4);
      const pw2 = (width - 2) * Math.min(1, this.boss.posture / 100);
      const full = this.boss.posture >= 100;
      g.fillStyle(full ? 0xfff0c8 : 0xe0c187, full ? 1 : 0.95).fillRoundedRect(x + 1, py2 + 1, Math.max(0, pw2), 7, 3);
      g.lineStyle(1, 0x6b5a3a, 0.7).lineBetween(x + width * 0.52, py2 + 1, x + width * 0.52, py2 + 8);
      g.lineStyle(1, 0xffd27a, full ? 1 : 0.5).strokeRoundedRect(x, py2, width, 9, 4);
      // C 附身巨手独立血条
      const hd = this.boss.hand;
      if (hd && hd.attached && !hd.destroyed) {
        g.fillStyle(0x111722, 0.85).fillRoundedRect(x, py2 + 13, width, 8, 4);
        g.fillStyle(0xd8cfe0, 0.95).fillRoundedRect(x + 1, py2 + 14, (width - 2) * (hd.hp / hd.maxHp), 6, 3);
        g.lineStyle(1, 0xff8a3a, 0.85).strokeRoundedRect(x, py2 + 13, width, 8, 4);
        if (this.handLabel) {
          this.handLabel.setText(`骸骨巨手 ×2　${Math.ceil(hd.hp)} / ${hd.maxHp}　·　打碎後不再生`);
          this.handLabel.setVisible(true);
        }
      } else if (this.handLabel) {
        this.handLabel.setText(this.boss.handGone ? '骸骨巨手 已摧毀（不再生）' : '');
        this.handLabel.setVisible(this.boss.handGone === true);
      }
      this.postureLabel.setText(`架勢 ${Math.round(this.boss.posture)}/100　·　兩次精準彈反可破`);
      this.postureLabel.setVisible(true);
      this.bossLabel.setText(`${rift ? '裂隙巫妖' : '幽影守卫精英'} · ${rift ? `P${this.boss.phase}` : '精英'} · ${Math.ceil(this.boss.hp)} / ${this.boss.maxHp}`);
      this.bossLabel.setVisible(true);
      if (this.postureLabel) this.postureLabel.setVisible(true);
    }

    drawPlayerDefense() {
      const g = this.fxGraphics;
      const p = this.playerState;
      g.clear();
      if (this.status !== 'run' || !this.player.visible) return;
      const x = this.player.x + p.facing * 20;
      const y = this.player.y - 105;
      const guardHeld = this.keys.guard.isDown || this.touch.guard;
      if (guardHeld && p.stamina > 0 && p.guardBreak <= 0 && !p.attack) {
        g.lineStyle(4, 0x9de7e5, 0.88).beginPath();
        g.arc(x + p.facing * 15, y, 37, p.facing > 0 ? -1.12 : 2.02, p.facing > 0 ? 1.12 : 4.26, false).strokePath();
        g.fillStyle(0xd8fbf1, 0.8).fillCircle(x + p.facing * 49, y, 3);
      } else if (p.parryAnim > 0) {
        g.lineStyle(4, 0xffdda0, 0.92).strokeCircle(x + p.facing * 12, y, 28 + p.parryAnim * 32);
        g.lineStyle(2, 0xffffff, 0.75).strokeCircle(x + p.facing * 12, y, 18 + p.parryAnim * 18);
      }
    }

    // ① 招式高亮：按 data-move 查，并且全部 null 安全。
    //    面板现在是动态生成的，不能再依赖写死的 id——
    //    一旦取到 null 就 .classList 崩溃，整个 Demo 直接打不开。
    updateMoveCard(move, state) {
      document.querySelectorAll('.move-item').forEach((el) => el.classList.remove('active'));
      const hit = document.querySelector(`.move-item[data-move="${move}"]`);
      if (hit) hit.classList.add('active');
      const timer = document.querySelector('#moveTimer');
      if (timer) timer.textContent = state;
    }

    updateBossMoveCardCopy() {
      const b = this.boss;
      const isRift = b.encounter === 'rift';
      const fiery = isRift && b.phase === 5 && b.revived;
      // 每条：名称 / 怎么躲（面板的核心作用就是教这个）/ 标签 / 图标样式 / 图标
      let moves;
      if (!isRift) {
        moves = [
          ['幽影重斬', '傷害提高、範圍更寬；正面格擋或近身彈反', '精英', 'low-symbol', '◉', 'slash'],
          ['強化暗影彈', '飛得更快、傷害更高；跳 / 閃或正面格擋', '精英', 'drop-symbol', '✧', 'shot'],
          ['強化影襲', '前搖縮短、衝擊更強；跳過路徑或彈反', '精英', 'combo-symbol', '⌾', 'rush'],
          ['強化震盪', '收招更短、傷害提高；跳躍或進兩側安全區', '精英', 'wave-symbol', '⌘', 'wave'],
        ];
      } else if (fiery) {
        moves = [
          ['靈魂震爆', '圍繞巫妖擴散的法術；跳躍或拉開距離', 'P5', 'low-symbol', '◉', 'slash'],
          ['焚天震盪', '近身爆發並把你彈飛；保持 140px 以外', 'P5', 'wave-symbol', '⌘', 'shock'],
          ['獄火華', '地面依序噴 5 根火柱；跟著節奏換位置', 'P5', 'drop-symbol', '✧', 'bloom'],
          ['巨手抓取', '骨手伸出後攥緊；抓取前離開手的前方', 'P5', 'combo-symbol', '⌾', 'handGrab'],
          ['隕石雨', '火球沿一個方向逐顆砸落；往反方向走', 'P5-2', 'drop-symbol', '✧', 'meteor'],
          ['焚身衝刺', '貼地高速橫衝（一條線）；跳起來或側閃', 'P5-2', 'combo-symbol', '⌾', 'dash'],
        ];
      } else {
        moves = [
          ['靈魂震爆', '圍繞巫妖擴散的法術；慢速範圍大、快速範圍小，跳躍或拉開距離', 'P1', 'low-symbol', '◉', 'slash'],
          ['亡魂凝視', '準星追蹤你 1 秒，鎖定後射出一道貫穿豎線；橫向離開', 'P1', 'low-symbol', '◉', 'gaze'],
          ['追魂冥火', '多層魂火彈幕；辨認高度、移動或跳躍穿過', 'P1', 'drop-symbol', '✧', 'shot'],
          ['幽魂換位', '先標記傳送落點，再發生圓形衝擊；離開落點範圍', 'P2', 'combo-symbol', '⌾', 'rush'],
          ['冥河之潮', '貼地衝擊波掃過全場；必須跳起來躲', 'P2', 'wave-symbol', '⌘', 'tide'],
          ['亡魂印爆', '在你腳下留下符印後爆發；走出紫色圓印或跳起', 'P3', 'wave-symbol', '⌘', 'wave'],
        ];
      }
      const wrap = document.querySelector('.move-card');
      if (!wrap) return;
      wrap.innerHTML = moves.map((m) => (
        `<div class="move-item" data-move="${m[5]}">`
        + `<span class="move-symbol ${m[3]}">${m[4]}</span>`
        + `<div><b>${m[0]}</b><small>${m[1]}</small>`
        + `<span class="move-tag">${m[2]}</span></div></div>`
      )).join('');
      // 招式多了之后面板会变长，给个滚动上限，避免把整页撑开
      wrap.style.maxHeight = '290px';
      wrap.style.overflowY = 'auto';
      wrap.style.webkitOverflowScrolling = 'touch';
    }

    updateUi() {
      const p = this.playerState;
      const hpMax = p.maxHp || 100;
      document.querySelector('#hpText').innerHTML = `${Math.ceil(p.hp)} <small>/ ${hpMax}</small>`;
      document.querySelector('#hpFill').style.width = pct(p.hp, hpMax);
      document.querySelector('#staminaText').innerHTML = `${Math.ceil(p.stamina)} <small>/ 100</small>`;
      document.querySelector('#staminaFill').style.width = pct(p.stamina, 100);
      document.querySelector('#energyText').innerHTML = `${String(Math.floor(p.energy)).padStart(2, '0')} <small>/ ${ULTIMATE_REQUIRED}</small>`;
      const energyFill = document.querySelector('#energyFill');
      energyFill.style.width = pct(p.energy, ULTIMATE_REQUIRED);
      const ultReady = p.energy >= ULTIMATE_REQUIRED;
      energyFill.style.background = ultReady ? 'linear-gradient(90deg,#ffd76a,#ff9d3b)' : '';
      energyFill.style.boxShadow = ultReady ? '0 0 12px #ffd76a, 0 0 24px #ff9d3b' : '';
      document.querySelector('#energyLabel').textContent = ultReady ? '破陣奧義已就緒！按 K / Z 釋放' : '破陣能量';
      document.querySelector('#comboText').textContent = `× ${String(p.combo).padStart(2, '0')}`;
      const seconds = Math.floor(this.elapsed);
      document.querySelector('#timeText').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
      document.querySelector('#phaseText').textContent = this.debugMode && this.room === 'boss' ? `⚙ 策划测试 · P${this.boss.phase}${this.godMode ? ' · 無敵' : ' · 承傷'}` : this.room === 'boss' ? (this.boss.encounter === 'elite' ? '幽影守卫精英' : `裂隙巫妖 P${this.boss.phase}`) : (STORAGE[this.room]?.name || '峡谷');
      document.querySelector('#encounterName').textContent = STORAGE[this.room]?.name || '幽影峡谷';
      document.querySelector('#objectiveText').textContent = this.room === 'boss' ? this.bossGoal() : (STORAGE[this.room]?.goal || '继续前进。');
      document.querySelector('#encounterCopy').textContent = this.room === 'boss' ? (this.boss.encounter === 'elite' ? '幽影守卫作为精英拦路；击败后揭开裂隙巫妖的幕后身份。' : '巫妖使用灵魂震爆、分层冥火、落点换位与追踪符印；每招都有不同预警和躲法。') : this.roomCopy();
      document.querySelector('#phaseLabel').textContent = this.room === 'boss' ? (this.boss.encounter === 'elite' ? '精英遭遇' : (this.boss.phase === 5 ? '亡者归来 · 终局' : `裂隙巫妖阶段 ${this.boss.phase} / 4`)) : (this.room === 'warmup' ? '热身教学' : this.room === 'pressure' ? '双威胁压力' : '检查点休整');
      document.querySelector('#progressLabel').textContent = this.room === 'boss' ? `${Math.ceil(this.boss.hp)} / ${this.boss.maxHp} HP` : `${Math.min(100, Math.floor((this.roomIndex / 3) * 100))}%`;
      document.querySelector('#combatStats').textContent = `命中 ${this.stats.hits} · 格挡 ${this.stats.blocks} · 弹反 ${this.stats.parries}`;
      document.querySelector('#statusDot').classList.toggle('live', this.status === 'run');
      document.querySelector('#feedback').textContent = this.messageTimer > 0 ? this.currentMessage : this.defaultHint();
    }

    roomCopy() {
      if (this.room === 'warmup') return '一次只給一個近戰威脅，留出足够时间识别抬剑与出手。';
      if (this.room === 'pressure') return '近战拉近距离，远程蓄力沿直线射击；两种威胁分批提示。';
      return '敌人清空后开放出口；检查点恢复生命与耐力，为 Boss 战做准备。';
    }

    bossGoal() {
      if (this.boss.encounter === 'elite') return '幽影横斩可格挡或弹反；普攻积累架势，抓住收招窗口输出。';
      if (this.boss.phase === 1) return '灵魂震爆是圆形法术，追魂冥火分层飞行；拉开距离并辨认弹道高度。';
      if (this.boss.phase === 2) return '幽魂换位先标记目的地；看见紫色圆环后立刻离开。';
      if (this.boss.phase === 3) return '亡魂印会锁定脚下位置；离开圆印或在爆发前跳起。';
      if (this.boss.phase === 5) return '亡者归来：它一边自燃一边疯狂出手。贴近会被灼伤，需要「进→打一套→退」；撐到烈焰燒盡，或搶先把血條打空。';
      return '最终阶段魂火增至三层；震爆仍慢快交替，注意换位、符印与收招窗口。';
    }

    defaultHint() {
      if (this.status === 'paused') return '已暂停。再按 Esc 或点击“继续”恢复。';
      if (this.status !== 'run') return '选择完整试炼体验关卡节奏，或直达Boss观察战斗系统。';
      if (this.room === 'boss') return this.boss.encounter === 'rift' ? '巫妖法术有不同安全解：震爆看范围、冥火看高度、换位看落点、符印离开圆圈。' : '精英横斩可格挡/弹反；突进前摇锁定方向，保持移动并抓住收招反击。';
      if (this.entities.length === 0) {
        if (this.room === 'warmup' && this.stats.parries < 1 && !this.warmupSealLifted) {
          return '出口被幽影封印：需要成功彈反一次。按 E 彈反，或等封印自行消退。';
        }
        return '前方出口已开启，向右移动进入下一段。';
      }
      return '攻击有前摇与收招；失误后有短暂无敌，留意敌人下一次提示。';
    }

    setMessage(text) {
      this.currentMessage = text;
      this.messageTimer = 3.2;
      const feedback = document.querySelector('#feedback');
      if (feedback) feedback.textContent = text;
    }

    togglePause() {
      if (this.status === 'run') {
        this.status = 'paused';
        this.physics.world.pause();
        document.querySelector('#overlayTitle').textContent = '试炼已暂停';
        document.querySelector('#overlayText').textContent = '点击暂停按钮或按 Esc 继续。当前关卡与战斗状态会保留。';
        document.querySelector('#startBtn').innerHTML = '继续试炼 <b>▶</b>';
        document.querySelector('#bossBtn').innerHTML = '重开 Boss 练习 <b>↻</b>';
        document.querySelector('#resultSummary').hidden = true;
        document.querySelector('#overlay').classList.remove('hidden');
        this.setMessage('已暂停。');
      } else if (this.status === 'paused') {
        this.status = 'run';
        this.physics.world.resume();
        document.querySelector('#overlay').classList.add('hidden');
        this.setMessage('继续试炼。');
      }
      this.updateUi();
    }

    endRun(win) {
      if (this.status !== 'run') return;
      this.status = win ? 'win' : 'lose';
      this.physics.world.pause();
      this.touch.guard = false;
      const elapsed = Math.max(1, Math.floor(this.elapsed));
      const hitSources = Object.entries(this.stats.hitsTakenBySource).map(([source, count]) => `${source} ×${count}`).join('、') || '无';
      this.lastRun = {
        mode: this.mode === 'boss' ? 'Boss直达练习' : '完整关卡',
        result: win ? '通关' : '失败',
        durationSeconds: elapsed,
        bossPhaseReached: this.boss.phase,
        bossHpRemaining: Math.ceil(this.boss.hp),
        playerHpRemaining: Math.ceil(this.playerState.hp),
        stats: {
          ...this.stats,
          guardSuccessRate: this.stats.guardAttempts ? this.stats.blocks / this.stats.guardAttempts : null,
          parrySuccessRate: this.stats.parryAttempts ? this.stats.parries / this.stats.parryAttempts : null,
          dodgeSuccessRate: this.stats.dodgeAttempts ? this.stats.dodgeSuccesses / this.stats.dodgeAttempts : null,
        },
      };
      if (!win) {
        this.player.play('hero-dead', true);
        this.playSfx('sfx_death', 0.5);
      }
      // ③ 战败要说清楚"死在谁手上"。原来只有一句通用文案，玩家学不到东西。
      const dmgRank = Object.entries(this.stats.damageBySource).sort((a, b) => b[1] - a[1]);
      const killer = dmgRank[0];
      const killerLine = killer
        ? `致命招式：${killer[0]}（累计 -${killer[1]}）` + (dmgRank[1] ? `　其次：${dmgRank[1][0]} (-${dmgRank[1][1]})` : '')
        : '';
      document.querySelector('#overlayTitle').textContent = win ? '裂隙巫妖被击败' : '试炼中断';
      document.querySelector('#overlayText').textContent = win
        ? '可以填写试玩反馈：哪些招式容易读、哪次受击不公平、格挡与弹反是否值得使用？'
        : (killerLine
          ? `你倒在了「${killer[0]}」手上。${killerLine}\n下次下去之前，先想清楚这一招该怎么读。`
          : '可以填写试玩反馈：哪些招式容易读、哪次受击不公平、格挡与弹反是否值得使用？');
      document.querySelector('#startBtn').innerHTML = '再跑完整试炼 <b>↻</b>';
      document.querySelector('#bossBtn').innerHTML = '重开 Boss 练习 <b>↻</b>';
      document.querySelector('#resultSummary').hidden = false;
      document.querySelector('#resultSummary').textContent = `${this.lastRun.mode} · ${win ? '通关' : '未通关'} · ${elapsed} 秒\n命中 ${this.stats.hits} · 空挥 ${this.stats.whiffs} · Boss 落空/规避 ${this.stats.bossWhiffs}\n格挡 ${this.stats.blocks}/${this.stats.guardAttempts} 次尝试 · 弹反 ${this.stats.parries}/${this.stats.parryAttempts}（错过 ${this.stats.parryMisses}）\n闪避成功 ${this.stats.dodgeSuccesses}/${this.stats.dodgeAttempts} · 跳跃 ${this.stats.jumps}\n受击 ${this.stats.hitsTaken} 次 / 生命 -${this.stats.damageTaken}（${hitSources}）`;
      document.querySelector('#overlay').classList.remove('hidden');
      document.querySelector('#statusDot').classList.remove('live');
      document.querySelector('#feedback').textContent = '试玩结束后填写主观问卷；系统记录会与本次反馈一起保存在本机。';
      this.setMessage(win ? '通关：请记录Boss招式易读性、阶段压力与反击窗口。' : '试炼结束：可记录哪种攻击最难读、哪种应对最不值得使用。');
      const music = document.querySelector('#bgm');
      if (music) {
        music.pause();
        music.playbackRate = 1.0;
        music.volume = 0.6;
      }
    }

    getRunSummary() {
      return this.lastRun ? JSON.parse(JSON.stringify(this.lastRun)) : {
        mode: this.mode === 'boss' ? 'Boss直达练习' : '完整关卡',
        result: this.status === 'run' ? '进行中' : this.status,
        durationSeconds: Math.floor(this.elapsed),
        bossPhaseReached: this.boss.phase,
        stats: { ...this.stats },
      };
    }

    updateEffects(dt) {
      for (const effect of this.effects) {
        effect.life -= dt;
        if (effect.kind === 'float') effect.object.y -= effect.speed * dt;
        effect.object.setAlpha(clamp(effect.life / effect.maxLife, 0, 1));
      }
      this.effects = this.effects.filter((effect) => {
        if (effect.life <= 0) { effect.object.destroy(); return false; }
        return true;
      });
    }

    spawnSlashTrail(index) {
      const p = this.playerState;
      const g = this.add.graphics().setDepth(18);
      const x = this.player.x + p.facing * (index === 2 ? 58 : 45);
      const y = this.player.y - (index === 2 ? 106 : 91);
      const color = index === 2 ? 0xffd48e : 0xc9e0e3;
      g.lineStyle(index === 2 ? 6 : 4, color, 0.78);
      g.beginPath();
      g.arc(x, y, index === 2 ? 54 : 43, p.facing > 0 ? -2.4 : -0.75, p.facing > 0 ? 0.15 : 2.55, false);
      g.strokePath();
      this.tweens.add({ targets: g, alpha: 0, duration: 165, onComplete: () => g.destroy() });
      const targetX = this.room === 'boss' ? this.bossSprite.x : (this.nearestEnemy()?.x ?? x);
      this.spawnBurst((x + targetX) / 2, y, color, index === 2 ? 9 : 6);
    }

    // 播一次就自我销毁的特效精灵：不需要任何外部状态跟踪，房间切换也不会残留。
    // 音乐切换。原 BGM 是页面上的 <audio>，这里用音量让位而不是硬切，
    // 避免出现"两首曲子同时响"或"音乐断掉"的廉价感。
    playMusic(which) {
      const q = (id) => { try { return document.querySelector(id); } catch (_) { return null; } };
      const normal = q('#bgm'), theme = q('#bgmP5'), sting = q('#stingBurnout');
      if (this.__bgmVol === undefined && normal) this.__bgmVol = normal.volume;
      try {
        if (which === 'p5') {
          if (normal) normal.volume = (this.__bgmVol ?? 1) * 0.16;
          if (theme) { theme.volume = 0.5; theme.currentTime = 0; theme.play().catch(() => {}); }
        } else if (which === 'burnout') {
          if (theme) theme.volume = 0.10;
          if (sting) { sting.volume = 0.62; sting.currentTime = 0; sting.play().catch(() => {}); }
        } else {
          if (theme) { theme.pause(); theme.currentTime = 0; }
          if (sting) { sting.pause(); sting.currentTime = 0; }
          if (normal) normal.volume = this.__bgmVol ?? 1;
        }
      } catch (_) { /* 浏览器可能拦截自动播放，忽略 */ }
    }

    // P5（亡者归来）时把术式换成赤红火焰版；其余阶段保持幽紫。
    // 形状/帧数/时序完全一致，所以判定范围与躲避手感不受换皮影响。
    // 显式传动画键与贴图键：两者命名规则不同（动画用连字符、贴图用下划线），
    // 靠字符串拼接很容易拼错，之前就踩过 fx-soulfire-hit 这个坑。
    skillFx(anim, tex) {
      const red = this.boss.phase === 5 && this.boss.revived;
      return red ? { anim: `${anim}-crimson`, tex: `${tex}_crimson` } : { anim, tex };
    }

    // 焚身形态的火焰壳：14 处火焰包住全身，而不是点缀几个点。
    // 每处用不同的播放速度与起始帧错开，避免整片火同步跳动（那样最假）。
    startBossFlames() {
      this.stopBossFlames();
      const mk = (ox, oy, k, spd) => {
        const sp = this.add.sprite(this.bossSprite.x, FLOOR + oy, 'fx_flame', 0)
          .setOrigin(0.5, 1).setDepth(15).setScale(k).play('fx-flame');
        sp.anims.timeScale = spd;
        sp.setFrame(Math.floor(Math.random() * 16));
        return sp;
      };
      const S = 1.18;
      this.bossFlames = [
        { s: mk(-19, -320, 0.30, 1.4), ox: -19, oy: -320 },   // 左眼
        { s: mk(20, -320, 0.30, 1.1), ox: 20, oy: -320 },     // 右眼
        { s: mk(0, -352, 0.62, 1.0), ox: 0, oy: -352 },       // 头骨裂口火柱
        { s: mk(-52, -292, 0.42, 1.3), ox: -52, oy: -292 },   // 左肩
        { s: mk(54, -292, 0.42, 0.9), ox: 54, oy: -292 },     // 右肩
        { s: mk(-10, -256, 0.40, 1.2), ox: -10, oy: -256 },   // 胸腔上
        { s: mk(9, -240, 0.34, 1.5), ox: 9, oy: -240 },       // 胸腔中
        { s: mk(-8, -222, 0.30, 1.0), ox: -8, oy: -222 },     // 肋骨间
        { s: mk(-104, -222, 0.34, 1.4), ox: -104, oy: -222 }, // 左臂
        { s: mk(107, -222, 0.34, 1.1), ox: 107, oy: -222 },   // 右臂
        { s: mk(-74, -34, 0.50, 1.2), ox: -74, oy: -34 },     // 地面火环
        { s: mk(0, -30, 0.56, 1.5), ox: 0, oy: -30 },
        { s: mk(76, -34, 0.50, 1.0), ox: 76, oy: -34 },
        { s: mk(-118, -30, 0.40, 1.3), ox: -118, oy: -30 },
      ];
    }

    // 持续上升的余烬：P5 期间每隔一小段时间从本体冒出火星
    updateBossEmbers(dt) {
      if (!(this.boss.phase === 5 && this.boss.revived) || this.room !== 'boss') return;
      this.emberTimer = (this.emberTimer || 0) - dt;
      if (this.emberTimer > 0) return;
      this.emberTimer = 0.045;
      const x = this.bossSprite.x + (Math.random() - 0.5) * 150;
      const y = FLOOR - 40 - Math.random() * 280;
      const hot = Math.random() < 0.45;
      const dot = this.add.circle(x, y, hot ? 2.6 : 1.7, hot ? 0xffd27a : 0xff5a1e, 0.95).setDepth(16);
      this.tweens.add({
        targets: dot,
        y: y - 90 - Math.random() * 120,
        x: x + (Math.random() - 0.5) * 70,
        alpha: 0,
        scale: 0.2,
        duration: 700 + Math.random() * 700,
        onComplete: () => dot.destroy(),
      });
    }

    stopBossFlames() {
      if (!this.bossFlames) return;
      for (const f of this.bossFlames) { if (f.s && f.s.active) f.s.destroy(); }
      this.bossFlames = null;
    }

    spawnFx(anim, texture, x, y, scale = 1, depth = 25) {
      const fx = this.add.sprite(x, y, texture, 0).setDepth(depth).setScale(scale);
      fx.play(anim, true);
      fx.once('animationcomplete', () => fx.destroy());
      return fx;
    }

    clearProjectile(shot) {
      if (shot.core) shot.core.destroy();
      if (shot.fx) shot.fx.destroy();
      shot.glow.destroy();
    }

    spawnBurst(x, y, color, amount) {
      for (let i = 0; i < amount; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 10 + Math.random() * 42;
        const dot = this.add.circle(x, y, 2 + Math.random() * 2.2, color, 0.93).setDepth(24);
        this.tweens.add({ targets: dot, x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance, alpha: 0, scale: 0.18, duration: 170 + Math.random() * 140, onComplete: () => dot.destroy() });
      }
    }

    spawnAfterImage(sprite, color, alpha) {
      if (!sprite.active) return;
      const ghost = this.add.sprite(sprite.x, sprite.y, sprite.texture.key, sprite.frame.name).setDepth(sprite.depth - 1);
      ghost.setOrigin(sprite.originX, sprite.originY).setScale(sprite.scaleX, sprite.scaleY).setFlipX(sprite.flipX).setTint(color).setAlpha(alpha);
      this.tweens.add({ targets: ghost, alpha: 0, x: ghost.x - (sprite.flipX ? -18 : 18), duration: 180, onComplete: () => ghost.destroy() });
    }

    floatText(x, y, text, color) {
      const label = this.add.text(x, y, text, { fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif', fontSize: '19px', color, fontStyle: 'bold', stroke: '#10151c', strokeThickness: 5 }).setOrigin(0.5).setDepth(40).setScale(0.4);
      this.tweens.add({ targets: label, scale: 1.15, duration: 120, yoyo: true, ease: 'Back.Out' });
      this.effects.push({ kind: 'float', object: label, life: 0.9, maxLife: 0.9, speed: 45 });
    }

    // A 场地右边界：Boss 战用加宽后的世界，普通关卡保持原样
    arenaMaxX() { return WORLD_W - 44; }
    bossMaxX() { return WORLD_W - 90; }

    // A 每帧更新场地边界与相机。放在每帧自愈，就不用到处去挂 enterRoom 的钩子。
    // 现在不滚动：滚动量恒为 0，场地宽度恒等于视口宽度。
    updateCamera() {
      const cam = this.cameras.main;
      const wantW = WIDTH;
      if (this.arenaWidth !== wantW) {
        this.arenaWidth = wantW;
        this.physics.world.setBounds(38, 0, wantW - 76, FLOOR + 15);
      }
      if (cam.scrollX !== 0) cam.scrollX = 0;
    }

    // B 预警计时环：把「还有多久落地」直接画成时钟。
    // 只画一个静止的圈，玩家读不出时间——这是原来预警最大的问题。
    drawCountdown(g, x, y, r, k, color, bg) {
      const kk = Math.max(0, Math.min(1, k));
      g.fillStyle(bg, 0.09 + kk * 0.20).fillCircle(x, y, r * (0.22 + kk * 0.78));
      g.lineStyle(3, color, 0.5).strokeCircle(x, y, r);
      if (kk > 0.015) {
        g.lineStyle(6, color, 0.95).beginPath();
        g.arc(x, y, r - 3, -Math.PI / 2, -Math.PI / 2 + kk * Math.PI * 2, false);
        g.strokePath();
      }
    }

    isPlayerGrounded() {
      return !!(this.player.body.blocked.down || this.player.body.touching.down);
    }

    isPlayerAirborne() {
      return !this.isPlayerGrounded() && this.player.body.bottom < FLOOR - 16;
    }

    toggleSound() {
      const audio = document.querySelector('#bgm');
      const button = document.querySelector('#soundBtn');
      if (!audio) return;
      if (audio.paused) {
        audio.play().catch(() => {});
        button.innerHTML = '♫ <span>声音开启</span>';
      } else {
        audio.pause();
        button.innerHTML = '♫ <span>声音关闭</span>';
      }
    }

    playSfx(key, volume = 0.28) {
      try { this.sound.play(key, { volume }); } catch (_) { /* Audio may be disabled by the browser. */ }
    }
  }

  function bossCenterX(sprite) { return sprite.x; }

  const game = new Phaser.Game({
    // Phaser 4 requires an explicit renderer when reusing an existing canvas.
    type: Phaser.CANVAS,
    width: WIDTH,
    height: HEIGHT,
    canvas: document.querySelector('#stage'),
    parent: document.querySelector('#stage-frame'),
    backgroundColor: '#101720',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { y: 1280 }, debug: false } },
    render: { antialias: true, roundPixels: false, transparent: false },
    scene: [EncounterScene],
  });

  window.ghostCanyonGame = game;
})();
