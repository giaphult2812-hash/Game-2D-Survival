import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGameHarness, GameHarness, MockFirestore } from './helpers/game-harness';

describe('R1 Save/Load HP & Armor Persistence', () => {
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

  it('persists low HP and low armor across save/reload with base stats and survives 2.5s+ autosave ticks', async () => {
    vi.useFakeTimers();
    const profile = { id: 'acc_hero1', username: 'hero1', name: 'Hero 1', passwordHash: 'h_123' };

    const s1 = track(await createGameHarness());
    await vi.advanceTimersByTimeAsync(250);
    await s1.flushMicrotasks(15);

    s1.eval(`
      currentPlayerProfile = ${JSON.stringify(profile)};
      localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(currentPlayerProfile));
      isSaveSystemReady = true;
      loadMap("forest", { x: 120, y: 140 }, true);
      playerEquipment.fill(null);
      activeHotbarIndex = 1; // stone_rock (no bonusHp/bonusArmor)
      recalculatePlayerArmorAndStats();
      player.hp = 22;
      player.displayHp = 22;
      playerArmor = 7;
      playerDisplayArmor = 7;
      savePlayerToStorage(true);
    `);

    const savedSnapshot: Record<string, string> = {};
    for (let i = 0; i < s1.localStorage.length; i++) {
      const k = s1.localStorage.key(i)!;
      savedSnapshot[k] = s1.localStorage.getItem(k)!;
    }

    // Reload into a fresh runtime session
    const s2 = track(await createGameHarness({ initialStorage: savedSnapshot }));
    await vi.advanceTimersByTimeAsync(250);
    await s2.flushMicrotasks(15);

    expect(s2.eval('currentMap')).toBe('forest');
    expect(s2.eval('player.hp')).toBe(22);
    expect(s2.eval('player.displayHp')).toBe(22);
    expect(s2.eval('playerArmor')).toBe(7);
    expect(s2.eval('playerDisplayArmor')).toBe(7);
    expect(s2.document.getElementById('valPlayerHP')?.textContent).toBe('22 / 150');

    // Clear forest mobs so boars do not attack during the 2.6s unpaused autosave wait
    s2.eval('currentMobs.length = 0;');

    // Advance 2.6s (past the 2s autosave interval, while on 'forest' and below 5s default armor regen)
    await vi.advanceTimersByTimeAsync(2600);
    await s2.flushMicrotasks(10);

    expect(s2.eval('player.hp')).toBe(22);
    expect(s2.eval('player.displayHp')).toBe(22);
    expect(s2.eval('playerArmor')).toBe(7);
    expect(s2.eval('playerDisplayArmor')).toBe(7);
    expect(s2.document.getElementById('valPlayerHP')?.textContent).toBe('22 / 150');

    const persisted = JSON.parse(s2.localStorage.getItem('game2d_save_acc_hero1')!);
    expect(persisted.hp).toBe(22);
    expect(persisted.armor).toBe(7);
  });

  it('persists low HP and low armor with equipped Diamond Armor + rolled weapon bonusHp/bonusArmor', async () => {
    vi.useFakeTimers();
    const profile = { id: 'acc_knight', username: 'knight', name: 'Knight', passwordHash: 'h_abc' };

    const s1 = track(await createGameHarness());
    await vi.advanceTimersByTimeAsync(250);
    await s1.flushMicrotasks(15);

    const maxes = s1.eval<{ maxHp: number; maxArmor: number }>(`
      currentPlayerProfile = ${JSON.stringify(profile)};
      localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(currentPlayerProfile));
      isSaveSystemReady = true;
      playerEquipment[0] = { id: 'diamond_helmet', name: 'Nón Kim Cương', quantity: 1, durability: 350, maxDurability: 350 };
      playerEquipment[1] = { id: 'diamond_chest', name: 'Giáp Kim Cương', quantity: 1, durability: 500, maxDurability: 500 };
      playerEquipment[2] = { id: 'diamond_legs', name: 'Quần Kim Cương', quantity: 1, durability: 420, maxDurability: 420 };
      playerEquipment[3] = { id: 'diamond_boots', name: 'Giày Kim Cương', quantity: 1, durability: 380, maxDurability: 380 };
      activeHotbarIndex = 2;
      playerInventory[2] = {
        id: 'iron_sword',
        name: 'Kiếm Sắt',
        quantity: 1,
        durability: 180,
        maxDurability: 180,
        damage: 9,
        rollQuality: 'Huyền Thoại',
        bonusHp: 25,
        bonusArmor: 15
      };
      recalculatePlayerArmorAndStats();
      player.hp = 37;
      player.displayHp = 37;
      playerArmor = 19;
      playerDisplayArmor = 19;
      loadMap("forest", { x: 180, y: 180 }, true);
      savePlayerToStorage(true);
      ({ maxHp: player.maxHp, maxArmor: playerMaxArmor });
    `);

    expect(maxes.maxHp).toBeGreaterThan(150);
    expect(maxes.maxArmor).toBeGreaterThan(50);

    const savedSnapshot: Record<string, string> = {};
    for (let i = 0; i < s1.localStorage.length; i++) {
      const k = s1.localStorage.key(i)!;
      savedSnapshot[k] = s1.localStorage.getItem(k)!;
    }

    const s2 = track(await createGameHarness({ initialStorage: savedSnapshot }));
    await vi.advanceTimersByTimeAsync(250);
    await s2.flushMicrotasks(15);

    expect(s2.eval('player.maxHp')).toBe(maxes.maxHp);
    expect(s2.eval('playerMaxArmor')).toBe(maxes.maxArmor);
    expect(s2.eval('player.hp')).toBe(37);
    expect(s2.eval('player.displayHp')).toBe(37);
    expect(s2.eval('playerArmor')).toBe(19);
    expect(s2.eval('playerDisplayArmor')).toBe(19);
    expect(s2.document.getElementById('valPlayerHP')?.textContent).toBe(`37 / ${maxes.maxHp}`);

    // Pause simulation (as when modal/tab is idle) and advance past 2.5s autosave tick
    s2.eval('isPaused = true;');
    await vi.advanceTimersByTimeAsync(2600);
    await s2.flushMicrotasks(10);

    expect(s2.eval('player.hp')).toBe(37);
    expect(s2.eval('playerArmor')).toBe(19);
    const persisted = JSON.parse(s2.localStorage.getItem('game2d_save_acc_knight')!);
    expect(persisted.hp).toBe(37);
    expect(persisted.armor).toBe(19);
  });

  it('resolves mocked Firebase Cloud sync race accurately for both local-pending and cloud-newer cases', async () => {
    vi.useFakeTimers();

    // Case A: local pending low HP/armor beats stale Cloud full HP/armor despite async docRef.get() delay
    const firestoreA = new MockFirestore();
    firestoreA.getDelayMs = 150;
    const profileA = { id: 'acc_cloud1', username: 'cloud1', name: 'Cloud 1', passwordHash: 'h_1' };
    firestoreA.seedDoc('players', 'acc_cloud1', {
      profile: profileA,
      gold: 50,
      hp: 150,
      maxHp: 150,
      armor: 50,
      currentMap: 'home',
      x: 248,
      y: 268,
      updatedAt: 1000,
    });

    const localLowSave = {
      profile: profileA,
      gold: 88,
      hp: 18,
      maxHp: 150,
      armor: 4,
      activeHotbarIndex: 0,
      inventory: new Array(36).fill(null),
      equipment: new Array(4).fill(null),
      currentMap: 'forest',
      x: 110,
      y: 120,
      placedObjects: { home: [], forest: [], lake: [] },
      updatedAt: 5000,
    };

    const hA = track(await createGameHarness({
      firestore: firestoreA,
      initialStorage: {
        game2d_active_profile_v1: JSON.stringify(profileA),
        game2d_save_acc_cloud1: JSON.stringify(localLowSave),
        game2d_pending_sync_acc_cloud1: '1',
      },
    }));

    await vi.advanceTimersByTimeAsync(250);
    await hA.flushMicrotasks(15);
    // Advance past 150ms Firestore get() delay
    await vi.advanceTimersByTimeAsync(200);
    await hA.flushMicrotasks(15);

    expect(hA.eval('player.hp')).toBe(18);
    expect(hA.eval('playerArmor')).toBe(4);
    expect(hA.eval('player.displayHp')).toBe(18);
    expect(hA.eval('playerDisplayArmor')).toBe(4);
    expect(hA.document.getElementById('valPlayerHP')?.textContent).toBe('18 / 150');

    const cloudDocA = firestoreA.readDoc('players', 'acc_cloud1')!;
    expect(cloudDocA.hp).toBe(18);
    expect(cloudDocA.armor).toBe(4);

    hA.eval('currentMobs.length = 0;');
    await vi.advanceTimersByTimeAsync(2500);
    await hA.flushMicrotasks(10);
    expect(hA.eval('player.hp')).toBe(18);
    expect(hA.eval('playerArmor')).toBe(4);

    // Case B: Cloud is newer and has low HP/armor while local is older full HP/armor (not pending)
    const firestoreB = new MockFirestore();
    firestoreB.getDelayMs = 150;
    const profileB = { id: 'acc_cloud2', username: 'cloud2', name: 'Cloud 2', passwordHash: 'h_2' };
    firestoreB.seedDoc('players', 'acc_cloud2', {
      profile: profileB,
      gold: 120,
      hp: 29,
      maxHp: 150,
      armor: 9,
      activeHotbarIndex: 3,
      inventory: new Array(36).fill(null),
      equipment: new Array(4).fill(null),
      currentMap: 'forest',
      x: 200,
      y: 210,
      placedObjects: { home: [], forest: [], lake: [] },
      updatedAt: 9000,
    });

    const staleLocal = {
      profile: profileB,
      gold: 50,
      hp: 150,
      maxHp: 150,
      armor: 50,
      currentMap: 'home',
      x: 248,
      y: 268,
      updatedAt: 1000,
    };

    const hB = track(await createGameHarness({
      firestore: firestoreB,
      initialStorage: {
        game2d_active_profile_v1: JSON.stringify(profileB),
        game2d_save_acc_cloud2: JSON.stringify(staleLocal),
      },
    }));

    await vi.advanceTimersByTimeAsync(250);
    await hB.flushMicrotasks(15);
    await vi.advanceTimersByTimeAsync(200);
    await hB.flushMicrotasks(15);

    expect(hB.eval('player.hp')).toBe(29);
    expect(hB.eval('playerArmor')).toBe(9);
    expect(hB.eval('player.displayHp')).toBe(29);
    expect(hB.eval('playerDisplayArmor')).toBe(9);
    expect(hB.document.getElementById('valPlayerHP')?.textContent).toBe('29 / 150');

    hB.eval('currentMobs.length = 0;');
    await vi.advanceTimersByTimeAsync(2500);
    await hB.flushMicrotasks(10);
    expect(hB.eval('player.hp')).toBe(29);
    expect(hB.eval('playerArmor')).toBe(9);
    const localAfterB = JSON.parse(hB.localStorage.getItem('game2d_save_acc_cloud2')!);
    expect(localAfterB.hp).toBe(29);
    expect(localAfterB.armor).toBe(9);
  });

  it('dirty-check prevents idle 2s autosave ticks from bumping updatedAt or setting pendingSync', async () => {
    vi.useFakeTimers();
    const profile = { id: 'acc_dirty', username: 'dirty', name: 'DirtyCheck', passwordHash: 'h_d' };

    const h = track(await createGameHarness());
    await vi.advanceTimersByTimeAsync(250);
    await h.flushMicrotasks(15);

    h.eval(`
      currentPlayerProfile = ${JSON.stringify(profile)};
      localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(currentPlayerProfile));
      isSaveSystemReady = true;
      isPaused = true;
      loadMap("forest", { x: 150, y: 150 }, true);
      player.hp = 44;
      player.displayHp = 44;
      playerArmor = 12;
      playerDisplayArmor = 12;
      savePlayerToStorage(false);
    `);

    const initialRaw = h.localStorage.getItem('game2d_save_acc_dirty')!;
    const initialParsed = JSON.parse(initialRaw);
    expect(h.localStorage.getItem('game2d_pending_sync_acc_dirty')).toBeNull();

    // Advance 6.5s (3 idle 2s autosave ticks)
    await vi.advanceTimersByTimeAsync(6500);
    await h.flushMicrotasks(10);

    const afterParsed = JSON.parse(h.localStorage.getItem('game2d_save_acc_dirty')!);
    expect(afterParsed.updatedAt).toBe(initialParsed.updatedAt);
    expect(h.localStorage.getItem('game2d_pending_sync_acc_dirty')).toBeNull();

    // Mutate HP and verify next autosave tick detects dirty state and persists
    h.eval('player.hp = 31;');
    await vi.advanceTimersByTimeAsync(2100);
    await h.flushMicrotasks(10);

    const mutatedParsed = JSON.parse(h.localStorage.getItem('game2d_save_acc_dirty')!);
    expect(mutatedParsed.hp).toBe(31);
    expect(mutatedParsed.updatedAt).toBeGreaterThan(initialParsed.updatedAt);
    expect(h.localStorage.getItem('game2d_pending_sync_acc_dirty')).toBe('1');
  });
});
