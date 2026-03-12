/* ============================================================
   PIXELTOOLS — script.js
   FOWLSIGNS™ Production Build
   All tools run entirely in the browser via Canvas API.
   ============================================================ */

// ============================================================
// STATE
// ============================================================
const state = {
  currentTool: null,
  sourceImage: null,        // HTMLImageElement from upload
  outputCanvas: null,       // Result canvas
  spriteFrames: [],         // Array of HTMLImageElement (sprite sheet)
  paletteColors: [],        // Extracted colors
  batchFiles: [],           // Batch upscaler queue
  batchResults: [],         // Processed canvases for ZIP
};

// ============================================================
// TOOL DEFINITIONS
// ============================================================
const TOOLS = {
  upscaler: {
    icon: '⬆️',
    title: 'Pixel Art Upscaler',
    desc: 'Scale pixel art with nearest-neighbor interpolation. Perfectly sharp, zero blur.',
    batch: true,
    settings: () => `
      <div class="setting-group">
        <label>Scale Preset</label>
        <div class="preset-row">
          ${['2x','4x','8x','10x'].map(v => `<button class="preset-btn" data-scale="${v.replace('x','')}" onclick="setScale(this)">${v}</button>`).join('')}
        </div>
      </div>
      <div class="setting-group">
        <label>Custom Scale (1–20)</label>
        <input type="number" id="customScale" min="1" max="20" value="2" oninput="syncCustomScale(this)" />
      </div>
      <div class="setting-group">
        <label>Mode</label>
        <div class="preset-row">
          <button class="preset-btn active" id="modeSingle" onclick="setUpscaleMode('single')">Single</button>
          <button class="preset-btn" id="modeBatch" onclick="setUpscaleMode('batch')">Batch</button>
        </div>
      </div>
    `,
  },
  svg: {
    icon: '✦',
    title: 'Pixel Art → SVG',
    desc: 'Convert pixel art to scalable SVG. Every pixel becomes a vector rectangle.',
    settings: () => `
      <div class="setting-group">
        <label>Max Image Size (px)</label>
        <select id="svgMaxSize">
          <option value="64">64px (recommended)</option>
          <option value="128">128px</option>
          <option value="256">256px</option>
        </select>
      </div>
      <div class="setting-group">
        <label>Optimization</label>
        <div class="preset-row">
          <button class="preset-btn active" id="svgOptOn" onclick="setSvgOpt(true)">On</button>
          <button class="preset-btn" id="svgOptOff" onclick="setSvgOpt(false)">Off</button>
        </div>
      </div>
    `,
  },
  pixelate: {
    icon: '⬛',
    title: 'Image → Pixel Art',
    desc: 'Turn any photo into pixel art. Reduce colors for that authentic retro look.',
    settings: () => `
      <div class="setting-group">
        <label>Pixel Size</label>
        <div class="preset-row">
          ${[8,16,32,64].map(v => `<button class="preset-btn${v===16?' active':''}" data-px="${v}" onclick="setPixelSize(this)">${v}px</button>`).join('')}
        </div>
      </div>
      <div class="setting-group">
        <label>Color Reduction <span id="colorCountLabel">16</span> colors</label>
        <input type="range" id="colorCount" min="2" max="64" value="16"
          oninput="document.getElementById('colorCountLabel').textContent=this.value" />
      </div>
    `,
  },
  palette: {
    icon: '🎨',
    title: 'Palette Extractor',
    desc: 'Extract dominant colors. Click any swatch to copy its HEX code.',
    settings: () => `
      <div class="setting-group">
        <label>Number of Colors</label>
        <div class="preset-row">
          ${[4,8,12,16,24,32].map(v => `<button class="preset-btn${v===16?' active':''}" data-colors="${v}" onclick="setPaletteCount(this)">${v}</button>`).join('')}
        </div>
      </div>
    `,
  },
  grid: {
    icon: '⊞',
    title: 'Pixel Grid Overlay',
    desc: 'Add a pixel grid on any image. Great for sprite guides and game dev references.',
    settings: () => `
      <div class="setting-group">
        <label>Grid Size</label>
        <div class="preset-row">
          ${[8,16,32,64].map(v => `<button class="preset-btn${v===16?' active':''}" data-grid="${v}" onclick="setGridSize(this)">${v}px</button>`).join('')}
        </div>
      </div>
      <div class="setting-group">
        <label>Grid Color</label>
        <input type="color" id="gridColor" value="#ffffff" />
      </div>
      <div class="setting-group">
        <label>Opacity <span id="gridOpacityLabel">50</span>%</label>
        <input type="range" id="gridOpacity" min="5" max="100" value="50"
          oninput="document.getElementById('gridOpacityLabel').textContent=this.value" />
      </div>
    `,
  },
  sprite: {
    icon: '▦',
    title: 'Sprite Sheet Generator',
    desc: 'Combine animation frames into a single sprite sheet. Set columns and spacing.',
    settings: () => `
      <div class="setting-group">
        <label>Columns</label>
        <input type="number" id="spriteColumns" min="1" max="16" value="4" />
      </div>
      <div class="setting-group">
        <label>Spacing (px)</label>
        <input type="number" id="spriteSpacing" min="0" max="64" value="2" />
      </div>
      <div class="setting-group">
        <label>Frame Size</label>
        <select id="spriteFrameSize">
          <option value="auto">Auto (from first frame)</option>
          <option value="16">16×16</option>
          <option value="32">32×32</option>
          <option value="48">48×48</option>
          <option value="64">64×64</option>
        </select>
      </div>
    `,
    multiUpload: true,
  },
  crt: {
    icon: '📺',
    title: 'CRT Effect',
    desc: "Make any image look like it's on an old CRT TV. Adjust each effect with live sliders.",
    settings: () => `
      <div class="setting-group">
        <label>Scanlines <span id="scanVal">60</span>%</label>
        <input type="range" id="crtScan" min="0" max="100" value="60"
          oninput="document.getElementById('scanVal').textContent=this.value" />
      </div>
      <div class="setting-group">
        <label>Phosphor Glow <span id="glowVal">40</span>%</label>
        <input type="range" id="crtGlow" min="0" max="100" value="40"
          oninput="document.getElementById('glowVal').textContent=this.value" />
      </div>
      <div class="setting-group">
        <label>Barrel / Pincushion <span id="barrelVal">0</span></label>
        <input type="range" id="crtBarrel" min="-100" max="100" value="0"
          oninput="document.getElementById('barrelVal').textContent=(this.value > 0 ? '+' : '') + this.value" />
        <div style="display:flex;justify-content:space-between;margin-top:2px;">
          <span style="font-family:var(--font-mono);font-size:9px;color:var(--text3)">◀ Pincushion</span>
          <span style="font-family:var(--font-mono);font-size:9px;color:var(--text3)">Barrel ▶</span>
        </div>
      </div>
      <div class="setting-group">
        <label>Chromatic Aberration <span id="chromaVal">30</span>%</label>
        <input type="range" id="crtChroma" min="0" max="100" value="30"
          oninput="document.getElementById('chromaVal').textContent=this.value" />
      </div>
      <div class="setting-group">
        <label>Vignette <span id="vigVal">50</span>%</label>
        <input type="range" id="crtVig" min="0" max="100" value="50"
          oninput="document.getElementById('vigVal').textContent=this.value" />
      </div>
      <div class="setting-group">
        <label>Brightness Flicker <span id="flickVal">20</span>%</label>
        <input type="range" id="crtFlick" min="0" max="100" value="20"
          oninput="document.getElementById('flickVal').textContent=this.value" />
      </div>
      <div class="setting-group">
        <label>Noise / Static <span id="noiseVal">20</span>%</label>
        <input type="range" id="crtNoise" min="0" max="100" value="20"
          oninput="document.getElementById('noiseVal').textContent=this.value" />
      </div>
      <div class="setting-group">
        <label>Scanline Style</label>
        <div class="preset-row">
          <button class="preset-btn active" data-scanstyle="horizontal" onclick="setCrtStyle(this)">Horizontal</button>
          <button class="preset-btn" data-scanstyle="rgb" onclick="setCrtStyle(this)">RGB Mask</button>
          <button class="preset-btn" data-scanstyle="both" onclick="setCrtStyle(this)">Both</button>
        </div>
      </div>
    `,
  },
  dither: {
    icon: '◈',
    title: 'Pixel Dithering Tool',
    desc: 'Apply classic dithering algorithms with retro palettes. Floyd-Steinberg, Bayer, and more.',
    settings: () => `
      <div class="setting-group">
        <label>Pixel Size</label>
        <div class="preset-row">
          ${[1,2,4,8,16,32,64].map(v => `<button class="preset-btn${v===1?' active':''}" data-dpx="${v}" onclick="setDitherPx(this)">${v}px</button>`).join('')}
        </div>
      </div>
      <div class="setting-group">
        <label>Algorithm</label>
        <select id="ditherAlgo">
          <option value="none">None (quantize only)</option>
          <option value="floyd" selected>Floyd-Steinberg</option>
          <option value="atkinson">Atkinson (Mac classic)</option>
          <option value="jjn">Jarvis-Judice-Ninke</option>
          <option value="stucki">Stucki</option>
          <option value="sierra">Sierra</option>
          <option value="sierra2">Sierra Two-Row</option>
          <option value="sierralite">Sierra Lite</option>
          <option value="noise">Noise / Random (Film grain)</option>
          <option value="bayer">Bayer 4×4</option>
          <option value="ordered">Ordered 8×8</option>
        </select>
      </div>
      <div class="setting-group">
        <label>Palette</label>
        <select id="ditherPalette">
          <optgroup label="── Classic Handhelds ──">
            <option value="gameboy">Game Boy (4 colors)</option>
            <option value="gbpocket">Game Boy Pocket (4 grey)</option>
            <option value="gbc">Game Boy Color (56 colors)</option>
          </optgroup>
          <optgroup label="── Home Computers ──">
            <option value="oldmac">Old Mac 1984 (2 colors)</option>
            <option value="spectrum">ZX Spectrum (15 colors)</option>
            <option value="c64">Commodore 64 (16 colors)</option>
            <option value="ega">EGA PC (16 colors)</option>
            <option value="cga">CGA PC (4 colors)</option>
            <option value="atari2600">Atari 2600 (16 colors)</option>
          </optgroup>
          <optgroup label="── Consoles ──">
            <option value="nes">NES (52 colors)</option>
            <option value="pico8">Pico-8 (16 colors)</option>
          </optgroup>
          <optgroup label="── Analog / Retro Media ──">
            <option value="oldtv">Old TV / NTSC (warm)</option>
            <option value="vcr">VCR / VHS (desaturated)</option>
            <option value="grayscale">Grayscale (8 shades)</option>
          </optgroup>
          <optgroup label="── Custom ──">
            <option value="custom">Custom (color limit)</option>
          </optgroup>
        </select>
      </div>
      <div class="setting-group" id="colorLimitGroup" style="display:none;">
        <label>Color Limit <span id="ditherColorLabel">8</span></label>
        <input type="range" id="ditherColors" min="2" max="32" value="8"
          oninput="document.getElementById('ditherColorLabel').textContent=this.value" />
      </div>
    `,
  },
};

