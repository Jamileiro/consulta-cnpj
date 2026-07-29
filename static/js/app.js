/**
 * ConsultaCNPJ - Frontend JavaScript
 * Máscara CNPJ, validação, consulta API, acordeão dinâmico, tema, export PDF
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
  const serverStatus = $("server-status");
  const startServerBtn = $("start-server-btn");

  // =============================================
  // State
  // =============================================
  let currentData = null;
  let theme = localStorage.getItem("consulta-cnpj-theme") || "light";

  // =============================================
  // Utility Functions
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
    if (typeof v === "boolean") return v ? "Sim" : "N\u00e3o";
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
  // Theme
  // =============================================
  function applyTheme(t) {
    theme = t;
    document.documentElement.classList.toggle("dark", t === "dark");
    localStorage.setItem("consulta-cnpj-theme", t);
    themeToggle.textContent =
      t === "light" ? "Usar tema escuro" : "Usar tema claro";
    themeToggle.setAttribute(
      "aria-label",
      t === "light" ? "Ativar tema escuro" : "Ativar tema claro",
    );
  }
  themeToggle.addEventListener("click", () =>
    applyTheme(theme === "light" ? "dark" : "light"),
  );
  applyTheme(theme);

  // =============================================
  // Online/Offline detection
  // =============================================
  const updateOnline = () =>
    offlineBadge.classList.toggle("hidden", navigator.onLine);
  window.addEventListener("online", updateOnline);
  window.addEventListener("offline", updateOnline);
  updateOnline();

  // =============================================
  // CNPJ Input Mask (corrigido: preserva cursor)
  // =============================================
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

  // =============================================
  // Toast notifications
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
    loadingContainer.classList.toggle("hidden", !isLoading);
    consultarBtn.disabled = isLoading;
    consultarBtn.textContent = isLoading
      ? "Consultando\u2026"
      : "Consultar CNPJ";
  }

  // =============================================
  // API Base URL detection
  // =============================================
  function getApiBase() {
    var port = parseInt(window.location.port);
    if (!isNaN(port) && port >= 5500 && port <= 5510) {
      // Está no Live Server: API em porta 5000
      return (
        window.location.protocol + "//" + window.location.hostname + ":5000"
      );
    }
    // Já está no servidor Python (porta 5000)
    return "";
  }

  function checkServerStatus() {
    var base = getApiBase();
    // Se está no Python direto, não precisa do aviso
    if (!base) {
      if (serverStatus) serverStatus.classList.add("hidden");
      return;
    }
    // Verifica se o servidor Python está online
    fetch(base + "/api/consultar/00000000000000", {
      method: "GET",
      mode: "cors",
      cache: "no-store",
    })
      .then(function () {
        if (serverStatus) serverStatus.classList.add("hidden");
      })
      .catch(function () {
        if (serverStatus) serverStatus.classList.remove("hidden");
        setTimeout(checkServerStatus, 5000);
      });
  }

  // Botão para iniciar servidor Python (tenta conectar até dar certo)
  if (startServerBtn) {
    startServerBtn.addEventListener("click", function () {
      startServerBtn.textContent = "Aguardando...";
      startServerBtn.disabled = true;

      var attempts = 0;
      var interval = setInterval(function () {
        attempts++;
        var base = getApiBase();
        if (!base) {
          clearInterval(interval);
          startServerBtn.textContent = "Conectado!";
          if (serverStatus) serverStatus.classList.add("hidden");
          showToast("Servidor Python conectado!", "success");
          return;
        }
        fetch(base + "/api/consultar/00000000000000", {
          method: "GET",
          mode: "cors",
          cache: "no-store",
        })
          .then(function () {
            clearInterval(interval);
            startServerBtn.textContent = "Conectado!";
            if (serverStatus) serverStatus.classList.add("hidden");
            showToast("Servidor Python conectado!", "success");
          })
          .catch(function () {
            if (attempts >= 15) {
              clearInterval(interval);
              startServerBtn.textContent = "Iniciar Servidor Python";
              startServerBtn.disabled = false;
              showToast("Execute 'python app.py' manualmente.", "error");
            }
          });
      }, 2000);
    });
  }

  // =============================================
  // Accordion Renderer (recursive)
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
      wrapper.className = "space-y-2";

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
  // Summary Helpers
  // =============================================
  const safe = (obj, fallback) => (isObj(obj) ? obj : fallback || {});
  const arr = (v) => (Array.isArray(v) ? v : []);

  function joinAvailable(values, sep) {
    sep = sep || " \u00b7 ";
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
      if (s === "N\u00e3o") return "Regime Normal";
      if (simples.mei === "Sim") return "MEI - Simples Nacional";
      return "N\u00e3o informado";
    }
    return "N\u00e3o informado";
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
      " \u2014 ",
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
      { label: "Raz\u00e3o social", value: safeText(data.razao_social) },
      { label: "Nome fantasia", value: safeText(est.nome_fantasia) },
      {
        label: "Situa\u00e7\u00e3o",
        value: getSituacaoBadge(est.situacao_cadastral),
        html: true,
      },
      { label: "Endere\u00e7o", value: addressLink, html: true },
      {
        label: "Cidade / UF",
        value: joinAvailable([city.nome, state.sigla], " / "),
      },
      { label: "CEP", value: cepLink, html: true },
      {
        label: makeTooltip(
          "CNAE principal",
          "Classifica\u00e7\u00e3o Nacional de Atividades Econ\u00f4micas.",
        ),
        value: activityName,
        html: true,
      },
      {
        label: "In\u00edcio das atividades",
        value: formatDate(String(est.data_inicio_atividade || "")) || "-",
      },
      { label: "Telefone", value: phones.join(" \u00b7 ") || "-" },
      { label: "E-mail", value: safeText(est.email) },
      {
        label: makeTooltip(
          "Inscri\u00e7\u00f5es estaduais",
          "Registro estadual que autoriza a empresa a emitir notas fiscais.",
        ),
        value: registrations.join(" \u00b7 ") || "-",
        html: true,
      },
      {
        label: makeTooltip(
          "Regime tribut\u00e1rio",
          "Forma de tributa\u00e7\u00e3o da empresa: Simples Nacional ou Regime Normal.",
        ),
        value: regime,
        html: true,
      },
      {
        label: makeTooltip(
          "Porte",
          "Classifica\u00e7\u00e3o do porte da empresa segundo a Receita Federal.",
        ),
        value: safeText(companySize.descricao),
        html: true,
      },
      {
        label: makeTooltip(
          "Natureza jur\u00eddica",
          "Classifica\u00e7\u00e3o legal da empresa: MEI, LTDA, SA, etc.",
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
  // Render Results
  // =============================================
  function renderResults(data) {
    currentData = data;
    resultsSection.classList.remove("hidden");
    resultsSection.classList.add("fade-in");

    const total = countFilled(data);
    fieldCounter.textContent = total;
    statusMessage.textContent =
      total + " campos preenchidos em " + Object.keys(data).length + " grupos.";

    const fields = getSummaryFields(data);
    summaryContainer.innerHTML = "";
    fields.forEach((f) => {
      const div = document.createElement("div");
      div.className =
        "summary-card rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 slide-up";
      const label = document.createElement("div");
      label.className =
        "text-xs font-bold uppercase tracking-[0.16em] text-slate-400";
      label.innerHTML = f.label;
      const value = document.createElement("div");
      value.className =
        "mt-3 break-words text-sm font-semibold text-slate-800 dark:text-slate-100";
      if (f.html) {
        value.innerHTML = f.value;
      } else {
        value.textContent = f.value;
      }
      div.appendChild(label);
      div.appendChild(value);
      summaryContainer.appendChild(div);
    });

    const detailData = removeSummaryDuplicates(data);
    detailsContainer.innerHTML = "";
    if (Object.keys(detailData).length > 0) {
      detailsContainer.appendChild(renderAccordion(detailData));
    } else {
      const p = document.createElement("p");
      p.className = "text-sm text-slate-500 dark:text-slate-400";
      p.textContent = "Todos os dados j\u00e1 foram exibidos no resumo acima.";
      detailsContainer.appendChild(p);
    }

    printCnpj.textContent =
      "CNPJ: " +
      formatCnpj(String(data.estabelecimento?.cnpj || "")) +
      " - " +
      safeText(data.razao_social);
  }

  // =============================================
  // API Call
  // =============================================
  function handleSearch() {
    const digits = cleanDigits(cnpjInput.value);
    resultsSection.classList.add("hidden");

    if (!validateCnpj(digits)) {
      showToast(
        "CNPJ inv\u00e1lido. Verifique os d\u00edgitos e tente novamente.",
        "error",
      );
      cnpjInput.focus();
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

    var apiBase = getApiBase();
    var apiUrl = apiBase + "/api/consultar/" + encodeURIComponent(digits);

    fetch(apiUrl, { mode: "cors" })
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
        var msg = err.message || "Erro ao consultar.";
        if (
          msg === "Failed to fetch" ||
          msg.indexOf("NetworkError") !== -1 ||
          msg.indexOf("Failed") !== -1
        ) {
          showToast(
            "Servidor Python n\u00e3o encontrado. Clique no aviso amarelo para inici\u00e1-lo.",
            "error",
          );
          if (serverStatus) serverStatus.classList.remove("hidden");
        } else {
          showToast(msg, "error");
        }
        setLoading(false);
      });
  }

  // =============================================
  // Event Listeners
  // =============================================
  consultarBtn.addEventListener("click", handleSearch);

  exportPdfBtn.addEventListener("click", () => {
    if (!currentData) {
      showToast("Fa\u00e7a uma consulta antes de exportar.", "error");
      return;
    }
    window.print();
  });

  // =============================================
  // Restore last search
  // =============================================
  (function restoreLast() {
    try {
      const last = sessionStorage.getItem("ccnpj-last");
      if (last) {
        const cached = sessionStorage.getItem("ccnpj-" + last);
        if (cached) {
          const data = JSON.parse(cached);
          cnpjInput.value = formatCnpj(last);
          renderResults(data);
        }
      }
    } catch (e) {
      /* silent */
    }
  })();

  // Verifica status do servidor ao carregar
  setTimeout(checkServerStatus, 1000);
})();
