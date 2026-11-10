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
  currentPhase: 1,      // 1: Bến xe, 2: Trong xe, 3: Đến Đà Lạt
  autoDemoInterval: null
};

// Thành tích chỉ tính trong một chuyến, dùng cho bảng tổng kết Phase 3.
const tripStats = {
  fuel: {},
  horn: {},
  gifts: {},
  quiz: {},
  wordChain: {},
  nitro: {}
};

function addTripStat(category, username, amount = 1) {
  if (!tripStats[category] || !username) return;
  const name = String(username).trim() || "Hành khách";
  tripStats[category][name] = (tripStats[category][name] || 0) + amount;
}

function resetTripStats() {
  Object.keys(tripStats).forEach(category => {
    tripStats[category] = {};
  });
}

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
  addTripStat("fuel", username, currentFuel - prevFuel);
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
  addTripStat("horn", username, 1);
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

/* ================== HIỂN THỊ BÌNH LUẬN TRÊN ĐẦU HÀNH KHÁCH (PHASE 2 & PHASE 1) ================== */
function showPassengerComment(username, text) {
  if (!username || !text) return;

  let targetEl = null;
  const targetName = username.trim().toLowerCase();

  // 1. Nếu đang ở Phase 2 (trong xe): Tìm hành khách trên 20 ghế xanh
  if (state.currentPhase === 2) {
    const cabinSeats = document.querySelectorAll("#cabin-passengers-layer .cabin-passenger-seat");
    for (const seat of cabinSeats) {
      if ((seat.dataset.username || "").toLowerCase() === targetName) {
        targetEl = seat;
        break;
      }
    }
    if (!targetEl) {
      targetEl = document.getElementById(`cabin-char-${username.replace(/\s+/g, '_')}`);
    }
  }

  // Phase 3: tìm nhân vật đang tham quan tại địa điểm check-in.
  if (state.currentPhase === 3) {
    const arrivalChars = document.querySelectorAll("#arrival-passengers-layer .arrival-passenger");
    for (const char of arrivalChars) {
      if ((char.dataset.username || "").trim().toLowerCase() === targetName) {
        targetEl = char;
        break;
      }
    }
  }

  // 2. Nếu đang ở Phase 1 (bến xe): Tìm hành khách ngoài sân hoặc trong giường nằm
  if (state.currentPhase === 1 || (state.currentPhase !== 3 && !targetEl)) {
    // 2.1. Tìm hành khách ngoài sân bến xe
    const courtyardChars = document.querySelectorAll("#far-passengers-container .char-2d");
    for (const char of courtyardChars) {
      if ((char.dataset.username || "").toLowerCase() === targetName) {
        targetEl = char;
        break;
      }
    }

    // 2.2. Tìm theo ID
    if (!targetEl) {
      targetEl = document.getElementById(`char-${username.replace(/\s+/g, '_')}`);
    }

    // 2.3. Tìm trong các nhân vật SpriteActor trên sân
    if (!targetEl) {
      const spriteChars = document.querySelectorAll(".char-2d.char-sprite");
      for (const char of spriteChars) {
        if ((char.dataset.username || "").toLowerCase() === targetName) {
          targetEl = char;
          break;
        }
      }
    }

    // 2.4. Tìm trong 20 slot giường nằm (nếu khách đã đặt vé ở Phase 1)
    if (!targetEl) {
      const bunkChars = document.querySelectorAll("#seats-grid .char-2d");
      for (const char of bunkChars) {
        if ((char.dataset.username || "").toLowerCase() === targetName) {
          targetEl = char;
          break;
        }
      }
    }
  }

  if (!targetEl) return;

  // Xóa bong bóng bình luận cũ của nhân vật này (nếu có)
  const existingBubble = targetEl.querySelector(".passenger-chat-bubble");
  if (existingBubble) {
    existingBubble.remove();
  }

  // Xử lý độ dài tin nhắn: nếu dài hơn 30 ký tự thì cắt gọn và hiển thị dấu "..."
  let cleanText = text.trim();
  if (cleanText.length > 30) {
    cleanText = cleanText.slice(0, 30) + "...";
  }

  // Tạo bong bóng bình luận mới
  const bubble = document.createElement("div");
  bubble.className = "passenger-chat-bubble";
  bubble.innerText = cleanText;
  bubble.title = text;
  targetEl.appendChild(bubble);

  // Hiển thị trong 4.2 giây rồi mờ dần và tự hủy
  setTimeout(() => {
    bubble.classList.add("fade-out");
    setTimeout(() => {
      if (bubble.parentElement) bubble.remove();
    }, 380);
  }, 4200);
}

function handleComment(username = "Hành khách", commentText = "") {
  const text = (commentText || "").trim();
  if (!text) return;

  // Phase 3 dùng comment số cho Nhận hành lý và Bình chọn check-in.
  if (state.currentPhase === 3) {
    handlePhase3Comment(username, text);
    return;
  }

  // Nếu người này chưa có trong bến xe ở Phase 1 và chưa có ghế, tự động cho họ vào bến xe
  if (state.currentPhase === 1 && !state.farPassengers.includes(username) && !state.seatedPassengers.some(p => p.username === username)) {
    onPassengerJoin(username);
  }

  // 1. Hiển thị bong bóng bình luận trên đầu hành khách (cả Phase 1 ngoài sân lẫn Phase 2 trên xe)
  showPassengerComment(username, text);

  // 1.5. Kiểm tra nếu minigame Nối Từ đang chạy thì ưu tiên bắt từ nối
  if (typeof wordChainState !== "undefined" && wordChainState.active && checkWordChainComment(username, text)) {
    return;
  }

  // 2. Kiểm tra nếu có câu đố vui của HDV đang chờ người trả lời đúng
  if (checkGuideQuizAnswer(username, text)) {
    return;
  }

  // 3. Tương tác gõ 1 (tiếp xăng) và gõ 2 (bình chọn bấm còi)
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
  charDiv.dataset.username = username;

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

  // Nếu hành khách có vé miễn phí tích lũy từ Minigame Nối Từ và xe chưa kín 20 chỗ: Tự động cho lên xe VIP!
  if (state.currentPhase === 1 && state.seatedPassengers.length < CONFIG.TOTAL_SEATS) {
    const data = getWordChainUserData();
    if ((data.tickets[username] || 0) > 0) {
      data.tickets[username] -= 1;
      saveWordChainUserData(data.points, data.tickets);
      renderWordChainLeaderboard();
      onPassengerGift(username, "🌸 Vé xe (Free Minigame)");
      showToast("🎟️ DÙNG VÉ MIỄN PHÍ!", `${username} đã dùng 1 vé tích lũy minigame để lên xe VIP!`, "🎉");
      return;
    }
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

/* ================== HIỆU ỨNG NITRO TĂNG TỐC XE ĐẾN ĐÀ LẠT ================== */
function applyNitroBoost(username) {
  if (state.currentPhase === 2) {
    addTripStat("nitro", username, 1);
    const REDUCE_SECONDS = 120; // Rút ngắn 2 phút (120 giây)
    tripRemainingSeconds = Math.max(10, tripRemainingSeconds - REDUCE_SECONDS);
    updateTripTimerUI();

    const roadVideo = document.getElementById("cabin-road-video");
    const cabinStage = document.getElementById("bus-interior-stage");
    if (roadVideo) {
      roadVideo.playbackRate = 2.0;
    }
    if (cabinStage) {
      cabinStage.classList.add("nitro-boost");
    }

    setTimeout(() => {
      if (roadVideo) roadVideo.playbackRate = 1.0;
      if (cabinStage) cabinStage.classList.remove("nitro-boost");
    }, 5000);

    showToast("🚀 NITRO TĂNG TỐC!", `${username} vừa tặng Nitro! Rút ngắn 2 phút đến Đà Lạt!`, "⚡");
    triggerGuideActivity(`🚀 Cảm ơn ${username} đã tiếp Nitro! Bác tài đạp ga tăng tốc, rút ngắn ngay 2 phút đến Đà Lạt!`, "", true);

    if (appSettings.enableHorn) {
      playBusHorn();
    }
    showPassengerComment(username, "🚀 Bác tài đạp ga tăng tốc!");
  } else {
    showToast("🚀 TIẾP NITRO!", `${username} tặng Nitro chuẩn bị cho chuyến xe bứt tốc!`, "⚡");
  }
}

/* ================== SỰ KIỆN 2: TẶNG QUÀ & VÀO GHẾ VIP ================== */
function onPassengerGift(username, giftName) {
  if (state.isDeparting) return;

  addTripStat("gifts", username, 1);

  if (state.currentPhase === 3 && phase3State.stage === "result") {
    triggerArrivalGiftInteraction(username, giftName);
    return;
  }
  if (state.currentPhase === 3 && phase3State.stage === "game") {
    handleDestinationGameGift(username, giftName);
    return;
  }

  // 1. Tự động đổi nhạc khi khán giả tặng quà
  if (appSettings.enableGiftChangeMusic !== false) {
    triggerMusicChangeByGift(username, giftName);
  }

  // 2. Xử lý quà đặc biệt: 🚀 Nitro Tăng Tốc
  if (giftName && giftName.includes("Nitro")) {
    applyNitroBoost(username);
    if (state.currentPhase === 2) {
      return;
    }
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
  { x: 9.2, y: 76.5, scale: 1.08, zIndex: 15 },
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
    charEl.dataset.username = passenger.username;
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
let guideNextQuizTimeout = null;
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
  if (guideNextQuizTimeout) {
    clearTimeout(guideNextQuizTimeout);
    guideNextQuizTimeout = null;
  }
}

function scheduleNextGuideQuiz(delayMs = 14000) {
  if (guideNextQuizTimeout) clearTimeout(guideNextQuizTimeout);
  guideNextQuizTimeout = setTimeout(() => {
    if (state.currentPhase === 2 && !state.isDeparting) {
      triggerGuideActivity();
    }
  }, delayMs);
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
  } catch (e) { }
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
    addTripStat("quiz", winnerName, 1);
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

    // 5. Tự động chuyển sang câu hỏi tiếp theo sau khi chúc mừng 12s
    scheduleNextGuideQuiz(12000);
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

function getQuizConfiguredDuration() {
  const input = document.getElementById("input-quiz-duration");
  if (input) {
    const val = parseInt(input.value, 10);
    if (!isNaN(val) && val >= 5) {
      return val;
    }
  }
  return 120; // Mặc định 120 giây (2 phút)
}

function getDanceConfiguredDuration() {
  const input = document.getElementById("input-dance-duration");
  if (input) {
    const val = parseInt(input.value, 10);
    if (!isNaN(val) && val >= 3) {
      return val;
    }
  }
  return 30; // Mặc định 30 giây
}

function triggerGuideActivity(question = null, answer = null, force = false) {
  // Nếu là gọi tự động và đang có câu hỏi đố vui diễn ra chưa được trả lời (chưa hết thời gian), TUYỆT ĐỐI không được chuyển câu!
  if (!question && !force && currentActiveQA && !currentActiveQA.answered) {
    return;
  }

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

  // Nếu không có đáp án (chỉ là câu chào/giao lưu) thì hiện 8 giây rồi tự lên câu tiếp theo sau 12 giây
  if (!aText) {
    showGuideBubble("📢 HƯỚNG DẪN VIÊN", qText, false, 8000);
    scheduleNextGuideQuiz(12000);
    return;
  }

  // Đếm ngược thời gian do admin cài đặt (mặc định 120s)
  const quizDurationSec = getQuizConfiguredDuration();
  let remainingSec = quizDurationSec;

  function updateQuizCountdownHeader() {
    const m = Math.floor(remainingSec / 60);
    const s = remainingSec % 60;
    const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    const typeEl = document.getElementById("guide-bubble-type");
    if (typeEl) {
      typeEl.innerText = `❓ ĐỐ VUI CÓ THƯỞNG (${timeStr})`;
    }
  }

  const initialM = Math.floor(quizDurationSec / 60);
  const initialS = quizDurationSec % 60;
  const initialTimeStr = `${String(initialM).padStart(2, '0')}:${String(initialS).padStart(2, '0')}`;

  // Bước 1: Hiển thị câu hỏi đố vui lên màn hình và GIỮ NGUYÊN (autoHideDelay = false) trong suốt thời gian đã cài
  showGuideBubble(`❓ ĐỐ VUI CÓ THƯỞNG (${initialTimeStr})`, qText, false, false);

  // Bước 2: Đếm ngược từng giây; nếu hết giờ mà chưa ai trả lời -> Tự động đọc và hiện đáp án
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
          `Hết ${quizDurationSec} giây đố vui!<br>Đáp án: <b style="color:#34d399;">${cleanAns}</b>`,
          true,
          12000
        );

        if (appSettings.enableGuideVoice) {
          speakStationAnnouncement(timeoutSpeech);
        }

        showToast("⏰ HẾT THỜI GIAN ĐỐ VUI", `Đáp án chính xác: ${cleanAns}`, "💡");

        // Tự động lên câu hỏi đố vui tiếp theo sau 15 giây
        scheduleNextGuideQuiz(15000);
      }
    }
  }, 1000);
}

/* ================== HOẠT ĐỘNG 4: MINIGAME NỐI TỪ & TÍCH ĐIỂM VÉ MIỄN PHÍ ================== */
const WORDCHAIN_STORAGE_KEY = "fuongtrang_wordchain_points";
const FREETICKET_STORAGE_KEY = "fuongtrang_free_tickets";
const WORDCHAIN_DURATION_KEY = "fuongtrang_wordchain_duration";

const wordChainState = {
  active: false,
  currentWord: "Đà Lạt",
  currentLastWord: "lạt",
  durationMs: 20000,
  remainingMs: 20000,
  timerInterval: null
};