// Dithering palettes
// Palettes flagged as monochromatic get grayscale-first treatment
const MONOCHROMATIC_PALETTES = new Set(['gameboy', 'grayscale', 'oldmac', 'gbpocket', 'cga']);

const PALETTES = {
  gameboy: [[15,56,15],[48,98,48],[139,172,15],[155,188,15]],
  nes: [
    [124,124,124],[0,0,252],[0,0,188],[68,40,188],[148,0,132],[168,0,32],[168,16,0],[136,20,0],
    [80,48,0],[0,120,0],[0,104,0],[0,88,0],[0,64,88],[0,0,0],[0,0,0],[0,0,0],
    [188,188,188],[0,120,248],[0,88,248],[104,68,252],[216,0,204],[228,0,88],[248,56,0],[228,92,16],
    [172,124,0],[0,184,0],[0,168,0],[0,168,68],[0,136,136],[0,0,0],[0,0,0],[0,0,0],
    [248,248,248],[60,188,252],[104,136,252],[152,120,248],[248,120,248],[248,88,152],[248,120,88],[252,160,68],
    [248,184,0],[184,248,24],[88,216,84],[88,248,152],[0,232,216],[120,120,120],[0,0,0],[0,0,0],
  ],
  grayscale: [[0,0,0],[36,36,36],[72,72,72],[109,109,109],[145,145,145],[182,182,182],[218,218,218],[255,255,255]],
  c64: [
    [0,0,0],[255,255,255],[136,0,0],[170,255,238],[204,68,204],[0,204,85],[0,0,170],[238,238,119],
    [221,136,85],[102,68,0],[255,119,119],[51,51,51],[119,119,119],[170,255,102],[0,136,255],[187,187,187],
  ],
  // Old Mac System 1-6 (1984) — pure 1-bit black & white
  oldmac: [[0,0,0],[255,255,255]],
  // Game Boy Pocket (1996) — 4 cool grey shades
  gbpocket: [[8,24,32],[52,104,86],[136,192,112],[224,248,208]],
  // Game Boy Color (1998) — 56 colors
  gbc: [
    [255,255,255],[255,255,170],[255,255,85],[255,170,0],[255,85,0],[255,0,0],
    [170,0,0],[85,0,0],[0,0,0],[0,85,0],[0,170,0],[0,255,0],
    [0,255,85],[0,255,170],[0,255,255],[0,170,255],[0,85,255],[0,0,255],
    [85,0,255],[170,0,255],[255,0,255],[255,0,170],[255,0,85],[170,85,0],
    [170,170,85],[170,255,85],[85,255,85],[85,255,170],[85,170,255],[85,85,255],
    [170,85,255],[255,85,255],[255,170,170],[255,255,170],[170,255,255],[85,170,170],
    [85,85,85],[170,170,170],[255,170,85],[170,85,85],[85,170,85],[85,85,170],
    [170,85,170],[255,85,170],[170,170,255],[255,170,255],[255,255,85],[170,255,170],
    [85,255,255],[170,170,0],[85,85,0],[0,85,85],[85,0,85],[0,170,85],[85,170,0],[170,0,85],
  ],
  // ZX Spectrum (1982) — 15 colors, ultra saturated
  spectrum: [
    [0,0,0],[0,0,215],[215,0,0],[215,0,215],
    [0,215,0],[0,215,215],[215,215,0],[215,215,215],
    [0,0,255],[255,0,0],[255,0,255],
    [0,255,0],[0,255,255],[255,255,0],[255,255,255],
  ],
  // Atari 2600 (1977) — 16 muted colors
  atari2600: [
    [0,0,0],[68,68,68],[136,136,136],[255,255,255],
    [255,0,0],[255,136,0],[255,255,0],[0,255,0],
    [0,255,255],[0,0,255],[136,0,255],[255,0,255],
    [136,68,0],[0,136,0],[0,68,136],[136,136,0],
  ],
  // CGA (1981) — Mode 4 palette 1: cyan/magenta/white
  cga: [[0,0,0],[85,255,255],[255,85,255],[255,255,255]],
  // EGA (1984) — 16 colors
  ega: [
    [0,0,0],[0,0,170],[0,170,0],[0,170,170],
    [170,0,0],[170,0,170],[170,85,0],[170,170,170],
    [85,85,85],[85,85,255],[85,255,85],[85,255,255],
    [255,85,85],[255,85,255],[255,255,85],[255,255,255],
  ],
  // Pico-8 (modern retro) — 16 toy colors
  pico8: [
    [0,0,0],[29,43,83],[126,37,83],[0,135,81],
    [171,82,54],[95,87,79],[194,195,199],[255,241,232],
    [255,0,77],[255,163,0],[255,236,39],[0,228,54],
    [41,173,255],[131,118,156],[255,119,168],[255,204,170],
  ],
  // Old TV / NTSC (1960s-80s) — warm, washed-out, slightly oversaturated
  oldtv: [
    [20,12,8],[60,30,15],[100,55,25],[150,90,40],
    [200,140,70],[240,200,120],[255,240,180],[255,255,220],
    [180,60,20],[220,100,40],[200,150,50],[100,160,60],
    [40,120,80],[30,80,140],[80,50,120],[160,80,100],
  ],
  // VCR / VHS (1980s-90s) — desaturated, warm bleed, low contrast
  vcr: [
    [15,10,18],[45,35,50],[80,65,75],[115,100,105],
    [150,135,135],[185,170,165],[215,205,195],[240,235,225],
    [120,60,55],[155,90,70],[180,130,85],[145,155,90],
    [70,120,100],[55,85,130],[100,70,120],[160,100,110],
  ],
};

// ============================================================
// UI NAVIGATION
// ============================================================
function showHome() {
  document.getElementById('home').classList.add('active');
  document.getElementById('toolPage').classList.remove('active');
  state.currentTool = null;
  // Close mobile nav
  document.getElementById('navLinks').classList.remove('open');
}

function openTool(toolKey) {
  const tool = TOOLS[toolKey];
  if (!tool) return;

  state.currentTool = toolKey;
  state.sourceImage = null;
  state.spriteFrames = [];

  document.getElementById('home').classList.remove('active');
  document.getElementById('toolPage').classList.add('active');

  // Populate sidebar
  document.getElementById('sidebarIcon').textContent = tool.icon;
  document.getElementById('sidebarTitle').textContent = tool.title;
  document.getElementById('sidebarDesc').textContent = tool.desc;
  document.getElementById('settingsPanel').innerHTML = tool.settings();

  // Upload zones
  const uploadZone = document.getElementById('uploadZone');
  const multiUploadZone = document.getElementById('multiUploadZone');
  if (tool.multiUpload) {
    uploadZone.classList.add('hidden');
    multiUploadZone.classList.remove('hidden');
  } else {
    uploadZone.classList.remove('hidden');
    multiUploadZone.classList.add('hidden');
  }

  // Reset UI
  document.getElementById('actionBar').style.display = 'none';
  document.getElementById('downloadBtn').style.display = 'none';
  document.getElementById('loading').style.display = 'none';
  document.getElementById('previewCanvas').style.display = 'none';
  document.getElementById('canvasEmpty').style.display = 'flex';
  document.getElementById('canvasToolbar').style.display = 'none';
  document.getElementById('paletteOutput').style.display = 'none';
  document.getElementById('spriteFrames').style.display = 'none';

  // Dither custom palette visibility
  if (toolKey === 'dither') {
    const paletteSelect = document.getElementById('ditherPalette');
    if (paletteSelect) {
      paletteSelect.addEventListener('change', () => {
        const g = document.getElementById('colorLimitGroup');
        if (g) g.style.display = paletteSelect.value === 'custom' ? 'flex' : 'none';
      });
    }
  }

  // Close mobile nav
  document.getElementById('navLinks').classList.remove('open');
  window.scrollTo(0,0);
}

