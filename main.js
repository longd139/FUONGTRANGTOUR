/* ==========================================================================
   BẾN XE FUONG TRANG - LOGIC ĐIỀU KHIỂN NHÂN VẬT 2D & CHUYẾN XE (MOBILE 9:16)
   ========================================================================== */

// Cấu hình
const CONFIG = {
  TOTAL_SEATS: 20,
  AUTO_DEPART_DELAY: 2200, // Đợi 2.2s khi đủ 20 người thì xuất bến
  RANDOM_NAMES: [
    "Anh Hai Lúa", "Chị Út Miền Tây", "Bác Ba Phi", "Cô Tám Bến Tre",
    "Bé Bắp", "Hoàng Tử Gió", "Mèo Cam", "Sơn Ca", "Bé Bự", "Tuấn Khang",
    "Thanh Hằng", "Minh Trí", "Ngọc Trâm", "Quang Hải", "Hương Giang"
  ],
  SHIRT_COLORS: ["#ef476f", "#ffd166", "#06d6a0", "#118ab2", "#073b4c", "#9b5de5", "#f15bb5"],
  HAT_COLORS: ["#d90429", "#ff9f1c", "#2ec4b6", "#e71d36", "#3a86ff", "#7209b7"],
  LUGGAGE_COLORS: ["#8338ec", "#3a86ff", "#fb5607", "#ffbe0b", "#38b000"]
};

// Trạng thái hệ thống
const state = {
  farPassengers: [],    // Danh sách người ở sân ngoài
  seatedPassengers: [], // Danh sách người đã vào ghế
  isDeparting: false,   // Đang trong hiệu ứng xe chạy
  autoDemoInterval: null
};

/* ================== QUẢN TRỊ CÀI ĐẶT BOT LIVESTREAM ================== */
const defaultSettings = {
  enableJoinVoice: false, // Mặc định tắt để tránh ồn khi live đông, streamer có thể bật bất cứ lúc nào
  joinMessages: [
    "Chào mừng {username} đến với Bến Xe FUONG TRANG!",
    "Bến xe FUONG TRANG xin chào quý khách {username} nha!",
    "Chúc {username} xem live vui vẻ, xe chuẩn bị xuất bến rồi nhé!",
    "Hello {username}, tặng hoa hoặc quà để nhận vé giường nằm VIP nha!",
    "Loa loa loa, nhiệt liệt hoan nghênh quý khách {username} đã ghé bến xe!"
  ],
  enableGiftVoice: true,
  giftTemplate: "Mời quý khách {username} vào giường nằm VIP!",
  enableFuelVoice: true,
  fuelTemplate: "Cảm ơn {username} đã tiếp thêm xăng cho xe FUONG TRANG!",
  enableDepartVoice: true,
  departTemplate: "Chuyến xe FUONG TRANG đi Đà Lạt đã đủ 20 hành khách, chuẩn bị khởi hành! Chúc bà con thượng lộ bình an!",
  enableHorn: true
};

let appSettings = { ...defaultSettings };

function loadSettings() {
  try {
    const saved = localStorage.getItem("fuong_trang_admin_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      appSettings = { ...defaultSettings, ...parsed };
      // Tương thích ngược nếu trước đó lưu joinTemplate dạng chuỗi đơn
      if (parsed.joinTemplate && (!parsed.joinMessages || parsed.joinMessages.length === 0)) {
        appSettings.joinMessages = [parsed.joinTemplate];
      }
    }
  } catch (e) {
    console.warn("Không thể tải cài đặt:", e);
  }
}

function saveSettings() {
  try {
    localStorage.setItem("fuong_trang_admin_settings", JSON.stringify(appSettings));
  } catch (e) {
    console.warn("Không thể lưu cài đặt:", e);
  }
}

// DOM Elements
const farContainer = document.getElementById("far-passengers-container");
const seatsGrid = document.getElementById("seats-grid");
const seatCountEl = document.getElementById("seat-count");
const tripProgressEl = document.getElementById("trip-progress");
const busContainer = document.getElementById("fuong-trang-bus");
const toastBanner = document.getElementById("toast-banner");
const toastAvatar = document.getElementById("toast-avatar");
const toastTitle = document.getElementById("toast-title");
const toastDesc = document.getElementById("toast-desc");

/* ================== ÂM THANH BẰNG WEB AUDIO API ================== */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playBusHorn() {
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.setValueAtTime(554.37, audioCtx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.45);
  } catch (e) {
    console.log("Audio waiting for user gesture:", e);
  }
}

function playDoubleBusHorn() {
  playBusHorn();
  setTimeout(() => playBusHorn(), 200);
}

function playFuelSound() {
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(783.99, audioCtx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.16, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.22);
  } catch (e) { }
}

/* ================== LOA PHÁT THANH BẾN XE TIẾNG VIỆT CHUẨN ================== */
let currentStationAudio = null;

async function speakStationAnnouncement(text) {
  if (!text || !text.trim()) return;

  // Dừng âm thanh trước nếu đang phát dở
  if (currentStationAudio) {
    try {
      currentStationAudio.pause();
      currentStationAudio.currentTime = 0;
    } catch (e) { }
    currentStationAudio = null;
  }
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) { }
  }

  const cleanText = text.replace(/[\{\}]/g, '').trim();

  // 1. Ưu tiên phát trực tiếp qua Google Translate TTS (chuẩn giọng tiếng Việt, không bị 404 nhờ no-referrer)
  try {
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(cleanText)}`;
    const audio = new Audio(ttsUrl);
    currentStationAudio = audio;
    audio.volume = 1.0;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      await playPromise;
      return;
    }
  } catch (err) {
    console.warn("Google TTS trực tiếp chưa phát được, thử giải pháp tiếp theo:", err);
  }

  // 2. Dự phòng 1: Kiểm tra xem thiết bị có sẵn giọng đọc tiếng Việt (Google tiếng Việt / Microsoft An)
  if (trySpeakWithLocalVietnameseVoice(cleanText)) {
    return;
  }

  // 3. Dự phòng 2: Gọi dịch vụ âm thanh đám mây SoundOfText (100% tiếng Việt, hỗ trợ CORS đầy đủ)
  try {
    const res = await fetch('https://api.soundoftext.com/sounds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { text: cleanText, voice: 'vi-VN' } })
    });
    const data = await res.json();
    if (data && data.success && data.id) {
      for (let i = 0; i < 6; i++) {
        await new Promise(resolve => setTimeout(resolve, 250));
        const checkRes = await fetch(`https://api.soundoftext.com/sounds/${data.id}`);
        const checkData = await checkRes.json();
        if (checkData.status === 'Done' && checkData.location) {
          const cloudAudio = new Audio(checkData.location);
          currentStationAudio = cloudAudio;
          cloudAudio.volume = 1.0;
          await cloudAudio.play();
          return;
        }
      }
    }
  } catch (e) {
    console.warn("SoundOfText TTS lỗi:", e);
  }
}

