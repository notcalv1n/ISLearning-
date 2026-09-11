const screens = document.querySelectorAll(".screen");
const appScreens = document.querySelectorAll(".app-screen");

const mainApp = document.getElementById("mainApp");
const toast = document.getElementById("toast");
const toastText = document.getElementById("toastText");
const toastIcon = document.getElementById("toastIcon");

const modalOverlay = document.getElementById("modalOverlay");
const modalBox = document.getElementById("modalBox");

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

let appData = {
  user: null,
  materials: [],
  reviewers: [],
  quizzes: [],
  settings: {
    darkMode: false,
    offline: false
  },
  notifications: []
};

let selectedFile = null;
let selectedMaterialId = null;
let selectedReviewerId = null;
let currentFilter = "All";

let selectedQuestionCount = 5;
let selectedQuestionType = "Multiple Choice";

let quizQuestions = [];
let currentQuizIndex = 0;
let quizAnswers = [];
let quizSourceName = "Practice Quiz";

function saveData() {
  const safeMaterials = appData.materials.map((material) => {
    return {
      ...material,
      fileUrl: null
    };
  });

  const dataToSave = {
    ...appData,
    materials: safeMaterials
  };

  localStorage.setItem("islearningData", JSON.stringify(dataToSave));
}

function loadData() {
  const savedData = localStorage.getItem("islearningData");

  if (savedData) {
    appData = JSON.parse(savedData);

    appData.materials = appData.materials.map((material) => {
      return {
        ...material,
        favorite: material.favorite === true,
        pinned: material.pinned === true,
        fileUrl: null
      };
    });
  }
}

function showScreen(screenId) {
  screens.forEach((screen) => {
    screen.classList.remove("active-screen");
  });

  const targetScreen = document.getElementById(screenId);

  if (targetScreen) {
    targetScreen.classList.add("active-screen");
  }
}

function showAppScreen(screenId) {
  if (!appData.user) return;

  appScreens.forEach((screen) => {
    screen.classList.remove("active-app-screen");
  });

  const targetScreen = document.getElementById(screenId);

  if (targetScreen) {
    targetScreen.classList.add("active-app-screen");
  }

  updateNavigation(screenId);

  if (screenId === "homeScreen") renderDashboard();
  if (screenId === "materialsScreen") renderMaterials();
  if (screenId === "materialViewerScreen") renderMaterialViewer();
  if (screenId === "reviewerSourceScreen") renderReviewerMaterialList();
  if (screenId === "reviewersScreen") renderReviewers();
  if (screenId === "quizSetupScreen") renderQuizSourceOptions();
  if (screenId === "quizzesScreen") renderQuizzes();
  if (screenId === "progressScreen") renderProgress();
  if (screenId === "profileScreen") renderProfile();
  if (screenId === "settingsScreen") renderSettings();
  if (screenId === "notificationsScreen") renderNotifications();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function openMainApp(screenId = "homeScreen") {
  screens.forEach((screen) => {
    screen.classList.remove("active-screen");
  });

  mainApp.classList.add("active-app");

  showAppScreen(screenId);
}

function closeMainApp() {
  mainApp.classList.remove("active-app");
}

function updateNavigation(activeScreen) {
  document.querySelectorAll(".nav-item").forEach((navItem) => {
    navItem.classList.toggle(
      "active-nav",
      navItem.dataset.screen === activeScreen
    );
  });
}

function showToast(message, icon = "✓") {
  toastText.textContent = message;
  toastIcon.textContent = icon;

  toast.classList.remove("hidden");

  setTimeout(() => {
    toast.classList.add("hidden");
  }, 2500);
}

function openModal(html) {
  modalBox.innerHTML = html;
  modalOverlay.classList.remove("hidden");
}

function closeModal() {
  modalOverlay.classList.add("hidden");
  modalBox.innerHTML = "";
}

function getFirstName(name) {
  if (!name) return "Student";

  return name.trim().split(" ")[0];
}

function updatePhoneTime() {
  const phoneTime = document.getElementById("phoneTime");

  if (!phoneTime) return;

  const currentTime = new Date().toLocaleTimeString("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });

  phoneTime.textContent = currentTime;
}

function showWelcomeBackScreen() {
  if (!appData.user) {
    showScreen("loginScreen");
    return;
  }

  document.getElementById("welcomeBackName").textContent =
    getFirstName(appData.user.name);

  showScreen("welcomeBackScreen");
}

function setDarkMode(enabled) {
  document.body.classList.toggle("dark-mode", enabled);

  appData.settings.darkMode = enabled;

  saveData();
}

function updateOfflineBanner() {
  document.getElementById("offlineBanner").classList.toggle(
    "hidden",
    !appData.settings.offline
  );
}

function calculateAverageScore() {
  if (appData.quizzes.length === 0) return 0;

  const total = appData.quizzes.reduce((sum, quiz) => {
    return sum + quiz.percentage;
  }, 0);

  return Math.round(total / appData.quizzes.length);
}

function calculateHighestScore() {
  if (appData.quizzes.length === 0) return 0;

  return Math.max(
    ...appData.quizzes.map((quiz) => quiz.percentage)
  );
}

function getMaterialIcon(type) {
  if (type === "PDF") return "📕";
  if (type === "DOCX") return "📘";
  if (type === "PPTX") return "📊";
  if (type === "Images") return "🖼️";
  if (type === "TXT") return "📄";

  return "📄";
}

function getFileType(file) {
  const filename = file.name.toLowerCase();

  if (file.type.startsWith("image/")) return "Images";
  if (filename.endsWith(".pdf")) return "PDF";
  if (filename.endsWith(".docx")) return "DOCX";
  if (filename.endsWith(".pptx")) return "PPTX";
  if (filename.endsWith(".txt")) return "TXT";

  return "Unknown";
}

function isTextSupported(material) {
  const supportedTypes = ["PDF", "DOCX", "PPTX", "TXT"];

  return (
    supportedTypes.includes(material.type) &&
    typeof material.content === "string" &&
    material.content.trim().length > 20
  );
}

function cleanText(text) {
  return String(text)
    .replace(/\s+/g, " ")
    .replace(/[^\w\s.,!?;:'"()\-]/g, " ")
    .trim();
}

function escapeHtml(text) {
  const element = document.createElement("div");
  element.textContent = text;
  return element.innerHTML;
}

function getSentences(text) {
  return String(text)
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 25);
}

function getKeywords(text) {
  const stopWords = [
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "from",
    "are",
    "was",
    "were",
    "have",
    "has",
    "had",
    "will",
    "would",
    "should",
    "could",
    "into",
    "about",
    "their",
    "there",
    "they",
    "them",
    "then",
    "than",
    "when",
    "where",
    "what",
    "which",
    "while",
    "because",
    "through",
    "your",
    "you",
    "our",
    "but",
    "not",
    "can",
    "may",
    "all",
    "one",
    "two",
    "three",
    "also",
    "more",
    "most",
    "each",
    "only",
    "using",
    "used",
    "use",
    "being",
    "been",
    "is",
    "in",
    "on",
    "at",
    "to",
    "of",
    "a",
    "an",
    "as",
    "or",
    "by"
  ];

  const words = String(text).toLowerCase().match(/[a-zA-Z]{4,}/g) || [];
  const counts = {};

  words.forEach((word) => {
    if (!stopWords.includes(word)) {
      counts[word] = (counts[word] || 0) + 1;
    }
  });

  return Object.entries(counts)
    .sort((first, second) => second[1] - first[1])
    .slice(0, 6)
    .map((item) => item[0]);
}

function capitalizeWord(word) {
  if (!word) return "";

  return word.charAt(0).toUpperCase() + word.slice(1);
}

function renderDashboard() {
  if (!appData.user) return;

  const firstName = getFirstName(appData.user.name);
  const initial = firstName.charAt(0).toUpperCase();

  document.getElementById("welcomeName").textContent = firstName;
  document.getElementById("profileInitial").textContent = initial;

  document.getElementById("materialCount").textContent =
    appData.materials.length;

  document.getElementById("reviewerCount").textContent =
    appData.reviewers.length;

  document.getElementById("quizCount").textContent =
    appData.quizzes.length;

  document.getElementById(
    "averageScore"
  ).textContent = `${calculateAverageScore()}%`;

  const recentMaterials = document.getElementById("recentMaterials");

  const sortedMaterials = [...appData.materials].sort((first, second) => {
    return Number(second.pinned === true) - Number(first.pinned === true);
  });

  if (sortedMaterials.length === 0) {
    recentMaterials.innerHTML = `
      <div class="empty-card">
        <span>📓✎</span>
        <h3>No materials yet.</h3>
        <p>Upload a learning material to begin organizing your studies.</p>
      </div>
    `;

    return;
  }

  recentMaterials.innerHTML = sortedMaterials
    .slice(0, 3)
    .map((material) => createMaterialCard(material))
    .join("");

  attachMaterialCardEvents(recentMaterials);
}

function createMaterialCard(material) {
  const isFavorite = material.favorite === true;
  const isPinned = material.pinned === true;

  const status = isTextSupported(material)
    ? "Ready for review"
    : material.type === "Images"
    ? "Image material"
    : "Saved material";

  return `
    <article class="material-card material-clickable" data-id="${material.id}">
      <div class="material-card-icon">
        ${getMaterialIcon(material.type)}
      </div>

      <div class="material-card-info">
        <h3>
          ${isPinned ? "📌 " : ""}
          ${escapeHtml(material.name)}
        </h3>

        <p>
          ${escapeHtml(material.subject)} · ${material.type} · ${status}
        </p>
      </div>

      ${isFavorite ? '<span class="favorite-star">★</span>' : ""}

      <button
        class="material-menu-button"
        data-menu-id="${material.id}"
        type="button"
        aria-label="Material options"
      >
        ⋮
      </button>
    </article>
  `;
}

function renderMaterials() {
  const materialsList = document.getElementById("materialsList");

  const sortedMaterials = [...appData.materials].sort((first, second) => {
    return Number(second.pinned === true) - Number(first.pinned === true);
  });

  const filteredMaterials = sortedMaterials.filter((material) => {
    if (currentFilter === "All") return true;

    if (currentFilter === "Favorites") {
      return material.favorite === true;
    }

    return material.type === currentFilter;
  });

  if (filteredMaterials.length === 0) {
    materialsList.innerHTML = `
      <div class="empty-card">
        <span>📓✎</span>
        <h3>No materials found.</h3>
        <p>Upload a material or choose a different filter.</p>
      </div>
    `;

    return;
  }

  materialsList.innerHTML = filteredMaterials
    .map((material) => createMaterialCard(material))
    .join("");

  attachMaterialCardEvents(materialsList);
}

function attachMaterialCardEvents(container) {
  container.querySelectorAll(".material-clickable").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (
        event.target.classList.contains("material-menu-button") ||
        event.target.classList.contains("favorite-star")
      ) {
        return;
      }

      selectedMaterialId = card.dataset.id;

      showAppScreen("materialViewerScreen");
    });
  });

  container.querySelectorAll(".material-menu-button").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();

      selectedMaterialId = button.dataset.menuId;

      openMaterialOptions(selectedMaterialId);
    });
  });
}