// ============================================================
// UPLOAD HANDLING
// ============================================================
function initUploads() {
  const zone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  const multiZone = document.getElementById('multiUploadZone');
  const multiInput = document.getElementById('multiFileInput');

  // Single image upload — input is overlaid, handles its own click
  fileInput.addEventListener('change', e => {
    handleFile(e.target.files[0]);
    e.target.value = ''; // reset so same file can be re-uploaded
  });

  // Drag-and-drop single
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });

  // Multi upload (sprite sheet) — input is overlaid
  multiInput.addEventListener('change', e => {
    handleMultiFiles(e.target.files);
    e.target.value = '';
  });
  multiZone.addEventListener('dragover', e => { e.preventDefault(); multiZone.classList.add('drag-over'); });
  multiZone.addEventListener('dragleave', () => multiZone.classList.remove('drag-over'));
  multiZone.addEventListener('drop', e => {
    e.preventDefault();
    multiZone.classList.remove('drag-over');
    handleMultiFiles(e.dataTransfer.files);
  });

  // Process + download
  document.getElementById('processBtn').addEventListener('click', processCurrentTool);
  document.getElementById('downloadBtn').addEventListener('click', downloadResult);
}

function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      state.sourceImage = img;
      showImagePreview(img);
      document.getElementById('actionBar').style.display = 'flex';
      document.getElementById('downloadBtn').style.display = 'none';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function handleMultiFiles(files) {
  const fileArr = Array.from(files).filter(f => f.type.startsWith('image/'));
  if (!fileArr.length) return;

  const promises = fileArr.map(f => new Promise(res => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => res(img);
      img.src = e.target.result;
    };
    reader.readAsDataURL(f);
  }));

  Promise.all(promises).then(images => {
    state.spriteFrames = images;
    renderFramePreviews();
    document.getElementById('actionBar').style.display = 'flex';
  });
}

function showImagePreview(img) {
  const canvas = document.getElementById('previewCanvas');
  const ctx = canvas.getContext('2d');
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);
  canvas.style.display = 'block';
  document.getElementById('canvasEmpty').style.display = 'none';
  document.getElementById('canvasToolbar').style.display = 'flex';
  document.getElementById('canvasInfo').textContent = `${img.width} × ${img.height}px`;
}

// ============================================================
// PROCESS DISPATCHER
// ============================================================
function processCurrentTool() {
  const tool = state.currentTool;
  if (!tool) return;

  // Batch mode for upscaler
  if (tool === 'upscaler' && upscaleMode === 'batch') {
    if (!state.batchFiles.length) return alert('Please upload images first.');
    runBatchUpscaler();
    return;
  }

  if (tool === 'sprite') {
    if (state.spriteFrames.length < 1) return alert('Please upload at least one frame.');
  } else {
    if (!state.sourceImage) return alert('Please upload an image first.');
  }

  showLoading(true);

  // Use setTimeout to let the UI update before heavy processing
  setTimeout(() => {
    try {
      switch(tool) {
        case 'upscaler':  runUpscaler(); break;
        case 'svg':       runSVGConverter(); break;
        case 'pixelate':  runPixelate(); break;
        case 'palette':   runPaletteExtractor(); break;
        case 'grid':      runGridOverlay(); break;
        case 'sprite':    runSpriteSheet(); break;
        case 'dither':    runDithering(); break;
        case 'crt':       runCRT(); break;
      }
    } catch(err) {
      console.error(err);
      alert('Processing error: ' + err.message);
    } finally {
      showLoading(false);
    }
  }, 50);
}

function showLoading(show) {
  document.getElementById('loading').style.display = show ? 'block' : 'none';
  document.getElementById('processBtn').disabled = show;
}