function trySpeakWithLocalVietnameseVoice(text) {
  if (!('speechSynthesis' in window)) return false;

  const voices = window.speechSynthesis.getVoices();
  // Tìm kiếm giọng tiếng Việt chuẩn trong hệ thống
  const viVoice = voices.find(v =>
    (v.lang && (v.lang.toLowerCase().startsWith('vi') || v.lang.toLowerCase().includes('vie'))) ||
    (v.name && (v.name.toLowerCase().includes('vietnam') || v.name.toLowerCase().includes('tiếng việt')))
  );

  // NẾU KHÔNG CÓ GIỌNG TIẾNG VIỆT: Tuyệt đối không để giọng tiếng Anh đọc nhái
  if (!viVoice) {
    return false;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = viVoice;
  utterance.lang = viVoice.lang || 'vi-VN';
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  window.speechSynthesis.speak(utterance);
  return true;
}

// Lắng nghe tải voices của trình duyệt khi mở web
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}

/* ================== HỆ THỐNG TƯƠNG TÁC BÌNH LUẬN TIKTOK (GÕ 1 & GÕ 2) ================== */
const INTERACT_CONFIG = {
  MAX_FUEL: 100,
  HORN_TARGET: 5
};

let currentFuel = 0;
let currentHornCount = 0;

function updateFuelUI() {
  const valEl = document.getElementById("hud-fuel-val");
  const fillEl = document.getElementById("hud-fuel-fill");
  if (!valEl || !fillEl) return;

  const pct = Math.min(100, Math.round((currentFuel / INTERACT_CONFIG.MAX_FUEL) * 100));
  fillEl.style.width = pct + "%";

  // Xóa class trạng thái màu cũ
  fillEl.classList.remove("fuel-low", "fuel-mid", "fuel-high");

  if (currentFuel < 35) {
    // 1. Bình xăng đang ít (< 35L): Màu ĐỎ
    fillEl.classList.add("fuel-low");
    valEl.style.color = "#f87171";
    valEl.innerText = `${currentFuel}/${INTERACT_CONFIG.MAX_FUEL}L`;
  } else if (currentFuel < 75) {
    // 2. Nửa bình (35L - 74L): Màu VÀNG
    fillEl.classList.add("fuel-mid");
    valEl.style.color = "#fbbf24";
    valEl.innerText = `${currentFuel}/${INTERACT_CONFIG.MAX_FUEL}L`;
  } else {
    // 3. Gần đầy & Đầy (75L - 100L): Màu XANH
    fillEl.classList.add("fuel-high");
    valEl.style.color = "#34d399";
    if (currentFuel >= INTERACT_CONFIG.MAX_FUEL) {
      valEl.innerText = "100/100L (ĐẦY)";
    } else {
      valEl.innerText = `${currentFuel}/${INTERACT_CONFIG.MAX_FUEL}L`;
    }
  }
}

function updateHornUI() {
  const valEl = document.getElementById("hud-horn-val");
  const fillEl = document.getElementById("hud-horn-fill");
  if (!valEl || !fillEl) return;

  const pct = Math.min(100, Math.round((currentHornCount / INTERACT_CONFIG.HORN_TARGET) * 100));
  fillEl.style.width = pct + "%";
  valEl.innerText = `${currentHornCount}/${INTERACT_CONFIG.HORN_TARGET} người`;
}

function showInteractBubble(text) {
  const stage = document.getElementById("game-stage");
  if (!stage) return;
  const bubble = document.createElement("div");
  bubble.className = "floating-interact-bubble";
  bubble.innerText = text;
  stage.appendChild(bubble);
  setTimeout(() => bubble.remove(), 1600);
}

function addFuel(username = "Hành khách", amount = 1) {
  if (currentFuel >= INTERACT_CONFIG.MAX_FUEL) {
    showInteractBubble(`⛽ Bình xăng đã đầy 100L rồi!`);
    return;
  }

  const prevFuel = currentFuel;
  currentFuel = Math.min(INTERACT_CONFIG.MAX_FUEL, currentFuel + amount);
  updateFuelUI();
  playFuelSound();

  // Phát loa thông báo cảm ơn khi tiếp xăng
  if (appSettings.enableFuelVoice) {
    const rawTpl = appSettings.fuelTemplate || "Cảm ơn {username} đã tiếp thêm xăng cho xe FUONG TRANG!";
    const fuelSpeech = rawTpl
      .replace(/{username}/g, username)
      .replace(/{liters}/g, amount);
    speakStationAnnouncement(fuelSpeech);
  }

  if (currentFuel >= INTERACT_CONFIG.MAX_FUEL && prevFuel < INTERACT_CONFIG.MAX_FUEL) {
    // Đạt đủ 100L: Xe rồ ga nổ máy, ống khói xả mù mịt
    showInteractBubble(`⛽ BÌNH XĂNG ĐÃ ĐẦY 100L! XE ĐÃ NỔ MÁY!`);
    showToast("⛽ ĐẦY BÌNH XĂNG!", `${username} cùng bà con đã tiếp đủ 100L xăng cho xe!`, "⛽");
    
    if (busContainer) {
      busContainer.classList.add("engine-running");
    }
    const exhaust = document.getElementById("bus-exhaust");
    if (exhaust) exhaust.classList.add("active");

    setTimeout(() => {
      if (exhaust) exhaust.classList.remove("active");
    }, 4500);
  } else {
    showInteractBubble(`⛽ +${amount}L Xăng (${username})`);
  }
}

