import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { JSDOM } from 'jsdom';

const ROOT_DIR = path.resolve(__dirname, '../../..');
const INDEX_HTML = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
const FIREBASE_CONFIG_JS = fs.readFileSync(path.join(ROOT_DIR, 'scripts', 'firebase-config.js'), 'utf8');
const GAME_CORE_JS = fs.readFileSync(path.join(ROOT_DIR, 'scripts', 'game-core.js'), 'utf8');

export interface MockFirestoreDocState {
  data: Record<string, any> | null;
}

export class MockFirestore {
  private collections = new Map<string, Map<string, Record<string, any>>>();
  private listeners = new Map<string, Set<(snap: { exists: boolean; data: () => any }) => void>>();
  public getDelayMs = 0;
  public setCalls: Array<{ collection: string; id: string; payload: any; merge: boolean }> = [];
  public getCalls: Array<{ collection: string; id: string }> = [];

  seedDoc(colName: string, docId: string, data: Record<string, any>) {
    let col = this.collections.get(colName);
    if (!col) {
      col = new Map();
      this.collections.set(colName, col);
    }
    col.set(docId, JSON.parse(JSON.stringify(data)));
  }

  readDoc(colName: string, docId: string): Record<string, any> | null {
    const col = this.collections.get(colName);
    const val = col?.get(docId);
    return val ? JSON.parse(JSON.stringify(val)) : null;
  }

  emitSnapshot(colName: string, docId: string, data: Record<string, any> | null) {
    let col = this.collections.get(colName);
    if (!col) {
      col = new Map();
      this.collections.set(colName, col);
    }
    if (data) {
      col.set(docId, JSON.parse(JSON.stringify(data)));
    } else {
      col.delete(docId);
    }
    const key = `${colName}/${docId}`;
    const subs = this.listeners.get(key);
    if (subs) {
      const snap = {
        exists: Boolean(data),
        data: () => (data ? JSON.parse(JSON.stringify(data)) : undefined),
      };
      for (const cb of [...subs]) {
        cb(snap);
      }
    }
  }

  collection(colName: string) {
    if (!this.collections.has(colName)) {
      this.collections.set(colName, new Map());
    }
    const col = this.collections.get(colName)!;
    const self = this;

    const makeQueryObj = () => ({
      where: () => makeQueryObj(),
      orderBy: () => makeQueryObj(),
      limit: () => makeQueryObj(),
      onSnapshot: (cb: (snap: { forEach: (fn: (doc: any) => void) => void }) => void) => {
        cb({ forEach: () => {} });
        return () => {};
      },
      get: async () => ({ docs: [], forEach: () => {} }),
    });

    return {
      ...makeQueryObj(),
      doc(docId: string) {
        const key = `${colName}/${docId}`;
        return {
          async get() {
            self.getCalls.push({ collection: colName, id: docId });
            if (self.getDelayMs > 0) {
              await new Promise((resolve) => setTimeout(resolve, self.getDelayMs));
            }
            const existing = col.get(docId);
            return {
              exists: Boolean(existing),
              data: () => (existing ? JSON.parse(JSON.stringify(existing)) : undefined),
            };
          },
          async set(payload: Record<string, any>, opts?: { merge?: boolean }) {
            const merge = Boolean(opts && opts.merge);
            self.setCalls.push({
              collection: colName,
              id: docId,
              payload: JSON.parse(JSON.stringify(payload)),
              merge,
            });
            const prev = col.get(docId) || {};
            const next = merge
              ? { ...prev, ...JSON.parse(JSON.stringify(payload)) }
              : JSON.parse(JSON.stringify(payload));
            col.set(docId, next);
          },
          onSnapshot(cb: (snap: { exists: boolean; data: () => any }) => void) {
            let subs = self.listeners.get(key);
            if (!subs) {
              subs = new Set();
              self.listeners.set(key, subs);
            }
            subs.add(cb);
            return () => {
              subs?.delete(cb);
            };
          },
        };
      },
    };
  }
}

