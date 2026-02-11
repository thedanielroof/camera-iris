(() => {
  const notifyBtn = document.getElementById("notifyBtn");
  const NOTIFICATIONS_KEY = "cameraIrisNotifications";
  const FRIENDS_KEY = "cameraIrisFriends";
  const NOTIFIED_REQUESTS_KEY = "cameraIrisNotifiedFriendRequests";
  let notifyMenu = null;
  let notifyList = null;

  function loadNotifications() {
    if (typeof localStorage === "undefined") {
      return [];
    }
    try {
      const raw = localStorage.getItem(NOTIFICATIONS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function saveNotifications(list) {
    if (typeof localStorage === "undefined") {
      return;
    }
    try {
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list));
    } catch (error) {
      // ignore storage failures
    }
  }

  function addInAppNotification(message, type = "info") {
    const list = loadNotifications();
    const item = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      message,
      type,
      createdAt: new Date().toISOString(),
      read: false,
    };
    list.unshift(item);
    saveNotifications(list);
    updateNotifyBadge();
  }

  function getUnreadCount() {
    return loadNotifications().filter((item) => !item.read).length;
  }

  function updateNotifyBadge() {
    if (!notifyBtn) {
      return;
    }
    let badge = notifyBtn.querySelector(".notify-badge");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "notify-badge";
      notifyBtn.appendChild(badge);
    }
    const count = getUnreadCount();
    if (count > 0) {
      badge.textContent = count > 99 ? "99+" : String(count);
      badge.classList.remove("hidden");
    } else {
      badge.textContent = "";
      badge.classList.add("hidden");
    }
  }

  function ensureNotifyMenu() {
    if (!notifyBtn) {
      return null;
    }
    let wrapper = notifyBtn.closest(".notify-menu-wrap");
    if (!wrapper) {
      wrapper = document.createElement("div");
      wrapper.className = "notify-menu-wrap";
      const parent = notifyBtn.parentElement;
      if (parent) {
        parent.insertBefore(wrapper, notifyBtn);
        wrapper.appendChild(notifyBtn);
      } else {
        return null;
      }
    }
    notifyMenu = wrapper.querySelector(".notify-menu");
    if (!notifyMenu) {
      notifyMenu = document.createElement("div");
      notifyMenu.className = "notify-menu hidden";
      notifyMenu.innerHTML = `
        <div class="notify-menu-head">Notifications</div>
        <div class="notify-list"></div>
      `;
      wrapper.appendChild(notifyMenu);
    }
    notifyList = notifyMenu.querySelector(".notify-list");
    return notifyMenu;
  }

  function formatTime(value) {
    if (!value) {
      return "";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return date.toLocaleString();
  }

  function renderNotifyMenu() {
    if (!notifyList) {
      return;
    }
    notifyList.innerHTML = "";
    const items = loadNotifications();
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "notify-empty";
      empty.textContent = "No notifications yet.";
      notifyList.appendChild(empty);
      return;
    }
    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = `notify-item${item.read ? "" : " unread"}`;
      const message = document.createElement("div");
      message.textContent = item.message || "Notification";
      const time = document.createElement("div");
      time.className = "notify-time";
      time.textContent = formatTime(item.createdAt);
      card.appendChild(message);
      if (time.textContent) {
        card.appendChild(time);
      }
      notifyList.appendChild(card);
    });
  }

  function markAllRead() {
    const list = loadNotifications();
    if (!list.length) {
      return;
    }
    list.forEach((item) => {
      item.read = true;
    });
    saveNotifications(list);
    updateNotifyBadge();
  }

  function setMenuOpen(isOpen) {
    if (!notifyMenu || !notifyBtn) {
      return;
    }
    notifyMenu.classList.toggle("hidden", !isOpen);
    notifyBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

  function loadNotifiedRequests() {
    if (typeof localStorage === "undefined") {
      return [];
    }
    try {
      const raw = localStorage.getItem(NOTIFIED_REQUESTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function saveNotifiedRequests(list) {
    if (typeof localStorage === "undefined") {
      return;
    }
    try {
      localStorage.setItem(NOTIFIED_REQUESTS_KEY, JSON.stringify(list));
    } catch (error) {
      // ignore storage failures
    }
  }

  function scanFriendRequests() {
    if (typeof localStorage === "undefined") {
      return;
    }
    let friends = [];
    try {
      const raw = localStorage.getItem(FRIENDS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      friends = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      friends = [];
    }

    const pending = friends.filter((friend) => friend && friend.accepted === false);
    if (!pending.length) {
      return;
    }

    const notified = new Set(loadNotifiedRequests());
    pending.forEach((friend) => {
      const key = friend.id || friend.handle || friend.name || JSON.stringify(friend);
      if (notified.has(key)) {
        return;
      }
      const label = friend.name || friend.handle || "Someone";
      addInAppNotification(`Friend request from ${label}`, "friend");
      notified.add(key);
    });

    saveNotifiedRequests(Array.from(notified));
  }

  if (!window.addInAppNotification) {
    window.addInAppNotification = addInAppNotification;
  }

  const menu = ensureNotifyMenu();
  if (notifyBtn && menu) {
    notifyBtn.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        renderNotifyMenu();
        setMenuOpen(menu.classList.contains("hidden"));
        markAllRead();
      },
      true,
    );

    document.addEventListener("click", (event) => {
      if (!menu.classList.contains("hidden") && !menu.contains(event.target) && !notifyBtn.contains(event.target)) {
        setMenuOpen(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    });
  }

  scanFriendRequests();
  updateNotifyBadge();
})();
