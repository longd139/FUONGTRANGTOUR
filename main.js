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
  currentPhase: 1,      // 1: Bến xe (Phase 1), 2: Trong xe (Phase 2)
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
  enableFuelVoice: true,
  fuelMessages: [
    "Cảm ơn {username} đã tiếp thêm xăng cho xe FUONG TRANG!",
    "Cảm ơn quý khách {username} đã đổ xăng, xe sắp nổ máy rồi!",
    "{username} vừa tiếp xăng cho xe, cảm ơn bạn nhiều nha!",
    "Bác tài gửi lời cảm ơn {username} đã thêm nhiên liệu cho chuyến đi Đà Lạt!"
  ],
  enableGiftVoice: true,
  giftMessages: [
    "Mời quý khách {username} vào giường nằm VIP!",
    "Cảm ơn {username} đã tặng {gift}, chúc quý khách một chuyến đi êm ái!",
    "Vé VIP giường nằm đã thuộc về {username}, mời bạn lên xe nghỉ ngơi!",
    "Hoan nghênh {username} lên xe FUONG TRANG đi Đà Lạt ngắm hoa!"
  ],
  enableDepartVoice: true,
  departMessages: [
    "Chuyến xe FUONG TRANG đi Đà Lạt đã đủ 20 hành khách, chuẩn bị khởi hành! Chúc bà con thượng lộ bình an!",
    "Đã đủ 20 khách, xe FUONG TRANG xuất bến ngay đây! Bà con thắt dây an toàn nhé!",
    "Xe chuẩn bị lăn bánh rời bến, tạm biệt mọi người và hẹn gặp lại ở Đà Lạt!"
  ],
  enableHorn: true,
  enableGuideVoice: true,
  enableGiftChangeMusic: true,
  guideMessages: [
    {
      q: "Đố vui có thưởng trên xe: Ai biết đặc sản trái cây nổi tiếng nhất Đà Lạt là gì không?",
      a: "Đáp án chính xác: Dâu tây Đà Lạt nha bà con!"
    },
    {
      q: "Đố vui: Món ăn vặt đường phố nào được mệnh danh là 'Pizza Đà Lạt'?",
      a: "Đáp án là: Bánh tráng nướng Đà Lạt giòn rụm thơm ngon!"
    },
    {
      q: "Đố vui: Hồ nước ngọt thơ mộng nằm ngay trung tâm thành phố Đà Lạt tên là gì?",
      a: "Đáp án chính là: Hồ Xuân Hương thơ mộng!"
    },
    {
      q: "Đố vui: Đà Lạt còn được người ta gọi bằng mỹ danh là thành phố ngàn gì?",
      a: "Đáp án là: Thành phố ngàn hoa (hoặc Thành phố ngàn thông)!"
    },
    {
      q: "Giao lưu: Chào mừng 20 hành khách! Bà con mình ai có bài hát nào hay góp vui cùng chuyến xe không ạ?",
      a: "Cảm ơn bà con đã nhiệt tình tham gia giao lưu cùng chuyến xe FUONG TRANG!"
    }
  ]
};

let appSettings = { ...defaultSettings };

