extends Node2D

var player: Area2D
var spawner: Node
var spawn_holder: Node2D

var score_label: Label
var best_label: Label
var message_label: Label
var start_button: Button


func _ready() -> void:
	var viewport_size := get_viewport_rect().size

	var bg := ColorRect.new()
	bg.size = viewport_size
	bg.color = Color(0.08, 0.08, 0.12)
	add_child(bg)

	spawn_holder = Node2D.new()
	add_child(spawn_holder)

	player = Area2D.new()
	player.set_script(load("res://scripts/Player.gd"))
	add_child(player)
	player.setup(viewport_size.x, viewport_size.y - 120.0)

	spawner = Node.new()
	spawner.set_script(load("res://scripts/Spawner.gd"))
	add_child(spawner)
	spawner.setup(spawn_holder, viewport_size.x)

	_build_hud(viewport_size)

	GameManager.score_changed.connect(_on_score_changed)
	GameManager.game_over.connect(_on_game_over)

	_show_ready_state()


func _build_hud(viewport_size: Vector2) -> void:
	var hud_layer := CanvasLayer.new()
	add_child(hud_layer)

	score_label = Label.new()
	score_label.position = Vector2(20, 20)
	score_label.add_theme_font_size_override("font_size", 32)
	hud_layer.add_child(score_label)

	best_label = Label.new()
	best_label.position = Vector2(20, 60)
	hud_layer.add_child(best_label)

	message_label = Label.new()
	message_label.add_theme_font_size_override("font_size", 28)
	message_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	message_label.custom_minimum_size = Vector2(viewport_size.x, 80)
	message_label.position = Vector2(0, viewport_size.y / 2.0 - 80)
	hud_layer.add_child(message_label)

	start_button = Button.new()
	start_button.custom_minimum_size = Vector2(200, 50)
	start_button.position = Vector2(viewport_size.x / 2.0 - 100, viewport_size.y / 2.0 + 10)
	start_button.pressed.connect(_on_start_pressed)
	hud_layer.add_child(start_button)


func _show_ready_state() -> void:
	player.reset()
	message_label.text = "LANE RUSH"
	start_button.text = "START"
	start_button.show()
	score_label.text = "SCORE 0"
	best_label.text = "BEST %d" % GameManager.best_score


func _on_start_pressed() -> void:
	start_button.hide()
	message_label.text = ""
	player.reset()
	GameManager.start_game()
	spawner.start()


func _on_score_changed(score: int) -> void:
	score_label.text = "SCORE %d" % score


func _on_game_over(score: int, best: int) -> void:
	spawner.stop()
	message_label.text = "GAME OVER\nSCORE %d" % score
	best_label.text = "BEST %d" % best
	start_button.text = "RETRY"
	start_button.show()
