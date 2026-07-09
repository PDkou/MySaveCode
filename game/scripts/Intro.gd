extends Node2D

const Palette := preload("res://scripts/Palette.gd")
const LOGO_PATH := "res://assets/branding/logo.png"

var finished := false
var content_root: Control


func _ready() -> void:
	var viewport_size := get_viewport_rect().size

	var bg := ColorRect.new()
	bg.size = viewport_size
	bg.color = Palette.BG
	add_child(bg)

	var layer := CanvasLayer.new()
	add_child(layer)

	content_root = Control.new()
	content_root.size = viewport_size
	layer.add_child(content_root)

	if ResourceLoader.exists(LOGO_PATH):
		_build_logo(viewport_size)
	else:
		_build_fallback_wordmark(viewport_size)

	content_root.modulate.a = 0.0

	var tween := create_tween()
	tween.tween_property(content_root, "modulate:a", 1.0, 0.6)
	tween.tween_interval(1.2)
	tween.tween_property(content_root, "modulate:a", 0.0, 0.5)
	tween.tween_callback(_go_to_main)


func _build_logo(viewport_size: Vector2) -> void:
	var tex: Texture2D = load(LOGO_PATH)
	var target_width: float = viewport_size.x * 0.7
	var scale_ratio: float = target_width / tex.get_width()
	var target_height: float = tex.get_height() * scale_ratio

	var rect := TextureRect.new()
	rect.texture = tex
	rect.stretch_mode = TextureRect.STRETCH_SCALE
	rect.size = Vector2(target_width, target_height)
	rect.position = Vector2(
		viewport_size.x / 2.0 - target_width / 2.0,
		viewport_size.y / 2.0 - target_height / 2.0
	)
	content_root.add_child(rect)


func _build_fallback_wordmark(viewport_size: Vector2) -> void:
	var title := Label.new()
	title.text = "HOWLING"
	title.add_theme_font_size_override("font_size", 48)
	title.add_theme_color_override("font_color", Palette.TEXT)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.custom_minimum_size = Vector2(viewport_size.x, 60)
	title.position = Vector2(0, viewport_size.y / 2.0 - 40)
	content_root.add_child(title)

	var subtitle := Label.new()
	subtitle.text = "CREATIVE STUDIO"
	subtitle.add_theme_font_size_override("font_size", 14)
	subtitle.add_theme_color_override("font_color", Palette.MOONLIGHT)
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	subtitle.custom_minimum_size = Vector2(viewport_size.x, 30)
	subtitle.position = Vector2(0, viewport_size.y / 2.0 + 20)
	content_root.add_child(subtitle)


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed:
		_go_to_main()
	elif event is InputEventMouseButton and event.pressed:
		_go_to_main()
	elif event is InputEventScreenTouch and event.pressed:
		_go_to_main()


func _go_to_main() -> void:
	if finished:
		return
	finished = true
	get_tree().change_scene_to_file("res://scenes/Main.tscn")
