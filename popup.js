const DEFAULTS = {
  aiProvider: "gemini",
  model: "gemini-2.0-flash",
};

const providerEl = document.getElementById("aiProvider");
const modelEl = document.getElementById("model");
const geminiAPIEl = document.getElementById("geminiAPI");
const openaiAPIEl = document.getElementById("openaiAPI");
const geminiFieldEl = document.getElementById("geminiField");
const openaiFieldEl = document.getElementById("openaiField");
const saveBtnEl = document.getElementById("saveBtn");
const resetBtnEl = document.getElementById("resetBtn");
const statusEl = document.getElementById("status");

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
}

function getDefaultModel(provider) {
  return provider === "openai" ? "gpt-4o-mini" : DEFAULTS.model;
}

function updateProviderFields(provider) {
  const currentProvider = provider || providerEl.value;
  geminiFieldEl.style.display = currentProvider === "gemini" ? "block" : "none";
  openaiFieldEl.style.display = currentProvider === "openai" ? "block" : "none";

  const currentModel = (modelEl.value || "").trim();
  if (!currentModel || currentModel === DEFAULTS.model || currentModel === "gpt-4o-mini") {
    modelEl.value = getDefaultModel(currentProvider);
  }
}

async function loadSettings() {
  const data = await chrome.storage.local.get([
    "aiProvider",
    "model",
    "geminiAPI",
    "openaiAPI",
  ]);

  providerEl.value = data.aiProvider || DEFAULTS.aiProvider;
  modelEl.value = data.model || getDefaultModel(providerEl.value);
  geminiAPIEl.value = data.geminiAPI || "";
  openaiAPIEl.value = data.openaiAPI || "";
  updateProviderFields(providerEl.value);
}

async function saveSettings() {
  const aiProvider = providerEl.value;
  const model = (modelEl.value || "").trim() || getDefaultModel(aiProvider);
  const geminiAPI = (geminiAPIEl.value || "").trim();
  const openaiAPI = (openaiAPIEl.value || "").trim();

  if (aiProvider === "gemini" && !geminiAPI) {
    setStatus("Please enter a Gemini API key.", "err");
    geminiAPIEl.focus();
    return;
  }

  if (aiProvider === "openai" && !openaiAPI) {
    setStatus("Please enter an OpenAI API key.", "err");
    openaiAPIEl.focus();
    return;
  }

  await chrome.storage.local.set({
    aiProvider,
    model,
    geminiAPI,
    openaiAPI,
  });

  setStatus("Saved successfully.", "ok");
}

async function resetModel() {
  const model = getDefaultModel(providerEl.value);
  modelEl.value = model;
  await chrome.storage.local.set({ model });
  setStatus("Model reset to default.", "ok");
}

providerEl.addEventListener("change", () => {
  updateProviderFields(providerEl.value);
  setStatus("");
});

saveBtnEl.addEventListener("click", saveSettings);
resetBtnEl.addEventListener("click", resetModel);

loadSettings().catch((error) => {
  console.error("[CourseraTool] Failed to load settings:", error);
  setStatus("Failed to load settings.", "err");
});
