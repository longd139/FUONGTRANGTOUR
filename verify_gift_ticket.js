const fs = require('fs');
const assert = require('assert');

console.log("=== BẮT ĐẦU KIỂM TRA BẢNG QUÀ TẶNG VÉ XE (PHASE 1) ===");

let passed = 0;
let total = 0;

function it(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
  }
}

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');
const js = fs.readFileSync('main.js', 'utf8');

// Test 1: Kiểm tra index.html chỉ hiển thị duy nhất 1 món quà là Bông hoa Vé xe
it("Bảng hud-gift-board trong index.html chỉ chứa 1 món quà là Vé xe", () => {
  const matchBoard = html.match(/<div class="hud-gift-board"[\s\S]*?id="hud-gift-board"[\s\S]*?<\/div>\s*<\/div>/);
  assert.ok(matchBoard, "Không tìm thấy #hud-gift-board");
  const boardHtml = matchBoard[0];
  
  const pills = boardHtml.match(/class="hud-gift-pill"/g) || [];
  assert.strictEqual(pills.length, 1, `Cần có đúng 1 pill quà tặng, hiện có ${pills.length}`);
  
  assert.ok(boardHtml.includes('data-gift="🌸 Vé xe"'), 'Pill phải có data-gift="🌸 Vé xe"');
  assert.ok(boardHtml.includes('<span class="gift-icon">🌸</span>'), 'Pill phải có icon hoa 🌸');
  assert.ok(boardHtml.includes('<span class="gift-text">Vé xe</span>'), 'Pill phải có nhãn "Vé xe"');
  assert.ok(!boardHtml.includes('Cây Kem'), 'Không được còn Cây Kem trong bảng quà Phase 1');
  assert.ok(!boardHtml.includes('Nón Lá'), 'Không được còn Nón Lá trong bảng quà Phase 1');
  assert.ok(!boardHtml.includes('Trái Tim'), 'Không được còn Trái Tim trong bảng quà Phase 1');
});

// Test 2: Kiểm tra select-gift trong Admin test panel mặc định là 🌸 Vé xe
it("Select gift trong Admin Panel mặc định là 🌸 Vé xe", () => {
  assert.ok(html.includes('<option value="🌸 Vé xe" selected>🌸 Tặng Hoa (Vé xe)</option>'), "Admin select-gift cần option 🌸 Vé xe selected");
});

// Test 3: Kiểm tra CSS cho bảng quà tặng gọn gàng, căn giữa mép trái
it("CSS của hud-gift-board và hud-gift-pill được định dạng chuẩn", () => {
  assert.ok(css.includes('.hud-gift-board {'), "Phải có CSS cho .hud-gift-board");
  assert.ok(css.includes('top: 50%'), "Bảng phải canh top: 50%");
  assert.ok(css.includes('transform: translateY(-50%)'), "Bảng phải có translateY(-50%)");
  assert.ok(css.includes('left: 10px'), "Bảng phải nằm mép trái");
  assert.ok(css.includes('.hud-gift-pill {'), "Phải có CSS cho .hud-gift-pill");
});

// Test 4: Kiểm tra JS mô phỏng và click pill
it("main.js xử lý quà tặng mặc định và click pill hợp lệ", () => {
  assert.ok(js.includes('const hudGiftPills = document.querySelectorAll(".hud-gift-pill");'), "Phải có querySelectorAll .hud-gift-pill");
  assert.ok(js.includes('const gift = select ? select.value : "🌸 Vé xe";'), "Mặc định tặng quà phải là 🌸 Vé xe");
  assert.ok(js.includes('onPassengerGift(dummyName, "🌸 Vé xe");'), "Test quick fill phải tặng 🌸 Vé xe");
});

console.log(`\n========================================`);
console.log(`KẾT QUẢ: ${passed}/${total} tests passed`);
console.log(`========================================`);

if (passed !== total) {
  process.exit(1);
}