function getSelectedMaterial() {
  return appData.materials.find(
    (material) => material.id === selectedMaterialId
  );
}

function renderMaterialViewer() {
  const material = getSelectedMaterial();

  const viewerFileName = document.getElementById("viewerFileName");
  const viewerFileInfo = document.getElementById("viewerFileInfo");
  const viewerContent = document.getElementById("viewerContent");

  if (!material) {
    viewerFileName.textContent = "Material Viewer";
    viewerFileInfo.textContent = "No material selected";

    viewerContent.innerHTML = `
      <div class="viewer-empty">
        <span>📁</span>
        <h2>No material selected</h2>
        <p>Please go back to My Materials and choose a file.</p>
      </div>
    `;

    return;
  }

  viewerFileName.textContent = material.name;

  viewerFileInfo.textContent =
    `${material.type} · ${material.subject} · ${material.topic}`;

  if (material.type === "Images" && material.fileUrl) {
    viewerContent.innerHTML = `
      <img
        class="image-document-viewer"
        src="${material.fileUrl}"
        alt="${escapeHtml(material.name)}"
      />
    `;

    return;
  }

  if (material.type === "PDF" && material.fileUrl) {
    viewerContent.innerHTML = `
      <iframe
        class="pdf-document-viewer"
        src="${material.fileUrl}"
        title="${escapeHtml(material.name)}"
      ></iframe>

      ${
        isTextSupported(material)
          ? `
            <button id="viewerGenerateReviewer" class="primary-button viewer-action-button" type="button">
              ✨ Generate Reviewer
            </button>

            <button id="viewerGenerateQuiz" class="secondary-button viewer-action-button" type="button">
              ❓ Generate Quiz
            </button>
          `
          : ""
      }
    `;

    addViewerGenerationEvents(material);

    return;
  }

  if (isTextSupported(material)) {
    viewerContent.innerHTML = `
      <div class="text-document-viewer">${escapeHtml(material.content)}</div>

      <button id="viewerGenerateReviewer" class="primary-button viewer-action-button" type="button">
        ✨ Generate Reviewer
      </button>

      <button id="viewerGenerateQuiz" class="secondary-button viewer-action-button" type="button">
        ❓ Generate Quiz
      </button>
    `;

    addViewerGenerationEvents(material);

    return;
  }

  viewerContent.innerHTML = `
    <div class="file-info-viewer">
      <span>${getMaterialIcon(material.type)}</span>
      <h2>${escapeHtml(material.name)}</h2>
      <p>This material has been saved in your library.</p>
      <p>
        The original file preview is available only during the current browser
        session. Re-upload the file after refreshing if you want to view it
        again.
      </p>
    </div>
  `;
}

