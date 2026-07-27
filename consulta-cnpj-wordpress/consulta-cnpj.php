<?php
/**
 * Plugin Name: Consulta CNPJ
 * Plugin URI: https://github.com/seu-usuario/consulta-cnpj
 * Description: Plugin WordPress para consulta de CNPJ via API pública. Use o shortcode [consulta_cnpj] para exibir o formulário em qualquer página.
 * Version: 1.0.0
 * Author: ConsultaCNPJ
 * License: MIT
 * Text Domain: consulta-cnpj
 */

// Segurança: evitar acesso direto
if (!defined('ABSPATH')) {
    exit;
}

define('CONSULTA_CNPJ_VERSION', '1.0.0');
define('CONSULTA_CNPJ_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('CONSULTA_CNPJ_PLUGIN_URL', plugin_dir_url(__FILE__));

// =============================================
// Classe principal do plugin
// =============================================
class ConsultaCNPJ_Plugin {

    private static $instance = null;

    public static function get_instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action('init', array($this, 'init'));
        add_shortcode('consulta_cnpj', array($this, 'render_shortcode'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_assets'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));

        // AJAX handler para consulta de CNPJ
        add_action('wp_ajax_consulta_cnpj', array($this, 'ajax_consultar_cnpj'));
        add_action('wp_ajax_nopriv_consulta_cnpj', array($this, 'ajax_consultar_cnpj'));
    }

    public function init() {
        // Criação de página automática (opcional)
        $this->maybe_create_page();
    }

    /**
     * Registra os assets (CSS e JS)
     */
    public function enqueue_assets() {
        global $post;

        // Só carrega se a página tiver o shortcode
        if (is_a($post, 'WP_Post') && has_shortcode($post->post_content, 'consulta_cnpj')) {
            wp_enqueue_style(
                'consulta-cnpj-style',
                CONSULTA_CNPJ_PLUGIN_URL . 'assets/style.css',
                array(),
                CONSULTA_CNPJ_VERSION
            );

            wp_enqueue_script(
                'consulta-cnpj-script',
                CONSULTA_CNPJ_PLUGIN_URL . 'assets/app.js',
                array(),
                CONSULTA_CNPJ_VERSION,
                true
            );

            // Passa variáveis para o JS
            wp_localize_script('consulta-cnpj-script', 'consultaCnpjData', array(
                'ajaxUrl' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('consulta_cnpj_nonce'),
                'placeholder' => get_option('consulta_cnpj_placeholder', 'Ex: 19.131.243/0001-97'),
                'theme' => get_option('consulta_cnpj_theme', 'light'),
            ));
        }
    }

    /**
     * Renderiza o shortcode [consulta_cnpj]
     */
    public function render_shortcode($atts, $content = null) {
        $atts = shortcode_atts(array(
            'title' => 'Consulta CNPJ',
            'description' => 'Verifique qualquer empresa com poucos cliques',
        ), $atts);

        ob_start();
        include CONSULTA_CNPJ_PLUGIN_DIR . 'templates/frontend.php';
        return ob_get_clean();
    }

    /**
     * AJAX: consulta CNPJ via API pública
     */
    public function ajax_consultar_cnpj() {
        // Verifica nonce
        if (!wp_verify_nonce($_POST['nonce'], 'consulta_cnpj_nonce')) {
            wp_send_json_error(array('erro' => 'Erro de segurança. Recarregue a página.'));
        }

        $cnpj = sanitize_text_field($_POST['cnpj']);
        $digits = preg_replace('/[^0-9]/', '', $cnpj);

        if (strlen($digits) !== 14) {
            wp_send_json_error(array('erro' => 'CNPJ deve conter exatamente 14 dígitos.'));
        }

        // Cache transiente (1 hora)
        $cache_key = 'consulta_cnpj_' . $digits;
        $cached = get_transient($cache_key);
        if ($cached !== false) {
            wp_send_json_success($cached);
        }

        $api_url = 'https://publica.cnpj.ws/cnpj/' . urlencode($digits);

        $response = wp_remote_get($api_url, array(
            'headers' => array(
                'Accept' => 'application/json',
                'User-Agent' => 'ConsultaCNPJ-WordPress/1.0',
            ),
            'timeout' => 25,
            'httpversion' => '1.1',
        ));

        if (is_wp_error($response)) {
            $error_message = $response->get_error_message();
            if (strpos($error_message, 'timed out') !== false) {
                wp_send_json_error(array('erro' => 'A consulta demorou demais. Tente novamente.'));
            }
            wp_send_json_error(array('erro' => 'Erro de conexão: ' . $error_message));
        }

        $status_code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        if ($status_code !== 200 || !$data) {
            $mensagem = isset($data['message']) ? $data['message'] : (isset($data['erro']) ? $data['erro'] : 'Erro ' . $status_code . ' ao consultar.');
            wp_send_json_error(array('erro' => $mensagem));
        }

        // Cache por 1 hora
        set_transient($cache_key, $data, HOUR_IN_SECONDS);

        wp_send_json_success($data);
    }

    /**
     * Adiciona página de configurações no admin
     */
    public function add_admin_menu() {
        add_options_page(
            'Consulta CNPJ',
            'Consulta CNPJ',
            'manage_options',
            'consulta-cnpj',
            array($this, 'render_admin_page')
        );
    }

    /**
     * Registra as configurações
     */
    public function register_settings() {
        register_setting('consulta_cnpj_settings', 'consulta_cnpj_placeholder');
        register_setting('consulta_cnpj_settings', 'consulta_cnpj_theme');
        register_setting('consulta_cnpj_settings', 'consulta_cnpj_page_id');
    }

    /**
     * Renderiza página de configurações
     */
    public function render_admin_page() {
        ?>
        <div class="wrap">
            <h1>Consulta CNPJ - Configurações</h1>
            <form method="post" action="options.php">
                <?php settings_fields('consulta_cnpj_settings'); ?>
                <table class="form-table">
                    <tr>
                        <th scope="row">Placeholder do campo</th>
                        <td>
                            <input type="text" name="consulta_cnpj_placeholder" 
                                   value="<?php echo esc_attr(get_option('consulta_cnpj_placeholder', 'Ex: 19.131.243/0001-97')); ?>" 
                                   class="regular-text" />
                            <p class="description">Texto exibido dentro do campo de CNPJ antes do usuário digitar.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Tema padrão</th>
                        <td>
                            <select name="consulta_cnpj_theme">
                                <option value="light" <?php selected(get_option('consulta_cnpj_theme', 'light'), 'light'); ?>>Claro</option>
                                <option value="dark" <?php selected(get_option('consulta_cnpj_theme', 'light'), 'dark'); ?>>Escuro</option>
                            </select>
                            <p class="description">Tema inicial. O usuário pode alternar no frontend.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Shortcode</th>
                        <td>
                            <code>[consulta_cnpj]</code>
                            <p class="description">Use este shortcode em qualquer página ou post.</p>
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>

            <hr />

            <h2>Cache ativo</h2>
            <?php
            global $wpdb;
            $cache_count = $wpdb->get_var(
                "SELECT COUNT(*) FROM {$wpdb->options} WHERE option_name LIKE '_transient_consulta_cnpj_%'"
            );
            echo '<p>' . intval($cache_count) . ' CNPJs em cache (expira em 1 hora).</p>';
            ?>
        </div>
        <?php
    }

    /**
     * Cria página automática na ativação
     */
    private function maybe_create_page() {
        $page_id = get_option('consulta_cnpj_page_id');
        if ($page_id && get_post_status($page_id) === 'publish') {
            return;
        }

        $page_data = array(
            'post_title' => 'Consulta CNPJ',
            'post_content' => '[consulta_cnpj]',
            'post_status' => 'publish',
            'post_type' => 'page',
            'comment_status' => 'closed',
        );

        $new_page_id = wp_insert_post($page_data);
        if (!is_wp_error($new_page_id)) {
            update_option('consulta_cnpj_page_id', $new_page_id);
        }
    }
}

// Inicializa o plugin
ConsultaCNPJ_Plugin::get_instance();
