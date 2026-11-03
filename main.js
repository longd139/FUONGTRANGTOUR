/* ==========================================================================
   BẾN XE FUONG TRANG - LOGIC ĐIỀU KHIỂN NHÂN VẬT 2D & CHUYẾN XE
   ========================================================================== */

// Cấu hình
const CONFIG = {
  TOTAL_SEATS: 10,
  AUTO_DEPART_DELAY: 2500, // Đợi 2.5s khi đầy ghế rồi xuất bến
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

// DOM Elements
const farContainer = document.getElementById("far-passengers-container");
const seatsGrid = document.getElementById("seats-grid");
const seatCountEl = document.getElementById("seat-count");
const tripProgressEl = document.getElementById("trip-progress");
const busContainer = document.getElementById("fuong-trang-bus");
const busDoor = document.getElementById("bus-door");
const toastBanner = document.getElementById("toast-banner");
const toastAvatar = document.getElementById("toast-avatar");
const toastTitle = document.getElementById("toast-title");
const toastDesc = document.getElementById("toast-desc");

/* ================== ÂM THANH BẰNG WEB AUDIO API (TỰ TẠO KHÔNG CẦN FILE) ================== */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Còi xe khách bíp bíp đặc trưng
function playBusHorn() {
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(440, audioCtx.currentTime); // La
    osc.frequency.setValueAtTime(554.37, audioCtx.currentTime + 0.15); // Đô thăng
    
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  } catch (e) {
    console.log("Audio not allowed yet:", e);
  }
}

// Giọng loa phát thanh bến xe bằng Web Speech API (Có sẵn trên trình duyệt)
function speakStationAnnouncement(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // Xóa câu cũ
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 1.05;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);
  }
}

/* ================== KHỞI TẠO DÃY GHẾ CHỜ VIP ================== */
function initSeats() {
  seatsGrid.innerHTML = "";
  for (let i = 1; i <= CONFIG.TOTAL_SEATS; i++) {
    const seat = document.createElement("div");
    seat.className = "seat-slot";
    seat.id = `seat-slot-${i}`;
    seat.innerHTML = `<span class="seat-label">G${i < 10 ? '0' + i : i}</span>`;
    seatsGrid.appendChild(seat);
  }
  updateTripBoard();
}