function addViewerGenerationEvents(material) {
  document
    .getElementById("viewerGenerateReviewer")
    ?.addEventListener("click", () => {
      selectedMaterialId = material.id;
      requestAiConsent("reviewer");
    });

  document
    .getElementById("viewerGenerateQuiz")
    ?.addEventListener("click", () => {
      selectedMaterialId = material.id;
      requestAiConsent("quiz");
    });
}

function openMaterialOptions(materialId) {
  const material = appData.materials.find(
    (item) => item.id === materialId
  );

  if (!material) return;

  selectedMaterialId = material.id;

  const canGenerate = isTextSupported(material);

  const favoriteLabel = material.favorite
    ? "★ Remove from Favorites"
    : "☆ Save as Favorite";

  const pinLabel = material.pinned
    ? "📌 Unpin Material"
    : "📌 Pin Material";

  openModal(`
    <h2>${escapeHtml(material.name)}</h2>

    <p>
      ${escapeHtml(material.subject)} ·
      ${escapeHtml(material.topic)} ·
      ${material.type}
    </p>

    <button id="viewMaterialOption" class="modal-menu-option" type="button">
      👁 View Material
    </button>

    ${
      canGenerate
        ? `
          <button id="generateReviewerOption" class="modal-menu-option" type="button">
            ✨ Generate Reviewer
          </button>

          <button id="generateQuizOption" class="modal-menu-option" type="button">
            ❓ Generate Quiz
          </button>
        `
        : `
          <div class="modal-info-box">
            ${
              material.type === "Images"
                ? "AI generation is unavailable for image materials because OCR/image-to-text is outside this project scope."
                : "No readable text was extracted from this material. Try uploading a clearer or text-based file."
            }
          </div>
        `
    }

    <button id="favoriteMaterialOption" class="modal-menu-option" type="button">
      ${favoriteLabel}
    </button>

    <button id="pinMaterialOption" class="modal-menu-option" type="button">
      ${pinLabel}
    </button>

    <button id="deleteMaterialOption" class="modal-menu-option danger-menu-option" type="button">
      🗑 Delete Material
    </button>

    <button id="closeMaterialMenuButton" class="secondary-button full-button" type="button">
      Cancel
    </button>
  `);

  document
    .getElementById("viewMaterialOption")
    .addEventListener("click", () => {
      closeModal();
      showAppScreen("materialViewerScreen");
    });

  document
    .getElementById("generateReviewerOption")
    ?.addEventListener("click", () => {
      closeModal();
      requestAiConsent("reviewer");
    });

  document
    .getElementById("generateQuizOption")
    ?.addEventListener("click", () => {
      closeModal();
      requestAiConsent("quiz");
    });

  document
    .getElementById("favoriteMaterialOption")
    .addEventListener("click", () => {
      material.favorite = !material.favorite;

      saveData();
      closeModal();

      showToast(
        material.favorite
          ? "Material saved as favorite."
          : "Material removed from favorites.",
        material.favorite ? "★" : "☆"
      );

      renderMaterials();
      renderDashboard();
    });

  document
    .getElementById("pinMaterialOption")
    .addEventListener("click", () => {
      material.pinned = !material.pinned;

      saveData();
      closeModal();

      showToast(
        material.pinned ? "Material pinned." : "Material unpinned.",
        "📌"
      );

      renderMaterials();
      renderDashboard();
    });

  document
    .getElementById("deleteMaterialOption")
    .addEventListener("click", () => {
      deleteMaterialConfirmation(material.id);
    });

  document
    .getElementById("closeMaterialMenuButton")
    .addEventListener("click", () => {
      closeModal();
    });
}

function deleteMaterialConfirmation(materialId) {
  const material = appData.materials.find(
    (item) => item.id === materialId
  );

  openModal(`
    <h2>Delete Material?</h2>

    <p>Are you sure you want to delete ${escapeHtml(material.name)}?</p>

    <div class="modal-actions">
      <button id="cancelDeleteButton" class="secondary-button" type="button">
        Cancel
      </button>

      <button id="confirmDeleteButton" class="logout-button" type="button">
        Delete
      </button>
    </div>
  `);

  document.getElementById("cancelDeleteButton").onclick = closeModal;

  document.getElementById("confirmDeleteButton").onclick = () => {
    appData.materials = appData.materials.filter(
      (item) => item.id !== materialId
    );

    appData.reviewers = appData.reviewers.filter(
      (reviewer) => reviewer.sourceId !== materialId
    );

    if (selectedMaterialId === materialId) {
      selectedMaterialId = null;
    }

    saveData();
    closeModal();

    showToast("Material deleted.", "🗑");

    showAppScreen("materialsScreen");
  };
}

function renderReviewerMaterialList() {
  const reviewerMaterialList = document.getElementById(
    "reviewerMaterialList"
  );

  const availableMaterials = appData.materials.filter((material) =>
    isTextSupported(material)
  );

  if (availableMaterials.length === 0) {
    reviewerMaterialList.innerHTML = `
      <div class="empty-card">
        <span>📄</span>
        <h3>No readable materials available.</h3>
        <p>
          Upload a PDF, DOCX, PPTX, or TXT file that contains readable text.
        </p>
      </div>
    `;

    return;
  }

  reviewerMaterialList.innerHTML = availableMaterials
    .map(
      (material) => `
        <button
          class="material-card reviewer-source-card"
          data-id="${material.id}"
          type="button"
        >
          <div class="material-card-icon">
            ${getMaterialIcon(material.type)}
          </div>

          <div class="material-card-info">
            <h3>${escapeHtml(material.name)}</h3>
            <p>${escapeHtml(material.subject)} · ${escapeHtml(material.topic)}</p>
          </div>

          <span>›</span>
        </button>
      `
    )
    .join("");

  document.querySelectorAll(".reviewer-source-card").forEach((button) => {
    button.addEventListener("click", () => {
      selectedMaterialId = button.dataset.id;
      requestAiConsent("reviewer");
    });
  });
}

function requestAiConsent(action) {
  if (appData.settings.offline) {
    showToast(
      action === "reviewer"
        ? "Internet connection required for AI generation."
        : "Internet connection required for automated quiz generation.",
      "☁"
    );

    return;
  }

  const material = getSelectedMaterial();

  if (action === "reviewer" && (!material || !isTextSupported(material))) {
    showToast("Please select a readable text-based material.", "!");
    return;
  }

  openModal(`
    <h2>AI Content Notice</h2>

    <p>
      The selected academic material will be processed to create a
      ${action === "reviewer" ? "reviewer" : "practice quiz"}.
    </p>

    <p>
      Generated content may contain errors. Please verify it using your
      original material.
    </p>

    <p>Do you agree to continue?</p>

    <div class="modal-actions">
      <button id="cancelAiButton" class="secondary-button" type="button">
        Cancel
      </button>

      <button id="agreeAiButton" class="primary-button" type="button">
        Agree & Continue
      </button>
    </div>
  `);

  document.getElementById("cancelAiButton").onclick = closeModal;

  document.getElementById("agreeAiButton").onclick = () => {
    closeModal();

    if (action === "reviewer") {
      generateReviewer();
    }

    if (action === "quiz") {
      showAppScreen("quizSetupScreen");
    }
  };
}

