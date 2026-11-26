// Builds the Welcome guide (shipped with the app) and a long test book (only for testing).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const font = 'data:font/woff2;base64,' + fs.readFileSync(path.join(ROOT, 'app/vendor/fonts/pixelify-sans-latin-700-normal.woff2')).toString('base64');
const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'app/logo.png')).toString('base64');

const css = `
@font-face { font-family: Px; src: url('${font}'); }
@page { size: 148mm 210mm; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Georgia, 'DejaVu Serif', serif; color: #3a2d26; }
.page { width: 148mm; height: 210mm; padding: 16mm 14mm 14mm; page-break-after: always; position: relative; background: #fffdf8; }
.page:last-child { page-break-after: auto; }
h1, h2 { font-family: Px, monospace; color: #6f584f; font-weight: 700; }
h1 { font-size: 30pt; margin: 0 0 4mm; text-align: center; }
h2 { font-size: 19pt; margin: 0 0 5mm; border-bottom: 3px solid #c88f99; padding-bottom: 2mm; }
p, li { font-size: 11.5pt; line-height: 1.55; }
ul { padding-left: 5mm; } li { margin-bottom: 2.4mm; }
b { color: #6f584f; }
.key { font-family: Px, monospace; background: #e0b86a; color: #3a2d26; padding: 0 1.6mm; border: 1px solid #6f584f; }
.cover { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; background: #f3e7e3; }
.cover img { width: 70mm; image-rendering: pixelated; margin-bottom: 8mm; }
.cover .sub { font-family: Px, monospace; color: #a8707b; font-size: 13pt; }
.frame { position: absolute; inset: 6mm; border: 2px solid #c3a492; pointer-events: none; }
.foot { position: absolute; bottom: 8mm; left: 0; right: 0; text-align: center; font-family: Px, monospace; font-size: 9pt; color: #a08575; }
table { width: 100%; border-collapse: collapse; font-size: 11pt; }
td { padding: 1.8mm 1mm; border-bottom: 1px dotted #c3a492; vertical-align: top; }
td:first-child { width: 33%; font-family: Px, monospace; color: #6f584f; }
.tip { background: #f3e7e3; border-left: 4px solid #c88f99; padding: 3mm 4mm; font-size: 11pt; line-height: 1.5; }
`;
const P = (n, html) => `<div class="page"><div class="frame"></div>${html}<div class="foot">${n}</div></div>`;
const guide = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
<div class="page cover"><div class="frame"></div><img src="${logo}" alt=""><h1>Welcome to Dokseo</h1><p class="sub">A little guide from Dubu the shop cat</p><p style="margin-top:14mm">Turn the page with the <span class="key">→</span> key<br>or the arrow on the right side.</p></div>
${P(2, `<h2>Your library</h2><ul>
<li><b>Each shelf is a category.</b> Walk to a shelf and press <span class="key">C</span>, or click its name sign, to rename it and pick a wood color.</li>
<li><b>Add your own PDF books</b> with <span class="key">N</span> or the <b>+ Add book</b> button. You can also drag PDF files into the window.</li>
<li>Walk past a shelf and the books <b>peek out</b>. Click a book, or press <span class="key">E</span>, to jump inside and read.</li>
<li>A <b>gold top</b> means finished. A <b>pink ribbon</b> means you are in the middle of it. A <b>blue corner</b> means it is on your want-to-read pile.</li>
<li><b>Right-click a book</b> to move it, rename it, mark it finished, or put it on the want-to-read pile on the table.</li></ul>`)}
${P(3, `<h2>Reading</h2><ul>
<li>Turn pages with <span class="key">←</span> <span class="key">→</span>, the space bar, or the arrows on the sides.</li>
<li><b>Select some text</b> on this page right now. You can highlight it in four colors, add a note, copy it, or save it as a quote.</li>
<li>Press <span class="key">B</span> to bookmark a page. Find all your highlights, notes, bookmarks and quotes under <b>Notes</b>.</li>
<li><b>Search</b> (<span class="key">Ctrl</span>+<span class="key">F</span>) and <b>Contents</b> help you jump around a big book.</li>
<li><b>Style</b> changes how pages look: Day, Sepia or Night, plus brightness, zoom, and one or two pages at a time.</li></ul>
<div class="tip">Try it: select this sentence and press "Save quote". It goes straight into your Quote Journal.</div>`)}
${P(4, `<h2>Little helpers</h2><ul>
<li><b>Sounds:</b> rain, a crackling fireplace, a busy café, deep focus noise or night crickets.</li>
<li><b>Focus:</b> 25 minutes of reading, then a 5 minute break. Change the times in Settings.</li>
<li><b>Read aloud:</b> your computer reads the page to you and turns the pages by itself.</li>
<li><b>Mini you</b> sits in the corner and reads along with you. It turns its page when you do, holds up a highlighter when you highlight, and falls asleep if you stop reading for a while. You can drag it to any corner.</li>
<li>The clock at the top counts only the time you are really reading.</li></ul>`)}
${P(5, `<h2>Coins, XP and levels</h2><table>
<tr><td>Reading</td><td>1 coin and 2 XP for every minute</td></tr>
<tr><td>Daily goal</td><td>15 coins when you reach your minutes for the day</td></tr>
<tr><td>Finishing a book</td><td>50 coins and 100 XP</td></tr>
<tr><td>Daily quests</td><td>3 new quests every day</td></tr>
<tr><td>Achievements</td><td>20 to 500 coins each</td></tr>
<tr><td>Coming back</td><td>A bonus for every day of your streak</td></tr></table>
<p style="margin-top:6mm"><b>Levels grow your library.</b> Level 3 opens the Fireplace Lounge, level 5 the Garden Nook, level 7 the Grand Hall, and level 10 the Starlight Room. Other levels unlock new wood colors, shelf decorations and a candlelight reading style.</p>`)}
${P(6, `<h2>My shop</h2><ul>
<li>Walk to my counter on the left side of the Reading Room and press <span class="key">E</span>, or click <b>Shop</b>.</li>
<li>Four collections: <b>BTS-inspired</b> (purple everything), <b>K-drama</b> (ramyeon, cherry blossoms, hanbok), <b>Wizard school</b> (hats, robes, floating candles, an owl) and <b>Wydad</b> (red and white).</li>
<li>Clothes go on your character. Decorations go around your library. Reader themes change your pages.</li>
<li><b>Adopt a kitten!</b> Every 10 minutes of reading puts a fish treat in its bowl. A fed cat is a happy cat that follows you around. Walk up to it and press <span class="key">E</span> to pet it.</li>
<li>Feeling lucky? Try a <b>mystery box</b>.</li></ul>`)}
${P(7, `<h2>Stats and streaks</h2><ul>
<li><b>Stats</b> shows the books you finished, the hours you read, your day streak and a heatmap of every day you read this year.</li>
<li>Open Dokseo every day to keep your <b>streak</b> burning. The flame grows as the streak gets longer.</li>
<li>The <b>Quote Journal</b> keeps every quote you saved, from every book.</li>
<li>The <b>Book Journal</b> keeps your rating, mood and review for each book you finish.</li>
<li>Can't decide what to read next? Open <b>View</b> and press <b>Pick a book for me</b>.</li></ul>`)}
${P(8, `<h2>Shortcuts</h2><table>
<tr><td>Arrows / WASD</td><td>Walk around</td></tr><tr><td>E</td><td>Read, shop, pet, build</td></tr><tr><td>N</td><td>Add a PDF book</td></tr>
<tr><td>C</td><td>Edit the shelf in front of you</td></tr><tr><td>Space</td><td>Hop</td></tr><tr><td>Esc</td><td>Menu, or close the reader</td></tr>
<tr><td>← →</td><td>Turn pages</td></tr><tr><td>B</td><td>Bookmark</td></tr><tr><td>Ctrl + F</td><td>Search the book</td></tr><tr><td>+ / −</td><td>Zoom</td></tr><tr><td>F11</td><td>Fullscreen</td></tr></table>
<p style="margin-top:10mm;text-align:center;font-family:Px,monospace;font-size:16pt;color:#a8707b">Happy reading!<br>Dubu</p>`)}
</body></html>`;

// a long test book for checking search, contents and page turning
const words = 'the little library hummed softly while rain tapped the window and a cat dreamed of fish under the warm lamp as pages turned like leaves in autumn wind'.split(' ');
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const para = () => { let s = ''; const n = 50 + Math.floor(rnd() * 40); for (let i = 0; i < n; i++) s += words[Math.floor(rnd() * words.length)] + (rnd() < 0.08 ? '. ' : ' '); return s.charAt(0).toUpperCase() + s.slice(1).trim() + '.'; };
let test = `<!doctype html><html><head><meta charset="utf-8"><style>${css} .page{background:#fff}</style></head><body>`;
for (let i = 1; i <= 40; i++) test += P(i, `<h2>${i % 5 === 1 ? 'Chapter ' + (Math.floor(i / 5) + 1) : ''}</h2><p>${para()}</p><p>${para()}</p><p>${i === 23 ? 'The secret word is moonberry. ' : ''}${para()}</p>`);
test += '</body></html>';

(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.setContent(guide, { waitUntil: 'load' }); await p.waitForTimeout(300);
  fs.mkdirSync(path.join(ROOT, 'app/starter'), { recursive: true });
  await p.pdf({ path: path.join(ROOT, 'app/starter/welcome.pdf'), width: '148mm', height: '210mm', printBackground: true });
  await p.setContent(test, { waitUntil: 'load' });
  fs.mkdirSync(path.join(ROOT, 'test'), { recursive: true });
  await p.pdf({ path: path.join(ROOT, 'test/long-test-book.pdf'), width: '148mm', height: '210mm', printBackground: true });
  await b.close(); console.log('ok');
})();
