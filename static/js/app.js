/**
 * ConsultaCNPJ - Frontend completo
 * Máscara CNPJ, validação, consulta API, acordeão dinâmico, tema,
 * histórico, favoritos, cópia, export PDF
 */
(function () {
  "use strict";

  // =============================================
  // DOM References
  // =============================================
  const $ = (id) => document.getElementById(id);
  const cnpjInput = $("cnpj-input");
  const consultarBtn = $("consultar-btn");
  const loadingContainer = $("loading-container");
  const fieldCounter = $("field-counter");
  const statusMessage = $("status-message");
  const resultsSection = $("results-section");
  const summaryContainer = $("summary-container");
  const detailsContainer = $("details-container");
  const exportPdfBtn = $("export-pdf-btn");
  const themeToggle = $("theme-toggle");
  const offlineBadge = $("offline-badge");
  const printCnpj = $("print-cnpj");
  const historyContainer = $("history-container");
  const historyList = $("history-list");
  const favoritesContainer = $("favorites-container");
  const favoritesList = $("favorites-list");

  // =============================================
  // State
  // =============================================
  let currentData = null;
  let currentCnpj = "";
  let currentFavorited = false;
  let theme = localStorage.getItem("ccnpj-theme") || "light";
  const HISTORY_KEY = "ccnpj-history";
  const FAVORITES_KEY = "ccnpj-favorites";
  const MAX_HISTORY = 10;

  // =============================================
  // Utilitários
  // =============================================
  const cleanDigits = (v) => String(v).replace(/\D/g, "");

  function formatCnpj(v) {
    const d = cleanDigits(v).slice(0, 14);
    return d
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
  }

  function validateCnpj(v) {
    const d = cleanDigits(v);
    if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
    const calc = (base, w) => {
      const sum = base.split("").reduce((t, c, i) => t + parseInt(c) * w[i], 0);
      const r = sum % 11;
      return r < 2 ? 0 : 11 - r;
    };
    return (
      calc(d.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) ===
        parseInt(d[12]) &&
      calc(d.slice(0, 12) + d[12], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) ===
        parseInt(d[13])
    );
  }

  function formatCep(v) {
    return cleanDigits(v)
      .slice(0, 8)
      .replace(/(\d{5})(\d{1,3})$/, "$1-$2");
  }

  function formatMoney(v) {
    if (v === null || v === undefined || v === "") return "-";
    const amt =
      typeof v === "number"
        ? v
        : parseFloat(
            String(v)
              .replace(/[^0-9,.-]/g, "")
              .replace(",", "."),
          );
    return isNaN(amt)
      ? String(v)
      : new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(amt);
  }

  function formatDate(v) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const [y, m, d] = v.split("-");
      return d + "/" + m + "/" + y;
    }
    const dig = cleanDigits(v);
    return dig.length === 8
      ? dig.slice(0, 2) + "/" + dig.slice(2, 4) + "/" + dig.slice(4)
      : v;
  }

  function safeText(v) {
    if (v === null || v === undefined || v === "") return "-";
    if (
      typeof v === "string" ||
      typeof v === "number" ||
      typeof v === "boolean"
    )
      return String(v);
    return JSON.stringify(v);
  }

  function formatValue(key, v) {
    if (v === null || v === undefined) return "-";
    if (/cnpj/i.test(key)) return formatCnpj(String(v));
    if (/cep/i.test(key)) return formatCep(String(v));
    if (/data|date|inicio|fundacao|nascimento|abertura/i.test(key))
      return formatDate(String(v));
    if (/capital(_|[A-Z])?social|capital_total/i.test(key))
      return formatMoney(v);
    if (typeof v === "boolean") return v ? "Sim" : "Não";
    return safeText(v);
  }

  function prettyKey(k) {
    return k
      .replace(/([A-Z])/g, " $1")
      .replace(/[_-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^./, (c) => c.toUpperCase());
  }

  function countFilled(data) {
    let c = 0;
    for (const k in data) {
      if (!Object.prototype.hasOwnProperty.call(data, k)) continue;
      const v = data[k];
      if (v === null || v === undefined || v === "") continue;
      if (Array.isArray(v) && v.length === 0) continue;
      if (
        typeof v === "object" &&
        !Array.isArray(v) &&
        Object.keys(v).length === 0
      )
        continue;
      c++;
    }
    return c;
  }

  const isObj = (v) => v !== null && typeof v === "object";

  // =============================================
  // Histórico e Favoritos (localStorage)
  // =============================================
  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function addToHistory(digits, razao) {
    const history = getHistory().filter((h) => h.digits !== digits);
    history.unshift({ digits, razao: razao || "—", date: Date.now() });
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      /* ignore */
    }
    renderHistory();
  }

  function renderHistory() {
    if (!historyContainer || !historyList) return;
    const history = getHistory();
    if (history.length === 0) {
      historyContainer.classList.add("hidden");
      return;
    }
    historyContainer.classList.remove("hidden");
    historyList.innerHTML = "";
    history.forEach((h) => {
      const li = document.createElement("li");
      li.className =
        "flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition";
      const span = document.createElement("span");
      span.innerHTML =
        '<span class="font-mono font-bold">' +
        formatCnpj(h.digits) +
        '</span> <span class="text-slate-500 dark:text-slate-400">' +
        safeText(h.razao) +
        "</span>";
      li.appendChild(span);
      li.addEventListener("click", function () {
        cnpjInput.value = formatCnpj(h.digits);
        handleSearch();
      });
      historyList.appendChild(li);
    });
  }

  function getFavorites() {
    try {
      return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function toggleFavorite() {
    if (!currentCnpj || !currentData) return;
    const favorites = getFavorites();
    const idx = favorites.findIndex((f) => f.digits === currentCnpj);
    if (idx >= 0) {
      favorites.splice(idx, 1);
      currentFavorited = false;
      showToast("Removido dos favoritos.", "success");
    } else {
      const est = currentData.estabelecimento || {};
      favorites.push({
        digits: currentCnpj,
        razao: currentData.razao_social || "—",
        fantasia: est.nome_fantasia || "",
        date: Date.now(),
      });
      currentFavorited = true;
      showToast("Adicionado aos favoritos!", "success");
    }
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch (e) {
      /* ignore */
    }
    updateFavoriteBtn();
    renderFavorites();
  }

  function updateFavoriteBtn() {
    const favBtn = $("favorite-btn");
    if (!favBtn) return;
    favBtn.textContent = currentFavorited ? "★ Favorito" : "☆ Favoritar";
    favBtn.classList.toggle("text-amber-500", currentFavorited);
    favBtn.classList.toggle("dark:text-amber-400", currentFavorited);
  }

  function renderFavorites() {
    if (!favoritesContainer || !favoritesList) return;
    const favorites = getFavorites();
    if (favorites.length === 0) {
      favoritesContainer.classList.add("hidden");
      return;
    }
    favoritesContainer.classList.remove("hidden");
    favoritesList.innerHTML = "";
    favorites.forEach((f) => {
      const li = document.createElement("li");
      li.className =
        "flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-xs cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 transition";
      const span = document.createElement("span");
      const fantasia = f.fantasia ? " — " + safeText(f.fantasia) : "";
      span.innerHTML =
        '<span class="font-mono font-bold">' +
        formatCnpj(f.digits) +
        "</span> " +
        safeText(f.razao) +
        fantasia;
      li.appendChild(span);
      li.addEventListener("click", function () {
        cnpjInput.value = formatCnpj(f.digits);
        handleSearch();
      });
      // Botão remover
      const rmBtn = document.createElement("button");
      rmBtn.className =
        "text-red-500 hover:text-red-700 dark:hover:text-red-400 text-xs font-bold px-1";
      rmBtn.textContent = "×";
      rmBtn.title = "Remover dos favoritos";
      rmBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        const favs = getFavorites().filter((x) => x.digits !== f.digits);
        try {
          localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
        } catch (e) {
          /* ignore */
        }
        renderFavorites();
        if (currentCnpj === f.digits) {
          currentFavorited = false;
          updateFavoriteBtn();
        }
        showToast("Removido dos favoritos.", "success");
      });
      li.appendChild(rmBtn);
      favoritesList.appendChild(li);
    });
  }

  // =============================================
  // Copiar valor individual
  // =============================================
  function copyTextToClipboard(text) {
    if (!text || text === "-") return;
    const cleanText = String(text)
      .replace(/<[^>]*>/g, "")
      .trim();
    if (!cleanText || cleanText === "-") return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(cleanText).then(
        () => showToast("Valor copiado!", "success"),
        () => fallbackCopy(cleanText),
      );
    } else {
      fallbackCopy(cleanText);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showToast("Valor copiado!", "success");
    } catch (e) {
      showToast("Erro ao copiar.", "error");
    }
    document.body.removeChild(ta);
  }
  // =============================================
  // Tema
  // =============================================
  function applyTheme(t) {
    theme = t;
    document.documentElement.classList.toggle("dark", t === "dark");
    localStorage.setItem("ccnpj-theme", t);
    if (themeToggle) {
      themeToggle.textContent =
        t === "light" ? "Usar tema escuro" : "Usar tema claro";
      themeToggle.setAttribute(
        "aria-label",
        t === "light" ? "Ativar tema escuro" : "Ativar tema claro",
      );
    }
  }
  if (themeToggle) {
    themeToggle.addEventListener("click", () =>
      applyTheme(theme === "light" ? "dark" : "light"),
    );
  }
  applyTheme(theme);

  // =============================================
  // Online/Offline detection
  // =============================================
  const updateOnline = () => {
    if (offlineBadge) {
      offlineBadge.classList.toggle("hidden", navigator.onLine);
    }
  };
  window.addEventListener("online", updateOnline);
  window.addEventListener("offline", updateOnline);
  updateOnline();

  // =============================================
  // Máscara CNPJ
  // =============================================
  if (cnpjInput) {
    cnpjInput.addEventListener("input", function () {
      const start = this.selectionStart;
      const rawDigits = cleanDigits(this.value);
      if (rawDigits.length === 0) {
        this.value = "";
        return;
      }
      const oldLength = this.value.length;
      this.value = formatCnpj(rawDigits);
      const newLength = this.value.length;
      let newPos = start + (newLength - oldLength);
      if (newPos < 0) newPos = 0;
      if (newPos > this.value.length) newPos = this.value.length;
      this.setSelectionRange(newPos, newPos);
    });

    cnpjInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSearch();
      }
    });
  }

  // =============================================
  // Toast
  // =============================================
  function showToast(msg, type) {
    const t = document.createElement("div");
    t.className =
      "toast " + (type === "success" ? "toast-success" : "toast-error");
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => {
      t.style.opacity = "0";
      t.style.transition = "opacity 0.3s ease";
      setTimeout(() => t.remove(), 300);
    }, 3000);
  }

  // =============================================
  // UI Helpers
  // =============================================
  function setLoading(isLoading) {
    if (loadingContainer) {
      loadingContainer.classList.toggle("hidden", !isLoading);
    }
    if (consultarBtn) {
      consultarBtn.disabled = isLoading;
      consultarBtn.textContent = isLoading ? "Consultando…" : "Consultar CNPJ";
    }
  }

  // =============================================
  // Accordion
  // =============================================
  function renderAccordion(data, level) {
    level = level || 0;

    if (data === null || data === undefined) {
      const span = document.createElement("span");
      span.className = "text-slate-500 dark:text-slate-400";
      span.textContent = "-";
      return span;
    }

    if (
      typeof data === "string" ||
      typeof data === "number" ||
      typeof data === "boolean"
    ) {
      const span = document.createElement("span");
      span.className = "text-slate-700 dark:text-slate-200";
      span.textContent = formatValue("", data);
      return span;
    }

    if (Array.isArray(data)) {
      if (data.length === 0) {
        const span = document.createElement("span");
        span.className = "text-slate-500 dark:text-slate-400";
        span.textContent = "Lista vazia";
        return span;
      }
      const wrapper = document.createElement("div");
      wrapper.className = "accordion-list space-y-2";
      data.forEach((item, i) => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "accordion-list-item";
        if (isObj(item) || Array.isArray(item)) {
          const label = document.createElement("div");
          label.className =
            "text-xs font-bold uppercase tracking-[0.12em] text-sky-600 dark:text-sky-400 mb-2";
          label.textContent = "Item " + (i + 1);
          itemDiv.appendChild(label);
          itemDiv.appendChild(renderAccordion(item, level + 1));
        } else {
          const label = document.createElement("div");
          label.className =
            "text-xs font-bold uppercase tracking-[0.12em] text-slate-400 mb-1";
          label.textContent = "Item " + (i + 1);
          const val = document.createElement("span");
          val.className = "accordion-value";
          val.textContent = formatValue("", item);
          itemDiv.appendChild(label);
          itemDiv.appendChild(val);
        }
        wrapper.appendChild(itemDiv);
      });
      return wrapper;
    }

    const container = document.createElement("div");
    container.className = "accordion-container";

    Object.keys(data).forEach((k) => {
      const v = data[k];
      const item = document.createElement("div");
      item.className = "accordion-item";

      const header = document.createElement("button");
      header.className = "accordion-header";
      header.setAttribute("aria-expanded", "false");
      header.setAttribute("type", "button");

      const labelSpan = document.createElement("span");
      labelSpan.textContent = prettyKey(k);

      const icon = document.createElement("span");
      icon.className = "accordion-icon";
      icon.textContent = "+";

      header.appendChild(labelSpan);
      header.appendChild(icon);

      const body = document.createElement("div");
      body.className = "accordion-body";

      const inner = document.createElement("div");
      inner.className = "accordion-body-inner";

      if (isObj(v) || Array.isArray(v)) {
        inner.appendChild(renderAccordion(v, level + 1));
      } else {
        const valSpan = document.createElement("span");
        valSpan.className = "accordion-value";
        valSpan.textContent = formatValue(k, v);
        inner.appendChild(valSpan);
      }

      body.appendChild(inner);
      item.appendChild(header);
      item.appendChild(body);
      container.appendChild(item);

      header.addEventListener("click", () => {
        const isOpen = item.classList.toggle("is-open");
        header.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });
    });

    return container;
  }

  // =============================================
  // Summary
  // =============================================
  const safe = (obj, fallback) => (isObj(obj) ? obj : fallback || {});
  const arr = (v) => (Array.isArray(v) ? v : []);

  function joinAvailable(values, sep) {
    sep = sep || " · ";
    const items = values.map(safeText).filter((i) => i !== "-");
    return items.length ? items.join(sep) : "-";
  }

  function formatPhone(ddd, phone) {
    const num = cleanDigits(String(phone || ""));
    const area = cleanDigits(String(ddd || ""));
    return num ? (area ? "(" + area + ") " + num : num) : "";
  }

  function getSituacaoBadge(status) {
    const s = (status || "").toLowerCase().trim();
    let cls = "situacao-badge ";
    if (s === "ativa") cls += "situacao-ativa";
    else if (s === "baixada" || s === "inapta") cls += "situacao-baixada";
    else cls += "situacao-suspensa";
    return '<span class="' + cls + '">' + safeText(status) + "</span>";
  }

  function getRegimeTributario(data) {
    const simples = safe(data.simples);
    if (typeof simples === "object" && Object.keys(simples).length > 0) {
      const s = simples.simples;
      if (s === "Sim") return "Simples Nacional";
      if (s === "Não") return "Regime Normal";
      if (simples.mei === "Sim") return "MEI - Simples Nacional";
      return "Não informado";
    }
    return "Não informado";
  }

  function makeTooltip(label, text) {
    return (
      '<span class="field-tooltip">' +
      label +
      '<span class="tooltip-icon" aria-hidden="true">?</span><span class="tooltip-text">' +
      text +
      "</span>"
    );
  }

  function makeLink(url, text) {
    return (
      '<a href="' +
      url +
      '" target="_blank" rel="noopener noreferrer" class="field-link">' +
      text +
      "</a>"
    );
  }

  function getSummaryFields(data) {
    const est = safe(data.estabelecimento);
    const city = safe(est.cidade);
    const state = safe(est.estado);
    const activity = safe(est.atividade_principal);
    const legalNature = safe(data.natureza_juridica);
    const companySize = safe(data.porte);
    const registrations = arr(est.inscricoes_estaduais)
      .map((e) => {
        const r = safe(e),
          rs = safe(r.estado);
        return joinAvailable([rs.sigla, r.inscricao_estadual], ": ");
      })
      .filter((v) => v !== "-");
    const street = joinAvailable([est.tipo_logradouro, est.logradouro], " ");
    const address = joinAvailable(
      [street, est.numero, est.complemento, est.bairro],
      ", ",
    );
    const phones = [
      formatPhone(est.ddd1, est.telefone1),
      formatPhone(est.ddd2, est.telefone2),
    ].filter(Boolean);
    const activityName = joinAvailable(
      [activity.subclasse, activity.descricao],
      " — ",
    );

    const cnpjDigits = cleanDigits(String(est.cnpj || ""));
    const cnpjStr = formatCnpj(cnpjDigits) || "-";
    const cnpjLink =
      cnpjStr !== "-"
        ? makeLink(
            "https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_Solicitacao.asp?cnpj=" +
              cnpjDigits,
            cnpjStr,
          )
        : "-";
    const addressLink =
      address !== "-"
        ? makeLink(
            "https://www.google.com/maps/search/" +
              encodeURIComponent(address.replace(/<[^>]*>/g, "") + ", Brasil"),
            address,
          )
        : "-";
    const cepStr = formatCep(String(est.cep || "")) || "-";
    const cepLink =
      cepStr !== "-"
        ? makeLink("https://www.google.com/maps/search/CEP+" + cepStr, cepStr)
        : "-";
    const regime = getRegimeTributario(data);

    return [
      { label: "CNPJ", value: cnpjLink, html: true },
      { label: "Razão social", value: safeText(data.razao_social) },
      { label: "Nome fantasia", value: safeText(est.nome_fantasia) },
      {
        label: "Situação",
        value: getSituacaoBadge(est.situacao_cadastral),
        html: true,
      },
      { label: "Endereço", value: addressLink, html: true },
      {
        label: "Cidade / UF",
        value: joinAvailable([city.nome, state.sigla], " / "),
      },
      { label: "CEP", value: cepLink, html: true },
      {
        label: makeTooltip(
          "CNAE principal",
          "Classificação Nacional de Atividades Econômicas.",
        ),
        value: activityName,
        html: true,
      },
      {
        label: "Início das atividades",
        value: formatDate(String(est.data_inicio_atividade || "")) || "-",
      },
      { label: "Telefone", value: phones.join(" · ") || "-" },
      { label: "E-mail", value: safeText(est.email) },
      {
        label: makeTooltip(
          "Inscrições estaduais",
          "Registro estadual que autoriza a empresa a emitir notas fiscais.",
        ),
        value: registrations.join(" · ") || "-",
        html: true,
      },
      {
        label: makeTooltip(
          "Regime tributário",
          "Forma de tributação da empresa: Simples Nacional ou Regime Normal.",
        ),
        value: regime,
        html: true,
      },
      {
        label: makeTooltip(
          "Porte",
          "Classificação do porte da empresa segundo a Receita Federal.",
        ),
        value: safeText(companySize.descricao),
        html: true,
      },
      {
        label: makeTooltip(
          "Natureza jurídica",
          "Classificação legal da empresa: MEI, LTDA, SA, etc.",
        ),
        value: safeText(legalNature.descricao),
        html: true,
      },
    ];
  }

  function removeSummaryDuplicates(data) {
    const details = Object.assign({}, data);
    ["razao_social", "porte", "natureza_juridica"].forEach(
      (k) => delete details[k],
    );
    const est = safe(details.estabelecimento);
    if (Object.keys(est).length > 0) {
      const cleaned = Object.assign({}, est);
      [
        "cnpj",
        "tipo",
        "nome_fantasia",
        "situacao_cadastral",
        "data_inicio_atividade",
        "tipo_logradouro",
        "logradouro",
        "numero",
        "complemento",
        "bairro",
        "cep",
        "ddd1",
        "telefone1",
        "ddd2",
        "telefone2",
        "email",
        "atividade_principal",
        "cidade",
        "estado",
        "inscricoes_estaduais",
      ].forEach((k) => delete cleaned[k]);
      if (Object.keys(cleaned).length > 0) details.estabelecimento = cleaned;
      else delete details.estabelecimento;
    }
    return details;
  }

  // =============================================
  // Render
  // =============================================
  function renderResults(data) {
    currentData = data;
    currentCnpj = cleanDigits(String(data.estabelecimento?.cnpj || ""));
    const favorites = getFavorites();
    currentFavorited = favorites.some((f) => f.digits === currentCnpj);

    if (resultsSection) {
      resultsSection.classList.remove("hidden");
      resultsSection.classList.add("fade-in");
    }

    const total = countFilled(data);
    if (fieldCounter) fieldCounter.textContent = total;
    if (statusMessage) {
      statusMessage.textContent =
        total +
        " campos preenchidos em " +
        Object.keys(data).length +
        " grupos.";
    }

    const fields = getSummaryFields(data);
    if (summaryContainer) {
      summaryContainer.innerHTML = "";
      fields.forEach((f) => {
        const div = document.createElement("div");
        div.className =
          "summary-card rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 slide-up";
        const headerRow = document.createElement("div");
        headerRow.className = "summary-header-row";
        const label = document.createElement("div");
        label.className =
          "text-xs font-bold uppercase tracking-[0.16em] text-slate-400";
        label.innerHTML = f.label;
        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.className = "summary-copy-btn";
        copyBtn.title = "Copiar valor";
        copyBtn.setAttribute("aria-label", "Copiar valor");
        copyBtn.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
        const value = document.createElement("div");
        value.className =
          "mt-3 break-words text-sm font-semibold text-slate-800 dark:text-slate-100 summary-value-clickable";
        value.title = "Clique para copiar";
        if (f.html) value.innerHTML = f.value;
        else value.textContent = f.value;
        const plainText = (
          f.html ? value.textContent : String(f.value || "")
        ).trim();
        copyBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          copyTextToClipboard(plainText);
        });
        value.addEventListener("click", function (e) {
          // Se o clique for em um link interno (ex: CNPJ, Endereço, CEP),
          // intercepta para copiar em vez de navegar
          const link = e.target.closest ? e.target.closest("a") : null;
          if (link) {
            e.preventDefault();
          }
          copyTextToClipboard(plainText);
        });
        headerRow.appendChild(label);
        headerRow.appendChild(copyBtn);
        div.appendChild(headerRow);
        div.appendChild(value);
        summaryContainer.appendChild(div);
      });
    }

    const detailData = removeSummaryDuplicates(data);
    if (detailsContainer) {
      detailsContainer.innerHTML = "";
      if (Object.keys(detailData).length > 0) {
        detailsContainer.appendChild(renderAccordion(detailData));
      } else {
        const p = document.createElement("p");
        p.className = "text-sm text-slate-500 dark:text-slate-400";
        p.textContent = "Todos os dados já foram exibidos no resumo acima.";
        detailsContainer.appendChild(p);
      }
    }

    if (printCnpj) {
      printCnpj.textContent =
        "CNPJ: " +
        formatCnpj(String(data.estabelecimento?.cnpj || "")) +
        " - " +
        safeText(data.razao_social);
    }

    updateFavoriteBtn();
    addToHistory(currentCnpj, data.razao_social);
  }

  // =============================================
  // API Call
  // =============================================
  function handleSearch() {
    const digits = cleanDigits(cnpjInput.value);
    if (resultsSection) resultsSection.classList.add("hidden");

    if (!validateCnpj(digits)) {
      showToast(
        "CNPJ inválido. Verifique os dígitos e tente novamente.",
        "error",
      );
      if (cnpjInput) cnpjInput.focus();
      return;
    }

    setLoading(true);

    const cacheKey = "ccnpj-" + digits;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setLoading(false);
        renderResults(parsed);
        showToast("Dados carregados do cache.", "success");
        return;
      } catch (e) {
        sessionStorage.removeItem(cacheKey);
      }
    }

    fetch("https://publica.cnpj.ws/cnpj/" + encodeURIComponent(digits))
      .then(function (r) {
        if (!r.ok) {
          return r.json().then(function (d) {
            throw new Error(d.erro || "Erro " + r.status);
          });
        }
        return r.json();
      })
      .then(function (d) {
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(d));
          sessionStorage.setItem("ccnpj-last", digits);
        } catch (e) {
          /* ignore */
        }
        renderResults(d);
        showToast("Consulta realizada com sucesso!", "success");
        setLoading(false);
      })
      .catch(function (err) {
        showToast(err.message || "Erro ao consultar.", "error");
        setLoading(false);
      });
  }

  // =============================================
  // Eventos
  // =============================================
  if (consultarBtn) consultarBtn.addEventListener("click", handleSearch);

  if (exportPdfBtn) {
    exportPdfBtn.addEventListener("click", () => {
      if (!currentData) {
        showToast("Faça uma consulta antes de exportar.", "error");
        return;
      }
      window.print();
    });
  }

  const favBtn = $("favorite-btn");
  if (favBtn) favBtn.addEventListener("click", toggleFavorite);

  // =============================================
  // Restaurar última consulta + renderizar listas
  // =============================================
  (function restoreLast() {
    try {
      const last = sessionStorage.getItem("ccnpj-last");
      if (last) {
        const cached = sessionStorage.getItem("ccnpj-" + last);
        if (cached) {
          const data = JSON.parse(cached);
          if (cnpjInput) cnpjInput.value = formatCnpj(last);
          renderResults(data);
        }
      }
    } catch (e) {
      /* silent */
    }
    renderHistory();
    renderFavorites();
  })();
})();