function generateReviewer() {
  const material = getSelectedMaterial();

  if (!material || !isTextSupported(material)) {
    showToast("Please select a readable text-based material.", "!");
    return;
  }

  showAppScreen("reviewerProcessingScreen");

  setTimeout(() => {
    const sentences = getSentences(material.content);
    const keywords = getKeywords(material.content);

    let reviewer = appData.reviewers.find(
      (item) => item.sourceId === material.id
    );

    if (!reviewer) {
      reviewer = {
        id: `reviewer-${Date.now()}`,
        title: `${material.topic || material.name} Reviewer`,
        sourceId: material.id,
        sourceName: material.name,
        topic: material.topic,
        date: new Date().toLocaleDateString("en-PH", {
          month: "long",
          day: "numeric",
          year: "numeric"
        }),
        keywords,
        sentences,
        summary:
          sentences.slice(0, 3).join(". ") +
          (sentences.length ? "." : "")
      };

      appData.reviewers.unshift(reviewer);

      appData.notifications.unshift({
        title: "Reviewer generated successfully.",
        message: `${reviewer.title} is now available.`,
        icon: "✨"
      });

      saveData();
    }

    selectedReviewerId = reviewer.id;

    renderReviewerResult();

    showAppScreen("reviewerResultScreen");

    showToast("Reviewer generated successfully.", "✓");
  }, 1300);
}

function getSelectedReviewer() {
  return appData.reviewers.find(
    (reviewer) => reviewer.id === selectedReviewerId
  );
}

function renderReviewerResult() {
  const reviewer = getSelectedReviewer();

  if (!reviewer) return;

  const keywords = reviewer.keywords?.length
    ? reviewer.keywords
    : ["study", "lesson", "concept"];

  document.getElementById("reviewerTitle").textContent = reviewer.title;

  document.getElementById(
    "reviewerSourceName"
  ).textContent = `Generated from ${reviewer.sourceName}`;

  document.getElementById(
    "reviewerKeyConcept"
  ).textContent = `Important concepts found in the uploaded material include: ${keywords
    .map(capitalizeWord)
    .join(", ")}.`;

  document.getElementById(
    "reviewerSummary"
  ).textContent =
    reviewer.summary ||
    "This reviewer is based on the text from the selected material.";

  document.getElementById("topicTags").innerHTML = keywords
    .slice(0, 4)
    .map((keyword) => `<span>${capitalizeWord(keyword)}</span>`)
    .join("");

  document.getElementById("reviewerTerms").innerHTML = keywords
    .map((keyword) => `<li>${capitalizeWord(keyword)}</li>`)
    .join("");
}

function renderReviewers() {
  const reviewersList = document.getElementById("reviewersList");

  if (appData.reviewers.length === 0) {
    reviewersList.innerHTML = `
      <div class="empty-card">
        <span>📖</span>
        <h3>No reviewers yet.</h3>
        <p>Select a readable material to generate a reviewer.</p>
      </div>
    `;

    return;
  }

  reviewersList.innerHTML = appData.reviewers
    .map(
      (reviewer) => `
        <button
          class="reviewer-card reviewer-clickable"
          data-id="${reviewer.id}"
          type="button"
        >
          <div class="material-card-icon">📖</div>

          <div class="reviewer-card-info">
            <h3>${escapeHtml(reviewer.title)}</h3>
            <p>From ${escapeHtml(reviewer.sourceName)} · ${reviewer.date}</p>
          </div>

          <span>›</span>
        </button>
      `
    )
    .join("");

  document.querySelectorAll(".reviewer-clickable").forEach((button) => {
    button.addEventListener("click", () => {
      selectedReviewerId = button.dataset.id;

      renderReviewerResult();
      showAppScreen("reviewerResultScreen");
    });
  });
}

function renderQuizSourceOptions() {
  const quizSourceSelect = document.getElementById("quizSourceSelect");

  quizSourceSelect.innerHTML = `
    <option value="">Select material or reviewer</option>
  `;

  appData.materials
    .filter((material) => isTextSupported(material))
    .forEach((material) => {
      const option = document.createElement("option");

      option.value = `material:${material.id}`;
      option.textContent = `${material.type}: ${material.name}`;

      quizSourceSelect.appendChild(option);
    });

  appData.reviewers.forEach((reviewer) => {
    const option = document.createElement("option");

    option.value = `reviewer:${reviewer.id}`;
    option.textContent = `Reviewer: ${reviewer.title}`;

    quizSourceSelect.appendChild(option);
  });

  if (selectedMaterialId) {
    const selectedMaterial = getSelectedMaterial();

    if (selectedMaterial && isTextSupported(selectedMaterial)) {
      quizSourceSelect.value = `material:${selectedMaterial.id}`;
    }
  }

  if (selectedReviewerId) {
    const selectedReviewer = getSelectedReviewer();

    if (selectedReviewer) {
      quizSourceSelect.value = `reviewer:${selectedReviewer.id}`;
    }
  }
}

function getTextFromQuizSource(sourceValue) {
  const [sourceType, sourceId] = sourceValue.split(":");

  if (sourceType === "material") {
    const material = appData.materials.find(
      (item) => item.id === sourceId
    );

    if (!material) return "";

    quizSourceName = `${material.topic || material.name} Quiz`;

    return material.content || "";
  }

  if (sourceType === "reviewer") {
    const reviewer = appData.reviewers.find(
      (item) => item.id === sourceId
    );

    if (!reviewer) return "";

    quizSourceName = reviewer.title.replace("Reviewer", "Quiz");

    return [
      reviewer.summary || "",
      ...(reviewer.sentences || [])
    ].join(" ");
  }

  return "";
}

function makeWrongAnswers(correctAnswer, keywords) {
  const defaults = [
    "It is unrelated to the lesson.",
    "It is not included in the uploaded material.",
    "It is always false."
  ];

  const wrongAnswers = [...defaults];

  keywords.forEach((keyword) => {
    const option = `${capitalizeWord(keyword)} is the answer.`;

    if (option !== correctAnswer && !wrongAnswers.includes(option)) {
      wrongAnswers.push(option);
    }
  });

  return wrongAnswers.slice(0, 3);
}

