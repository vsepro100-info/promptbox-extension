const STORAGE_KEY = "promptbox_prompts";
const DRAFT_KEY = "promptbox_draft";
const SEARCH_DEBOUNCE_MS = 300;

const toggleFormBtn = document.getElementById("toggleFormBtn");
const formSection = document.getElementById("formSection");
const promptForm = document.getElementById("promptForm");
const promptIdInput = document.getElementById("promptId");
const titleInput = document.getElementById("titleInput");
const categoryInput = document.getElementById("categoryInput");
const promptInput = document.getElementById("promptInput");
const cancelBtn = document.getElementById("cancelBtn");
const searchInput = document.getElementById("searchInput");
const promptList = document.getElementById("promptList");
const emptyState = document.getElementById("emptyState");
const noResultsState = document.getElementById("noResultsState");
const toast = document.getElementById("toast");
const emptyAddBtn = document.getElementById("emptyAddBtn");

let prompts = [];
let isFormOpen = false;
let searchDebounceTimer;

document.addEventListener("DOMContentLoaded", async () => {
  prompts = await getPrompts();
  renderPrompts(prompts, "");
  await restoreDraftIfExists();
  bindDraftAutosave();
});

toggleFormBtn.addEventListener("click", async () => {
  if (isFormOpen) {
    await handleCloseForm();
  } else {
    await openFormForCreate();
  }
});

emptyAddBtn.addEventListener("click", async () => {
  await openFormForCreate();
});

cancelBtn.addEventListener("click", async () => {
  await clearDraft();
  closeForm();
});

promptForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = promptIdInput.value.trim();
  const title = titleInput.value.trim();
  const category = categoryInput.value.trim();
  const text = promptInput.value.trim();

  if (!title || !text) {
    showToast("Title and prompt are required.");
    return;
  }

  if (id) {
    prompts = prompts.map((item) =>
      item.id === id
        ? { ...item, title, category, text, updatedAt: Date.now() }
        : item
    );
    showToast("Prompt updated.");
  } else {
    prompts.unshift({
      id: generateId(),
      title,
      category,
      text,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    showToast("Prompt saved.");
  }

  await savePrompts(prompts);
  await clearDraft();
  const currentQuery = searchInput.value.trim();
  renderPrompts(filterPrompts(currentQuery), currentQuery);
  closeForm();
});

searchInput.addEventListener("input", () => {
  clearTimeout(searchDebounceTimer);

  searchDebounceTimer = setTimeout(() => {
    const query = searchInput.value.trim();
    const filtered = filterPrompts(query);
    renderPrompts(filtered, query);
  }, SEARCH_DEBOUNCE_MS);
});

async function openFormForCreate() {
  promptForm.reset();
  promptIdInput.value = "";
  formSection.classList.remove("hidden");
  toggleFormBtn.textContent = "Close";
  isFormOpen = true;

  const draft = await getDraft();
  if (draft && !draft.id) {
    titleInput.value = draft.title || "";
    categoryInput.value = draft.category || "";
    promptInput.value = draft.text || "";
  }

  titleInput.focus();
}

function openFormForEdit(promptItem) {
  formSection.classList.remove("hidden");
  toggleFormBtn.textContent = "Close";
  isFormOpen = true;

  promptIdInput.value = promptItem.id;
  titleInput.value = promptItem.title || "";
  categoryInput.value = promptItem.category || "";
  promptInput.value = promptItem.text || "";

  titleInput.focus();
}

async function handleCloseForm() {
  const hasData =
    titleInput.value.trim() ||
    categoryInput.value.trim() ||
    promptInput.value.trim();

  if (hasData && !promptIdInput.value.trim()) {
    await saveDraft({
      id: "",
      title: titleInput.value.trim(),
      category: categoryInput.value.trim(),
      text: promptInput.value.trim()
    });
    showToast("Draft saved.");
  }

  closeForm();
}

