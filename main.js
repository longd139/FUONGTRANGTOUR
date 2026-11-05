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
  joinTemplate: "Chào mừng {username} đến với Bến Xe FUONG TRANG!",
  enableGiftVoice: true,
  giftTemplate: "Mời quý khách {username} vào giường nằm VIP!",
  enableDepartVoice: true,
  departTemplate: "Chuyến xe FUONG TRANG đi Đà Lạt đã đủ 20 hành khách, chuẩn bị khởi hành! Chúc bà con thượng lộ bình an!",
  enableHorn: true
};

let appSettings = { ...defaultSettings };

function loadSettings() {
  try {
    const saved = localStorage.getItem("fuong_trang_admin_settings");
    if (saved) {
      appSettings = { ...defaultSettings, ...JSON.parse(saved) };
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

/* ================== LOA PHÁT THANH BẾN XE TIẾNG VIỆT CHUẨN ================== */
let currentStationAudio = null;

function speakStationAnnouncement(text) {
  // Dừng âm thanh trước nếu đang phát dở
  if (currentStationAudio) {
    try {
      currentStationAudio.pause();
      currentStationAudio.currentTime = 0;
    } catch (e) {}
    currentStationAudio = null;
  }
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }

  // 1. Ưu tiên phát bằng giọng đọc tiếng Việt chất lượng cao (Google TTS tiếng Việt chuẩn 100%)
  try {
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(text)}`;
    const audio = new Audio(ttsUrl);
    currentStationAudio = audio;
    audio.volume = 1.0;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.warn("Chuyển sang Web Speech API:", err);
        speakWithSpeechSynthesis(text);
      });
    }
  } catch (e) {
    speakWithSpeechSynthesis(text);
  }
}

function speakWithSpeechSynthesis(text) {
  if (!('speechSynthesis' in window)) return;

  const voices = window.speechSynthesis.getVoices();
  // Tìm kiếm giọng tiếng Việt trong hệ thống
  const viVoice = voices.find(v => 
    (v.lang && (v.lang.toLowerCase().startsWith('vi') || v.lang.toLowerCase().includes('vie'))) ||
    (v.name && v.name.toLowerCase().includes('vietnam'))
  );

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'vi-VN';
  if (viVoice) {
    utterance.voice = viVoice;
  }
  utterance.rate = 1.0;
  utterance.pitch = 1.05;

  window.speechSynthesis.speak(utterance);
}

// Lắng nghe tải voices của trình duyệt
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
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
  
  // Ở xa (sát bánh xe, progress = 0): scale = 0.52 (nhỏ gọn)
  // Ở gần (sát đáy màn hình, progress = 1): scale = 1.18 (to rõ ràng)
  const scale = 0.52 + progress * 0.66;
  
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
      // Nếu bật BOT chào người xem mới
      if (appSettings.enableJoinVoice) {
        const welcome = appSettings.joinTemplate.replace("{username}", username);
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
  const inputJoinTpl = document.getElementById("setting-join-template");
  const chkGiftVoice = document.getElementById("setting-enable-gift-voice");
  const inputGiftTpl = document.getElementById("setting-gift-template");
  const chkDepartVoice = document.getElementById("setting-enable-depart-voice");
  const inputDepartTpl = document.getElementById("setting-depart-template");
  const chkHorn = document.getElementById("setting-enable-horn");

  if (chkJoinVoice) chkJoinVoice.checked = appSettings.enableJoinVoice;
  if (inputJoinTpl) inputJoinTpl.value = appSettings.joinTemplate;
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
  if (inputJoinTpl) inputJoinTpl.addEventListener("input", e => {
    appSettings.joinTemplate = e.target.value;
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
  const btnTestJoin = document.getElementById("btn-test-join-voice");
  if (btnTestJoin) {
    btnTestJoin.addEventListener("click", () => {
      const sample = (appSettings.joinTemplate || "").replace(/{username}/g, "Bác Ba Phi");
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
    if (rand < 0.6) {
      const name = CONFIG.RANDOM_NAMES[Math.floor(Math.random() * CONFIG.RANDOM_NAMES.length)];
      onPassengerJoin(name);
    } else {
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

/* ================== SPRITE FRAMES CHO CHARACTER_1 ================== */
const SPRITE_FRAMES = [
  "public/CHARACTER_1/1.png",
  "public/CHARACTER_1/2.png",
  "public/CHARACTER_1/3.png",
  "public/CHARACTER_1/4.png",
  "public/CHARACTER_1/5.png"
];

// Preload tất cả các frame ảnh để chuyển động mượt mà không bị chớp giật
SPRITE_FRAMES.forEach(src => {
  const img = new Image();
  img.src = src;
});

/* Quản lý nhân vật Sprite (CHARACTER_1) */
let spritePlayer = null;

function initSpritePlayer() {
  const container = document.getElementById("far-passengers-container");
  if (!container) return;

  const playerEl = document.createElement("div");
  playerEl.className = "char-2d char-sprite";
  playerEl.id = "sprite-player-char1";
  playerEl.innerHTML = `
    <div class="char-tag">
      <span class="char-badge">⭐</span>
      <span class="char-name">Hành Khách VIP</span>
    </div>
    <div class="char-sprite-wrapper" id="sprite-char1-wrapper">
      <img src="public/CHARACTER_1/1.png" class="char-sprite-img" id="sprite-char1-img" alt="character">
    </div>
  `;
  container.appendChild(playerEl);

  const wrapperEl = playerEl.querySelector("#sprite-char1-wrapper");
  const imgEl = playerEl.querySelector("#sprite-char1-img");

  const bounds = getCourtyardBounds();
  const startX = bounds.width / 2 - 29;
  const startY = bounds.groundTop + (bounds.groundBottom - bounds.groundTop) * 0.55;

  spritePlayer = {
    el: playerEl,
    wrapperEl: wrapperEl,
    imgEl: imgEl,
    x: startX,
    y: startY,
    targetX: startX,
    targetY: startY,
    speed: 135,          // px/giây khi di chuyển
    frame: 0,            // Frame hiện tại (0 -> 4 ứng với 1.png -> 5.png)
    frameTimer: 0,
    frameDuration: 100,  // 100ms mỗi frame bước chân
    direction: 1,        // 1: nhìn sang phải, -1: nhìn sang trái
    idleTimer: 1.5       // Đếm ngược thời gian đứng yên trước khi tự đi tiếp
  };

  // Hỗ trợ phím mũi tên & WASD điều khiển trực tiếp (tham khảo code người dùng)
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

  // Vòng lặp chuyển động mượt mà 60fps bằng requestAnimationFrame
  let lastTime = 0;
  function updateSpriteLoop(time) {
    if (!lastTime) lastTime = time;
    const dt = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;

    const currentBounds = getCourtyardBounds();
    const minX = 25;
    const maxX = Math.max(currentBounds.width - 75, minX + 50);
    const minY = currentBounds.groundTop;
    const maxY = currentBounds.groundBottom;

    // 1. Kiểm tra nếu người dùng nhấn phím điều khiển
    let dx = 0;
    let dy = 0;
    if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) dx--;
    if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) dx++;
    if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) dy--;
    if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) dy++;

    let isMoving = false;

    if (dx !== 0 || dy !== 0) {
      // Đang điều khiển bằng bàn phím
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;

      spritePlayer.x += dx * spritePlayer.speed * dt;
      spritePlayer.y += dy * spritePlayer.speed * dt;
      spritePlayer.targetX = spritePlayer.x;
      spritePlayer.targetY = spritePlayer.y;

      if (dx !== 0) {
        spritePlayer.direction = dx > 0 ? 1 : -1;
      }
      isMoving = true;
      spritePlayer.idleTimer = 2.0; // Reset thời gian chờ tự động
    } else {
      // 2. Chế độ tự động thong thả đi dạo khắp khoảng sân được phép di chuyển
      const dist = Math.hypot(spritePlayer.targetX - spritePlayer.x, spritePlayer.targetY - spritePlayer.y);
      if (dist > 5) {
        const autoDx = (spritePlayer.targetX - spritePlayer.x) / dist;
        const autoDy = (spritePlayer.targetY - spritePlayer.y) / dist;

        spritePlayer.x += autoDx * (spritePlayer.speed * 0.72) * dt;
        spritePlayer.y += autoDy * (spritePlayer.speed * 0.72) * dt;

        if (Math.abs(autoDx) > 0.08) {
          spritePlayer.direction = autoDx > 0 ? 1 : -1;
        }
        isMoving = true;
      } else {
        // Đã đến điểm đích, đứng yên tại chỗ
        spritePlayer.idleTimer -= dt;
        if (spritePlayer.idleTimer <= 0) {
          // Chọn điểm đích ngẫu nhiên mới bất kỳ đâu trên sân
          spritePlayer.targetX = minX + Math.random() * (maxX - minX);
          spritePlayer.targetY = minY + Math.random() * (maxY - minY);
          spritePlayer.idleTimer = 2.2 + Math.random() * 3.5; // Đứng nghỉ ngắm cảnh 2 - 5 giây
        }
      }
    }

    // Giữ nhân vật luôn nằm trong ranh giới sân được phép di chuyển (từ dưới bánh xe đến đáy màn hình)
    spritePlayer.x = Math.max(minX, Math.min(spritePlayer.x, maxX));
    spritePlayer.y = Math.max(minY, Math.min(spritePlayer.y, maxY));

    // 3. Hoạt hình bước chân:
    // Khi di chuyển: chạy từ ảnh 1 đến ảnh 5
    // Khi đứng yên: hiển thị đúng ảnh 1
    if (isMoving) {
      spritePlayer.frameTimer += dt * 1000;
      if (spritePlayer.frameTimer >= spritePlayer.frameDuration) {
        spritePlayer.frame = (spritePlayer.frame + 1) % SPRITE_FRAMES.length;
        spritePlayer.frameTimer %= spritePlayer.frameDuration;
      }
    } else {
      spritePlayer.frame = 0; // Đứng yên là ảnh 1.png
      spritePlayer.frameTimer = 0;
    }

    // Cập nhật nguồn ảnh tương ứng
    const currentFrameSrc = SPRITE_FRAMES[spritePlayer.frame];
    if (spritePlayer.imgEl.getAttribute("src") !== currentFrameSrc) {
      spritePlayer.imgEl.src = currentFrameSrc;
    }

    // 4. Hiệu ứng phối cảnh 3D: ở xa thì nhỏ, ở gần thì to
    const depth = getPerspectiveInfo(spritePlayer.y, minY, maxY);

    // Cập nhật vị trí, tỉ lệ thu phóng và lớp hiển thị
    spritePlayer.el.style.left = `${spritePlayer.x}px`;
    spritePlayer.el.style.top = `${spritePlayer.y}px`;
    spritePlayer.el.style.transform = `scale(${depth.scale.toFixed(3)})`;
    spritePlayer.el.style.zIndex = depth.zIndex;

    // Hướng nhìn nhân vật (lật ảnh qua scaleX mà không làm ngược chữ bảng tên)
    spritePlayer.wrapperEl.style.transform = `scaleX(${spritePlayer.direction})`;

    requestAnimationFrame(updateSpriteLoop);
  }

  requestAnimationFrame(updateSpriteLoop);
}

// Khởi động
document.addEventListener("DOMContentLoaded", () => {
  initSeats();
  initTestControls();
  initSpritePlayer(); // Khởi tạo nhân vật Sprite CHARACTER_1

  setTimeout(() => onPassengerJoin("Bác Ba Phi"), 500);
  setTimeout(() => onPassengerJoin("Chị Út Miền Tây"), 900);
});