function getQuizQuestions(type, count, sourceText) {
  const sentences = getSentences(sourceText);
  const keywords = getKeywords(sourceText);

  const safeSentences = sentences.length
    ? sentences
    : ["The selected learning material contains academic information."];

  const safeKeywords = keywords.length
    ? keywords
    : ["lesson", "concept", "material"];

  const multipleChoiceQuestions = safeSentences.map((sentence) => {
    const correctAnswer = sentence.endsWith(".")
      ? sentence
      : `${sentence}.`;

    return {
      question: "Which statement is found in the selected learning material?",
      answers: [
        correctAnswer,
        ...makeWrongAnswers(correctAnswer, safeKeywords)
      ],
      correct: 0,
      type: "Multiple Choice"
    };
  });

  const trueFalseQuestions = safeSentences.map((sentence, index) => {
    const trueStatement = sentence.endsWith(".")
      ? sentence
      : `${sentence}.`;

    const isTrue = index % 2 === 0;

    const falseStatement = `The selected material states that ${capitalizeWord(
      safeKeywords[index % safeKeywords.length]
    )} is not discussed in the lesson.`;

    return {
      question: isTrue ? trueStatement : falseStatement,
      answers: ["True", "False"],
      correct: isTrue ? 0 : 1,
      type: "True or False"
    };
  });

  const questions = [];

  for (let index = 0; index < count; index += 1) {
    if (type === "Multiple Choice") {
      questions.push({
        ...multipleChoiceQuestions[
          index % multipleChoiceQuestions.length
        ]
      });
    }

    if (type === "True or False") {
      questions.push({
        ...trueFalseQuestions[
          index % trueFalseQuestions.length
        ]
      });
    }

    if (type === "Mix") {
      const question =
        index % 2 === 0
          ? multipleChoiceQuestions[
              index % multipleChoiceQuestions.length
            ]
          : trueFalseQuestions[
              index % trueFalseQuestions.length
            ];

      questions.push({ ...question });
    }
  }

  return questions;
}

function createQuiz() {
  const quizSource = document.getElementById("quizSourceSelect").value;
  const customQuestionCount = Number(
    document.getElementById("customQuestionCount").value
  );

  if (
    !customQuestionCount ||
    customQuestionCount < 1 ||
    customQuestionCount > 100
  ) {
    document.getElementById("quizSetupError").textContent =
      "Please enter a number from 1 to 100 items.";
    return;
  }

  if (!quizSource) {
    document.getElementById("quizSetupError").textContent =
      "Please select a readable material or reviewer.";
    return;
  }

  const sourceText = getTextFromQuizSource(quizSource);

  if (!sourceText.trim()) {
    document.getElementById("quizSetupError").textContent =
      "The selected source does not contain readable text.";
    return;
  }

  selectedQuestionCount = customQuestionCount;

  document.getElementById("quizSetupError").textContent = "";

  showAppScreen("quizProcessingScreen");

  setTimeout(() => {
    quizQuestions = getQuizQuestions(
      selectedQuestionType,
      selectedQuestionCount,
      sourceText
    );

    currentQuizIndex = 0;
    quizAnswers = [];

    showAppScreen("quizScreen");
    renderCurrentQuestion();
  }, 1200);
}

function renderCurrentQuestion() {
  const question = quizQuestions[currentQuizIndex];
  const totalQuestions = quizQuestions.length;

  document.getElementById(
    "quizProgressText"
  ).textContent = `Question ${currentQuizIndex + 1} of ${totalQuestions}`;

  document.getElementById("quizScreenTitle").textContent =
    quizSourceName;

  document.getElementById("questionTypeLabel").textContent =
    question.type.toUpperCase();

  document.getElementById("questionText").textContent =
    question.question;

  document.getElementById(
    "quizProgressFill"
  ).style.width = `${((currentQuizIndex + 1) / totalQuestions) * 100}%`;

  const letters = ["A", "B", "C", "D"];
  const answerChoices = document.getElementById("answerChoices");

  answerChoices.innerHTML = question.answers
    .map(
      (answer, index) => `
        <button
          class="answer-option"
          data-answer-index="${index}"
          type="button"
        >
          <span class="answer-letter">
            ${
              question.type === "True or False"
                ? index === 0
                  ? "T"
                  : "F"
                : letters[index]
            }
          </span>

          <span>${escapeHtml(answer)}</span>
        </button>
      `
    )
    .join("");

  const nextButton = document.getElementById("nextQuestionButton");

  nextButton.disabled = true;

  nextButton.textContent =
    currentQuizIndex === totalQuestions - 1
      ? "Submit Quiz"
      : "Next Question";

  document.querySelectorAll(".answer-option").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".answer-option").forEach((choice) => {
        choice.classList.remove("selected-answer");
      });

      button.classList.add("selected-answer");

      quizAnswers[currentQuizIndex] = Number(
        button.dataset.answerIndex
      );

      nextButton.disabled = false;
    });
  });
}

function nextQuizQuestion() {
  if (quizAnswers[currentQuizIndex] === undefined) return;

  if (currentQuizIndex < quizQuestions.length - 1) {
    currentQuizIndex += 1;
    renderCurrentQuestion();
    return;
  }

  openModal(`
    <h2>Submit Quiz?</h2>

    <p>Are you ready to submit your answers?</p>

    <div class="modal-actions">
      <button id="cancelSubmitButton" class="secondary-button" type="button">
        Cancel
      </button>

      <button id="confirmSubmitButton" class="primary-button" type="button">
        Submit
      </button>
    </div>
  `);

  document.getElementById("cancelSubmitButton").onclick = closeModal;

  document.getElementById("confirmSubmitButton").onclick = () => {
    closeModal();
    calculateQuizResult();
  };
}

function calculateQuizResult() {
  const totalQuestions = quizQuestions.length;

  let correctAnswers = 0;

  quizQuestions.forEach((question, index) => {
    if (question.correct === quizAnswers[index]) {
      correctAnswers += 1;
    }
  });

  const incorrectAnswers = totalQuestions - correctAnswers;

  const percentage = Math.round(
    (correctAnswers / totalQuestions) * 100
  );

  const quizRecord = {
    id: `quiz-${Date.now()}`,
    title: quizSourceName,
    score: correctAnswers,
    total: totalQuestions,
    incorrect: incorrectAnswers,
    percentage,
    quizType: selectedQuestionType,
    date: new Date().toLocaleDateString("en-PH", {
      month: "long",
      day: "numeric",
      year: "numeric"
    })
  };

  appData.quizzes.unshift(quizRecord);

  appData.notifications.unshift({
    title: "Quiz completed",
    message: `Your ${quizSourceName} score was ${percentage}%.`,
    icon: "📝"
  });

  saveData();

  document.getElementById("resultTitle").textContent =
    percentage >= 80
      ? "Great job!"
      : percentage >= 50
      ? "Good effort!"
      : "Keep practicing!";

  document.getElementById(
    "resultPercentage"
  ).textContent = `${percentage}%`;

  document.getElementById(
    "resultScore"
  ).textContent = `${correctAnswers} / ${totalQuestions}`;

  document.getElementById("correctCount").textContent =
    correctAnswers;

  document.getElementById("incorrectCount").textContent =
    incorrectAnswers;

  document.getElementById(
    "resultAccuracy"
  ).textContent = `${percentage}%`;

  showAppScreen("quizResultScreen");

  showToast("Quiz submitted successfully.", "✓");
}