function updateTripBoard() {
  const count = state.seatedPassengers.length;
  seatCountEl.innerText = `${count}/${CONFIG.TOTAL_SEATS}`;
  const percent = (count / CONFIG.TOTAL_SEATS) * 100;
  tripProgressEl.style.width = `${percent}%`;
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

/* ================== SỰ KIỆN 1: NGƯỜI VÀO XEM (SÂN NGOÀI) ================== */
function onPassengerJoin(username) {
  if (state.isDeparting) return;

  // Tránh tạo trùng lặp quá nhiều
  if (state.farPassengers.includes(username) || state.seatedPassengers.some(p => p.username === username)) {
    return;
  }

  // Tối đa 15 người ở sân ngoài để tránh tràn màn hình
  if (state.farPassengers.length >= 15) {
    const oldest = state.farPassengers.shift();
    const oldEl = document.getElementById(`char-${oldest.replace(/\s+/g, '_')}`);
    if (oldEl) oldEl.remove();
  }

  state.farPassengers.push(username);
  const charEl = createCharacterElement(username);
  charEl.classList.add("walking");

  // Vị trí xuất hiện từ mép trái sân ngoài
  const startX = -60;
  const targetX = 30 + Math.random() * (farContainer.clientWidth - 150);
  const targetY = 30 + Math.random() * 80;

  charEl.style.left = `${startX}px`;
  charEl.style.top = `${targetY}px`;
  farContainer.appendChild(charEl);

  // Animation đi bộ vào sân
  setTimeout(() => {
    charEl.style.left = `${targetX}px`;
    setTimeout(() => {
      charEl.classList.remove("walking");
    }, 900);
  }, 50);
}

/* ================== SỰ KIỆN 2: TẶNG QUÀ & VÀO GHẾ VIP ================== */
function onPassengerGift(username, giftName) {
  if (state.isDeparting) return;

  // Nếu đã có ghế rồi thì không chiếm thêm ghế mới
  if (state.seatedPassengers.some(p => p.username === username)) {
    showToast("🎉 CẢM ƠN DONATE TIẾP!", `${username} vừa tặng thêm ${giftName}! Chúc bạn chuyến đi tuyệt vời!`, "💖");
    return;
  }

  // Nếu đã hết ghế thì thông báo chờ chuyến sau
  if (state.seatedPassengers.length >= CONFIG.TOTAL_SEATS) {
    showToast("⚠️ XE ĐÃ KÍN CHỖ!", `${username} vui lòng chờ chuyến xe tiếp theo sắp khởi hành!`, "⏳");
    return;
  }

  // Hiện thông báo nổi bật
  showToast("🎟️ MỜI VÀO GHẾ VIP!", `${username} đã tặng ${giftName} và nhận vé VIP lên xe!`, "🌸");
  
  // Phát thanh loa bến xe
  speakStationAnnouncement(`Mời quý khách ${username} vào phòng chờ lên xe!`);

  // Xóa khỏi sân ngoài nếu đang đứng ở sân ngoài
  state.farPassengers = state.farPassengers.filter(u => u !== username);
  const existingChar = document.getElementById(`char-${username.replace(/\s+/g, '_')}`);
  if (existingChar) existingChar.remove();

  // Thêm vào danh sách có ghế
  const seatIndex = state.seatedPassengers.length;
  state.seatedPassengers.push({ username, giftName });
  updateTripBoard();

  // Đặt nhân vật vào ghế ngồi
  const targetSlot = document.getElementById(`seat-slot-${seatIndex + 1}`);
  if (targetSlot) {
    targetSlot.classList.add("occupied");
    const seatedChar = createCharacterElement(username, giftName);
    targetSlot.appendChild(seatedChar);
  }

  // Kiểm tra nếu đủ ghế -> Khởi hành!
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

  playBusHorn();
  speakStationAnnouncement("Chuyến xe FUONG TRANG đi Đà Lạt đã đủ khách, chuẩn bị khởi hành! Chúc bà con thượng lộ bình an!");

  showToast("🚌 XUẤT BẾN!", "Chuyến xe FUONG TRANG đã đủ khách! Khởi hành đi Đà Lạt!", "🚀");

  // Đóng cửa xe
  busDoor.classList.remove("open");

  // Bật khói & nổ máy sau 1 giây
  setTimeout(() => {
    busContainer.classList.add("driving");
    busContainer.style.transform = "translateX(800px)";

    // Sau khi xe chạy khuất màn hình (khoảng 1.8s) -> Reset chuyến mới
    setTimeout(() => {
      resetTripForNextBatch();
    }, 2200);
  }, 1000);
}

/* ================== LÀM MỚI CHUYẾN XE TIẾP THEO ================== */
function resetTripForNextBatch() {
  // Reset danh sách ghế
  state.seatedPassengers = [];
  initSeats();

  // Ẩn xe sang mép trái ngoài màn hình rồi chạy vào bến
  busContainer.classList.remove("driving");
  busContainer.style.transition = "none";
  busContainer.style.transform = "translateX(-650px)";

  setTimeout(() => {
    busContainer.style.transition = "transform 1.2s cubic-bezier(0.25, 1, 0.5, 1)";
    busContainer.classList.add("driving");
    busContainer.style.transform = "translateX(0)";

    setTimeout(() => {
      busContainer.classList.remove("driving");
      busDoor.classList.add("open");
      state.isDeparting = false;
      showToast("✨ CHUYẾN MỚI BẮT ĐẦU!", "Xe FUONG TRANG mới đã vào bến! Mời quý khách tặng quà để đặt vé!", "🚌");
    }, 1300);
  }, 200);
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
  }, 3500);
}