function addHornVote(username = "Hành khách") {
  currentHornCount++;
  updateHornUI();

  if (currentHornCount >= INTERACT_CONFIG.HORN_TARGET) {
    // Đủ 5 người: Bấm còi xe khách vang dội và nháy đèn pha
    currentHornCount = 0;
    setTimeout(updateHornUI, 800);

    if (busContainer) {
      busContainer.classList.add("honking");
      setTimeout(() => busContainer.classList.remove("honking"), 700);
    }

    playDoubleBusHorn();
    showInteractBubble(`📢 BÍP BÍP! CẢ NHÀ BẤM CÒI THÀNH CÔNG!`);
    showToast("📢 CÒI XE VANG RỘN!", `${username} & 4 hành khách vừa đồng thanh bấm còi xe!`, "📢");
  } else {
    showInteractBubble(`📢 Còi xe +1 (${currentHornCount}/${INTERACT_CONFIG.HORN_TARGET})`);
  }
}

function handleComment(username = "Hành khách", commentText = "") {
  const text = (commentText || "").trim();
  if (!text) return;

  if (text === "1" || text.startsWith("1")) {
    addFuel(username, 1);
  } else if (text === "2" || text.startsWith("2")) {
    addHornVote(username);
  }
}

/* ================== KHỞI TẠO 10 KHOANG x 2 GIƯỜNG TRÊN/DƯỚI ================== */
function initSeats() {
  seatsGrid.innerHTML = "";
  let slotIndex = 1;
  for (let comp = 1; comp <= 10; comp++) {
    const compBox = document.createElement("div");
    compBox.className = "compartment-box";
    const compNum = comp < 10 ? '0' + comp : comp;

    // Giường trên
    const topSlot = document.createElement("div");
    topSlot.className = "bunk-slot bunk-top";
    topSlot.id = `seat-slot-${slotIndex}`;
    topSlot.innerHTML = `<span class="bunk-label">G${compNum}-T</span>`;
    slotIndex++;

    // Giường dưới
    const bottomSlot = document.createElement("div");
    bottomSlot.className = "bunk-slot bunk-bottom";
    bottomSlot.id = `seat-slot-${slotIndex}`;
    bottomSlot.innerHTML = `<span class="bunk-label">G${compNum}-D</span>`;
    slotIndex++;

    compBox.appendChild(topSlot);
    compBox.appendChild(bottomSlot);
    seatsGrid.appendChild(compBox);
  }
  updateTripBoard();
}

function updateTripBoard() {
  const count = state.seatedPassengers.length;
  if (seatCountEl) seatCountEl.innerText = `${count}/${CONFIG.TOTAL_SEATS}`;
  const slotCounter = document.getElementById("slot-counter");
  if (slotCounter) slotCounter.innerText = `${count}/${CONFIG.TOTAL_SEATS}`;
  const percent = (count / CONFIG.TOTAL_SEATS) * 100;
  if (tripProgressEl) tripProgressEl.style.width = `${percent}%`;
}

/* ================== TẠO HÌNH NHÂN VẬT 2D HOẠT HÌNH ================== */
function createCharacterElement(username, gift = null) {
  const charDiv = document.createElement("div");
  charDiv.className = "char-2d";
  charDiv.id = `char-${username.replace(/\s+/g, '_')}`;

  const shirtColor = CONFIG.SHIRT_COLORS[Math.floor(Math.random() * CONFIG.SHIRT_COLORS.length)];
  const hatColor = CONFIG.HAT_COLORS[Math.floor(Math.random() * CONFIG.HAT_COLORS.length)];
  const luggageColor = CONFIG.LUGGAGE_COLORS[Math.floor(Math.random() * CONFIG.LUGGAGE_COLORS.length)];

  charDiv.innerHTML = `
    <div class="char-tag">
      <span class="char-badge">${gift ? '🎟️' : '🚶'}</span>
      <span class="char-name">${username}</span>
    </div>
    <div class="char-figure">
      <div class="char-hat" style="background: ${hatColor}"></div>
      <div class="char-head">
        <div class="char-eyes">
          <div class="eye"></div>
          <div class="eye"></div>
        </div>
      </div>
      <div class="char-body" style="background: ${shirtColor}">
        <div class="char-luggage" style="background: ${luggageColor}"></div>
      </div>
      <div class="char-legs">
        <div class="leg"></div>
        <div class="leg"></div>
      </div>
    </div>
  `;

  return charDiv;
}

/* ================== TÍNH TOÁN KHÔNG GIAN SÂN VÀ HIỆU ỨNG PHỐI CẢNH 3D ================== */
function getCourtyardBounds() {
  const stageEl = document.getElementById("game-stage");
  const busPhoto = document.getElementById("bus-photo");
  const stageRect = stageEl ? stageEl.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight, top: 0, left: 0 };

  let groundTop = stageRect.height * 0.48;
  if (busPhoto) {
    const photoRect = busPhoto.getBoundingClientRect();
    // Bánh xe tiếp đất cách mép dưới của ảnh xe khoảng 10px (do khoảng trống transparent đã trừ bớt)
    groundTop = Math.max(photoRect.bottom - stageRect.top - 12, 80);
  }

  const groundBottom = stageRect.height - 45; // Sát đáy màn hình
  const width = stageRect.width;

  return { groundTop, groundBottom, width };
}

function getPerspectiveInfo(y, groundTop, groundBottom) {
  const depthRange = Math.max(groundBottom - groundTop, 1);
  const progress = Math.max(0, Math.min(1, (y - groundTop) / depthRange));

  // Phối cảnh 3D to rõ hơn: ở xa (0.80) -> ở gần (1.45)
  const scale = 0.80 + progress * 0.65;

  // z-index: người ở gần (Y lớn) sẽ đứng đè lên người ở xa (Y nhỏ)
  const zIndex = Math.floor(10 + progress * 80);

  return { progress, scale, zIndex };
}