function renderQuizzes() {
  const quizzesList = document.getElementById("quizzesList");

  if (appData.quizzes.length === 0) {
    quizzesList.innerHTML = `
      <div class="empty-card">
        <span>📝✎</span>
        <h3>No quizzes yet.</h3>
        <p>Select a material or reviewer to create a practice quiz.</p>
      </div>
    `;

    return;
  }

  quizzesList.innerHTML = appData.quizzes
    .map(
      (quiz) => `
        <article class="quiz-history-card">
          <div class="material-card-icon">📝</div>

          <div class="quiz-history-info">
            <h3>${escapeHtml(quiz.title)}</h3>
            <p>
              ${quiz.date} · ${quiz.quizType} ·
              ${quiz.score}/${quiz.total} correct
            </p>
          </div>

          <strong>${quiz.percentage}%</strong>
        </article>
      `
    )
    .join("");
}

function renderProgress() {
  document.getElementById(
    "progressAverageScore"
  ).textContent = `${calculateAverageScore()}%`;

  document.getElementById(
    "highestScore"
  ).textContent = `${calculateHighestScore()}%`;

  document.getElementById(
    "completedQuizzes"
  ).textContent = appData.quizzes.length;

  const recentScoresList = document.getElementById("recentScoresList");

  if (appData.quizzes.length === 0) {
    recentScoresList.innerHTML = `
      <div class="empty-card">
        <span>📈</span>
        <h3>No scores yet.</h3>
        <p>Complete a quiz to see your progress.</p>
      </div>
    `;

    return;
  }

  recentScoresList.innerHTML = appData.quizzes
    .slice(0, 5)
    .map(
      (quiz) => `
        <article class="quiz-history-card">
          <div class="material-card-icon">🎯</div>

          <div class="quiz-history-info">
            <h3>${escapeHtml(quiz.title)}</h3>
            <p>${quiz.date} · ${quiz.score}/${quiz.total} correct</p>
          </div>

          <strong>${quiz.percentage}%</strong>
        </article>
      `
    )
    .join("");
}

function renderProfile() {
  if (!appData.user) return;

  const initial = getFirstName(appData.user.name)
    .charAt(0)
    .toUpperCase();

  document.getElementById("largeProfileInitial").textContent =
    initial;

  document.getElementById("profileName").textContent =
    appData.user.name;

  document.getElementById(
    "profileStudentId"
  ).textContent = `Student ID: ${appData.user.studentId}`;

  document.getElementById("profileCourse").textContent =
    appData.user.course;
}

function renderSettings() {
  document.getElementById("darkModeToggle").checked =
    appData.settings.darkMode;

  document.getElementById("offlineToggle").checked =
    appData.settings.offline;

  updateOfflineBanner();
}

function renderNotifications() {
  const notificationsList = document.getElementById(
    "notificationsList"
  );

  if (appData.notifications.length === 0) {
    notificationsList.innerHTML = `
      <div class="empty-card">
        <span>🔔</span>
        <h3>No notifications.</h3>
        <p>You are all caught up.</p>
      </div>
    `;

    return;
  }

  notificationsList.innerHTML = appData.notifications
    .map(
      (notification) => `
        <article class="notification-card">
          <div class="notification-icon">${notification.icon}</div>

          <div>
            <h3>${escapeHtml(notification.title)}</h3>
            <p>${escapeHtml(notification.message)}</p>
          </div>
        </article>
      `
    )
    .join("");
}

function resetUploadForm() {
  selectedFile = null;

  document.getElementById("materialFile").value = "";
  document.getElementById("materialSubject").value = "";
  document.getElementById("materialTopic").value = "";
  document.getElementById("uploadError").textContent = "";
}

function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(cleanText(reader.result || ""));
    };

    reader.onerror = () => {
      reject(new Error("Unable to read text file."));
    };

    reader.readAsText(file);
  });
}

async function extractPdfText(file) {
  if (!window.pdfjsLib) {
    throw new Error("PDF library is unavailable.");
  }

  const arrayBuffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer
  }).promise;

  let fullText = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);

    const pageContent = await page.getTextContent();

    const pageText = pageContent.items
      .map((item) => item.str)
      .join(" ");

    fullText += `${pageText} `;
  }

  return cleanText(fullText);
}

async function extractDocxText(file) {
  if (!window.mammoth) {
    throw new Error("DOCX library is unavailable.");
  }

  const arrayBuffer = await file.arrayBuffer();

  const result = await mammoth.extractRawText({
    arrayBuffer
  });

  return cleanText(result.value || "");
}

async function extractPptxText(file) {
  if (!window.JSZip) {
    throw new Error("PPTX library is unavailable.");
  }

  const arrayBuffer = await file.arrayBuffer();

  const zip = await JSZip.loadAsync(arrayBuffer);

  const slideFiles = Object.keys(zip.files)
    .filter((fileName) => /^ppt\/slides\/slide\d+\.xml$/.test(fileName))
    .sort((first, second) => {
      const firstNumber = Number(first.match(/slide(\d+)\.xml/)[1]);
      const secondNumber = Number(second.match(/slide(\d+)\.xml/)[1]);

      return firstNumber - secondNumber;
    });

  let fullText = "";

  for (const slideFile of slideFiles) {
    const slideXml = await zip.files[slideFile].async("text");

    const xmlDocument = new DOMParser().parseFromString(
      slideXml,
      "application/xml"
    );

    const textNodes = xmlDocument.getElementsByTagName("a:t");

    for (let index = 0; index < textNodes.length; index += 1) {
      fullText += `${textNodes[index].textContent} `;
    }
  }

  return cleanText(fullText);
}

async function extractMaterialText(file, type) {
  if (type === "TXT") {
    return readTextFile(file);
  }

  if (type === "PDF") {
    return extractPdfText(file);
  }

  if (type === "DOCX") {
    return extractDocxText(file);
  }

  if (type === "PPTX") {
    return extractPptxText(file);
  }

  return "";
}

