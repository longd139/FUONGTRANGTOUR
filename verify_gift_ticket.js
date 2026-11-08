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

// Test 1: Kiểm tra index.html chỉ hiển thị duy nhất 1 món quà là Bông hoa Vé xe và đã bỏ "Lên xe VIP"
it("Bảng hud-gift-board trong index.html chỉ chứa 1 món quà là Vé xe và đã bỏ footer Lên xe VIP", () => {
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
  assert.ok(!boardHtml.includes('Lên xe VIP'), 'Đã bỏ dòng chữ Lên xe VIP');
  assert.ok(!boardHtml.includes('hud-gift-footer'), 'Đã bỏ class hud-gift-footer');
});

// Test 2: Kiểm tra select-gift trong Admin test panel mặc định là 🌸 Vé xe
it("Select gift trong Admin Panel mặc định là 🌸 Vé xe", () => {
  assert.ok(html.includes('<option value="🌸 Vé xe" selected>🌸 Tặng Hoa (Vé xe)</option>'), "Admin select-gift cần option 🌸 Vé xe selected");
});

// Test 3: Kiểm tra CSS cho bảng quà tặng nhỏ gọn, căn giữa mép trái
it("CSS của hud-gift-board được thu nhỏ xíu gọn gàng và bỏ footer", () => {
  assert.ok(css.includes('.hud-gift-board {'), "Phải có CSS cho .hud-gift-board");
  assert.ok(css.includes('top: 50%'), "Bảng phải canh top: 50%");
  assert.ok(css.includes('transform: translateY(-50%)'), "Bảng phải có translateY(-50%)");
  assert.ok(css.includes('left: 10px'), "Bảng phải nằm mép trái");
  assert.ok(css.includes('min-width: 82px'), "Bảng được thu nhỏ min-width: 82px");
  assert.ok(css.includes('max-width: 95px'), "Bảng được thu nhỏ max-width: 95px");
  assert.ok(css.includes('.hud-gift-pill {'), "Phải có CSS cho .hud-gift-pill");
});

// Test 4: Kiểm tra JS mô phỏng và click pill
it("main.js xử lý quà tặng mặc định và click pill hợp lệ", () => {
  assert.ok(js.includes('const hudGiftPills = document.querySelectorAll(".hud-gift-pill");'), "Phải có querySelectorAll .hud-gift-pill");
  assert.ok(js.includes('const gift = select ? select.value : "🌸 Vé xe";'), "Mặc định tặng quà phải là 🌸 Vé xe");
  assert.ok(js.includes('onPassengerGift(dummyName, "🌸 Vé xe");'), "Test quick fill phải tặng 🌸 Vé xe");
});

// Test 5: Kiểm tra đã bỏ toàn bộ icon trước tên của khách (trong createCharacterElement và SpriteActor)
it("Đã bỏ toàn bộ icon (char-badge) trước tên khách trong createCharacterElement và SpriteActor", () => {
  assert.ok(!js.includes('<span class="char-badge">'), "Không được còn char-badge trong bất kỳ thẻ tên khách nào");
  assert.ok(!js.includes("${gift ? '🎟️' : '🚶'}"), "Không còn icon vé hoặc người đi bộ trong thẻ tên");
  assert.ok(!js.includes("${this.badge}"), "Không còn icon badge trong thẻ tên SpriteActor");
  assert.ok(js.includes('<div class="char-tag">\n      <span class="char-name">${username}</span>\n    </div>'), "Thẻ tên chỉ còn duy nhất tên khách");
});

// Test 6: Kiểm tra bảng câu hỏi HDV hiển thị dưới thanh timeline và có chiều ngang bằng thanh timeline
it("Bảng câu hỏi HDV hiển thị dưới timeline và bằng chiều ngang thanh timeline", () => {
  // DOM vị trí
  assert.ok(html.includes('id="cabin-trip-hud"'), "Phải có #cabin-trip-hud");
  assert.ok(html.includes('id="guide-bubble" class="guide-speech-bubble hidden"'), "Phải có #guide-bubble");
  
  // Chiều ngang bằng nhau giữa timeline và bảng câu hỏi trong CSS
  const hudMatch = css.match(/\.cabin-trip-hud\s*\{[\s\S]*?\}/);
  assert.ok(hudMatch, "Không tìm thấy .cabin-trip-hud trong CSS");
  assert.ok(hudMatch[0].includes('width: 90%'), "Timeline có width: 90%");
  assert.ok(hudMatch[0].includes('max-width: 390px'), "Timeline có max-width: 390px");

  const bubbleMatch = css.match(/\.guide-speech-bubble\s*\{[\s\S]*?\}/);
  assert.ok(bubbleMatch, "Không tìm thấy .guide-speech-bubble trong CSS");
  assert.ok(bubbleMatch[0].includes('width: 90%'), "Bảng câu hỏi phải có width: 90% bằng thanh timeline");
  assert.ok(bubbleMatch[0].includes('max-width: 390px'), "Bảng câu hỏi phải có max-width: 390px bằng thanh timeline");
  assert.ok(bubbleMatch[0].includes('top: 76px'), "Bảng câu hỏi phải nằm ngay dưới timeline (top: 76px)");
});

