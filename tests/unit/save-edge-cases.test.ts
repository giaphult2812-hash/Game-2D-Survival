import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGameHarness, GameHarness, MockFirestore } from './helpers/game-harness';

describe('R1 Save/Load Edge Cases, Corrupt Data & Boot/Cloud Guards', () => {
  let activeHarnesses: GameHarness[] = [];

  afterEach(() => {
    for (const h of activeHarnesses) {
      h.dispose();
    }
    activeHarnesses = [];
    vi.useRealTimers();
  });

  function track(h: GameHarness): GameHarness {
    activeHarnesses.push(h);
    return h;
  }

  it('preserves 0 armor and 1 HP exactly across save/reload', async () => {
    vi.useFakeTimers();
    const profile = { id: 'acc_zero', username: 'zero', name: 'Zero', passwordHash: 'h_z' };
    const saveData = {
      profile,
      gold: 0,
      hp: 1,
      maxHp: 150,
      armor: 0,
      activeHotbarIndex: 0,
      inventory: new Array(36).fill(null),
      equipment: new Array(4).fill(null),
      currentMap: 'forest',
      x: 96,
      y: 112,
      placedObjects: { home: [], forest: [], lake: [] },
      updatedAt: Date.now(),
    };

    const h = track(await createGameHarness({
      initialStorage: {
        game2d_active_profile_v1: JSON.stringify(profile),
        game2d_save_acc_zero: JSON.stringify(saveData),
      },
    }));
    await vi.advanceTimersByTimeAsync(250);
    await h.flushMicrotasks(15);

    expect(h.eval('player.hp')).toBe(1);
    expect(h.eval('player.displayHp')).toBe(1);
    expect(h.eval('playerArmor')).toBe(0);
    expect(h.eval('playerDisplayArmor')).toBe(0);
    expect(h.eval('playerGold')).toBe(0);
    expect(h.document.getElementById('valPlayerHP')?.textContent).toBe('1 / 150');
  });

  it('performs clean respawn at home with full HP/armor when saved hp <= 0', async () => {
    vi.useFakeTimers();
    const profile = { id: 'acc_dead', username: 'dead', name: 'Dead', passwordHash: 'h_d' };
    const saveData = {
      profile,
      gold: 40,
      hp: 0,
      maxHp: 150,
      armor: 0,
      currentMap: 'forest',
      x: 300,
      y: 300,
      updatedAt: Date.now(),
    };

    const h = track(await createGameHarness({
      initialStorage: {
        game2d_active_profile_v1: JSON.stringify(profile),
        game2d_save_acc_dead: JSON.stringify(saveData),
      },
    }));
    await vi.advanceTimersByTimeAsync(250);
    await h.flushMicrotasks(15);

    expect(h.eval('currentMap')).toBe('home');
    expect(h.eval('player.hp')).toBe(h.eval('player.maxHp'));
    expect(h.eval('player.displayHp')).toBe(h.eval('player.maxHp'));
    expect(h.eval('playerArmor')).toBe(h.eval('playerMaxArmor'));
    expect(h.eval('playerDisplayArmor')).toBe(h.eval('playerMaxArmor'));

    // Also test negative hp (-5) via direct applyPlayerSaveData
    h.eval(`
      applyPlayerSaveData({
        gold: 40,
        hp: -5,
        armor: 0,
        currentMap: 'lake',
        x: 100,
        y: 100,
        updatedAt: Date.now()
      });
    `);
    expect(h.eval('currentMap')).toBe('home');
    expect(h.eval('player.hp')).toBe(h.eval('player.maxHp'));
    expect(h.eval('playerArmor')).toBe(h.eval('playerMaxArmor'));
  });

  it('handles NaN numeric fields safely without poisoning player or campfire state', async () => {
    vi.useFakeTimers();
    const h = track(await createGameHarness());
    await vi.advanceTimersByTimeAsync(250);
    await h.flushMicrotasks(15);

    h.eval(`
      playerGold = 75;
      player.hp = 60;
      playerArmor = 20;
      player.x = 200;
      player.y = 210;
      applyPlayerSaveData({
        gold: NaN,
        hp: NaN,
        armor: NaN,
        x: NaN,
        y: NaN,
        activeHotbarIndex: NaN,
        currentMap: 'forest',
        placedObjects: {
          home: [{ type: 'chest', x: NaN, y: NaN, items: [] }],
          forest: [],
          lake: []
        },
        campfire: {
          inputItem: null,
          fuelItem: null,
          resultItem: null,
          cookProgress: NaN,
          fuelRemaining: NaN,
          fuelMax: NaN
        },
        updatedAt: NaN
      });
    `);

    expect(Number.isFinite(h.eval('playerGold'))).toBe(true);
    expect(Number.isFinite(h.eval('player.hp'))).toBe(true);
    expect(Number.isFinite(h.eval('player.displayHp'))).toBe(true);
    expect(Number.isFinite(h.eval('playerArmor'))).toBe(true);
    expect(Number.isFinite(h.eval('playerDisplayArmor'))).toBe(true);
    expect(Number.isFinite(h.eval('player.x'))).toBe(true);
    expect(Number.isFinite(h.eval('player.y'))).toBe(true);
    expect(h.eval('activeHotbarIndex')).toBe(0);
    expect(h.eval('HOME_CAMPFIRE.cookProgress')).toBe(0);
    expect(h.eval('HOME_CAMPFIRE.fuelRemaining')).toBe(0);
    expect(h.eval('HOME_CAMPFIRE.fuelMax')).toBe(16.0);
  });

  it('recovers gracefully from corrupt JSON in active profile, save payload, and accounts registry', async () => {
    vi.useFakeTimers();
    const h = track(await createGameHarness({
      initialStorage: {
        game2d_active_profile_v1: '{corrupt-profile-json',
        game2d_accounts_registry_v1: '{corrupt-registry-json',
        game2d_save_acc_bad: '{corrupt-save-json',
      },
    }));

    await vi.advanceTimersByTimeAsync(250);
    await h.flushMicrotasks(15);

    // Corrupt active profile falls back cleanly to guest auth modal without crashing
    const modal = h.document.getElementById('player-profile-modal')!;
    expect(modal.style.display).toBe('flex');

    // Attempt login with corrupt accounts registry -> returns friendly feedback instead of throwing SyntaxError
    h.eval(`
      switchToAuthForm('login');
      document.getElementById('authUsernameInput').value = 'nonexistent';
      document.getElementById('authPasswordInput').value = 'secret123';
    `);
    await h.eval('submitAccountAuth()');
    const fb = h.document.getElementById('authFeedbackMsg')!;
    expect(fb.style.display).toBe('block');
    expect(fb.textContent).toContain('Không tìm thấy tài khoản');

    // Corrupt save payload for an existing profile also does not throw
    h.eval(`
      currentPlayerProfile = { id: 'acc_bad', username: 'bad', name: 'Bad', passwordHash: 'h_1' };
      loadPlayerSaveFromStorage();
    `);
    expect(Number.isFinite(h.eval('player.hp'))).toBe(true);
  });

  it('blocks boot/unload/in-flight/guest autosave from poisoning localStorage or Firestore', async () => {
    vi.useFakeTimers();
    const firestore = new MockFirestore();
    firestore.getDelayMs = 500;

    const profile = { id: 'acc_guard', username: 'guard', name: 'Guard', passwordHash: 'h_g' };
    firestore.seedDoc('players', 'acc_guard', {
      profile,
      gold: 99,
      hp: 33,
      maxHp: 150,
      armor: 11,
      currentMap: 'forest',
      x: 160,
      y: 160,
      updatedAt: 5000,
    });

    // 1. Registered user during pre-boot (!isSaveSystemReady) and during in-flight Cloud load
    const h1 = track(await createGameHarness({
      firestore,
      initialStorage: {
        game2d_active_profile_v1: JSON.stringify(profile),
        game2d_save_acc_guard: JSON.stringify({
          profile,
          gold: 99,
          hp: 33,
          maxHp: 150,
          armor: 11,
          currentMap: 'forest',
          x: 160,
          y: 160,
          updatedAt: 5000,
        }),
      },
    }));

    // Before preloadImages finishes (isSaveSystemReady === false): fire visibilitychange/pagehide/beforeunload
    expect(h1.eval('isSaveSystemReady')).toBe(false);
    h1.setVisibilityState('hidden');
    h1.document.dispatchEvent(new h1.dom.window.Event('visibilitychange'));
    h1.window.dispatchEvent(new h1.dom.window.Event('pagehide'));
    h1.window.dispatchEvent(new h1.dom.window.Event('beforeunload'));

    // localStorage save must remain untouched (hp: 33, updatedAt: 5000, no pendingSync)
    const preBootSave = JSON.parse(h1.localStorage.getItem('game2d_save_acc_guard')!);
    expect(preBootSave.hp).toBe(33);
    expect(preBootSave.updatedAt).toBe(5000);
    expect(h1.localStorage.getItem('game2d_pending_sync_acc_guard')).toBeNull();
    expect(firestore.setCalls.length).toBe(0);

    // Advance 250ms so initPlayerProfileAndSave runs and starts loadPlayerFromCloud (which takes 500ms)
    await vi.advanceTimersByTimeAsync(250);
    await h1.flushMicrotasks(10);
    expect(h1.eval('isCloudLoadInFlight')).toBe(true);

    // Mutate memory and trigger beforeunload while cloud load is in flight -> must be blocked
    h1.eval('player.hp = 149;');
    h1.window.dispatchEvent(new h1.dom.window.Event('beforeunload'));
    expect(h1.localStorage.getItem('game2d_pending_sync_acc_guard')).toBeNull();
    expect(firestore.setCalls.length).toBe(0);

    // Finish cloud load (500ms getDelayMs started after 200ms boot timeout)
    await vi.advanceTimersByTimeAsync(600);
    await h1.flushMicrotasks(15);
    expect(h1.eval('isCloudLoadInFlight')).toBe(false);
    expect(h1.eval('player.hp')).toBe(33);

    // 2. Unregistered guest (p_xxx) must never leak game2d_save_p_* or write to Firestore
    const guestFs = new MockFirestore();
    const hGuest = track(await createGameHarness({ firestore: guestFs }));
    await vi.advanceTimersByTimeAsync(250);
    await hGuest.flushMicrotasks(15);

    const guestId = hGuest.eval<string>('currentPlayerProfile.id');
    expect(guestId.startsWith('p_')).toBe(true);

    hGuest.setVisibilityState('hidden');
    hGuest.document.dispatchEvent(new hGuest.dom.window.Event('visibilitychange'));
    hGuest.window.dispatchEvent(new hGuest.dom.window.Event('beforeunload'));
    await vi.advanceTimersByTimeAsync(4500);
    await hGuest.flushMicrotasks(10);

    expect(hGuest.localStorage.getItem('game2d_save_' + guestId)).toBeNull();
    expect(guestFs.setCalls.length).toBe(0);
  });

  it('handlePlayerDeath passes skipSave=true during respawn map load and saves full HP/armor after refill', async () => {
    vi.useFakeTimers();
    const profile = { id: 'acc_respawn', username: 'respawn', name: 'Respawn', passwordHash: 'h_r' };
    const h = track(await createGameHarness());
    await vi.advanceTimersByTimeAsync(250);
    await h.flushMicrotasks(15);

    h.eval(`
      currentPlayerProfile = ${JSON.stringify(profile)};
      localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(currentPlayerProfile));
      isSaveSystemReady = true;
      loadMap("forest", { x: 200, y: 200 }, true);
      player.hp = 0;
      handlePlayerDeath();
    `);

    expect(h.eval('deathRespawnTimer !== null')).toBe(true);

    await vi.advanceTimersByTimeAsync(2600);
    await h.flushMicrotasks(10);

    expect(h.eval('currentMap')).toBe('home');
    expect(h.eval('player.hp')).toBe(h.eval('player.maxHp'));
    expect(h.eval('playerArmor')).toBe(h.eval('playerMaxArmor'));
    const saved = JSON.parse(h.localStorage.getItem('game2d_save_acc_respawn')!);
    expect(saved.hp).toBe(h.eval('player.maxHp'));
    expect(saved.armor).toBe(h.eval('playerMaxArmor'));
  });
});
