import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

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

const FAKE_EMAIL_DOMAIN = "astral.chat";

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

let currentUser = null;
let currentUsername = "";
let currentServerId = null;
let unsubscribeMessages = null;
let authMode = "login";

function sanitizeName(name, maxLen) {
  return (name || "").trim().slice(0, maxLen);
}

function usernameToEmail(username) {
  return `${username.toLowerCase()}@${FAKE_EMAIL_DOMAIN}`;
}

function showAuthError(message) {
  const el = document.getElementById("auth-error");
  if (!el) return;
  el.textContent = message;
  el.classList.remove("hidden");
}

function clearAuthError() {
  const el = document.getElementById("auth-error");
  if (!el) return;
  el.textContent = "";
  el.classList.add("hidden");
}

function setAuthMode(mode) {
  authMode = mode;
  clearAuthError();

  const title = document.getElementById("auth-title");
  const submitBtn = document.getElementById("auth-submit-btn");
  const toggleBtn = document.getElementById("auth-toggle-btn");

  if (mode === "signup") {
    if (title) title.textContent = "Sign Up";
    if (submitBtn) submitBtn.textContent = "Sign Up";
    if (toggleBtn) toggleBtn.textContent = "Already have an account? Log in";
  } else {
    if (title) title.textContent = "Log In";
    if (submitBtn) submitBtn.textContent = "Log In";
    if (toggleBtn) toggleBtn.textContent = "Need an account? Sign up";
  }
}

async function handleSignUp(username, password) {
  const cleanUsername = sanitizeName(username, 20);
  if (!cleanUsername) throw new Error("Enter a username.");
  if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
    throw new Error("Username can only contain letters, numbers, and _");
  }
  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const usernameKey = cleanUsername.toLowerCase();
  const usernameDocRef = doc(db, "usernames", usernameKey);
  const usernameSnap = await getDoc(usernameDocRef);
  if (usernameSnap.exists()) {
    throw new Error("That username is already taken.");
  }

  const cred = await createUserWithEmailAndPassword(
    auth,
    usernameToEmail(cleanUsername),
    password,
  );

  await setDoc(doc(db, "users", cred.user.uid), {
    username: cleanUsername,
    createdAt: serverTimestamp(),
  });

  await setDoc(usernameDocRef, { uid: cred.user.uid });
}

async function handleLogIn(username, password) {
  const cleanUsername = sanitizeName(username, 20);
  if (!cleanUsername || !password) {
    throw new Error("Enter your username and password.");
  }

  await signInWithEmailAndPassword(
    auth,
    usernameToEmail(cleanUsername),
    password,
  );
}

async function handleLogOut() {
  if (unsubscribeMessages) {
    unsubscribeMessages();
    unsubscribeMessages = null;
  }
  currentServerId = null;
  await signOut(auth);
}

function authErrorToMessage(error) {
  const code = error && error.code;
  if (code === "auth/email-already-in-use")
    return "That username is already taken.";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
    return "Incorrect username or password.";
  }
  if (code === "auth/user-not-found") return "No account with that username.";
  if (code === "auth/weak-password")
    return "Password must be at least 6 characters.";
  if (code === "auth/too-many-requests")
    return "Too many attempts. Try again later.";
  return error && error.message ? error.message : "Something went wrong.";
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
  if (!currentServerId || !currentUser) return;
  const cleanText = sanitizeName(text, 500);
  if (!cleanText) return;

  try {
    await addDoc(collection(db, "servers", currentServerId, "messages"), {
      author: currentUsername,
      uid: currentUser.uid,
      text: cleanText,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error sending message:", error);
  }
}

function showChatUI() {
  const authOverlay = document.getElementById("chat-auth-overlay");
  const currentUserLabel = document.getElementById("current-user-label");
  if (authOverlay) authOverlay.classList.add("hidden");
  if (currentUserLabel) currentUserLabel.textContent = currentUsername;
  listenToServers();
}

function showAuthUI() {
  const authOverlay = document.getElementById("chat-auth-overlay");
  if (authOverlay) authOverlay.classList.remove("hidden");

  const serverList = document.getElementById("server-list");
  if (serverList) serverList.innerHTML = "";

  const messages = document.getElementById("chat-messages");
  if (messages) {
    messages.innerHTML =
      '<div class="chat-empty-state">Select or create a server to start chatting</div>';
  }

  const nameLabel = document.getElementById("current-server-name");
  if (nameLabel) nameLabel.textContent = "Select a server";
}

function initAuthUI() {
  const usernameInput = document.getElementById("auth-username-input");
  const passwordInput = document.getElementById("auth-password-input");
  const submitBtn = document.getElementById("auth-submit-btn");
  const toggleBtn = document.getElementById("auth-toggle-btn");
  const logoutBtn = document.getElementById("logout-btn");

  const doSubmit = async () => {
    clearAuthError();
    const username = usernameInput ? usernameInput.value : "";
    const password = passwordInput ? passwordInput.value : "";

    try {
      if (authMode === "signup") {
        await handleSignUp(username, password);
      } else {
        await handleLogIn(username, password);
      }
      if (passwordInput) passwordInput.value = "";
    } catch (error) {
      showAuthError(authErrorToMessage(error));
    }
  };

  if (submitBtn) submitBtn.addEventListener("click", doSubmit);

  [usernameInput, passwordInput].forEach((input) => {
    if (!input) return;
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSubmit();
    });
  });

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      setAuthMode(authMode === "login" ? "signup" : "login");
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogOut);
  }

  setAuthMode("login");
}

function initChatUI() {
  const createServerBtn = document.getElementById("create-server-btn");
  const createServerModal = document.getElementById("create-server-modal");
  const newServerNameInput = document.getElementById("new-server-name-input");
  const confirmCreateServerBtn = document.getElementById(
    "confirm-create-server-btn",
  );
  const messageInput = document.getElementById("chat-message-input");
  const sendMessageBtn = document.getElementById("send-message-btn");

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

  initAuthUI();

  onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    if (user) {
      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        currentUsername = userSnap.exists()
          ? userSnap.data().username
          : "Unknown";
      } catch (error) {
        console.error("Error fetching user profile:", error);
        currentUsername = "Unknown";
      }
      showChatUI();
    } else {
      currentUsername = "";
      showAuthUI();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initChatUI, { once: true });
} else {
  initChatUI();
}
