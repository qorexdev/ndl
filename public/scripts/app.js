import {
  bindShellEvents,
  formatDate,
  getLang,
  icon,
  localize,
  mountShell,
  renderError,
  renderLoading,
  t,
  updateShellUser,
} from "/scripts/layout.js?v=5";

const page = document.body.dataset.page || "home";

let currentUser = null;
let countries = [];
let countryMap = new Map();
let flashMessage = null;

class ApiError extends Error {
  constructor(status, message, payload = null) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

function getToken() {
  return window.localStorage.getItem("ndl-token") || "";
}

function setToken(token) {
  window.localStorage.setItem("ndl-token", token);
}

function clearToken() {
  window.localStorage.removeItem("ndl-token");
}

function setFlash(text, tone = "success") {
  flashMessage = { text, tone };
}

function consumeFlash() {
  const next = flashMessage;
  flashMessage = null;
  return next;
}

function copy(ru, en) {
  return getLang() === "ru" ? ru : en;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function nl2br(value) {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

async function api(path, options = {}, { allowUnauthorized = false } = {}) {
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(path, { ...options, headers });
  const raw = await response.text();
  const payload = raw ? JSON.parse(raw) : null;

  if (!response.ok) {
    if (allowUnauthorized && (response.status === 401 || response.status === 403)) {
      return payload;
    }
    if (response.status === 401) {
      clearToken();
      currentUser = null;
    }
    throw new ApiError(response.status, payload?.error || response.statusText, payload);
  }

  return payload;
}

async function loadContext() {
  const [session, countryList] = await Promise.all([
    api("/api/auth/session", {}, { allowUnauthorized: true }),
    api("/api/countries"),
  ]);

  currentUser = session?.user || null;
  countries = countryList || [];
  countryMap = new Map(countries.map((c) => [c.code, c]));
}

function formatNumber(value, maximumFractionDigits = 2) {
  const numeric = Number(value || 0);
  const locale = getLang() === "ru" ? "ru-RU" : "en-US";
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits,
    minimumFractionDigits: Number.isInteger(numeric) ? 0 : Math.min(2, maximumFractionDigits),
  }).format(numeric);
}

function countryFlagEmoji(code) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized || normalized.length !== 2) return "";
  return normalized.replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

function flagImg(code) {
  const c = String(code || "").trim().toUpperCase();
  if (!c || c.length !== 2) return "";
  return `<img class="flag-icon" src="https://flagcdn.com/w40/${c.toLowerCase()}.png" alt="${c}" title="${c}" />`;
}

function avatarMarkup(entity, className = "avatar-circle") {
  if (entity?.avatarUrl) {
    return `<span class="${className}"><img src="${entity.avatarUrl}" alt="${escapeHtml(entity.nickname || entity.player || "avatar")}" /></span>`;
  }
  return `<span class="${className}"><svg viewBox="0 0 24 24" fill="currentColor" class="default-avatar-icon"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4.33 0-8 2.17-8 5v1h16v-1c0-2.83-3.67-5-8-5z"/></svg></span>`;
}

function segmentLabel(segment) {
  if (segment === "main") return t("segmentMain");
  if (segment === "extended") return t("segmentExtended");
  if (segment === "legacy") return t("segmentLegacy");
  return segment || "-";
}

function levelHref(level) {
  return `/level?id=${encodeURIComponent(level.id)}`;
}

function userHref(user) {
  return `/user?id=${encodeURIComponent(user.id || user.nickname || "")}`;
}

function levelImageMarkup(level, className = "level-cover-img") {
  if (level?.thumbnailUrl) {
    return `<img class="${className}" src="${level.thumbnailUrl}" alt="${escapeHtml(level.name || "level")}" loading="lazy" />`;
  }
  return `
    <div class="${className} level-cover-fallback">
      ${icon("image")}
      <span>${escapeHtml(level?.name || "NDL")}</span>
    </div>
  `;
}

function renderField(label, inputHtml) {
  return `<label><span>${label}</span>${inputHtml}</label>`;
}

function countriesOptions(selectedCode = "") {
  return countries
    .map((c) => {
      const selected = selectedCode === c.code ? "selected" : "";
      return `<option value="${c.code}" ${selected}>${c.code} - ${escapeHtml(localize(c.name))}</option>`;
    })
    .join("");
}

function accessPanel(message = t("signInRequired")) {
  return `
    <section class="panel access-panel">
      <div class="panel-title">${icon("lock")} ${t("accountAuthTitle")}</div>
      <p class="submission-intro">${escapeHtml(message)}</p>
      <a class="btn btn-primary" href="/account">${t("signInAction")}</a>
    </section>
  `;
}

function getErrorMessage(error, fallback = t("errorLoad")) {
  return error instanceof ApiError ? error.message : fallback;
}

async function handleAuthSuccess(token) {
  setToken(token);
  await init();
}

function roleLabel(role) {
  if (role === "admin") return t("roleAdmin");
  if (role === "moderator") return t("roleModerator");
  return t("rolePlayer");
}

function submissionTypeLabel(type) {
  if (type === "record") return t("typeRecord");
  return t("typeLevel");
}

function statusLabel(status) {
  if (status === "approved") return t("approved");
  if (status === "rejected") return t("rejected");
  if (status === "banned") return t("banned");
  return t("pending");
}

function statusPill(status) {
  return `<span class="status-pill ${status}">${escapeHtml(statusLabel(status))}</span>`;
}

function formMessageMarkup(message, tone = "") {
  if (!message) return '<div class="form-message"></div>';
  return `<div class="form-message ${tone}">${escapeHtml(message)}</div>`;
}

function withShellUserUpdate(user) {
  currentUser = user;
  updateShellUser(currentUser);
}

function statBox(label, value, extra = "", { rawValue = false } = {}) {
  return `
    <div class="stat-box">
      <div class="label">${escapeHtml(label)}</div>
      <div class="val">${rawValue ? (value || "-") : escapeHtml(value || "-")}</div>
      ${extra}
    </div>
  `;
}

function toastNotification(text, tone = "success") {
  const existing = document.querySelector(".toast-notification");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `toast-notification toast-${tone}`;
  toast.textContent = text;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function fileInputMarkup(name, label, accept = "image/*") {
  return `
    <label class="file-upload-area" data-file-input="${name}">
      <span>${label}</span>
      <div class="file-drop-zone">
        <input type="file" name="${name}" accept="${accept}" class="file-input-hidden" />
        <div class="file-drop-content">
          ${icon("image")}
          <span>${escapeHtml(copy("Перетащи файл или нажми для загрузки", "Drop file here or click to upload"))}</span>
        </div>
        <div class="file-preview" style="display:none"></div>
      </div>
    </label>
  `;
}

function bindFileInputs(container) {
  container.querySelectorAll(".file-upload-area").forEach((area) => {
    const input = area.querySelector("input[type=file]");
    const preview = area.querySelector(".file-preview");
    const dropContent = area.querySelector(".file-drop-content");
    const dropZone = area.querySelector(".file-drop-zone");

    function handleFile(file) {
      if (!file || !file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        input.dataset.base64 = reader.result;
        preview.innerHTML = `<img src="${reader.result}" alt="preview" />`;
        preview.style.display = "block";
        dropContent.style.display = "none";
      };
      reader.readAsDataURL(file);
    }

    input.addEventListener("change", () => {
      if (input.files[0]) handleFile(input.files[0]);
    });

    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("drag-over");
    });

    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("drag-over");
    });

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("drag-over");
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
  });
}

function getFileBase64(container, name) {
  const input = container.querySelector(`[data-file-input="${name}"] input[type=file]`);
  return input?.dataset.base64 || null;
}

async function renderHome() {
  const content = document.getElementById("page-content");
  content.innerHTML = renderLoading();

  try {
    const summary = await api("/api/site-summary");

    content.innerHTML = `
      <section class="hero hero-compact">
        <h1>${t("homeTitle")}</h1>
        <p class="hero-subcopy">${t("homeText")}</p>
        <div class="stats-grid">
          <div class="stat-item"><div class="stat-value">${summary.stats.users}</div><div class="stat-label">${t("heroUsers")}</div></div>
          <div class="stat-item"><div class="stat-value">${summary.stats.records}</div><div class="stat-label">${t("heroRecords")}</div></div>
          <div class="stat-item"><div class="stat-value">${summary.stats.levels}</div><div class="stat-label">${t("heroLevels")}</div></div>
        </div>
        <div class="hero-buttons">
          <a class="btn btn-primary" href="/list">${t("homeActionPrimary")} ${icon("arrowRight")}</a>
          <a class="btn btn-secondary" href="/account">${t("homeActionSecondary")}</a>
        </div>
      </section>

      <div class="home-grid">
        <section class="panel">
          <div class="panel-title">${icon("spark")} ${t("recentChanges")}</div>
          ${
            summary.recentChanges.length
              ? summary.recentChanges
                  .map(
                    (group) => `
                      <div class="date-divider">${formatDate(group.date)}</div>
                      <ul class="recent-changes-list">
                        ${group.items
                          .map(
                            (item) => `
                              <li class="recent-change-item">
                                <span class="change-dot"></span>
                                <a href="/level?id=${encodeURIComponent(item.levelId || "")}" class="highlight">${escapeHtml(typeof item.levelName === "object" ? localize(item.levelName) : item.levelName)}</a>
                                <span>${escapeHtml(typeof item.text === "object" ? localize(item.text) : item.text)}</span>
                              </li>
                            `,
                          )
                          .join("")}
                      </ul>
                    `,
                  )
                  .join("")
              : `<div class="empty-panel">${t("recentChangesEmpty")}</div>`
          }
        </section>

        <aside class="panel">
          <div class="panel-title">${icon("chart")} ${t("whyTitle")}</div>
          <div class="feature-item">
            <div class="feature-icon">${icon("user")}</div>
            <div class="feature-text"><h4>${t("featureAccountsTitle")}</h4><p>${t("featureAccountsText")}</p></div>
          </div>
          <div class="feature-item">
            <div class="feature-icon">${icon("shield")}</div>
            <div class="feature-text"><h4>${t("featureModerationTitle")}</h4><p>${t("featureModerationText")}</p></div>
          </div>
          <div class="feature-item">
            <div class="feature-icon">${icon("upload")}</div>
            <div class="feature-text"><h4>${t("featureDynamicSubmitTitle")}</h4><p>${t("featureDynamicSubmitText")}</p></div>
          </div>
        </aside>
      </div>
    `;
  } catch (error) {
    content.innerHTML = renderError(getErrorMessage(error));
  }
}

