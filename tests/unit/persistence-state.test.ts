import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGameHarness, GameHarness, MockFirestore } from './helpers/game-harness';

describe('R1 Extended State Persistence, Auth Sync & Transient Isolation', () => {
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

  it('round-trips HOME_CAMPFIRE, activeHotbarIndex, placedObjects (Chest items), inventory & equipment', async () => {
    vi.useFakeTimers();
    const profile = { id: 'acc_full', username: 'fullstate', name: 'FullState', passwordHash: 'h_f' };

    const s1 = track(await createGameHarness());
    await vi.advanceTimersByTimeAsync(250);
    await s1.flushMicrotasks(15);

    s1.eval(`
      currentPlayerProfile = ${JSON.stringify(profile)};
      localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(currentPlayerProfile));
      isSaveSystemReady = true;
      activeHotbarIndex = 6;
      playerGold = 345;
      playerEquipment[0] = { id: 'iron_helmet', name: 'Nón Sắt', quantity: 1, durability: 111, maxDurability: 150 };
      playerEquipment[1] = { id: 'diamond_chest', name: 'Giáp Kim Cương', quantity: 1, durability: 420, maxDurability: 500 };
      playerInventory[0] = {
        id: 'magic_wand',
        name: 'Đũa Phép',
        quantity: 1,
        durability: 175,
        maxDurability: 200,
        wandData: { slots: ['spell_gravity', 'spell_wood', null], gemSlots: ['gem_fire', null, null] }
      };
      playerInventory[6] = {
        id: 'iron_sword',
        name: 'Kiếm Sắt',
        quantity: 1,
        durability: 140,
        maxDurability: 180,
        damage: 8,
        rollQuality: 'Hiếm',
        bonusArmor: 5
      };
      HOME_CAMPFIRE.inputItem = { id: 'boar_unripe', name: 'Thịt Heo Sống', quantity: 3 };
      HOME_CAMPFIRE.fuelItem = { id: 'coal', name: 'Than Đá', quantity: 7 };
      HOME_CAMPFIRE.resultItem = { id: 'boar_cooked', name: 'Thịt Heo Chín', quantity: 2 };
      HOME_CAMPFIRE.cookProgress = 2.4;
      HOME_CAMPFIRE.fuelRemaining = 9.5;
      HOME_CAMPFIRE.fuelMax = 16.0;

      const chestItems = new Array(27).fill(null);
      chestItems[0] = { id: 'diamond', name: 'Kim Cương', quantity: 5 };
      chestItems[4] = { id: 'apple', name: 'Táo Rừng', quantity: 12 };
      mapConfigs.home.harvestables.push({
        type: 'chest',
        x: 208,
        y: 224,
        width: 16,
        height: 16,
        name: 'Rương Đồ',
        items: chestItems
      });
      mapConfigs.forest.harvestables.push({
        type: 'crafting_table',
        x: 160,
        y: 176,
        width: 16,
        height: 16,
        name: 'Bàn Chế Tạo'
      });

      recalculatePlayerArmorAndStats();
      player.hp = 45;
      player.displayHp = 45;
      playerArmor = 14;
      playerDisplayArmor = 14;
      savePlayerToStorage(true);
    `);

    const savedSnapshot: Record<string, string> = {};
    for (let i = 0; i < s1.localStorage.length; i++) {
      const k = s1.localStorage.key(i)!;
      savedSnapshot[k] = s1.localStorage.getItem(k)!;
    }

    const s2 = track(await createGameHarness({ initialStorage: savedSnapshot, startGameLoop: false }));
    await vi.advanceTimersByTimeAsync(250);
    await s2.flushMicrotasks(15);

    expect(s2.eval('activeHotbarIndex')).toBe(6);
    expect(s2.eval('playerGold')).toBe(345);
    expect(s2.eval('player.hp')).toBe(45);
    expect(s2.eval('playerArmor')).toBe(14);
    expect(s2.eval('playerEquipment[0].durability')).toBe(111);
    expect(s2.eval('playerEquipment[1].id')).toBe('diamond_chest');
    expect(s2.eval('playerInventory[0].wandData.gemSlots[0]')).toBe('gem_fire');
    expect(s2.eval('playerInventory[6].rollQuality')).toBe('Hiếm');
    expect(s2.eval('playerInventory[6].durability')).toBe(140);

    expect(s2.eval('HOME_CAMPFIRE.inputItem')).toEqual({ id: 'boar_unripe', name: 'Thịt Heo Sống', quantity: 3 });
    expect(s2.eval('HOME_CAMPFIRE.fuelItem')).toEqual({ id: 'coal', name: 'Than Đá', quantity: 7 });
    expect(s2.eval('HOME_CAMPFIRE.resultItem')).toEqual({ id: 'boar_cooked', name: 'Thịt Heo Chín', quantity: 2 });
    expect(s2.eval('HOME_CAMPFIRE.cookProgress')).toBeCloseTo(2.4);
    expect(s2.eval('HOME_CAMPFIRE.fuelRemaining')).toBeCloseTo(9.5);
    expect(s2.eval('HOME_CAMPFIRE.fuelMax')).toBe(16.0);

    const homeChest = s2.eval<any>('mapConfigs.home.harvestables.find(o => o.type === "chest")');
    expect(homeChest).toBeTruthy();
    expect(homeChest.x).toBe(208);
    expect(homeChest.items[0]).toEqual({ id: 'diamond', name: 'Kim Cương', quantity: 5 });
    expect(homeChest.items[4]).toEqual({ id: 'apple', name: 'Táo Rừng', quantity: 12 });

    const forestTable = s2.eval<any>('mapConfigs.forest.harvestables.find(o => o.type === "crafting_table")');
    expect(forestTable).toBeTruthy();
    expect(forestTable.x).toBe(160);
    expect(forestTable.y).toBe(176);
  });

  it('submitAccountAuth login with foundCloudData avoids redundant Cloud re-upload and persists onSnapshot payout', async () => {
    vi.useFakeTimers();
    const firestore = new MockFirestore();
    const passHash = 'h_999';
    const cloudSave = {
      profile: { id: 'acc_trader', username: 'trader', name: 'Trader', passwordHash: passHash },
      username: 'trader',
      passwordHash: passHash,
      gold: 200,
      hp: 61,
      maxHp: 150,
      armor: 17,
      activeHotbarIndex: 2,
      inventory: new Array(36).fill(null),
      equipment: new Array(4).fill(null),
      currentMap: 'home',
      x: 248,
      y: 268,
      placedObjects: { home: [], forest: [], lake: [] },
      updatedAt: 8000,
    };
    firestore.seedDoc('players', 'acc_trader', cloudSave);

    const h = track(await createGameHarness({ firestore }));
    await vi.advanceTimersByTimeAsync(250);
    await h.flushMicrotasks(15);

    const realHash = h.eval<string>('simpleHashPassword("secret123")');
    cloudSave.passwordHash = realHash;
    cloudSave.profile.passwordHash = realHash;
    firestore.seedDoc('players', 'acc_trader', cloudSave);

    h.eval(`
      switchToAuthForm('login');
      document.getElementById('authUsernameInput').value = 'trader';
      document.getElementById('authPasswordInput').value = 'secret123';
    `);
    await h.eval('submitAccountAuth()');
    await h.flushMicrotasks(15);

    // Should NOT have called set() to redundantly re-upload or set pendingSync
    expect(firestore.setCalls.length).toBe(0);
    expect(h.localStorage.getItem('game2d_pending_sync_acc_trader')).toBeNull();
    expect(h.eval('player.hp')).toBe(61);
    expect(h.eval('playerArmor')).toBe(17);
    expect(h.eval('playerGold')).toBe(200);

    // Realtime market sale arrives via onSnapshot -> must update playerGold AND persist to localStorage
    firestore.emitSnapshot('players', 'acc_trader', { ...cloudSave, pendingGold: 45 });
    await h.flushMicrotasks(10);

    expect(h.eval('playerGold')).toBe(245);
    const localAfterPayout = JSON.parse(h.localStorage.getItem('game2d_save_acc_trader')!);
    expect(localAfterPayout.gold).toBe(245);
  });

  it('cleans transient gameplay state on in-place load and isolates state when switching to an unsaved account', async () => {
    vi.useFakeTimers();
    const h = track(await createGameHarness());
    await vi.advanceTimersByTimeAsync(250);
    await h.flushMicrotasks(15);

    // Dirty Account A state + transient open chest, crafting/forge grids, cursorItem, action, projectiles, drops, respawn timer
    h.eval(`
      currentPlayerProfile = { id: 'acc_alpha', username: 'alpha', name: 'Alpha', passwordHash: simpleHashPassword('pw1') };
      const reg = {
        alpha: currentPlayerProfile,
        beta: { id: 'acc_beta', username: 'beta', name: 'Beta', passwordHash: simpleHashPassword('pw2') }
      };
      localStorage.setItem('game2d_accounts_registry_v1', JSON.stringify(reg));
      isSaveSystemReady = true;

      playerGold = 999;
      playerInventory[5] = { id: 'diamond', name: 'Kim Cương', quantity: 20 };
      playerEquipment[0] = { id: 'diamond_helmet', name: 'Nón Kim Cương', quantity: 1, durability: 350, maxDurability: 350 };
      HOME_CAMPFIRE.inputItem = { id: 'boar_unripe', name: 'Thịt Heo Sống', quantity: 2 };
      mapConfigs.home.harvestables.push({
        type: 'chest',
        x: 200,
        y: 200,
        width: 16,
        height: 16,
        name: 'Alpha Chest',
        items: new Array(27).fill(null)
      });
      activeOpenChest = mapConfigs.home.harvestables.find(o => o.type === 'chest');
      document.getElementById('chest-ui').style.display = 'flex';
      pocketCraftingInventory[0] = { id: 'wood_log', name: 'Khúc Gỗ', quantity: 4 };
      workstationCraftingInventory[0] = { id: 'stone_rock', name: 'Đá Cuội', quantity: 4 };
      forgeInventory[0] = { id: 'iron_sword', name: 'Kiếm Sắt', quantity: 1 };
      cursorItem = { id: 'apple', name: 'Táo Rừng', quantity: 3 };
      player.action = 'attack';
      droppedItems.push({ x: 100, y: 100, item: { id: 'wood_log', name: 'Khúc Gỗ', quantity: 1 } });
      activeProjectiles.push({ x: 100, y: 100, vx: 10, vy: 0 });
      handlePlayerDeath(); // schedules deathRespawnTimer
    `);

    expect(h.eval('deathRespawnTimer !== null')).toBe(true);

    // Switch to Account Beta (exists in localAccounts, no saved data)
    h.eval(`
      switchToAuthForm('login');
      document.getElementById('authUsernameInput').value = 'beta';
      document.getElementById('authPasswordInput').value = 'pw2';
    `);
    await h.eval('submitAccountAuth()');
    await h.flushMicrotasks(15);

    expect(h.eval('currentPlayerProfile.username')).toBe('beta');
    expect(h.eval('deathRespawnTimer')).toBeNull();
    expect(h.eval('activeOpenChest')).toBeNull();
    expect(h.eval('cursorItem')).toBeNull();
    expect(h.eval('pocketCraftingInventory.every(x => x === null)')).toBe(true);
    expect(h.eval('workstationCraftingInventory.every(x => x === null)')).toBe(true);
    expect(h.eval('forgeInventory.every(x => x === null)')).toBe(true);
    expect(h.eval('droppedItems.length')).toBe(0);
    expect(h.eval('activeProjectiles.length')).toBe(0);
    expect(h.eval('player.action')).toBe('idle');

    // Account Alpha's items/gold/equipment/campfire/chest must NOT leak into Account Beta
    expect(h.eval('playerGold')).toBe(50);
    expect(h.eval('playerInventory.every(x => x === null)')).toBe(true);
    expect(h.eval('playerEquipment.every(x => x === null)')).toBe(true);
    expect(h.eval('HOME_CAMPFIRE.inputItem')).toBeNull();
    expect(h.eval('mapConfigs.home.harvestables.some(o => o.type === "chest")')).toBe(false);
    expect(h.eval('player.hp')).toBe(h.eval('player.maxHp'));

    // Also verify in-place applyPlayerSaveData cleans transient state
    h.eval(`
      cursorItem = { id: 'coal', name: 'Than Đá', quantity: 2 };
      pocketCraftingInventory[1] = { id: 'wood_log', name: 'Khúc Gỗ', quantity: 2 };
      forgeInventory[1] = { id: 'iron_ore', name: 'Quặng Sắt', quantity: 1 };
      droppedItems.push({ x: 50, y: 50, item: { id: 'wood_log', name: 'Khúc Gỗ', quantity: 1 } });
      activeProjectiles.push({ x: 50, y: 50, vx: 1, vy: 1 });
      player.action = 'hurt';
      applyPlayerSaveData({ gold: 123, hp: 55, armor: 12, currentMap: 'home', x: 248, y: 268, updatedAt: Date.now() });
    `);

    expect(h.eval('cursorItem')).toBeNull();
    expect(h.eval('pocketCraftingInventory.every(x => x === null)')).toBe(true);
    expect(h.eval('forgeInventory.every(x => x === null)')).toBe(true);
    expect(h.eval('droppedItems.length')).toBe(0);
    expect(h.eval('activeProjectiles.length')).toBe(0);
    expect(h.eval('player.action')).toBe('idle');
    expect(h.eval('playerGold')).toBe(123);
    expect(h.eval('player.hp')).toBe(55);
    expect(h.eval('playerArmor')).toBe(12);
  });
});
