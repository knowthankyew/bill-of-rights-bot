import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { chromium } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  const repoRoot = path.resolve(__dirname, '..');
  const tempVideoDir = path.join(repoRoot, '.temp_demo_videos');
  if (!fs.existsSync(tempVideoDir)) fs.mkdirSync(tempVideoDir, { recursive: true });

  const destMp4 = path.join(repoRoot, 'demo.mp4');
  const destGif = path.join(repoRoot, 'demo.gif');

  // Determine active port
  const candidatePorts = [process.env.PORT || '5174', '5173', '5174'];
  let activeUrl = 'http://127.0.0.1:5174';

  for (const p of candidatePorts) {
    try {
      execSync(`curl -s -I http://127.0.0.1:${p}/`, { stdio: 'ignore' });
      activeUrl = `http://127.0.0.1:${p}`;
      break;
    } catch {
      // try next
    }
  }

  console.log(`🎬 Launching Playwright browser for BillOfRightsBot demo against ${activeUrl}...`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1366,860'],
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 860 },
    recordVideo: {
      dir: tempVideoDir,
      size: { width: 1366, height: 860 },
    },
  });

  const page = await context.newPage();

  console.log(`Step 1: Navigating to BillOfRightsBot UI (${activeUrl})...`);
  await page.goto(activeUrl, { waitUntil: 'networkidle' });
  await sleep(1500);

  console.log('Step 2: Showcasing 100% Local-First Air-Gap Badge and Grounded Statutes...');
  await page.hover('.air-gap-badge');
  await sleep(1000);
  await page.click('.statute-card.active'); // inspect federal statute
  await sleep(1500);
  await page.click('.modal-close'); // close modal
  await sleep(800);

  console.log('Step 3: Loading Titan Gym Predatory Agreement Sample...');
  await page.click('button:has-text("Titan Gym")');
  await sleep(1500);

  console.log('Step 4: Inspecting Unlawful Traps & Cal. Bus. & Prof. Code § 17603 Unconditional Gift Alert...');
  await page.evaluate(() => window.scrollBy({ top: 220, behavior: 'smooth' }));
  await sleep(2000);

  console.log('Step 5: Filtering for Unlawful Clauses & Highlighting Click-to-Cancel Violation...');
  await page.click('button:has-text("Unlawful")');
  await sleep(1500);
  await page.evaluate(() => window.scrollBy({ top: 180, behavior: 'smooth' }));
  await sleep(2000);

  console.log('Step 6: Resetting filter to show all clauses...');
  await page.click('button:has-text("All Clauses")');
  await sleep(1200);

  console.log('Step 7: Customizing Remedy & Defense Notice (Alex Rivera)...');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await sleep(800);

  // Fill custom subscriber and merchant fields in Remedy Studio
  const inputs = await page.locator('.remedy-rail input');
  if (await inputs.count() >= 4) {
    await inputs.nth(0).fill('Alex Rivera');
    await sleep(400);
    await inputs.nth(1).fill('Titan Fitness Club LLC');
    await sleep(400);
    await inputs.nth(2).fill('alex.rivera@example.com');
    await sleep(400);
    await inputs.nth(3).fill('49.99');
    await sleep(800);
  }

  console.log('Step 8: Switching to FTC & State AG Regulatory Complaint Draft...');
  await page.click('button:has-text("FTC Complaint")');
  await sleep(1800);

  console.log('Step 9: Switching to Unconditional Gift Restitution Demand (§ 17603)...');
  await page.click('button:has-text("Gift Restitution")');
  await sleep(1800);

  console.log('Step 10: Demonstrating 1-Click Copy Notice with Instant Feedback...');
  await page.click('button:has-text("Copy Notice")');
  await sleep(1500);

  console.log('Step 11: Demonstrating Instant "Burn Local Data" Session Memory Purge...');
  await page.click('.burn-btn');
  await sleep(2000);

  console.log('Step 12: Loading Transparent Compliant Agreement to show 100% score...');
  await page.click('button:has-text("Transparent (Compliant)")');
  await sleep(2500);

  console.log('Closing browser context to finalize video recording...');
  await page.close();
  await context.close();
  await browser.close();

  // Locate the recorded WebM
  const videoFiles = fs.readdirSync(tempVideoDir).filter((f) => f.endsWith('.webm'));
  if (videoFiles.length === 0) {
    console.error('❌ Error: No recorded WebM video found in temp folder.');
    return;
  }

  const latestVideo = path.join(tempVideoDir, videoFiles[videoFiles.length - 1]);

  // Locate candidate ffmpeg binaries
  const candidateFfmpeg = [
    '/Users/cl0rkster/Dev/ml/src/FtaaSService.Worker/.venv/lib/python3.12/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-x86_64-v7.1',
    '/opt/homebrew/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    'ffmpeg',
    path.join(process.env.HOME || '/Users/cl0rkster', 'Library/Caches/ms-playwright/ffmpeg-1011/ffmpeg-mac'),
  ];

  let ffmpegPath = null;
  for (const p of candidateFfmpeg) {
    if (fs.existsSync(p)) {
      ffmpegPath = p;
      break;
    }
  }

  if (ffmpegPath) {
    try {
      console.log(`🎬 Transcoding recording to web-standard MP4 (H.264 / yuv420p) via ${ffmpegPath}...`);
      execSync(`"${ffmpegPath}" -y -i "${latestVideo}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${destMp4}"`, { stdio: 'inherit' });
      const stats = fs.statSync(destMp4);
      console.log(`✓ Demo MP4 generated: ${destMp4} (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);

      console.log('🎬 Transcoding animated preview GIF for GitHub README...');
      execSync(`"${ffmpegPath}" -y -i "${destMp4}" -vf "fps=10,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" "${destGif}"`, { stdio: 'inherit' });
      const gifStats = fs.statSync(destGif);
      console.log(`✓ Demo GIF generated: ${destGif} (${(gifStats.size / (1024 * 1024)).toFixed(2)} MB)`);
    } catch (err) {
      console.warn('⚠️ FFmpeg conversion warning, keeping WebM:', err.message);
      fs.copyFileSync(latestVideo, destMp4);
    }
  } else {
    console.warn('⚠️ FFmpeg binary not found. Retaining raw WebM as demo.mp4.');
    fs.copyFileSync(latestVideo, destMp4);
  }

  // Clean up temp dir
  fs.rmSync(tempVideoDir, { recursive: true, force: true });
  console.log('✨ Demo video recording complete!');
})();