function loadSettings() {
  try {
    const saved = localStorage.getItem("fuong_trang_admin_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      appSettings = { ...defaultSettings, ...parsed };
      if (parsed.guideMessages && parsed.guideMessages.length > 0) {
        appSettings.guideMessages = parsed.guideMessages.map(item => {
          if (typeof item === "string") {
            return { q: item, a: "Đáp án đã có sẵn tại Đà Lạt nha bà con!" };
          }
          return { q: item.q || "", a: item.a || "" };
        });
      }
      if (parsed.enableGuideVoice !== undefined) {
        appSettings.enableGuideVoice = parsed.enableGuideVoice;
      }
      // Tương thích ngược nếu trước đó lưu dạng chuỗi đơn
      if (parsed.joinTemplate && (!parsed.joinMessages || parsed.joinMessages.length === 0)) {
        appSettings.joinMessages = [parsed.joinTemplate];
      }
      if (parsed.fuelTemplate && (!parsed.fuelMessages || parsed.fuelMessages.length === 0)) {
        appSettings.fuelMessages = [parsed.fuelTemplate];
      }
      if (parsed.giftTemplate && (!parsed.giftMessages || parsed.giftMessages.length === 0)) {
        appSettings.giftMessages = [parsed.giftTemplate];
      }
      if (parsed.departTemplate && (!parsed.departMessages || parsed.departMessages.length === 0)) {
        appSettings.departMessages = [parsed.departTemplate];
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
    const msgs = (appSettings.fuelMessages && appSettings.fuelMessages.length > 0)
      ? appSettings.fuelMessages
      : defaultSettings.fuelMessages;
    const rawTpl = msgs[Math.floor(Math.random() * msgs.length)];
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

    // Kiểm tra điều kiện xuất bến (khi vừa đổ đầy 100L xăng)
    checkDepartureCondition();
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

  // 1. Kiểm tra nếu có câu đố vui của HDV đang chờ người trả lời đúng
  if (checkGuideQuizAnswer(username, text)) {
    return;
  }

  // 2. Tương tác gõ 1 (tiếp xăng) và gõ 2 (bình chọn bấm còi)
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

/* ================== QUẢN LÝ VÀ TẠO HÌNH CHARACTER 1, 2, 3, 4, 5 CHO HÀNH KHÁCH ================== */
const userCharMap = new Map();

function getCharacterTypeForUser(username) {
  if (userCharMap.has(username)) {
    return userCharMap.get(username);
  }
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = (hash << 5) - hash + username.charCodeAt(i);
    hash |= 0;
  }
  const charNum = (Math.abs(hash) % 5) + 1; // Luôn ra từ 1 đến 5
  userCharMap.set(username, charNum);
  return charNum;
}

function createCharacterElement(username, gift = null) {
  const charDiv = document.createElement("div");
  charDiv.className = "char-2d char-sprite";
  charDiv.id = `char-${username.replace(/\s+/g, '_')}`;

  const charNum = getCharacterTypeForUser(username);
  const imgSrc = `public/CHARACTER_${charNum}/1.png`;

  charDiv.innerHTML = `
    <div class="char-tag">
      <span class="char-name">${username}</span>
    </div>
    <div class="char-sprite-wrapper">
      <img src="${imgSrc}" class="char-sprite-img" alt="${username}">
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

  // 1. Tự động đổi nhạc khi khán giả tặng quà
  if (appSettings.enableGiftChangeMusic !== false) {
    triggerMusicChangeByGift(username, giftName);
  }

  if (state.seatedPassengers.some(p => p.username === username)) {
    showToast("🎉 CẢM ƠN DONATE!", `${username} tặng thêm ${giftName}! Bác tài đã đổi bài hát!`, "💖");
    return;
  }

  if (state.seatedPassengers.length >= CONFIG.TOTAL_SEATS) {
    showToast("⚠️ XE ĐÃ KÍN CHỖ!", `${username} tặng ${giftName} đổi bài hát thành công!`, "🎶");
    return;
  }

  showToast("🎟️ ĐÃ ĐẶT GIƯỜNG!", `${username} tặng ${giftName} và nhận vé giường nằm!`, "🌸");
  if (appSettings.enableGiftVoice && state.currentPhase !== 2) {
    const msgs = (appSettings.giftMessages && appSettings.giftMessages.length > 0)
      ? appSettings.giftMessages
      : defaultSettings.giftMessages;
    const rawTpl = msgs[Math.floor(Math.random() * msgs.length)];
    const giftSpeech = rawTpl
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

  // Nếu đang ở Phase 2 (Trong xe), cập nhật ngay nhân vật lên ghế xanh
  if (state.currentPhase === 2) {
    renderCabinPassengers();
  }

  // Kiểm tra điều kiện xuất bến: Bắt buộc cả ĐỦ 20 NGƯỜI VÀ ĐẦY 100L XĂNG
  checkDepartureCondition();
}

/* ================== KIỂM TRA ĐIỀU KIỆN XUẤT BẾN: ĐỦ 20 NGƯỜI & ĐẦY 100L XĂNG ================== */
function checkDepartureCondition() {
  if (state.isDeparting) return;

  const isFullSeats = state.seatedPassengers.length >= CONFIG.TOTAL_SEATS;
  const isFullFuel = currentFuel >= INTERACT_CONFIG.MAX_FUEL;

  if (isFullSeats && isFullFuel) {
    // Thỏa mãn cả 2 điều kiện: Đủ 20 người VÀ Đầy 100L xăng
    showToast("🚀 ĐỦ ĐIỀU KIỆN XUẤT BẾN!", "Đã đủ 20 khách và 100L xăng! Xe FUONG TRANG bắt đầu khởi hành!", "🚌");
    setTimeout(() => {
      triggerBusDeparture();
    }, 1500);
  } else if (isFullSeats && !isFullFuel) {
    // Đã đủ 20 người nhưng CHƯA ĐẦY XĂNG
    showToast("⚠️ CHƯA THỂ XUẤT BẾN!", `Đã đủ 20 khách nhưng chưa đủ xăng (${currentFuel}/100L)! Hãy bình luận '1' để tiếp xăng!`, "⛽");
  } else if (!isFullSeats && isFullFuel) {
    // Đã đầy 100L xăng nhưng CHƯA ĐỦ 20 NGƯỜI
    const remaining = CONFIG.TOTAL_SEATS - state.seatedPassengers.length;
    showToast("⛽ BÌNH XĂNG ĐÃ ĐẦY!", `Xe đã đầy 100L xăng! Đang chờ thêm ${remaining} khách nữa để xuất bến!`, "⏳");
  }
}

/* ================== TỌA ĐỘ 20 CHIẾC GHẾ XANH TRONG XE (PHASE 2 - 5 HÀNG x 4 GHẾ) ================== */
const CABIN_SEATS = [
  // Hàng 5 (xa nhất, gần buồng lái tài xế)
  { x: 27.0, y: 42.8, scale: 0.48, zIndex: 11 },
  { x: 36.8, y: 42.8, scale: 0.48, zIndex: 11 },
  { x: 63.2, y: 42.8, scale: 0.48, zIndex: 11 },
  { x: 73.0, y: 42.8, scale: 0.48, zIndex: 11 },

  // Hàng 4
  { x: 22.8, y: 47.0, scale: 0.58, zIndex: 12 },
  { x: 34.8, y: 47.0, scale: 0.58, zIndex: 12 },
  { x: 65.2, y: 47.0, scale: 0.58, zIndex: 12 },
  { x: 77.2, y: 47.0, scale: 0.58, zIndex: 12 },

  // Hàng 3
  { x: 17.0, y: 54.0, scale: 0.70, zIndex: 13 },
  { x: 31.8, y: 54.0, scale: 0.70, zIndex: 13 },
  { x: 68.2, y: 54.0, scale: 0.70, zIndex: 13 },
  { x: 83.0, y: 54.0, scale: 0.70, zIndex: 13 },

  // Hàng 2
  { x: 11.2, y: 63.8, scale: 0.86, zIndex: 14 },
  { x: 28.5, y: 63.8, scale: 0.86, zIndex: 14 },
  { x: 71.5, y: 63.8, scale: 0.86, zIndex: 14 },
  { x: 88.8, y: 63.8, scale: 0.86, zIndex: 14 },

  // Hàng 1 (gần nhất dưới đáy màn hình)
  { x: 9.2,  y: 76.5, scale: 1.08, zIndex: 15 },
  { x: 26.2, y: 76.5, scale: 1.08, zIndex: 15 },
  { x: 73.8, y: 76.5, scale: 1.08, zIndex: 15 },
  { x: 90.8, y: 76.5, scale: 1.08, zIndex: 15 }
];

/* Hiển thị toàn bộ hành khách đã mua vé ngồi ngay ngắn lên 20 chiếc ghế xanh trong xe */
function renderCabinPassengers() {
  const layer = document.getElementById("cabin-passengers-layer");
  if (!layer) return;
  layer.innerHTML = "";

  const countEl = document.getElementById("cabin-passenger-count");
  if (countEl) {
    countEl.innerText = `👥 ${state.seatedPassengers.length}/20 HÀNH KHÁCH`;
  }

  state.seatedPassengers.forEach((passenger, idx) => {
    if (idx >= CABIN_SEATS.length) return;
    const seat = CABIN_SEATS[idx];
    const charEl = createCharacterElement(passenger.username, passenger.giftName);
    charEl.id = `cabin-char-${passenger.username.replace(/\s+/g, '_')}`;
    charEl.className = "cabin-passenger-seat";
    if (typeof isCabinDancing !== "undefined" && isCabinDancing) {
      charEl.classList.add("dancing", `dancing-${currentDanceMode}`);
    }
    charEl.style.left = `${seat.x}%`;
    charEl.style.top = `${seat.y}%`;
    charEl.style.zIndex = seat.zIndex;
    charEl.style.setProperty("--seat-scale", seat.scale.toFixed(3));
    charEl.style.transform = `translate(-50%, -88%) scale(${seat.scale.toFixed(3)})`;
    charEl.style.animationDelay = `${(idx % 5) * 0.12}s`;
    layer.appendChild(charEl);
  });
}

/* ================== HOẠT ĐỘNG CỦA HƯỚNG DẪN VIÊN TRÊN XE (PHASE 2) ================== */
let guideBubbleTimeout = null;
let guideAutoTimer = null;
let guideAnswerAutoTimeout = null;
let guideQuizCountdownInterval = null;
let currentActiveQA = null; // Lưu câu hỏi & đáp án đang kích hoạt để người dùng trả lời

function clearGuideQuizTimers() {
  if (guideAnswerAutoTimeout) {
    clearTimeout(guideAnswerAutoTimeout);
    guideAnswerAutoTimeout = null;
  }
  if (guideQuizCountdownInterval) {
    clearInterval(guideQuizCountdownInterval);
    guideQuizCountdownInterval = null;
  }
}

// Hàm loại bỏ tiền tố đáp án ("Đáp án là:", "Đáp án chính xác:",...)
function stripAnswerPrefixSuffix(str) {
  let s = (str || "").trim();
  s = s.replace(/^(đáp án\s*(chính xác|chính)?\s*(là)?\s*:\s*)/i, "");
  s = s.replace(/^(câu trả lời\s*(chính xác)?\s*(là)?\s*:\s*)/i, "");
  s = s.replace(/^(kết quả\s*(là)?\s*:\s*)/i, "");
  return s.trim();
}

// Bỏ dấu tiếng Việt để so khớp linh hoạt có dấu hoặc không dấu
function removeVietnameseTones(str) {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

// Làm sạch văn bản để so khớp
function cleanTextForMatching(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Thuật toán kiểm tra bình luận của người xem có đúng đáp án không
function isAnswerMatching(userComment, rawAnswer) {
  if (!userComment || !rawAnswer) return false;

  const coreAnswer = stripAnswerPrefixSuffix(rawAnswer);
  const cleanAnsWithTone = cleanTextForMatching(coreAnswer);
  const cleanAnsNoTone = removeVietnameseTones(cleanAnsWithTone);

  const cleanCmtWithTone = cleanTextForMatching(userComment);
  const cleanCmtNoTone = removeVietnameseTones(cleanCmtWithTone);

  // Nếu comment quá ngắn (< 2 ký tự) hoặc chỉ là gõ 1, 2 thì không tính
  if (cleanCmtNoTone.length < 2 || cleanCmtNoTone === "1" || cleanCmtNoTone === "2") {
    return false;
  }

  // 1. Khớp chính xác hoàn toàn (có dấu hoặc không dấu)
  if (cleanAnsWithTone === cleanCmtWithTone || cleanAnsNoTone === cleanCmtNoTone) {
    return true;
  }

  // 2. Nếu đáp án có chứa số (như biển số xe, ngày tháng) và comment chứa số đó
  const numbersInAns = cleanAnsNoTone.match(/\d+/g);
  if (numbersInAns && numbersInAns.some(num => cleanCmtNoTone.includes(num))) {
    return true;
  }

  // 3. Từ khóa bỏ qua (từ nối, cảm thán phổ biến)
  const stopWords = new Set([
    "nha", "nhe", "ba", "con", "oi", "la", "cua", "cac", "nhung", "mot", 
    "chinh", "xac", "rat", "thom", "ngon", "tho", "mong", "hoac", "thanh", "pho"
  ]);

  // Tạo các cụm 2 từ (bigrams) từ đáp án không dấu
  const wordsNoTone = cleanAnsNoTone.split(" ").filter(w => w.length > 0);
  const ansBigrams = [];
  for (let i = 0; i < wordsNoTone.length - 1; i++) {
    const w1 = wordsNoTone[i];
    const w2 = wordsNoTone[i + 1];
    if (!stopWords.has(w1) || !stopWords.has(w2)) {
      ansBigrams.push(`${w1} ${w2}`);
    }
  }

  // Kiểm tra nếu comment chứa cụm 2 từ chính của đáp án (ví dụ "dau tay", "banh trang", "xuan huong")
  for (const bg of ansBigrams) {
    if (cleanCmtNoTone.includes(bg)) {
      return true;
    }
  }

  // 4. Nếu người dùng gõ ngắn gọn và chuỗi đó nằm trọn trong đáp án (từ 3 ký tự trở lên)
  if (cleanCmtNoTone.length >= 3 && cleanAnsNoTone.includes(cleanCmtNoTone)) {
    return true;
  }

  // 5. Nếu đáp án có các từ khóa đặc trưng (dài >= 4 ký tự) nằm trong comment (ví dụ "atiso")
  const keyWords = wordsNoTone.filter(w => w.length >= 4 && !stopWords.has(w));
  for (const kw of keyWords) {
    if (cleanCmtNoTone.includes(kw)) {
      return true;
    }
  }

  return false;
}

// Âm thanh chúc mừng người trả lời đúng (Web Audio API)
function playSuccessChime() {
  try {
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    const now = audioCtx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // Hợp âm C5, E5, G5, C6 tươi vui
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      gain.gain.setValueAtTime(0.2, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.4);
    });
  } catch (e) {}
}

// Hiển thị bong bóng vinh danh người trả lời đúng
function showGuideWinnerBubble(winnerName, rawAnswer) {
  const guideEl = document.getElementById("cabin-tour-guide");
  const bubbleEl = document.getElementById("guide-bubble");
  const typeEl = document.getElementById("guide-bubble-type");
  const textEl = document.getElementById("guide-speech-text");
  if (!guideEl || !bubbleEl || !textEl) return;

  if (typeEl) {
    typeEl.innerText = "🏆 CHÍNH XÁC - CHÚC MỪNG!";
    typeEl.className = "guide-bubble-header type-winner";
  }

  const cleanAns = stripAnswerPrefixSuffix(rawAnswer);
  textEl.innerHTML = `🎉 Chúc mừng <b style="color:#fbbf24;">@${winnerName}</b>!<br>Đáp án: <b style="color:#34d399;">${cleanAns}</b>`;
  bubbleEl.classList.remove("hidden");
  guideEl.classList.add("speaking");

  if (guideBubbleTimeout) clearTimeout(guideBubbleTimeout);
  guideBubbleTimeout = setTimeout(() => {
    bubbleEl.classList.add("hidden");
    guideEl.classList.remove("speaking");
  }, 8500);
}

// Hàm kiểm tra bình luận của người xem khi có câu hỏi HDV đang hoạt động
function checkGuideQuizAnswer(username, commentText) {
  if (!currentActiveQA || currentActiveQA.answered || !currentActiveQA.a) {
    return false;
  }

  if (isAnswerMatching(commentText, currentActiveQA.a)) {
    currentActiveQA.answered = true;
    clearGuideQuizTimers(); // Lập tức dừng bộ đếm 2 phút

    const winnerName = (username || "Bạn khán giả").trim();
    const cleanAns = stripAnswerPrefixSuffix(currentActiveQA.a);

    // 1. Phát nhạc chúc mừng
    playSuccessChime();

    // 2. Hiển thị bong bóng vinh danh người trả lời đúng
    showGuideWinnerBubble(winnerName, currentActiveQA.a);

    // 3. Hướng dẫn viên đọc to tên người dùng trả lời đúng
    const praiseSpeech = `Chúc mừng bạn ${winnerName} đã trả lời rất chính xác! Đáp án là ${cleanAns}!`;
    if (appSettings.enableGuideVoice) {
      speakStationAnnouncement(praiseSpeech);
    }

    // 4. Thông báo Toast nổi bật
    showToast("🏆 TRẢ LỜI CHÍNH XÁC!", `${winnerName} vừa trả lời đúng: ${cleanAns}`, "🎉");
    return true;
  }

  return false;
}

function showGuideBubble(typeTitle, text, isAnswer = false, autoHideDelay = 6500) {
  const guideEl = document.getElementById("cabin-tour-guide");
  const bubbleEl = document.getElementById("guide-bubble");
  const typeEl = document.getElementById("guide-bubble-type");
  const textEl = document.getElementById("guide-speech-text");
  if (!guideEl || !bubbleEl || !textEl) return;

  if (typeEl) {
    typeEl.innerText = typeTitle;
    typeEl.className = "guide-bubble-header";
    if (isAnswer) {
      typeEl.classList.add("type-answer");
    }
  }

  textEl.innerHTML = text;
  bubbleEl.classList.remove("hidden");
  guideEl.classList.add("speaking");

  if (guideBubbleTimeout) {
    clearTimeout(guideBubbleTimeout);
    guideBubbleTimeout = null;
  }

  // Tự động tắt cử động miệng nói của HDV sau 4.5s
  setTimeout(() => {
    if (guideEl) guideEl.classList.remove("speaking");
  }, 4500);

  // Nếu autoHideDelay là số > 0 thì tự ẩn sau ngần ấy ms. Nếu là false/null thì GIỮ NGUYÊN BONG BÓNG trên màn hình.
  if (typeof autoHideDelay === "number" && autoHideDelay > 0) {
    guideBubbleTimeout = setTimeout(() => {
      bubbleEl.classList.add("hidden");
      guideEl.classList.remove("speaking");
    }, autoHideDelay);
  }
}

function triggerGuideActivity(question = null, answer = null) {
  clearGuideQuizTimers();

  const msgs = (appSettings.guideMessages && appSettings.guideMessages.length > 0)
    ? appSettings.guideMessages
    : defaultSettings.guideMessages;

  let selected = null;
  if (question) {
    selected = { q: question, a: answer || "" };
  } else {
    selected = msgs[Math.floor(Math.random() * msgs.length)];
  }

  const qText = typeof selected === "string" ? selected : selected.q;
  const aText = typeof selected === "string" ? "" : selected.a;

  // Lưu câu hỏi & đáp án đang kích hoạt để người xem có thể bình luận trả lời
  currentActiveQA = {
    q: qText,
    a: aText,
    answered: false,
    askedAt: Date.now()
  };

  // HDV phát thanh đọc câu hỏi lên xe
  if (appSettings.enableGuideVoice) {
    speakStationAnnouncement(qText);
  }

  // Nếu không có đáp án (chỉ là câu chào/giao lưu) thì hiện 8 giây rồi ẩn
  if (!aText) {
    showGuideBubble("📢 HƯỚNG DẪN VIÊN", qText, false, 8000);
    return;
  }

  // Đếm ngược 2 phút = 120 giây
  let remainingSec = 120;

  function updateQuizCountdownHeader() {
    const m = Math.floor(remainingSec / 60);
    const s = remainingSec % 60;
    const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    const typeEl = document.getElementById("guide-bubble-type");
    if (typeEl) {
      typeEl.innerText = `❓ ĐỐ VUI CÓ THƯỞNG (${timeStr})`;
    }
  }

  // Bước 1: Hiển thị câu hỏi đố vui lên màn hình và GIỮ NGUYÊN (autoHideDelay = false) trong suốt 2 phút
  showGuideBubble("❓ ĐỐ VUI CÓ THƯỞNG (02:00)", qText, false, false);

  // Bước 2: Đếm ngược từng giây trong 2 phút; nếu hết giờ mà chưa ai trả lời -> Tự động đọc và hiện đáp án
  guideQuizCountdownInterval = setInterval(() => {
    remainingSec--;
    if (remainingSec > 0) {
      updateQuizCountdownHeader();
    } else {
      clearGuideQuizTimers();
      if (currentActiveQA && !currentActiveQA.answered) {
        currentActiveQA.answered = true;
        const cleanAns = stripAnswerPrefixSuffix(currentActiveQA.a);
        const timeoutSpeech = `Hết giờ đố vui rồi bà con ơi! Đáp án chính xác là: ${cleanAns}!`;

        showGuideBubble(
          "💡 HẾT GIỜ - ĐÁP ÁN CHÍNH XÁC",
          `Hết 2 phút đố vui!<br>Đáp án: <b style="color:#34d399;">${cleanAns}</b>`,
          true,
          12000
        );

        if (appSettings.enableGuideVoice) {
          speakStationAnnouncement(timeoutSpeech);
        }

        showToast("⏰ HẾT THỜI GIAN ĐỐ VUI", `Đáp án chính xác: ${cleanAns}`, "💡");
      }
    }
  }, 1000);
}

/* ================== HOẠT ĐỘNG 2: ĐỔI NHẠC XE (CABIN MUSIC) ================== */
const CABIN_MUSIC_TRACKS = [
  { id: "vinahouse", name: "Vinahouse Quẩy Xe Khách", genre: "132 BPM • Bass căng cực", icon: "🎧", bpm: 132 },
  { id: "chibi-dance", name: "Nhạc Tàu Lên Xe Đi Bão", genre: "140 BPM • Chiptune tươi vui", icon: "🎺", bpm: 140 },
  { id: "edm-club", name: "EDM Nonstop Bay Lắc", genre: "128 BPM • Vũ điệu điện tử", icon: "⚡", bpm: 128 },
  { id: "dalat-chill", name: "Đà Lạt Hoàng Hôn Chill", genre: "95 BPM • Lofi acoustic êm dịu", icon: "🎸", bpm: 95 }
];

let currentPlayingTrackIndex = -1;
let musicLoopInterval = null;
let cabinMusicVolume = 0.7;

function playCabinBeat(step, trackId) {
  try {
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    const now = audioCtx.currentTime;

    // 1. Nhịp Kick Drum 4-on-the-floor
    if (step % 4 === 0) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 0.12);
      gain.gain.setValueAtTime(0.5 * cabinMusicVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    }

    // 2. Hi-hat nhịp Disco xèng xèng
    if (step % 2 === 1) {
      const bufferSize = Math.floor(audioCtx.sampleRate * 0.04);
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      const filter = audioCtx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(7000, now);
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.16 * cabinMusicVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      noise.start(now);
    }

    // 3. Bassline / Melody theo phong cách từng bài
    const trackBassNotes = {
      "vinahouse": [65.41, 65.41, 77.78, 87.31, 65.41, 98.00, 87.31, 77.78],
      "chibi-dance": [130.81, 164.81, 196.00, 261.63, 196.00, 220.00, 246.94, 261.63],
      "edm-club": [73.42, 73.42, 82.41, 98.00, 110.00, 98.00, 82.41, 73.42],
      "dalat-chill": [110.00, 130.81, 146.83, 164.81, 130.81, 146.83, 164.81, 196.00]
    };
    const notes = trackBassNotes[trackId] || trackBassNotes["vinahouse"];
    const noteFreq = notes[step % notes.length];

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = trackId === "chibi-dance" ? "square" : (trackId === "dalat-chill" ? "sine" : "sawtooth");
    osc.frequency.setValueAtTime(noteFreq, now);

    const dur = trackId === "dalat-chill" ? 0.28 : 0.12;
    gain.gain.setValueAtTime(0.2 * cabinMusicVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  } catch (e) {}
}

function playCabinMusic(trackIndex = 0, announce = true) {
  if (trackIndex < 0 || trackIndex >= CABIN_MUSIC_TRACKS.length) {
    trackIndex = 0;
  }
  stopCabinMusic(false);

  currentPlayingTrackIndex = trackIndex;
  const track = CABIN_MUSIC_TRACKS[trackIndex];

  // Tính chu kỳ nhịp 16th note dựa vào BPM
  const stepMs = Math.round((60000 / track.bpm) / 4);
  let step = 0;

  musicLoopInterval = setInterval(() => {
    playCabinBeat(step, track.id);
    step++;
  }, stepMs);

  updateCabinMusicUI();

  if (announce) {
    showGuideBubble(
      "🎵 ĐỔI NHẠC TRÊN XE",
      `Bác tài đã đổi bài: <b>${track.name}</b>!<br><span style="color:#94a3b8; font-size:10px;">${track.genre}</span>`,
      false,
      8000
    );
    if (appSettings.enableGuideVoice) {
      speakStationAnnouncement(`Bác tài ơi lên bài ${track.name} cho cả xe cùng nghe nào bà con!`);
    }
    showToast("🎵 ĐÃ ĐỔI BÀI HÁT", `Đang phát: ${track.name}`, "🎶");
  }
}

function stopCabinMusic(showNotification = true) {
  if (musicLoopInterval) {
    clearInterval(musicLoopInterval);
    musicLoopInterval = null;
  }
  currentPlayingTrackIndex = -1;
  updateCabinMusicUI();

  if (showNotification) {
    showGuideBubble("⏹️ TẮT NHẠC XE", "Bác tài đã tắt nhạc để bà con nghỉ ngơi!", false, 5000);
    showToast("⏹️ ĐÃ TẮT NHẠC", "Nhạc trên xe đã tạm dừng!", "🔇");
  }
}

function renderCabinMusicList() {
  const container = document.getElementById("cabin-music-list");
  if (!container) return;
  container.innerHTML = "";

  CABIN_MUSIC_TRACKS.forEach((track, idx) => {
    const isPlaying = idx === currentPlayingTrackIndex;
    const item = document.createElement("div");
    item.className = `music-track-item ${isPlaying ? "playing" : ""}`;
    item.id = `music-track-${idx}`;
    item.innerHTML = `
      <div class="music-track-info">
        <span class="music-track-icon">${track.icon}</span>
        <div>
          <div class="music-track-name">${track.name}</div>
          <div class="music-track-genre">${track.genre}</div>
        </div>
      </div>
      <div class="music-track-actions">
        <button class="btn btn-play-track" data-index="${idx}" type="button">
          ${isPlaying ? "⏹️ Đang phát" : "▶️ Chọn bài"}
        </button>
      </div>
    `;
    container.appendChild(item);
  });

  container.querySelectorAll(".btn-play-track").forEach(btn => {
    btn.addEventListener("click", e => {
      const idx = parseInt(e.currentTarget.dataset.index);
      if (currentPlayingTrackIndex === idx) {
        stopCabinMusic(true);
      } else {
        playCabinMusic(idx, true);
      }
    });
  });
}

function updateCabinMusicUI() {
  renderCabinMusicList();
}

function triggerMusicChangeByGift(username, giftName) {
  let nextIndex = 0;
  if (CABIN_MUSIC_TRACKS.length > 1) {
    do {
      nextIndex = Math.floor(Math.random() * CABIN_MUSIC_TRACKS.length);
    } while (nextIndex === currentPlayingTrackIndex);
  }

  playCabinMusic(nextIndex, false);
  const track = CABIN_MUSIC_TRACKS[nextIndex];

  // HDV phát thanh và bong bóng cảm ơn người tặng quà và thông báo đổi bài nhạc
  showGuideBubble(
    "🎁 TẶNG QUÀ ĐỔI NHẠC",
    `Cảm ơn <b style="color:#fbbf24;">@${username}</b> đã tặng <b style="color:#f43f5e;">${giftName}</b>!<br>Bác tài đổi sang: <b style="color:#34d399;">${track.name}</b>!`,
    false,
    8000
  );

  if (appSettings.enableGuideVoice) {
    speakStationAnnouncement(`Cảm ơn bạn ${username} đã tặng ${giftName}! Bác tài lên bài ${track.name} theo yêu cầu nhé bà con!`);
  }

  showToast("🎁 TẶNG QUÀ ĐỔI NHẠC", `${username} tặng ${giftName} • Đổi sang: ${track.name}`, "🎶");
}

/* ================== HOẠT ĐỘNG 3: CHO NHÂN VẬT LÊN NHẢY (CABIN DANCE) ================== */
let isCabinDancing = false;
let cabinDanceTimeout = null;
let currentDanceMode = "disco"; // 'disco' | 'jump' | 'groove'

function startCabinDance(mode = null, duration = 30000) {
  if (mode) currentDanceMode = mode;
  isCabinDancing = true;

  if (cabinDanceTimeout) clearTimeout(cabinDanceTimeout);

  // 1. Tự động bật nhạc quẩy nếu chưa có nhạc
  if (currentPlayingTrackIndex === -1) {
    playCabinMusic(0, false);
  }

  // 2. Gán class nhảy cho toàn bộ nhân vật trên ghế
  const seats = document.querySelectorAll(".cabin-passenger-seat");
  seats.forEach(seat => {
    seat.classList.remove("dancing", "dancing-disco", "dancing-jump", "dancing-groove");
    seat.classList.add("dancing", `dancing-${currentDanceMode}`);
  });

  // 3. Cho Hướng Dẫn Viên nhảy giữa xe
  const guide = document.getElementById("cabin-tour-guide");
  if (guide) {
    guide.classList.add("dancing-guide");
  }

  // 4. Bật hiệu ứng đèn Disco sân khấu
  const discoOverlay = document.getElementById("cabin-disco-overlay");
  if (discoOverlay) {
    discoOverlay.classList.remove("hidden");
  }

  // 5. HDV phát thanh và hiển thị bong bóng
  showGuideBubble(
    "💃 CẢ XE CÙNG NHẢY!",
    `Toàn thể hành khách đứng dậy quẩy theo điệu nhạc nào!<br><b style="color:#fbbf24;">1 2 3... LÊN LÀ LÊN!</b>`,
    false,
    8000
  );

  if (appSettings.enableGuideVoice) {
    speakStationAnnouncement("Bà con ơi cùng đứng dậy nhảy quẩy theo điệu nhạc nào! Lên luôn bà con ơi!");
  }

  showToast("💃 CẢ XE CÙNG NHẢY!", "Toàn bộ hành khách đang nhảy quẩy cực sung!", "🪩");

  // Tự động dừng sau thời gian duration (mặc định 30 giây)
  cabinDanceTimeout = setTimeout(() => {
    stopCabinDance();
  }, duration);
}

function stopCabinDance() {
  isCabinDancing = false;
  if (cabinDanceTimeout) {
    clearTimeout(cabinDanceTimeout);
    cabinDanceTimeout = null;
  }

  // Bỏ hiệu ứng nhảy của các nhân vật trên ghế
  const seats = document.querySelectorAll(".cabin-passenger-seat");
  seats.forEach(seat => {
    seat.classList.remove("dancing", "dancing-disco", "dancing-jump", "dancing-groove");
  });

  // Bỏ hiệu ứng nhảy của Hướng Dẫn Viên
  const guide = document.getElementById("cabin-tour-guide");
  if (guide) {
    guide.classList.remove("dancing-guide");
  }

  // Tắt đèn Disco sân khấu
  const discoOverlay = document.getElementById("cabin-disco-overlay");
  if (discoOverlay) {
    discoOverlay.classList.add("hidden");
  }

  showGuideBubble(
    "🚌 HẾT GIỜ NHẢY",
    "Cảm ơn bà con đã quẩy nhiệt tình! Mời bà con ngồi lại vị trí ghế để xe tiếp tục hành trình!",
    false,
    6000
  );

  showToast("⏹️ ĐÃ DỪNG NHẢY", "Hành khách đã ngồi lại vị trí ghế!", "🚌");
}

/* ================== QUẢN LÝ 3 TAB HOẠT ĐỘNG TRONG ADMIN ================== */
function initActivityTabs() {
  const tabBtns = document.querySelectorAll(".activity-tab-btn");
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      document.querySelectorAll(".activity-tab-content").forEach(content => {
        content.classList.remove("active");
      });

      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.classList.add("active");
      }
    });
  });
}

/* ================== QUẢN LÝ TIMELINE CHUYẾN XE 15 PHÚT (PHASE 2) ================== */
const TRIP_CONFIG = {
  TOTAL_SECONDS: 15 * 60 // 15 phút = 900 giây
};

let tripRemainingSeconds = TRIP_CONFIG.TOTAL_SECONDS;
let tripCountdownInterval = null;

function formatTripTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updateTripTimerUI() {
  const countdownEl = document.getElementById("cabin-timer-countdown");
  const fillEl = document.getElementById("cabin-timeline-fill");
  const badgeEl = document.getElementById("cabin-timer-badge");

  if (countdownEl) {
    countdownEl.innerText = formatTripTime(tripRemainingSeconds);
  }

  const elapsed = TRIP_CONFIG.TOTAL_SECONDS - tripRemainingSeconds;
  const pct = Math.min(100, Math.max(0, (elapsed / TRIP_CONFIG.TOTAL_SECONDS) * 100));

  if (fillEl) {
    fillEl.style.width = `${pct.toFixed(1)}%`;
    fillEl.classList.remove("fuel-low", "fuel-mid", "fuel-high");
    if (pct < 35) {
      fillEl.classList.add("fuel-low");
    } else if (pct < 75) {
      fillEl.classList.add("fuel-mid");
    } else {
      fillEl.classList.add("fuel-high");
    }
  }

  if (badgeEl) {
    if (tripRemainingSeconds <= 120) {
      badgeEl.style.background = "rgba(239, 68, 68, 0.4)";
      badgeEl.style.borderColor = "#ef4444";
      badgeEl.style.color = "#fee2e2";
    } else {
      badgeEl.style.background = "rgba(239, 68, 68, 0.22)";
      badgeEl.style.borderColor = "rgba(239, 68, 68, 0.65)";
      badgeEl.style.color = "#fca5a5";
    }
  }
}

function startTripCountdown() {
  if (tripCountdownInterval) clearInterval(tripCountdownInterval);
  updateTripTimerUI();

  tripCountdownInterval = setInterval(() => {
    if (state.currentPhase !== 2) return;

    if (tripRemainingSeconds > 0) {
      tripRemainingSeconds--;
      updateTripTimerUI();

      if (tripRemainingSeconds === 0) {
        onTripCompleted();
      }
    }
  }, 1000);
}

function stopTripCountdown() {
  if (tripCountdownInterval) {
    clearInterval(tripCountdownInterval);
    tripCountdownInterval = null;
  }
}

function resetCabinTripTimer() {
  stopTripCountdown();
  tripRemainingSeconds = TRIP_CONFIG.TOTAL_SECONDS;
  updateTripTimerUI();
}

function onTripCompleted() {
  stopTripCountdown();
  updateTripTimerUI();

  showToast("🎉 ĐÃ ĐẾN ĐÀ LẠT!", "Chuyến xe FUONG TRANG đã cập bến Đà Lạt an toàn! Cảm ơn 20 hành khách!", "🏔️");

  // Hướng Dẫn Viên thông báo đến bến
  triggerGuideActivity("Chuyến xe FUONG TRANG đã đến Đà Lạt an toàn! Cảm ơn 20 hành khách đã đồng hành cùng chuyến đi!");

  // Phát thanh thông báo loa
  speakStationAnnouncement("Chuyến xe FUONG TRANG đã hoàn thành hành trình đến Đà Lạt. Cảm ơn quý khách đã đồng hành!");

  // Sau 8 giây, reset về bến xe để đón chuyến mới
  setTimeout(() => {
    if (state.currentPhase === 2) {
      resetTripForNextBatch();
    }
  }, 8000);
}

/* ================== QUẢN LÝ CHUYỂN ĐỔI GIAO DIỆN PHASE 1 (BẾN XE) & PHASE 2 (TRONG XE) ================== */
function switchToPhase(phaseNum) {
  state.currentPhase = phaseNum;
  const interiorEl = document.getElementById("bus-interior-stage");
  const badgeStatusEl = document.querySelector(".badge-status");

  if (phaseNum === 2) {
    // Chuyển sang Phase 2: Trong xe (public/TRONG_XE.png hiển thị full màn hình)
    renderCabinPassengers();
    if (interiorEl) interiorEl.classList.remove("hidden");
    const cabinVideo = document.getElementById("cabin-road-video");
    if (cabinVideo) {
      cabinVideo.play().catch(e => console.log("Video auto-play:", e));
    }
    if (badgeStatusEl) {
      badgeStatusEl.innerText = "🚌 Đang Trong Xe (Phase 2)";
      badgeStatusEl.style.color = "#38bdf8";
      badgeStatusEl.style.borderColor = "rgba(56, 189, 248, 0.4)";
      badgeStatusEl.style.background = "rgba(56, 189, 248, 0.12)";
    }

    // Bắt đầu timeline đếm ngược 15 phút
    startTripCountdown();

    // Kích hoạt lời chào đầu tiên của HDV sau 1.2s
    setTimeout(() => {
      triggerGuideActivity();
    }, 1200);

    // Chu kỳ hoạt náo tự động mỗi 18s
    if (guideAutoTimer) clearInterval(guideAutoTimer);
    guideAutoTimer = setInterval(() => {
      if (state.currentPhase === 2) {
        triggerGuideActivity();
      }
    }, 18000);
  } else {
    // Quay lại Phase 1: Bến xe khách
    if (interiorEl) interiorEl.classList.add("hidden");
    const cabinVideo = document.getElementById("cabin-road-video");
    if (cabinVideo) {
      cabinVideo.pause();
    }
    if (guideAutoTimer) {
      clearInterval(guideAutoTimer);
      guideAutoTimer = null;
    }
    const bubbleEl = document.getElementById("guide-bubble");
    if (bubbleEl) bubbleEl.classList.add("hidden");

    // Dừng đếm ngược timeline
    stopTripCountdown();

    if (badgeStatusEl) {
      badgeStatusEl.innerText = "🟢 Bến Xe Sẵn Sàng";
      badgeStatusEl.style.color = "#10b981";
      badgeStatusEl.style.borderColor = "rgba(16, 185, 129, 0.3)";
      badgeStatusEl.style.background = "rgba(16, 185, 129, 0.12)";
    }
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
    const msgs = (appSettings.departMessages && appSettings.departMessages.length > 0)
      ? appSettings.departMessages
      : defaultSettings.departMessages;
    const rawTpl = msgs[Math.floor(Math.random() * msgs.length)];
    speakStationAnnouncement(rawTpl);
  }
  showToast("🚌 XUẤT BẾN!", "Chuyến xe FUONG TRANG đủ 20 khách khởi hành đi Đà Lạt!", "🚀");

  setTimeout(() => {
    busContainer.classList.add("driving");
    busContainer.style.transform = "translateX(calc(100vw + 600px))";

    // Xe chạy xong -> Chuyển sang Phase 2: Giao diện Trong xe (public/TRONG_XE.png)
    setTimeout(() => {
      state.isDeparting = false;
      switchToPhase(2);
      showToast("✨ ĐÃ LÊN XE!", "Chào mừng hành khách vào trong xe FUONG TRANG đi Đà Lạt!", "🚌");
    }, 1800);
  }, 900);
}

/* ================== LÀM MỚI CHUYẾN XE TIẾP THEO ================== */
function resetTripForNextBatch() {
  state.seatedPassengers = [];
  initSeats();
  renderCabinPassengers();
  resetCabinTripTimer();

  // Đặt lại bình xăng và còi cho chuyến mới
  currentFuel = 0;
  currentHornCount = 0;
  updateFuelUI();
  updateHornUI();

  // Đảm bảo đưa về giao diện Phase 1 (Bến xe)
  switchToPhase(1);

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

/* ================== RENDER VÀ QUẢN LÝ CÁC DANH SÁCH CÂU NÓI RANDOM (TẠO/THÊM/XÓA/SỬA) ================== */

// 1. Quản lý danh sách câu chào
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

  listContainer.querySelectorAll(".join-msg-input").forEach(input => {
    input.addEventListener("input", e => {
      const i = parseInt(e.target.dataset.index);
      appSettings.joinMessages[i] = e.target.value;
      saveSettings();
    });
  });

  listContainer.querySelectorAll(".btn-test-single-join").forEach(btn => {
    btn.addEventListener("click", e => {
      const i = parseInt(e.currentTarget.dataset.index);
      const text = (appSettings.joinMessages[i] || "").replace(/{username}/g, "Bác Ba Phi");
      speakStationAnnouncement(text);
    });
  });

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

// 2. Quản lý danh sách câu cảm ơn khi tiếp xăng
function renderFuelMessages() {
  const listContainer = document.getElementById("fuel-messages-list");
  if (!listContainer) return;
  listContainer.innerHTML = "";

  if (!appSettings.fuelMessages || appSettings.fuelMessages.length === 0) {
    appSettings.fuelMessages = [...defaultSettings.fuelMessages];
  }

  appSettings.fuelMessages.forEach((msg, idx) => {
    const row = document.createElement("div");
    row.className = "message-item-row";
    row.innerHTML = `
      <input type="text" class="form-input fuel-msg-input" data-index="${idx}" value="${msg.replace(/"/g, '&quot;')}" placeholder="Nhập câu cảm ơn đổ xăng...">
      <button class="btn btn-test btn-test-single-fuel" data-index="${idx}" title="Nghe thử câu này" type="button">🔊</button>
      <button class="btn btn-icon-danger btn-delete-fuel" data-index="${idx}" title="Xóa câu này" type="button">🗑️</button>
    `;
    listContainer.appendChild(row);
  });

  listContainer.querySelectorAll(".fuel-msg-input").forEach(input => {
    input.addEventListener("input", e => {
      const i = parseInt(e.target.dataset.index);
      appSettings.fuelMessages[i] = e.target.value;
      saveSettings();
    });
  });

  listContainer.querySelectorAll(".btn-test-single-fuel").forEach(btn => {
    btn.addEventListener("click", e => {
      const i = parseInt(e.currentTarget.dataset.index);
      const text = (appSettings.fuelMessages[i] || "")
        .replace(/{username}/g, "Bác Ba Phi")
        .replace(/{liters}/g, "1");
      speakStationAnnouncement(text);
    });
  });

  listContainer.querySelectorAll(".btn-delete-fuel").forEach(btn => {
    btn.addEventListener("click", e => {
      const i = parseInt(e.currentTarget.dataset.index);
      if (appSettings.fuelMessages.length <= 1) {
        showToast("⚠️ KHÔNG THỂ XÓA", "Phải giữ lại ít nhất 1 câu tiếp xăng!", "⚠️");
        return;
      }
      appSettings.fuelMessages.splice(i, 1);
      saveSettings();
      renderFuelMessages();
    });
  });
}

// 3. Quản lý danh sách câu mời lên giường nằm VIP
function renderGiftMessages() {
  const listContainer = document.getElementById("gift-messages-list");
  if (!listContainer) return;
  listContainer.innerHTML = "";

  if (!appSettings.giftMessages || appSettings.giftMessages.length === 0) {
    appSettings.giftMessages = [...defaultSettings.giftMessages];
  }

  appSettings.giftMessages.forEach((msg, idx) => {
    const row = document.createElement("div");
    row.className = "message-item-row";
    row.innerHTML = `
      <input type="text" class="form-input gift-msg-input" data-index="${idx}" value="${msg.replace(/"/g, '&quot;')}" placeholder="Nhập câu mời vào giường VIP...">
      <button class="btn btn-test btn-test-single-gift" data-index="${idx}" title="Nghe thử câu này" type="button">🔊</button>
      <button class="btn btn-icon-danger btn-delete-gift" data-index="${idx}" title="Xóa câu này" type="button">🗑️</button>
    `;
    listContainer.appendChild(row);
  });

  listContainer.querySelectorAll(".gift-msg-input").forEach(input => {
    input.addEventListener("input", e => {
      const i = parseInt(e.target.dataset.index);
      appSettings.giftMessages[i] = e.target.value;
      saveSettings();
    });
  });

  listContainer.querySelectorAll(".btn-test-single-gift").forEach(btn => {
    btn.addEventListener("click", e => {
      const i = parseInt(e.currentTarget.dataset.index);
      const text = (appSettings.giftMessages[i] || "")
        .replace(/{username}/g, "Chị Út Miền Tây")
        .replace(/{gift}/g, "Hoa Hồng");
      speakStationAnnouncement(text);
    });
  });

  listContainer.querySelectorAll(".btn-delete-gift").forEach(btn => {
    btn.addEventListener("click", e => {
      const i = parseInt(e.currentTarget.dataset.index);
      if (appSettings.giftMessages.length <= 1) {
        showToast("⚠️ KHÔNG THỂ XÓA", "Phải giữ lại ít nhất 1 câu tặng quà!", "⚠️");
        return;
      }
      appSettings.giftMessages.splice(i, 1);
      saveSettings();
      renderGiftMessages();
    });
  });
}

// 4. Quản lý danh sách câu thông báo xuất bến
function renderDepartMessages() {
  const listContainer = document.getElementById("depart-messages-list");
  if (!listContainer) return;
  listContainer.innerHTML = "";

  if (!appSettings.departMessages || appSettings.departMessages.length === 0) {
    appSettings.departMessages = [...defaultSettings.departMessages];
  }

  appSettings.departMessages.forEach((msg, idx) => {
    const row = document.createElement("div");
    row.className = "message-item-row";
    row.innerHTML = `
      <input type="text" class="form-input depart-msg-input" data-index="${idx}" value="${msg.replace(/"/g, '&quot;')}" placeholder="Nhập câu xuất bến...">
      <button class="btn btn-test btn-test-single-depart" data-index="${idx}" title="Nghe thử câu này" type="button">🔊</button>
      <button class="btn btn-icon-danger btn-delete-depart" data-index="${idx}" title="Xóa câu này" type="button">🗑️</button>
    `;
    listContainer.appendChild(row);
  });

  listContainer.querySelectorAll(".depart-msg-input").forEach(input => {
    input.addEventListener("input", e => {
      const i = parseInt(e.target.dataset.index);
      appSettings.departMessages[i] = e.target.value;
      saveSettings();
    });
  });

  listContainer.querySelectorAll(".btn-test-single-depart").forEach(btn => {
    btn.addEventListener("click", e => {
      const i = parseInt(e.currentTarget.dataset.index);
      const text = appSettings.departMessages[i] || "";
      speakStationAnnouncement(text);
    });
  });

  listContainer.querySelectorAll(".btn-delete-depart").forEach(btn => {
    btn.addEventListener("click", e => {
      const i = parseInt(e.currentTarget.dataset.index);
      if (appSettings.departMessages.length <= 1) {
        showToast("⚠️ KHÔNG THỂ XÓA", "Phải giữ lại ít nhất 1 câu xuất bến!", "⚠️");
        return;
      }
      appSettings.departMessages.splice(i, 1);
      saveSettings();
      renderDepartMessages();
    });
  });
}

function renderGuideMessages() {
  const listContainer = document.getElementById("guide-messages-list");
  if (!listContainer) return;
  listContainer.innerHTML = "";

  if (!appSettings.guideMessages || appSettings.guideMessages.length === 0) {
    appSettings.guideMessages = JSON.parse(JSON.stringify(defaultSettings.guideMessages));
  }

  appSettings.guideMessages.forEach((item, idx) => {
    const qVal = typeof item === "string" ? item : (item.q || "");
    const aVal = typeof item === "string" ? "" : (item.a || "");

    const card = document.createElement("div");
    card.className = "guide-qa-item";
    card.innerHTML = `
      <div class="guide-qa-inputs">
        <div class="guide-qa-row">
          <span class="guide-label-prefix q-tag">❓ Đố vui:</span>
          <input type="text" class="form-input guide-q-input" data-index="${idx}" value="${String(qVal).replace(/"/g, '&quot;')}" placeholder="Nhập câu hỏi đố vui...">
        </div>
        <div class="guide-qa-row">
          <span class="guide-label-prefix a-tag">💡 Đáp án:</span>
          <input type="text" class="form-input guide-a-input" data-index="${idx}" value="${String(aVal).replace(/"/g, '&quot;')}" placeholder="Nhập câu trả lời / đáp án có sẵn...">
        </div>
      </div>
      <div class="guide-qa-actions">
        <button class="btn btn-qa-action btn-ask-guide" data-index="${idx}" title="Cho HDV hỏi câu này trên xe" type="button">❓ Hỏi</button>
        <button class="btn btn-qa-action btn-answer-guide" data-index="${idx}" title="Cho HDV đọc đáp án câu này trên xe" type="button">💡 Đáp án</button>
        <button class="btn btn-icon-danger btn-delete-guide" data-index="${idx}" title="Xóa câu này" type="button">🗑️</button>
      </div>
    `;
    listContainer.appendChild(card);
  });

  listContainer.querySelectorAll(".guide-q-input").forEach(input => {
    input.addEventListener("input", e => {
      const i = parseInt(e.target.dataset.index);
      if (typeof appSettings.guideMessages[i] === "string") {
        appSettings.guideMessages[i] = { q: e.target.value, a: "" };
      } else {
        appSettings.guideMessages[i].q = e.target.value;
      }
      saveSettings();
    });
  });

  listContainer.querySelectorAll(".guide-a-input").forEach(input => {
    input.addEventListener("input", e => {
      const i = parseInt(e.target.dataset.index);
      if (typeof appSettings.guideMessages[i] === "string") {
        appSettings.guideMessages[i] = { q: appSettings.guideMessages[i], a: e.target.value };
      } else {
        appSettings.guideMessages[i].a = e.target.value;
      }
      saveSettings();
    });
  });

  listContainer.querySelectorAll(".btn-ask-guide").forEach(btn => {
    btn.addEventListener("click", e => {
      const i = parseInt(e.currentTarget.dataset.index);
      const item = appSettings.guideMessages[i];
      const q = typeof item === "string" ? item : item.q;
      const a = typeof item === "string" ? "" : item.a;
      triggerGuideActivity(q, a);
      showToast("🎤 ĐÃ ĐẶT CÂU HỎI", "HDV đang hỏi đố vui! Người xem bình luận đúng sẽ được xướng tên!", "❓");
    });
  });

  listContainer.querySelectorAll(".btn-answer-guide").forEach(btn => {
    btn.addEventListener("click", e => {
      const i = parseInt(e.currentTarget.dataset.index);
      const item = appSettings.guideMessages[i];
      const a = typeof item === "string" ? "" : item.a;
      if (!a) {
        showToast("⚠️ CHƯA CÓ ĐÁP ÁN", "Vui lòng nhập đáp án cho câu hỏi này!", "⚠️");
        return;
      }
      clearGuideQuizTimers();
      if (currentActiveQA) {
        currentActiveQA.answered = true;
      }
      const cleanAns = stripAnswerPrefixSuffix(a);
      showGuideBubble("💡 ĐÁP ÁN CHÍNH XÁC", `Đáp án: <b style="color:#34d399;">${cleanAns}</b>`, true, 12000);
      if (appSettings.enableGuideVoice) {
        speakStationAnnouncement(`Đáp án chính xác là: ${cleanAns}!`);
      }
      showToast("💡 ĐÃ CÔNG BỐ ĐÁP ÁN", "HDV đã công bố câu trả lời trên xe!", "🎉");
    });
  });

  listContainer.querySelectorAll(".btn-delete-guide").forEach(btn => {
    btn.addEventListener("click", e => {
      const i = parseInt(e.currentTarget.dataset.index);
      if (appSettings.guideMessages.length <= 1) {
        showToast("⚠️ KHÔNG THỂ XÓA", "Phải giữ lại ít nhất 1 câu hỏi & đáp án!", "⚠️");
        return;
      }
      appSettings.guideMessages.splice(i, 1);
      saveSettings();
      renderGuideMessages();
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

  // 1. Đồng bộ các công tắc bật/tắt (Switch)
  const chkJoinVoice = document.getElementById("setting-enable-join-voice");
  const chkFuelVoice = document.getElementById("setting-enable-fuel-voice");
  const chkGiftVoice = document.getElementById("setting-enable-gift-voice");
  const chkDepartVoice = document.getElementById("setting-enable-depart-voice");
  const chkHorn = document.getElementById("setting-enable-horn");
  const chkGuideVoice = document.getElementById("setting-enable-guide-voice");

  if (chkJoinVoice) {
    chkJoinVoice.checked = appSettings.enableJoinVoice;
    chkJoinVoice.addEventListener("change", e => {
      appSettings.enableJoinVoice = e.target.checked;
      saveSettings();
    });
  }

  if (chkFuelVoice) {
    chkFuelVoice.checked = appSettings.enableFuelVoice !== false;
    chkFuelVoice.addEventListener("change", e => {
      appSettings.enableFuelVoice = e.target.checked;
      saveSettings();
    });
  }

  if (chkGiftVoice) {
    chkGiftVoice.checked = appSettings.enableGiftVoice;
    chkGiftVoice.addEventListener("change", e => {
      appSettings.enableGiftVoice = e.target.checked;
      saveSettings();
    });
  }

  if (chkDepartVoice) {
    chkDepartVoice.checked = appSettings.enableDepartVoice;
    chkDepartVoice.addEventListener("change", e => {
      appSettings.enableDepartVoice = e.target.checked;
      saveSettings();
    });
  }

  if (chkHorn) {
    chkHorn.checked = appSettings.enableHorn;
    chkHorn.addEventListener("change", e => {
      appSettings.enableHorn = e.target.checked;
      saveSettings();
    });
  }

  if (chkGuideVoice) {
    chkGuideVoice.checked = appSettings.enableGuideVoice !== false;
    chkGuideVoice.addEventListener("change", e => {
      appSettings.enableGuideVoice = e.target.checked;
      saveSettings();
    });
  }

  // 2. Render toàn bộ 5 danh sách câu nói
  renderJoinMessages();
  renderFuelMessages();
  renderGiftMessages();
  renderDepartMessages();
  renderGuideMessages();

  // 3. Gắn sự kiện cho các nút Thêm câu mới & Đọc Random của 4 mục
  // Mục 1: Chào người xem
  const btnAddJoin = document.getElementById("btn-add-join-msg");
  if (btnAddJoin) {
    btnAddJoin.addEventListener("click", () => {
      appSettings.joinMessages.push("Chào mừng {username} đã ghé thăm bến xe!");
      saveSettings();
      renderJoinMessages();
      const inputs = document.querySelectorAll(".join-msg-input");
      if (inputs.length > 0) inputs[inputs.length - 1].focus();
    });
  }
  const btnRandomJoin = document.getElementById("btn-random-join-msg");
  if (btnRandomJoin) {
    btnRandomJoin.addEventListener("click", () => {
      const msgs = appSettings.joinMessages || defaultSettings.joinMessages;
      const tpl = msgs[Math.floor(Math.random() * msgs.length)];
      speakStationAnnouncement(tpl.replace(/{username}/g, "Bác Ba Phi"));
    });
  }

  // Mục 2: Cảm ơn tiếp xăng
  const btnAddFuel = document.getElementById("btn-add-fuel-msg");
  if (btnAddFuel) {
    btnAddFuel.addEventListener("click", () => {
      appSettings.fuelMessages.push("Cảm ơn {username} đã tiếp thêm xăng cho xe!");
      saveSettings();
      renderFuelMessages();
      const inputs = document.querySelectorAll(".fuel-msg-input");
      if (inputs.length > 0) inputs[inputs.length - 1].focus();
    });
  }
  const btnRandomFuel = document.getElementById("btn-random-fuel-msg");
  if (btnRandomFuel) {
    btnRandomFuel.addEventListener("click", () => {
      const msgs = appSettings.fuelMessages || defaultSettings.fuelMessages;
      const tpl = msgs[Math.floor(Math.random() * msgs.length)];
      speakStationAnnouncement(tpl.replace(/{username}/g, "Bác Ba Phi").replace(/{liters}/g, "1"));
    });
  }

  // Mục 3: Tặng quà vào giường nằm
  const btnAddGift = document.getElementById("btn-add-gift-msg");
  if (btnAddGift) {
    btnAddGift.addEventListener("click", () => {
      appSettings.giftMessages.push("Mời quý khách {username} lên xe giường nằm nghỉ ngơi!");
      saveSettings();
      renderGiftMessages();
      const inputs = document.querySelectorAll(".gift-msg-input");
      if (inputs.length > 0) inputs[inputs.length - 1].focus();
    });
  }
  const btnRandomGift = document.getElementById("btn-random-gift-msg");
  if (btnRandomGift) {
    btnRandomGift.addEventListener("click", () => {
      const msgs = appSettings.giftMessages || defaultSettings.giftMessages;
      const tpl = msgs[Math.floor(Math.random() * msgs.length)];
      speakStationAnnouncement(tpl.replace(/{username}/g, "Chị Út Miền Tây").replace(/{gift}/g, "Hoa Hồng"));
    });
  }

  // Mục 4: Thông báo xuất bến
  const btnAddDepart = document.getElementById("btn-add-depart-msg");
  if (btnAddDepart) {
    btnAddDepart.addEventListener("click", () => {
      appSettings.departMessages.push("Xe FUONG TRANG đã đủ khách, chuẩn bị khởi hành đi Đà Lạt!");
      saveSettings();
      renderDepartMessages();
      const inputs = document.querySelectorAll(".depart-msg-input");
      if (inputs.length > 0) inputs[inputs.length - 1].focus();
    });
  }
  const btnRandomDepart = document.getElementById("btn-random-depart-msg");
  if (btnRandomDepart) {
    btnRandomDepart.addEventListener("click", () => {
      const msgs = appSettings.departMessages || defaultSettings.departMessages;
      const tpl = msgs[Math.floor(Math.random() * msgs.length)];
      speakStationAnnouncement(tpl);
    });
  }

  // Mục 5: Hoạt động Hướng Dẫn Viên
  const btnAddGuide = document.getElementById("btn-add-guide-msg");
  if (btnAddGuide) {
    btnAddGuide.addEventListener("click", () => {
      appSettings.guideMessages.push({
        q: "Đố vui: Đặc sản nổi tiếng tiếp theo của Đà Lạt là gì?",
        a: "Đáp án chính xác là: Atisô và Trà Atisô Đà Lạt!"
      });
      saveSettings();
      renderGuideMessages();
      const inputs = document.querySelectorAll(".guide-q-input");
      if (inputs.length > 0) inputs[inputs.length - 1].focus();
    });
  }
  const btnTriggerGuide = document.getElementById("btn-trigger-guide-speak");
  if (btnTriggerGuide) {
    btnTriggerGuide.addEventListener("click", () => {
      triggerGuideActivity();
      showToast("🎤 HƯỚNG DẪN VIÊN", "Đã phát hoạt náo trên xe!", "🚌");
    });
  }

  // Tương tác trực tiếp: Bấm vào Hướng Dẫn Viên trên xe
  const cabinTourGuide = document.getElementById("cabin-tour-guide");
  if (cabinTourGuide) {
    cabinTourGuide.addEventListener("click", () => {
      triggerGuideActivity();
      showToast("🎤 HOẠT NÁO VIÊN", "Hướng dẫn viên đang giao lưu cùng hành khách!", "🚌");
    });
  }

  // Khởi tạo 3 Tab Hoạt Động (Đặt câu hỏi, Đổi nhạc, Nhảy)
  initActivityTabs();

  // Khởi tạo danh sách nhạc và điều khiển đổi nhạc
  renderCabinMusicList();

  const btnStopMusic = document.getElementById("btn-stop-cabin-music");
  if (btnStopMusic) {
    btnStopMusic.addEventListener("click", () => stopCabinMusic(true));
  }
  const btnRandomMusic = document.getElementById("btn-random-cabin-music");
  if (btnRandomMusic) {
    btnRandomMusic.addEventListener("click", () => {
      const r = Math.floor(Math.random() * CABIN_MUSIC_TRACKS.length);
      playCabinMusic(r, true);
    });
  }

  const volSlider = document.getElementById("cabin-music-volume");
  const volBadge = document.getElementById("cabin-music-vol-val");
  if (volSlider) {
    volSlider.addEventListener("input", e => {
      const v = parseInt(e.target.value);
      cabinMusicVolume = v / 100;
      if (volBadge) volBadge.innerText = `${v}%`;
    });
  }

  // Tùy chọn Bật/Tắt tự động đổi nhạc khi khán giả tặng quà
  const chkGiftMusic = document.getElementById("setting-gift-change-music");
  if (chkGiftMusic) {
    chkGiftMusic.checked = appSettings.enableGiftChangeMusic !== false;
    chkGiftMusic.addEventListener("change", e => {
      appSettings.enableGiftChangeMusic = e.target.checked;
      saveSettings();
    });
  }

  // Khởi tạo các nút điều khiển Nhảy (cho nhân vật lên nhảy)
  const btnStartDance = document.getElementById("btn-start-dance");
  if (btnStartDance) {
    btnStartDance.addEventListener("click", () => {
      const selectedRadio = document.querySelector('input[name="dance-mode"]:checked');
      const mode = selectedRadio ? selectedRadio.value : "disco";
      startCabinDance(mode, 30000);
    });
  }
  const btnStopDance = document.getElementById("btn-stop-dance");
  if (btnStopDance) {
    btnStopDance.addEventListener("click", () => stopCabinDance());
  }

  document.querySelectorAll('input[name="dance-mode"]').forEach(radio => {
    radio.addEventListener("change", e => {
      currentDanceMode = e.target.value;
      if (isCabinDancing) {
        startCabinDance(currentDanceMode, 30000);
      }
    });
  });

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
      const gift = select ? select.value : "🌸 Vé xe";
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
          onPassengerGift(dummyName, "🌸 Vé xe");
        }, i * 220);
      }
    });
  }

  // Nút chuyển Phase 1 (Bến Xe) và Phase 2 (Trong Xe)
  const btnPhaseTerminal = document.getElementById("btn-phase-terminal");
  if (btnPhaseTerminal) {
    btnPhaseTerminal.addEventListener("click", () => {
      switchToPhase(1);
    });
  }

  const btnPhaseInterior = document.getElementById("btn-phase-interior");
  if (btnPhaseInterior) {
    btnPhaseInterior.addEventListener("click", () => {
      switchToPhase(2);
    });
  }

  const btnDepart = document.getElementById("btn-depart");
  if (btnDepart) {
    btnDepart.addEventListener("click", () => {
      // Cưỡng chế nạp đầy xăng và xuất bến khi streamer bấm nút test
      currentFuel = INTERACT_CONFIG.MAX_FUEL;
      updateFuelUI();
      triggerBusDeparture();
    });
  }

  const btnReset = document.getElementById("btn-reset");
  if (btnReset) {
    btnReset.addEventListener("click", () => {
      resetTripForNextBatch();
    });
  }

  const btnFastForwardTimer = document.getElementById("btn-fast-forward-timer");
  if (btnFastForwardTimer) {
    btnFastForwardTimer.addEventListener("click", () => {
      if (state.currentPhase !== 2) {
        switchToPhase(2);
      }
      tripRemainingSeconds = 30; // Tua còn 30 giây để test
      updateTripTimerUI();
      showToast("⏩ ĐÃ TUA TIMELINE!", "Timeline 15 phút đã được tua xuống còn 30 giây để thử nghiệm đến bến!", "⏱️");
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

  // Nút thử trả lời đúng câu hỏi hiện tại của HDV
  const btnSimCorrectAnswer = document.getElementById("btn-sim-correct-answer");
  if (btnSimCorrectAnswer) {
    btnSimCorrectAnswer.addEventListener("click", () => {
      if (!currentActiveQA || !currentActiveQA.a) {
        showToast("ℹ️ CHƯA ĐẶT CÂU HỎI", "Hãy bấm '🎲 Đố vui ngẫu nhiên' hoặc '❓ Hỏi' trước!", "❓");
        return;
      }
      const rawAns = currentActiveQA.a;
      const answerVal = stripAnswerPrefixSuffix(rawAns);
      const inputEl = document.getElementById("input-sim-comment");
      if (inputEl) {
        inputEl.value = answerVal;
      }
      handleComment(getSimUserName(), answerVal);
    });
  }

  // Tương tác trực tiếp: Bấm vào quà tặng trên bảng HUD Phase 1 để tặng quà ngay
  const hudGiftPills = document.querySelectorAll(".hud-gift-pill");
  hudGiftPills.forEach(pill => {
    pill.addEventListener("click", () => {
      const giftName = pill.dataset.gift;
      const simName = getSimUserName();
      onPassengerGift(simName, giftName);
    });
  });

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
      const gifts = ["🌸 Vé xe"];
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

/* ================== SPRITE FRAMES CHO CHARACTER_1, 2, 3, 4, 5 ================== */
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

const SPRITE_FRAMES_CHAR3 = [
  "public/CHARACTER_3/1.png",
  "public/CHARACTER_3/2.png",
  "public/CHARACTER_3/3.png",
  "public/CHARACTER_3/4.png",
  "public/CHARACTER_3/5.png"
];

const SPRITE_FRAMES_CHAR4 = [
  "public/CHARACTER_4/1.png",
  "public/CHARACTER_4/2.png",
  "public/CHARACTER_4/3.png",
  "public/CHARACTER_4/4.png",
  "public/CHARACTER_4/5.png"
];

const SPRITE_FRAMES_CHAR5 = [
  "public/CHARACTER_5/1.png",
  "public/CHARACTER_5/2.png",
  "public/CHARACTER_5/3.png",
  "public/CHARACTER_5/4.png",
  "public/CHARACTER_5/5.png"
];

// Preload tất cả các frame ảnh của cả 5 nhân vật để chuyển động mượt mà không chớp giật
[
  ...SPRITE_FRAMES_CHAR1,
  ...SPRITE_FRAMES_CHAR2,
  ...SPRITE_FRAMES_CHAR3,
  ...SPRITE_FRAMES_CHAR4,
  ...SPRITE_FRAMES_CHAR5
].forEach(src => {
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

  // 3. Tạo nhân vật CHARACTER_3 (Hành Khách VIP 3)
  const char3 = new SpriteActor({
    id: "sprite-player-char3",
    name: "Hành Khách VIP 3",
    badge: "🍦",
    frames: SPRITE_FRAMES_CHAR3,
    container: container,
    startXRatio: 0.22,
    startYRatio: 0.72,
    speed: 130,
    isControllable: false
  });
  spriteActors.push(char3);

  // 4. Tạo nhân vật CHARACTER_4 (Hành Khách VIP 4)
  const char4 = new SpriteActor({
    id: "sprite-player-char4",
    name: "Hành Khách VIP 4",
    badge: "🧢",
    frames: SPRITE_FRAMES_CHAR4,
    container: container,
    startXRatio: 0.78,
    startYRatio: 0.45,
    speed: 120,
    isControllable: false
  });
  spriteActors.push(char4);

  // 5. Tạo nhân vật CHARACTER_5 (Hành Khách VIP 5)
  const char5 = new SpriteActor({
    id: "sprite-player-char5",
    name: "Hành Khách VIP 5",
    badge: "💖",
    frames: SPRITE_FRAMES_CHAR5,
    container: container,
    startXRatio: 0.50,
    startYRatio: 0.88,
    speed: 128,
    isControllable: false
  });
  spriteActors.push(char5);

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

// Expose ra window để các tool kết nối TikTok Live / OBS overlay gọi trực tiếp
if (typeof window !== "undefined") {
  window.handleComment = handleComment;
  window.triggerGuideActivity = triggerGuideActivity;
  window.checkGuideQuizAnswer = checkGuideQuizAnswer;
  window.isAnswerMatching = isAnswerMatching;
  window.playCabinMusic = playCabinMusic;
  window.stopCabinMusic = stopCabinMusic;
  window.startCabinDance = startCabinDance;
  window.stopCabinDance = stopCabinDance;
  window.triggerMusicChangeByGift = triggerMusicChangeByGift;
}