async function saveUploadedMaterial() {
  const subject = document.getElementById("materialSubject").value.trim();
  const topic = document.getElementById("materialTopic").value.trim();

  if (!selectedFile) {
    document.getElementById("uploadError").textContent =
      "Please choose a file.";
    return;
  }

  if (!subject || !topic) {
    document.getElementById("uploadError").textContent =
      "Please enter the subject and topic.";
    return;
  }

  const type = getFileType(selectedFile);

  if (type === "Unknown") {
    document.getElementById("uploadError").textContent =
      "Unsupported file type.";
    return;
  }

  let content = "";

  try {
    if (type !== "Images") {
      showToast("Reading and preparing your material...", "⏳");
      content = await extractMaterialText(selectedFile, type);
    }
  } catch (error) {
    console.error(error);

    document.getElementById("uploadError").textContent =
      "Unable to extract readable text from this file.";
    return;
  }

  if (type !== "Images" && content.trim().length < 20) {
    document.getElementById("uploadError").textContent =
      "No readable text was found in this file.";
    return;
  }

  const newMaterial = {
    id: `material-${Date.now()}`,
    name: selectedFile.name,
    type,
    subject,
    topic,
    date: new Date().toLocaleDateString("en-PH", {
      month: "long",
      day: "numeric",
      year: "numeric"
    }),
    textBased: type !== "Images",
    content,
    fileUrl:
      type === "PDF" || type === "Images"
        ? URL.createObjectURL(selectedFile)
        : null,
    favorite: false,
    pinned: false
  };

  appData.materials.unshift(newMaterial);

  appData.notifications.unshift({
    title: "Material uploaded successfully.",
    message:
      type === "Images"
        ? "Your image material is available for viewing."
        : "Your material is ready for reviewer and quiz generation.",
    icon: "📚"
  });

  selectedMaterialId = newMaterial.id;

  saveData();

  showToast("Material uploaded successfully.", "✓");

  showAppScreen("materialViewerScreen");
}

function resetCurrentUserForAnotherAccount() {
  appData.user = null;

  saveData();

  document.getElementById("loginForm").reset();
  document.getElementById("profileSetupForm").reset();

  document.getElementById("loginError").textContent = "";
  document.getElementById("setupError").textContent = "";
}

