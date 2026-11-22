import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGameHarness, GameHarness } from './helpers/game-harness';

describe('M1 Critical Crash Regressions (BUG-01, BUG-02/P4, BUG-03)', () => {
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

  it('BUG-01: renderMinimap() runs safely before map load and caches terrain after maps load', async () => {
    vi.useFakeTimers();
    const h = track(await createGameHarness());

    // Pre-map-load call: homeMapData is still null
    expect(h.eval('homeMapData')).toBeNull();
    expect(() => h.eval('renderMinimap()')).not.toThrow();
    expect(h.document.getElementById('minimapTitle')?.textContent).toBe('🏠 NHÀ');

    // Finish boot & map JSON loading
    await vi.advanceTimersByTimeAsync(250);
    await h.flushMicrotasks(15);

    expect(h.eval('homeMapData !== null')).toBe(true);
    expect(h.eval('lakeMapData !== null')).toBe(true);

    expect(() => h.eval('renderMinimap()')).not.toThrow();
    expect(h.eval('Boolean(minimapTerrainCache.home)')).toBe(true);

    // Switch to lake map and move player -> title & coords update cleanly
    h.eval(`
      loadMap("lake", { x: 112, y: 204 }, true);
      renderMinimap();
    `);
    expect(h.eval('Boolean(minimapTerrainCache.lake)')).toBe(true);
    expect(h.document.getElementById('minimapTitle')?.textContent).toBe('🏞️ HỒ');
    expect(h.document.getElementById('minimapCoords')?.textContent).toBe('112, 204');
  });

  it('BUG-02 / P4: switchToAuthForm() handles guest and registered users and clears auth inputs', async () => {
    vi.useFakeTimers();
    const h = track(await createGameHarness());
    await vi.advanceTimersByTimeAsync(250);
    await h.flushMicrotasks(15);

    // Guest boot & manualSaveGameProgress should open auth modal with close button hidden
    expect(() => h.eval('manualSaveGameProgress()')).not.toThrow();
    const closeBtn = h.document.getElementById('closeProfileModalBtn')!;
    expect(closeBtn.style.display).toBe('none');

    // Populate inputs as if previous user typed credentials
    const uInp = h.document.getElementById('authUsernameInput') as HTMLInputElement;
    const pInp = h.document.getElementById('authPasswordInput') as HTMLInputElement;
    const dInp = h.document.getElementById('authDisplayNameInput') as HTMLInputElement;
    uInp.value = 'old_user';
    pInp.value = 'old_pass';
    dInp.value = 'Old Display';

    // Registered user switching accounts: close button visible and inputs cleared
    h.eval(`
      currentPlayerProfile = { id: 'acc_reg', username: 'reg', name: 'Reg' };
      switchToAuthForm('login');
    `);
    expect(closeBtn.style.display).toBe('inline-block');
    expect(uInp.value).toBe('');
    expect(pInp.value).toBe('');
    expect(dInp.value).toBe('');
  });

  it('BUG-03: buyItemFromNPC() purchases stackable/non-stackable items and protects gold on insufficient funds or full bag', async () => {
    vi.useFakeTimers();
    const h = track(await createGameHarness());
    await vi.advanceTimersByTimeAsync(250);
    await h.flushMicrotasks(15);

    // 1. Buy stackable arrow (qty 5, price 3) into fresh empty bag
    h.eval(`
      playerInventory.fill(null);
      droppedItems.length = 0;
      playerGold = 300;
      buyItemFromNPC('arrow');
    `);
    expect(h.eval('playerGold')).toBe(297);
    expect(h.eval('playerInventory[0]')).toMatchObject({ id: 'arrow', quantity: 5 });
    expect(h.eval('droppedItems.length')).toBe(0);

    // 2. Buy non-stackable spell_gravity (qty 1, price 180)
    h.eval(`buyItemFromNPC('spell_gravity');`);
    expect(h.eval('playerGold')).toBe(117);
    expect(h.eval('playerInventory[1]')).toMatchObject({ id: 'spell_gravity', quantity: 1 });

    // 3. Insufficient gold
    h.eval(`
      playerGold = 2;
      buyItemFromNPC('arrow');
    `);
    expect(h.eval('playerGold')).toBe(2);
    expect(h.eval('playerInventory[0].quantity')).toBe(5);

    // 4. Full 36-slot bag: buying spell_timestop leaves gold unchanged & spawns 0 ground items
    h.eval(`
      playerGold = 500;
      droppedItems.length = 0;
      for (let i = 0; i < 36; i++) {
        playerInventory[i] = { id: 'stone_rock', name: 'Đá Cuội', quantity: 64 };
      }
      buyItemFromNPC('spell_timestop');
    `);
    expect(h.eval('playerGold')).toBe(500);
    expect(h.eval('droppedItems.length')).toBe(0);

    // 5. Partial-stack overflow: 35 slots full + 1 slot has 62 arrows, buying 5 arrows must fail atomically
    h.eval(`
      playerGold = 100;
      droppedItems.length = 0;
      playerInventory[35] = { id: 'arrow', name: 'Mũi Tên', quantity: 62 };
      buyItemFromNPC('arrow');
    `);
    expect(h.eval('playerGold')).toBe(100);
    expect(h.eval('playerInventory[35].quantity')).toBe(62);
    expect(h.eval('droppedItems.length')).toBe(0);
  });
});
