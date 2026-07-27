<?php
/**
 * Template para o shortcode [consulta_cnpj]
 * Seguranca: todas as saídas sao escapadas com esc_attr() e esc_html()
 *
 * @package ConsultaCNPJ
 */

// Seguranca: evitar acesso direto
if (!defined('ABSPATH')) {
    exit;
}

$title = isset($atts['title']) ? esc_html($atts['title']) : 'Consulta CNPJ';
$description = isset($atts['description']) ? esc_html($atts['description']) : 'Verifique qualquer empresa com poucos cliques';
?>

<div class="consulta-cnpj-wrapper">
    <div class="consulta-cnpj-card">
        <div class="consulta-cnpj-header">
            <h2 class="consulta-cnpj-title"><?php echo $title; ?></h2>
            <p class="consulta-cnpj-desc"><?php echo $description; ?></p>
        </div>

        <div class="consulta-cnpj-grid">
            <!-- Formulario -->
            <div class="consulta-cnpj-input-group">
                <label class="consulta-cnpj-label" for="consulta-cnpj-input">
                    CNPJ
                </label>
                <input
                    type="text"
                    id="consulta-cnpj-input"
                    class="consulta-cnpj-input"
                    placeholder="<?php echo esc_attr(get_option('consulta_cnpj_placeholder', 'Ex: 00.000.000/0000-00')); ?>"
                    maxlength="18"
                    autocomplete="off"
                    inputmode="numeric"
                />
                <button type="button" id="consulta-cnpj-btn" class="consulta-cnpj-btn">
                    Consultar CNPJ
                </button>

                <!-- Loading -->
                <div id="consulta-cnpj-loading" class="consulta-cnpj-loading">
                    <div class="consulta-cnpj-spinner"></div>
                    <div>
                        <strong>Consultando CNPJ...</strong>
                        <br />
                        <small>Aguarde enquanto buscamos os dados.</small>
                    </div>

                <div class="consulta-cnpj-info-grid">
                    <div class="consulta-cnpj-info-item">
                        <div class="consulta-cnpj-info-label">Formato</div>
                        <div class="consulta-cnpj-info-value" id="consulta-cnpj-formatted">00.000.000/0000-00</div>
                    <div class="consulta-cnpj-info-item">
                        <div class="consulta-cnpj-info-label">Somente numeros</div>
                        <div class="consulta-cnpj-info-value" id="consulta-cnpj-digits">00000000000000</div>
                </div>

            <!-- Sidebar -->
            <div class="consulta-cnpj-sidebar">
                <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;">
                    Campos preenchidos
                </div>
                <div class="consulta-cnpj-counter" id="consulta-cnpj-counter">0</div>
                <p style="font-size:0.875rem;color:#64748b;margin:0;" id="consulta-cnpj-status">
                    Inclui listas, objetos e valores simples retornados pela API.
                </p>
                <div style="margin-top:1rem;display:flex;gap:0.5rem;">
                    <button type="button" id="consulta-cnpj-theme-btn" class="consulta-cnpj-theme-btn">
                        <?php echo get_option('consulta_cnpj_theme', 'light') === 'dark' ? 'Tema claro' : 'Tema escuro'; ?>
                    </button>
                </div>
        </div>

        <!-- Resultados -->
        <div id="consulta-cnpj-results" class="consulta-cnpj-results">
            <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:0.5rem;margin-bottom:0.5rem;">
                <div>
                    <h3 style="font-size:1.25rem;font-weight:600;margin:0;">Resumo da empresa</h3>
                    <p style="font-size:0.875rem;color:#64748b;margin:0.25rem 0 0;">
                        Informacoes principais do CNPJ consultado.
                    </p>
                </div>
                <div class="consulta-cnpj-actions">
                    <button type="button" id="consulta-cnpj-toggle-json" class="consulta-cnpj-btn-secondary">
                        Ver JSON bruto
                    </button>
                    <button type="button" id="consulta-cnpj-copy-json" class="consulta-cnpj-btn-primary">
                        Copiar JSON
                    </button>
                </div>

            <div id="consulta-cnpj-summary" class="consulta-cnpj-summary-grid"></div>

            <pre id="consulta-cnpj-raw" class="consulta-cnpj-raw"></pre>

            <div class="consulta-cnpj-details">
                <h3 class="consulta-cnpj-details-title">Detalhes dinamicos</h3>
                <p class="consulta-cnpj-details-desc">
                    Todos os campos, objetos e listas retornados pela API.
                </p>
                <div id="consulta-cnpj-details-content"></div>
        </div>
</div>