function getWordChainConfiguredDuration() {
  const durationInput = document.getElementById("input-wordchain-duration");
  if (durationInput) {
    const val = parseInt(durationInput.value, 10);
    if (!isNaN(val) && val >= 3) {
      return val;
    }
  }
  return 20; // Mặc định 20 giây
}

function getWordChainUserData() {
  try {
    const rawPts = localStorage.getItem(WORDCHAIN_STORAGE_KEY);
    const rawTkt = localStorage.getItem(FREETICKET_STORAGE_KEY);
    return {
      points: rawPts ? JSON.parse(rawPts) : {},
      tickets: rawTkt ? JSON.parse(rawTkt) : {}
    };
  } catch (e) {
    return { points: {}, tickets: {} };
  }
}

function saveWordChainUserData(points, tickets) {
  try {
    localStorage.setItem(WORDCHAIN_STORAGE_KEY, JSON.stringify(points));
    localStorage.setItem(FREETICKET_STORAGE_KEY, JSON.stringify(tickets));
  } catch (e) { }
}

function parseWordParts(phrase) {
  if (!phrase) return null;
  const clean = phrase.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'<>]/g, "").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length < 2) return null; // Từ phải có ít nhất 2 tiếng
  return {
    firstWord: words[0].toLowerCase(),
    lastWord: words[words.length - 1].toLowerCase(),
    fullPhrase: words.slice(0, 3).join(" ")
  };
}

function updateWordChainUI() {
  const currentWordEl = document.getElementById("wordchain-current-word");
  const nextLetterEl = document.getElementById("wordchain-next-letter");
  if (currentWordEl) currentWordEl.innerText = wordChainState.currentWord;
  if (nextLetterEl) {
    const cap = wordChainState.currentLastWord.charAt(0).toUpperCase() + wordChainState.currentLastWord.slice(1);
    nextLetterEl.innerText = cap;
  }
}

function startWordChain(initialWord = "") {
  let word = (initialWord || "").trim();
  if (!word) {
    const input = document.getElementById("input-wordchain-start");
    word = input ? input.value.trim() : "Đà Lạt";
  }
  const parts = parseWordParts(word);
  if (!parts) {
    wordChainState.currentWord = word || "Đà Lạt";
    const splitted = wordChainState.currentWord.split(/\s+/);
    wordChainState.currentLastWord = splitted[splitted.length - 1].toLowerCase();
  } else {
    wordChainState.currentWord = parts.fullPhrase;
    wordChainState.currentLastWord = parts.lastWord;
  }

  wordChainState.active = true;

  // Ẩn bảng câu hỏi HDV, hiện bảng minigame nối từ
  const guideBubble = document.getElementById("guide-bubble");
  const wordchainBox = document.getElementById("wordchain-box");
  if (guideBubble) guideBubble.classList.add("hidden");
  if (wordchainBox) wordchainBox.classList.remove("hidden");

  updateWordChainUI();
  const durationSec = getWordChainConfiguredDuration();
  const footerEl = document.getElementById("wordchain-last-winner");
  if (footerEl) footerEl.innerHTML = `⏱️ Còn ${durationSec} giây để nối từ tiếp theo...`;

  resetWordChainTimer();

  const capLetter = wordChainState.currentLastWord.charAt(0).toUpperCase() + wordChainState.currentLastWord.slice(1);
  if (appSettings.enableGuideVoice) {
    speakStationAnnouncement(`Bắt đầu minigame nối từ! Từ khởi đầu là ${wordChainState.currentWord}. Mau comment từ bắt đầu bằng chữ ${capLetter}!`);
  }
  showToast("🔤 MINIGAME NỐI TỪ", `Từ khóa: "${wordChainState.currentWord}". Nhanh tay comment từ bắt đầu bằng "${capLetter}" trong ${durationSec}s!`, "⏱️");
}

function resetWordChainTimer() {
  if (wordChainState.timerInterval) clearInterval(wordChainState.timerInterval);
  const durationSec = getWordChainConfiguredDuration();
  const durationMs = durationSec * 1000;
  wordChainState.durationMs = durationMs;
  wordChainState.remainingMs = durationMs;

  const timerBadge = document.getElementById("wordchain-timer");
  const timerFill = document.getElementById("wordchain-fill");

  if (timerBadge) timerBadge.innerText = `${String(durationSec).padStart(2, '0')}.0s`;
  if (timerFill) timerFill.style.width = "100%";

  wordChainState.timerInterval = setInterval(() => {
    wordChainState.remainingMs -= 100;
    const sec = Math.max(0, wordChainState.remainingMs / 1000);

    if (timerBadge) {
      timerBadge.innerText = sec < 10 ? `0${sec.toFixed(1)}s` : `${sec.toFixed(1)}s`;
    }
    if (timerFill) {
      const pct = Math.max(0, Math.min(100, (wordChainState.remainingMs / wordChainState.durationMs) * 100));
      timerFill.style.width = `${pct}%`;
    }

    if (wordChainState.remainingMs <= 0) {
      clearInterval(wordChainState.timerInterval);
      wordChainState.timerInterval = null;
      endWordChainByTimeout();
    }
  }, 100);
}

function endWordChainByTimeout() {
  const durationSec = Math.round((wordChainState.durationMs || 20000) / 1000);
  const footerEl = document.getElementById("wordchain-last-winner");
  if (footerEl) {
    footerEl.innerHTML = `⏰ <b style="color:#ef4444;">HẾT ${durationSec} GIÂY!</b> Không ai đối được từ "${wordChainState.currentWord}". Trò chơi kết thúc!`;
  }

  if (appSettings.enableGuideVoice) {
    speakStationAnnouncement(`Hết ${durationSec} giây rồi bà con ơi! Không ai đối được từ ${wordChainState.currentWord}. Minigame nối từ kết thúc!`);
  }
  showToast("⏰ KẾT THÚC NỐI TỪ", `Hết ${durationSec} giây không ai đối được từ "${wordChainState.currentWord}"!`, "💡");

  setTimeout(() => {
    stopWordChain();
  }, 3500);
}

function stopWordChain() {
  wordChainState.active = false;
  if (wordChainState.timerInterval) {
    clearInterval(wordChainState.timerInterval);
    wordChainState.timerInterval = null;
  }
  const wordchainBox = document.getElementById("wordchain-box");
  if (wordchainBox) wordchainBox.classList.add("hidden");

  // Hiển thị lại câu hỏi HDV nếu có
  const guideBubble = document.getElementById("guide-bubble");
  if (guideBubble && currentActiveQA) {
    guideBubble.classList.remove("hidden");
  }
}

function awardWordChainWin(username, matchedPhrase) {
  addTripStat("wordChain", username, 1);
  const data = getWordChainUserData();
  const currentPts = (data.points[username] || 0) + 1;
  let newTickets = data.tickets[username] || 0;
  let gotNewTicket = false;

  if (currentPts >= 20) {
    newTickets += 1;
    data.points[username] = currentPts - 20; // 20 điểm đổi 1 vé miễn phí
    gotNewTicket = true;
  } else {
    data.points[username] = currentPts;
  }
  data.tickets[username] = newTickets;
  saveWordChainUserData(data.points, data.tickets);
  renderWordChainLeaderboard();

  return {
    points: data.points[username],
    tickets: newTickets,
    gotNewTicket
  };
}

function checkWordChainComment(username, text) {
  if (!wordChainState.active) return false;
  const parts = parseWordParts(text);
  if (!parts) return false;

  // So sánh tiếng đầu của câu trả lời với tiếng cuối của từ hiện tại
  if (parts.firstWord.toLowerCase() === wordChainState.currentLastWord.toLowerCase()) {
    const matchedPhrase = parts.fullPhrase;
    wordChainState.currentWord = matchedPhrase;
    wordChainState.currentLastWord = parts.lastWord;

    const result = awardWordChainWin(username, matchedPhrase);
    updateWordChainUI();

    const footerEl = document.getElementById("wordchain-last-winner");
    if (footerEl) {
      footerEl.innerHTML = `🎉 <b>${username}</b> nối đúng: "<span style="color:#38bdf8;">${matchedPhrase}</span>" (+1đ | có <b>${result.points}/20đ</b>, <b>${result.tickets}</b> vé free)`;
    }

    if (result.gotNewTicket) {
      showToast("🎟️ ĐẠT 1 VÉ MIỄN PHÍ!", `Chúc mừng ${username} tích đủ 20 điểm và nhận 1 Vé Free cho chuyến sau!`, "🏆");
      triggerGuideActivity(`Chúc mừng ${username} tích đủ 20 điểm nối từ và nhận 1 vé xe miễn phí cho chuyến sau!`, "", true);
    } else {
      showToast("🎯 NỐI TỪ ĐÚNG!", `${username} nối đúng "${matchedPhrase}"! (+1đ, hiện có ${result.points}/20đ)`, "⭐");
    }

    // Reset lại 20 giây cho từ tiếp theo
    resetWordChainTimer();
    return true;
  }

  return false;
}