// ============================================================
// TOOL 1: PIXEL ART UPSCALER
// ============================================================
let currentScale = 2;
function setScale(btn) {
  currentScale = parseInt(btn.dataset.scale);
  document.querySelectorAll('[data-scale]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const ci = document.getElementById('customScale');
  if (ci) ci.value = currentScale;
}
function syncCustomScale(input) {
  currentScale = Math.max(1, Math.min(20, parseInt(input.value) || 2));
  document.querySelectorAll('[data-scale]').forEach(b => b.classList.remove('active'));
}

function runUpscaler() {
  const img = state.sourceImage;
  const scale = currentScale;
  const w = img.width * scale;
  const h = img.height * scale;

  // Safety check
  if (w * h > 16000000) {
    alert(`Output would be ${w}×${h}px (${(w*h/1e6).toFixed(1)}MP). Try a smaller scale.`);
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Nearest-neighbor via imageSmoothingEnabled = false
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, w, h);

  displayOutputCanvas(canvas, `${w} × ${h}px (${scale}x upscaled)`);
}

// ============================================================
// TOOL 2: PIXEL ART → SVG
// ============================================================
let svgOptimize = true;
function setSvgOpt(on) {
  svgOptimize = on;
  document.getElementById('svgOptOn').classList.toggle('active', on);
  document.getElementById('svgOptOff').classList.toggle('active', !on);
}

function runSVGConverter() {
  const img = state.sourceImage;
  const maxSize = parseInt(document.getElementById('svgMaxSize').value) || 64;

  // Scale down to maxSize if needed
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  // Get pixel data
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = w; tmpCanvas.height = h;
  const tmpCtx = tmpCanvas.getContext('2d');
  tmpCtx.imageSmoothingEnabled = false;
  tmpCtx.drawImage(img, 0, 0, w, h);
  const { data } = tmpCtx.getImageData(0, 0, w, h);

  // Build pixel grid
  const pixels = [];
  for (let y = 0; y < h; y++) {
    pixels[y] = [];
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const a = data[idx + 3];
      if (a === 0) { pixels[y][x] = null; continue; }
      pixels[y][x] = rgbToHex(data[idx], data[idx+1], data[idx+2]);
    }
  }

  // Generate SVG rects (with run-length encoding optimization on rows)
  let rects = '';
  if (svgOptimize) {
    // Merge horizontally contiguous same-color pixels
    for (let y = 0; y < h; y++) {
      let x = 0;
      while (x < w) {
        const color = pixels[y][x];
        if (color === null) { x++; continue; }
        let runLen = 1;
        while (x + runLen < w && pixels[y][x + runLen] === color) runLen++;
        rects += `<rect x="${x}" y="${y}" width="${runLen}" height="1" fill="${color}"/>`;
        x += runLen;
      }
    }
  } else {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (pixels[y][x] === null) continue;
        rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${pixels[y][x]}"/>`;
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${rects}</svg>`;

  // Store for download
  state.svgData = svg;
  state.outputType = 'svg';

  // Show preview rasterized
  const previewScale = Math.max(1, Math.min(8, Math.floor(400 / Math.max(w, h))));
  const outCanvas = document.createElement('canvas');
  outCanvas.width = w * previewScale; outCanvas.height = h * previewScale;
  const octx = outCanvas.getContext('2d');
  octx.imageSmoothingEnabled = false;
  octx.drawImage(tmpCanvas, 0, 0, w * previewScale, h * previewScale);
  displayOutputCanvas(outCanvas, `${w}×${h}px → SVG (${rects.split('<rect').length - 1} rects)`);

  document.getElementById('downloadBtn').textContent = '⬇ Download SVG';
  document.getElementById('downloadBtn').style.display = 'block';
}

// ============================================================
// TOOL 3: IMAGE → PIXEL ART
// ============================================================
let currentPixelSize = 16;
function setPixelSize(btn) {
  currentPixelSize = parseInt(btn.dataset.px);
  document.querySelectorAll('[data-px]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function runPixelate() {
  const img = state.sourceImage;
  const px = currentPixelSize;
  const colorCount = parseInt(document.getElementById('colorCount').value) || 16;

  // Step 1: Downscale
  const smallW = Math.max(1, Math.round(img.width / px));
  const smallH = Math.max(1, Math.round(img.height / px));

  const smallCanvas = document.createElement('canvas');
  smallCanvas.width = smallW; smallCanvas.height = smallH;
  const sCtx = smallCanvas.getContext('2d');
  sCtx.imageSmoothingEnabled = true;
  sCtx.drawImage(img, 0, 0, smallW, smallH);

  // Step 2: Quantize colors
  const imgData = sCtx.getImageData(0, 0, smallW, smallH);
  quantizeImageData(imgData, colorCount);
  sCtx.putImageData(imgData, 0, 0);

  // Step 3: Upscale nearest-neighbor
  const outCanvas = document.createElement('canvas');
  outCanvas.width = img.width; outCanvas.height = img.height;
  const oCtx = outCanvas.getContext('2d');
  oCtx.imageSmoothingEnabled = false;
  oCtx.drawImage(smallCanvas, 0, 0, img.width, img.height);

  displayOutputCanvas(outCanvas, `Pixelated ${px}px blocks · ${colorCount} colors`);
}

// Simple median-cut color quantization
function quantizeImageData(imgData, numColors) {
  const data = imgData.data;
  const pixels = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i+3] > 128) pixels.push([data[i], data[i+1], data[i+2]]);
  }
  const palette = medianCut(pixels, numColors);

  // Map each pixel to nearest palette color
  for (let i = 0; i < data.length; i += 4) {
    if (data[i+3] < 128) continue;
    const nearest = findNearest(palette, data[i], data[i+1], data[i+2]);
    data[i] = nearest[0]; data[i+1] = nearest[1]; data[i+2] = nearest[2];
  }
}

function medianCut(pixels, numColors) {
  if (pixels.length === 0) return [[0,0,0]];
  let buckets = [pixels];
  while (buckets.length < numColors) {
    const largest = buckets.reduce((a, b) => a.length > b.length ? a : b);
    if (largest.length < 2) break;
    const idx = buckets.indexOf(largest);
    const split = splitBucket(largest);
    buckets.splice(idx, 1, ...split);
  }
  return buckets.map(b => {
    const avg = b.reduce((a, p) => [a[0]+p[0], a[1]+p[1], a[2]+p[2]], [0,0,0]);
    return [Math.round(avg[0]/b.length), Math.round(avg[1]/b.length), Math.round(avg[2]/b.length)];
  });
}

function splitBucket(pixels) {
  // Find channel with largest range
  let rMin=255,rMax=0,gMin=255,gMax=0,bMin=255,bMax=0;
  for (const [r,g,b] of pixels) {
    if(r<rMin)rMin=r; if(r>rMax)rMax=r;
    if(g<gMin)gMin=g; if(g>gMax)gMax=g;
    if(b<bMin)bMin=b; if(b>bMax)bMax=b;
  }
  const rRange = rMax-rMin, gRange = gMax-gMin, bRange = bMax-bMin;
  const ch = rRange >= gRange && rRange >= bRange ? 0 : gRange >= bRange ? 1 : 2;
  const sorted = [...pixels].sort((a,b) => a[ch]-b[ch]);
  const mid = Math.floor(sorted.length / 2);
  return [sorted.slice(0, mid), sorted.slice(mid)];
}

function findNearest(palette, r, g, b) {
  let best = palette[0], bestDist = Infinity;
  for (const p of palette) {
    const d = (p[0]-r)**2 + (p[1]-g)**2 + (p[2]-b)**2;
    if (d < bestDist) { bestDist = d; best = p; }
  }
  return best;
}

// ============================================================
// TOOL 4: COLOR PALETTE EXTRACTOR
// ============================================================
let paletteColorCount = 16;
function setPaletteCount(btn) {
  paletteColorCount = parseInt(btn.dataset.colors);
  document.querySelectorAll('[data-colors]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function runPaletteExtractor() {
  const img = state.sourceImage;
  const count = paletteColorCount;

  // Downscale for speed
  const maxDim = 200;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = w; tmpCanvas.height = h;
  const ctx = tmpCanvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);

  const { data } = ctx.getImageData(0, 0, w, h);
  const pixels = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i+3] > 128) pixels.push([data[i], data[i+1], data[i+2]]);
  }

  const palette = medianCut(pixels, count);
  state.paletteColors = palette;

  // Render palette UI
  const paletteOut = document.getElementById('paletteOutput');
  paletteOut.style.display = 'block';
  document.getElementById('previewCanvas').style.display = 'none';

  const swatchHtml = palette.map(color => {
    const hex = rgbToHex(...color);
    return `
      <div class="swatch" onclick="copySwatch('${hex}')" title="Click to copy ${hex}">
        <div class="swatch-color" style="background:${hex}"></div>
        <div class="swatch-hex">${hex}</div>
      </div>
    `;
  }).join('');

  paletteOut.innerHTML = `
    <h3>${palette.length} Dominant Colors — Click to Copy HEX</h3>
    <div class="palette-swatches">${swatchHtml}</div>
    <button class="btn-download" onclick="downloadPaletteImage()" style="display:inline-flex;margin-top:8px;">⬇ Download Palette PNG</button>
  `;

  document.getElementById('canvasToolbar').style.display = 'flex';
  document.getElementById('canvasInfo').textContent = `${palette.length} colors extracted`;
  document.getElementById('downloadBtn').style.display = 'none';
}

function copySwatch(hex) {
  navigator.clipboard.writeText(hex).catch(() => {});
  showToast(`Copied ${hex}`);
}

function downloadPaletteImage() {
  const palette = state.paletteColors;
  if (!palette.length) return;
  const sw = 80, sh = 80, padding = 8;
  const cols = Math.min(palette.length, 8);
  const rows = Math.ceil(palette.length / cols);
  const w = cols * (sw + padding) + padding;
  const h = rows * (sh + padding + 18) + padding + 32;

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fff';
  ctx.font = '12px monospace';
  ctx.fillText('PixelTools Palette — FOWLSIGNS™', padding, 20);

  palette.forEach((color, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = padding + col * (sw + padding);
    const y = 32 + padding + row * (sh + padding + 18);
    ctx.fillStyle = rgbToHex(...color);
    ctx.fillRect(x, y, sw, sh);
    ctx.fillStyle = '#aaa';
    ctx.font = '10px monospace';
    ctx.fillText(rgbToHex(...color), x, y + sh + 12);
  });

  downloadCanvas(canvas, 'palette.png');
}

// ============================================================
// TOOL 5: PIXEL GRID OVERLAY
// ============================================================
let gridSize = 16;
function setGridSize(btn) {
  gridSize = parseInt(btn.dataset.grid);
  document.querySelectorAll('[data-grid]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function runGridOverlay() {
  const img = state.sourceImage;
  const gs = gridSize;
  const gridColor = document.getElementById('gridColor').value;
  const opacity = (parseInt(document.getElementById('gridOpacity').value) || 50) / 100;

  const canvas = document.createElement('canvas');
  canvas.width = img.width; canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  // Draw grid lines
  const hex = gridColor;
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);

  ctx.strokeStyle = `rgba(${r},${g},${b},${opacity})`;
  ctx.lineWidth = 1;

  for (let x = 0; x <= img.width; x += gs) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, img.height);
    ctx.stroke();
  }
  for (let y = 0; y <= img.height; y += gs) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(img.width, y + 0.5);
    ctx.stroke();
  }

  displayOutputCanvas(canvas, `${gs}px grid overlay`);
}

// ============================================================
// TOOL 6: SPRITE SHEET GENERATOR
// ============================================================
function renderFramePreviews() {
  const container = document.getElementById('spriteFrames');
  container.style.display = 'block';
  document.getElementById('canvasEmpty').style.display = 'none';
  document.getElementById('canvasToolbar').style.display = 'flex';
  document.getElementById('canvasInfo').textContent = `${state.spriteFrames.length} frames loaded`;

  const grid = document.createElement('div');
  grid.className = 'frames-grid';

  state.spriteFrames.forEach((img, i) => {
    const el = document.createElement('div');
    el.className = 'frame-thumb';
    const imgEl = document.createElement('img');
    imgEl.src = img.src;
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-frame';
    removeBtn.textContent = '✕';
    removeBtn.onclick = () => {
      state.spriteFrames.splice(i, 1);
      renderFramePreviews();
    };
    const num = document.createElement('div');
    num.className = 'frame-num';
    num.textContent = `#${i+1}`;
    el.appendChild(imgEl);
    el.appendChild(removeBtn);
    el.appendChild(num);
    grid.appendChild(el);
  });

  container.innerHTML = '';
  const h3 = document.createElement('h3');
  h3.textContent = `${state.spriteFrames.length} Frames — Click × to remove`;
  container.appendChild(h3);
  container.appendChild(grid);
}

function runSpriteSheet() {
  const frames = state.spriteFrames;
  if (!frames.length) return;

  const cols = Math.max(1, parseInt(document.getElementById('spriteColumns').value) || 4);
  const spacing = Math.max(0, parseInt(document.getElementById('spriteSpacing').value) || 0);
  const frameSizeInput = document.getElementById('spriteFrameSize').value;

  let fw, fh;
  if (frameSizeInput === 'auto') {
    fw = frames[0].width;
    fh = frames[0].height;
  } else {
    fw = fh = parseInt(frameSizeInput);
  }

  const rows = Math.ceil(frames.length / cols);
  const sheetW = cols * fw + (cols - 1) * spacing;
  const sheetH = rows * fh + (rows - 1) * spacing;

  const canvas = document.createElement('canvas');
  canvas.width = sheetW; canvas.height = sheetH;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  frames.forEach((img, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * (fw + spacing);
    const y = row * (fh + spacing);
    ctx.drawImage(img, x, y, fw, fh);
  });

  document.getElementById('spriteFrames').style.display = 'none';
  displayOutputCanvas(canvas, `${sheetW}×${sheetH}px · ${frames.length} frames · ${cols} cols`);
}

