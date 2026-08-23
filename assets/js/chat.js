import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// TODO: replace with your own Firebase project's config if you ever fork this.
// This apiKey is not a secret for client-side Firebase apps - access control comes from
// your Firestore security rules, not from hiding this object.

const firebaseConfig = {
  apiKey: "AIzaSyCIbTsR_RBitdxuU2mxzP_heEA1kykO_fw",
  authDomain: "astral-educatin.firebaseapp.com",
  databaseURL: "https://astral-educatin-default-rtdb.firebaseio.com",
  projectId: "astral-educatin",
  storageBucket: "astral-educatin.firebasestorage.app",
  messagingSenderId: "208575847418",
  appId: "1:208575847418:web:009bb2852d9f24bf64a243",
  measurementId: "G-LMQJSMTXSX",
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const USERNAME_KEY = "astral_chat_username";

let currentServerId = null;
let unsubscribeMessages = null;

function getUsername() {
  return localStorage.getItem(USERNAME_KEY) || "";
}

function setUsername(name) {
  localStorage.setItem(USERNAME_KEY, name);
}

function sanitizeName(name, maxLen) {
  return (name || "").trim().slice(0, maxLen);
}

function ensureUsername(callback) {
  const existing = getUsername();
  if (existing) {
    callback(existing);
    return;
  }

  const modal = document.getElementById("chat-username-modal");
  const input = document.getElementById("chat-username-input");
  const confirmBtn = document.getElementById("confirm-username-btn");
  if (!modal || !input || !confirmBtn) return;

  modal.classList.remove("hidden");
  input.value = "";
  input.focus();

  const onConfirm = () => {
    const name = sanitizeName(input.value, 20);
    if (!name) return;
    setUsername(name);
    modal.classList.add("hidden");
    confirmBtn.removeEventListener("click", onConfirm);
    input.removeEventListener("keydown", onKeydown);
    callback(name);
  };

  const onKeydown = (e) => {
    if (e.key === "Enter") onConfirm();
  };

  confirmBtn.addEventListener("click", onConfirm);
  input.addEventListener("keydown", onKeydown);
}

function renderServerList(servers) {
  const list = document.getElementById("server-list");
  if (!list) return;

  list.innerHTML = "";

  if (servers.length === 0) {
    const empty = document.createElement("div");
    empty.className = "chat-empty-state";
    empty.textContent = "No servers yet - create one";
    list.appendChild(empty);
    return;
  }

  servers.forEach((server) => {
    const item = document.createElement("div");
    item.className = "server-list-item";
    if (server.id === currentServerId) item.classList.add("active");
    item.textContent = server.name;
    item.addEventListener("click", () => selectServer(server.id, server.name));
    list.appendChild(item);
  });
}

function listenToServers() {
  const serversQuery = query(
    collection(db, "servers"),
    orderBy("createdAt", "asc"),
  );

  onSnapshot(
    serversQuery,
    (snapshot) => {
      const servers = [];
      snapshot.forEach((docSnap) => {
        servers.push({ id: docSnap.id, ...docSnap.data() });
      });
      renderServerList(servers);
    },
    (error) => {
      console.error("Error listening to servers:", error);
    },
  );
}

function renderMessages(messages) {
  const container = document.getElementById("chat-messages");
  if (!container) return;

  container.innerHTML = "";

  if (messages.length === 0) {
    const empty = document.createElement("div");
    empty.className = "chat-empty-state";
    empty.textContent = "No messages yet. Say hi!";
    container.appendChild(empty);
    return;
  }

  messages.forEach((msg) => {
    const wrapper = document.createElement("div");
    wrapper.className = "chat-message";

    const meta = document.createElement("div");
    meta.className = "chat-message-meta";

    const author = document.createElement("span");
    author.className = "chat-message-author";
    author.textContent = msg.author || "Anonymous";

    const time = document.createElement("span");
    time.className = "chat-message-time";
    if (msg.createdAt && typeof msg.createdAt.toDate === "function") {
      time.textContent = msg.createdAt.toDate().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    meta.appendChild(author);
    meta.appendChild(time);

    const text = document.createElement("div");
    text.className = "chat-message-text";
    text.textContent = msg.text || "";

    wrapper.appendChild(meta);
    wrapper.appendChild(text);
    container.appendChild(wrapper);
  });

  container.scrollTop = container.scrollHeight;
}

function selectServer(serverId, serverName) {
  currentServerId = serverId;

  const nameLabel = document.getElementById("current-server-name");
  if (nameLabel) nameLabel.textContent = serverName;

  document.querySelectorAll(".server-list-item").forEach((el) => {
    el.classList.toggle("active", el.textContent === serverName);
  });

  if (unsubscribeMessages) {
    unsubscribeMessages();
    unsubscribeMessages = null;
  }

  const messagesQuery = query(
    collection(db, "servers", serverId, "messages"),
    orderBy("createdAt", "asc"),
    limit(200),
  );

  unsubscribeMessages = onSnapshot(
    messagesQuery,
    (snapshot) => {
      const messages = [];
      snapshot.forEach((docSnap) => {
        messages.push(docSnap.data());
      });
      renderMessages(messages);
    },
    (error) => {
      console.error("Error listening to messages:", error);
    },
  );
}

async function createServer(name) {
  const cleanName = sanitizeName(name, 40);
  if (!cleanName) return;

  try {
    await addDoc(collection(db, "servers"), {
      name: cleanName,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error creating server:", error);
  }
}

async function sendMessage(text) {
  if (!currentServerId) return;
  const cleanText = sanitizeName(text, 500);
  if (!cleanText) return;

  ensureUsername(async (author) => {
    try {
      await addDoc(collection(db, "servers", currentServerId, "messages"), {
        author,
        text: cleanText,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  });
}

function initChatUI() {
  const chatIcon = document.getElementById("chat-icon");
  const chatModal = document.getElementById("chat-modal");
  const closeChatBtn = document.getElementById("close-chat-btn");
  const createServerBtn = document.getElementById("create-server-btn");
  const createServerModal = document.getElementById("create-server-modal");
  const newServerNameInput = document.getElementById("new-server-name-input");
  const confirmCreateServerBtn = document.getElementById(
    "confirm-create-server-btn",
  );
  const messageInput = document.getElementById("chat-message-input");
  const sendMessageBtn = document.getElementById("send-message-btn");

  if (chatIcon && chatModal) {
    chatIcon.addEventListener("click", () => {
      chatModal.classList.remove("hidden");
    });
  }

  if (closeChatBtn && chatModal) {
    closeChatBtn.addEventListener("click", () => {
      chatModal.classList.add("hidden");
    });
  }

  if (createServerBtn && createServerModal && newServerNameInput) {
    createServerBtn.addEventListener("click", () => {
      createServerModal.classList.remove("hidden");
      newServerNameInput.value = "";
      newServerNameInput.focus();
    });
  }

  if (confirmCreateServerBtn && newServerNameInput && createServerModal) {
    const doCreate = async () => {
      const name = newServerNameInput.value;
      if (!name.trim()) return;
      await createServer(name);
      createServerModal.classList.add("hidden");
    };

    confirmCreateServerBtn.addEventListener("click", doCreate);
    newServerNameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doCreate();
    });
  }

  if (sendMessageBtn && messageInput) {
    const doSend = () => {
      const text = messageInput.value;
      if (!text.trim()) return;
      sendMessage(text);
      messageInput.value = "";
    };

    sendMessageBtn.addEventListener("click", doSend);
    messageInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSend();
    });
  }

  listenToServers();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initChatUI);
} else {
  initChatUI();
}