function createMockCanvasContext(): Record<string, any> {
  const noop = () => {};
  const grad = { addColorStop: noop };
  return {
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    globalAlpha: 1,
    font: '10px monospace',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    imageSmoothingEnabled: false,
    webkitImageSmoothingEnabled: false,
    mozImageSmoothingEnabled: false,
    msImageSmoothingEnabled: false,
    shadowColor: 'transparent',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    lineCap: 'butt',
    lineJoin: 'miter',
    save: noop,
    restore: noop,
    clearRect: noop,
    fillRect: noop,
    strokeRect: noop,
    drawImage: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    arcTo: noop,
    ellipse: noop,
    rect: noop,
    roundRect: noop,
    quadraticCurveTo: noop,
    bezierCurveTo: noop,
    fill: noop,
    stroke: noop,
    clip: noop,
    fillText: noop,
    strokeText: noop,
    measureText: () => ({ width: 24 }),
    translate: noop,
    rotate: noop,
    scale: noop,
    setTransform: noop,
    resetTransform: noop,
    setLineDash: noop,
    getLineDash: () => [],
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    createPattern: () => ({}),
    getImageData: (_x: number, _y: number, w: number, h: number) => ({
      data: new Uint8ClampedArray(Math.max(1, w * h * 4)),
      width: w,
      height: h,
    }),
    putImageData: noop,
  };
}

export interface CreateGameHarnessOptions {
  initialStorage?: Record<string, string>;
  firestore?: MockFirestore | null;
  autoFlushBoot?: boolean;
  startGameLoop?: boolean;
}

export interface GameHarness {
  dom: JSDOM;
  window: any;
  document: Document;
  localStorage: Storage;
  context: vm.Context;
  firestore: MockFirestore | null;
  eval: <T = any>(expr: string) => T;
  flushMicrotasks: (rounds?: number) => Promise<void>;
  flushBoot: () => Promise<void>;
  setVisibilityState: (state: 'visible' | 'hidden') => void;
  dispose: () => void;
}

