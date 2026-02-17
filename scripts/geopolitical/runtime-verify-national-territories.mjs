import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const consoleMessages = [];
page.on('console', (msg) => consoleMessages.push(msg.text()));

await page.addInitScript(() => {
  const now = Date.now();
  const setStarcom = (key, data) => {
    localStorage.setItem(`starcom-${key}`, JSON.stringify({ version: 1, timestamp: now, data }));
  };

  setStarcom('visualization-mode', {
    mode: 'GeoPolitical',
    subMode: 'NationalTerritories'
  });

  setStarcom('geo-political-settings', {
    nationalTerritories: {
      borderVisibility: 70,
      borderThickness: 1,
      territoryColors: {
        useCustomColors: false,
        colorScheme: 'default',
        opacity: 50
      },
      reducedMotion: false,
      bvhPicking: true,
      fillElevationEpsilon: 0.5,
      usePolygonOffset: true,
      polygonOffsetFactor: -1.5,
      polygonOffsetUnits: -1.5,
      frontSideOnly: false,
      showDisputedTerritories: true,
      showMaritimeBorders: false,
      labelVisibility: 60,
      highlightOnHover: true,
      lod: { mode: 'locked', lockedLevel: 2, hysteresis: 25 }
    }
  });

  localStorage.setItem('visualization-overlay-settings', JSON.stringify({ nationalTerritoriesOverlayEnabled: true }));
});

await page.goto('http://localhost:5174/?geoIdPickingHud=1', {
  waitUntil: 'domcontentloaded',
  timeout: 120000
});
await page.waitForTimeout(6000);

// Dismiss startup/fundraising modal overlays if present
await page.keyboard.press('Escape').catch(() => {});
const modalCloseCandidates = [
  'button[aria-label*="Close"]',
  'button:has-text("Close")',
  'button:has-text("Not now")',
  'button:has-text("Skip")',
  'button:has-text("Continue")'
];
for (const selector of modalCloseCandidates) {
  const candidate = page.locator(selector);
  if (await candidate.count()) {
    await candidate.first().click({ timeout: 2000 }).catch(() => {});
  }
}
await page.waitForTimeout(1200);

const geoBtn = page.locator('[data-testid="cyber-right-rail-mode-GeoPolitical"]');
if (await geoBtn.count()) {
  await geoBtn.first().click({ timeout: 12000 });
}

await page.waitForTimeout(1000);

const ntBtn = page.locator('[data-testid="cyber-left-rail-mode-NationalTerritories"]');
if (await ntBtn.count()) {
  await ntBtn.first().click();
}

const overlayBtn = page.locator('[data-testid="cyber-right-rail-toggle-national-territories"]');
if (await overlayBtn.count()) {
  const pressed = await overlayBtn.first().getAttribute('aria-pressed');
  if (pressed !== 'true') {
    await overlayBtn.first().click();
  }
}

await page.waitForTimeout(9000);

const probe = await page.evaluate(() => {
  const w = window;
  if (!w.__geoOverlayProbe || typeof w.__geoOverlayProbe.getGroupTransforms !== 'function') {
    return null;
  }
  return w.__geoOverlayProbe.getGroupTransforms();
});

const sourceLogs = consoleMessages.filter((m) => m.includes('[NationalTerritories] resolved territory source'));

console.log(JSON.stringify({
  probe,
  sourceLogs,
  sampleConsoleTail: consoleMessages.slice(-25)
}, null, 2));

await browser.close();
