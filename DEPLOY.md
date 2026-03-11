# PixelTools — Deployment Guide
**by FOWLSIGNS™**

## Files
```
/pixeltools
  index.html          ← Main app (homepage + all 7 tools)
  style.css           ← Full design system
  script.js           ← All tool logic (Canvas API, no frameworks)
  fowlsigns-glyph.png ← FOWLSIGNS™ brand glyph
```

---

## Deploy to GitHub Pages (Free)

1. Create a new GitHub repo (e.g. `pixeltools`)
2. Upload all 4 files to the repo root
3. Go to **Settings → Pages**
4. Set Source to **Deploy from branch → main / root**
5. Click Save — your site is live at:
   `https://yourusername.github.io/pixeltools`

---

## Deploy to Vercel (Free, Fastest)

1. Install Vercel CLI: `npm i -g vercel`
2. In the `/pixeltools` folder, run: `vercel`
3. Follow prompts — it auto-detects static HTML
4. Your site is live in ~30 seconds at a `.vercel.app` URL

**Or via Vercel dashboard:**
- Go to vercel.com → New Project → Import from GitHub
- Select your repo → Deploy (no config needed)

---

## Deploy to Netlify (Free)

1. Go to netlify.com → Add new site → Deploy manually
2. Drag & drop the entire `/pixeltools` folder
3. Site is live instantly at a `.netlify.app` URL

---

## Custom Domain

All three platforms support custom domains for free.
Add your domain in the platform's settings after deploy.

---

## Notes

- Zero backend required — everything runs in the browser
- No npm install, no build step, no config files needed
- Works immediately after copying files
- The `fowlsigns-glyph.png` must be in the same folder as `index.html`
