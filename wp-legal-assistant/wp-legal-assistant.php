<?php
/*
Plugin Name: WP Legal Assistant
Description: Prototype plugin integrating Gemini AI to assist with legal document handling.
Version: 0.1
*/

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly
}

// Register custom post type for templates
function wpla_register_post_type() {
    register_post_type( 'legal_template', array(
        'labels' => array(
            'name' => 'Legal Templates',
            'singular_name' => 'Legal Template',
        ),
        'public' => true,
        'has_archive' => true,
    ));
}
add_action( 'init', 'wpla_register_post_type' );

// Fake Gemini AI integration
function wpla_fake_gemini( $text ) {
    $words = preg_split( '/\s+/', trim( $text ) );
    $tags = array_slice( $words, 0, 3 );
    $response = 'Gemini AI ответ на запрос: ' . $text;
    return array( $tags, $response );
}

// REST endpoint for analysis
function wpla_register_rest() {
    register_rest_route( 'wpla/v1', '/analyze', array(
        'methods' => 'POST',
        'callback' => 'wpla_handle_analyze',
        'permission_callback' => '__return_true',
    ) );
}
add_action( 'rest_api_init', 'wpla_register_rest' );

function wpla_handle_analyze( WP_REST_Request $req ) {
    $text = sanitize_text_field( $req->get_param( 'text' ) );
    $type = sanitize_text_field( $req->get_param( 'type' ) );
    $file = $req->get_file_params()['file'] ?? null;

    $file_info = null;
    if ( $file && ! empty( $file['tmp_name'] ) ) {
        $upload = wp_handle_upload( $file, array( 'test_form' => false ) );
        if ( ! isset( $upload['error'] ) ) {
            $file_info = array( 'url' => $upload['url'], 'name' => basename( $upload['file'] ) );
            $content = file_get_contents( $upload['file'] );
        } else {
            return new WP_Error( 'upload_error', $upload['error'], array( 'status' => 500 ) );
        }
    } else {
        $content = '';
    }

    list( $tags, $ai_response ) = wpla_fake_gemini( $text );
    $extracted = wpla_extract_data( $content );

    $templates = wpla_find_templates( $type, $tags, $text );

    return array(
        'tags' => $tags,
        'aiResponse' => $ai_response,
        'file' => $file_info,
        'extracted' => $extracted,
        'templates' => $templates,
    );
}

// Simple data extraction from uploaded file
function wpla_extract_data( $content ) {
    $name = null;
    $date = null;
    if ( preg_match( '/ФИО[:\s]+([\w\s]+)/iu', $content, $m ) ) {
        $name = trim( $m[1] );
    }
    if ( preg_match( '/(\d{2}\.\d{2}\.\d{4})/', $content, $m ) ) {
        $date = $m[1];
    }
    return array( 'name' => $name, 'date' => $date );
}

// Find templates matching tags or text
function wpla_find_templates( $type, $tags, $text ) {
    $args = array(
        'post_type' => 'legal_template',
        'posts_per_page' => -1,
        's' => $text,
        'meta_query' => array(
            array(
                'key' => 'template_type',
                'value' => $type,
                'compare' => '=',
            )
        ),
    );
    $query = new WP_Query( $args );
    $results = array();
    foreach ( $query->posts as $p ) {
        $results[] = array(
            'id' => $p->ID,
            'title' => $p->post_title,
            'content' => apply_filters( 'the_content', $p->post_content ),
        );
    }
    return $results;
}

// Shortcode to display form
function wpla_form_shortcode() {
    ob_start();
    ?>
    <div id="wpla-form">
        <form enctype="multipart/form-data">
            <textarea name="text" rows="3" placeholder="Введите задание"></textarea><br>
            <select name="type">
                <option value="civil">Гражданское</option>
                <option value="criminal">Уголовное</option>
                <option value="admin">Административное</option>
            </select><br>
            <input type="file" name="file"><br>
            <button type="submit">Отправить</button>
        </form>
        <pre class="wpla-result"></pre>
    </div>
    <script>
    (function(){
        const form = document.querySelector('#wpla-form form');
        const result = document.querySelector('.wpla-result');
        form.addEventListener('submit', async function(e){
            e.preventDefault();
            const data = new FormData(form);
            const res = await fetch('<?php echo esc_url_raw( rest_url( 'wpla/v1/analyze' ) ); ?>', {
                method: 'POST',
                body: data
            });
            const json = await res.json();
            result.textContent = JSON.stringify(json, null, 2);
        });
    })();
    </script>
    <?php
    return ob_get_clean();
}
add_shortcode( 'legal_assistant_form', 'wpla_form_shortcode' );

?>