// ============================================================
// TOOL 7: PIXEL DITHERING
// ============================================================
let ditherPixelSize = 1;
function setDitherPx(btn) {
  ditherPixelSize = parseInt(btn.dataset.dpx);
  document.querySelectorAll('[data-dpx]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function runDithering() {
  const img = state.sourceImage;
  const px = ditherPixelSize;
  const algo = document.getElementById('ditherAlgo').value;
  const paletteName = document.getElementById('ditherPalette').value;
  const isMono = MONOCHROMATIC_PALETTES.has(paletteName);

  // Determine palette
  let palette;
  if (paletteName === 'custom') {
    const colorLimit = parseInt(document.getElementById('ditherColors').value) || 8;
    const tmpC = document.createElement('canvas');
    const maxDim = 128;
    const sc = Math.min(1, maxDim / Math.max(img.width, img.height));
    tmpC.width = Math.max(1, Math.round(img.width * sc));
    tmpC.height = Math.max(1, Math.round(img.height * sc));
    const tCtx2 = tmpC.getContext('2d');
    tCtx2.drawImage(img, 0, 0, tmpC.width, tmpC.height);
    const { data: d2 } = tCtx2.getImageData(0, 0, tmpC.width, tmpC.height);
    const pixels2 = [];
    for (let i = 0; i < d2.length; i += 4) {
      if (d2[i+3] > 128) pixels2.push([d2[i], d2[i+1], d2[i+2]]);
    }
    palette = medianCut(pixels2, colorLimit);
  } else {
    palette = PALETTES[paletteName] || PALETTES.gameboy;
  }

  // Downscale if px > 1
  const w = Math.max(1, Math.round(img.width / px));
  const h = Math.max(1, Math.round(img.height / px));

  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = w; tmpCanvas.height = h;
  const tCtx = tmpCanvas.getContext('2d');
  tCtx.imageSmoothingEnabled = true;
  tCtx.drawImage(img, 0, 0, w, h);

  const imgData = tCtx.getImageData(0, 0, w, h);

  // --- STEP 1: Grayscale for monochromatic palettes ---
  // Converts to luminance so dark areas -> dark palette color,
  // bright areas -> light palette color, regardless of hue.
  if (isMono) {
    convertToGrayscale(imgData);
  }

  // --- STEP 2: Auto-normalize brightness range ---
  // Stretches the tonal range of the image to fully span the
  // palette's luminance range — avoids clustering in mid-tones.
  normalizeLevels(imgData, palette);

  // --- STEP 3: Apply dithering algorithm ---
  switch (algo) {
    case 'floyd':      floydSteinberg(imgData, palette); break;
    case 'atkinson':   atkinsonDither(imgData, palette); break;
    case 'jjn':        errorDiffusion(imgData, palette, 'jjn'); break;
    case 'stucki':     errorDiffusion(imgData, palette, 'stucki'); break;
    case 'sierra':     errorDiffusion(imgData, palette, 'sierra'); break;
    case 'sierra2':    errorDiffusion(imgData, palette, 'sierra2'); break;
    case 'sierralite': errorDiffusion(imgData, palette, 'sierralite'); break;
    case 'noise':      noiseDither(imgData, palette); break;
    case 'bayer':      bayerDither(imgData, palette, 4); break;
    case 'ordered':    bayerDither(imgData, palette, 8); break;
    default:           quantizeOnly(imgData, palette); break;
  }

  tCtx.putImageData(imgData, 0, 0);

  // Upscale back
  const outCanvas = document.createElement('canvas');
  outCanvas.width = img.width; outCanvas.height = img.height;
  const oCtx = outCanvas.getContext('2d');
  oCtx.imageSmoothingEnabled = false;
  oCtx.drawImage(tmpCanvas, 0, 0, img.width, img.height);

  displayOutputCanvas(outCanvas, `${algo} · ${paletteName} · ${palette.length} colors · ${px}px`);
}

// ============================================================
// GRAYSCALE CONVERSION
// Converts every pixel to its luminance value (ITU-R BT.601)
// ============================================================
function convertToGrayscale(imgData) {
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i+3] < 128) continue;
    // Weighted luminance — matches human eye sensitivity
    const lum = Math.round(data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114);
    data[i] = data[i+1] = data[i+2] = lum;
  }
}

// ============================================================
// AUTO NORMALIZE LEVELS
// Stretches the image's tonal range to match the palette's
// min/max luminance, so all palette shades get used.
// ============================================================
function normalizeLevels(imgData, palette) {
  const data = imgData.data;

  // Find image min/max luminance
  let imgMin = 255, imgMax = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i+3] < 128) continue;
    const lum = data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114;
    if (lum < imgMin) imgMin = lum;
    if (lum > imgMax) imgMax = lum;
  }
  const imgRange = imgMax - imgMin;
  if (imgRange < 1) return; // flat image, nothing to normalize

  // Find palette min/max luminance
  let palMin = 255, palMax = 0;
  for (const [r, g, b] of palette) {
    const lum = r * 0.299 + g * 0.587 + b * 0.114;
    if (lum < palMin) palMin = lum;
    if (lum > palMax) palMax = lum;
  }
  const palRange = palMax - palMin;
  if (palRange < 1) return;

  // Remap each pixel's luminance into the palette's range
  // while preserving hue and saturation
  for (let i = 0; i < data.length; i += 4) {
    if (data[i+3] < 128) continue;
    const r = data[i], g = data[i+1], b = data[i+2];
    const lum = r * 0.299 + g * 0.587 + b * 0.114;

    // Where does this pixel sit in the image's tonal range? (0–1)
    const t = (lum - imgMin) / imgRange;

    // Map to palette's tonal range
    const newLum = palMin + t * palRange;
    const scale = lum > 0 ? newLum / lum : 1;

    data[i]   = Math.max(0, Math.min(255, Math.round(r * scale)));
    data[i+1] = Math.max(0, Math.min(255, Math.round(g * scale)));
    data[i+2] = Math.max(0, Math.min(255, Math.round(b * scale)));
  }
}

function quantizeOnly(imgData, palette) {
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i+3] < 128) continue;
    const c = findNearest(palette, data[i], data[i+1], data[i+2]);
    data[i] = c[0]; data[i+1] = c[1]; data[i+2] = c[2];
  }
}

function floydSteinberg(imgData, palette) {
  const { data, width: w, height: h } = imgData;
  const buf = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) buf[i] = data[i];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (buf[idx+3] < 128) continue;

      const oldR = Math.max(0, Math.min(255, buf[idx]));
      const oldG = Math.max(0, Math.min(255, buf[idx+1]));
      const oldB = Math.max(0, Math.min(255, buf[idx+2]));

      const [newR, newG, newB] = findNearest(palette, oldR, oldG, oldB);

      data[idx] = newR; data[idx+1] = newG; data[idx+2] = newB; data[idx+3] = 255;

      const eR = oldR - newR, eG = oldG - newG, eB = oldB - newB;

      function spread(dx, dy, factor) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) return;
        const ni = (ny * w + nx) * 4;
        buf[ni]   += eR * factor;
        buf[ni+1] += eG * factor;
        buf[ni+2] += eB * factor;
      }

      spread(1, 0, 7/16);
      spread(-1, 1, 3/16);
      spread(0, 1, 5/16);
      spread(1, 1, 1/16);
    }
  }
}

// ============================================================
// ATKINSON DITHERING — Apple Mac classic (1984)
// Spreads only 3/4 of error, preserving highlights/shadows
// ============================================================
function atkinsonDither(imgData, palette) {
  const { data, width: w, height: h } = imgData;
  const buf = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) buf[i] = data[i];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (buf[idx+3] < 128) continue;

      const oldR = Math.max(0, Math.min(255, buf[idx]));
      const oldG = Math.max(0, Math.min(255, buf[idx+1]));
      const oldB = Math.max(0, Math.min(255, buf[idx+2]));

      const [newR, newG, newB] = findNearest(palette, oldR, oldG, oldB);
      data[idx] = newR; data[idx+1] = newG; data[idx+2] = newB; data[idx+3] = 255;

      // Atkinson spreads 1/8 of error to 6 neighbors (total 6/8 = 3/4)
      const eR = (oldR - newR) / 8;
      const eG = (oldG - newG) / 8;
      const eB = (oldB - newB) / 8;

      const neighbors = [[1,0],[2,0],[-1,1],[0,1],[1,1],[0,2]];
      for (const [dx, dy] of neighbors) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const ni = (ny * w + nx) * 4;
        buf[ni]   += eR;
        buf[ni+1] += eG;
        buf[ni+2] += eB;
      }
    }
  }
}