/* ================== SỰ KIỆN 1: NGƯỜI VÀO XEM (SÂN BẾN XE) ================== */
function onPassengerJoin(username) {
  if (state.isDeparting) return;

  if (state.farPassengers.includes(username) || state.seatedPassengers.some(p => p.username === username)) {
    return;
  }

  // Tối đa 25 người cùng lúc trên khoảng sân rộng
  if (state.farPassengers.length >= 25) {
    const oldest = state.farPassengers.shift();
    const oldEl = document.getElementById(`char-${oldest.replace(/\s+/g, '_')}`);
    if (oldEl) oldEl.remove();
  }

  state.farPassengers.push(username);
  const charEl = createCharacterElement(username);
  charEl.classList.add("walking");

  const { groundTop, groundBottom, width } = getCourtyardBounds();

  // Tọa độ Y ngẫu nhiên trải đều từ dưới bánh xe đổ xuống đáy màn hình
  const targetY = groundTop + Math.random() * (groundBottom - groundTop);
  // Tọa độ X ngẫu nhiên trên chiều ngang sân (chừa mép 30px)
  const targetX = 30 + Math.random() * Math.max(width - 120, 40);

  // Tính hiệu ứng phối cảnh: ở xa thì nhỏ, ở gần thì to
  const { scale, zIndex } = getPerspectiveInfo(targetY, groundTop, groundBottom);
  charEl.style.transform = `scale(${scale.toFixed(3)})`;
  charEl.style.zIndex = zIndex;

  // Xuất phát từ mép trái hoặc phải đi vào
  const fromLeft = Math.random() > 0.5;
  const startX = fromLeft ? -60 : width + 40;

  charEl.style.left = `${startX}px`;
  charEl.style.top = `${targetY}px`;
  farContainer.appendChild(charEl);

  setTimeout(() => {
    charEl.style.left = `${targetX}px`;
    setTimeout(() => {
      charEl.classList.remove("walking");
        // Nếu bật BOT chào người xem mới: tự động Random 1 câu trong danh sách
        if (appSettings.enableJoinVoice && appSettings.joinMessages && appSettings.joinMessages.length > 0) {
          const randomTpl = appSettings.joinMessages[Math.floor(Math.random() * appSettings.joinMessages.length)];
          const welcome = randomTpl.replace(/{username}/g, username);
          speakStationAnnouncement(welcome);
        }
      }, 850);
  }, 40);
}

/* Thỉnh thoảng nhân vật đi lại vài bước thư thái trên sân */
function wanderPassenger(charEl) {
  if (!charEl || charEl.classList.contains("walking")) return;
  const { groundTop, groundBottom, width } = getCourtyardBounds();

  const currentLeft = parseFloat(charEl.style.left) || (width / 2);
  const currentTop = parseFloat(charEl.style.top) || (groundTop + 50);

  const newX = Math.max(30, Math.min(width - 100, currentLeft + (Math.random() * 120 - 60)));
  const newY = Math.max(groundTop, Math.min(groundBottom, currentTop + (Math.random() * 60 - 30)));

  const { scale, zIndex } = getPerspectiveInfo(newY, groundTop, groundBottom);

  charEl.classList.add("walking");
  charEl.style.left = `${newX}px`;
  charEl.style.top = `${newY}px`;
  charEl.style.transform = `scale(${scale.toFixed(3)})`;
  charEl.style.zIndex = zIndex;

  setTimeout(() => {
    charEl.classList.remove("walking");
  }, 850);
}

setInterval(() => {
  if (state.isDeparting) return;
  const chars = document.querySelectorAll(".courtyard-passengers-layer .char-2d");
  if (chars.length > 0) {
    const randomChar = chars[Math.floor(Math.random() * chars.length)];
    wanderPassenger(randomChar);
  }
}, 4500);

/* ================== SỰ KIỆN 2: TẶNG QUÀ & VÀO GHẾ VIP ================== */
function onPassengerGift(username, giftName) {
  if (state.isDeparting) return;

  if (state.seatedPassengers.some(p => p.username === username)) {
    showToast("🎉 CẢM ƠN DONATE!", `${username} tặng thêm ${giftName}! Chúc bạn vui vẻ!`, "💖");
    return;
  }

  if (state.seatedPassengers.length >= CONFIG.TOTAL_SEATS) {
    showToast("⚠️ XE ĐÃ KÍN CHỖ!", `${username} vui lòng chờ chuyến sau nhé!`, "⏳");
    return;
  }

  showToast("🎟️ ĐÃ ĐẶT GIƯỜNG!", `${username} tặng ${giftName} và nhận vé giường nằm!`, "🌸");
  if (appSettings.enableGiftVoice) {
    const giftSpeech = appSettings.giftTemplate
      .replace(/{username}/g, username)
      .replace(/{gift}/g, giftName);
    speakStationAnnouncement(giftSpeech);
  }

  state.farPassengers = state.farPassengers.filter(u => u !== username);
  const existingChar = document.getElementById(`char-${username.replace(/\s+/g, '_')}`);
  if (existingChar) existingChar.remove();

  const seatIndex = state.seatedPassengers.length;
  state.seatedPassengers.push({ username, giftName });
  updateTripBoard();

  const targetSlot = document.getElementById(`seat-slot-${seatIndex + 1}`);
  if (targetSlot) {
    targetSlot.classList.add("occupied");
    const seatedChar = createCharacterElement(username, giftName);
    targetSlot.appendChild(seatedChar);
  }

  if (state.seatedPassengers.length >= CONFIG.TOTAL_SEATS) {
    setTimeout(() => {
      triggerBusDeparture();
    }, CONFIG.AUTO_DEPART_DELAY);
  }
}