export async function createGameHarness(options: CreateGameHarnessOptions = {}): Promise<GameHarness> {
  const dom = new JSDOM(INDEX_HTML, {
    url: 'http://127.0.0.1:4173/',
    pretendToBeVisual: false,
  });

  const win = dom.window as any;
  const doc = win.document as Document;

  if (options.initialStorage) {
    for (const [k, v] of Object.entries(options.initialStorage)) {
      win.localStorage.setItem(k, v);
    }
  }

  // Ensure visibilityState is controllable in tests
  let currentVisibility: 'visible' | 'hidden' = 'visible';
  Object.defineProperty(doc, 'visibilityState', {
    configurable: true,
    get: () => currentVisibility,
  });

  // Mock matchMedia & viewport dimensions
  win.innerWidth = 1280;
  win.innerHeight = 720;
  win.matchMedia = (query: string) => ({
    matches: query.includes('pointer: fine'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });

  // Patch Canvas 2D getContext
  if (win.HTMLCanvasElement) {
    win.HTMLCanvasElement.prototype.getContext = function () {
      if (!this._mockCtx) {
        this._mockCtx = createMockCanvasContext();
      }
      return this._mockCtx;
    };
  }

  const activeTimeouts = new Set<ReturnType<typeof setTimeout>>();
  const activeIntervals = new Set<ReturnType<typeof setInterval>>();
  const activeRafs = new Set<ReturnType<typeof setTimeout>>();

  const bridgedSetTimeout = (fn: (...args: any[]) => void, ms = 0, ...args: any[]) => {
    const id = globalThis.setTimeout(() => {
      activeTimeouts.delete(id);
      fn(...args);
    }, ms);
    activeTimeouts.add(id);
    return id;
  };
  const bridgedClearTimeout = (id: any) => {
    activeTimeouts.delete(id);
    globalThis.clearTimeout(id);
  };
  const bridgedSetInterval = (fn: (...args: any[]) => void, ms = 0, ...args: any[]) => {
    const id = globalThis.setInterval(() => fn(...args), ms);
    activeIntervals.add(id);
    return id;
  };
  const bridgedClearInterval = (id: any) => {
    activeIntervals.delete(id);
    globalThis.clearInterval(id);
  };

  const allowRaf = options.startGameLoop !== false;
  const bridgedRaf = (cb: (ts: number) => void) => {
    if (!allowRaf) return 0;
    const id = globalThis.setTimeout(() => {
      activeRafs.delete(id);
      cb(Date.now());
    }, 16);
    activeRafs.add(id);
    return id;
  };
  const bridgedCancelRaf = (id: any) => {
    activeRafs.delete(id);
    globalThis.clearTimeout(id);
  };

  // Async MockImage that completes via microtask
  class MockImage {
    public onload: (() => void) | null = null;
    public onerror: (() => void) | null = null;
    public complete = false;
    public naturalWidth = 0;
    public naturalHeight = 0;
    public width = 0;
    public height = 0;
    private _src = '';

    get src() {
      return this._src;
    }
    set src(val: string) {
      this._src = String(val || '');
      queueMicrotask(() => {
        this.complete = true;
        this.naturalWidth = 128;
        this.naturalHeight = 128;
        this.width = 128;
        this.height = 128;
        if (typeof this.onload === 'function') {
          this.onload();
        }
      });
    }
  }

  // Real local fetch for assets/maps/*.json
  const bridgedFetch = async (url: string) => {
    const cleanRel = String(url || '').replace(/^\//, '').split('?')[0];
    const absPath = path.resolve(ROOT_DIR, cleanRel);
    if (!absPath.startsWith(ROOT_DIR) || !fs.existsSync(absPath)) {
      return {
        ok: false,
        status: 404,
        json: async () => {
          throw new Error(`Not found: ${cleanRel}`);
        },
        text: async () => '',
      };
    }
    const raw = fs.readFileSync(absPath, 'utf8');
    return {
      ok: true,
      status: 200,
      json: async () => JSON.parse(raw),
      text: async () => raw,
    };
  };

  const firestore = options.firestore ?? null;
  const firebaseApps: unknown[] = [];
  const firebaseMock = firestore
    ? {
        apps: firebaseApps,
        initializeApp: () => {
          firebaseApps.push({});
        },
        firestore: () => firestore,
      }
    : undefined;

  const sandbox: Record<string, any> = {
    console,
    Date,
    Math,
    JSON,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Set,
    Map,
    WeakMap,
    WeakSet,
    Promise,
    Error,
    TypeError,
    ReferenceError,
    RangeError,
    SyntaxError,
    RegExp,
    Intl,
    URL,
    URLSearchParams,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
    queueMicrotask,
    setTimeout: bridgedSetTimeout,
    clearTimeout: bridgedClearTimeout,
    setInterval: bridgedSetInterval,
    clearInterval: bridgedClearInterval,
    requestAnimationFrame: bridgedRaf,
    cancelAnimationFrame: bridgedCancelRaf,
    performance: { now: () => Date.now() },
    fetch: bridgedFetch,
    Image: MockImage,
    document: doc,
    localStorage: win.localStorage,
    sessionStorage: win.sessionStorage,
    navigator: win.navigator,
    location: win.location,
    innerWidth: 1280,
    innerHeight: 720,
    matchMedia: win.matchMedia,
    addEventListener: win.addEventListener.bind(win),
    removeEventListener: win.removeEventListener.bind(win),
    dispatchEvent: win.dispatchEvent.bind(win),
    Event: win.Event,
    CustomEvent: win.CustomEvent,
    MouseEvent: win.MouseEvent,
    KeyboardEvent: win.KeyboardEvent,
    HTMLElement: win.HTMLElement,
    HTMLCanvasElement: win.HTMLCanvasElement,
    AudioContext: undefined,
    webkitAudioContext: undefined,
    BroadcastChannel: undefined,
    firebase: firebaseMock,
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;

  const context = vm.createContext(sandbox);

  vm.runInContext(FIREBASE_CONFIG_JS, context, { filename: 'scripts/firebase-config.js' });
  vm.runInContext(GAME_CORE_JS, context, { filename: 'scripts/game-core.js' });

  const flushMicrotasks = async (rounds = 8) => {
    for (let i = 0; i < rounds; i++) {
      await Promise.resolve();
    }
  };

  const flushBoot = async () => {
    await flushMicrotasks(10);
    // Advance past onAllAssetsLoaded's 200ms setTimeout without relying on external clock assumptions
    // Works with both fake and real timers:
    const isReady = () => Boolean(vm.runInContext('isSaveSystemReady', context));
    if (!isReady()) {
      await new Promise<void>((resolve) => {
        bridgedSetTimeout(() => resolve(), 250);
      });
      await flushMicrotasks(15);
    }
  };

  const harness: GameHarness = {
    dom,
    window: sandbox,
    document: doc,
    localStorage: win.localStorage,
    context,
    firestore,
    eval: <T = any>(expr: string) => vm.runInContext(expr, context) as T,
    flushMicrotasks,
    flushBoot,
    setVisibilityState: (state: 'visible' | 'hidden') => {
      currentVisibility = state;
    },
    dispose: () => {
      for (const id of activeTimeouts) globalThis.clearTimeout(id);
      for (const id of activeIntervals) globalThis.clearInterval(id);
      for (const id of activeRafs) globalThis.clearTimeout(id);
      activeTimeouts.clear();
      activeIntervals.clear();
      activeRafs.clear();
      dom.window.close();
    },
  };

  if (options.autoFlushBoot) {
    // Only auto-flush when real timers are active; fake-timer tests advance timers explicitly.
    await flushBoot();
  }

  return harness;
}