// ============================================================
// GENERIC ERROR DIFFUSION — JJN, Stucki, Sierra variants
// ============================================================
const ERROR_KERNELS = {
  // Jarvis, Judice & Ninke (1976) — wide, smooth spread
  jjn: {
    divisor: 48,
    offsets: [
      [1,0,7],[2,0,5],
      [-2,1,3],[-1,1,5],[0,1,7],[1,1,5],[2,1,3],
      [-2,2,1],[-1,2,3],[0,2,5],[1,2,3],[2,2,1],
    ]
  },
  // Stucki (1981) — similar to JJN, slightly sharper
  stucki: {
    divisor: 42,
    offsets: [
      [1,0,8],[2,0,4],
      [-2,1,2],[-1,1,4],[0,1,8],[1,1,4],[2,1,2],
      [-2,2,1],[-1,2,2],[0,2,4],[1,2,2],[2,2,1],
    ]
  },
  // Sierra (1989) — smooth, 3 rows
  sierra: {
    divisor: 32,
    offsets: [
      [1,0,5],[2,0,3],
      [-2,1,2],[-1,1,4],[0,1,5],[1,1,4],[2,1,2],
      [-1,2,2],[0,2,3],[1,2,2],
    ]
  },
  // Sierra Two-Row — faster, 2 rows
  sierra2: {
    divisor: 16,
    offsets: [
      [1,0,4],[2,0,3],
      [-2,1,1],[-1,1,2],[0,1,3],[1,1,2],[2,1,1],
    ]
  },
  // Sierra Lite — fastest Sierra, minimal spread
  sierralite: {
    divisor: 4,
    offsets: [
      [1,0,2],
      [-1,1,1],[0,1,1],
    ]
  },
};

function errorDiffusion(imgData, palette, kernelName) {
  const kernel = ERROR_KERNELS[kernelName];
  if (!kernel) return quantizeOnly(imgData, palette);

  const { data, width: w, height: h } = imgData;
  const buf = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) buf[i] = data[i];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (buf[idx+3] < 128) continue;

      const oldR = Math.max(0, Math.min(255, buf[idx]));
      const oldG = Math.max(0, Math.min(255, buf[idx+1]));
      const oldB = Math.max(0, Math.min(255, buf[idx+2]));

      const [newR, newG, newB] = findNearest(palette, oldR, oldG, oldB);
      data[idx] = newR; data[idx+1] = newG; data[idx+2] = newB; data[idx+3] = 255;

      const eR = oldR - newR, eG = oldG - newG, eB = oldB - newB;

      for (const [dx, dy, weight] of kernel.offsets) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const ni = (ny * w + nx) * 4;
        buf[ni]   += eR * weight / kernel.divisor;
        buf[ni+1] += eG * weight / kernel.divisor;
        buf[ni+2] += eB * weight / kernel.divisor;
      }
    }
  }
}

// ============================================================
// NOISE / RANDOM DITHERING — Film grain aesthetic
// ============================================================
function noiseDither(imgData, palette) {
  const { data, width: w, height: h } = imgData;
  const strength = 60; // noise intensity

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (data[idx+3] < 128) continue;
      const noise = (Math.random() - 0.5) * strength;
      const r = Math.max(0, Math.min(255, data[idx]   + noise));
      const g = Math.max(0, Math.min(255, data[idx+1] + noise));
      const b = Math.max(0, Math.min(255, data[idx+2] + noise));
      const c = findNearest(palette, r, g, b);
      data[idx] = c[0]; data[idx+1] = c[1]; data[idx+2] = c[2];
    }
  }
}

// Bayer matrix dithering
function bayerDither(imgData, palette, size) {
  const { data, width: w, height: h } = imgData;

  const bayer4 = [
    [ 0,  8,  2, 10],
    [12,  4, 14,  6],
    [ 3, 11,  1,  9],
    [15,  7, 13,  5],
  ];
  const bayer8 = [
    [ 0,32, 8,40, 2,34,10,42],
    [48,16,56,24,50,18,58,26],
    [12,44, 4,36,14,46, 6,38],
    [60,28,52,20,62,30,54,22],
    [ 3,35,11,43, 1,33, 9,41],
    [51,19,59,27,49,17,57,25],
    [15,47, 7,39,13,45, 5,37],
    [63,31,55,23,61,29,53,21],
  ];
  const matrix = size === 4 ? bayer4 : bayer8;
  const mSize = size;
  const mMax = size === 4 ? 16 : 64;
  const strength = 50;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (data[idx+3] < 128) continue;
      const threshold = (matrix[y % mSize][x % mSize] / mMax - 0.5) * strength;
      const r = Math.max(0, Math.min(255, data[idx] + threshold));
      const g = Math.max(0, Math.min(255, data[idx+1] + threshold));
      const b = Math.max(0, Math.min(255, data[idx+2] + threshold));
      const c = findNearest(palette, r, g, b);
      data[idx] = c[0]; data[idx+1] = c[1]; data[idx+2] = c[2];
    }
  }
}

// ============================================================
// OUTPUT & DOWNLOAD
// ============================================================
function displayOutputCanvas(canvas, info) {
  const preview = document.getElementById('previewCanvas');
  const ctx = preview.getContext('2d');
  preview.width = canvas.width;
  preview.height = canvas.height;
  ctx.drawImage(canvas, 0, 0);
  preview.style.display = 'block';
  document.getElementById('canvasEmpty').style.display = 'none';
  document.getElementById('canvasToolbar').style.display = 'flex';
  document.getElementById('canvasInfo').textContent = info || `${canvas.width} × ${canvas.height}px`;
  document.getElementById('downloadBtn').style.display = 'block';
  document.getElementById('downloadBtn').textContent = '⬇ Download PNG';

  // Store output canvas for download
  state.outputCanvas = canvas;
  state.outputType = state.outputType || 'png';
}

function downloadResult() {
  if (state.outputType === 'svg' && state.svgData) {
    const blob = new Blob([state.svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pixeltools-${state.currentTool}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    state.outputType = null;
    return;
  }
  if (state.outputCanvas) {
    downloadCanvas(state.outputCanvas, `pixeltools-${state.currentTool}.png`);
  }
}

function downloadCanvas(canvas, filename) {
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

// ============================================================
// UTILITIES
// ============================================================
function rgbToHex(r, g, b) {
  return '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
}

function showToast(msg) {
  let toast = document.getElementById('copyToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'copyToast';
    toast.className = 'copy-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

// ============================================================
// DARK MODE TOGGLE
// ============================================================
function initDarkMode() {
  const btn = document.getElementById('darkToggle');
  const body = document.body;

  const saved = localStorage.getItem('pt-theme') || 'dark';
  if (saved === 'light') {
    body.classList.remove('dark-mode');
    body.classList.add('light-mode');
    btn.querySelector('.toggle-icon').textContent = '🌙';
  }

  btn.addEventListener('click', () => {
    const isLight = body.classList.contains('light-mode');
    body.classList.toggle('dark-mode', isLight);
    body.classList.toggle('light-mode', !isLight);
    btn.querySelector('.toggle-icon').textContent = isLight ? '☀️' : '🌙';
    localStorage.setItem('pt-theme', isLight ? 'dark' : 'light');
  });
}

// ============================================================
// HAMBURGER MENU
// ============================================================
function initHamburger() {
  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('navLinks').classList.toggle('open');
  });
}

// ============================================================
// HERO CANVAS ANIMATION
// ============================================================
function initHeroCanvas() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const CELL = 16;
  const cols = W / CELL, rows = H / CELL;

  // Generate a random pixel art pattern inspired by the FOWLSIGNS glyph
  const art = [];
  for (let y = 0; y < rows; y++) {
    art[y] = [];
    for (let x = 0; x < cols; x++) {
      art[y][x] = Math.random() < 0.3 ? randomPixelColor() : null;
    }
  }

  // Draw a simple "eye" shape in the center as homage to the glyph
  const cx = Math.floor(cols/2), cy = Math.floor(rows/2);
  const eyeW = 8, eyeH = 5;
  for (let dy = -Math.floor(eyeH/2); dy <= Math.floor(eyeH/2); dy++) {
    for (let dx = -Math.floor(eyeW/2); dx <= Math.floor(eyeW/2); dx++) {
      const inEllipse = (dx*dx)/(eyeW*eyeW/4) + (dy*dy)/(eyeH*eyeH/4) <= 1;
      if (inEllipse) {
        const inPupil = (dx*dx)/(eyeW*eyeW/16) + (dy*dy)/(eyeH*eyeH/16) <= 1;
        art[cy+dy][cx+dx] = inPupil ? '#1E1A16' : '#C1121F';
      }
    }
  }

  let tick = 0;
  function drawFrame() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, W, H);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (!art[y][x]) continue;
        const pulse = 0.7 + 0.3 * Math.sin(tick * 0.02 + x * 0.3 + y * 0.4);
        ctx.globalAlpha = pulse;
        ctx.fillStyle = art[y][x];
        ctx.fillRect(x * CELL, y * CELL, CELL - 1, CELL - 1);
      }
    }
    ctx.globalAlpha = 1;
    tick++;
    requestAnimationFrame(drawFrame);
  }
  drawFrame();
}