async function renderList() {
  const content = document.getElementById("page-content");
  content.innerHTML = renderLoading();

  try {
    const levels = await api("/api/levels");
    const state = { search: "", segment: "all" };

    const render = () => {
      const query = state.search.trim().toLowerCase();
      const filtered = levels.filter((level) => {
        const inSegment = state.segment === "all" || level.segment === state.segment;
        const haystack = [level.name, level.originalName, level.creator, level.verifier, level.originalPlacement].join(" ").toLowerCase();
        return inSegment && (!query || haystack.includes(query));
      });

      content.innerHTML = `
        <section class="list-controls">
          <div class="search-bar">
            ${icon("search")}
            <input id="level-search" type="search" placeholder="${escapeHtml(copy("Поиск по уровням, авторам и ID...", "Search levels, creators and IDs..."))}" value="${escapeHtml(state.search)}" />
          </div>
          <button class="control-chip ${state.segment === "all" ? "active" : ""}" data-segment="all">${escapeHtml(copy("Все", "All"))}</button>
          <button class="control-chip ${state.segment === "main" ? "active" : ""}" data-segment="main">${escapeHtml(t("segmentMain"))}</button>
          <button class="control-chip ${state.segment === "extended" ? "active" : ""}" data-segment="extended">${escapeHtml(t("segmentExtended"))}</button>
          <button class="control-chip ${state.segment === "legacy" ? "active" : ""}" data-segment="legacy">${escapeHtml(t("segmentLegacy"))}</button>
        </section>

        ${
          filtered.length
            ? `<div class="level-list">
                ${filtered
                  .map(
                    (level) => `
                      <div class="level-card-wrap">
                        <a class="level-card" href="${levelHref(level)}">
                          <div class="level-thumb" data-yt-url="${escapeHtml(level.verificationUrl || "")}">
                            ${level.isNew ? `<div class="level-new-badge">NEW</div>` : ""}
                            ${levelImageMarkup(level)}
                            <div class="level-thumb-overlay">
                              <svg viewBox="0 0 24 24" fill="white" width="32" height="32"><path d="M8 5v14l11-7z"/></svg>
                            </div>
                          </div>
                          <div class="level-info">
                            <div class="level-title-row">
                              <div class="level-title"><span class="level-rank">#${level.rank}</span> ${escapeHtml(level.name)}</div>
                              ${level.originalPlacement ? `<span class="gdl-badge" title="Позиция в Global Demon List"><span class="gdl-badge-label">${icon("globe")} Global Demon List</span><span class="gdl-badge-rank">#${escapeHtml(level.originalPlacement)}</span></span>` : ""}
                            </div>
                            <div class="level-stats">
                              ${escapeHtml(t("createdBy"))} <span class="white">${escapeHtml(level.creator)}</span>
                              · ${escapeHtml(t("verifiedBy"))} <span class="green">${escapeHtml(level.verifier)}</span>
                            </div>
                            <div class="level-user-links" style="display:none" data-creator-id="${escapeHtml(level.creatorId || "")}" data-verifier-id="${escapeHtml(level.verifierId || "")}"></div>
                            <div class="level-subline">
                              ${escapeHtml(t("basedOn"))} <span class="white">${escapeHtml(level.originalName)}</span>
                              · <span class="blue">${escapeHtml(level.score100)} pts${level.minProgress != null && level.minProgressScore != null ? ` / ${escapeHtml(String(level.minProgressScore))} pts (${escapeHtml(String(level.minProgress))}%)` : ""}</span>
                            </div>
                          </div>
                        </a>
                      </div>
                    `,
                  )
                  .join("")}
              </div>`
            : `<div class="empty-panel">${levels.length ? escapeHtml(copy("По запросу ничего не найдено.", "Nothing matched your search.")) : `${escapeHtml(t("listEmpty"))}<div class="empty-hint">${escapeHtml(t("listEmptyHint"))}</div>`}</div>`
        }
      `;

      content.querySelector("#level-search")?.addEventListener("input", (e) => {
        state.search = e.target.value;
        render();
      });

      content.querySelectorAll("[data-segment]").forEach((btn) => {
        btn.addEventListener("click", () => {
          state.segment = btn.dataset.segment;
          render();
        });
      });

      content.querySelectorAll(".level-thumb[data-yt-url]").forEach((thumb) => {
        thumb.addEventListener("click", (e) => {
          const url = thumb.dataset.ytUrl;
          if (url) {
            e.preventDefault();
            e.stopPropagation();
            window.open(url, "_blank");
          }
        });
      });
    };

    render();
  } catch (error) {
    content.innerHTML = renderError(getErrorMessage(error));
  }
}

async function renderLevel() {
  const content = document.getElementById("page-content");
  const levelId = new URLSearchParams(window.location.search).get("id");

  if (!levelId) {
    content.innerHTML = renderError(copy("Уровень не найден.", "Level not found."));
    return;
  }

  content.innerHTML = renderLoading();

  try {
    const level = await api(`/api/levels/${encodeURIComponent(levelId)}`);
    const description = localize(level.description) || copy("Описание пока не добавлено.", "Description has not been added yet.");
    const allRecords = Array.isArray(level.records) ? level.records : [];
    const history = Array.isArray(level.history) ? level.history : [];

    const bestByPlayer = new Map();
    for (const record of allRecords) {
      const progress = Number.parseFloat(String(record.progress || "").replace("%", "")) || 0;
      const existing = bestByPlayer.get(record.userId);
      if (!existing || progress > existing.progress) {
        bestByPlayer.set(record.userId, { ...record, _progress: progress });
      }
    }
    const records = [...bestByPlayer.values()].sort((a, b) => b._progress - a._progress);

    content.innerHTML = `
      <a class="back-link" href="/list">${icon("arrowRight")} ${t("backToList")}</a>

      <div class="video-container">
        <div class="iframe-container">
          <iframe
            src="https://www.youtube-nocookie.com/embed/${escapeHtml(level.youtubeId)}?rel=0"
            title="${escapeHtml(level.name)}"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerpolicy="strict-origin-when-cross-origin"
            allowfullscreen
          ></iframe>
        </div>
      </div>

      <section class="level-info-full panel">
        <div class="level-rank-line">
          <span class="level-rank-big">#${level.rank}</span>
          <span class="control-chip active">${escapeHtml(segmentLabel(level.segment))}</span>
          <span class="blue">${escapeHtml(level.score100)} pts${level.minProgress != null && level.minProgressScore != null ? ` / ${escapeHtml(String(level.minProgressScore))} pts (${escapeHtml(String(level.minProgress))}%)` : ""}</span>
        </div>
        <h1 class="level-page-title">${escapeHtml(level.name)}</h1>
        <p class="level-meta-line">
          ${escapeHtml(t("createdBy"))} ${level.creatorId
            ? `<a href="/user?id=${encodeURIComponent(level.creatorId)}" class="user-link"><strong>${escapeHtml(level.creator)}</strong></a>`
            : `<strong>${escapeHtml(level.creator)}</strong>`}
          · ${escapeHtml(t("verifiedBy"))} ${level.verifierId
            ? `<a href="/user?id=${encodeURIComponent(level.verifierId)}" class="user-link green"><strong>${escapeHtml(level.verifier)}</strong></a>`
            : `<strong class="green">${escapeHtml(level.verifier)}</strong>`}
        </p>
        <p class="level-meta-line">${escapeHtml(t("basedOn"))} <strong>${escapeHtml(level.originalName)}</strong></p>
        <p class="level-desc">${nl2br(description)}</p>

        <div class="verified-badge">${icon("check")} ${escapeHtml(copy("Верификация подтверждена стаффом", "Verification confirmed by staff"))}</div>

        <div class="level-stats-grid">
          <div class="stats-grid-box three">
            ${statBox(t("levelMetaNerfedId"), level.nerfedLevelId, `<button class="copy-chip" data-copy="${escapeHtml(level.nerfedLevelId)}">${escapeHtml(copy("Копировать", "Copy"))}</button>`)}
            ${statBox(t("levelMetaOriginalId"), level.originalLevelId, `<button class="copy-chip" data-copy="${escapeHtml(level.originalLevelId)}">${escapeHtml(copy("Копировать", "Copy"))}</button>`)}
            ${statBox(t("levelMetaOriginalTop"), level.originalPlacement)}
          </div>
          <div class="stats-grid-box three">
            ${statBox(t("fieldPassword"), level.password)}
            ${statBox(t("fieldLength"), level.length)}
            ${statBox(t("fieldObjects"), level.objects)}
          </div>
          <div class="stats-grid-box three">
            ${statBox(t("fieldVersion"), level.version)}
            ${statBox(t("fieldRequiredProgress"), level.minProgress != null ? `${level.minProgress}%${level.minProgressScore != null ? ` / ${level.minProgressScore} pts` : ""}` : level.requiredProgress)}
            ${statBox(t("fieldSimilarity"), `${level.similarity}%`)}
          </div>
        </div>

        <div class="level-actions">
          ${level.songUrl ? `<a class="btn btn-secondary" href="${level.songUrl}" target="_blank" rel="noreferrer"><svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6ZM8 19a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z"/></svg> ${t("song")}</a>` : ""}
          <a class="btn btn-primary" href="${level.gdBrowserUrl}" target="_blank" rel="noreferrer"><svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm-1-5 5-3-5-3v6Z"/></svg> ${t("gdBrowser")}</a>
          <a class="btn btn-secondary" href="${level.verificationUrl}" target="_blank" rel="noreferrer"><svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17Z"/></svg> ${escapeHtml(copy("Верификация", "Verification"))}</a>
        </div>
      </section>

      <div class="level-detail-grid">
        <section class="panel level-record-panel">
          <div class="panel-title">${icon("trophy")} ${escapeHtml(copy("Рекорды", "Records"))} <span class="record-count">${records.length}</span></div>
          ${(() => {
            if (!records.length) return `<div class="empty-panel">${t("levelRecordsEmpty")}</div>`;
            const RECORDS_PER_PAGE = 20;
            const visibleRecords = records.slice(0, RECORDS_PER_PAGE);
            const hasMore = records.length > RECORDS_PER_PAGE;
            return `<div class="record-list" id="records-list">
                  ${visibleRecords.map((record, idx) => {
                    const progressText = String(record.progress || "0%").includes("%") ? record.progress : `${record.progress}%`;
                    return `
                    <div class="record-item">
                      <div class="record-player">
                        <span class="record-index">${idx + 1}</span>
                        <span class="record-avatar-wrap">
                          ${avatarMarkup(record, "avatar-circle-sm")}
                          ${record.countryCode ? `<span class="record-flag-overlay">${flagImg(record.countryCode)}</span>` : ""}
                        </span>
                        <div>
                          <strong>${record.userId ? `<a href="/user?id=${encodeURIComponent(record.userId)}" class="user-link">${escapeHtml(record.player)}</a>` : escapeHtml(record.player)}</strong>
                          <span class="record-date">${escapeHtml(formatDate(record.date))}</span>
                        </div>
                      </div>
                      <div class="record-meta">
                        <span class="record-progress blue">${escapeHtml(progressText)}</span>
                        <a class="record-video-link" href="${record.videoUrl}" target="_blank" rel="noreferrer" title="${escapeHtml(copy("Видео", "Video"))}"><svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M9.5 16.5v-9l7 4.5-7 4.5ZM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8Z"/></svg></a>
                        ${currentUser && ["moderator", "admin"].includes(currentUser.role)
                          ? `<button class="btn btn-sm btn-danger record-delete-btn" data-delete-record="${record.id}" data-delete-level="${level.id}">${escapeHtml(t("deleteRecord"))}</button>`
                          : ""}
                      </div>
                    </div>`;
                  }).join("")}
                </div>
                ${hasMore ? `<button class="btn btn-secondary records-show-more" type="button" data-show-from="${RECORDS_PER_PAGE}">${escapeHtml(copy("Показать ещё", "Show more"))} (${records.length - RECORDS_PER_PAGE})</button>` : ""}`;
          })()}
        </section>

        <section class="panel level-history-panel">
          <div class="panel-title">${icon("chart")} ${t("positionHistory")}</div>
          ${
            history.length
              ? `<div class="history-list">
                  ${history.map((item) => `
                    <div class="history-item">
                      <div>
                        <strong>#${item.rank}</strong>
                        <span>${escapeHtml(formatDate(item.date))}</span>
                      </div>
                      <span>${escapeHtml(localize(item.note))}</span>
                    </div>
                  `).join("")}
                </div>`
              : `<div class="empty-panel">${escapeHtml(copy("История позиции пока пуста.", "Position history is empty."))}</div>`
          }
        </section>
      </div>
    `;

    content.querySelectorAll("[data-copy]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(button.dataset.copy || "");
          button.textContent = copy("Скопировано", "Copied");
          setTimeout(() => { button.textContent = copy("Копировать", "Copy"); }, 1200);
        } catch { button.textContent = copy("Ошибка", "Failed"); }
      });
    });

    content.querySelectorAll(".record-delete-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!window.confirm(t("deleteRecordConfirm"))) return;
        const levelId = btn.dataset.deleteLevel;
        const recordId = btn.dataset.deleteRecord;
        try {
          await api(`/api/levels/${encodeURIComponent(levelId)}/records/${encodeURIComponent(recordId)}`, { method: "DELETE" });
          toastNotification(copy("Рекорд удалён", "Record deleted"), "success");
          await renderLevel();
        } catch (error) {
          toastNotification(getErrorMessage(error), "error");
        }
      });
    });

    const showMoreBtn = content.querySelector(".records-show-more");
    if (showMoreBtn) {
      showMoreBtn.addEventListener("click", () => {
        const list = content.querySelector("#records-list");
        const from = Number(showMoreBtn.dataset.showFrom);
        const nextBatch = records.slice(from, from + 20);
        for (const record of nextBatch) {
          const idx = records.indexOf(record);
          const progressText = String(record.progress || "0%").includes("%") ? record.progress : `${record.progress}%`;
          const div = document.createElement("div");
          div.className = "record-item";
          div.innerHTML = `
            <div class="record-player">
              <span class="record-index">${idx + 1}</span>
              <span class="record-avatar-wrap">
                ${avatarMarkup(record, "avatar-circle-sm")}
                ${record.countryCode ? `<span class="record-flag-overlay">${flagImg(record.countryCode)}</span>` : ""}
              </span>
              <div>
                <strong>${record.userId ? `<a href="/user?id=${encodeURIComponent(record.userId)}" class="user-link">${escapeHtml(record.player)}</a>` : escapeHtml(record.player)}</strong>
                <span class="record-date">${escapeHtml(formatDate(record.date))}</span>
              </div>
            </div>
            <div class="record-meta">
              <span class="record-progress blue">${escapeHtml(progressText)}</span>
              <a class="record-video-link" href="${record.videoUrl}" target="_blank" rel="noreferrer" title="${escapeHtml(copy("Видео", "Video"))}"><svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M9.5 16.5v-9l7 4.5-7 4.5ZM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8Z"/></svg></a>
              ${currentUser && ["moderator", "admin"].includes(currentUser.role)
                ? `<button class="btn btn-sm btn-danger record-delete-btn" data-delete-record="${record.id}" data-delete-level="${level.id}">${escapeHtml(t("deleteRecord"))}</button>`
                : ""}
            </div>`;
          list.appendChild(div);
        }
        const remaining = records.length - (from + 20);
        if (remaining > 0) {
          showMoreBtn.dataset.showFrom = String(from + 20);
          showMoreBtn.textContent = `${copy("Показать ещё", "Show more")} (${remaining})`;
        } else {
          showMoreBtn.remove();
        }
      });
    }
  } catch (error) {
    content.innerHTML = renderError(getErrorMessage(error));
  }
}

async function renderLeaderboard() {
  const content = document.getElementById("page-content");
  content.innerHTML = renderLoading();

  try {
    const [players, countriesData] = await Promise.all([
      api("/api/leaderboards/players"),
      api("/api/leaderboards/countries"),
    ]);

    const state = { mode: players.length ? "players" : "countries", search: "", selectedId: "" };

    const render = () => {
      const source = state.mode === "players" ? players : countriesData;
      const query = state.search.trim().toLowerCase();
      const filtered = source.filter((entry) => {
        const label = state.mode === "players" ? entry.nickname : localize(entry.name);
        return !query || String(label || "").toLowerCase().includes(query);
      });

      if (!state.selectedId || !filtered.some((e) => e.id === state.selectedId)) {
        state.selectedId = filtered[0]?.id || "";
      }

      const selected = filtered.find((e) => e.id === state.selectedId) || null;

      content.innerHTML = `
        <div class="leaderboard-layout">
          <aside class="lb-sidebar">
            <div class="lb-header">
              <div class="board-tabs">
                <button class="btn ${state.mode === "players" ? "btn-primary active" : "btn-secondary"}" data-board="players">${t("playerLeaderboard")}</button>
                <button class="btn ${state.mode === "countries" ? "btn-primary active" : "btn-secondary"}" data-board="countries">${t("countryLeaderboard")}</button>
              </div>
              <div class="search-bar search-bar-inline">
                ${icon("search")}
                <input id="leaderboard-search" type="search" placeholder="${escapeHtml(t("leaderboardSearch"))}" value="${escapeHtml(state.search)}" />
              </div>
            </div>

            <div class="lb-list">
              ${
                filtered.length
                  ? filtered.map((entry) => {
                      const isPlayer = state.mode === "players";
                      const title = isPlayer ? entry.nickname : localize(entry.name);
                      const leading = isPlayer
                        ? avatarMarkup(entry, "lb-mini-avatar")
                        : `<span class="country-badge">${flagImg(entry.code || entry.flag || entry.id)}</span>`;
                      const trailingFlag = isPlayer ? flagImg(entry.countryCode) : "";

                      return `
                        <button class="lb-item ${entry.id === state.selectedId ? "active" : ""}" data-id="${entry.id}">
                          <span class="lb-rank">#${entry.rank}</span>
                          <span class="lb-name-wrap">
                            ${leading}
                            <span class="lb-name">${escapeHtml(title)}</span>
                            ${trailingFlag}
                          </span>
                          <span class="lb-score">${formatNumber(entry.score)}</span>
                        </button>
                      `;
                    }).join("")
                  : `<div class="empty-panel">${escapeHtml(state.mode === "players" ? copy("Игроков пока нет.", "No players yet.") : copy("Стран в таблице пока нет.", "No countries yet."))}</div>`
              }
            </div>
          </aside>

          <section class="lb-main">
            ${
              selected
                ? state.mode === "players"
                  ? `
                    <div class="lb-profile-card">
                      <div class="lb-profile-head">
                        ${avatarMarkup(selected, "lb-avatar")}
                        <div>
                          <h2><a href="${userHref(selected)}">${escapeHtml(selected.nickname)}</a></h2>
                          <p>${flagImg(selected.countryCode)} ${escapeHtml(localize(selected.country))} · ${escapeHtml(roleLabel(selected.role))}</p>
                        </div>
                      </div>
                      <div class="stats-grid-box compact three">
                        ${statBox(copy("Очки", "Score"), formatNumber(selected.score))}
                        ${statBox(t("acceptedCompletions"), String(selected.completions))}
                        ${statBox(t("hardest"), selected.hardest || "-")}
                      </div>
                    </div>
                  `
                  : `
                    <div class="lb-profile-card">
                      <div class="lb-profile-head">
                        <div class="lb-flag-avatar">${flagImg(selected.code || selected.flag || selected.id)}</div>
                        <div>
                          <h2>${escapeHtml(localize(selected.name))}</h2>
                          <p>${escapeHtml(copy("Страна в рейтинге NDL", "Country in NDL ranking"))}</p>
                        </div>
                      </div>
                      <div class="stats-grid-box compact three">
                        ${statBox(copy("Очки", "Score"), formatNumber(selected.score))}
                        ${statBox(t("activePlayers"), String(selected.players))}
                        ${statBox(t("records"), String(selected.records))}
                      </div>
                      <div class="stats-grid-box compact">
                        ${statBox(t("topPlayer"), selected.topPlayer || "-")}
                      </div>
                    </div>
                  `
                : `
                  <div class="lb-empty-state">
                    <div class="lb-placeholder-icon">${icon("user")}</div>
                    <div class="lb-main-title">${t("profilePlaceholder")}</div>
                  </div>
                `
            }
          </section>
        </div>
      `;

      content.querySelector("#leaderboard-search")?.addEventListener("input", (e) => { state.search = e.target.value; render(); });
      content.querySelectorAll("[data-board]").forEach((btn) => { btn.addEventListener("click", () => { state.mode = btn.dataset.board; state.selectedId = ""; render(); }); });
      content.querySelectorAll(".lb-item[data-id]").forEach((btn) => { btn.addEventListener("click", () => { state.selectedId = btn.dataset.id; render(); }); });
    };

    render();
  } catch (error) {
    content.innerHTML = renderError(getErrorMessage(error));
  }
}

async function renderRules() {
  const content = document.getElementById("page-content");
  content.innerHTML = renderLoading();

  try {
    const rules = await api("/api/rules");

    content.innerHTML = `
      <div class="rules-layout">
        <aside class="panel rules-sidebar">
          <div class="panel-title">${icon("book")} ${t("rulesSidebar")}</div>
          <nav class="rules-nav">
            ${rules.map((rule) => `<a class="rules-link" href="#rule-${escapeHtml(rule.id)}">${escapeHtml(localize(rule.title))}</a>`).join("")}
          </nav>
        </aside>

        <div class="rules-main">
          <section class="panel">
            <div class="panel-title">${icon("shield")} ${t("rulesTitle")}</div>
            <p class="rules-intro">${t("rulesIntro")}</p>
          </section>

          ${rules.map((rule) => `
            <section class="panel" id="rule-${escapeHtml(rule.id)}">
              <div class="panel-title">${icon("check")} ${escapeHtml(localize(rule.title))}</div>
              <p class="rule-body">${escapeHtml(localize(rule.body))}</p>
              ${Array.isArray(rule.points) && rule.points.length
                ? `<ul class="rule-points">${rule.points.map((p) => `<li>${icon("check")} <span>${escapeHtml(localize(p))}</span></li>`).join("")}</ul>`
                : ""}
            </section>
          `).join("")}
        </div>
      </div>
    `;
  } catch (error) {
    content.innerHTML = renderError(getErrorMessage(error));
  }
}

async function renderSubmit() {
  const content = document.getElementById("page-content");

  if (!currentUser) {
    content.innerHTML = accessPanel();
    return;
  }

  content.innerHTML = renderLoading();

  try {
    const levels = await api("/api/levels");
    const state = { type: levels.length ? "record" : "level", values: {}, message: "", tone: "" };

    const captureValues = () => {
      const form = content.querySelector("#submission-form");
      if (!form) return;
      state.values = Object.fromEntries(new FormData(form).entries());
    };

    const renderFields = () => {
      const values = state.values;
      const selectedLevel = values.levelId || levels[0]?.id || "";

      if (state.type === "record" && !levels.length) {
        return `<div class="empty-panel">${t("submitNoLevels")}</div>`;
      }

      if (state.type === "record") {
        return `
          <div class="form-grid">
            ${renderField(t("fieldLevelSelect"),
              `<select name="levelId" required>${levels.map((l) => `<option value="${l.id}" ${selectedLevel === l.id ? "selected" : ""}>#${l.rank} ${escapeHtml(l.name)}</option>`).join("")}</select>`)}
            ${renderField(t("fieldProgress"), `<input name="progress" required placeholder="71% / 100%" value="${escapeHtml(values.progress || "")}" />`)}
          </div>
        `;
      }

      return `
        <div class="form-grid">
          ${renderField(t("fieldProposalName"), `<input name="proposalName" required value="${escapeHtml(values.proposalName || "")}" />`)}
          ${renderField(t("fieldOriginalName"), `<input name="originalLevelName" required value="${escapeHtml(values.originalLevelName || "")}" />`)}
        </div>
        <div class="form-grid">
          ${currentUser && ["moderator", "admin"].includes(currentUser.role)
            ? userSearchField("creator", t("fieldCreatorNickname"), values.creatorNickname || "", values.creatorId || "")
            : renderField(t("fieldCreatorNickname"), `<input name="creatorNickname" value="${escapeHtml(values.creatorNickname || "")}" placeholder="${escapeHtml(copy("Ник создателя уровня", "Level creator nickname"))}" />`)}
          ${currentUser && ["moderator", "admin"].includes(currentUser.role)
            ? userSearchField("verifier", copy("Ник верифера", "Verifier nickname"), values.verifierNickname || "", values.verifierId || "")
            : renderField(copy("Ник верифера", "Verifier nickname"), `<input name="verifierNickname" value="${escapeHtml(values.verifierNickname || "")}" placeholder="${escapeHtml(copy("Кто верифицировал уровень", "Who verified the level"))}" />`)}
        </div>
        <div class="form-grid">
          ${renderField(t("fieldNerfedId"), `<input name="nerfedLevelId" value="${escapeHtml(values.nerfedLevelId || "")}" />`)}
          ${renderField(t("fieldOriginalId"), `<input name="originalLevelId" value="${escapeHtml(values.originalLevelId || "")}" />`)}
        </div>
        <div class="form-grid">
          ${renderField(t("fieldOriginalPlacement"), `<input name="originalPlacement" required placeholder="#1 / Top 5" value="${escapeHtml(values.originalPlacement || "")}" />`)}
          ${renderField(t("fieldSimilarity"), `<input name="similarity" type="number" min="1" max="100" value="${escapeHtml(values.similarity || "80")}" />`)}
        </div>
        <div class="form-grid">
          ${renderField(t("fieldMinProgress"), `<input name="minProgress" type="number" min="1" max="99" placeholder="${escapeHtml(copy("Напр: 72", "E.g.: 72"))}" value="${escapeHtml(values.minProgress || "")}" />`)}
          ${renderField(t("fieldMinProgressScore"), `<input name="minProgressScore" type="number" min="1" placeholder="${escapeHtml(copy("Очки при мин. прогрессе", "Points at min progress"))}" value="${escapeHtml(values.minProgressScore || "")}" />`)}
        </div>
        <div class="form-grid">
          ${renderField(t("fieldPassword"), `<input name="password" value="${escapeHtml(values.password || "")}" />`)}
          ${renderField(t("fieldLength"), `<input name="length" value="${escapeHtml(values.length || "")}" />`)}
          ${renderField(t("fieldObjects"), `<input name="objects" value="${escapeHtml(values.objects || "")}" />`)}
          ${renderField(t("fieldVersion"), `<input name="version" value="${escapeHtml(values.version || "")}" />`)}
        </div>
        ${renderField(t("fieldSongUrl"), `<input name="songUrl" type="url" value="${escapeHtml(values.songUrl || "")}" />`)}
        ${renderField(t("fieldVerificationUrl"), `<input name="verificationUrl" type="url" value="${escapeHtml(values.verificationUrl || "")}" />`)}
        ${fileInputMarkup("thumbnailFile", copy("Загрузи превью уровня", "Upload level preview image"))}
        ${renderField(t("fieldDescriptionRu"), `<textarea name="descriptionRu">${escapeHtml(values.descriptionRu || "")}</textarea>`)}
        ${renderField(t("fieldDescriptionEn"), `<textarea name="descriptionEn">${escapeHtml(values.descriptionEn || "")}</textarea>`)}
        ${renderField(t("fieldSegment"),
          `<select name="segment">
            <option value="main" ${values.segment === "main" ? "selected" : ""}>${escapeHtml(t("segmentMain"))}</option>
            <option value="extended" ${values.segment === "extended" ? "selected" : ""}>${escapeHtml(t("segmentExtended"))}</option>
            <option value="legacy" ${values.segment === "legacy" ? "selected" : ""}>${escapeHtml(t("segmentLegacy"))}</option>
          </select>`)}
      `;
    };

    const render = () => {
      content.innerHTML = `
        <div class="submission-layout">
          <section class="panel">
            <div class="panel-title">${icon("upload")} ${t("submitTitle")}</div>
            <p class="submission-intro">${t("submitIntro")}</p>

            <div class="submit-switcher">
              <button class="control-chip ${state.type === "record" ? "active" : ""}" type="button" data-submit-type="record" ${!levels.length ? "disabled" : ""}>${escapeHtml(t("typeRecord"))}</button>
              <button class="control-chip ${state.type === "level" ? "active" : ""}" type="button" data-submit-type="level">${escapeHtml(t("typeLevel"))}</button>
            </div>

            <form id="submission-form" class="submission-form">
              ${renderFields()}
              ${renderField(t("fieldRawUrl"), `<input name="rawUrl" type="url" required placeholder="https://drive.google.com/..." value="${escapeHtml(state.values.rawUrl || "")}" />`)}
              ${renderField(t("fieldVideoUrl"), `<input name="videoUrl" type="url" required placeholder="https://youtube.com/..." value="${escapeHtml(state.values.videoUrl || "")}" />`)}
              ${renderField(t("fieldNotes"), `<textarea name="notes" placeholder="${escapeHtml(copy("Любые пояснения для модерации.", "Any notes for moderation."))}">${escapeHtml(state.values.notes || "")}</textarea>`)}
              ${formMessageMarkup(state.message, state.tone)}
              <button class="btn btn-primary" type="submit">${t("submitButton")}</button>
            </form>
          </section>

          <aside class="side-stack submit-side-panel">
            <section class="panel">
              <div class="panel-title">${icon("user")} ${escapeHtml(copy("Кто отправляет", "Submitting as"))}</div>
              <div class="account-chip">
                ${avatarMarkup(currentUser)}
                <div>
                  <strong>${escapeHtml(currentUser.nickname)}</strong>
                  <span>${flagImg(currentUser.countryCode)} ${escapeHtml(localize(currentUser.country))}</span>
                </div>
              </div>
            </section>
            <section class="panel">
              <div class="panel-title">${icon("shield")} ${escapeHtml(copy("Что важно", "Important"))}</div>
              <div class="side-rule"><strong>${escapeHtml(copy("Raw footage обязателен", "Raw footage is mandatory"))}</strong><p>${escapeHtml(t("submitDriveRule"))}</p></div>
              <div class="side-rule"><strong>${escapeHtml(copy("Уровни публикует только стафф", "Only staff publish levels"))}</strong><p>${escapeHtml(copy("Модератор создаёт карточку уровня после одобрения заявки.", "Moderator creates the level card after approving the application."))}</p></div>
            </section>
          </aside>
        </div>
      `;

      content.querySelectorAll("[data-submit-type]").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (btn.disabled) return;
          captureValues();
          state.type = btn.dataset.submitType;
          state.message = "";
          state.tone = "";
          render();
        });
      });

      if (state.type === "level") {
        bindFileInputs(content);
        bindUserSearchFields(content);
      }

      content.querySelector("#submission-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        state.values = Object.fromEntries(formData.entries());

        const payload = { type: state.type, ...state.values };
        if (state.type === "level") {
          const thumbnailData = getFileBase64(content, "thumbnailFile");
          if (thumbnailData) payload.thumbnailData = thumbnailData;
        }

        try {
          await api("/api/submissions", { method: "POST", body: JSON.stringify(payload) });
          state.values = {};
          state.message = t("submitSuccess");
          state.tone = "success";
          toastNotification(t("submitSuccess"), "success");
          render();
        } catch (error) {
          state.message = getErrorMessage(error);
          state.tone = "error";
          render();
        }
      });
    };

    render();
  } catch (error) {
    content.innerHTML = renderError(getErrorMessage(error));
  }
}

function blankLevelValues(levels) {
  return {
    name: "", originalName: "", creatorNickname: "", verifierNickname: "", creatorId: "", verifierId: "",
    rank: String((levels?.length || 0) + 1), segment: "main",
    nerfedLevelId: "", originalLevelId: "", originalPlacement: "",
    similarity: "80", minProgress: "", minProgressScore: "",
    password: "Free Copy", length: "Unknown", objects: "Unknown", version: "2.2",
    songUrl: "", verificationUrl: "", descriptionRu: "", descriptionEn: "",
  };
}

function levelValuesFromLevel(level) {
  return {
    name: level.name || "", originalName: level.originalName || "",
    creatorNickname: level.creator || "", verifierNickname: level.verifier || "",
    creatorId: level.creatorId || "", verifierId: level.verifierId || "",
    rank: String(level.rank || ""), segment: level.segment || "main",
    nerfedLevelId: level.nerfedLevelId || "", originalLevelId: level.originalLevelId || "",
    originalPlacement: level.originalPlacement || "", similarity: String(level.similarity || 80),
    minProgress: level.minProgress != null ? String(level.minProgress) : "",
    minProgressScore: level.minProgressScore != null ? String(level.minProgressScore) : "",
    password: level.password || "Free Copy", length: level.length || "Unknown",
    objects: level.objects || "Unknown", version: level.version || "2.2",
    songUrl: level.songUrl || "", verificationUrl: level.verificationUrl || "",
    descriptionRu: level.description?.ru || "", descriptionEn: level.description?.en || "",
  };
}

function userSearchField(name, label, currentValue = "", currentId = "") {
  return `
    <label>
      <span>${label}</span>
      <div class="user-search-wrap" data-user-search="${name}">
        <input type="hidden" name="${name}Id" value="${escapeHtml(currentId)}" />
        <input type="text" name="${name}Nickname" class="user-search-input" value="${escapeHtml(currentValue)}" autocomplete="off" placeholder="${escapeHtml(copy("Начни вводить ник...", "Start typing nickname..."))}" />
        <div class="user-search-dropdown"></div>
      </div>
    </label>
  `;
}

function bindUserSearchFields(container) {
  container.querySelectorAll(".user-search-wrap").forEach((wrap) => {
    const input = wrap.querySelector(".user-search-input");
    const dropdown = wrap.querySelector(".user-search-dropdown");
    const hiddenId = wrap.querySelector("input[type=hidden]");
    let debounce = null;

    input.addEventListener("input", () => {
      clearTimeout(debounce);
      const q = input.value.trim();
      if (q.length < 2) {
        dropdown.innerHTML = "";
        dropdown.style.display = "none";
        hiddenId.value = "";
        return;
      }

      debounce = setTimeout(async () => {
        try {
          const results = await api(`/api/users/search?q=${encodeURIComponent(q)}`);
          if (!results.length) {
            dropdown.innerHTML = `<div class="user-search-empty">${escapeHtml(copy("Не найдено", "Not found"))}</div>`;
            dropdown.style.display = "block";
            return;
          }
          dropdown.innerHTML = results.map((u) => `
            <button type="button" class="user-search-option" data-uid="${u.id}" data-nick="${escapeHtml(u.nickname)}">
              ${avatarMarkup(u, "avatar-circle-sm")}
              <span>${escapeHtml(u.nickname)}</span>
              <span class="user-search-country">${flagImg(u.countryCode)}</span>
            </button>
          `).join("");
          dropdown.style.display = "block";

          dropdown.querySelectorAll(".user-search-option").forEach((opt) => {
            opt.addEventListener("click", () => {
              input.value = opt.dataset.nick;
              hiddenId.value = opt.dataset.uid;
              dropdown.style.display = "none";
            });
          });
        } catch {
          dropdown.style.display = "none";
        }
      }, 300);
    });

    input.addEventListener("blur", () => {
      setTimeout(() => { dropdown.style.display = "none"; }, 200);
    });
  });
}

async function renderModeration() {
  const content = document.getElementById("page-content");

  if (!currentUser || !["moderator", "admin"].includes(currentUser.role)) {
    content.innerHTML = accessPanel(copy("Только для модераторов и администраторов.", "Moderators and administrators only."));
    return;
  }

  content.innerHTML = renderLoading();

  try {
    const levels = await api("/api/levels");

    const pageFlash = consumeFlash();
    if (pageFlash) toastNotification(pageFlash.text, pageFlash.tone);

    let prefillValues = null;
    try {
      const raw = window.sessionStorage.getItem("ndl-prefill-level");
      if (raw) {
        prefillValues = JSON.parse(raw);
        window.sessionStorage.removeItem("ndl-prefill-level");
      }
    } catch {  }

    const state = {
      selectedLevelId: "",
      values: prefillValues ? { ...blankLevelValues(levels), ...prefillValues } : blankLevelValues(levels),
      message: "",
      tone: "",
    };

    const render = () => {
      const levelEditorTitle = state.selectedLevelId ? t("updateLevel") : t("createLevel");

      content.innerHTML = `
        <div class="moderation-layout-new">
          <section class="panel">
            <div class="panel-title">${icon("settings")} ${t("levelEditorTitle")} <span class="record-count">${levels.length}</span></div>
            <p class="submission-intro">${t("createLevelIntro")}</p>

            <div class="editor-toolbar">
              <div class="editor-mode-switcher">
                <button class="control-chip ${!state.selectedLevelId ? "active" : ""}" type="button" data-editor-mode="">${escapeHtml(copy("Новый уровень", "New level"))}</button>
                <select id="editor-level-select" class="editor-level-dropdown">
                  <option value="">${escapeHtml(copy("Выберите уровень...", "Select level..."))}</option>
                  ${levels.map((l) => `<option value="${l.id}" ${state.selectedLevelId === l.id ? "selected" : ""}>#${l.rank} ${escapeHtml(l.name)}</option>`).join("")}
                </select>
              </div>
              ${state.selectedLevelId ? `<button class="btn btn-sm btn-danger" type="button" id="delete-level-btn">${escapeHtml(copy("Удалить уровень", "Delete level"))}</button>` : ""}
            </div>

            <form id="level-editor-form" class="submission-form">
              <div class="form-grid">
                ${renderField(t("fieldLevelName"), `<input name="name" required value="${escapeHtml(state.values.name || "")}" />`)}
                ${renderField(t("fieldOriginalName"), `<input name="originalName" required value="${escapeHtml(state.values.originalName || "")}" />`)}
              </div>
              <div class="form-grid">
                ${userSearchField("creator", t("fieldCreatorNickname"), state.values.creatorNickname, state.values.creatorId)}
                ${userSearchField("verifier", t("fieldVerifierNickname"), state.values.verifierNickname, state.values.verifierId)}
              </div>
              <div class="form-grid">
                ${renderField(t("fieldRank"), `<input name="rank" type="number" min="1" max="${levels.length + 1}" required value="${escapeHtml(state.values.rank || "")}" />`)}
                ${renderField(t("fieldSegment"),
                  `<select name="segment">
                    <option value="main" ${state.values.segment === "main" ? "selected" : ""}>${escapeHtml(t("segmentMain"))}</option>
                    <option value="extended" ${state.values.segment === "extended" ? "selected" : ""}>${escapeHtml(t("segmentExtended"))}</option>
                    <option value="legacy" ${state.values.segment === "legacy" ? "selected" : ""}>${escapeHtml(t("segmentLegacy"))}</option>
                  </select>`)}
              </div>
              <div class="form-grid">
                ${renderField(t("fieldNerfedId"), `<input name="nerfedLevelId" required value="${escapeHtml(state.values.nerfedLevelId || "")}" />`)}
                ${renderField(t("fieldOriginalId"), `<input name="originalLevelId" required value="${escapeHtml(state.values.originalLevelId || "")}" />`)}
              </div>
              <div class="form-grid">
                ${renderField(t("fieldOriginalPlacement"), `<input name="originalPlacement" required value="${escapeHtml(state.values.originalPlacement || "")}" />`)}
                ${renderField(t("fieldSimilarity"), `<input name="similarity" type="number" min="1" max="100" value="${escapeHtml(state.values.similarity || "80")}" />`)}
              </div>
              <div class="form-grid">
                ${renderField(t("fieldMinProgress"), `<input name="minProgress" type="number" min="1" max="99" placeholder="${escapeHtml(copy("Напр: 72", "E.g.: 72"))}" value="${escapeHtml(state.values.minProgress || "")}" />`)}
                ${renderField(t("fieldMinProgressScore"), `<input name="minProgressScore" type="number" min="1" placeholder="${escapeHtml(copy("Очки при мин. прогрессе", "Points at min progress"))}" value="${escapeHtml(state.values.minProgressScore || "")}" />`)}
              </div>
              <div class="form-grid">
                ${renderField(t("fieldPassword"), `<input name="password" value="${escapeHtml(state.values.password || "")}" />`)}
                ${renderField(t("fieldLength"), `<input name="length" value="${escapeHtml(state.values.length || "")}" />`)}
                ${renderField(t("fieldObjects"), `<input name="objects" value="${escapeHtml(state.values.objects || "")}" />`)}
                ${renderField(t("fieldVersion"), `<input name="version" value="${escapeHtml(state.values.version || "")}" />`)}
              </div>
              ${renderField(t("fieldSongUrl"), `<input name="songUrl" type="url" value="${escapeHtml(state.values.songUrl || "")}" />`)}
              ${renderField(t("fieldVerificationUrl"), `<input name="verificationUrl" type="url" required value="${escapeHtml(state.values.verificationUrl || "")}" />`)}
              ${fileInputMarkup("thumbnailFile", copy("Загрузи картинку файлом", "Upload image file"))}
              ${renderField(t("fieldDescriptionRu"), `<textarea name="descriptionRu">${escapeHtml(state.values.descriptionRu || "")}</textarea>`)}
              ${renderField(t("fieldDescriptionEn"), `<textarea name="descriptionEn">${escapeHtml(state.values.descriptionEn || "")}</textarea>`)}
              ${formMessageMarkup(state.message, state.tone)}
              <button class="btn btn-primary" type="submit">${levelEditorTitle}</button>
            </form>
          </section>

        </div>
      `;

      bindFileInputs(content);
      bindUserSearchFields(content);

      content.querySelector("#editor-level-select")?.addEventListener("change", (e) => {
        const nextId = e.target.value;
        state.selectedLevelId = nextId;
        state.values = nextId ? levelValuesFromLevel(levels.find((l) => l.id === nextId)) : blankLevelValues(levels);
        state.message = "";
        state.tone = "";
        render();
      });

      content.querySelector("#level-editor-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        state.values = Object.fromEntries(formData.entries());

        const payload = { ...state.values };
        const thumbnailData = getFileBase64(content, "thumbnailFile");
        if (thumbnailData) payload.thumbnailData = thumbnailData;

        try {
          if (state.selectedLevelId) {
            await api(`/api/levels/${encodeURIComponent(state.selectedLevelId)}`, { method: "PATCH", body: JSON.stringify(payload) });
          } else {
            await api("/api/levels", { method: "POST", body: JSON.stringify(payload) });
          }
          setFlash(t("createLevelSuccess"), "success");
          toastNotification(t("createLevelSuccess"), "success");
          await renderModeration();
        } catch (error) {
          state.message = getErrorMessage(error);
          state.tone = "error";
          render();
        }
      });

      content.querySelector("[data-editor-mode]")?.addEventListener("click", () => {
        state.selectedLevelId = "";
        state.values = blankLevelValues(levels);
        state.message = "";
        state.tone = "";
        render();
      });

      content.querySelector("#delete-level-btn")?.addEventListener("click", async () => {
        if (!state.selectedLevelId) return;
        const levelName = levels.find((l) => l.id === state.selectedLevelId)?.name || state.selectedLevelId;
        if (!window.confirm(copy(`Удалить уровень "${levelName}" навсегда?`, `Delete level "${levelName}" permanently?`))) return;
        try {
          await api(`/api/levels/${encodeURIComponent(state.selectedLevelId)}`, { method: "DELETE" });
          toastNotification(copy("Уровень удалён", "Level deleted"), "success");
          setFlash(copy("Уровень удалён.", "Level deleted."), "success");
          await renderModeration();
        } catch (error) {
          toastNotification(getErrorMessage(error), "error");
        }
      });
    };

    render();
  } catch (error) {
    console.error("renderModeration error:", error);
    content.innerHTML = renderError(error instanceof ApiError ? error.message : (error?.message || String(error)));
  }
}

function submissionCardMarkup(s) {
  const progressInfo = s.progress && s.progress !== "Application" ? ` · <span class="blue">${escapeHtml(s.progress)}</span>` : "";
  return `
    <div class="submission-mini">
      <div>
        <strong>${escapeHtml(submissionTypeLabel(s.type))}: ${escapeHtml(s.levelName || copy("Без названия", "Untitled"))}</strong>
        <p>${escapeHtml(formatDate(s.createdAt))}${progressInfo}</p>
      </div>
      <div class="submission-mini-meta">${statusPill(s.status)}</div>
    </div>
  `;
}

async function renderAccount() {
  const content = document.getElementById("page-content");
  content.innerHTML = renderLoading();

  try {
    const pageFlash = consumeFlash();

    if (!currentUser) {
      const state = { loginMessage: pageFlash?.text || "", loginTone: pageFlash?.tone || "", registerMessage: "", registerTone: "" };

      const render = () => {
        content.innerHTML = `
          <div class="account-auth-layout">
            <section class="panel">
              <div class="panel-title">${icon("lock")} ${t("loginTitle")}</div>
              <p class="submission-intro">${t("accountAuthText")}</p>
              <form id="login-form" class="submission-form">
                ${renderField(t("fieldIdentifier"), '<input name="identifier" required />')}
                ${renderField(t("fieldPassword"), '<input name="password" type="password" required />')}
                ${formMessageMarkup(state.loginMessage, state.loginTone)}
                <button class="btn btn-primary" type="submit">${t("loginButton")}</button>
              </form>
            </section>

            <section class="panel">
              <div class="panel-title">${icon("plus")} ${t("registerTitle")}</div>
              <form id="register-form" class="submission-form">
                ${renderField(t("fieldNickname"), '<input name="nickname" required />')}
                ${renderField(t("fieldEmail"), '<input name="email" type="email" required />')}
                ${renderField(t("fieldPassword"), '<input name="password" type="password" required />')}
                ${renderField(t("fieldCountry"), `<select name="countryCode"><option value="">${escapeHtml(copy("— Выберите страну —", "— Select country —"))}</option>${countriesOptions("")}</select>`)}
                ${formMessageMarkup(state.registerMessage, state.registerTone)}
                <button class="btn btn-primary" type="submit">${t("registerButton")}</button>
              </form>
            </section>
          </div>
        `;

        bindFileInputs(content);

        content.querySelector("#login-form")?.addEventListener("submit", async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          try {
            const response = await api("/api/auth/login", { method: "POST", body: JSON.stringify(Object.fromEntries(formData.entries())) });
            await handleAuthSuccess(response.token);
          } catch (error) {
            state.loginMessage = getErrorMessage(error);
            state.loginTone = "error";
            render();
          }
        });

        content.querySelector("#register-form")?.addEventListener("submit", async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const payload = Object.fromEntries(formData.entries());

          try {
            const response = await api("/api/auth/register", { method: "POST", body: JSON.stringify(payload) });
            await handleAuthSuccess(response.token);
          } catch (error) {
            state.registerMessage = getErrorMessage(error);
            state.registerTone = "error";
            render();
          }
        });
      };

      render();
      return;
    }

    const submissions = await api("/api/submissions");

    content.innerHTML = `
      <div class="account-layout">
        <div class="side-stack">
          <section class="panel account-card">
            <div class="account-head">
              <label class="avatar-upload-wrap">
                ${avatarMarkup(currentUser, "account-avatar")}
                <div class="avatar-upload-overlay">${icon("image")}</div>
                <input type="file" accept="image/*" class="avatar-upload-input" id="avatar-hover-input" />
              </label>
              <div class="account-meta">
                <h2>${escapeHtml(currentUser.nickname)}</h2>
                <p>${escapeHtml(roleLabel(currentUser.role))} · ${flagImg(currentUser.countryCode)} ${escapeHtml(localize(currentUser.country))}</p>
              </div>
            </div>

            <form id="profile-form" class="submission-form">
              <input type="hidden" name="avatarUrl" value="${escapeHtml(currentUser.avatarUrl || "")}" />
              <input type="hidden" name="avatarData" id="avatar-data-hidden" value="" />
              ${renderField(t("fieldCountry"), `<select name="countryCode">${countriesOptions(currentUser.countryCode)}</select>`)}
              ${renderField(t("fieldBioRu"), `<textarea name="bioRu">${escapeHtml(currentUser.bio?.ru || "")}</textarea>`)}
              ${renderField(t("fieldBioEn"), `<textarea name="bioEn">${escapeHtml(currentUser.bio?.en || "")}</textarea>`)}
              ${pageFlash ? formMessageMarkup(pageFlash.text, pageFlash.tone) : '<div class="form-message"></div>'}
              <button class="btn btn-primary" type="submit">${t("saveProfile")}</button>
            </form>
          </section>

          <section class="panel account-card">
            <div class="panel-title">${icon("settings")} ${escapeHtml(copy("Безопасность", "Security"))}</div>
            <form id="password-form" class="submission-form">
              ${renderField(t("fieldCurrentPassword"), '<input name="currentPassword" type="password" required />')}
              ${renderField(t("fieldNewPassword"), '<input name="nextPassword" type="password" required />')}
              <div class="form-message" id="password-message"></div>
              <button class="btn btn-secondary" type="submit">${t("changePassword")}</button>
            </form>
            <button class="btn btn-secondary" id="logout-button" type="button" style="margin-top:1rem">${t("logoutButton")}</button>
          </section>
        </div>

        <aside class="panel">
          <div class="panel-title">${icon("upload")} ${t("accountSubmissions")}</div>
          ${submissions.length
            ? `<div class="submission-mini-list">${submissions.map(submissionCardMarkup).join("")}</div>`
            : `<div class="empty-panel">${t("accountEmptySubmissions")}</div>`}
        </aside>
      </div>
    `;

    const avatarHoverInput = content.querySelector("#avatar-hover-input");
    const avatarDataHidden = content.querySelector("#avatar-data-hidden");
    if (avatarHoverInput) {
      avatarHoverInput.addEventListener("change", () => {
        const file = avatarHoverInput.files[0];
        if (!file || !file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = () => {
          avatarDataHidden.value = reader.result;
          const avatarEl = content.querySelector(".account-avatar");
          if (avatarEl) avatarEl.innerHTML = `<img src="${reader.result}" alt="avatar" />`;
        };
        reader.readAsDataURL(file);
      });
    }

    content.querySelector("#profile-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
      if (avatarDataHidden?.value) payload.avatarData = avatarDataHidden.value;

      try {
        const response = await api("/api/account/profile", { method: "PATCH", body: JSON.stringify(payload) });
        withShellUserUpdate(response.user);
        toastNotification(t("profileSaved"), "success");
        setFlash(t("profileSaved"), "success");
        await renderAccount();
      } catch (error) {
        toastNotification(getErrorMessage(error), "error");
        setFlash(getErrorMessage(error), "error");
        await renderAccount();
      }
    });

    content.querySelector("#password-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
      try {
        await api("/api/account/password", { method: "POST", body: JSON.stringify(payload) });
        toastNotification(t("passwordChanged"), "success");
        setFlash(t("passwordChanged"), "success");
        await renderAccount();
      } catch (error) {
        toastNotification(getErrorMessage(error), "error");
        setFlash(getErrorMessage(error), "error");
        await renderAccount();
      }
    });

    content.querySelector("#logout-button")?.addEventListener("click", async () => {
      await api("/api/auth/logout", { method: "POST" });
      clearToken();
      currentUser = null;
      await init();
    });
  } catch (error) {
    content.innerHTML = renderError(getErrorMessage(error));
  }
}

async function renderUserProfile() {
  const content = document.getElementById("page-content");
  const userId = new URLSearchParams(window.location.search).get("id");

  if (!userId) {
    content.innerHTML = renderError(copy("Пользователь не найден.", "User not found."));
    return;
  }

  content.innerHTML = renderLoading();

  try {
    const profile = await api(`/api/users/${encodeURIComponent(userId)}`);

    content.innerHTML = `
      <a class="back-link" href="/leaderboard">${icon("arrowRight")} ${escapeHtml(copy("Назад к лидерборду", "Back to leaderboard"))}</a>

      <section class="panel user-profile-page">
        <div class="user-profile-header">
          ${avatarMarkup(profile, "account-avatar")}
          <div class="user-profile-meta">
            <h1>${escapeHtml(profile.nickname)}</h1>
            <p>${flagImg(profile.countryCode)} ${escapeHtml(localize(profile.country))} · ${escapeHtml(roleLabel(profile.role))}</p>
            <p class="user-joined">${escapeHtml(copy("Зарегистрирован", "Joined"))} ${formatDate(profile.createdAt)}</p>
          </div>
        </div>

        ${localize(profile.bio) ? `<p class="user-bio">${nl2br(localize(profile.bio))}</p>` : ""}

        <div class="stats-grid-box compact three">
          ${statBox(copy("Очки", "Score"), formatNumber(profile.score))}
          ${statBox(copy("Прохождений", "Completions"), String(profile.completions))}
          ${statBox(copy("Сложнейший", "Hardest"), profile.hardestId
            ? `<a href="/level?id=${encodeURIComponent(profile.hardestId)}" style="color:var(--accent-soft)">${escapeHtml(profile.hardest)}</a>`
            : (profile.hardest || "-"), "", { rawValue: true })}
        </div>
      </section>

      ${profile.verifiedLevels.length ? `
        <section class="panel">
          <div class="panel-title">${icon("check")} ${escapeHtml(copy("Верификации", "Verifications"))} <span class="record-count">${profile.verifiedLevels.length}</span></div>
          <div class="mini-level-list">
            ${profile.verifiedLevels.map((l) => `
              <a href="/level?id=${encodeURIComponent(l.id)}" class="mini-level-item">
                <span class="level-rank">#${l.rank}</span> ${escapeHtml(l.name)}
              </a>
            `).join("")}
          </div>
        </section>
      ` : ""}

      ${profile.createdLevels.length ? `
        <section class="panel">
          <div class="panel-title">${icon("spark")} ${escapeHtml(copy("Созданные уровни", "Created levels"))} <span class="record-count">${profile.createdLevels.length}</span></div>
          <div class="mini-level-list">
            ${profile.createdLevels.map((l) => `
              <a href="/level?id=${encodeURIComponent(l.id)}" class="mini-level-item">
                <span class="level-rank">#${l.rank}</span> ${escapeHtml(l.name)}
              </a>
            `).join("")}
          </div>
        </section>
      ` : ""}

      ${profile.records.length ? `
        <section class="panel">
          <div class="panel-title">${icon("trophy")} ${escapeHtml(copy("Рекорды", "Records"))} <span class="record-count">${profile.records.length}</span></div>
          <div class="record-list">
            ${profile.records.map((r) => `
              <div class="record-item">
                <div class="record-player">
                  <div>
                    <a href="/level?id=${encodeURIComponent(r.levelId)}"><strong>#${r.levelRank} ${escapeHtml(r.levelName)}</strong></a>
                    <span>${escapeHtml(r.progress)} · ${escapeHtml(formatDate(r.date))}</span>
                  </div>
                </div>
                <div class="record-meta">
                  <a href="${r.videoUrl}" target="_blank" rel="noreferrer">${escapeHtml(copy("Видео", "Video"))}</a>
                </div>
              </div>
            `).join("")}
          </div>
        </section>
      ` : ""}
    `;
  } catch (error) {
    content.innerHTML = renderError(getErrorMessage(error));
  }
}

async function renderAccounts() {
  const content = document.getElementById("page-content");

  if (!currentUser || !["moderator", "admin"].includes(currentUser.role)) {
    content.innerHTML = accessPanel(copy("Только для модераторов и администраторов.", "Moderators and administrators only."));
    return;
  }

  content.innerHTML = renderLoading();

  try {
    const state = { page: 1, limit: 20, q: "", sort: "nickname", dir: "asc" };
    let debounceTimer = null;

    const fetchAndRender = async () => {
      const params = new URLSearchParams({
        page: state.page,
        limit: state.limit,
        q: state.q,
        sort: state.sort,
        dir: state.dir,
      });
      const data = await api(`/api/users?${params}`);
      const users = data.items || [];
      const totalPages = data.totalPages || 1;
      const currentPage = data.page || state.page;

      content.innerHTML = `
        <div class="accounts-layout">
          <section class="panel">
            <div class="panel-title">${icon("user")} ${escapeHtml(copy("Управление аккаунтами", "Account Management"))}</div>

            <div class="accounts-controls">
              <div class="search-bar">
                ${icon("search")}
                <input id="accounts-search" type="search" placeholder="${escapeHtml(copy("Поиск по нику или email...", "Search by nickname or email..."))}" value="${escapeHtml(state.q)}" />
              </div>
              <div class="accounts-filters">
                <select id="accounts-sort">
                  <option value="nickname" ${state.sort === "nickname" ? "selected" : ""}>${escapeHtml(copy("По нику", "By nickname"))}</option>
                  <option value="createdAt" ${state.sort === "createdAt" ? "selected" : ""}>${escapeHtml(copy("По дате", "By date"))}</option>
                  <option value="role" ${state.sort === "role" ? "selected" : ""}>${escapeHtml(copy("По роли", "By role"))}</option>
                </select>
                <button class="btn btn-secondary btn-sm" id="accounts-dir-toggle">${state.dir === "asc" ? "A-Z" : "Z-A"}</button>
              </div>
            </div>

            ${users.length
              ? `<div class="user-management-list">
                  ${users.map((u) => `
                    <div class="user-management-card">
                      <div class="user-management-head">
                        ${avatarMarkup(u, "lb-mini-avatar")}
                        <div>
                          <strong><a href="${userHref(u)}">${escapeHtml(u.nickname)}</a></strong>
                          <span class="text-muted">${escapeHtml((u.id || "").substring(0, 8))}...</span>
                        </div>
                        <div class="user-management-info">
                          ${u.email ? `<span class="text-muted">${escapeHtml(u.email)}</span>` : ""}
                          <span>${flagImg(u.countryCode)} ${escapeHtml(localize(u.country))}</span>
                          <span>${escapeHtml(roleLabel(u.role))}</span>
                          ${u.isBanned ? `<span class="status-pill banned">${escapeHtml(copy("Заблокирован", "Banned"))}</span>` : ""}
                          <span class="text-muted">${escapeHtml(formatDate(u.createdAt))}</span>
                        </div>
                      </div>
                      <div class="user-management-controls">
                        ${currentUser.role === "admin" ? `
                          <select data-role-select="${u.id}">
                            <option value="player" ${u.role === "player" ? "selected" : ""}>${escapeHtml(t("rolePlayer"))}</option>
                            <option value="moderator" ${u.role === "moderator" ? "selected" : ""}>${escapeHtml(t("roleModerator"))}</option>
                            <option value="admin" ${u.role === "admin" ? "selected" : ""}>${escapeHtml(t("roleAdmin"))}</option>
                          </select>
                          <button class="btn btn-secondary btn-sm" type="button" data-role-save="${u.id}">${escapeHtml(copy("Сохранить", "Save"))}</button>
                        ` : ""}
                        <button class="btn btn-sm ${u.isBanned ? "btn-primary" : "btn-danger"}" type="button" data-ban-toggle="${u.id}" data-ban-current="${u.isBanned ? "true" : "false"}">
                          ${escapeHtml(u.isBanned ? copy("Разбанить", "Unban") : copy("Забанить", "Ban"))}
                        </button>
                        ${currentUser.role === "admin" && u.role !== "admin" ? `<button class="btn btn-sm btn-danger" type="button" data-delete-user="${u.id}" data-delete-user-name="${escapeHtml(u.nickname)}">${escapeHtml(copy("Удалить", "Delete"))}</button>` : ""}
                      </div>
                    </div>
                  `).join("")}
                </div>`
              : `<div class="empty-panel">${escapeHtml(copy("Пользователи не найдены.", "No users found."))}</div>`
            }

            ${totalPages > 1 ? `
              <div class="pagination-controls">
                <button class="btn btn-secondary btn-sm" ${currentPage <= 1 ? "disabled" : ""} data-accounts-page="${currentPage - 1}">${escapeHtml(copy("Назад", "Previous"))}</button>
                <span>${escapeHtml(copy("Стр.", "Page"))} ${currentPage} ${escapeHtml(copy("из", "of"))} ${totalPages}</span>
                <button class="btn btn-secondary btn-sm" ${currentPage >= totalPages ? "disabled" : ""} data-accounts-page="${currentPage + 1}">${escapeHtml(copy("Далее", "Next"))}</button>
              </div>
            ` : ""}
          </section>
        </div>
      `;

      content.querySelector("#accounts-search")?.addEventListener("input", (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          state.q = e.target.value;
          state.page = 1;
          fetchAndRender();
        }, 400);
      });

      content.querySelector("#accounts-sort")?.addEventListener("change", (e) => {
        state.sort = e.target.value;
        state.page = 1;
        fetchAndRender();
      });

      content.querySelector("#accounts-dir-toggle")?.addEventListener("click", () => {
        state.dir = state.dir === "asc" ? "desc" : "asc";
        state.page = 1;
        fetchAndRender();
      });

      content.querySelectorAll("[data-accounts-page]").forEach((btn) => {
        btn.addEventListener("click", () => {
          state.page = Number(btn.dataset.accountsPage);
          fetchAndRender();
        });
      });

      content.querySelectorAll("[data-role-save]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const userId = btn.dataset.roleSave;
          const select = content.querySelector(`[data-role-select="${userId}"]`);
          try {
            await api(`/api/users/${encodeURIComponent(userId)}`, { method: "PATCH", body: JSON.stringify({ role: select.value }) });
            toastNotification(copy("Роль обновлена", "Role updated"), "success");
            await fetchAndRender();
          } catch (error) {
            toastNotification(getErrorMessage(error), "error");
          }
        });
      });

      content.querySelectorAll("[data-ban-toggle]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const userId = btn.dataset.banToggle;
          const currentBan = btn.dataset.banCurrent === "true";
          const confirmMsg = currentBan ? copy("Разбанить пользователя?", "Unban this user?") : copy("Забанить пользователя?", "Ban this user?");
          if (!window.confirm(confirmMsg)) return;
          try {
            await api(`/api/users/${encodeURIComponent(userId)}`, { method: "PATCH", body: JSON.stringify({ isBanned: !currentBan }) });
            toastNotification(copy(currentBan ? "Пользователь разбанен" : "Пользователь забанен", currentBan ? "User unbanned" : "User banned"), "success");
            await fetchAndRender();
          } catch (error) {
            toastNotification(getErrorMessage(error), "error");
          }
        });
      });

      content.querySelectorAll("[data-delete-user]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const userId = btn.dataset.deleteUser;
          const userName = btn.dataset.deleteUserName;
          if (!window.confirm(copy(`Удалить пользователя "${userName}" навсегда? Все его рекорды и заявки будут удалены.`, `Delete user "${userName}" permanently? All their records and submissions will be removed.`))) return;
          btn.disabled = true;
          btn.textContent = "...";
          try {
            await api(`/api/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
            toastNotification(copy("Пользователь удалён", "User deleted"), "success");
            await fetchAndRender();
          } catch (error) {
            btn.disabled = false;
            btn.textContent = copy("Удалить", "Delete");
            toastNotification(getErrorMessage(error), "error");
          }
        });
      });
    };

    await fetchAndRender();
  } catch (error) {
    content.innerHTML = renderError(getErrorMessage(error));
  }
}

