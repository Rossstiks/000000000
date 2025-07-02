<?php
/*
Plugin Name: WP Legal Assistant
Description: Legal assistant prototype using WordPress REST API.
Version: 0.1
*/

if (!defined('ABSPATH')) {
    exit;
}

class WPLegalAssistant {
    private $upload_dir;
    private $db_file;

    public function __construct() {
        $upload = wp_upload_dir();
        $this->upload_dir = trailingslashit($upload['basedir']) . 'legal-assistant';
        if (!file_exists($this->upload_dir)) {
            wp_mkdir_p($this->upload_dir);
        }
        $this->db_file = plugin_dir_path(__FILE__) . 'plugin_data.json';
        if (!file_exists($this->db_file)) {
            file_put_contents($this->db_file, json_encode(['pages' => [], 'sessions' => []], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        }
        add_action('rest_api_init', [$this, 'register_routes']);
        add_shortcode('legal_assistant', [$this, 'render_shortcode']);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_scripts']);
    }

    private function load_db() {
        return json_decode(file_get_contents($this->db_file), true);
    }

    private function save_db($db) {
        file_put_contents($this->db_file, json_encode($db, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    public function register_routes() {
        register_rest_route('legal-assistant/v1', '/pages', [
            'methods' => 'GET',
            'callback' => [$this, 'get_pages'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route('legal-assistant/v1', '/analyze', [
            'methods' => 'POST',
            'callback' => [$this, 'analyze'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route('legal-assistant/v1', '/files', [
            'methods' => 'GET',
            'callback' => [$this, 'list_files'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route('legal-assistant/v1', '/sessions', [
            'methods' => 'GET',
            'callback' => [$this, 'list_sessions'],
            'permission_callback' => '__return_true',
        ]);
    }

    public function render_shortcode() {
        return '<div id="legal-assistant-app"></div>';
    }

    public function enqueue_scripts() {
        global $post;
        if (!$post || !has_shortcode($post->post_content, "legal_assistant")) {
            return;
        }
        wp_enqueue_script('legal-assistant-app', plugins_url('public/app.js', __FILE__), ['wp-element'], null, true);
        $upload = wp_upload_dir();
        wp_localize_script('legal-assistant-app', 'LegalAssistantConfig', [
            'restUrl' => rest_url('legal-assistant/v1'),
            'uploadsUrl' => trailingslashit($upload['baseurl']) . 'legal-assistant'
        ]);
    }

    public function get_pages($request) {
        $db = $this->load_db();
        $id = $request->get_param('id');
        if ($id) {
            foreach ($db['pages'] as $p) {
                if ($p['id'] === $id) {
                    return ['page' => $p];
                }
            }
            return new WP_Error('not_found', 'Not found', ['status' => 404]);
        }
        $list = array_map(function ($p) { return ['id' => $p['id'], 'title' => $p['title']]; }, $db['pages']);
        return ['pages' => $list];
    }

    private function fake_gemini_response($text) {
        $words = preg_split('/\s+/', trim($text));
        $tags = array_slice(array_filter($words), 0, 3);
        $ai_response = 'Gemini AI ответ на запрос: ' . $text;
        return [$tags, $ai_response];
    }

    private function fake_extract_data($content) {
        preg_match('/ФИО[:\s]+([\w\s]+)/iu', $content, $name);
        preg_match('/(\d{2}\.\d{2}\.\d{4})/', $content, $date);
        return [
            'name' => $name ? trim($name[1]) : null,
            'date' => $date ? $date[1] : null,
        ];
    }

    public function analyze($request) {
        $text = $request->get_param('text') ?: '';
        $type = $request->get_param('type') ?: '';
        [$tags, $ai_response] = $this->fake_gemini_response($text);

        $file_info = null;
        $extracted = null;
        if (!empty($_FILES['file']['tmp_name'])) {
            $name = time() . '-' . sanitize_file_name($_FILES['file']['name']);
            $dest = $this->upload_dir . '/' . $name;
            if (move_uploaded_file($_FILES['file']['tmp_name'], $dest)) {
                $file_info = ['filename' => $name, 'originalname' => $_FILES['file']['name']];
                $content = file_get_contents($dest);
                $extracted = $this->fake_extract_data($content);
            }
        }

        $db = $this->load_db();
        $found = array_filter($db['pages'], function ($p) use ($tags, $text, $type) {
            if ($type && strpos($p['id'], $type) !== 0) return false;
            $tag_match = count(array_intersect($p['tags'], $tags)) > 0;
            $words = preg_split('/\s+/', mb_strtolower($text));
            $content_match = false;
            foreach ($words as $w) {
                if ($w && mb_stripos($p['content'], $w) !== false) { $content_match = true; break; }
            }
            return $tag_match || $content_match;
        });

        $session = [
            'id' => wp_generate_uuid4(),
            'createdAt' => current_time('c'),
            'text' => $text,
            'type' => $type,
            'tags' => $tags,
            'aiResponse' => $ai_response,
            'pages' => array_column($found, 'id'),
            'file' => $file_info,
            'extracted' => $extracted,
        ];
        $db['sessions'][] = $session;
        $this->save_db($db);

        return [
            'tags' => $tags,
            'aiResponse' => $ai_response,
            'pages' => array_values($found),
            'file' => $file_info,
            'extracted' => $extracted,
        ];
    }

    public function list_files() {
        $files = [];
        if (is_dir($this->upload_dir)) {
            $files = array_values(array_diff(scandir($this->upload_dir), ['.', '..']));
        }
        return ['files' => $files];
    }

    public function list_sessions() {
        $db = $this->load_db();
        return ['sessions' => $db['sessions']];
    }
}

new WPLegalAssistant();