/* ================== GẮN SỰ KIỆN TEST PANEL ================== */
function initTestControls() {
  const btnToggle = document.getElementById("btn-toggle-panel");
  const testPanel = document.getElementById("test-panel");
  btnToggle.addEventListener("click", () => {
    testPanel.classList.toggle("collapsed");
    btnToggle.innerText = testPanel.classList.contains("collapsed") ? "+" : "_";
  });

  // Nút Vào xem
  document.getElementById("btn-simulate-join").addEventListener("click", () => {
    const input = document.getElementById("input-username");
    let name = input.value.trim();
    if (!name) {
      name = CONFIG.RANDOM_NAMES[Math.floor(Math.random() * CONFIG.RANDOM_NAMES.length)];
    }
    onPassengerJoin(name);
    // Chuẩn bị tên ngẫu nhiên cho lần sau
    input.value = CONFIG.RANDOM_NAMES[Math.floor(Math.random() * CONFIG.RANDOM_NAMES.length)];
  });

  // Nút Tặng quà
  document.getElementById("btn-simulate-gift").addEventListener("click", () => {
    const select = document.getElementById("select-gift");
    const gift = select.value;
    
    // Ưu tiên chọn 1 người đang đứng ở sân ngoài
    let name = "";
    if (state.farPassengers.length > 0) {
      name = state.farPassengers[0];
    } else {
      name = CONFIG.RANDOM_NAMES[Math.floor(Math.random() * CONFIG.RANDOM_NAMES.length)];
    }
    onPassengerGift(name, gift);
  });

  // Nút Lên đủ 10 người
  document.getElementById("btn-quick-fill").addEventListener("click", () => {
    const needed = CONFIG.TOTAL_SEATS - state.seatedPassengers.length;
    for (let i = 0; i < needed; i++) {
      setTimeout(() => {
        const dummyName = `Khách VIP ${state.seatedPassengers.length + 1}`;
        onPassengerGift(dummyName, "🌸 Hoa Hồng");
      }, i * 300);
    }
  });

  // Nút Xuất bến ngay
  document.getElementById("btn-depart").addEventListener("click", () => {
    triggerBusDeparture();
  });

  // Nút Đặt lại bến
  document.getElementById("btn-reset").addEventListener("click", () => {
    resetTripForNextBatch();
  });

  // Checkbox Auto Demo
  const chkAuto = document.getElementById("chk-auto-demo");
  chkAuto.addEventListener("change", (e) => {
    if (e.target.checked) {
      startAutoDemo();
    } else {
      stopAutoDemo();
    }
  });
}

function startAutoDemo() {
  if (state.autoDemoInterval) clearInterval(state.autoDemoInterval);
  state.autoDemoInterval = setInterval(() => {
    if (state.isDeparting) return;
    
    const rand = Math.random();
    if (rand < 0.6) {
      // 60% tỉ lệ người vào xem
      const name = CONFIG.RANDOM_NAMES[Math.floor(Math.random() * CONFIG.RANDOM_NAMES.length)];
      onPassengerJoin(name);
    } else {
      // 40% tỉ lệ người tặng quà
      const gifts = ["🌸 Hoa Hồng", "🍦 Cây Kem", "🧢 Nón Lá", "💖 Trái Tim"];
      const gift = gifts[Math.floor(Math.random() * gifts.length)];
      const name = state.farPassengers.length > 0 
        ? state.farPassengers[Math.floor(Math.random() * state.farPassengers.length)]
        : CONFIG.RANDOM_NAMES[Math.floor(Math.random() * CONFIG.RANDOM_NAMES.length)];
      onPassengerGift(name, gift);
    }
  }, 1800);
}

function stopAutoDemo() {
  if (state.autoDemoInterval) {
    clearInterval(state.autoDemoInterval);
    state.autoDemoInterval = null;
  }
}

// Khởi động khi tải xong trang
document.addEventListener("DOMContentLoaded", () => {
  initSeats();
  initTestControls();
  busDoor.classList.add("open");

  // Tạo sẵn vài khách mẫu ngoài sân
  setTimeout(() => onPassengerJoin("Bác Ba Phi"), 500);
  setTimeout(() => onPassengerJoin("Chị Út Miền Tây"), 900);
});