function closeForm() {
  promptForm.reset();
  promptIdInput.value = "";
  formSection.classList.add("hidden");
  toggleFormBtn.textContent = "+ Add Prompt";
  isFormOpen = false;
}

function renderPrompts(items, query = "") {
  promptList.innerHTML = "";

  const hasQuery = Boolean(query);

  if (!items.length) {
    if (hasQuery) {
      emptyState.classList.add("hidden");
      noResultsState.classList.remove("hidden");
      return;
    }

    noResultsState.classList.add("hidden");
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  noResultsState.classList.add("hidden");

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "prompt-card";

    const categoryHtml = item.category
      ? `<span class="prompt-category">${escapeHtml(item.category)}</span>`
      : "";

    card.innerHTML = `
      <div class="prompt-card-top">
        <div>
          <h3 class="prompt-title">${escapeHtml(item.title)}</h3>
          ${categoryHtml}
        </div>
      </div>
      <div class="prompt-text">${escapeHtml(item.text)}</div>
      <div class="prompt-actions">
        <button class="action-btn copy-btn" data-id="${item.id}">Copy</button>
        <button class="action-btn edit-btn" data-id="${item.id}">Edit</button>
        <button class="action-btn delete-btn" data-id="${item.id}">Delete</button>
      </div>
    `;

    promptList.appendChild(card);
  });

  bindCardActions();
}

function bindCardActions() {
  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const item = prompts.find((p) => p.id === id);
      if (!item) return;

      try {
        await navigator.clipboard.writeText(item.text);
        showToast("Prompt copied.");
      } catch (error) {
        showToast("Failed to copy prompt.");
      }
    });
  });

  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const item = prompts.find((p) => p.id === id);
      if (!item) return;
      await clearDraft();
      openFormForEdit(item);
    });
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      prompts = prompts.filter((p) => p.id !== id);
      await savePrompts(prompts);
      const currentQuery = searchInput.value.trim();
      renderPrompts(filterPrompts(currentQuery), currentQuery);
      showToast("Prompt deleted.");
    });
  });
}

function filterPrompts(query) {
  if (!query) return prompts;

  const q = query.toLowerCase();

  return prompts.filter((item) => {
    return (
      (item.title || "").toLowerCase().includes(q) ||
      (item.category || "").toLowerCase().includes(q) ||
      (item.text || "").toLowerCase().includes(q)
    );
  });
}

function bindDraftAutosave() {
  [titleInput, categoryInput, promptInput].forEach((field) => {
    field.addEventListener("input", async () => {
      if (!isFormOpen) return;
      if (promptIdInput.value.trim()) return;

      await saveDraft({
        id: "",
        title: titleInput.value.trim(),
        category: categoryInput.value.trim(),
        text: promptInput.value.trim()
      });
    });
  });
}

async function restoreDraftIfExists() {
  const draft = await getDraft();
  if (!draft) return;

  const hasDraftData = draft.title || draft.category || draft.text;
  if (!hasDraftData) return;

  formSection.classList.remove("hidden");
  toggleFormBtn.textContent = "Close";
  isFormOpen = true;

  promptIdInput.value = "";
  titleInput.value = draft.title || "";
  categoryInput.value = draft.category || "";
  promptInput.value = draft.text || "";

  showToast("Draft restored.");
}

function getPrompts() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      resolve(Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : []);
    });
  });
}

function savePrompts(items) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: items }, () => {
      resolve();
    });
  });
}

function getDraft() {
  return new Promise((resolve) => {
    chrome.storage.local.get([DRAFT_KEY], (result) => {
      const draft = result[DRAFT_KEY];
      resolve(draft && typeof draft === "object" ? draft : null);
    });
  });
}

function saveDraft(draft) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [DRAFT_KEY]: draft }, () => {
      resolve();
    });
  });
}

function clearDraft() {
  return new Promise((resolve) => {
    chrome.storage.local.remove([DRAFT_KEY], () => {
      resolve();
    });
  });
}

function generateId() {
  return "p_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove("hidden");

  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 1800);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
