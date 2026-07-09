extends Node2D

const Palette := preload("res://scripts/GamePalette.gd")

func _ready() -> void:
	var viewport_size := get_viewport_rect().size

	var bg := ColorRect.new()
	bg.size = viewport_size
	bg.color = Palette.BG
	add_child(bg)

	var hud := CanvasLayer.new()
	add_child(hud)

	var title := Label.new()
	title.text = "HUNGRY PACK"
	title.add_theme_font_size_override("font_size", 56)
	title.add_theme_color_override("font_color", Palette.TEXT)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.custom_minimum_size = Vector2(viewport_size.x, 70)
	title.position = Vector2(0, viewport_size.y * 0.28)
	hud.add_child(title)

	var subtitle := Label.new()
	subtitle.text = "무리를 이끌고, 겨울을 나라"
	subtitle.add_theme_font_size_override("font_size", 18)
	subtitle.add_theme_color_override("font_color", Palette.MOONLIGHT)
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	subtitle.custom_minimum_size = Vector2(viewport_size.x, 30)
	subtitle.position = Vector2(0, viewport_size.y * 0.28 + 66)
	hud.add_child(subtitle)

	var stats := Label.new()
	stats.text = "최고 기록 %d라운드 · 누적 명성 %d" % [GameManager.best_round, GameManager.total_pelts]
	stats.add_theme_font_size_override("font_size", 14)
	stats.add_theme_color_override("font_color", Palette.MOONLIGHT)
	stats.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	stats.custom_minimum_size = Vector2(viewport_size.x, 24)
	stats.position = Vector2(0, viewport_size.y * 0.28 + 100)
	hud.add_child(stats)

	var start_button := Button.new()
	start_button.text = "사냥 시작"
	start_button.custom_minimum_size = Vector2(220, 54)
	start_button.position = Vector2(viewport_size.x / 2.0 - 110, viewport_size.y * 0.6)
	start_button.add_theme_color_override("font_color", Palette.TEXT)
	start_button.add_theme_font_size_override("font_size", 18)
	start_button.pressed.connect(func(): get_tree().change_scene_to_file("res://scenes/Main.tscn"))
	hud.add_child(start_button)

	var hint := Label.new()
	hint.text = "겨울이 다가온다. 사냥감을 노릴 때마다, 밀어붙일지 물러설지가 무리의 생사를 가른다."
	hint.add_theme_font_size_override("font_size", 13)
	hint.add_theme_color_override("font_color", Palette.MOONLIGHT)
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint.custom_minimum_size = Vector2(viewport_size.x * 0.7, 40)
	hint.position = Vector2(viewport_size.x * 0.15, viewport_size.y * 0.6 + 80)
	hud.add_child(hint)