/* ================== SỰ KIỆN 3: XE KHỞI HÀNH & XUẤT BẾN ================== */
function triggerBusDeparture() {
  if (state.isDeparting) return;
  state.isDeparting = true;

  if (appSettings.enableHorn) {
    playBusHorn();
  }
  if (appSettings.enableDepartVoice) {
    speakStationAnnouncement(appSettings.departTemplate);
  }
  showToast("🚌 XUẤT BẾN!", "Chuyến xe FUONG TRANG đủ 20 khách khởi hành đi Đà Lạt!", "🚀");

  setTimeout(() => {
    busContainer.classList.add("driving");
    busContainer.style.transform = "translateX(calc(100vw + 600px))";

    setTimeout(() => {
      resetTripForNextBatch();
    }, 2000);
  }, 900);
}

/* ================== LÀM MỚI CHUYẾN XE TIẾP THEO ================== */
function resetTripForNextBatch() {
  state.seatedPassengers = [];
  initSeats();

  // Đặt lại bình xăng và còi cho chuyến mới
  currentFuel = 0;
  currentHornCount = 0;
  updateFuelUI();
  updateHornUI();

  if (busContainer) {
    busContainer.classList.remove("engine-running");
    busContainer.classList.remove("honking");
  }

  busContainer.classList.remove("driving");
  busContainer.style.transition = "none";
  busContainer.style.transform = "translateX(-1600px)";

  setTimeout(() => {
    busContainer.style.transition = "transform 1.1s cubic-bezier(0.25, 1, 0.5, 1)";
    busContainer.classList.add("driving");
    busContainer.style.transform = "translateX(0)";

    setTimeout(() => {
      busContainer.classList.remove("driving");
      state.isDeparting = false;
      showToast("✨ CHUYẾN MỚI BẮT ĐẦU!", "Xe FUONG TRANG mới đã vào bến! Tặng quà để đặt vé!", "🚌");
    }, 1200);
  }, 150);
}

/* ================== TOAST THÔNG BÁO ================== */
let toastTimeout = null;
function showToast(title, desc, icon = "🌸") {
  toastAvatar.innerText = icon;
  toastTitle.innerText = title;
  toastDesc.innerText = desc;
  toastBanner.classList.remove("hidden");

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastBanner.classList.add("hidden");
  }, 3200);
}

/* ================== RENDER VÀ QUẢN LÝ DANH SÁCH CÂU CHÀO RANDOM ================== */
function renderJoinMessages() {
  const listContainer = document.getElementById("join-messages-list");
  if (!listContainer) return;
  listContainer.innerHTML = "";

  if (!appSettings.joinMessages || appSettings.joinMessages.length === 0) {
    appSettings.joinMessages = [...defaultSettings.joinMessages];
  }

  appSettings.joinMessages.forEach((msg, idx) => {
    const row = document.createElement("div");
    row.className = "message-item-row";
    row.innerHTML = `
      <input type="text" class="form-input join-msg-input" data-index="${idx}" value="${msg.replace(/"/g, '&quot;')}" placeholder="Nhập câu chào...">
      <button class="btn btn-test btn-test-single-join" data-index="${idx}" title="Nghe thử câu này" type="button">🔊</button>
      <button class="btn btn-icon-danger btn-delete-join" data-index="${idx}" title="Xóa câu này" type="button">🗑️</button>
    `;
    listContainer.appendChild(row);
  });

  // Gắn sự kiện khi sửa nội dung câu chào
  listContainer.querySelectorAll(".join-msg-input").forEach(input => {
    input.addEventListener("input", e => {
      const i = parseInt(e.target.dataset.index);
      appSettings.joinMessages[i] = e.target.value;
      saveSettings();
    });
  });

  // Gắn sự kiện nghe thử từng câu
  listContainer.querySelectorAll(".btn-test-single-join").forEach(btn => {
    btn.addEventListener("click", e => {
      const i = parseInt(e.currentTarget.dataset.index);
      const text = (appSettings.joinMessages[i] || "").replace(/{username}/g, "Bác Ba Phi");
      speakStationAnnouncement(text);
    });
  });

  // Gắn sự kiện xóa câu
  listContainer.querySelectorAll(".btn-delete-join").forEach(btn => {
    btn.addEventListener("click", e => {
      const i = parseInt(e.currentTarget.dataset.index);
      if (appSettings.joinMessages.length <= 1) {
        showToast("⚠️ KHÔNG THỂ XÓA", "Phải giữ lại ít nhất 1 câu chào!", "⚠️");
        return;
      }
      appSettings.joinMessages.splice(i, 1);
      saveSettings();
      renderJoinMessages();
    });
  });
}