async function renderSubmissionsQueue() {
  const content = document.getElementById("page-content");

  if (!currentUser || !["moderator", "admin"].includes(currentUser.role)) {
    content.innerHTML = accessPanel(copy("Только для модераторов и администраторов.", "Moderators and administrators only."));
    return;
  }

  content.innerHTML = renderLoading();

  try {
    const levels = await api("/api/levels");
    const state = { page: 1, limit: 15, q: "", status: "", type: "", sort: "date", dir: "desc" };
    let debounceTimer = null;

    const fetchAndRender = async () => {
      const params = new URLSearchParams({
        page: state.page,
        limit: state.limit,
        q: state.q,
        status: state.status,
        type: state.type,
        sort: state.sort,
        dir: state.dir,
      });
      const data = await api(`/api/submissions?${params}`);
      const submissions = data.items || [];
      const totalPages = data.totalPages || 1;
      const currentPage = data.page || state.page;

      content.innerHTML = `
        <div class="submissions-queue-layout">
          <section class="panel">
            <div class="panel-title">${icon("shield")} ${escapeHtml(copy("Очередь заявок", "Submissions Queue"))}</div>

            <div class="submissions-controls">
              <div class="search-bar">
                ${icon("search")}
                <input id="submissions-search" type="search" placeholder="${escapeHtml(copy("Поиск по игроку или уровню...", "Search by player or level..."))}" value="${escapeHtml(state.q)}" />
              </div>
              <div class="submissions-filters">
                <select id="submissions-status-filter">
                  <option value="" ${!state.status ? "selected" : ""}>${escapeHtml(copy("Все статусы", "All statuses"))}</option>
                  <option value="pending" ${state.status === "pending" ? "selected" : ""}>${escapeHtml(t("pending"))}</option>
                  <option value="approved" ${state.status === "approved" ? "selected" : ""}>${escapeHtml(t("approved"))}</option>
                  <option value="rejected" ${state.status === "rejected" ? "selected" : ""}>${escapeHtml(t("rejected"))}</option>
                  <option value="banned" ${state.status === "banned" ? "selected" : ""}>${escapeHtml(t("banned"))}</option>
                </select>
                <select id="submissions-type-filter">
                  <option value="" ${!state.type ? "selected" : ""}>${escapeHtml(copy("Все типы", "All types"))}</option>
                  <option value="record" ${state.type === "record" ? "selected" : ""}>${escapeHtml(t("typeRecord"))}</option>
                  <option value="level" ${state.type === "level" ? "selected" : ""}>${escapeHtml(t("typeLevel"))}</option>
                </select>
                <select id="submissions-sort">
                  <option value="date" ${state.sort === "date" ? "selected" : ""}>${escapeHtml(copy("По дате", "By date"))}</option>
                  <option value="player" ${state.sort === "player" ? "selected" : ""}>${escapeHtml(copy("По игроку", "By player"))}</option>
                  <option value="status" ${state.sort === "status" ? "selected" : ""}>${escapeHtml(copy("По статусу", "By status"))}</option>
                </select>
                <button class="btn btn-secondary btn-sm" id="submissions-dir-toggle">${state.dir === "desc" ? "&#8595;" : "&#8593;"}</button>
              </div>
            </div>

            ${submissions.length
              ? `<div class="moderation-list">
                  ${submissions.map((s, idx) => {
                    const seqNum = (currentPage - 1) * state.limit + idx + 1;
                    return `
                      <article class="moderation-card">
                        <div class="moderation-card-head">
                          <div class="moderation-meta">
                            <span class="text-muted">#${seqNum}</span>
                            <span class="text-muted">${escapeHtml((s.id || "").substring(0, 8))}...</span>
                            ${statusPill(s.status)}
                            <span class="control-chip">${escapeHtml(submissionTypeLabel(s.type))}</span>
                            <span>${flagImg(s.countryCode)} ${escapeHtml(s.player)}</span>
                            <span class="text-muted">${escapeHtml(formatDate(s.createdAt))}</span>
                          </div>
                          <h3>${escapeHtml(s.levelName || copy("Без названия", "Untitled"))}</h3>
                          ${s.originalName ? `<p>${escapeHtml(s.originalName)}</p>` : ""}
                          ${s.progress && s.progress !== "Application" ? `<p class="blue">${escapeHtml(s.progress)}</p>` : ""}
                        </div>
                        ${s.previewImageUrl ? `<div class="submission-preview"><img src="${s.previewImageUrl}" alt="preview" /></div>` : ""}
                        <div class="moderation-links">
                          ${s.levelId ? `<a href="/level?id=${encodeURIComponent(s.levelId)}">${escapeHtml(copy("Страница уровня", "Level page"))}</a>` : ""}
                          <a href="${s.rawUrl}" target="_blank" rel="noreferrer">Raw footage</a>
                          <a href="${s.videoUrl}" target="_blank" rel="noreferrer">${escapeHtml(copy("Видео", "Video"))}</a>
                        </div>
                        ${s.notes ? `<p class="moderation-note">${escapeHtml(s.notes)}</p>` : ""}
                        ${s.moderationNote ? `<p class="moderation-note moderation-note-strong">${escapeHtml(s.moderationNote)}</p>` : ""}
                        ${s.status === "pending"
                          ? `<div class="moderation-actions">
                              <input type="text" class="mod-note-input" data-mod-note-for="${s.id}" placeholder="${escapeHtml(copy("Комментарий модерации (необязательно)", "Moderation note (optional)"))}" />
                              <div class="moderation-action-buttons">
                                <button class="btn btn-primary" type="button" data-submission-action="approve" data-submission-id="${s.id}">${t("approve")}</button>
                                <button class="btn btn-secondary danger-warn" type="button" data-submission-action="reject" data-submission-id="${s.id}">${t("reject")}</button>
                                <button class="btn btn-secondary danger-ban" type="button" data-submission-action="ban" data-submission-id="${s.id}">${t("ban")}</button>
                              </div>
                            </div>`
                          : `<div class="submission-reviewed-by">
                              ${escapeHtml(copy("Проверил", "Reviewed by"))}: ${escapeHtml(s.reviewedBy || "-")}
                              <button class="btn btn-sm btn-danger" type="button" data-delete-submission="${s.id}">${escapeHtml(copy("Удалить", "Delete"))}</button>
                            </div>`
                        }
                        ${s.status === "approved" && s.type === "level"
                          ? `<button class="btn btn-primary btn-sm" type="button" data-create-from-queue="${s.id}">${escapeHtml(t("createFromSubmission"))}</button>`
                          : ""}
                      </article>
                    `;
                  }).join("")}
                </div>`
              : `<div class="empty-panel">${escapeHtml(copy("Заявок не найдено.", "No submissions found."))}</div>`
            }

            ${totalPages > 1 ? `
              <div class="pagination-controls">
                <button class="btn btn-secondary btn-sm" ${currentPage <= 1 ? "disabled" : ""} data-submissions-page="${currentPage - 1}">${escapeHtml(copy("Назад", "Previous"))}</button>
                <span>${escapeHtml(copy("Стр.", "Page"))} ${currentPage} ${escapeHtml(copy("из", "of"))} ${totalPages}</span>
                <button class="btn btn-secondary btn-sm" ${currentPage >= totalPages ? "disabled" : ""} data-submissions-page="${currentPage + 1}">${escapeHtml(copy("Далее", "Next"))}</button>
              </div>
            ` : ""}
          </section>
        </div>
      `;

      content.querySelector("#submissions-search")?.addEventListener("input", (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          state.q = e.target.value;
          state.page = 1;
          fetchAndRender();
        }, 400);
      });

      content.querySelector("#submissions-status-filter")?.addEventListener("change", (e) => {
        state.status = e.target.value;
        state.page = 1;
        fetchAndRender();
      });

      content.querySelector("#submissions-type-filter")?.addEventListener("change", (e) => {
        state.type = e.target.value;
        state.page = 1;
        fetchAndRender();
      });

      content.querySelector("#submissions-sort")?.addEventListener("change", (e) => {
        state.sort = e.target.value;
        state.page = 1;
        fetchAndRender();
      });

      content.querySelector("#submissions-dir-toggle")?.addEventListener("click", () => {
        state.dir = state.dir === "desc" ? "asc" : "desc";
        state.page = 1;
        fetchAndRender();
      });

      content.querySelectorAll("[data-submissions-page]").forEach((btn) => {
        btn.addEventListener("click", () => {
          state.page = Number(btn.dataset.submissionsPage);
          fetchAndRender();
        });
      });

      content.querySelectorAll("[data-submission-action]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const action = btn.dataset.submissionAction;
          const submissionId = btn.dataset.submissionId;
          if (action === "ban" && !window.confirm(copy("Забанить игрока?", "Ban this player?"))) return;
          const noteInput = content.querySelector(`[data-mod-note-for="${submissionId}"]`);
          const moderationNote = noteInput ? noteInput.value.trim() : "";

          btn.disabled = true;
          btn.textContent = "...";
          try {
            await api(`/api/submissions/${encodeURIComponent(submissionId)}`, { method: "PATCH", body: JSON.stringify({ action, moderationNote }) });
            toastNotification(copy("Заявка обновлена", "Submission updated"), "success");
            await fetchAndRender();
          } catch (error) {
            btn.disabled = false;
            btn.textContent = action;
            toastNotification(getErrorMessage(error), "error");
          }
        });
      });

      content.querySelectorAll("[data-create-from-queue]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const subId = btn.dataset.createFromQueue;
          const s = submissions.find((x) => x.id === subId);
          if (!s) return;

          const prefill = {
            name: s.levelName || s.proposalName || "",
            originalName: s.originalName || s.originalLevelName || "",
            creatorNickname: s.creatorNickname || "",
            verifierNickname: s.verifierNickname || "",
            nerfedLevelId: s.nerfedLevelId || "",
            originalLevelId: s.originalLevelId || "",
            originalPlacement: s.originalPlacement || "",
            similarity: s.similarity ? String(s.similarity) : "80",
            minProgress: s.minProgress != null ? String(s.minProgress) : "",
            minProgressScore: s.minProgressScore != null ? String(s.minProgressScore) : "",
            password: s.password || "Free Copy",
            length: s.length || "Unknown",
            objects: s.objects || "Unknown",
            version: s.version || "2.2",
            songUrl: s.songUrl || "",
            verificationUrl: s.verificationUrl || s.videoUrl || "",
            descriptionRu: s.descriptionRu || "",
            descriptionEn: s.descriptionEn || "",
            segment: s.segment || "main",
            thumbnailUrl: s.previewImageUrl || "",
          };
          window.sessionStorage.setItem("ndl-prefill-level", JSON.stringify(prefill));
          window.location.href = "/moderation";
        });
      });

      content.querySelectorAll("[data-delete-submission]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const submissionId = btn.dataset.deleteSubmission;
          if (!window.confirm(copy("Удалить заявку навсегда?", "Delete submission permanently?"))) return;
          btn.disabled = true;
          btn.textContent = "...";
          try {
            await api(`/api/submissions/${encodeURIComponent(submissionId)}`, { method: "DELETE" });
            toastNotification(copy("Заявка удалена", "Submission deleted"), "success");
            await fetchAndRender();
          } catch (error) {
            btn.disabled = false;
            btn.textContent = copy("Удалить", "Delete");
            toastNotification(getErrorMessage(error), "error");
          }
        });
      });
    };

    await fetchAndRender();
  } catch (error) {
    content.innerHTML = renderError(getErrorMessage(error));
  }
}

