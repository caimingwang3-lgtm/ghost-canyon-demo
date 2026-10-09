(() => {
  'use strict';

  const WIDTH = 960;
  const HEIGHT = 540;
  const FLOOR = 466;
  const ELITE_MAX_HP = 360;
  const BOSS_MAX_HP = 720;
  // P5「亡者归来」：血条自燃烧尽的秒数。到 P5 时血量从这个时间全额往下掉，
  // 玩家输出可以把血条压得更低，因此「撑到烧完」与「直接打死」都算通关。
  const PHASE5_BURN_SECONDS = 35;
  // 烈焰残渣：技能落点留下的燃烧地面，是 P5 压迫感的主来源
  const EMBER_LIFE = 7.0;
  const EMBER_RADIUS = 78;

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
      { who: '骑士', color: 0xcfe0ff, text: '你认识我？' },
      { who: '裂隙巫妖', color: 0xff8a5c, text: '我认识每一个。我记得他们所有的名字。' },
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
      { who: '骑士', color: 0xcfe0ff, text: '（大口喘气，撑着剑站起来）' },
      { who: '骑士', color: 0xcfe0ff, text: '你的名字。你还没说你的名字。' },
      { who: '旁白', color: 0x8fa8c8, text: '裂隙合上了。没有人回答。' },
      { who: '旁白', color: 0x8fa8c8, text: '峡谷重新安静下来。这一次，是真的安静了。' },
    ],
    tookIt: [
      { who: '裂隙巫妖', color: 0xff8a5c, text: '（最后一丝声音，几乎是温柔的）……抓到你了。' },
      { who: '旁白', color: 0x8fa8c8, text: '第二十个，和第二十一个。' },
      { who: '旁白', color: 0x8fa8c8, text: '峡谷里终于不那么安静了。' },
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

  const ATTACKS = [
    { anim: 'hero-attack', damage: 14, duration: 0.72, activeFrom: 0.24, activeTo: 0.37, reach: 112 },
    { anim: 'hero-attack', damage: 20, duration: 0.78, activeFrom: 0.30, activeTo: 0.46, reach: 124 },
    { anim: 'hero-attack', damage: 30, duration: 0.84, activeFrom: 0.39, activeTo: 0.57, reach: 138 },
  ];

  const BOSS_MOVES = {
    slash: { label: '幽影横斩', tell: 0.86, active: 0.16, recover: 1.08, damage: 18, guardable: true, parryable: true, range: 158, type: 'slash' },
    shot: { label: '暗影投射物', tell: 0.72, active: 0.16, recover: 0.72, damage: 14, guardable: true, parryable: false, range: 0, type: 'shot' },
    rush: { label: '影袭突进', tell: 0.94, active: 0.48, recover: 1.15, damage: 26, guardable: false, parryable: true, range: 88, type: 'rush' },
    wave: { label: '地面震荡', tell: 1.12, active: 0.22, recover: 1.02, damage: 22, guardable: false, parryable: false, range: 0, type: 'wave' },
  };
  const ELITE_MOVES = {
    slash: { ...BOSS_MOVES.slash, label: '幽影重斩', tell: 0.78, recover: 0.88, damage: 22, range: 172 },
    shot: { ...BOSS_MOVES.shot, label: '暗影投射物', tell: 0.66, recover: 0.66, damage: 17 },
    rush: { ...BOSS_MOVES.rush, label: '影袭突进', tell: 0.82, recover: 0.96, damage: 30, range: 98 },
    wave: { ...BOSS_MOVES.wave, label: '地面震荡', tell: 1.02, recover: 0.9, damage: 25 },
  };

  // Controlled strings keep test runs comparable while reducing one-pattern farming.
  const ELITE_PATTERNS = {
    1: [['slash', 'shot', 'rush', 'slash', 'wave', 'shot'], ['shot', 'rush', 'slash', 'wave', 'slash', 'shot']],
  };
  const RIFT_PATTERNS = {
    1: [['slash', 'shot', 'slash', 'shot'], ['shot', 'slash', 'shot', 'slash']],
    2: [['slash', 'rush', 'shot', 'slash', 'rush'], ['shot', 'slash', 'rush', 'slash', 'shot']],
    3: [['wave', 'shot', 'rush', 'slash', 'wave', 'rush'], ['rush', 'wave', 'slash', 'shot', 'rush', 'wave']],
    4: [['rush', 'wave', 'slash', 'shot', 'rush', 'wave'], ['wave', 'rush', 'shot', 'slash', 'wave', 'rush']],
    // P5：不再有喘息段落，四式法术高频循环，靠密度压垮玩家
    5: [['slash', 'rush', 'shot', 'burn', 'wave', 'shot', 'pull', 'slash'],
        ['rush', 'burn', 'shot', 'slash', 'pull', 'wave', 'shot', 'slash']],
  };
  const RIFT_MOVES = {
    slash: { ...BOSS_MOVES.slash, label: '靈魂震爆', tell: 1.45, active: 0.22, recover: 1.3, damage: 22, range: 205 },
    shot: { ...BOSS_MOVES.shot, label: '追魂冥火', tell: 1.08, recover: 1.1, damage: 12 },
    rush: { ...BOSS_MOVES.rush, label: '幽魂換位', tell: 1.22, active: 0.56, recover: 1.3, damage: 28, range: 96 },
    wave: { ...BOSS_MOVES.wave, label: '亡魂印爆', tell: 1.35, active: 0.34, recover: 1.25, damage: 24, range: 92 },
    // ② 焚天：全屏只有一处安全口
    burn: { ...BOSS_MOVES.wave, label: '焚天', tell: 1.9, active: 0.4, recover: 1.5, damage: 34, range: 96, guardable: false, parryable: false },
    // ④ 裂隙牵引：把玩家往自己身上拽
    pull: { ...BOSS_MOVES.wave, label: '裂隙牵引', tell: 1.3, active: 1.1, recover: 1.1, damage: 26, range: 0, guardable: false, parryable: false },
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
    }

    create() {
      this.physics.world.gravity.y = 1280;
      this.physics.world.setBounds(38, 0, WIDTH - 76, FLOOR + 15);
      this.physics.world.setBoundsCollision(true, true, true, false);
      this.makeAnimations();
      this.makeHeroAnimations();
      this.makeFxAnimations();
      this.floorBody = this.add.rectangle(WIDTH / 2, FLOOR + 35, WIDTH + 60, 70, 0x000000, 0);
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
      this.hudGraphics = this.add.graphics().setDepth(30);
      this.doorGraphics = this.add.graphics().setDepth(4);
      this.bossLabel = this.add.text(WIDTH / 2, 7, '', { fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif', fontSize: '12px', color: '#f5dfcf', fontStyle: 'bold', letterSpacing: 2 }).setOrigin(0.5, 0).setDepth(31).setVisible(false);
      // 架势标签：让玩家读得出「还差多少破架势」，而不是盯着一条没有刻度的细线
      this.postureLabel = this.add.text(206, 61, '', { fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif', fontSize: '10px', color: '#e0c187' }).setOrigin(0, 0).setDepth(31).setVisible(false);
      this.actionCaption = this.add.text(WIDTH / 2, 77, '', { fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif', fontSize: '12px', color: '#f2d6a1', stroke: '#0b1119', strokeThickness: 4, align: 'center' }).setOrigin(0.5).setDepth(31).setAlpha(0);

      this.playerState = { hp: 100, stamina: 100, energy: 0, invuln: 0, invulnSource: '', guardBreak: 0, guardRecover: 0, parryWindow: 0, parryCooldown: 0, parryPending: false, parryAnim: 0, dodgeTimer: 0, dodgeCooldown: 0, ultimateTimer: 0, hurtTimer: 0, attack: null, attackCooldown: 0, comboIndex: 0, comboGrace: 0, combo: 0, facing: 1, lastGuard: 0, groundHits: 0 };
      this.boss = { hp: BOSS_MAX_HP, maxHp: BOSS_MAX_HP, phase: 1, encounter: 'rift', mode: 'hidden', timer: 0, move: '', sequence: 0, lastMove: '', slashCount: 0, slashTempo: 'slow', moveActive: 0, moveRecover: 0, posture: 0, hurtTimer: 0, hitResolved: false, targetX: 0, facing: -1, rushHit: false, ghostTimer: 0 };

      this.keys = this.input.keyboard.addKeys({
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
      this.input.keyboard.on('keydown-ONE', () => this.debugSetPhase(1));
      this.input.keyboard.on('keydown-TWO', () => this.debugSetPhase(2));
      this.input.keyboard.on('keydown-THREE', () => this.debugSetPhase(3));
      this.input.keyboard.on('keydown-FOUR', () => this.debugSetPhase(4));
      this.input.keyboard.on('keydown-Q', () => { if (this.debugMode) { this.playerState.energy = ULTIMATE_REQUIRED; this.setMessage('策划测试：能量已补满。'); } });
      this.input.keyboard.on('keydown-H', () => { if (this.debugMode) { this.playerState.hp = this.godMode ? 10000 : 100; this.setMessage('策划测试：生命已回满。'); } });

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
      const sealed = this.room === 'warmup' && this.stats.parries < 1;
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
      Object.assign(p, { hp: this.godMode ? 10000 : 100, stamina: 100, energy: (mode === 'boss' || this.debugMode) ? (this.godMode ? ULTIMATE_REQUIRED : 40) : 0, invuln: 0, invulnSource: '', guardBreak: 0, guardRecover: 0, parryWindow: 0, parryCooldown: 0, parryPending: false, parryAnim: 0, dodgeTimer: 0, dodgeCooldown: 0, ultimateTimer: 0, hurtTimer: 0, attack: null, attackCooldown: 0, comboIndex: 0, comboGrace: 0, combo: 0, facing: 1, lastGuard: 0, groundHits: 0 });
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
      if (this.emberGfx) this.emberGfx.clear();
      if (this.pullGfx) this.pullGfx.clear();
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
      this.updateFinalDive(dt);
      // 对话期间冻结玩法，但背景演出（火焰/余烬/UI）继续跑
      if (!this.dialogueActive) {
        this.updatePlayer(dt);
        this.updateEnemies(dt);
        this.updateBoss(dt);
      }
      this.updateProjectiles(dt);
      this.updateEffects(dt);
      this.updateEmbers(dt);
      this.drawEmbers();
      this.drawFinalBoss();
      this.updateTelegraph();
      this.drawPlayerDefense();
      this.drawBossBars();
      this.drawDoor();
      this.drawVignette();
      this.updateUi();
    }

    updatePlayer(dt) {
      const p = this.playerState;
      const justDown = Phaser.Input.Keyboard.JustDown;
      p.invuln = Math.max(0, p.invuln - dt);
      if (p.invuln === 0) p.invulnSource = '';
      p.guardBreak = Math.max(0, p.guardBreak - dt);
      p.guardRecover = Math.max(0, p.guardRecover - dt);
      p.parryCooldown = Math.max(0, p.parryCooldown - dt);
      p.parryAnim = Math.max(0, p.parryAnim - dt);
      p.dodgeCooldown = Math.max(0, p.dodgeCooldown - dt);
      p.ultimateTimer = Math.max(0, p.ultimateTimer - dt);
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
      if (justDown(this.keys.parry)) this.parry();
      if (justDown(this.keys.dodge) || justDown(this.keys.dodgeAlt)) this.dodge();
      if (justDown(this.keys.ultimate) || justDown(this.keys.ultimateAlt)) this.ultimate();

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
      if (this.room !== 'boss' && this.player.x > 882 && this.entities.length === 0 && !parryGate) {
        this.enterRoom(this.roomIndex + 1);
      } else if (parryGate && this.player.x > 830 && this.entities.length === 0) {
        this.parryGateTimer = (this.parryGateTimer || 0) - dt;
        if (this.parryGateTimer <= 0) {
          this.parryGateTimer = 5;
          this.setMessage('門被幽影封住了。按 E 精準彈反接下近衛的一次攻擊，封印才會碎。');
        }
      }
      this.player.x = clamp(this.player.x, 52, 916);
    }

    performAction(action) {
      if (this.status !== 'run') return;
      if (action === 'jump') this.jump();
      else if (action === 'attack') this.tryAttack();
      else if (action === 'guard') this.touch.guard = true;
      else if (action === 'parry') this.parry();
      else if (action === 'dodge') this.dodge();
      else if (action === 'ultimate') this.ultimate();
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
      this.player.play(move.anim, true);
      p.attackCooldown = 0.13;
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
        p.attackCooldown = 0.12;
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
      // When the sprites overlap, their center points may cross and flip the facing test.
      // Give close Boss contact a small forgiveness radius so point-blank attacks still connect.
      const bossOverlap = target.boss && Math.abs(dx) <= 72;
      const inFront = bossOverlap || Math.sign(dx || 1) === attack.facing;
      const sameLane = Math.abs(target.y - this.player.y) < 104;
      if (!inFront || Math.abs(dx) > attack.reach || !sameLane) {
        this.stats.whiffs += 1;
        this.setMessage('揮空：攻擊只判定前方有效距離，不會隔空或背身命中。');
        this.spawnSlashTrail(attack.index);
        return;
      }
      if (target.boss) {
        const recovery = this.boss.mode === 'recover' || this.boss.mode === 'broken';
        const multiplier = recovery ? 1.35 : 0.38;
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
              this.resolveIncoming({ source: '影衛突刺', damage: 19, attackerX: enemy.sprite.x, range: 132, guardable: true, parryable: true, parryRange: 106 });
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
        if (shot.age > 4 || shot.x < 20 || shot.x > WIDTH - 20) {
          shot.dead = true;
          continue;
        }
        const close = Math.abs(shot.x - this.player.x) < 29 && Math.abs(shot.y - (this.player.y - 72)) < 48;
        if (close) {
          const result = this.resolveIncoming({ source: shot.source, damage: shot.damage, attackerX: shot.x - shot.direction * 18, range: 65, guardable: true, parryable: false, parryRange: 0 });
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
        b.hp = Math.min(REGEN_CAP, b.hp + 14 * dt);
        if (b.regenFxTimer <= 0) {
          b.regenFxTimer = 0.28;
          this.spawnBurst(b.x || this.bossSprite.x, FLOOR - 112, 0xff4d4d, 8);
          this.floatText(this.bossSprite.x, FLOOR - 224, `+${Math.round(b.hp - before) || 1}`, '#ff7a7a');
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
        if (b.encounter === 'elite' && b.mode === 'idle' && Math.abs(dx) > 218) {
          this.bossSprite.body && this.bossSprite.body.setVelocityX(facing * 145);
          this.bossSprite.x = clamp(this.bossSprite.x + facing * 138 * dt, 90, 870);
          this.playBossAnimation('knight-run');
        } else {
          this.playBossAnimation('knight-idle');
        }
      }

      // ④ 裂隙牵引：直接剥夺玩家对站位的控制权，把他往灼热光环里拽。
      // 这才是压迫感的核心——不是躲不掉，而是"站不住"。
      if (b.mode === 'active' && b.move === 'pull' && b.encounter === 'rift') {
        const dir = Math.sign(this.bossSprite.x - this.player.x) || -1;
        const k = 1 - Math.max(0, b.timer) / Math.max(0.01, b.moveActive);
        this.player.x = clamp(this.player.x + dir * (170 + 300 * k) * dt, 52, 916);
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
        if (b.timer <= 0 && b.mode === 'active') this.beginBossRecovery(b.moveRecover * this.phaseSpeed());
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
      const testHp = { 1: 630, 2: 450, 3: 270, 4: 100 };
      if (this.room !== 'boss') {
        this.room = 'boss';
        this.roomIndex = 3;
        this.enterBoss(true);
      }
      const b = this.boss;
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
      const table = { 1: 1.0, 2: 0.85, 3: 0.72, 4: 0.60, 5: 0.30 };
      return table[this.boss.phase] || 1.0;
    }

    startBossMove() {
      const b = this.boss;
      const patterns = (b.encounter === 'rift' ? RIFT_PATTERNS : ELITE_PATTERNS)[b.phase];
      const sequenceLength = patterns[0].length;
      const cycle = Math.floor(b.sequence / sequenceLength);
      const pattern = patterns[cycle % patterns.length];
      let patternIndex = b.sequence % sequenceLength;
      if (pattern[patternIndex] === b.lastMove) patternIndex = (patternIndex + 1) % sequenceLength;
      let move = pattern[patternIndex];
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
      // 预警音：本作核心是“看懂预警”，声音和视觉预警必须同时到
      this.playSfx('sfx_boss_tell', 0.26);
      if (move === 'wave') this.playSfx('sfx_rune_mark', 0.24);
      b.rushHit = false;
      b.facing = Math.sign(this.player.x - this.bossSprite.x) || -1;
      const dashLimit = 295;
      b.moveRange = move === 'slash' && b.encounter === 'rift' ? (b.slashTempo === 'fast' ? 145 : moveDef.range) : moveDef.range;
      b.targetX = move === 'rush' && b.encounter === 'rift'
        ? clamp(this.player.x - b.facing * 150, 120, 840)
        : move === 'rush'
          ? clamp(this.player.x, Math.max(90, this.bossSprite.x - dashLimit), Math.min(870, this.bossSprite.x + dashLimit))
        : clamp(this.player.x, 90, 870);
      b.sealX = clamp(this.player.x, 90, 870);
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
            this.resolveIncoming({ source: def.label, damage: def.damage, attackerX: this.bossSprite.x, range, guardable: true, parryable: true, parryRange: 150 });
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
          this.resolveIncoming({ source: def.label, damage: def.damage, attackerX: this.bossSprite.x, range: def.range, guardable: true, parryable: true, parryRange: 150 });
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
          this.resolveIncoming({ source: def.label, damage: def.damage, attackerX: this.bossSprite.x, range: def.range + 20, guardable: false, parryable: true, parryRange: 150 });
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
      b.timer = Math.max(0.72, duration);
      b.move = b.move || 'slash';
      this.playBossAnimation('knight-impact2');
      this.setMessage('Boss 收招：完整傷害窗口，接一到兩段連擊後拉開距離。');
      this.updateMoveCard(b.move, '反擊窗口');
    }

    resolveIncoming({ source, damage, attackerX, range, guardable, parryable, parryRange = 110, dodgeable = true }) {
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
      const inFront = Math.sign(attackerX - this.player.x || 1) === p.facing;

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
      p.parryWindow = 0.4;
      p.parryCooldown = 0.38;
      p.parryPending = true;
      p.parryAnim = 0.26;
      this.stats.parryAttempts += 1;
      this.player.play('hero-attack', true);
      this.setMessage('彈反窗口放寬至 0.4 秒：面向近身的可彈反招式即可成功。');
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
      if (this.status !== 'run' || p.energy < ULTIMATE_REQUIRED || p.guardBreak > 0 || p.guardRecover > 0 || p.hurtTimer > 0 || p.attack || p.dodgeTimer > 0 || p.parryAnim > 0 || p.ultimateTimer > 0) {
        if (p.energy < ULTIMATE_REQUIRED) this.setMessage(`破陣能量不足：${Math.floor(p.energy)} / ${ULTIMATE_REQUIRED}。命中、格擋與彈反可累積。`);
        return;
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
      const halo = this.add.circle(bx, by, 44, 0xff4d14, 0.42).setDepth(25);
      const core = this.add.circle(bx, by, 19, 0xffd27a, 1).setDepth(26);
      const reticle = this.add.graphics().setDepth(27);
      this.finalDive = { halo, core, reticle, t: 0, locked: false, tx: this.player.x, ty: this.player.y, done: false };
      this.playSfx('sfx_boss_tell', 0.42);
      this.setMessage('烧红的核浮在半空，开始锁定你——离开地面上的红圈。');
    }

    updateFinalDive(dt) {
      const d = this.finalDive;
      if (!d || d.done) return;
      d.t += dt;
      const pulse = 1 + Math.sin(this.elapsed * 18) * 0.13;
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
        if (d.t >= 2.2) {
          d.locked = true;
          // 清掉此前的无敌，让"最后一下"真的算数（玩家仍可靠闪避/走位躲开）
          this.playerState.invuln = 0;
          this.playSfx('sfx_boss_tell', 0.55);
          this.cameras.main.shake(220, 0.007);
          const lockTx = this.player.x;
          this.tweens.add({
            targets: [d.core, d.halo],
            x: lockTx,
            y: FLOOR - 34,
            duration: 400,
            ease: 'Quad.In',
            onComplete: () => this.resolveFinalDive(lockTx),
          });
        }
        return;
      }
      d.reticle.clear();
    }

    resolveFinalDive(lockTx) {
      const d = this.finalDive;
      if (!d || d.done) return;
      d.done = true;
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
      this.spawnBurst(lockTx, FLOOR - 60, 0xffd27a, 62);
      this.spawnBurst(lockTx, FLOOR - 30, 0xff4d14, 50);
      this.spawnBurst(lockTx, FLOOR - 10, 0xff3a10, 34);
      this.spawnEmber(lockTx, 108);
      if (d.core) d.core.destroy();
      if (d.halo) d.halo.destroy();
      if (d.reticle) d.reticle.destroy();
      this.finalDive = null;
      const hit = dist <= 96;
      if (hit) this.playerDamage('亡者自爆', 45);
      this.time.delayedCall(1100, () => {
        if (this.status !== 'run') return;   // 被炸死的话走战败结算
        this.startDialogue(hit ? STORY.tookIt : STORY.survived, () => {
          if (this.status === 'run') this.endRun(true);
        });
      });
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
        if (Math.abs(this.player.x - z.x) < 96) hit = z;
      }
      const safe = zones.find((z) => z.safe);
      if (safe) {
        this.floatText(safe.x, FLOOR - 96, '安全', '#9fe8c0');
        this.playSfx('sfx_guard', 0.14);
      }
      if (hit) this.playerDamage('焚天', this.bossMoves().burn.damage);
      this.setMessage('焚天：地面被烧穿，只剩一处没被点燃。');
      this.boss.burnZones = null;
    }

    // ④ 裂隙牵引
    castRiftPull() {
      this.playSfx('sfx_boss_tell', 0.42);
      this.cameras.main.shake(240, 0.005);
      this.setMessage('裂隙牵引：它要把你拽进火里——顶住方向键往外跑。');
    }

    // ⑥ 残血红色暗角：越接近死亡，屏幕边缘越红、越随心跳脉动
    drawVignette() {
      if (!this.vigGfx) this.vigGfx = this.add.graphics().setDepth(47);
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
      this.buildDialoguePanel();
      this.showDialogueLine();
    }

    buildDialoguePanel() {
      if (this.dlgGfx) return;
      const font = 'Segoe UI, Microsoft YaHei, sans-serif';
      const px = 36, ph = 126, pw = WIDTH - px * 2, py = HEIGHT - ph - 22;
      this.dlgGfx = this.add.graphics().setDepth(60);
      this.dlgGfx.fillStyle(0x0a0c13, 0.92).fillRoundedRect(px, py, pw, ph, 12);
      this.dlgGfx.lineStyle(2, 0x6a5a8a, 0.85).strokeRoundedRect(px, py, pw, ph, 12);
      this.dlgGfx.fillStyle(0x151a26, 1).fillRoundedRect(px + 14, py + 14, 84, 84, 10);
      this.dlgPortrait = this.add.text(px + 56, py + 56, '', { fontFamily: font, fontSize: '38px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5).setDepth(62);
      this.dlgName = this.add.text(px + 114, py + 16, '', { fontFamily: font, fontSize: '17px', fontStyle: 'bold', color: '#ffffff' }).setDepth(62);
      this.dlgBody = this.add.text(px + 114, py + 46, '', { fontFamily: font, fontSize: '15px', color: '#dde5f4', lineSpacing: 7, wordWrap: { width: pw - 150 } }).setDepth(62);
      this.dlgHint = this.add.text(px + pw - 16, py + ph - 24, '空格 / 点击 继续　·　Esc 跳過全部', { fontFamily: font, fontSize: '12px', color: '#8f9ab3' }).setOrigin(1, 0).setDepth(62);
      // 右上角的跳过按钮：不想看剧情的玩家一键推完，而不是被按住看
      this.dlgSkip = this.add.text(px + pw - 16, py + 12, '跳過 ▸', { fontFamily: font, fontSize: '13px', color: '#c9b98f' })
        .setOrigin(1, 0).setDepth(63).setInteractive({ useHandCursor: true });
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
      this.dlgBody.setText('');
      this.dialogueShown = 0;
      this.dialogueAccum = 0;
    }

    updateDialogue(dt) {
      if (!this.dialogueActive || !this.dlgBody) return;
      const line = this.dialogueQueue[0];
      if (!line) return;
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
      const cb = this.dialogueOnDone;
      this.dialogueOnDone = null;
      this.dialogueQueue = [];
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

    // 一次性推完整段对话（对话框右上角的「跳過」，Esc 同效）
    skipAllDialogue() {
      if (!this.dialogueActive) return;
      this.dialogueQueue = [];
      this.endDialogue();
    }

    // 全屏压暗层（过场用）。没有就建一个，之后复用。
    dimScreen(alpha, ms) {
      if (!this.dimOverlay) {
        this.dimOverlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, 0).setDepth(48);
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
      const chunk = Math.max(1, Math.round(b.maxHp * 0.07));
      this.damageBoss(chunk, true);
    }

    updateTelegraph() {
      const g = this.telegraph;
      g.clear();
      if (this.room === 'boss' && this.boss.mode === 'tell') {
        const move = this.boss.move;
        // P5 一切预警改成炽红，和幽紫阶段形成强烈对比
        if (this.boss.phase === 5 && this.boss.revived) {
          const hot = this.boss.slashTempo === 'fast' ? 0xffd27a : 0xff4d14;
          const r5 = this.boss.moveRange || 150;
          if (move === 'slash') {
            g.fillStyle(hot, 0.16).fillCircle(this.bossSprite.x, FLOOR - 4, r5);
            g.lineStyle(4, hot, 0.85).strokeCircle(this.bossSprite.x, FLOOR - 4, r5);
            g.lineStyle(2, 0xfff0c8, 0.5).strokeCircle(this.bossSprite.x, FLOOR - 4, r5 * 0.7);
          } else if (move === 'shot') {
            const shotEnd = this.boss.facing > 0 ? WIDTH - 40 : 40;
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
              const safe = Math.floor(Math.random() * 5);
              this.boss.burnZones = [0, 1, 2, 3, 4].map((i) => ({ x: 110 + i * 178, safe: i === safe }));
            }
            for (const z of this.boss.burnZones) {
              if (z.safe) {
                g.fillStyle(0x2f6b4a, 0.20).fillCircle(z.x, FLOOR - 5, 96);
                g.lineStyle(3, 0x8fe0b0, 0.85).strokeCircle(z.x, FLOOR - 5, 96);
                g.lineStyle(2, 0xd8ffe8, 0.7).lineBetween(z.x - 20, FLOOR - 5, z.x + 20, FLOOR - 5);
                g.lineBetween(z.x, FLOOR - 25, z.x, FLOOR + 15);
              } else {
                g.fillStyle(0xff4d14, 0.22).fillCircle(z.x, FLOOR - 5, 96);
                g.lineStyle(4, 0xff8a3a, 0.9).strokeCircle(z.x, FLOOR - 5, 96);
                g.lineStyle(2, 0xffd27a, 0.55).strokeCircle(z.x, FLOOR - 5, 72);
              }
            }
          } else if (move === 'pull') {
            g.lineStyle(3, 0xff4d14, 0.45).lineBetween(this.bossSprite.x, FLOOR - 206, this.player.x, this.player.y - 74);
            g.lineStyle(1, 0xffd27a, 0.7).lineBetween(this.bossSprite.x, FLOOR - 206, this.player.x, this.player.y - 74);
            g.lineStyle(3, 0xffb45c, 0.9).strokeCircle(this.player.x, FLOOR - 3, 40);
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
          const shotEnd = this.boss.facing > 0 ? WIDTH - 40 : 40;
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
            g.fillStyle(dangerColor, 0.22).fillRect(245, FLOOR - 14, 471, 17);
            g.lineStyle(2, 0xed7788, 0.8).lineBetween(245, FLOOR - 16, 716, FLOOR - 16);
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
          const endX = enemy.lockedDirection > 0 ? WIDTH - 28 : 28;
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
      g.fillStyle(rift ? (this.boss.phase === 4 ? 0xf5a2ff : this.boss.phase === 3 ? 0xc98aff : this.boss.phase === 2 ? 0x9f7bea : 0x8068cb) : 0xe17b83, 1).fillRoundedRect(x + 2, y + 2, (width - 4) * (this.boss.hp / this.boss.maxHp), 9, 4);
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

    updateMoveCard(move, state) {
      const ids = { slash: 'moveSlash', shot: 'moveShot', rush: 'moveRush', wave: 'moveWave' };
      Object.values(ids).forEach((id) => document.querySelector(`#${id}`).classList.remove('active'));
      if (ids[move]) document.querySelector(`#${ids[move]}`).classList.add('active');
      document.querySelector('#moveTimer').textContent = state;
    }

    updateBossMoveCardCopy() {
      const isRift = this.boss.encounter === 'rift';
      const moves = isRift
        ? [['靈魂震爆', '围绕巫妖扩散的法术；慢速范围大，快速范围小，可跳跃或拉开距离', '慢/快'], ['追魂冥火', '裂隙释放多层魂火弹幕；辨认高度、移动或跳跃穿过', 'P1'], ['幽魂換位', '先标记传送落点，再发生圆形冲击；离开落点范围', 'P2'], ['亡魂印爆', '在你脚下留下符印后爆发；走出紫色圆印或跳起', 'P3']]
        : [['幽影重斩', '伤害提高；正面格挡或近身弹反，范围更宽', '精英'], ['强化暗影弹', '更快飞行、命中伤害提高；跳/闪或正面格挡', '精英'], ['强化影袭', '前摇缩短、冲击更强；可跳过路径或弹反', '精英'], ['强化震荡', '恢复缩短、伤害提高；跳跃或进入两侧安全区', '精英']];
      ['moveSlash', 'moveShot', 'moveRush', 'moveWave'].forEach((id, index) => {
        const card = document.querySelector(`#${id}`);
        card.querySelector('b').textContent = moves[index][0];
        card.querySelector('small').textContent = moves[index][1];
        card.querySelector('.move-tag').textContent = moves[index][2];
      });
    }

    updateUi() {
      const p = this.playerState;
      document.querySelector('#hpText').innerHTML = `${Math.ceil(p.hp)} <small>/ 100</small>`;
      document.querySelector('#hpFill').style.width = pct(p.hp, 100);
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
      if (this.entities.length === 0) return '前方出口已开启，向右移动进入下一段。';
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