/* ================== GẮN SỰ KIỆN BẢNG QUẢN TRỊ & MÔ PHỎNG ================== */
function initTestControls() {
  loadSettings();

  // Kiểm tra nếu đang mở ở chế độ OBS (URL có ?mode=obs)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("mode") === "obs" || urlParams.get("mode") === "live") {
    document.body.classList.add("obs-mode");
    const workspace = document.getElementById("workspace-layout");
    if (workspace) workspace.classList.add("obs-mode");
  }

  // 1. Đồng bộ các input cài đặt từ appSettings
  const chkJoinVoice = document.getElementById("setting-enable-join-voice");
  const chkFuelVoice = document.getElementById("setting-enable-fuel-voice");
  const inputFuelTpl = document.getElementById("setting-fuel-template");
  const chkGiftVoice = document.getElementById("setting-enable-gift-voice");
  const inputGiftTpl = document.getElementById("setting-gift-template");
  const chkDepartVoice = document.getElementById("setting-enable-depart-voice");
  const inputDepartTpl = document.getElementById("setting-depart-template");
  const chkHorn = document.getElementById("setting-enable-horn");

  if (chkJoinVoice) chkJoinVoice.checked = appSettings.enableJoinVoice;
  if (chkFuelVoice) chkFuelVoice.checked = appSettings.enableFuelVoice !== false;
  if (inputFuelTpl) inputFuelTpl.value = appSettings.fuelTemplate || "Cảm ơn {username} đã tiếp thêm xăng cho xe FUONG TRANG!";
  if (chkGiftVoice) chkGiftVoice.checked = appSettings.enableGiftVoice;
  if (inputGiftTpl) inputGiftTpl.value = appSettings.giftTemplate;
  if (chkDepartVoice) chkDepartVoice.checked = appSettings.enableDepartVoice;
  if (inputDepartTpl) inputDepartTpl.value = appSettings.departTemplate;
  if (chkHorn) chkHorn.checked = appSettings.enableHorn;

  // Lắng nghe thay đổi cài đặt
  if (chkJoinVoice) chkJoinVoice.addEventListener("change", e => {
    appSettings.enableJoinVoice = e.target.checked;
    saveSettings();
  });

  // Render danh sách câu chào nhiều câu
  renderJoinMessages();

  // Nút thêm câu chào mới
  const btnAddJoin = document.getElementById("btn-add-join-msg");
  if (btnAddJoin) {
    btnAddJoin.addEventListener("click", () => {
      appSettings.joinMessages.push("Chào mừng {username} đã ghé thăm bến xe!");
      saveSettings();
      renderJoinMessages();
      const inputs = document.querySelectorAll(".join-msg-input");
      if (inputs.length > 0) {
        inputs[inputs.length - 1].focus();
      }
    });
  }

  if (chkFuelVoice) chkFuelVoice.addEventListener("change", e => {
    appSettings.enableFuelVoice = e.target.checked;
    saveSettings();
  });
  if (inputFuelTpl) inputFuelTpl.addEventListener("input", e => {
    appSettings.fuelTemplate = e.target.value;
    saveSettings();
  });
  if (chkGiftVoice) chkGiftVoice.addEventListener("change", e => {
    appSettings.enableGiftVoice = e.target.checked;
    saveSettings();
  });
  if (inputGiftTpl) inputGiftTpl.addEventListener("input", e => {
    appSettings.giftTemplate = e.target.value;
    saveSettings();
  });
  if (chkDepartVoice) chkDepartVoice.addEventListener("change", e => {
    appSettings.enableDepartVoice = e.target.checked;
    saveSettings();
  });
  if (inputDepartTpl) inputDepartTpl.addEventListener("input", e => {
    appSettings.departTemplate = e.target.value;
    saveSettings();
  });
  if (chkHorn) chkHorn.addEventListener("change", e => {
    appSettings.enableHorn = e.target.checked;
    saveSettings();
  });

  // 2. Nút thử đọc từng câu
  const btnTestFuel = document.getElementById("btn-test-fuel-voice");
  if (btnTestFuel) {
    btnTestFuel.addEventListener("click", () => {
      const sample = (appSettings.fuelTemplate || "Cảm ơn {username} đã tiếp thêm xăng cho xe FUONG TRANG!")
        .replace(/{username}/g, "Bác Ba Phi")
        .replace(/{liters}/g, "1");
      speakStationAnnouncement(sample);
    });
  }

  const btnTestGift = document.getElementById("btn-test-gift-voice");
  if (btnTestGift) {
    btnTestGift.addEventListener("click", () => {
      const sample = (appSettings.giftTemplate || "")
        .replace(/{username}/g, "Chị Út Miền Tây")
        .replace(/{gift}/g, "Hoa Hồng");
      speakStationAnnouncement(sample);
    });
  }

  const btnTestDepart = document.getElementById("btn-test-depart-voice");
  if (btnTestDepart) {
    btnTestDepart.addEventListener("click", () => {
      speakStationAnnouncement(appSettings.departTemplate);
    });
  }

  // 3. Nút sao chép link OBS
  const btnCopyObs = document.getElementById("btn-copy-obs");
  if (btnCopyObs) {
    btnCopyObs.addEventListener("click", () => {
      const obsUrl = new URL(window.location.href);
      obsUrl.searchParams.set("mode", "obs");
      navigator.clipboard.writeText(obsUrl.toString()).then(() => {
        showToast("🎥 LINK OBS (9:16)", "Đã sao chép link! Dán vào OBS Browser Source (1080x1920)!", "📋");
      }).catch(() => {
        prompt("Sao chép liên kết này dán vào OBS Browser Source:", obsUrl.toString());
      });
    });
  }

  // 4. Các nút điều khiển mô phỏng
  const btnSimJoin = document.getElementById("btn-simulate-join");
  if (btnSimJoin) {
    btnSimJoin.addEventListener("click", () => {
      const input = document.getElementById("input-username");
      let name = input ? input.value.trim() : "";
      if (!name) {
        name = CONFIG.RANDOM_NAMES[Math.floor(Math.random() * CONFIG.RANDOM_NAMES.length)];
      }
      onPassengerJoin(name);
      if (input) input.value = CONFIG.RANDOM_NAMES[Math.floor(Math.random() * CONFIG.RANDOM_NAMES.length)];
    });
  }

  const btnSimGift = document.getElementById("btn-simulate-gift");
  if (btnSimGift) {
    btnSimGift.addEventListener("click", () => {
      const select = document.getElementById("select-gift");
      const gift = select ? select.value : "🌸 Hoa Hồng";
      let name = "";
      if (state.farPassengers.length > 0) {
        name = state.farPassengers[0];
      } else {
        name = CONFIG.RANDOM_NAMES[Math.floor(Math.random() * CONFIG.RANDOM_NAMES.length)];
      }
      onPassengerGift(name, gift);
    });
  }

  const btnQuickFill = document.getElementById("btn-quick-fill");
  if (btnQuickFill) {
    btnQuickFill.addEventListener("click", () => {
      const needed = CONFIG.TOTAL_SEATS - state.seatedPassengers.length;
      for (let i = 0; i < needed; i++) {
        setTimeout(() => {
          const dummyName = `Khách VIP ${state.seatedPassengers.length + 1}`;
          onPassengerGift(dummyName, "🌸 Hoa Hồng");
        }, i * 220);
      }
    });
  }

  const btnDepart = document.getElementById("btn-depart");
  if (btnDepart) {
    btnDepart.addEventListener("click", () => {
      triggerBusDeparture();
    });
  }

  const btnReset = document.getElementById("btn-reset");
  if (btnReset) {
    btnReset.addEventListener("click", () => {
      resetTripForNextBatch();
    });
  }

  // 5. Các nút mô phỏng bình luận tương tác (Gõ 1 & 2)
  const getSimUserName = () => {
    const input = document.getElementById("input-username");
    return (input && input.value.trim()) || "Khách VIP";
  };

  const btnSimFuel1 = document.getElementById("btn-sim-fuel-1");
  if (btnSimFuel1) {
    btnSimFuel1.addEventListener("click", () => {
      addFuel(getSimUserName(), 1);
    });
  }

  const btnSimFuel10 = document.getElementById("btn-sim-fuel-10");
  if (btnSimFuel10) {
    btnSimFuel10.addEventListener("click", () => {
      addFuel(getSimUserName(), 10);
    });
  }

  const btnSimHorn = document.getElementById("btn-sim-horn");
  if (btnSimHorn) {
    btnSimHorn.addEventListener("click", () => {
      addHornVote(getSimUserName());
    });
  }

  const btnSimCmtSend = document.getElementById("btn-sim-comment-send");
  const inputSimCmt = document.getElementById("input-sim-comment");
  if (btnSimCmtSend && inputSimCmt) {
    const sendCmt = () => {
      const val = inputSimCmt.value.trim();
      if (val) {
        handleComment(getSimUserName(), val);
      }
    };
    btnSimCmtSend.addEventListener("click", sendCmt);
    inputSimCmt.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        sendCmt();
      }
    });
  }

  // Cập nhật giao diện ban đầu cho bảng tương tác
  updateFuelUI();
  updateHornUI();

  const chkAuto = document.getElementById("chk-auto-demo");
  if (chkAuto) {
    chkAuto.addEventListener("change", e => {
      if (e.target.checked) {
        startAutoDemo();
      } else {
        stopAutoDemo();
      }
    });
  }
}