function randomPixelColor() {
  const colors = ['#C1121F','#E63946','#EDE0C8','#2A2420','#52453A','#1E1A16'];
  return colors[Math.floor(Math.random() * colors.length)];
}


// ============================================================
// BATCH UPSCALER
// ============================================================

let upscaleMode = 'single'; // 'single' | 'batch'

function setUpscaleMode(mode) {
  upscaleMode = mode;
  document.getElementById('modeSingle').classList.toggle('active', mode === 'single');
  document.getElementById('modeBatch').classList.toggle('active', mode === 'batch');

  const singleZone  = document.getElementById('uploadZone');
  const batchZone   = document.getElementById('batchUploadZone');
  const batchPanel  = document.getElementById('batchPanel');
  const canvasEmpty = document.getElementById('canvasEmpty');
  const previewCvs  = document.getElementById('previewCanvas');
  const actionBar   = document.getElementById('actionBar');

  if (mode === 'batch') {
    singleZone.classList.add('hidden');
    batchZone.classList.remove('hidden');
    batchPanel.style.display = 'flex';
    canvasEmpty.style.display = 'none';
    previewCvs.style.display = 'none';
    actionBar.style.display = 'none';
    // Clear previous batch
    state.batchFiles = [];
    state.batchResults = [];
    document.getElementById('batchList').innerHTML = '';
    document.getElementById('batchCount').textContent = '';
    document.getElementById('batchStatusText').textContent = 'Drop images to start';
    document.getElementById('batchActions').style.display = 'none';
  } else {
    singleZone.classList.remove('hidden');
    batchZone.classList.add('hidden');
    batchPanel.style.display = 'none';
    canvasEmpty.style.display = 'flex';
  }
}

function initBatchUpload() {
  const zone  = document.getElementById('batchUploadZone');
  const input = document.getElementById('batchFileInput');

  input.addEventListener('change', e => {
    loadBatchFiles(e.target.files);
    e.target.value = '';
  });
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    loadBatchFiles(e.dataTransfer.files);
  });
}

function loadBatchFiles(files) {
  const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
  if (!imageFiles.length) return;

  state.batchFiles = imageFiles;
  state.batchResults = new Array(imageFiles.length).fill(null);

  const list = document.getElementById('batchList');
  list.innerHTML = '';

  document.getElementById('batchCount').textContent = imageFiles.length + ' files';
  document.getElementById('batchStatusText').textContent = 'Ready to process';
  document.getElementById('batchActions').style.display = 'none';

  // Render queue items
  imageFiles.forEach((file, i) => {
    const item = document.createElement('div');
    item.className = 'batch-item';
    item.id = 'batch-item-' + i;

    const thumb = document.createElement('img');
    thumb.className = 'batch-thumb';
    thumb.id = 'batch-thumb-' + i;
    const url = URL.createObjectURL(file);
    thumb.src = url;

    const info = document.createElement('div');
    info.className = 'batch-info';
    info.innerHTML = `
      <span class="batch-filename">${file.name}</span>
      <span class="batch-meta" id="batch-meta-${i}">${(file.size/1024).toFixed(0)} KB</span>
      <div class="batch-progress-wrap"><div class="batch-progress-bar" id="batch-bar-${i}"></div></div>
    `;

    const status = document.createElement('span');
    status.className = 'batch-status waiting';
    status.id = 'batch-status-' + i;
    status.textContent = 'Waiting';

    const dlBtn = document.createElement('button');
    dlBtn.className = 'batch-dl-btn';
    dlBtn.id = 'batch-dl-' + i;
    dlBtn.textContent = '⬇ Save';
    dlBtn.disabled = true;
    dlBtn.onclick = () => downloadBatchItem(i, file.name);

    item.appendChild(thumb);
    item.appendChild(info);
    item.appendChild(status);
    item.appendChild(dlBtn);
    list.appendChild(item);
  });

  // Show process button
  const actionBar = document.getElementById('actionBar');
  actionBar.style.display = 'flex';
  document.getElementById('processBtn').textContent = 'Process All (' + imageFiles.length + ')';
  document.getElementById('downloadBtn').style.display = 'none';
}

async function runBatchUpscaler() {
  const files = state.batchFiles;
  if (!files.length) return;

  const scale = currentScale;
  document.getElementById('batchStatusText').textContent = 'Processing...';
  document.getElementById('processBtn').disabled = true;

  for (let i = 0; i < files.length; i++) {
    // Update status to active
    setBatchItemStatus(i, 'active', 'Processing...');

    try {
      const img = await loadImageFromFile(files[i]);
      const w = img.width * scale;
      const h = img.height * scale;

      // Size check — skip oversized
      if (w * h > 16000000) {
        setBatchItemStatus(i, 'error', 'Too large');
        document.getElementById('batch-meta-' + i).textContent = 'Skipped — exceeds 16MP limit';
        continue;
      }

      // Process
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, w, h);

      // Store result
      state.batchResults[i] = { canvas, name: files[i].name };

      // Update thumb to show output
      const thumb = document.getElementById('batch-thumb-' + i);
      thumb.src = canvas.toDataURL('image/png');

      document.getElementById('batch-meta-' + i).textContent =
        img.width + '×' + img.height + ' → ' + w + '×' + h + 'px';

      setBatchItemStatus(i, 'done', '✓ Done');
      document.getElementById('batch-dl-' + i).disabled = false;

    } catch (err) {
      setBatchItemStatus(i, 'error', 'Error');
      console.error('Batch item ' + i + ' failed:', err);
    }

    // Small yield so UI can breathe between items
    await new Promise(r => setTimeout(r, 20));
  }

  const doneCount = state.batchResults.filter(r => r !== null).length;
  document.getElementById('batchStatusText').textContent = doneCount + ' of ' + files.length + ' done';
  document.getElementById('batchCount').textContent = doneCount + ' processed';
  document.getElementById('processBtn').disabled = false;
  document.getElementById('processBtn').textContent = 'Process All (' + files.length + ')';

  if (doneCount > 0) {
    document.getElementById('batchActions').style.display = 'flex';
  }
}

function setBatchItemStatus(i, statusClass, label) {
  const item   = document.getElementById('batch-item-' + i);
  const status = document.getElementById('batch-status-' + i);
  const bar    = document.getElementById('batch-bar-' + i);
  if (!item || !status) return;
  item.className   = 'batch-item ' + statusClass;
  status.className = 'batch-status ' + statusClass;
  status.textContent = label;
  if (bar) bar.style.width = statusClass === 'active' ? '60%' : statusClass === 'done' ? '100%' : '100%';
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload  = () => resolve(img);
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function downloadBatchItem(i, originalName) {
  const result = state.batchResults[i];
  if (!result) return;
  const base = originalName.replace(/\.[^.]+$/, '');
  downloadCanvas(result.canvas, base + '_x' + currentScale + '.png');
}

async function downloadAllZip() {
  const results = state.batchResults.filter(r => r !== null);
  if (!results.length) return;

  // Check JSZip is loaded
  if (typeof JSZip === 'undefined') {
    alert('JSZip not loaded. Please check your internet connection.');
    return;
  }

  const zipBtn = document.querySelector('#batchActions .btn-download');
  if (zipBtn) { zipBtn.textContent = '⏳ Zipping...'; zipBtn.disabled = true; }

  const zip = new JSZip();
  const folder = zip.folder('pixeltools-upscaled');

  for (const result of results) {
    const base = result.name.replace(/\.[^.]+$/, '');
    const filename = base + '_x' + currentScale + '.png';
    // Convert canvas to blob
    const blob = await new Promise(res => result.canvas.toBlob(res, 'image/png'));
    folder.file(filename, blob);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pixeltools-upscaled-x' + currentScale + '.zip';
  a.click();
  URL.revokeObjectURL(url);

  if (zipBtn) { zipBtn.textContent = '⬇ Download All (ZIP)'; zipBtn.disabled = false; }
}

// ============================================================
// EXPOSE GLOBALS — required for inline onclick= attributes in HTML
// ============================================================
window.setCrtStyle          = setCrtStyle;
window.setUpscaleMode       = setUpscaleMode;
window.downloadAllZip       = downloadAllZip;
window.showHome             = showHome;
window.openTool             = openTool;
window.setScale             = setScale;
window.syncCustomScale      = syncCustomScale;
window.setSvgOpt            = setSvgOpt;
window.setPixelSize         = setPixelSize;
window.setPaletteCount      = setPaletteCount;
window.setGridSize          = setGridSize;
window.setDitherPx          = setDitherPx;
window.copySwatch           = copySwatch;
window.downloadPaletteImage = downloadPaletteImage;

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initDarkMode();
  initHamburger();
  initUploads();
  initBatchUpload();
  initHeroCanvas();

  // Smooth scroll for "Explore Tools" anchor only
  document.querySelectorAll('a[href="#tools"]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      document.getElementById('tools')?.scrollIntoView({ behavior: 'smooth' });
    });
  });
});

// ============================================================
// CRT EFFECT TOOL
// ============================================================

let crtScanStyle = 'horizontal';