function initializeEvents() {
  document.getElementById("skipButton").addEventListener("click", () => {
    showScreen("loginScreen");
  });

  document
    .getElementById("getStartedButton")
    .addEventListener("click", () => {
      showScreen("loginScreen");
    });

  document.getElementById("loginForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    if (!email || !password) {
      document.getElementById("loginError").textContent =
        "Please enter your email or student ID and password.";
      return;
    }

    document.getElementById("loginError").textContent = "";
    document.getElementById("profileSetupForm").reset();

    showScreen("profileSetupScreen");
  });

  document.getElementById("guestButton").addEventListener("click", () => {
    document.getElementById("studentName").value = "Guest Student";
    document.getElementById("studentId").value = "GUEST-0001";
    document.getElementById("studentCourse").value = "Other";

    showScreen("profileSetupScreen");
  });

  document
    .getElementById("profileSetupForm")
    .addEventListener("submit", (event) => {
      event.preventDefault();

      const name = document.getElementById("studentName").value.trim();
      const studentId = document.getElementById("studentId").value.trim();
      const course = document.getElementById("studentCourse").value;

      const setupError = document.getElementById("setupError");

      if (!name) {
        setupError.textContent = "Please enter your student name.";
        return;
      }

      if (!studentId) {
        setupError.textContent =
          "Please enter your student ID number.";
        return;
      }

      if (!course) {
        setupError.textContent =
          "Please select your course or program.";
        return;
      }

      appData.user = {
        name,
        studentId,
        course
      };

      saveData();

      openMainApp("homeScreen");

      showToast("Profile saved successfully.");
    });

  document
    .getElementById("signInAgainButton")
    .addEventListener("click", () => {
      openMainApp("homeScreen");
      showToast("Welcome back!");
    });

  document
    .getElementById("useAnotherAccountButton")
    .addEventListener("click", () => {
      resetCurrentUserForAnotherAccount();
      showScreen("loginScreen");
      showToast("You may now sign in using another account.", "✓");
    });

  document.getElementById("uploadButton").addEventListener("click", () => {
    if (appData.settings.offline) {
      showToast("Internet connection required for cloud upload.", "☁");
      return;
    }

    resetUploadForm();
    showAppScreen("uploadScreen");
  });

  document
    .getElementById("uploadButtonMaterials")
    .addEventListener("click", () => {
      if (appData.settings.offline) {
        showToast("Internet connection required for cloud upload.", "☁");
        return;
      }

      resetUploadForm();
      showAppScreen("uploadScreen");
    });

  document
    .getElementById("materialsButton")
    .addEventListener("click", () => {
      showAppScreen("materialsScreen");
    });

  document
    .getElementById("backHomeFromMaterials")
    .addEventListener("click", () => {
      showAppScreen("homeScreen");
    });

  document
    .getElementById("backMaterialsFromUpload")
    .addEventListener("click", () => {
      showAppScreen("materialsScreen");
    });

  document
    .getElementById("backFromMaterialViewer")
    .addEventListener("click", () => {
      showAppScreen("materialsScreen");
    });

  document.getElementById("profileButton").addEventListener("click", () => {
    showAppScreen("profileScreen");
  });

  document
    .getElementById("notificationsButton")
    .addEventListener("click", () => {
      showAppScreen("notificationsScreen");
    });

  document
    .getElementById("backHomeFromNotifications")
    .addEventListener("click", () => {
      showAppScreen("homeScreen");
    });

  document
    .getElementById("materialsStatButton")
    .addEventListener("click", () => {
      showAppScreen("materialsScreen");
    });

  document
    .getElementById("reviewersStatButton")
    .addEventListener("click", () => {
      showAppScreen("reviewersScreen");
    });

  document
    .getElementById("quizzesStatButton")
    .addEventListener("click", () => {
      showAppScreen("quizzesScreen");
    });

  document
    .getElementById("progressStatButton")
    .addEventListener("click", () => {
      showAppScreen("progressScreen");
    });

  document
    .getElementById("reviewerButton")
    .addEventListener("click", () => {
      if (appData.settings.offline) {
        showToast("Internet connection required for AI generation.", "☁");
        return;
      }

      showAppScreen("reviewerSourceScreen");
    });

  document
    .getElementById("generateNewReviewerButton")
    .addEventListener("click", () => {
      if (appData.settings.offline) {
        showToast("Internet connection required for AI generation.", "☁");
        return;
      }

      showAppScreen("reviewerSourceScreen");
    });

  document
    .getElementById("backHomeFromReviewerSource")
    .addEventListener("click", () => {
      showAppScreen("homeScreen");
    });

  document
    .getElementById("backReviewersFromResult")
    .addEventListener("click", () => {
      showAppScreen("reviewersScreen");
    });

  document
    .getElementById("backToReviewersButton")
    .addEventListener("click", () => {
      showAppScreen("reviewersScreen");
    });

  document
    .getElementById("useReviewerQuizButton")
    .addEventListener("click", () => {
      if (appData.settings.offline) {
        showToast(
          "Internet connection required for automated quiz generation.",
          "☁"
        );
        return;
      }

      showAppScreen("quizSetupScreen");
    });

  document.getElementById("quizButton").addEventListener("click", () => {
    if (appData.settings.offline) {
      showToast(
        "Internet connection required for automated quiz generation.",
        "☁"
      );
      return;
    }

    showAppScreen("quizSetupScreen");
  });

  document
    .getElementById("createQuizButton")
    .addEventListener("click", () => {
      if (appData.settings.offline) {
        showToast(
          "Internet connection required for automated quiz generation.",
          "☁"
        );
        return;
      }

      showAppScreen("quizSetupScreen");
    });

  document
    .getElementById("backFromQuizSetup")
    .addEventListener("click", () => {
      showAppScreen("quizzesScreen");
    });

  document.querySelectorAll(".question-count-choice").forEach((button) => {
    button.addEventListener("click", () => {
      selectedQuestionCount = Number(button.dataset.count);

      document.getElementById("customQuestionCount").value =
        selectedQuestionCount;

      document.querySelectorAll(".question-count-choice").forEach((choice) => {
        choice.classList.remove("active-choice");
      });

      button.classList.add("active-choice");
    });
  });

  document
    .getElementById("customQuestionCount")
    .addEventListener("input", (event) => {
      let count = Number(event.target.value);

      if (count < 1) count = 1;
      if (count > 100) count = 100;

      selectedQuestionCount = count;

      document.querySelectorAll(".question-count-choice").forEach((choice) => {
        choice.classList.remove("active-choice");
      });
    });

  document.querySelectorAll(".question-type-choice").forEach((button) => {
    button.addEventListener("click", () => {
      selectedQuestionType = button.dataset.type;

      document.querySelectorAll(".question-type-choice").forEach((choice) => {
        choice.classList.remove("active-choice");
      });

      button.classList.add("active-choice");
    });
  });

  document
    .getElementById("generateQuizButton")
    .addEventListener("click", () => {
      if (appData.settings.offline) {
        showToast(
          "Internet connection required for automated quiz generation.",
          "☁"
        );
        return;
      }

      const source = document.getElementById("quizSourceSelect").value;

      if (!source) {
        document.getElementById("quizSetupError").textContent =
          "Please select a readable material or reviewer.";
        return;
      }

      const count = Number(
        document.getElementById("customQuestionCount").value
      );

      if (!count || count < 1 || count > 100) {
        document.getElementById("quizSetupError").textContent =
          "Please enter a number from 1 to 100 items.";
        return;
      }

      document.getElementById("quizSetupError").textContent = "";

      requestAiConsent("quiz");
    });

  document
    .getElementById("nextQuestionButton")
    .addEventListener("click", () => {
      nextQuizQuestion();
    });

  document
    .getElementById("backFromQuiz")
    .addEventListener("click", () => {
      showAppScreen("quizzesScreen");
    });

  document
    .getElementById("tryAgainButton")
    .addEventListener("click", () => {
      if (appData.settings.offline) {
        showToast(
          "Internet connection required to generate a new quiz.",
          "☁"
        );
        return;
      }

      showAppScreen("quizSetupScreen");
    });

  document
    .getElementById("backToQuizzesButton")
    .addEventListener("click", () => {
      showAppScreen("quizzesScreen");
    });

  document
    .getElementById("backHomeFromQuizzes")
    .addEventListener("click", () => {
      showAppScreen("homeScreen");
    });

  document
    .getElementById("backHomeFromProgress")
    .addEventListener("click", () => {
      showAppScreen("homeScreen");
    });

  document
    .getElementById("profileProgressButton")
    .addEventListener("click", () => {
      showAppScreen("progressScreen");
    });

  document
    .getElementById("profileReviewersButton")
    .addEventListener("click", () => {
      showAppScreen("reviewersScreen");
    });

  document
    .getElementById("backHomeFromProfile")
    .addEventListener("click", () => {
      showAppScreen("homeScreen");
    });

  document
    .getElementById("settingsButton")
    .addEventListener("click", () => {
      showAppScreen("settingsScreen");
    });

  document
    .getElementById("backProfileFromSettings")
    .addEventListener("click", () => {
      showAppScreen("profileScreen");
    });

  document
    .getElementById("materialFile")
    .addEventListener("change", (event) => {
      const file = event.target.files[0];

      if (!file) return;

      const type = getFileType(file);

      if (type === "Unknown") {
        selectedFile = null;
        showToast("Unsupported file type.", "!");
        return;
      }

      selectedFile = file;

      showToast(
        type === "Images"
          ? "Image selected. It can be viewed and organized."
          : "File selected. It will be processed for review and quiz generation.",
        type === "Images" ? "🖼️" : "📄"
      );
    });

  document
    .getElementById("saveMaterialButton")
    .addEventListener("click", () => {
      if (appData.settings.offline) {
        showToast("Internet connection required for cloud upload.", "☁");
        return;
      }

      saveUploadedMaterial();
    });

  document.querySelectorAll(".filter-button").forEach((button) => {
    button.addEventListener("click", () => {
      currentFilter = button.dataset.filter;

      document.querySelectorAll(".filter-button").forEach((item) => {
        item.classList.remove("active-filter");
      });

      button.classList.add("active-filter");

      renderMaterials();
    });
  });

  document
    .getElementById("searchButton")
    .addEventListener("click", () => {
      showToast("Search can be added as the next improvement.", "🔍");
    });

  document
    .getElementById("darkModeToggle")
    .addEventListener("change", (event) => {
      setDarkMode(event.target.checked);

      showToast(
        event.target.checked ? "Dark Mode enabled." : "Dark Mode turned off.",
        "◐"
      );
    });

  document
    .getElementById("offlineToggle")
    .addEventListener("change", (event) => {
      appData.settings.offline = event.target.checked;

      saveData();
      updateOfflineBanner();

      showToast(
        event.target.checked ? "You are now offline." : "You are back online.",
        event.target.checked ? "☁" : "✓"
      );
    });

  document
    .getElementById("logoutButton")
    .addEventListener("click", () => {
      closeMainApp();

      showWelcomeBackScreen();

      showToast("You have logged out.");
    });

  document.getElementById("resetButton").addEventListener("click", () => {
    localStorage.removeItem("islearningData");

    appData = {
      user: null,
      materials: [],
      reviewers: [],
      quizzes: [],
      settings: {
        darkMode: false,
        offline: false
      },
      notifications: []
    };

    selectedFile = null;
    selectedMaterialId = null;
    selectedReviewerId = null;

    document.body.classList.remove("dark-mode");

    closeMainApp();

    document.getElementById("loginForm").reset();
    document.getElementById("profileSetupForm").reset();

    showScreen("onboardingScreen");

    showToast("Demo data reset.");
  });

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      showAppScreen(button.dataset.screen);
    });
  });

  modalOverlay.addEventListener("click", (event) => {
    if (event.target === modalOverlay) {
      closeModal();
    }
  });
}

function startApplication() {
  loadData();

  initializeEvents();

  setDarkMode(appData.settings.darkMode);

  updatePhoneTime();

  setInterval(() => {
    updatePhoneTime();
  }, 1000);

  setTimeout(() => {
    if (appData.user) {
      showWelcomeBackScreen();
      updateOfflineBanner();
    } else {
      showScreen("onboardingScreen");
    }
  }, 800);
}

startApplication();