function startAutoDemo() {
  if (state.autoDemoInterval) clearInterval(state.autoDemoInterval);
  state.autoDemoInterval = setInterval(() => {
    if (state.isDeparting) return;

    const rand = Math.random();
    if (rand < 0.4) {
      // 40% người vào xem
      const name = CONFIG.RANDOM_NAMES[Math.floor(Math.random() * CONFIG.RANDOM_NAMES.length)];
      onPassengerJoin(name);
    } else if (rand < 0.75) {
      // 35% người cmt tương tác (gõ 1 tiếp xăng hoặc gõ 2 bấm còi)
      const cmt = Math.random() < 0.65 ? "1" : "2";
      const name = state.farPassengers.length > 0
        ? state.farPassengers[Math.floor(Math.random() * state.farPassengers.length)]
        : CONFIG.RANDOM_NAMES[Math.floor(Math.random() * CONFIG.RANDOM_NAMES.length)];
      handleComment(name, cmt);
    } else {
      // 25% người tặng quà để lên xe
      const gifts = ["🌸 Hoa Hồng", "🍦 Cây Kem", "🧢 Nón Lá", "💖 Trái Tim"];
      const gift = gifts[Math.floor(Math.random() * gifts.length)];
      const name = state.farPassengers.length > 0
        ? state.farPassengers[Math.floor(Math.random() * state.farPassengers.length)]
        : CONFIG.RANDOM_NAMES[Math.floor(Math.random() * CONFIG.RANDOM_NAMES.length)];
      onPassengerGift(name, gift);
    }
  }, 1600);
}

function stopAutoDemo() {
  if (state.autoDemoInterval) {
    clearInterval(state.autoDemoInterval);
    state.autoDemoInterval = null;
  }
}

/* ================== SPRITE FRAMES CHO CHARACTER_1 & CHARACTER_2 ================== */
const SPRITE_FRAMES_CHAR1 = [
  "public/CHARACTER_1/1.png",
  "public/CHARACTER_1/2.png",
  "public/CHARACTER_1/3.png",
  "public/CHARACTER_1/4.png",
  "public/CHARACTER_1/5.png"
];

const SPRITE_FRAMES_CHAR2 = [
  "public/CHARACTER_2/1.png",
  "public/CHARACTER_2/2.png",
  "public/CHARACTER_2/3.png",
  "public/CHARACTER_2/4.png",
  "public/CHARACTER_2/5.png"
];

// Preload tất cả các frame ảnh của cả 2 nhân vật để chuyển động mượt mà không chớp giật
[...SPRITE_FRAMES_CHAR1, ...SPRITE_FRAMES_CHAR2].forEach(src => {
  const img = new Image();
  img.src = src;
});

/* Lớp quản lý hoạt ảnh và chuyển động cho nhân vật Sprite */
class SpriteActor {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.badge = config.badge || "⭐";
    this.frames = config.frames;
    this.speed = config.speed || 135;
    this.frameDuration = config.frameDuration || 100;
    this.startXRatio = config.startXRatio || 0.5;
    this.startYRatio = config.startYRatio || 0.5;
    this.isControllable = config.isControllable || false; // Cho phép điều khiển bằng phím

    this.x = 100;
    this.y = 100;
    this.targetX = 100;
    this.targetY = 100;
    this.frame = 0;
    this.frameTimer = 0;
    this.direction = 1;
    this.idleTimer = 1.0 + Math.random() * 2.0;