function setCrtStyle(btn) {
  crtScanStyle = btn.dataset.scanstyle;
  document.querySelectorAll('[data-scanstyle]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function runCRT() {
  const img = state.sourceImage;

  // Read slider values (0–1)
  const scanlines  = (parseInt(document.getElementById('crtScan').value)   || 0) / 100;
  const glow       = (parseInt(document.getElementById('crtGlow').value)    || 0) / 100;
  const barrel     = (parseInt(document.getElementById('crtBarrel').value)  || 0) / 100; // -1 to +1
  const chroma     = (parseInt(document.getElementById('crtChroma').value)  || 0) / 100;
  const vignette   = (parseInt(document.getElementById('crtVig').value)     || 0) / 100;
  const flicker    = (parseInt(document.getElementById('crtFlick').value)   || 0) / 100;
  const noise      = (parseInt(document.getElementById('crtNoise').value)   || 0) / 100;
  const scanStyle  = crtScanStyle;

  const W = img.width;
  const H = img.height;

  // --- STEP 1: Draw source to working canvas ---
  const src = document.createElement('canvas');
  src.width = W; src.height = H;
  const sCtx = src.getContext('2d');
  sCtx.drawImage(img, 0, 0);

  // --- STEP 2: Barrel distortion (sample with distorted UV) ---
  const distorted = document.createElement('canvas');
  distorted.width = W; distorted.height = H;
  const dCtx = distorted.getContext('2d');

  if (barrel !== 0) {
    applyBarrelDistortion(src, dCtx, W, H, barrel * 0.6);
  } else {
    dCtx.drawImage(src, 0, 0);
  }

  // --- STEP 3: Chromatic aberration ---
  const aberrated = document.createElement('canvas');
  aberrated.width = W; aberrated.height = H;
  const aCtx = aberrated.getContext('2d');

  if (chroma > 0) {
    applyChromaticAberration(distorted, aCtx, W, H, chroma * 8);
  } else {
    aCtx.drawImage(distorted, 0, 0);
  }

  // --- STEP 4: Get pixel data for per-pixel effects ---
  const imgData = aCtx.getImageData(0, 0, W, H);
  const data = imgData.data;

  // Flickering brightness offset
  const flickOffset = flicker > 0 ? (Math.random() - 0.5) * flicker * 40 : 0;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;

      let r = data[idx], g = data[idx+1], b = data[idx+2];

      // --- Scanlines (horizontal dark bands every 2px) ---
      if (scanlines > 0 && (scanStyle === 'horizontal' || scanStyle === 'both')) {
        if (y % 2 === 0) {
          const dim = 1 - scanlines * 0.75;
          r *= dim; g *= dim; b *= dim;
        }
      }

      // --- RGB phosphor mask (vertical R/G/B sub-pixel columns) ---
      if (scanlines > 0 && (scanStyle === 'rgb' || scanStyle === 'both')) {
        const col = x % 3;
        const maskStr = scanlines * 0.5;
        if (col === 0) { g *= (1 - maskStr); b *= (1 - maskStr); }
        else if (col === 1) { r *= (1 - maskStr); b *= (1 - maskStr); }
        else { r *= (1 - maskStr); g *= (1 - maskStr); }
      }

      // --- Noise / static ---
      if (noise > 0) {
        const n = (Math.random() - 0.5) * noise * 60;
        r += n; g += n; b += n;
      }

      // --- Flicker ---
      if (flicker > 0) {
        r += flickOffset; g += flickOffset; b += flickOffset;
      }

      // --- Vignette (radial darkening from edges) ---
      if (vignette > 0) {
        const nx = (x / W) * 2 - 1; // -1 to 1
        const ny = (y / H) * 2 - 1;
        const dist = Math.sqrt(nx * nx + ny * ny);
        const vig = Math.max(0, 1 - dist * vignette * 0.85);
        r *= vig; g *= vig; b *= vig;
      }

      data[idx]   = Math.max(0, Math.min(255, Math.round(r)));
      data[idx+1] = Math.max(0, Math.min(255, Math.round(g)));
      data[idx+2] = Math.max(0, Math.min(255, Math.round(b)));
    }
  }

  aCtx.putImageData(imgData, 0, 0);

  // --- STEP 5: Phosphor glow (blur + screen blend) ---
  const out = document.createElement('canvas');
  out.width = W; out.height = H;
  const oCtx = out.getContext('2d');
  oCtx.drawImage(aberrated, 0, 0);

  if (glow > 0) {
    applyPhosphorGlow(aberrated, oCtx, W, H, glow);
  }

  // --- STEP 6: Curved screen edge (rounded rect mask) ---
  if (barrel > 0) {
    applyCurvedMask(oCtx, W, H, barrel * 40);
  } else if (barrel < 0) {
    // Pincushion: no black corners, just a subtle inner glow instead
    applyCurvedMask(oCtx, W, H, 4);
  }

  displayOutputCanvas(out, `CRT Effect · ${W}×${H}px`);
}

// Barrel distortion — maps output pixels back to distorted source coords
function applyBarrelDistortion(srcCanvas, dstCtx, W, H, strength) {
  // strength > 0 = barrel (edges bow outward, black corners, CRT look)
  // strength < 0 = pincushion (edges pulled inward, bulging center)
  // strength = 0 = flat (no distortion)

  const srcCtx = srcCanvas.getContext('2d');
  const srcData = srcCtx.getImageData(0, 0, W, H);
  const dstData = dstCtx.createImageData(W, H);
  const src = srcData.data;
  const dst = dstData.data;

  const k = strength * 1.4; // positive = barrel, negative = pincushion

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // Normalize to -1..1
      const nx = (x / W) * 2 - 1;
      const ny = (y / H) * 2 - 1;
      const r2 = nx * nx + ny * ny;

      // Inverse warp: find source pixel for this output pixel
      // k > 0: division shrinks center → barrel output
      // k < 0: division expands center → pincushion output
      const factor = 1 + k * r2;
      if (Math.abs(factor) < 0.001) continue; // avoid divide by zero

      const srcNx = nx / factor;
      const srcNy = ny / factor;

      const srcX = Math.round((srcNx + 1) / 2 * W);
      const srcY = Math.round((srcNy + 1) / 2 * H);

      const dIdx = (y * W + x) * 4;

      if (srcX >= 0 && srcX < W && srcY >= 0 && srcY < H) {
        const sIdx = (srcY * W + srcX) * 4;
        dst[dIdx]   = src[sIdx];
        dst[dIdx+1] = src[sIdx+1];
        dst[dIdx+2] = src[sIdx+2];
        dst[dIdx+3] = src[sIdx+3];
      } else {
        // Black outside distorted bounds
        dst[dIdx] = dst[dIdx+1] = dst[dIdx+2] = 0;
        dst[dIdx+3] = 255;
      }
    }
  }
  dstCtx.putImageData(dstData, 0, 0);
}

// Chromatic aberration — shifts R and B channels horizontally
function applyChromaticAberration(srcCanvas, dstCtx, W, H, shift) {
  const s = Math.round(shift);
  if (s === 0) { dstCtx.drawImage(srcCanvas, 0, 0); return; }

  const tmp = document.createElement('canvas');
  tmp.width = W; tmp.height = H;
  const tCtx = tmp.getContext('2d');
  tCtx.drawImage(srcCanvas, 0, 0);
  const srcData = tCtx.getImageData(0, 0, W, H).data;

  const outData = dstCtx.createImageData(W, H);
  const dst = outData.data;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dIdx = (y * W + x) * 4;

      // Red channel shifted left
      const rX = Math.min(W - 1, Math.max(0, x - s));
      const rIdx = (y * W + rX) * 4;

      // Green channel stays
      const gIdx = dIdx;

      // Blue channel shifted right
      const bX = Math.min(W - 1, Math.max(0, x + s));
      const bIdx = (y * W + bX) * 4;

      dst[dIdx]   = srcData[rIdx];      // R from left
      dst[dIdx+1] = srcData[gIdx+1];    // G center
      dst[dIdx+2] = srcData[bIdx+2];    // B from right
      dst[dIdx+3] = 255;
    }
  }
  dstCtx.putImageData(outData, 0, 0);
}

// Phosphor glow — draw blurred copy on top with 'screen' blend
function applyPhosphorGlow(srcCanvas, dstCtx, W, H, strength) {
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = W; glowCanvas.height = H;
  const gCtx = glowCanvas.getContext('2d');

  // Use CSS blur filter for the glow
  const blurPx = Math.round(strength * 8);
  gCtx.filter = `blur(${blurPx}px)`;
  gCtx.drawImage(srcCanvas, 0, 0);
  gCtx.filter = 'none';

  // Screen blend — brightens where both layers are bright
  dstCtx.globalCompositeOperation = 'screen';
  dstCtx.globalAlpha = strength * 0.7;
  dstCtx.drawImage(glowCanvas, 0, 0);
  dstCtx.globalCompositeOperation = 'source-over';
  dstCtx.globalAlpha = 1;
}

// Curved screen edge — rounded rect clip to simulate CRT tube shape
function applyCurvedMask(ctx, W, H, radius) {
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, radius);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  // Dark border around the tube
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.lineWidth = radius * 0.5;
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, radius);
  ctx.stroke();
}