function renderApiDocs() {
  const content = document.getElementById("page-content");
  const baseUrl = `${window.location.protocol}//${window.location.host}`;

  content.innerHTML = `
    <div class="api-docs">
      <section class="panel">
        <div class="panel-title">${icon("globe")} ${copy("Публичный API", "Public API")}</div>
        <p class="submission-intro">${copy(
          "Nerfed DemonList предоставляет открытый REST API для получения данных о уровнях, игроках и рекордах. Аутентификация не требуется.",
          "Nerfed DemonList provides a public REST API to access data about levels, players, and records. No authentication is required."
        )}</p>

        <div class="api-section">
          <h3>${copy("Базовый URL", "Base URL")}</h3>
          <pre class="api-code-block"><code>${escapeHtml(baseUrl)}/api/v1</code></pre>
        </div>

        <div class="api-section">
          <h3>${copy("Формат ответа", "Response Format")}</h3>
          <p>${copy("Все ответы возвращаются в формате JSON. В случае ошибки возвращается объект с полем <code>error</code>.", "All responses are returned in JSON format. On error, an object with an <code>error</code> field is returned.")}</p>
        </div>
      </section>

      <section class="panel">
        <div class="panel-title"><span class="api-method get">GET</span> /api/v1/levels</div>
        <p class="submission-intro">${copy("Возвращает список всех уровней, отсортированных по рангу.", "Returns a list of all levels sorted by rank.")}</p>

        <h4>${copy("Пример ответа", "Example Response")}</h4>
        <pre class="api-code-block"><code>[
  {
    "id": "example-level",
    "rank": 1,
    "name": "Example Level",
    "creator": "PlayerName",
    "verifier": "VerifierName",
    "originalName": "Original Level",
    "segment": "main",
    "score100": "250",
    "nerfedLevelId": "12345678",
    "originalLevelId": "87654321",
    "recordsCount": 5
  }
]</code></pre>

        <h4>${copy("Поля ответа", "Response Fields")}</h4>
        <table class="api-table">
          <thead><tr><th>${copy("Поле", "Field")}</th><th>${copy("Тип", "Type")}</th><th>${copy("Описание", "Description")}</th></tr></thead>
          <tbody>
            <tr><td><code>id</code></td><td>string</td><td>${copy("Уникальный идентификатор уровня (slug)", "Unique level identifier (slug)")}</td></tr>
            <tr><td><code>rank</code></td><td>number</td><td>${copy("Позиция в листе", "Position in the list")}</td></tr>
            <tr><td><code>name</code></td><td>string</td><td>${copy("Название нерфнутого уровня", "Nerfed level name")}</td></tr>
            <tr><td><code>creator</code></td><td>string</td><td>${copy("Ник создателя", "Creator nickname")}</td></tr>
            <tr><td><code>verifier</code></td><td>string</td><td>${copy("Ник верификатора", "Verifier nickname")}</td></tr>
            <tr><td><code>originalName</code></td><td>string</td><td>${copy("Название оригинального уровня", "Original level name")}</td></tr>
            <tr><td><code>segment</code></td><td>string</td><td>${copy("Сегмент: main, extended или legacy", "Segment: main, extended, or legacy")}</td></tr>
            <tr><td><code>score100</code></td><td>string</td><td>${copy("Очки за 100% прохождение", "Points for 100% completion")}</td></tr>
            <tr><td><code>nerfedLevelId</code></td><td>string</td><td>${copy("GD ID нерфнутого уровня", "GD ID of the nerfed level")}</td></tr>
            <tr><td><code>originalLevelId</code></td><td>string</td><td>${copy("GD ID оригинального уровня", "GD ID of the original level")}</td></tr>
            <tr><td><code>minProgress</code></td><td>number|null</td><td>${copy("Минимальный процент для начисления очков (если задан)", "Minimum progress percentage for scoring (if set)")}</td></tr>
            <tr><td><code>minProgressScore</code></td><td>number|null</td><td>${copy("Очки за минимальный прогресс", "Points awarded at minimum progress")}</td></tr>
            <tr><td><code>recordsCount</code></td><td>number</td><td>${copy("Количество принятых рекордов", "Number of accepted records")}</td></tr>
          </tbody>
        </table>

        <h4>${copy("Формула начисления очков", "Scoring Formula")}</h4>
        <p>${copy(
          "Top-1 = 1000 очков, каждый следующий ранг -40 очков. Если у уровня задан <code>minProgress</code>, при прохождении с процентом ниже 100% начисляются пропорциональные очки от <code>minProgressScore</code> до <code>score100</code>.",
          "Top-1 = 1000 points, each subsequent rank -40 points. If a level has <code>minProgress</code> set, completions below 100% receive proportional points from <code>minProgressScore</code> to <code>score100</code>."
        )}</p>
      </section>

      <section class="panel">
        <div class="panel-title"><span class="api-method get">GET</span> /api/v1/players</div>
        <p class="submission-intro">${copy("Возвращает таблицу лидеров игроков.", "Returns the player leaderboard.")}</p>

        <h4>${copy("Пример ответа", "Example Response")}</h4>
        <pre class="api-code-block"><code>[
  {
    "rank": 1,
    "nickname": "TopPlayer",
    "countryCode": "US",
    "score": 1250.5,
    "completions": 15,
    "hardest": "Hardest Level Name"
  }
]</code></pre>

        <h4>${copy("Поля ответа", "Response Fields")}</h4>
        <table class="api-table">
          <thead><tr><th>${copy("Поле", "Field")}</th><th>${copy("Тип", "Type")}</th><th>${copy("Описание", "Description")}</th></tr></thead>
          <tbody>
            <tr><td><code>rank</code></td><td>number</td><td>${copy("Позиция в лидерборде", "Leaderboard position")}</td></tr>
            <tr><td><code>nickname</code></td><td>string</td><td>${copy("Никнейм игрока", "Player nickname")}</td></tr>
            <tr><td><code>countryCode</code></td><td>string</td><td>${copy("Код страны (ISO 3166-1 alpha-2)", "Country code (ISO 3166-1 alpha-2)")}</td></tr>
            <tr><td><code>score</code></td><td>number</td><td>${copy("Общий счёт очков", "Total score")}</td></tr>
            <tr><td><code>completions</code></td><td>number</td><td>${copy("Количество 100% прохождений", "Number of 100% completions")}</td></tr>
            <tr><td><code>hardest</code></td><td>string</td><td>${copy("Название сложнейшего уровня", "Hardest level name")}</td></tr>
          </tbody>
        </table>
      </section>

      <section class="panel">
        <div class="panel-title"><span class="api-method get">GET</span> /api/v1/levels/:id/records</div>
        <p class="submission-intro">${copy("Возвращает список принятых рекордов для конкретного уровня.", "Returns accepted records for a specific level.")}</p>

        <h4>${copy("Параметры пути", "Path Parameters")}</h4>
        <table class="api-table">
          <thead><tr><th>${copy("Параметр", "Parameter")}</th><th>${copy("Тип", "Type")}</th><th>${copy("Описание", "Description")}</th></tr></thead>
          <tbody>
            <tr><td><code>:id</code></td><td>string</td><td>${copy("ID уровня (slug из /api/v1/levels)", "Level ID (slug from /api/v1/levels)")}</td></tr>
          </tbody>
        </table>

        <h4>${copy("Пример ответа", "Example Response")}</h4>
        <pre class="api-code-block"><code>[
  {
    "player": "PlayerName",
    "progress": "100%",
    "videoUrl": "https://youtube.com/watch?v=...",
    "date": "2026-03-09T12:00:00.000Z"
  }
]</code></pre>

        <h4>${copy("Поля ответа", "Response Fields")}</h4>
        <table class="api-table">
          <thead><tr><th>${copy("Поле", "Field")}</th><th>${copy("Тип", "Type")}</th><th>${copy("Описание", "Description")}</th></tr></thead>
          <tbody>
            <tr><td><code>player</code></td><td>string</td><td>${copy("Никнейм игрока", "Player nickname")}</td></tr>
            <tr><td><code>progress</code></td><td>string</td><td>${copy("Процент прохождения (например, '100%' или '78%')", "Completion progress (e.g., '100%' or '78%')")}</td></tr>
            <tr><td><code>videoUrl</code></td><td>string</td><td>${copy("Ссылка на видео-доказательство", "Link to video proof")}</td></tr>
            <tr><td><code>date</code></td><td>string</td><td>${copy("Дата принятия рекорда (ISO 8601)", "Record acceptance date (ISO 8601)")}</td></tr>
          </tbody>
        </table>
      </section>

      <section class="panel">
        <div class="panel-title">${icon("info")} ${copy("Ограничения и рекомендации", "Rate Limits & Guidelines")}</div>
        <ul class="api-guidelines">
          <li>${copy("API является публичным и не требует аутентификации.", "The API is public and requires no authentication.")}</li>
          <li>${copy("Пожалуйста, не отправляйте более 60 запросов в минуту.", "Please do not send more than 60 requests per minute.")}</li>
          <li>${copy("Данные обновляются в реальном времени при добавлении уровней и рекордов.", "Data is updated in real time as levels and records are added.")}</li>
          <li>${copy("При использовании данных в своих проектах, пожалуйста, укажите ссылку на Nerfed DemonList.", "When using data in your projects, please credit Nerfed DemonList with a link.")}</li>
        </ul>
      </section>
    </div>
  `;
}

async function renderPage() {
  if (page === "list") return renderList();
  if (page === "level") return renderLevel();
  if (page === "leaderboard") return renderLeaderboard();
  if (page === "rules") return renderRules();
  if (page === "submit") return renderSubmit();
  if (page === "moderation") return renderModeration();
  if (page === "accounts") return renderAccounts();
  if (page === "submissions") return renderSubmissionsQueue();
  if (page === "account") return renderAccount();
  if (page === "user") return renderUserProfile();
  if (page === "api") return renderApiDocs();
  return renderHome();
}

async function init() {
  try {
    await loadContext();
  } catch {
    currentUser = null;
    countries = [];
    countryMap = new Map();
  }

  mountShell(page);
  bindShellEvents(init);
  updateShellUser(currentUser);
  await renderPage();
}

init();
