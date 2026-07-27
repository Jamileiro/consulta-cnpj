/**
 * ConsultaCNPJ - WordPress Plugin JavaScript
 * Maacara CNPJ, validacao, consulta AJAX, renderizacao dinamica, tema
 */
(function () {
  "use strict";

  // =============================================
  // State
  // =============================================
  var currentData = null;
  var theme =
    localStorage.getItem("consulta-cnpj-wp-theme") ||
    consultaCnpjData.theme ||
    "light";

  // =============================================
  // Utility Functions
  // =============================================
  function cleanDigits(v) {
    return String(v).replace(/\D/g, "");
  }

  function formatCnpj(v) {
    var d = cleanDigits(v).slice(0, 14);
    return d
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
  }

  function validateCnpj(v) {
    var d = cleanDigits(v);
    if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;

    function calc(base, w) {
      var sum = 0;
      for (var i = 0; i < base.length; i++) {
        sum += parseInt(base[i], 10) * w[i];
      }
      var r = sum % 11;
      return r < 2 ? 0 : 11 - r;
    }

    return (
      calc(d.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) ===
        parseInt(d[12], 10) &&
      calc(d.slice(0, 12) + d[12], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) ===
        parseInt(d[13], 10)
    );
  }

  function formatCep(v) {
    return cleanDigits(v)
      .slice(0, 8)
      .replace(/(\d{5})(\d{1,3})$/, "$1-$2");
  }

  function formatMoney(v) {
    if (v === null || v === undefined || v === "") return "-";
    var amt =
      typeof v === "number"
        ? v
        : parseFloat(
            String(v)
              .replace(/[^0-9,.-]/g, "")
              .replace(",", "."),
          );
    if (isNaN(amt)) return String(v);
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 2,
    }).format(amt);
  }

  function formatDate(v) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      var parts = v.split("-");
      return parts[2] + "/" + parts[1] + "/" + parts[0];
    }
    var dig = cleanDigits(v);
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
    if (typeof v === "boolean") return v ? "Sim" : "Nao";
    return safeText(v);
  }

  function prettyKey(k) {
    return k
      .replace(/([A-Z])/g, " $1")
      .replace(/[_-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^./, function (c) {
        return c.toUpperCase();
      });
  }

  function isObj(v) {
    return v !== null && typeof v === "object";
  }

  // =============================================
  // Theme
  // =============================================
  function applyTheme(t) {
    theme = t;
    var card = document.querySelector(".consulta-cnpj-card");
    if (card) {
      card.classList.toggle("dark", t === "dark");
    }
    localStorage.setItem("consulta-cnpj-wp-theme", t);
    var btn = document.getElementById("consulta-cnpj-theme-btn");
    if (btn) {
      btn.textContent = t === "light" ? "Tema escuro" : "Tema claro";
    }
  }

  // =============================================
  // Toast
  // =============================================
  function showToast(msg, type) {
    var t = document.createElement("div");
    t.className = "consulta-cnpj-toast consulta-cnpj-toast-" + type;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () {
      t.style.opacity = "0";
      t.style.transition = "opacity 0.3s";
      setTimeout(function () {
        t.remove();
      }, 300);
    }, 3000);
  }

  // =============================================
  // Render helpers
  // =============================================
  function getSituacaoBadge(status) {
    var s = (status || "").toLowerCase().trim();
    var cls = "consulta-cnpj-badge ";
    if (s === "ativa") cls += "consulta-cnpj-badge-ativa";
    else if (s === "baixada" || s === "inapta")
      cls += "consulta-cnpj-badge-baixada";
    else cls += "consulta-cnpj-badge-suspensa";
    return '<span class="' + cls + '">' + safeText(status) + "</span>";
  }

  function makeTooltip(label, text) {
    return (
      '<span class="consulta-cnpj-tooltip">' +
      label +
      '<span class="consulta-cnpj-tooltip-icon">?</span>' +
      '<span class="consulta-cnpj-tooltip-text">' +
      text +
      "</span>"
    );
  }

  function makeLink(url, text) {
    return (
      '<a href="' +
      url +
      '" target="_blank" rel="noopener noreferrer" class="consulta-cnpj-link">' +
      text +
      "</a>"
    );
  }

  function renderAccordion(data) {
    if (data === null || data === undefined) {
      var span = document.createElement("span");
      span.className = "consulta-cnpj-value";
      span.textContent = "-";
      return span;
    }

    if (
      typeof data === "string" ||
      typeof data === "number" ||
      typeof data === "boolean"
    ) {
      var span = document.createElement("span");
      span.textContent = formatValue("", data);
      return span;
    }

    if (Array.isArray(data)) {
      if (data.length === 0) {
        var span = document.createElement("span");
        span.textContent = "Lista vazia";
        return span;
      }
      var wrapper = document.createElement("div");
      wrapper.style.paddingLeft = "1rem";
      data.forEach(function (item, i) {
        var itemDiv = document.createElement("div");
        itemDiv.style.marginBottom = "0.5rem";
        if (isObj(item) || Array.isArray(item)) {
          var label = document.createElement("div");
          label.className = "consulta-cnpj-tooltip";
          label.style.fontSize = "0.75rem";
          label.style.fontWeight = "700";
          label.style.textTransform = "uppercase";
          label.style.color = "#0ea5e9";
          label.style.marginBottom = "0.25rem";
          label.textContent = "Item " + (i + 1);
          itemDiv.appendChild(label);
          itemDiv.appendChild(renderAccordion(item));
        } else {
          var label = document.createElement("div");
          label.style.fontSize = "0.75rem";
          label.style.fontWeight = "700";
          label.style.color = "#94a3b8";
          label.textContent = "Item " + (i + 1) + ":";
          var val = document.createElement("span");
          val.textContent = " " + formatValue("", item);
          itemDiv.appendChild(label);
          itemDiv.appendChild(val);
        }
        wrapper.appendChild(itemDiv);
      });
      return wrapper;
    }

    // Objeto
    var container = document.createElement("div");
    Object.keys(data).forEach(function (k) {
      var v = data[k];
      var item = document.createElement("div");
      item.className = "consulta-cnpj-accordion-item";

      var header = document.createElement("button");
      header.className = "consulta-cnpj-accordion-header";
      header.setAttribute("type", "button");
      header.innerHTML =
        "<span>" +
        prettyKey(k) +
        '</span><span class="consulta-cnpj-accordion-icon">+</span>';

      var body = document.createElement("div");
      body.className = "consulta-cnpj-accordion-body";

      var content = document.createElement("div");
      content.className = "consulta-cnpj-accordion-content";

      if (isObj(v) || Array.isArray(v)) {
        content.appendChild(renderAccordion(v));
      } else {
        content.textContent = formatValue(k, v);
      }

      body.appendChild(content);
      item.appendChild(header);
      item.appendChild(body);
      container.appendChild(item);

      header.addEventListener("click", function () {
        var isOpen = item.classList.toggle("open");
        this.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });
    });
    return container;
  }

  // =============================================
  // Fetch and render
  // =============================================
  function handleSearch() {
    var input = document.getElementById("consulta-cnpj-input");
    var digits = cleanDigits(input.value);

    if (!validateCnpj(digits)) {
      showToast("CNPJ invalido. Verifique os digitos.", "error");
      input.focus();
      return;
    }

    var loading = document.getElementById("consulta-cnpj-loading");
    var btn = document.getElementById("consulta-cnpj-btn");
    var results = document.getElementById("consulta-cnpj-results");

    loading.classList.add("active");
    btn.disabled = true;
    btn.textContent = "Consultando...";
    if (results) results.classList.remove("active");

    var data = new FormData();
    data.append("action", "consulta_cnpj");
    data.append("cnpj", digits);
    data.append("nonce", consultaCnpjData.nonce);

    fetch(consultaCnpjData.ajaxUrl, {
      method: "POST",
      body: data,
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (res) {
        if (!res.success) {
          throw new Error(res.data.erro || "Erro ao consultar.");
        }
        renderResults(res.data);
        showToast("Consulta realizada!", "success");
      })
      .catch(function (err) {
        showToast(err.message || "Erro ao consultar.", "error");
      })
      .finally(function () {
        loading.classList.remove("active");
        btn.disabled = false;
        btn.textContent = "Consultar CNPJ";
      });
  }

  function renderResults(data) {
    currentData = data;
    var results = document.getElementById("consulta-cnpj-results");
    results.classList.add("active");

    // Contador
    var count = 0;
    for (var k in data) {
      if (!Object.prototype.hasOwnProperty.call(data, k)) continue;
      var v = data[k];
      if (v === null || v === undefined || v === "") continue;
      if (Array.isArray(v) && v.length === 0) continue;
      if (
        typeof v === "object" &&
        !Array.isArray(v) &&
        Object.keys(v).length === 0
      )
        continue;
      count++;
    }
    document.getElementById("consulta-cnpj-counter").textContent = count;
    document.getElementById("consulta-cnpj-status").textContent =
      count + " campos preenchidos.";

    // Summary
    var summary = document.getElementById("consulta-cnpj-summary");
    summary.innerHTML = "";

    var est = isObj(data.estabelecimento) ? data.estabelecimento : {};
    var city = isObj(est.cidade) ? est.cidade : {};
    var state = isObj(est.estado) ? est.estado : {};
    var activity = isObj(est.atividade_principal)
      ? est.atividade_principal
      : {};

    function joinAvail(arr, sep) {
      sep = sep || " - ";
      var items = arr.map(safeText).filter(function (i) {
        return i !== "-";
      });
      return items.length ? items.join(sep) : "-";
    }

    function fmtPhone(ddd, phone) {
      var n = cleanDigits(String(phone || ""));
      var a = cleanDigits(String(ddd || ""));
      return n ? (a ? "(" + a + ") " + n : n) : "";
    }

    var registrations = [];
    if (Array.isArray(est.inscricoes_estaduais)) {
      registrations = est.inscricoes_estaduais
        .map(function (e) {
          var r = isObj(e) ? e : {};
          var rs = isObj(r.estado) ? r.estado : {};
          return joinAvail([rs.sigla, r.inscricao_estadual], ": ");
        })
        .filter(function (v) {
          return v !== "-";
        });
    }

    var street = joinAvail([est.tipo_logradouro, est.logradouro], " ");
    var address = joinAvail(
      [street, est.numero, est.complemento, est.bairro],
      ", ",
    );
    var phones = [
      fmtPhone(est.ddd1, est.telefone1),
      fmtPhone(est.ddd2, est.telefone2),
    ].filter(Boolean);
    var activityName = joinAvail(
      [activity.subclasse, activity.descricao],
      " - ",
    );

    var cnpjDigits = cleanDigits(String(est.cnpj || ""));
    var cnpjStr = formatCnpj(cnpjDigits) || "-";

    var fields = [
      {
        label: "CNPJ",
        value:
          cnpjStr !== "-"
            ? makeLink(
                "https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_Solicitacao.asp?cnpj=" +
                  cnpjDigits,
                cnpjStr,
              )
            : "-",
        html: true,
      },
      { label: "Razao social", value: safeText(data.razao_social) },
      { label: "Nome fantasia", value: safeText(est.nome_fantasia) },
      {
        label: "Situacao",
        value: getSituacaoBadge(est.situacao_cadastral),
        html: true,
      },
      {
        label: "Endereco",
        value:
          address !== "-"
            ? makeLink(
                "https://www.google.com/maps/search/" +
                  encodeURIComponent(address + ", Brasil"),
                address,
              )
            : "-",
        html: true,
      },
      {
        label: "Cidade / UF",
        value: joinAvail([city.nome, state.sigla], " / "),
      },
      { label: "CEP", value: formatCep(String(est.cep || "")) || "-" },
      { label: "CNAE principal", value: activityName },
      {
        label: "Inicio atividades",
        value: formatDate(String(est.data_inicio_atividade || "")) || "-",
      },
      { label: "Telefone", value: phones.join(" | ") || "-" },
      { label: "E-mail", value: safeText(est.email) },
      {
        label: "Inscricoes estaduais",
        value: registrations.join(" | ") || "-",
      },
    ];

    fields.forEach(function (f) {
      var div = document.createElement("div");
      div.className = "consulta-cnpj-summary-card";
      var label = document.createElement("div");
      label.className = "consulta-cnpj-summary-label";
      label.textContent = f.label;
      var value = document.createElement("div");
      value.className = "consulta-cnpj-summary-value";
      if (f.html) {
        value.innerHTML = f.value;
      } else {
        value.textContent = f.value;
      }
      div.appendChild(label);
      div.appendChild(value);
      summary.appendChild(div);
    });

    // Detalhes dinamicoss
    var detailContainer = document.getElementById(
      "consulta-cnpj-details-content",
    );
    detailContainer.innerHTML = "";
    detailContainer.appendChild(renderAccordion(data));

    // JSON Raw
    document.getElementById("consulta-cnpj-raw").textContent = JSON.stringify(
      data,
      null,
      2,
    );
  }

  // =============================================
  // Init
  // =============================================
  document.addEventListener("DOMContentLoaded", function () {
    applyTheme(theme);

    var input = document.getElementById("consulta-cnpj-input");
    if (input) {
      input.addEventListener("input", function () {
        this.value = formatCnpj(cleanDigits(this.value));
      });
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          handleSearch();
        }
      });
    }

    var btn = document.getElementById("consulta-cnpj-btn");
    if (btn) {
      btn.addEventListener("click", handleSearch);
    }

    var themeBtn = document.getElementById("consulta-cnpj-theme-btn");
    if (themeBtn) {
      themeBtn.addEventListener("click", function () {
        applyTheme(theme === "light" ? "dark" : "light");
      });
    }

    var toggleJsonBtn = document.getElementById("consulta-cnpj-toggle-json");
    if (toggleJsonBtn) {
      toggleJsonBtn.addEventListener("click", function () {
        var raw = document.getElementById("consulta-cnpj-raw");
        var isActive = raw.classList.toggle("active");
        this.textContent = isActive ? "Ocultar JSON" : "Ver JSON bruto";
      });
    }

    var copyBtn = document.getElementById("consulta-cnpj-copy-json");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var text = document.getElementById("consulta-cnpj-raw").textContent;
        if (!text) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            showToast("JSON copiado!", "success");
          });
        } else {
          var ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          showToast("JSON copiado!", "success");
        }
      });
    }
  });
})();