// Test 7: Kiểm tra độ đồng đều font chữ trong toàn bộ tab quản trị
it("Font chữ trong toàn bộ tab quản trị được đồng bộ thống nhất theo Nunito", () => {
  assert.ok(html.includes('Nunito:wght@400;500;600;700;800;900'), "Phải tải đầy đủ trọng số font Nunito từ 400 đến 900");
  assert.ok(css.includes(".admin-sidebar * {\n  font-family: 'Nunito'"), "Toàn bộ thành phần trong admin sidebar phải áp dụng font Nunito");
  const titleH2Match = css.match(/\.admin-title-wrap h2\s*\{[\s\S]*?\}/);
  assert.ok(titleH2Match, "Không tìm thấy .admin-title-wrap h2 trong CSS");
  assert.ok(!titleH2Match[0].includes('var(--font-display)'), "Tiêu đề quản trị không dùng font cartoon Baloo 2");
  assert.ok(titleH2Match[0].includes('font-weight: 900'), "Tiêu đề quản trị dùng font-weight: 900 sắc nét");
});

// Test 8: Kiểm tra cơ chế giữ nguyên câu hỏi đủ 2 phút, không bị ngắt quãng giữa chừng
it("Câu hỏi đố vui được giữ nguyên đủ 2 phút và chỉ tự động chuyển khi xong câu hỏi", () => {
  assert.ok(!js.includes('guideAutoTimer = setInterval'), "Không còn vòng lặp 18s gây ngắt câu hỏi giữa chừng");
  assert.ok(js.includes('!question && !force && currentActiveQA && !currentActiveQA.answered'), "triggerGuideActivity có guard bảo vệ không chuyển câu khi đang đố");
  assert.ok(js.includes('function scheduleNextGuideQuiz'), "Phải có hàm scheduleNextGuideQuiz để chuyển câu sau khi kết thúc");
  assert.ok(js.includes('remainingSec = 120'), "Thời gian đếm ngược đố vui chuẩn 120 giây (2 phút)");
});

// Test 9: Kiểm tra tính năng hiển thị bình luận của hành khách trên xe (Phase 2)
it("Hành khách đã mua vé khi bình luận sẽ hiển thị bong bóng chat trên đầu", () => {
  assert.ok(js.includes('function showPassengerComment'), "Phải có hàm showPassengerComment");
  assert.ok(js.includes('showPassengerComment(username, text)'), "handleComment phải gọi showPassengerComment");
  assert.ok(js.includes('charEl.dataset.username = passenger.username;'), "renderCabinPassengers phải gán dataset.username để tìm chính xác khách");
  assert.ok(css.includes('.passenger-chat-bubble {'), "Phải có style cho .passenger-chat-bubble");
  assert.ok(css.includes('@keyframes passengerBubblePop'), "Phải có hiệu ứng nảy lên passengerBubblePop");
});

// Test 10: Kiểm tra hiển thị bình luận cho cả hành khách tham gia ở Phase 1 (bến xe)
it("Hành khách tham gia ở Phase 1 khi bình luận cũng hiển thị bong bóng chat trên đầu", () => {
  assert.ok(js.includes('charDiv.dataset.username = username;'), "createCharacterElement phải gán dataset.username cho khách Phase 1");
  assert.ok(js.includes('this.el.dataset.username = this.name;'), "SpriteActor phải gán dataset.username");
  assert.ok(js.includes('state.currentPhase === 1 && !state.farPassengers.includes(username)'), "Tự động kết nạp khách vào bến xe Phase 1 khi họ bình luận");
  assert.ok(js.includes('document.querySelectorAll("#far-passengers-container .char-2d")'), "showPassengerComment hỗ trợ tìm hành khách ngoài sân Phase 1");
});

console.log(`\n========================================`);
console.log(`KẾT QUẢ: ${passed}/${total} tests passed`);
console.log(`========================================`);

if (passed !== total) {
  process.exit(1);
}