function renderWordChainLeaderboard() {
  const listContainer = document.getElementById("wordchain-leaderboard-list");
  if (!listContainer) return;
  const data = getWordChainUserData();

  const users = Object.keys(data.points);
  Object.keys(data.tickets).forEach(u => {
    if (!users.includes(u)) users.push(u);
  });

  if (users.length === 0) {
    listContainer.innerHTML = '<div class="empty-leaderboard">Chưa có ai tích điểm nối từ. Hãy chơi minigame để tích lũy!</div>';
    return;
  }

  users.sort((a, b) => {
    const tA = data.tickets[a] || 0;
    const tB = data.tickets[b] || 0;
    if (tB !== tA) return tB - tA;
    return (data.points[b] || 0) - (data.points[a] || 0);
  });

  listContainer.innerHTML = users.map((u, idx) => {
    const pts = data.points[u] || 0;
    const tkts = data.tickets[u] || 0;
    return `
      <div class="wordchain-user-row">
        <span class="wordchain-user-name">${idx + 1}. ${u}</span>
        <div class="wordchain-user-stats">
          <span class="wordchain-stat-badge stat-pts">${pts}/20 điểm</span>
          <span class="wordchain-stat-badge stat-tickets">🎟️ ${tkts} vé free</span>
        </div>
      </div>
    `;
  }).join("");
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
  } catch (e) { }
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

  function startCabinDance(mode = null, duration = null) {
    if (mode) currentDanceMode = mode;
    isCabinDancing = true;

    const durationMs = (typeof duration === "number" && duration > 0)
      ? duration
      : (getDanceConfiguredDuration() * 1000);

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

    // Tự động dừng sau thời gian duration (do admin cài đặt hoặc mặc định 30 giây)
    cabinDanceTimeout = setTimeout(() => {
      stopCabinDance();
  }, durationMs);
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

/* ================== PHASE 3: ĐẾN ĐÀ LẠT ================== */
const CHECKIN_OPTIONS = [
  {
    id: 1,
    name: "Hồ Xuân Hương",
    icon: "🌊",
    distance: "Cách 2 km",
    image: "public/dalat-xuan-huong.jpg",
    tags: ["Hồ thơ mộng", "Rừng thông", "Không khí mát lạnh"],
    credit: "Ảnh: P. Hughes • CC BY 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Da_Lat_-_Xuan_Huong_Lake.jpg"
  },
  {
    id: 2,
    name: "Quảng trường Lâm Viên",
    icon: "🌼",
    distance: "Cách 3 km",
    image: "public/dalat-lam-vien.jpg",
    tags: ["Nụ hoa Atisô", "Quảng trường trung tâm", "Sát Hồ Xuân Hương"],
    credit: "Ảnh: EA • CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:L%C3%A2m_Vi%C3%AAn_%C4%90%C3%A0_L%E1%BA%A1t.JPG"
  },
  {
    id: 3,
    name: "Đỉnh Langbiang",
    icon: "⛰️",
    distance: "Cách 12 km",
    image: "public/dalat-langbiang.jpg",
    tags: ["Đường đèo", "Rừng thông", "Ngắm toàn cảnh cao nguyên"],
    credit: "Ảnh: The Erica Chang • CC BY 3.0",
    source: "https://commons.wikimedia.org/wiki/File:Lang_Biang_mountain_in_Da_Lat_Vietnam_-_panoramio.jpg"
  }
];

const LUGGAGE_PRIZES = [
  { label: "1 Vé miễn phí", icon: "🎟️", freeTicket: true },
  { label: "Giỏ dâu Đà Lạt", icon: "🍓" },
  { label: "Bó hoa thành phố", icon: "💐" },
  { label: "Móc khóa xe khách", icon: "🚌" },
  { label: "Hộp trà Atisô", icon: "🍵" }
];

const phase3State = {
  stage: "idle",
  countdownInterval: null,
  advanceTimeout: null,
  disembarkTimeouts: [],
  arrivalWanderInterval: null,
  visitCountdownInterval: null,
  visitRemainingSeconds: 30 * 60,
  luggageClaims: [],
  luggageUserClaims: new Map(),
  eligibleLuggageUsers: new Set(),
  luggageRejectedUsers: new Set(),
  luggagePrizes: [],
  checkinVotes: new Map(),
  voteCounts: [0, 0, 0],
  selectedDestinationIndex: 0
};

const destinationGameState = {
  active: false,
  type: "",
  remaining: 45,
  teams: [],
  userTeams: new Map(),
  userDisplayNames: new Map(),
  userPoints: new Map(),
  boatPhase: "select",
  climbPhase: "select",
  climbObstacleTimers: [],
  climbObstacleSequence: 0,
  roundCommand: "",
  roundAnswered: new Set(),
  challenge: "",
  giftGoalEnergy: 0,
  giftGoalTarget: 20,
  giftGoalLevel: 1,
  supporterPoints: new Map(),
  giftHistory: [],
  timerInterval: null,
  eventInterval: null
};

function stopDestinationGameTimers() {
  if (destinationGameState.timerInterval) clearInterval(destinationGameState.timerInterval);
  if (destinationGameState.eventInterval) clearInterval(destinationGameState.eventInterval);
  destinationGameState.timerInterval = null;
  destinationGameState.eventInterval = null;
  destinationGameState.climbObstacleTimers.forEach(timeoutId => clearTimeout(timeoutId));
  destinationGameState.climbObstacleTimers = [];
  document.querySelectorAll(".climb-falling-obstacle").forEach(obstacle => obstacle.remove());
  destinationGameState.active = false;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function clearPhase3Timers() {
  stopDestinationGameTimers();
  if (phase3State.countdownInterval) {
    clearInterval(phase3State.countdownInterval);
    phase3State.countdownInterval = null;
  }
  if (phase3State.advanceTimeout) {
    clearTimeout(phase3State.advanceTimeout);
    phase3State.advanceTimeout = null;
  }
  phase3State.disembarkTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
  phase3State.disembarkTimeouts = [];
  if (phase3State.arrivalWanderInterval) {
    clearInterval(phase3State.arrivalWanderInterval);
    phase3State.arrivalWanderInterval = null;
  }
  if (phase3State.visitCountdownInterval) {
    clearInterval(phase3State.visitCountdownInterval);
    phase3State.visitCountdownInterval = null;
  }
  const visitTimeline = document.getElementById("destination-visit-timeline");
  if (visitTimeline) visitTimeline.classList.add("hidden");
  document.getElementById("dalat-arrival-stage")?.classList.remove("visit-timer-active");
  document.querySelectorAll("#arrival-passengers-layer .arrival-passenger")
    .forEach(charEl => stopArrivalWalkFrames(charEl));
}

function setPhase3Countdown(seconds, onComplete) {
  clearPhase3Timers();
  let remaining = seconds;
  const timerEl = document.getElementById("arrival-stage-timer");
  const update = () => {
    if (timerEl) timerEl.innerText = formatTripTime(Math.max(0, remaining));
  };
  update();
  phase3State.countdownInterval = setInterval(() => {
    remaining--;
    update();
    if (remaining <= 0) {
      clearPhase3Timers();
      onComplete();
    }
  }, 1000);
}

function showPhase3Panel(panelId) {
  ["arrival-summary-panel", "arrival-luggage-panel", "arrival-checkin-panel", "arrival-travel-panel", "arrival-result-panel", "arrival-game-panel"]
    .forEach(id => {
      const panel = document.getElementById(id);
      if (panel) panel.classList.toggle("hidden", id !== panelId);
    });
}

function getTopTripStat(category) {
  const entries = Object.entries(tripStats[category] || {});
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return { name: entries[0][0], value: entries[0][1] };
}

function getTopCombinedTripStat(categories) {
  const totals = {};
  categories.forEach(category => {
    Object.entries(tripStats[category] || {}).forEach(([name, value]) => {
      totals[name] = (totals[name] || 0) + value;
    });
  });
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  return entries.length ? { name: entries[0][0], value: entries[0][1] } : null;
}

function fallbackPassengerName(index = 0) {
  const passenger = state.seatedPassengers[index % Math.max(1, state.seatedPassengers.length)];
  return passenger ? passenger.username : "Cả đoàn";
}

function renderArrivalSummary() {
  const passengerCountEl = document.getElementById("summary-passenger-count");
  const fuelCountEl = document.getElementById("summary-fuel-count");
  const quizCountEl = document.getElementById("summary-quiz-count");
  if (passengerCountEl) passengerCountEl.innerText = state.seatedPassengers.length;
  if (fuelCountEl) fuelCountEl.innerText = `${currentFuel}L`;
  if (quizCountEl) {
    quizCountEl.innerText = Object.values(tripStats.quiz).reduce((sum, value) => sum + value, 0);
  }

  const fuelWinner = getTopTripStat("fuel");
  const quizWinner = getTopTripStat("quiz");
  const wordWinner = getTopTripStat("wordChain");
  const activeWinner = getTopCombinedTripStat(["gifts", "nitro", "horn"]);
  const awards = [
    { icon: "⛽", title: "Tiếp sức nhiều nhất", winner: fuelWinner, fallback: 0 },
    { icon: "🧠", title: "Vua đố vui", winner: quizWinner, fallback: 1 },
    { icon: "🔤", title: "Cao thủ nối từ", winner: wordWinner, fallback: 2 },
    { icon: "💖", title: "Nhiệt tình nhất", winner: activeWinner, fallback: 3 }
  ];
  const container = document.getElementById("arrival-awards");
  if (container) {
    container.innerHTML = awards.map(award => `
      <div class="arrival-award">
        <div class="arrival-award-icon">${award.icon}</div>
        <div class="arrival-award-title">${award.title}</div>
        <div class="arrival-award-name">${escapeHtml(award.winner?.name || fallbackPassengerName(award.fallback))}</div>
      </div>
    `).join("");
  }
}

function shuffledLuggagePrizes() {
  const prizes = [...LUGGAGE_PRIZES];
  for (let i = prizes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [prizes[i], prizes[j]] = [prizes[j], prizes[i]];
  }
  return prizes;
}

function renderLuggageCarousel() {
  const container = document.getElementById("luggage-carousel");
  if (!container) return;
  container.innerHTML = phase3State.luggageClaims.map((claim, index) => {
    const prize = phase3State.luggagePrizes[index];
    return `
      <div class="luggage-item ${claim ? "claimed" : ""}">
        <span class="luggage-number">${index + 1}</span>
        <div class="luggage-icon">${claim ? prize.icon : "🧳"}</div>
        <div class="luggage-owner">${claim ? escapeHtml(claim) : "Chưa có chủ"}</div>
        <div class="luggage-prize">${claim ? escapeHtml(prize.label) : "Quà bí mật"}</div>
      </div>
    `;
  }).join("");
}

function awardFreeTicket(username) {
  const data = getWordChainUserData();
  data.tickets[username] = (data.tickets[username] || 0) + 1;
  saveWordChainUserData(data.points, data.tickets);
  renderWordChainLeaderboard();
}

function normalizeAudienceName(username) {
  return String(username || "").trim().toLocaleLowerCase("vi");
}

function claimLuggage(username, luggageNumber) {
  const index = luggageNumber - 1;
  const audienceKey = normalizeAudienceName(username);
  if (index < 0 || index >= phase3State.luggageClaims.length) return;
  if (!phase3State.eligibleLuggageUsers.has(audienceKey)) {
    if (!phase3State.luggageRejectedUsers.has(audienceKey)) {
      phase3State.luggageRejectedUsers.add(audienceKey);
      showToast("🎟️ CHƯA CÓ VÉ PHASE 1", `${username} chưa đi trên chuyến xe nên không có hành lý. Bạn vẫn được bình chọn check-in nhé!`, "🧳");
    }
    return;
  }
  if (phase3State.luggageUserClaims.has(audienceKey)) {
    showToast("🧳 ĐÃ NHẬN HÀNH LÝ", `${username} đã nhận một vali rồi!`, "✅");
    return;
  }
  if (phase3State.luggageClaims[index]) {
    showToast("⏱️ CHẬM MẤT RỒI!", `Vali số ${luggageNumber} đã thuộc về ${phase3State.luggageClaims[index]}.`, "🧳");
    return;
  }

  const prize = phase3State.luggagePrizes[index];
  phase3State.luggageClaims[index] = username;
  phase3State.luggageUserClaims.set(audienceKey, luggageNumber);
  if (prize.freeTicket) awardFreeTicket(username);
  renderLuggageCarousel();

  const announcement = document.getElementById("luggage-announcement");
  if (announcement) announcement.innerHTML = `🎉 <b>${escapeHtml(username)}</b> nhận vali số ${luggageNumber}: <b>${prize.icon} ${escapeHtml(prize.label)}</b>`;
  showToast("🧳 NHẬN VALI THÀNH CÔNG!", `${username} mở được ${prize.label}!`, prize.icon);

  if (phase3State.luggageClaims.every(Boolean)) {
    clearPhase3Timers();
    phase3State.advanceTimeout = setTimeout(startCheckinVoting, 2200);
  }
}

function startLuggageGame() {
  if (state.currentPhase !== 3) return;
  phase3State.stage = "luggage";
  showPhase3Panel("arrival-luggage-panel");
  renderLuggageCarousel();
  showToast("🧳 NHẬN HÀNH LÝ!", "Gõ số từ 1 đến 5 để giành một chiếc vali bí mật!", "🎁");
  setPhase3Countdown(35, startCheckinVoting);
}

function renderCheckinOptions() {
  const container = document.getElementById("checkin-options");
  if (!container) return;
  const maxVotes = Math.max(...phase3State.voteCounts);
  container.innerHTML = CHECKIN_OPTIONS.map((option, index) => `
    <div class="checkin-option ${maxVotes > 0 && phase3State.voteCounts[index] === maxVotes ? "leading" : ""}">
      <span class="checkin-number">${option.id}</span>
      <span class="checkin-icon">${option.icon}</span>
      <div class="checkin-name">${option.name}</div>
      <div class="checkin-votes">${phase3State.voteCounts[index]} phiếu</div>
    </div>
  `).join("");
}

function setArrivalDestinationBackground(option = null) {
  const stage = document.getElementById("dalat-arrival-stage");
  const creditEl = document.querySelector(".dalat-photo-credit");
  if (!stage) return;
  const image = option?.image || "public/dalat-arrival.jpg";
  stage.style.backgroundImage = `url("${image}")`;
  if (creditEl) {
    creditEl.innerText = option?.credit || "Ảnh: Tuong Lam Photos • CC BY-SA 4.0";
    creditEl.href = option?.source || "https://commons.wikimedia.org/wiki/File:Da_Lat_-_Viet_Nam.jpg";
  }
}

function updateDestinationVisitTimerUI() {
  const countdownEl = document.getElementById("visit-timeline-countdown");
  const fillEl = document.getElementById("visit-timeline-fill");
  if (countdownEl) countdownEl.innerText = formatTripTime(Math.max(0, phase3State.visitRemainingSeconds));
  if (fillEl) {
    const elapsed = (30 * 60) - phase3State.visitRemainingSeconds;
    fillEl.style.width = `${Math.min(100, Math.max(0, elapsed / (30 * 60) * 100)).toFixed(1)}%`;
  }
}

function startDestinationVisitTimer(destination) {
  if (phase3State.visitCountdownInterval) clearInterval(phase3State.visitCountdownInterval);
  phase3State.visitRemainingSeconds = 30 * 60;
  const timelineEl = document.getElementById("destination-visit-timeline");
  const labelEl = document.getElementById("visit-timeline-label");
  const titleEl = document.getElementById("arrival-title");
  const routeEl = document.getElementById("arrival-route-label");
  const stage = document.getElementById("dalat-arrival-stage");
  if (timelineEl) timelineEl.classList.remove("hidden");
  if (labelEl) labelEl.innerText = `🕒 THAM QUAN ${destination.name.toUpperCase()}`;
  if (titleEl) titleEl.innerText = `KHÁM PHÁ ${destination.name.toUpperCase()}`;
  if (routeEl) routeEl.innerText = `🚌 TRUNG TÂM ĐÀ LẠT → ${destination.name.toUpperCase()}`;
  if (stage) stage.classList.add("visit-timer-active");
  updateDestinationVisitTimerUI();

  phase3State.visitCountdownInterval = setInterval(() => {
    phase3State.visitRemainingSeconds--;
    updateDestinationVisitTimerUI();
    if (phase3State.visitRemainingSeconds <= 0) returnToDalatHub();
  }, 1000);
}

function returnToDalatHub() {
  if (state.currentPhase !== 3) return;
  clearPhase3Timers();
  phase3State.stage = "returned";
  const stage = document.getElementById("dalat-arrival-stage");
  const passengerLayer = document.getElementById("arrival-passengers-layer");
  const effectsLayer = document.getElementById("arrival-live-effects");
  const titleEl = document.getElementById("arrival-title");
  const routeEl = document.getElementById("arrival-route-label");
  const timerEl = document.getElementById("arrival-stage-timer");
  if (stage) stage.classList.remove("travelling", "unloading", "bus-leaving", "bus-gone");
  if (passengerLayer) passengerLayer.innerHTML = "";
  if (effectsLayer) effectsLayer.innerHTML = "";
  setArrivalDestinationBackground();
  if (titleEl) titleEl.innerText = "ĐÃ TRỞ VỀ TRUNG TÂM ĐÀ LẠT";
  if (routeEl) routeEl.innerText = "🚌 ĐIỂM THAM QUAN → TRUNG TÂM ĐÀ LẠT";
  if (timerEl) timerEl.innerText = "ĐÃ VỀ";

  const iconEl = document.getElementById("checkin-result-icon");
  const nameEl = document.getElementById("checkin-result-name");
  const votesEl = document.getElementById("checkin-result-votes");
  const statusEl = document.getElementById("arrival-passenger-status");
  if (iconEl) iconEl.innerText = "🚌";
  if (nameEl) nameEl.innerText = "Trung tâm Đà Lạt";
  if (votesEl) votesEl.innerText = "Đã kết thúc 30 phút tham quan";
  if (statusEl) statusEl.innerText = "✅ Cả đoàn đã trở về Đà Lạt an toàn";
  showPhase3Panel("arrival-result-panel");
  showToast("🚌 ĐÃ TRỞ VỀ ĐÀ LẠT!", "Kết thúc 30 phút tham quan. Cảm ơn cả đoàn!", "🏔️");
  speakStationAnnouncement("Đã hết thời gian tham quan. Xe đã đưa cả đoàn trở về trung tâm Đà Lạt an toàn!");
}

function startCheckinVoting() {
  if (state.currentPhase !== 3) return;
  phase3State.stage = "checkin";
  showPhase3Panel("arrival-checkin-panel");
  renderCheckinOptions();
  showToast("📸 BÌNH CHỌN CHECK-IN!", "Gõ 1, 2 hoặc 3 để chọn địa điểm cả đoàn sẽ ghé thăm!", "🏔️");
  setPhase3Countdown(35, finishCheckinVoting);
}

function voteCheckin(username, optionNumber) {
  const index = optionNumber - 1;
  const audienceKey = normalizeAudienceName(username);
  if (index < 0 || index >= CHECKIN_OPTIONS.length) return;
  const oldIndex = phase3State.checkinVotes.get(audienceKey);
  if (oldIndex === index) return;
  if (oldIndex !== undefined) {
    phase3State.voteCounts[oldIndex] = Math.max(0, phase3State.voteCounts[oldIndex] - 1);
  }
  phase3State.checkinVotes.set(audienceKey, index);
  phase3State.voteCounts[index]++;
  renderCheckinOptions();
  const announcement = document.getElementById("checkin-announcement");
  if (announcement) announcement.innerHTML = `📸 <b>${escapeHtml(username)}</b> chọn <b>${CHECKIN_OPTIONS[index].name}</b>`;
}

function finishCheckinVoting() {
  if (state.currentPhase !== 3) return;
  const maxVotes = Math.max(...phase3State.voteCounts);
  const candidateIndexes = phase3State.voteCounts
    .map((count, index) => ({ count, index }))
    .filter(item => item.count === maxVotes)
    .map(item => item.index);
  const winnerIndex = candidateIndexes[Math.floor(Math.random() * candidateIndexes.length)] || 0;
  startTravelToCheckin(winnerIndex);
}

function startTravelToCheckin(winnerIndex) {
  if (state.currentPhase !== 3) return;
  phase3State.stage = "travel";
  phase3State.selectedDestinationIndex = winnerIndex;
  const winner = CHECKIN_OPTIONS[winnerIndex] || CHECKIN_OPTIONS[0];
  const stage = document.getElementById("dalat-arrival-stage");
  const nameEl = document.getElementById("travel-destination-name");
  const iconEl = document.getElementById("travel-destination-icon");
  const distanceEl = document.getElementById("travel-distance-label");
  const tagsEl = document.getElementById("travel-scenery-tags");
  const progressEl = document.getElementById("travel-progress-fill");
  const passengerLayer = document.getElementById("arrival-passengers-layer");
  if (passengerLayer) passengerLayer.innerHTML = "";
  const effectsLayer = document.getElementById("arrival-live-effects");
  if (effectsLayer) effectsLayer.innerHTML = "";
  if (nameEl) nameEl.innerText = winner.name;
  if (iconEl) iconEl.innerText = winner.icon;
  if (distanceEl) distanceEl.innerText = winner.distance;
  if (tagsEl) {
    tagsEl.innerHTML = winner.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join("");
  }
  setArrivalDestinationBackground(winner);
  showPhase3Panel("arrival-travel-panel");
  if (stage) {
    stage.classList.remove("unloading", "bus-leaving", "bus-gone");
    stage.classList.add("travelling");
  }
  if (progressEl) {
    progressEl.classList.remove("active");
    void progressEl.offsetWidth;
    progressEl.classList.add("active");
  }
  showToast("🚌 KHỞI HÀNH CHECK-IN!", `Cả đoàn đang di chuyển đến ${winner.name}!`, winner.icon);
  speakStationAnnouncement(`Địa điểm được yêu thích nhất là ${winner.name}. Xe bắt đầu di chuyển, mời cả đoàn chuẩn bị check in!`);
  setPhase3Countdown(12, () => showCheckinArrivalResult(winnerIndex));
}

function showCheckinArrivalResult(winnerIndex) {
  if (state.currentPhase !== 3) return;
  phase3State.stage = "result";
  const winner = CHECKIN_OPTIONS[winnerIndex] || CHECKIN_OPTIONS[0];
  const stage = document.getElementById("dalat-arrival-stage");
  if (stage) {
    stage.classList.remove("travelling");
    stage.classList.add("unloading");
  }

  const iconEl = document.getElementById("checkin-result-icon");
  const nameEl = document.getElementById("checkin-result-name");
  const votesEl = document.getElementById("checkin-result-votes");
  if (iconEl) iconEl.innerText = winner.icon;
  if (nameEl) nameEl.innerText = winner.name;
  if (votesEl) votesEl.innerText = `${phase3State.voteCounts[winnerIndex]} lượt bình chọn`;
  showPhase3Panel("arrival-result-panel");
  showToast("📸 ĐÃ ĐẾN NƠI!", `Cả đoàn đã đến ${winner.name}, cùng check-in nào!`, winner.icon);
  speakStationAnnouncement(`Xe đã đến ${winner.name}. Mời cả đoàn cùng chụp ảnh check in!`);
  // Giữ nguyên giao diện tại địa điểm check-in. Chỉ quay lại bến khi streamer
  // chủ động bấm nút "Đặt lại bến" trong bảng quản trị.
  clearPhase3Timers();
  const timerEl = document.getElementById("arrival-stage-timer");
  if (timerEl) timerEl.innerText = "ĐÃ ĐẾN";
  startDestinationVisitTimer(winner);
  renderArrivalPassengers();
}

const ARRIVAL_PASSENGER_SPOTS = Array.from({ length: 20 }, (_, index) => {
  const row = Math.floor(index / 5);
  const column = index % 5;
  const xRows = [
    [14, 32, 50, 68, 86],
    [9, 29, 50, 71, 91],
    [14, 32, 50, 68, 86],
    [9, 29, 50, 71, 91]
  ];
  return {
    x: xRows[row][column],
    y: 58 + row * 9.5,
    scale: 0.48 + row * 0.1,
    zIndex: 14 + row
  };
});

function renderArrivalPassengers() {
  const layer = document.getElementById("arrival-passengers-layer");
  const statusEl = document.getElementById("arrival-passenger-status");
  const stage = document.getElementById("dalat-arrival-stage");
  if (!layer) return;
  layer.innerHTML = "";

  const passengers = state.seatedPassengers.slice(0, ARRIVAL_PASSENGER_SPOTS.length);
  if (statusEl) statusEl.innerText = `🚪 Đang xuống xe: 0/${passengers.length} hành khách`;
  if (passengers.length === 0) {
    if (statusEl) statusEl.innerText = "🚌 Xe không có hành khách";
    if (stage) stage.classList.remove("unloading");
    const leaveTimeout = setTimeout(() => stage?.classList.add("bus-leaving"), 500);
    const gameTimeout = setTimeout(() => {
      if (stage) {
        stage.classList.remove("bus-leaving");
        stage.classList.add("bus-gone");
      }
      startDestinationGame(phase3State.selectedDestinationIndex);
    }, 2400);
    phase3State.disembarkTimeouts.push(leaveTimeout, gameTimeout);
    return;
  }

  let arrivedCount = 0;
  passengers.forEach((passenger, index) => {
    const spot = ARRIVAL_PASSENGER_SPOTS[index];
    const charEl = createCharacterElement(passenger.username, passenger.giftName);
    charEl.id = `arrival-char-${passenger.username.replace(/\s+/g, "_")}`;
    charEl.className = "arrival-passenger";
    charEl.dataset.username = passenger.username;
    charEl.style.left = "55%";
    charEl.style.top = "78%";
    charEl.style.zIndex = spot.zIndex;
    charEl.style.setProperty("--arrival-scale", spot.scale.toFixed(2));
    layer.appendChild(charEl);

    const startTimeout = setTimeout(() => {
      charEl.classList.add("walking", "disembarking");
      charEl.style.left = `${spot.x}%`;
      charEl.style.top = `${spot.y}%`;
      charEl.style.opacity = "1";
      charEl.style.transform = `translate(-50%, -92%) scale(${spot.scale.toFixed(2)})`;
      startArrivalWalkFrames(charEl, 950);

      const finishTimeout = setTimeout(() => {
        charEl.classList.remove("walking", "disembarking");
        charEl.classList.add("arrived");
        arrivedCount++;
        if (statusEl) statusEl.innerText = `✅ Đã xuống xe: ${arrivedCount}/${passengers.length} hành khách`;
        if (arrivedCount === passengers.length) {
          if (stage) stage.classList.remove("unloading");
          const destinationName = document.getElementById("checkin-result-name")?.innerText || "điểm check-in";
          showToast("👥 CẢ ĐOÀN ĐÃ XUỐNG XE!", `${passengers.length} hành khách đã tập trung tại ${destinationName}!`, "📸");
          const leaveTimeout = setTimeout(() => {
            if (stage) stage.classList.add("bus-leaving");
            if (statusEl) statusEl.innerText = `👋 Xe đã trả đủ ${passengers.length} khách và đang rời đi`;
          }, 650);
          const roamTimeout = setTimeout(() => {
            if (stage) {
              stage.classList.remove("bus-leaving");
              stage.classList.add("bus-gone");
            }
            startArrivalFreeRoam();
            if (statusEl) statusEl.innerText = `🌲 ${passengers.length} hành khách đang tự do tham quan`;
            const gameTimeout = setTimeout(() => {
              startDestinationGame(phase3State.selectedDestinationIndex);
            }, 1400);
            phase3State.disembarkTimeouts.push(gameTimeout);
          }, 2450);
          phase3State.disembarkTimeouts.push(leaveTimeout, roamTimeout);
        }
      }, 950);
      phase3State.disembarkTimeouts.push(finishTimeout);
    }, 350 + index * 210);
    phase3State.disembarkTimeouts.push(startTimeout);
  });
}

function findArrivalPassenger(username) {
  const audienceKey = normalizeAudienceName(username);
  return Array.from(document.querySelectorAll("#arrival-passengers-layer .arrival-passenger"))
    .find(charEl => normalizeAudienceName(charEl.dataset.username) === audienceKey) || null;
}

function moveArrivalPassengerRandom(charEl, wideMove = false) {
  if (!charEl || charEl.classList.contains("disembarking") || charEl.classList.contains("on-boat")) return;
  const currentX = parseFloat(charEl.style.left) || 50;
  const currentY = parseFloat(charEl.style.top) || 72;
  const rangeX = wideMove ? 28 : 15;
  const rangeY = wideMove ? 14 : 8;
  const nextX = Math.max(6, Math.min(94, currentX + (Math.random() * rangeX * 2 - rangeX)));
  const nextY = Math.max(56, Math.min(91, currentY + (Math.random() * rangeY * 2 - rangeY)));
  const scale = 0.46 + ((nextY - 56) / 35) * 0.34;

  charEl.classList.add("walking");
  charEl.style.left = `${nextX.toFixed(1)}%`;
  charEl.style.top = `${nextY.toFixed(1)}%`;
  charEl.style.zIndex = Math.round(14 + ((nextY - 56) / 35) * 5);
  charEl.style.transform = `translate(-50%, -92%) scale(${scale.toFixed(2)})`;
  startArrivalWalkFrames(charEl, 950);

  setTimeout(() => charEl.classList.remove("walking"), 950);
}

function stopArrivalWalkFrames(charEl) {
  if (!charEl?._arrivalWalkInterval) return;
  clearInterval(charEl._arrivalWalkInterval);
  charEl._arrivalWalkInterval = null;
  const spriteImg = charEl.querySelector(".char-sprite-img");
  if (spriteImg) {
    const charNum = getCharacterTypeForUser(charEl.dataset.username || "Hành khách");
    spriteImg.src = getArrivalCharacterFrames(charNum)[0];
  }
}

function getArrivalCharacterFrames(charNum) {
  const frameSets = {
    1: SPRITE_FRAMES_CHAR1,
    2: SPRITE_FRAMES_CHAR2,
    3: SPRITE_FRAMES_CHAR3,
    4: SPRITE_FRAMES_CHAR4,
    5: SPRITE_FRAMES_CHAR5
  };
  return frameSets[charNum] || SPRITE_FRAMES_CHAR1;
}

function startArrivalWalkFrames(charEl, duration = 950) {
  if (!charEl) return;
  stopArrivalWalkFrames(charEl);
  const spriteImg = charEl.querySelector(".char-sprite-img");
  if (!spriteImg) return;
  const charNum = getCharacterTypeForUser(charEl.dataset.username || "Hành khách");
  const frames = getArrivalCharacterFrames(charNum);
  let frameIndex = 0;
  charEl._arrivalWalkInterval = setInterval(() => {
    frameIndex = (frameIndex + 1) % frames.length;
    spriteImg.src = frames[frameIndex];
  }, 100);
  setTimeout(() => stopArrivalWalkFrames(charEl), duration);
}

function startArrivalFreeRoam() {
  if (phase3State.arrivalWanderInterval) clearInterval(phase3State.arrivalWanderInterval);
  const wanderSomePassengers = () => {
    if (state.currentPhase !== 3 || !["result", "game"].includes(phase3State.stage)) return;
    const chars = Array.from(document.querySelectorAll("#arrival-passengers-layer .arrival-passenger:not(.on-boat)"))
      .filter(charEl => !charEl.classList.contains("disembarking"));
    chars.sort(() => Math.random() - 0.5)
      .slice(0, Math.min(chars.length, 3 + Math.floor(Math.random() * 4)))
      .forEach(charEl => moveArrivalPassengerRandom(charEl));
  };
  wanderSomePassengers();
  phase3State.arrivalWanderInterval = setInterval(wanderSomePassengers, 1250);
}

function createArrivalLiveEffect(symbol, targetEl = null, count = 8) {
  const layer = document.getElementById("arrival-live-effects");
  if (!layer) return;
  const baseX = targetEl ? (parseFloat(targetEl.style.left) || 50) : 50;
  const baseY = targetEl ? (parseFloat(targetEl.style.top) || 70) : 62;
  for (let index = 0; index < count; index++) {
    const effect = document.createElement("span");
    effect.className = "arrival-live-effect";
    effect.innerText = symbol;
    effect.style.left = `${Math.max(4, Math.min(96, baseX + (Math.random() * 18 - 9)))}%`;
    effect.style.top = `${Math.max(28, Math.min(90, baseY + (Math.random() * 8 - 4)))}%`;
    effect.style.setProperty("--effect-x", `${Math.random() * 90 - 45}px`);
    effect.style.setProperty("--effect-y", `${-55 - Math.random() * 85}px`);
    effect.style.animationDelay = `${index * 0.06}s`;
    layer.appendChild(effect);
    setTimeout(() => effect.remove(), 2400 + index * 60);
  }
}

function addTemporaryArrivalClass(elements, className, duration = 2600) {
  const targets = elements.filter(Boolean);
  targets.forEach(element => element.classList.add(className));
  setTimeout(() => {
    targets.forEach(element => element.classList.remove(className));
  }, duration);
}

function handleArrivalLiveInteraction(username, text) {
  const targetEl = findArrivalPassenger(username);
  const normalized = removeVietnameseTones(text).toLowerCase();
  const allPassengers = Array.from(document.querySelectorAll("#arrival-passengers-layer .arrival-passenger"));

  if (normalized.includes("checkin") || normalized.includes("chup anh")) {
    createArrivalLiveEffect("📸", targetEl, 5);
    addTemporaryArrivalClass(targetEl ? [targetEl] : allPassengers, "checkin-posing", 2400);
    if (targetEl) showPassengerComment(username, "📸 Check-in Đà Lạt!");
  } else if (normalized.includes("tim") || text.includes("❤") || text.includes("💖")) {
    createArrivalLiveEffect("💖", targetEl, 10);
    if (targetEl) showPassengerComment(username, "💖 Đà Lạt tuyệt quá!");
  } else if (normalized.includes("hoa") || text.includes("🌸")) {
    createArrivalLiveEffect("🌸", targetEl, 12);
    addTemporaryArrivalClass(targetEl ? [targetEl] : allPassengers, "checkin-posing", 2200);
    if (targetEl) showPassengerComment(username, "🌸 Thành phố ngàn hoa!");
  } else if (normalized.includes("nhay") || normalized.includes("dance")) {
    addTemporaryArrivalClass(targetEl ? [targetEl] : allPassengers, "live-dancing", 4200);
    createArrivalLiveEffect("🎵", targetEl, 8);
    if (targetEl) showPassengerComment(username, "💃 Quẩy tại Đà Lạt!");
  } else if (normalized === "di" || normalized.includes("di dao")) {
    if (targetEl) moveArrivalPassengerRandom(targetEl, true);
  } else if (targetEl) {
    showPassengerComment(username, text);
  }
}

function triggerArrivalGiftInteraction(username, giftName = "Quà tặng") {
  const targetEl = findArrivalPassenger(username);
  const giftText = String(giftName || "");
  const allPassengers = Array.from(document.querySelectorAll("#arrival-passengers-layer .arrival-passenger"));
  if (giftText.includes("Tim")) {
    createArrivalLiveEffect("💖", targetEl, 16);
  } else if (giftText.includes("Hoa") || giftText.includes("Vé xe")) {
    createArrivalLiveEffect("🌸", targetEl, 18);
  } else if (giftText.includes("Nitro")) {
    createArrivalLiveEffect("✨", null, 24);
    addTemporaryArrivalClass(allPassengers, "live-dancing", 5000);
  } else {
    createArrivalLiveEffect("🎁", targetEl, 10);
  }
  if (targetEl) {
    addTemporaryArrivalClass([targetEl], "checkin-posing", 2600);
    showPassengerComment(username, `🎁 Cảm ơn ${giftText}!`);
  }
  showToast("🎁 QUÀ TẠI ĐIỂM CHECK-IN!", `${username} vừa tặng ${giftText}!`, "✨");
}

function setDestinationGameFeed(message) {
  const feedEl = document.getElementById("destination-game-feed");
  if (feedEl) feedEl.innerHTML = message;
}

function getLeastGameTeamIndex() {
  let bestIndex = 0;
  destinationGameState.teams.forEach((team, index) => {
    if ((destinationGameState.type === "boat" && destinationGameState.boatPhase === "select") ||
        (destinationGameState.type === "climb" && destinationGameState.climbPhase === "select")) {
      if (getGameTeamMembers(index).length < getGameTeamMembers(bestIndex).length) bestIndex = index;
    } else if ((team.value || 0) < (destinationGameState.teams[bestIndex].value || 0)) {
      bestIndex = index;
    }
  });
  return bestIndex;
}

function ensureUserGameTeam(username, preferredIndex = null) {
  const key = normalizeAudienceName(username);
  destinationGameState.userDisplayNames.set(key, String(username || "Khán giả").trim());
  if (preferredIndex !== null && destinationGameState.teams[preferredIndex]) {
    destinationGameState.userTeams.set(key, preferredIndex);
  }
  if (!destinationGameState.userTeams.has(key)) {
    destinationGameState.userTeams.set(key, getLeastGameTeamIndex());
  }
  if (destinationGameState.type === "boat") {
    const passengerEl = findArrivalPassenger(username);
    if (passengerEl) {
      stopArrivalWalkFrames(passengerEl);
      passengerEl.classList.remove("walking");
      passengerEl.classList.add("on-boat");
    }
  } else if (destinationGameState.type === "climb") {
    const passengerEl = findArrivalPassenger(username);
    if (passengerEl) {
      stopArrivalWalkFrames(passengerEl);
      passengerEl.classList.remove("walking");
      passengerEl.classList.add("on-climb");
    }
  }
  return destinationGameState.userTeams.get(key);
}

function getGameTeamMembers(teamIndex) {
  return Array.from(destinationGameState.userTeams.entries())
    .filter(([, index]) => index === teamIndex)
    .map(([key]) => destinationGameState.userDisplayNames.get(key) || key);
}

function addDestinationUserPoints(username, amount) {
  const key = String(username || "Khán giả").trim();
  destinationGameState.userPoints.set(key, (destinationGameState.userPoints.get(key) || 0) + amount);
}

function initializeTeamPowerState(team) {
  if (!team) return;
  if (!Number.isFinite(team.startBonus)) team.startBonus = 0;
  if (!Number.isFinite(team.shieldCharges)) team.shieldCharges = 0;
  if (!Number.isFinite(team.turboCharges)) team.turboCharges = 0;
  if (!Number.isFinite(team.boostUntil)) team.boostUntil = 0;
  if (!Number.isFinite(team.giftCount)) team.giftCount = 0;
}

function getDestinationGiftType(giftName) {
  const normalized = removeVietnameseTones(String(giftName || "")).toLowerCase();
  if (normalized.includes("ca phe") || normalized.includes("coffee") || normalized.includes("nitro")) return "coffee";
  if (normalized.includes("khien") || normalized.includes("ao mua") || normalized.includes("shield")) return "shield";
  if (normalized.includes("hoa") || normalized.includes("rose") || normalized.includes("ve xe")) return "flower";
  return "flower";
}

function getGiftPowerMeta(type) {
  return {
    flower: { icon: "🌹", label: "Hoa tiếp sức", weight: 1 },
    coffee: { icon: "☕", label: "Cà phê tăng tốc", weight: 3 },
    shield: { icon: "🛡️", label: "Khiên bảo vệ", weight: 2 }
  }[type] || { icon: "🎁", label: "Quà tiếp sức", weight: 1 };
}

function getTeamActionMultiplier(team) {
  return team && team.boostUntil > Date.now() ? 2 : 1;
}

function renderGiftPowerHud() {
  const hud = document.getElementById("gift-power-hud");
  if (!hud) return;
  hud.classList.toggle("active", destinationGameState.active);

  const countEl = document.getElementById("gift-community-count");
  const fillEl = document.getElementById("gift-community-fill");
  const hintEl = document.getElementById("gift-community-hint");
  const target = destinationGameState.giftGoalTarget || 20;
  const energy = Math.max(0, destinationGameState.giftGoalEnergy || 0);
  if (countEl) countEl.innerText = `${energy}/${target}`;
  if (fillEl) fillEl.style.width = `${Math.min(100, energy / target * 100)}%`;
  if (hintEl) hintEl.innerText = `Mốc ${destinationGameState.giftGoalLevel}: đủ ${target} năng lượng, tất cả đội +5!`;

  const teamStatusEl = document.getElementById("gift-team-status");
  if (teamStatusEl) {
    teamStatusEl.innerHTML = destinationGameState.teams.map((team, index) => {
      initializeTeamPowerState(team);
      const boosted = team.boostUntil > Date.now();
      const queuedCoffee = team.turboCharges > 0 ? ` • ☕×${team.turboCharges}` : "";
      const startBonus = team.startBonus > 0 ? ` • +${team.startBonus} xuất phát` : "";
      return `<div class="gift-team-chip team-${index + 1}">
        <b>${index + 1}. ${escapeHtml(team.name)}</b>
        <span>${boosted ? "⚡ x2" : "🎁 " + team.giftCount}${queuedCoffee} • 🛡️×${team.shieldCharges}${startBonus}</span>
      </div>`;
    }).join("");
  }

  const supporterEl = document.getElementById("gift-supporter-board");
  if (supporterEl) {
    const topSupporters = Array.from(destinationGameState.supporterPoints.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    supporterEl.innerHTML = topSupporters.length
      ? `💝 Tiếp sức nổi bật: ${topSupporters.map(([name, points], index) => `<b>${index + 1}. ${escapeHtml(name)}</b> ${points}⚡`).join(" • ")}`
      : "💝 Chưa có người tiếp sức";
  }
}

function recordDestinationGift(username, type, team) {
  const meta = getGiftPowerMeta(type);
  initializeTeamPowerState(team);
  team.giftCount++;
  destinationGameState.giftGoalEnergy += meta.weight;
  destinationGameState.supporterPoints.set(
    username,
    (destinationGameState.supporterPoints.get(username) || 0) + meta.weight
  );
  destinationGameState.giftHistory.unshift({ username, type, team: team.name });
  destinationGameState.giftHistory = destinationGameState.giftHistory.slice(0, 5);

  let communityBonus = false;
  if (destinationGameState.giftGoalEnergy >= destinationGameState.giftGoalTarget) {
    destinationGameState.giftGoalEnergy -= destinationGameState.giftGoalTarget;
    destinationGameState.giftGoalLevel++;
    destinationGameState.teams.forEach(currentTeam => {
      initializeTeamPowerState(currentTeam);
      if ((destinationGameState.type === "boat" && destinationGameState.boatPhase === "select") ||
          (destinationGameState.type === "climb" && destinationGameState.climbPhase === "select")) {
        currentTeam.startBonus = Math.min(20, currentTeam.startBonus + 5);
      } else {
        currentTeam.value = Math.min(100, currentTeam.value + 5);
      }
    });
    communityBonus = true;
    createArrivalLiveEffect("🎉", null, 28);
    showToast("🎯 ĐẠT MỤC TIÊU CỘNG ĐỒNG!", "Tất cả đội được tiếp sức +5 — mở mốc mới!", "⚡");
  }
  return { meta, communityBonus };
}

function renderDestinationGame() {
  const arena = document.getElementById("destination-game-arena");
  if (!arena) return;
  if (destinationGameState.type === "boat") {
    if (destinationGameState.boatPhase === "select") {
      arena.innerHTML = `<div class="boat-team-selection">${destinationGameState.teams.map((team, index) => {
        const members = getGameTeamMembers(index);
        return `
          <div class="boat-team-choice team-${index + 1}">
            <span class="boat-choice-number">${index + 1}</span>
            <span class="boat-choice-icon">${team.icon}</span>
            <b>${team.name}</b>
            <small>${members.length} thành viên</small>
            <div class="boat-member-list">
              ${members.slice(0, 6).map(name => {
                const charNum = getCharacterTypeForUser(name);
                return `<span title="${escapeHtml(name)}"><img src="public/CHARACTER_${charNum}/1.png" alt=""><i>${escapeHtml(name)}</i></span>`;
              }).join("")}
              ${members.length > 6 ? `<em>+${members.length - 6}</em>` : ""}
            </div>
          </div>
        `;
      }).join("")}</div>`;
    } else {
      arena.innerHTML = `
        <div class="vertical-boat-race">
          ${destinationGameState.teams.map((team, index) => {
            const members = getGameTeamMembers(index);
            return `
              <div class="vertical-boat-lane team-${index + 1}">
                <div class="boat-finish-line">🏁</div>
                <div class="boat-lane-water"></div>
                <div class="vertical-boat-marker" style="bottom:${5 + Math.min(100, team.value) * 0.79}%">
                  <div class="boat-rider-stack">
                    ${members.slice(0, 4).map(name => {
                      const charNum = getCharacterTypeForUser(name);
                      return `<img src="public/CHARACTER_${charNum}/1.png" title="${escapeHtml(name)}" alt="">`;
                    }).join("")}
                    ${members.length > 4 ? `<span>+${members.length - 4}</span>` : ""}
                  </div>
                  <span class="vertical-boat-icon">${team.icon}</span>
                </div>
                <div class="vertical-boat-label"><b>${index + 1}</b><span>${Math.round(team.value)}m</span></div>
              </div>
            `;
          }).join("")}
        </div>
      `;
    }
  } else if (destinationGameState.type === "dance") {
    arena.innerHTML = `
      <div class="dance-command-card">
        <small>ĐỘNG TÁC HIỆN TẠI</small>
        <strong>${destinationGameState.roundCommand.toUpperCase()}</strong>
      </div>
      <div class="dance-team-grid">
        ${destinationGameState.teams.map((team, index) => `
          <div class="dance-team-card"><span>${team.icon}</span><b>${index + 1}. ${team.name}</b><strong>${team.value} điểm</strong></div>
        `).join("")}
      </div>
    `;
  } else {
    if (destinationGameState.climbPhase === "select") {
      arena.innerHTML = `<div class="boat-team-selection climb-team-selection">${destinationGameState.teams.map((team, index) => {
        const members = getGameTeamMembers(index);
        return `
          <div class="boat-team-choice team-${index + 1}">
            <span class="boat-choice-number">${index + 1}</span>
            <span class="boat-choice-icon">${team.icon}</span>
            <b>${team.name}</b>
            <small>${members.length} thành viên</small>
            <div class="boat-member-list">
              ${members.slice(0, 6).map(name => {
                const charNum = getCharacterTypeForUser(name);
                return `<span title="${escapeHtml(name)}"><img src="public/CHARACTER_${charNum}/1.png" alt=""><i>${escapeHtml(name)}</i></span>`;
              }).join("")}
              ${members.length > 6 ? `<em>+${members.length - 6}</em>` : ""}
            </div>
          </div>
        `;
      }).join("")}</div>`;
    } else {
      arena.innerHTML = `
        <div class="climb-dodge-guide">🪨 Vật cản đang rơi! Gõ <b>TRÁI</b> hoặc <b>PHẢI</b> để né</div>
        <div class="vertical-climb-race">
          ${destinationGameState.teams.map((team, index) => {
            const members = getGameTeamMembers(index);
            return `
              <div class="vertical-climb-lane team-${index + 1}" data-team-index="${index}">
                <div class="climb-summit"><span>🏁</span><small>ĐỈNH</small></div>
                <div class="climb-trail"></div>
                <div class="climb-obstacle-layer" data-obstacle-lane="${index}"></div>
                <div id="climb-marker-${index}" class="vertical-climber-marker" style="bottom:${5 + Math.min(100, team.value) * 0.79}%; --dodge-x:${team.dodgeOffset || 0}px">
                  <div id="climb-members-${index}" class="climb-member-stack">
                    ${members.slice(0, 4).map(name => {
                      const charNum = getCharacterTypeForUser(name);
                      return `<img src="public/CHARACTER_${charNum}/1.png" title="${escapeHtml(name)}" alt="">`;
                    }).join("")}
                    ${members.length > 4 ? `<span>+${members.length - 4}</span>` : ""}
                  </div>
                  <span class="climber-icon">🧗</span>
                  <span class="climber-team-icon">${team.icon}</span>
                </div>
                <div class="vertical-climb-label">
                  <b>${index + 1}</b>
                  <span>${team.name}</span>
                  <strong id="climb-progress-${index}">${Math.round(team.value)}%</strong>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `;
    }
  }
}

function nextDanceCommand() {
  const commands = ["trái", "phải", "nhảy", "xoay"];
  const choices = commands.filter(command => command !== destinationGameState.roundCommand);
  destinationGameState.roundCommand = choices[Math.floor(Math.random() * choices.length)];
  destinationGameState.roundAnswered = new Set();
  renderDestinationGame();
  setDestinationGameFeed(`🎵 Động tác mới: gõ <b>${destinationGameState.roundCommand}</b> thật nhanh!`);
}

function startBoatTeamSelectionClock() {
  const timerEl = document.getElementById("destination-game-timer");
  destinationGameState.remaining = 12;
  destinationGameState.boatPhase = "select";
  if (timerEl) timerEl.innerText = formatTripTime(destinationGameState.remaining);
  destinationGameState.timerInterval = setInterval(() => {
    destinationGameState.remaining--;
    if (timerEl) timerEl.innerText = formatTripTime(Math.max(0, destinationGameState.remaining));
    if (destinationGameState.remaining <= 0) startBoatRace();
  }, 1000);
}

function startBoatRace() {
  if (!destinationGameState.active || destinationGameState.type !== "boat") return;
  if (destinationGameState.timerInterval) clearInterval(destinationGameState.timerInterval);
  destinationGameState.boatPhase = "race";
  destinationGameState.remaining = 45;
  destinationGameState.teams.forEach(team => {
    initializeTeamPowerState(team);
    team.value = Math.min(20, team.startBonus);
    team.startBonus = 0;
    if (team.turboCharges > 0) {
      team.boostUntil = Date.now() + Math.min(15000, team.turboCharges * 5000);
      team.turboCharges = 0;
    }
  });

  const titleEl = document.getElementById("destination-game-title");
  const instructionEl = document.getElementById("destination-game-instruction");
  const timerEl = document.getElementById("destination-game-timer");
  if (titleEl) titleEl.innerText = "🏁 Cuộc đua bắt đầu!";
  if (instructionEl) instructionEl.innerText = "Thành viên hãy liên tục gõ đúng SỐ THUYỀN của đội mình để tiến lên!";
  if (timerEl) timerEl.innerText = formatTripTime(destinationGameState.remaining);
  renderDestinationGame();
  renderGiftPowerHud();
  setDestinationGameFeed("🚣 Gõ đúng số đội của bạn: thuyền sẽ chạy từ dưới lên vạch đích!");
  showToast("🏁 XUẤT PHÁT!", "Ba thuyền bắt đầu đua — gõ liên tục số thuyền đội mình!", "🚣");

  destinationGameState.timerInterval = setInterval(() => {
    destinationGameState.remaining--;
    if (timerEl) timerEl.innerText = formatTripTime(Math.max(0, destinationGameState.remaining));
    if (destinationGameState.remaining <= 0) endDestinationGame();
  }, 1000);
}

function startClimbTeamSelectionClock() {
  const timerEl = document.getElementById("destination-game-timer");
  destinationGameState.remaining = 12;
  destinationGameState.climbPhase = "select";
  if (timerEl) timerEl.innerText = formatTripTime(destinationGameState.remaining);
  destinationGameState.timerInterval = setInterval(() => {
    destinationGameState.remaining--;
    if (timerEl) timerEl.innerText = formatTripTime(Math.max(0, destinationGameState.remaining));
    if (destinationGameState.remaining <= 0) startClimbRace();
  }, 1000);
}

function startClimbRace() {
  if (!destinationGameState.active || destinationGameState.type !== "climb") return;
  if (destinationGameState.timerInterval) clearInterval(destinationGameState.timerInterval);
  destinationGameState.climbPhase = "race";
  destinationGameState.remaining = 45;
  destinationGameState.teams.forEach(team => {
    initializeTeamPowerState(team);
    team.value = Math.min(20, team.startBonus);
    team.startBonus = 0;
    team.dodgeOffset = 0;
    team.dodgeUser = "";
    if (team.turboCharges > 0) {
      team.boostUntil = Date.now() + Math.min(15000, team.turboCharges * 5000);
      team.turboCharges = 0;
    }
  });

  const titleEl = document.getElementById("destination-game-title");
  const instructionEl = document.getElementById("destination-game-instruction");
  const timerEl = document.getElementById("destination-game-timer");
  if (titleEl) titleEl.innerText = "🏁 Chinh phục đỉnh Langbiang";
  if (instructionEl) instructionEl.innerText = "Gõ LEO để tiến lên • Gõ TRÁI hoặc PHẢI để dịch ngang né vật cản!";
  if (timerEl) timerEl.innerText = formatTripTime(destinationGameState.remaining);
  renderDestinationGame();
  renderGiftPowerHud();
  setDestinationGameFeed("🧗 Cuộc đua bắt đầu! Đá, cây và sương sẽ trôi ngược từ đỉnh xuống!");
  showToast("🏁 BẮT ĐẦU LEO NÚI!", "Gõ LEO và quan sát vật cản để né sang trái hoặc phải!", "⛰️");

  const firstObstacleTimeout = setTimeout(spawnClimbObstacleWave, 1800);
  destinationGameState.climbObstacleTimers.push(firstObstacleTimeout);
  destinationGameState.eventInterval = setInterval(spawnClimbObstacleWave, 5600);
  destinationGameState.timerInterval = setInterval(() => {
    destinationGameState.remaining--;
    if (timerEl) timerEl.innerText = formatTripTime(Math.max(0, destinationGameState.remaining));
    if (destinationGameState.remaining <= 0) endDestinationGame();
  }, 1000);
}

function updateClimbLanePositions() {
  destinationGameState.teams.forEach((team, index) => {
    const marker = document.getElementById(`climb-marker-${index}`);
    const progressEl = document.getElementById(`climb-progress-${index}`);
    if (marker) {
      marker.style.bottom = `${5 + Math.min(100, team.value) * 0.79}%`;
      marker.style.setProperty("--dodge-x", `${team.dodgeOffset || 0}px`);
    }
    if (progressEl) progressEl.innerText = `${Math.round(team.value)}%`;
  });
}

function updateClimbTeamMembers(teamIndex) {
  const container = document.getElementById(`climb-members-${teamIndex}`);
  if (!container) return;
  const members = getGameTeamMembers(teamIndex);
  container.innerHTML = members.slice(0, 4).map(name => {
    const charNum = getCharacterTypeForUser(name);
    return `<img src="public/CHARACTER_${charNum}/1.png" title="${escapeHtml(name)}" alt="">`;
  }).join("") + (members.length > 4 ? `<span>+${members.length - 4}</span>` : "");
}

function spawnClimbObstacleWave() {
  if (!destinationGameState.active || destinationGameState.climbPhase !== "race") return;
  const obstacles = [
    { icon: "🪨", label: "đá lăn" },
    { icon: "🌲", label: "cây đổ" },
    { icon: "🌫️", label: "sương dày" }
  ];
  destinationGameState.teams.forEach((team, teamIndex) => {
    const layer = document.querySelector(`.climb-obstacle-layer[data-obstacle-lane="${teamIndex}"]`);
    if (!layer) return;
    const obstacleData = obstacles[Math.floor(Math.random() * obstacles.length)];
    const obstacle = document.createElement("span");
    obstacle.className = "climb-falling-obstacle";
    obstacle.dataset.obstacleId = String(++destinationGameState.climbObstacleSequence);
    obstacle.innerText = obstacleData.icon;
    obstacle.style.left = `${44 + Math.random() * 12}%`;
    layer.appendChild(obstacle);
    team.dodgeOffset = 0;
    team.dodgeUser = "";
    updateClimbLanePositions();

    const resolveTimeout = setTimeout(() => {
      if (!destinationGameState.active || destinationGameState.climbPhase !== "race") return;
      const marker = document.getElementById(`climb-marker-${teamIndex}`);
      if (Math.abs(team.dodgeOffset || 0) >= 18) {
        team.value = Math.min(100, team.value + 5);
        if (team.dodgeUser) addDestinationUserPoints(team.dodgeUser, 2);
        setDestinationGameFeed(`✅ <b>${team.name}</b> né thành công ${obstacleData.label}: +5%!`);
        if (marker) marker.classList.add("dodge-success");
      } else if (team.shieldCharges > 0) {
        team.shieldCharges--;
        setDestinationGameFeed(`🛡️ <b>${team.name}</b> dùng khiên chặn ${obstacleData.label}, không bị trừ điểm!`);
        if (marker) marker.classList.add("dodge-success");
        createArrivalLiveEffect("🛡️", marker, 10);
      } else {
        team.value = Math.max(0, team.value - 5);
        setDestinationGameFeed(`💥 <b>${team.name}</b> va phải ${obstacleData.label}: -5%!`);
        if (marker) marker.classList.add("obstacle-hit");
      }
      updateClimbLanePositions();
      renderGiftPowerHud();
      const clearStateTimeout = setTimeout(() => {
        team.dodgeOffset = 0;
        updateClimbLanePositions();
        marker?.classList.remove("dodge-success", "obstacle-hit");
      }, 650);
      destinationGameState.climbObstacleTimers.push(clearStateTimeout);
    }, 2650);

    const removeTimeout = setTimeout(() => obstacle.remove(), 3500);
    destinationGameState.climbObstacleTimers.push(resolveTimeout, removeTimeout);
  });
}

function startDestinationGame(destinationIndex) {
  if (state.currentPhase !== 3) return;
  stopDestinationGameTimers();
  phase3State.stage = "game";
  phase3State.selectedDestinationIndex = destinationIndex;
  destinationGameState.active = true;
  destinationGameState.remaining = 45;
  destinationGameState.userTeams = new Map();
  destinationGameState.userDisplayNames = new Map();
  destinationGameState.userPoints = new Map();
  destinationGameState.giftGoalEnergy = 0;
  destinationGameState.giftGoalLevel = 1;
  destinationGameState.supporterPoints = new Map();
  destinationGameState.giftHistory = [];
  destinationGameState.roundAnswered = new Set();
  destinationGameState.challenge = "";

  const titleEl = document.getElementById("destination-game-title");
  const instructionEl = document.getElementById("destination-game-instruction");
  const kickerEl = document.getElementById("destination-game-kicker");
  const timerEl = document.getElementById("destination-game-timer");

  if (destinationIndex === 0) {
    destinationGameState.type = "boat";
    destinationGameState.teams = [
      { name: "Thiên Nga Hồng", icon: "🦩", value: 0 },
      { name: "Thiên Nga Xanh", icon: "🦢", value: 0 },
      { name: "Vịt Vàng", icon: "🐥", value: 0 }
    ];
    destinationGameState.boatPhase = "select";
    destinationGameState.remaining = 12;
    if (titleEl) titleEl.innerText = "Chọn đội đua thuyền";
    if (instructionEl) instructionEl.innerText = "Tất cả khán giả gõ 1, 2 hoặc 3 để lên thuyền — không cần mua vé!";
    if (kickerEl) kickerEl.innerText = "🙋 GIAI ĐOẠN 1: LÊN THUYỀN";
  } else if (destinationIndex === 1) {
    destinationGameState.type = "dance";
    destinationGameState.teams = [
      { name: "Hoa Dã Quỳ", icon: "🌻", value: 0 },
      { name: "Nụ Atisô", icon: "🌿", value: 0 }
    ];
    destinationGameState.roundCommand = "nhảy";
    if (titleEl) titleEl.innerText = "Flashmob Quảng trường Lâm Viên";
    if (instructionEl) instructionEl.innerText = "Gõ 1–2 chọn đội • Làm đúng động tác hiện trên màn hình!";
    if (kickerEl) kickerEl.innerText = "💃 ĐẠI CHIẾN FLASHMOB";
    destinationGameState.eventInterval = setInterval(nextDanceCommand, 5500);
  } else {
    destinationGameState.type = "climb";
    destinationGameState.teams = [
      { name: "Đội Thông Xanh", icon: "🌲", value: 0 },
      { name: "Đội Mây Trắng", icon: "☁️", value: 0 },
      { name: "Đội Lửa Trại", icon: "🔥", value: 0 }
    ];
    destinationGameState.climbPhase = "select";
    destinationGameState.remaining = 12;
    if (titleEl) titleEl.innerText = "Chọn đội leo Langbiang";
    if (instructionEl) instructionEl.innerText = "Tất cả khán giả gõ 1, 2 hoặc 3 để vào đội — không cần mua vé!";
    if (kickerEl) kickerEl.innerText = "🙋 GIAI ĐOẠN 1: CHỌN ĐỘI LEO NÚI";
  }

  destinationGameState.teams.forEach(initializeTeamPowerState);
  if (timerEl) timerEl.innerText = formatTripTime(destinationGameState.remaining);
  showPhase3Panel("arrival-game-panel");
  renderDestinationGame();
  renderGiftPowerHud();
  setDestinationGameFeed("🎮 Mọi khán giả đều có thể chọn đội và tham gia ngay!");
  showToast("🎮 MINI GAME BẮT ĐẦU!", `${titleEl?.innerText || "Trò chơi địa điểm"} — tham gia ngay nào!`, "🏆");

  if (destinationGameState.type === "boat") {
    startBoatTeamSelectionClock();
  } else if (destinationGameState.type === "climb") {
    startClimbTeamSelectionClock();
  } else {
    destinationGameState.timerInterval = setInterval(() => {
      destinationGameState.remaining--;
      if (timerEl) timerEl.innerText = formatTripTime(Math.max(0, destinationGameState.remaining));
      if (destinationGameState.remaining <= 0) endDestinationGame();
    }, 1000);
  }
}

function celebrateGameContribution(username, symbol) {
  const targetEl = findArrivalPassenger(username);
  createArrivalLiveEffect(symbol, targetEl, 5);
  if (targetEl) addTemporaryArrivalClass([targetEl], "checkin-posing", 900);
}

function handleBoatGameComment(username, normalized) {
  const numericChoice = /^[1-3]$/.test(normalized) ? Number(normalized) - 1 : null;
  if (numericChoice === null || !destinationGameState.teams[numericChoice]) return;
  const userKey = normalizeAudienceName(username);

  if (destinationGameState.boatPhase === "select") {
    const oldTeam = destinationGameState.userTeams.get(userKey);
    ensureUserGameTeam(username, numericChoice);
    const team = destinationGameState.teams[numericChoice];
    renderDestinationGame();
    setDestinationGameFeed(oldTeam === undefined
      ? `🎟️ <b>${escapeHtml(username)}</b> đã lên thuyền số ${numericChoice + 1} — <b>${team.name}</b>!`
      : `🔄 <b>${escapeHtml(username)}</b> chuyển sang thuyền số ${numericChoice + 1} — <b>${team.name}</b>!`);
    createArrivalLiveEffect(team.icon, findArrivalPassenger(username), 4);
    return;
  }

  let userTeam = destinationGameState.userTeams.get(userKey);
  if (userTeam === undefined) {
    userTeam = ensureUserGameTeam(username, numericChoice);
    setDestinationGameFeed(`🏃 <b>${escapeHtml(username)}</b> lên muộn thuyền số ${numericChoice + 1} và bắt đầu chèo!`);
  }
  if (userTeam !== numericChoice) {
    setDestinationGameFeed(`⚠️ <b>${escapeHtml(username)}</b> thuộc thuyền số ${userTeam + 1}; hãy gõ đúng số đội mình!`);
    return;
  }

  const team = destinationGameState.teams[userTeam];
  const multiplier = getTeamActionMultiplier(team);
  const gain = (2.2 + Math.random() * 1.8) * multiplier;
  team.value = Math.min(100, team.value + gain);
  addDestinationUserPoints(username, 1);
  celebrateGameContribution(username, "💦");
  renderDestinationGame();
  setDestinationGameFeed(`🚣 <b>${escapeHtml(username)}</b> chèo thuyền số ${userTeam + 1}: +${gain.toFixed(1)}m${multiplier > 1 ? " ⚡x2" : ""}`);
  if (team.value >= 100) endDestinationGame();
}

function handleClimbGameComment(username, normalized) {
  const numericChoice = /^[1-3]$/.test(normalized) ? Number(normalized) - 1 : null;
  const userKey = normalizeAudienceName(username);

  if (destinationGameState.climbPhase === "select") {
    if (numericChoice === null || !destinationGameState.teams[numericChoice]) return;
    const oldTeam = destinationGameState.userTeams.get(userKey);
    ensureUserGameTeam(username, numericChoice);
    const team = destinationGameState.teams[numericChoice];
    renderDestinationGame();
    setDestinationGameFeed(oldTeam === undefined
      ? `🧗 <b>${escapeHtml(username)}</b> gia nhập đội số ${numericChoice + 1} — <b>${team.name}</b>!`
      : `🔄 <b>${escapeHtml(username)}</b> chuyển sang đội số ${numericChoice + 1} — <b>${team.name}</b>!`);
    return;
  }

  if (numericChoice !== null && destinationGameState.teams[numericChoice]) {
    const oldTeam = destinationGameState.userTeams.get(userKey);
    const teamIndex = ensureUserGameTeam(username, numericChoice);
    if (oldTeam !== undefined && oldTeam !== teamIndex) updateClimbTeamMembers(oldTeam);
    updateClimbTeamMembers(teamIndex);
    setDestinationGameFeed(`🙋 <b>${escapeHtml(username)}</b> đang leo cùng <b>${destinationGameState.teams[teamIndex].name}</b>!`);
    return;
  }

  const teamIndex = ensureUserGameTeam(username);
  const team = destinationGameState.teams[teamIndex];
  if (normalized === "trai") {
    team.dodgeOffset = -25;
    team.dodgeUser = username;
    updateClimbLanePositions();
    setDestinationGameFeed(`⬅️ <b>${escapeHtml(username)}</b> kéo ${team.name} né sang trái!`);
  } else if (normalized === "phai") {
    team.dodgeOffset = 25;
    team.dodgeUser = username;
    updateClimbLanePositions();
    setDestinationGameFeed(`➡️ <b>${escapeHtml(username)}</b> kéo ${team.name} né sang phải!`);
  } else if (normalized.includes("leo")) {
    const multiplier = getTeamActionMultiplier(team);
    const gain = (2.8 + Math.random() * 1.4) * multiplier;
    team.value = Math.min(100, team.value + gain);
    addDestinationUserPoints(username, 1);
    celebrateGameContribution(username, "⛰️");
    updateClimbLanePositions();
    setDestinationGameFeed(`🧗 <b>${escapeHtml(username)}</b> tiếp sức cho ${team.name}: +${gain.toFixed(1)}%${multiplier > 1 ? " ⚡x2" : ""}!`);
    if (team.value >= 100) endDestinationGame();
  }
}

function handleDestinationGameComment(username, text) {
  if (!destinationGameState.active) return;
  const normalized = removeVietnameseTones(text).trim().toLowerCase();
  if (destinationGameState.type === "boat") {
    handleBoatGameComment(username, normalized);
    return;
  }
  if (destinationGameState.type === "climb") {
    handleClimbGameComment(username, normalized);
    return;
  }
  const numericChoice = /^[1-3]$/.test(normalized) ? Number(normalized) - 1 : null;
  if (numericChoice !== null && destinationGameState.teams[numericChoice]) {
    const teamIndex = ensureUserGameTeam(username, numericChoice);
    setDestinationGameFeed(`🙋 <b>${escapeHtml(username)}</b> gia nhập <b>${destinationGameState.teams[teamIndex].name}</b>!`);
    renderDestinationGame();
    return;
  }

  const teamIndex = ensureUserGameTeam(username);
  const team = destinationGameState.teams[teamIndex];
  if (destinationGameState.type === "dance") {
    if (normalized === "hoa") {
      ensureUserGameTeam(username, 0);
      return;
    }
    if (normalized === "atiso") {
      ensureUserGameTeam(username, 1);
      return;
    }
    const expected = removeVietnameseTones(destinationGameState.roundCommand).toLowerCase();
    const userKey = normalizeAudienceName(username);
    if (normalized === expected && !destinationGameState.roundAnswered.has(userKey)) {
      const baseGain = destinationGameState.roundAnswered.size === 0 ? 3 : 1;
      const gain = baseGain * getTeamActionMultiplier(team);
      destinationGameState.roundAnswered.add(userKey);
      team.value += gain;
      addDestinationUserPoints(username, gain);
      celebrateGameContribution(username, "🎵");
      setDestinationGameFeed(`💃 <b>${escapeHtml(username)}</b> làm đúng “${destinationGameState.roundCommand}”: +${gain} điểm!`);
    } else {
      return;
    }
  } else if (destinationGameState.type === "climb") {
    const expectedChallenge = removeVietnameseTones(destinationGameState.challenge).toLowerCase();
    if (destinationGameState.challenge && normalized === expectedChallenge) {
      team.value = Math.min(100, team.value + 9);
      addDestinationUserPoints(username, 3);
      setDestinationGameFeed(`🛡️ <b>${escapeHtml(username)}</b> giúp ${team.name} vượt chướng ngại: +9%!`);
      destinationGameState.challenge = "";
      celebrateGameContribution(username, "⭐");
    } else if (normalized.includes("leo")) {
      const gain = destinationGameState.challenge ? 1 : 3.5;
      team.value = Math.min(100, team.value + gain);
      addDestinationUserPoints(username, 1);
      celebrateGameContribution(username, "⛰️");
      setDestinationGameFeed(`🧗 <b>${escapeHtml(username)}</b> tiếp sức cho ${team.name}: +${gain}%`);
    } else {
      return;
    }
  } else {
    return;
  }

  renderDestinationGame();
  if (destinationGameState.type !== "dance" && destinationGameState.teams.some(currentTeam => currentTeam.value >= 100)) {
    endDestinationGame();
  }
}

function handleDestinationGameGift(username, giftName = "Quà tặng") {
  if (!destinationGameState.active) return;
  const teamIndex = ensureUserGameTeam(username);
  const team = destinationGameState.teams[teamIndex];
  const giftType = getDestinationGiftType(giftName);
  const isSelecting = (destinationGameState.type === "boat" && destinationGameState.boatPhase === "select") ||
    (destinationGameState.type === "climb" && destinationGameState.climbPhase === "select");
  const { meta, communityBonus } = recordDestinationGift(username, giftType, team);
  let effectText = "";

  if (giftType === "coffee") {
    if (isSelecting) {
      team.turboCharges++;
      effectText = "đã nạp x2 tốc độ khi xuất phát";
    } else {
      team.boostUntil = Math.max(Date.now(), team.boostUntil || 0) + 8000;
      effectText = "x2 sức mạnh thao tác trong 8 giây";
      setTimeout(() => {
        if (destinationGameState.active) renderGiftPowerHud();
      }, Math.max(0, team.boostUntil - Date.now()) + 100);
    }
    addDestinationUserPoints(username, 4);
  } else if (giftType === "shield") {
    if (destinationGameState.type === "climb") {
      team.shieldCharges++;
      effectText = "chặn chướng ngại kế tiếp";
    } else {
      if (isSelecting) team.startBonus = Math.min(20, team.startBonus + 2);
      else team.value = Math.min(100, team.value + 2);
      effectText = "bảo vệ nhịp chơi và +2 lực";
    }
    addDestinationUserPoints(username, 3);
  } else {
    if (isSelecting) team.startBonus = Math.min(20, team.startBonus + 3);
    else team.value = Math.min(100, team.value + 3);
    effectText = isSelecting ? "+3 lợi thế xuất phát" : "+3 lực";
    addDestinationUserPoints(username, 2);
  }

  createArrivalLiveEffect(meta.icon, findArrivalPassenger(username), giftType === "coffee" ? 20 : 14);
  setDestinationGameFeed(`${meta.icon} <b>${escapeHtml(username)}</b> tặng ${escapeHtml(meta.label)} cho <b>${escapeHtml(team.name)}</b>: ${effectText}!${communityBonus ? " 🎉 Cả đoàn cùng được +5!" : ""}`);
  showToast(`${meta.icon} ${meta.label.toUpperCase()}!`, `${username} tiếp sức cho ${team.name}: ${effectText}`, meta.icon);
  if (destinationGameState.type === "climb") {
    updateClimbLanePositions();
  } else {
    renderDestinationGame();
  }
  renderGiftPowerHud();
  if (destinationGameState.type !== "dance" && destinationGameState.teams.some(currentTeam => currentTeam.value >= 100)) {
    endDestinationGame();
  }
}

function endDestinationGame() {
  if (!destinationGameState.active) return;
  const teams = destinationGameState.teams;
  const maxValue = Math.max(...teams.map(team => team.value));
  const winnerIndexes = teams.map((team, index) => ({ team, index })).filter(item => item.team.value === maxValue);
  const winner = winnerIndexes[Math.floor(Math.random() * winnerIndexes.length)].team;
  const topUser = Array.from(destinationGameState.userPoints.entries()).sort((a, b) => b[1] - a[1])[0];
  stopDestinationGameTimers();
  phase3State.stage = "result";
  document.querySelectorAll("#arrival-passengers-layer .arrival-passenger.on-boat")
    .forEach(charEl => charEl.classList.remove("on-boat"));
  document.querySelectorAll("#arrival-passengers-layer .arrival-passenger.on-climb")
    .forEach(charEl => charEl.classList.remove("on-climb"));

  const titleEl = document.getElementById("destination-game-title");
  const instructionEl = document.getElementById("destination-game-instruction");
  const timerEl = document.getElementById("destination-game-timer");
  const arena = document.getElementById("destination-game-arena");
  if (titleEl) titleEl.innerText = `🏆 ${winner.name} chiến thắng!`;
  if (instructionEl) instructionEl.innerText = topUser
    ? `${topUser[0]} là người đóng góp nhiều nhất và nhận 1 Vé Free!`
    : "Cảm ơn tất cả khán giả đã tham gia!";
  if (timerEl) timerEl.innerText = "KẾT THÚC";
  if (arena) arena.innerHTML = `<div class="destination-game-winner"><span>${winner.icon}</span><b>${winner.name}</b><strong>${Math.round(winner.value)} điểm</strong></div>`;
  if (topUser) awardFreeTicket(topUser[0]);
  setDestinationGameFeed("📸 Tiếp tục gõ checkin, tim, hoa hoặc nhảy để giao lưu tại địa điểm!");
  createArrivalLiveEffect("🏆", null, 20);
  showToast("🏆 MINI GAME KẾT THÚC!", `${winner.name} đã giành chiến thắng!`, winner.icon);
}

function handlePhase3Comment(username, text) {
  const clean = text.trim();
  if (phase3State.stage === "luggage" && /^[1-5]$/.test(clean)) {
    claimLuggage(username, Number(clean));
  } else if (phase3State.stage === "checkin" && /^[1-3]$/.test(clean)) {
    voteCheckin(username, Number(clean));
  } else if (phase3State.stage === "result") {
    handleArrivalLiveInteraction(username, clean);
  } else if (phase3State.stage === "game") {
    handleDestinationGameComment(username, clean);
  }
}

function startPhase3() {
  clearPhase3Timers();
  phase3State.stage = "summary";
  phase3State.luggageClaims = Array(5).fill(null);
  phase3State.luggageUserClaims = new Map();
  phase3State.eligibleLuggageUsers = new Set(
    state.seatedPassengers.map(passenger => normalizeAudienceName(passenger.username))
  );
  phase3State.luggageRejectedUsers = new Set();
  phase3State.luggagePrizes = shuffledLuggagePrizes();
  phase3State.checkinVotes = new Map();
  phase3State.voteCounts = [0, 0, 0];
  const stage = document.getElementById("dalat-arrival-stage");
  if (stage) stage.classList.remove("travelling", "unloading", "bus-leaving", "bus-gone");
  const arrivalTitleEl = document.getElementById("arrival-title");
  if (arrivalTitleEl) arrivalTitleEl.innerText = "CHÀO MỪNG ĐẾN ĐÀ LẠT";
  const arrivalRouteEl = document.getElementById("arrival-route-label");
  if (arrivalRouteEl) arrivalRouteEl.innerText = "🚌 SÀI GÒN → ĐÀ LẠT";
  const passengerLayer = document.getElementById("arrival-passengers-layer");
  if (passengerLayer) passengerLayer.innerHTML = "";
  const effectsLayer = document.getElementById("arrival-live-effects");
  if (effectsLayer) effectsLayer.innerHTML = "";
  setArrivalDestinationBackground();
  renderArrivalSummary();
  renderLuggageCarousel();
  renderCheckinOptions();
  showPhase3Panel("arrival-summary-panel");
  setPhase3Countdown(10, startLuggageGame);
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

  // Chuyển sang Phase 3 để tổng kết, nhận hành lý và bình chọn check-in.
  setTimeout(() => {
    if (state.currentPhase === 2) {
      switchToPhase(3);
    }
  }, 1800);
}

/* ================== QUẢN LÝ CHUYỂN ĐỔI GIAO DIỆN 3 PHASE ================== */
function switchToPhase(phaseNum) {
  state.currentPhase = phaseNum;
  const interiorEl = document.getElementById("bus-interior-stage");
  const arrivalEl = document.getElementById("dalat-arrival-stage");
  const badgeStatusEl = document.querySelector(".badge-status");

  if (phaseNum === 2) {
    // Chuyển sang Phase 2: Trong xe (public/TRONG_XE.png hiển thị full màn hình)
    clearPhase3Timers();
    if (arrivalEl) arrivalEl.classList.add("hidden");
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

    // Kích hoạt câu hỏi đố vui đầu tiên của HDV sau 1.5s
    setTimeout(() => {
      if (state.currentPhase === 2 && !currentActiveQA) {
        triggerGuideActivity();
      }
    }, 1500);
  } else if (phaseNum === 3) {
    if (interiorEl) interiorEl.classList.add("hidden");
    if (arrivalEl) arrivalEl.classList.remove("hidden");
    const cabinVideo = document.getElementById("cabin-road-video");
    if (cabinVideo) cabinVideo.pause();
    clearGuideQuizTimers();
    currentActiveQA = null;
    stopTripCountdown();
    stopWordChain();
    stopCabinMusic(false);
    if (isCabinDancing) stopCabinDance();
    startPhase3();

    if (badgeStatusEl) {
      badgeStatusEl.innerText = "🏔️ Đã Đến Đà Lạt (Phase 3)";
      badgeStatusEl.style.color = "#c4b5fd";
      badgeStatusEl.style.borderColor = "rgba(167, 139, 250, 0.5)";
      badgeStatusEl.style.background = "rgba(124, 58, 237, 0.16)";
    }
  } else {
    // Quay lại Phase 1: Bến xe khách
    if (interiorEl) interiorEl.classList.add("hidden");
    if (arrivalEl) arrivalEl.classList.add("hidden");
    clearPhase3Timers();
    phase3State.stage = "idle";
    const cabinVideo = document.getElementById("cabin-road-video");
    if (cabinVideo) {
      cabinVideo.pause();
    }
    clearGuideQuizTimers();
    currentActiveQA = null;
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
  clearPhase3Timers();
  state.seatedPassengers = [];
  initSeats();
  renderCabinPassengers();
  resetCabinTripTimer();

  // Đặt lại bình xăng và còi cho chuyến mới
  currentFuel = 0;
  currentHornCount = 0;
  resetTripStats();
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
      scheduleNextGuideQuiz(14000);
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
      triggerGuideActivity(null, null, true);
      showToast("🎤 HƯỚNG DẪN VIÊN", "Đã phát hoạt náo trên xe!", "🚌");
    });
  }

  // Tương tác trực tiếp: Bấm vào Hướng Dẫn Viên trên xe
  const cabinTourGuide = document.getElementById("cabin-tour-guide");
  if (cabinTourGuide) {
    cabinTourGuide.addEventListener("click", () => {
      triggerGuideActivity(null, null, true);
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

  // Khởi tạo ô cài đặt thời gian Đố Vui (tùy chỉnh số giây)
  const inputQuizDuration = document.getElementById("input-quiz-duration");
  if (inputQuizDuration) {
    const savedQuizDuration = localStorage.getItem("fuongtrang_quiz_duration");
    if (savedQuizDuration) {
      inputQuizDuration.value = savedQuizDuration;
    }
    inputQuizDuration.addEventListener("change", () => {
      const v = parseInt(inputQuizDuration.value, 10);
      if (!isNaN(v) && v >= 5) {
        localStorage.setItem("fuongtrang_quiz_duration", v.toString());
        showToast("⏱️ ĐÃ LƯU THỜI GIAN", `Thời gian đố vui: ${v} giây!`, "⚙️");
      }
    });
  }

  // Khởi tạo các nút điều khiển Nhảy (cho nhân vật lên nhảy)
  const inputDanceDuration = document.getElementById("input-dance-duration");
  if (inputDanceDuration) {
    const savedDanceDuration = localStorage.getItem("fuongtrang_dance_duration");
    if (savedDanceDuration) {
      inputDanceDuration.value = savedDanceDuration;
    }
    inputDanceDuration.addEventListener("change", () => {
      const v = parseInt(inputDanceDuration.value, 10);
      if (!isNaN(v) && v >= 3) {
        localStorage.setItem("fuongtrang_dance_duration", v.toString());
        showToast("⏱️ ĐÃ LƯU THỜI GIAN", `Thời gian quẩy: ${v} giây!`, "⚙️");
      }
    });
  }

  const btnStartDance = document.getElementById("btn-start-dance");
  if (btnStartDance) {
    btnStartDance.addEventListener("click", () => {
      const selectedRadio = document.querySelector('input[name="dance-mode"]:checked');
      const mode = selectedRadio ? selectedRadio.value : "disco";
      startCabinDance(mode);
    });
  }
  const btnStopDance = document.getElementById("btn-stop-dance");
  if (btnStopDance) {
    btnStopDance.addEventListener("click", () => stopCabinDance());
  }

  // Khởi tạo các nút điều khiển Minigame Nối Từ (tùy chỉnh số giây)
  const inputWordChainDuration = document.getElementById("input-wordchain-duration");
  if (inputWordChainDuration) {
    const savedDuration = localStorage.getItem(WORDCHAIN_DURATION_KEY);
    if (savedDuration) {
      inputWordChainDuration.value = savedDuration;
    }
    inputWordChainDuration.addEventListener("change", () => {
      const v = parseInt(inputWordChainDuration.value, 10);
      if (!isNaN(v) && v >= 3) {
        localStorage.setItem(WORDCHAIN_DURATION_KEY, v.toString());
        showToast("⏱️ ĐÃ LƯU THỜI GIAN", `Thời gian nối từ: ${v} giây/lượt!`, "⚙️");
      }
    });
  }

  const btnStartWordChain = document.getElementById("btn-start-wordchain");
  if (btnStartWordChain) {
    btnStartWordChain.addEventListener("click", () => {
      const inputEl = document.getElementById("input-wordchain-start");
      const word = inputEl ? inputEl.value : "Đà Lạt";
      if (state.currentPhase !== 2) {
        switchToPhase(2);
      }
      startWordChain(word);
    });
  }

  const btnStopWordChain = document.getElementById("btn-stop-wordchain");
  if (btnStopWordChain) {
    btnStopWordChain.addEventListener("click", () => {
      stopWordChain();
      showToast("⏹️ ĐÃ DỪNG NỐI TỪ", "Minigame nối từ đã được dừng!", "ℹ️");
    });
  }

  const btnClearWordChainPts = document.getElementById("btn-clear-wordchain-pts");
  if (btnClearWordChainPts) {
    btnClearWordChainPts.addEventListener("click", () => {
      if (confirm("Bạn có chắc chắn muốn xóa toàn bộ điểm tích lũy và vé miễn phí không?")) {
        localStorage.removeItem(WORDCHAIN_STORAGE_KEY);
        localStorage.removeItem(FREETICKET_STORAGE_KEY);
        renderWordChainLeaderboard();
        showToast("🗑️ ĐÃ XÓA ĐIỂM", "Đã đặt lại toàn bộ điểm tích lũy về 0!", "ℹ️");
      }
    });
  }

  renderWordChainLeaderboard();

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

  const btnPhaseArrival = document.getElementById("btn-phase-arrival");
  if (btnPhaseArrival) {
    btnPhaseArrival.addEventListener("click", () => {
      switchToPhase(3);
    });
  }

  document.querySelectorAll(".btn-test-destination").forEach(button => {
    button.addEventListener("click", () => {
      const destinationIndex = Number(button.dataset.destinationIndex || 0);
      if (state.currentPhase !== 3) switchToPhase(3);
      startTravelToCheckin(destinationIndex);
    });
  });

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

  const btnFastForwardVisit = document.getElementById("btn-fast-forward-visit");
  if (btnFastForwardVisit) {
    btnFastForwardVisit.addEventListener("click", () => {
      if (state.currentPhase !== 3 || !phase3State.visitCountdownInterval) {
        showToast("⚠️ CHƯA THAM QUAN", "Hãy đến một địa điểm check-in trước khi tua thời gian!", "⏱️");
        return;
      }
      phase3State.visitRemainingSeconds = 30;
      updateDestinationVisitTimerUI();
      showToast("⏩ ĐÃ TUA THAM QUAN", "Thời gian tham quan còn 30 giây trước khi trở về Đà Lạt!", "🚌");
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
      let name = "";
      if (state.currentPhase === 2 && state.seatedPassengers.length > 0) {
        name = state.seatedPassengers[Math.floor(Math.random() * state.seatedPassengers.length)].username;
      } else if (state.farPassengers.length > 0) {
        name = state.farPassengers[Math.floor(Math.random() * state.farPassengers.length)];
      } else {
        name = CONFIG.RANDOM_NAMES[Math.floor(Math.random() * CONFIG.RANDOM_NAMES.length)];
      }
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
    this.el.dataset.username = this.name;
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
  window.showPassengerComment = showPassengerComment;
  window.triggerGuideActivity = triggerGuideActivity;
  window.checkGuideQuizAnswer = checkGuideQuizAnswer;
  window.isAnswerMatching = isAnswerMatching;
  window.playCabinMusic = playCabinMusic;
  window.stopCabinMusic = stopCabinMusic;
  window.startCabinDance = startCabinDance;
  window.stopCabinDance = stopCabinDance;
  window.triggerMusicChangeByGift = triggerMusicChangeByGift;
  window.switchToPhase = switchToPhase;
}