    this.createDOM(config.container);
  }

  createDOM(container) {
    this.el = document.createElement("div");
    this.el.className = "char-2d char-sprite";
    this.el.id = this.id;
    this.el.innerHTML = `
      <div class="char-tag">
        <span class="char-badge">${this.badge}</span>
        <span class="char-name">${this.name}</span>
      </div>
      <div class="char-sprite-wrapper">
        <img src="${this.frames[0]}" class="char-sprite-img" alt="${this.name}">
      </div>
    `;
    container.appendChild(this.el);

    this.wrapperEl = this.el.querySelector(".char-sprite-wrapper");
    this.imgEl = this.el.querySelector(".char-sprite-img");

    const bounds = getCourtyardBounds();
    this.x = bounds.width * this.startXRatio - 29;
    this.y = bounds.groundTop + (bounds.groundBottom - bounds.groundTop) * this.startYRatio;
    this.targetX = this.x;
    this.targetY = this.y;
  }

  update(dt, bounds, keys) {
    const minX = 25;
    const maxX = Math.max(bounds.width - 75, minX + 50);
    const minY = bounds.groundTop;
    const maxY = bounds.groundBottom;

    let isMoving = false;

    // 1. Nếu có hỗ trợ phím và người dùng đang nhấn phím điều khiển
    if (this.isControllable && keys) {
      let dx = 0;
      let dy = 0;
      if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) dx--;
      if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) dx++;
      if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) dy--;
      if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) dy++;

      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        dx /= len;
        dy /= len;

        this.x += dx * this.speed * dt;
        this.y += dy * this.speed * dt;
        this.targetX = this.x;
        this.targetY = this.y;

        if (dx !== 0) this.direction = dx > 0 ? 1 : -1;
        isMoving = true;
        this.idleTimer = 2.0;
      }
    }

    // 2. Chế độ tự động thong thả đi dạo khắp khoảng sân được phép di chuyển
    if (!isMoving) {
      const dist = Math.hypot(this.targetX - this.x, this.targetY - this.y);
      if (dist > 5) {
        const autoDx = (this.targetX - this.x) / dist;
        const autoDy = (this.targetY - this.y) / dist;

        this.x += autoDx * (this.speed * 0.72) * dt;
        this.y += autoDy * (this.speed * 0.72) * dt;

        if (Math.abs(autoDx) > 0.08) {
          this.direction = autoDx > 0 ? 1 : -1;
        }
        isMoving = true;
      } else {
        // Đã đến điểm đích, đứng yên tại chỗ ngắm cảnh rồi chọn điểm mới
        this.idleTimer -= dt;
        if (this.idleTimer <= 0) {
          this.targetX = minX + Math.random() * (maxX - minX);
          this.targetY = minY + Math.random() * (maxY - minY);
          this.idleTimer = 2.0 + Math.random() * 4.0; // Đứng nghỉ 2 - 6 giây
        }
      }
    }

    // Giữ nhân vật luôn nằm trong ranh giới sân được phép di chuyển (từ dưới bánh xe đến đáy màn hình)
    this.x = Math.max(minX, Math.min(this.x, maxX));
    this.y = Math.max(minY, Math.min(this.y, maxY));

    // 3. Hoạt ảnh bước chân:
    // Khi di chuyển: chạy chuỗi ảnh từ 1 đến 5
    // Khi đứng yên: hiển thị đúng ảnh 1
    if (isMoving) {
      this.frameTimer += dt * 1000;
      if (this.frameTimer >= this.frameDuration) {
        this.frame = (this.frame + 1) % this.frames.length;
        this.frameTimer %= this.frameDuration;
      }
    } else {
      this.frame = 0; // Đứng yên là ảnh 1.png
      this.frameTimer = 0;
    }

    // Cập nhật nguồn ảnh
    const currentSrc = this.frames[this.frame];
    if (this.imgEl.getAttribute("src") !== currentSrc) {
      this.imgEl.src = currentSrc;
    }

    // 4. Hiệu ứng phối cảnh 3D: ở xa thì nhỏ, ở gần thì to
    const depth = getPerspectiveInfo(this.y, minY, maxY);
    this.el.style.left = `${this.x}px`;
    this.el.style.top = `${this.y}px`;
    this.el.style.transform = `scale(${depth.scale.toFixed(3)})`;
    this.el.style.zIndex = depth.zIndex;

    // Hướng nhìn nhân vật (lật ảnh qua scaleX mà không làm ngược chữ bảng tên)
    this.wrapperEl.style.transform = `scaleX(${this.direction})`;
  }
}

/* Danh sách các nhân vật Sprite đang hoạt động trên sân */
const spriteActors = [];

function initSpritePlayers() {
  const container = document.getElementById("far-passengers-container");
  if (!container) return;

  // 1. Tạo nhân vật CHARACTER_1 (Hành Khách VIP 1 - hỗ trợ điều khiển phím mũi tên)
  const char1 = new SpriteActor({
    id: "sprite-player-char1",
    name: "Hành Khách VIP 1",
    badge: "⭐",
    frames: SPRITE_FRAMES_CHAR1,
    container: container,
    startXRatio: 0.38,
    startYRatio: 0.52,
    speed: 135,
    isControllable: true
  });
  spriteActors.push(char1);

  // 2. Tạo nhân vật CHARACTER_2 (Hành Khách VIP 2 - hoạt ảnh giống CHARACTER_1)
  const char2 = new SpriteActor({
    id: "sprite-player-char2",
    name: "Hành Khách VIP 2",
    badge: "🌸",
    frames: SPRITE_FRAMES_CHAR2,
    container: container,
    startXRatio: 0.65,
    startYRatio: 0.68,
    speed: 125,
    isControllable: false
  });
  spriteActors.push(char2);

  // Hỗ trợ phím mũi tên & WASD điều khiển trực tiếp
  const keys = new Set();
  window.addEventListener("keydown", e => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "W", "A", "S", "D"].includes(e.key)) {
      keys.add(e.key);
    }
  });

  window.addEventListener("keyup", e => {
    keys.delete(e.key);
  });

  window.addEventListener("blur", () => keys.clear());

  // Vòng lặp chuyển động mượt mà 60fps bằng requestAnimationFrame cho tất cả nhân vật
  let lastTime = 0;
  function updateAllSpritesLoop(time) {
    if (!lastTime) lastTime = time;
    const dt = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;

    const bounds = getCourtyardBounds();
    spriteActors.forEach(actor => {
      actor.update(dt, bounds, keys);
    });

    requestAnimationFrame(updateAllSpritesLoop);
  }

  requestAnimationFrame(updateAllSpritesLoop);
}

// Khởi động
document.addEventListener("DOMContentLoaded", () => {
  initSeats();
  initTestControls();
  initSpritePlayers(); // Khởi tạo cả CHARACTER_1 và CHARACTER_2

  setTimeout(() => onPassengerJoin("Bác Ba Phi"), 500);
  setTimeout(() => onPassengerJoin("Chị Út Miền Tây"), 900);
});