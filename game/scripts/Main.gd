extends Node2D

var run: Node
var current_offers: Array = []

var round_label: Label
var quota_label: Label
var attempts_label: Label
var pot_label: Label
var message_label: Label
var action_button: Button
var secondary_button: Button
var charm_layer: CanvasLayer
var charm_buttons: Array = []


func _ready() -> void:
	var viewport_size := get_viewport_rect().size

	var bg := ColorRect.new()
	bg.size = viewport_size
	bg.color = Color(0.07, 0.09, 0.08)
	add_child(bg)

	run = Node.new()
	run.set_script(load("res://scripts/RunManager.gd"))
	add_child(run)
	run.state_changed.connect(_refresh)
	run.pot_changed.connect(_on_pot_changed)
	run.message.connect(_on_message)

	_build_hud(viewport_size)

	run.start_run()


func _build_hud(viewport_size: Vector2) -> void:
	var hud := CanvasLayer.new()
	add_child(hud)

	round_label = _make_label(hud, Vector2(20, 20), 24)
	quota_label = _make_label(hud, Vector2(20, 55), 20)
	attempts_label = _make_label(hud, Vector2(20, 85), 20)

	pot_label = _make_label(hud, Vector2(0, viewport_size.y / 2.0 - 90), 40)
	pot_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	pot_label.custom_minimum_size = Vector2(viewport_size.x, 50)

	message_label = _make_label(hud, Vector2(0, viewport_size.y / 2.0 - 40), 18)
	message_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	message_label.custom_minimum_size = Vector2(viewport_size.x, 30)

	action_button = Button.new()
	action_button.custom_minimum_size = Vector2(200, 50)
	action_button.position = Vector2(viewport_size.x / 2.0 - 210, viewport_size.y / 2.0 + 20)
	action_button.pressed.connect(_on_action_pressed)
	hud.add_child(action_button)

	secondary_button = Button.new()
	secondary_button.custom_minimum_size = Vector2(200, 50)
	secondary_button.position = Vector2(viewport_size.x / 2.0 + 10, viewport_size.y / 2.0 + 20)
	secondary_button.pressed.connect(_on_secondary_pressed)
	hud.add_child(secondary_button)

	charm_layer = CanvasLayer.new()
	add_child(charm_layer)
	for i in 3:
		var b := Button.new()
		b.custom_minimum_size = Vector2(320, 60)
		b.position = Vector2(viewport_size.x / 2.0 - 160, viewport_size.y / 2.0 - 100 + i * 75)
		b.pressed.connect(_on_charm_button_pressed.bind(i))
		charm_layer.add_child(b)
		charm_buttons.append(b)


func _make_label(parent: CanvasLayer, pos: Vector2, font_size: int) -> Label:
	var l := Label.new()
	l.position = pos
	l.add_theme_font_size_override("font_size", font_size)
	parent.add_child(l)
	return l


func _on_pot_changed(pot: int) -> void:
	pot_label.text = "이번 사냥: %d" % pot if pot > 0 else ""


func _on_message(text: String) -> void:
	message_label.text = text


func _refresh() -> void:
	charm_layer.hide()

	round_label.text = "라운드 %d" % run.round_number
	quota_label.text = "식량 %d / 목표 %d" % [run.total_food, run.quota]
	attempts_label.text = "남은 사냥 %d / %d" % [run.attempts_left, run.attempts_per_round]

	match run.state:
		run.State.IDLE:
			pot_label.text = ""
			message_label.text = ""
			action_button.text = "사냥 시작"
			action_button.show()
			secondary_button.hide()
		run.State.DRAWING:
			action_button.text = "뽑기"
			action_button.show()
			secondary_button.text = "저장하고 멈추기"
			secondary_button.show()
		run.State.SHOP:
			action_button.hide()
			secondary_button.text = "건너뛰기"
			secondary_button.show()
			message_label.text = "라운드 클리어! 유물을 선택하세요"
			_show_charms()
		run.State.GAME_OVER:
			action_button.text = "다시 시작"
			action_button.show()
			secondary_button.hide()
			message_label.text = "게임 오버 — %d라운드 생존 (최고 %d)" % [run.round_number, GameManager.best_round]


func _show_charms() -> void:
	current_offers = run.offer_charms()
	charm_layer.show()
	for i in charm_buttons.size():
		var b: Button = charm_buttons[i]
		if i < current_offers.size():
			var charm: Dictionary = current_offers[i]
			b.text = "%s — %s" % [charm["name"], charm["desc"]]
			b.show()
		else:
			b.hide()


func _on_charm_button_pressed(index: int) -> void:
	if index >= current_offers.size():
		return
	run.pick_charm(current_offers[index]["id"])


func _on_action_pressed() -> void:
	match run.state:
		run.State.IDLE:
			run.start_attempt()
		run.State.DRAWING:
			run.draw()
		run.State.GAME_OVER:
			run.start_run()


func _on_secondary_pressed() -> void:
	match run.state:
		run.State.DRAWING:
			run.cash_out()
		run.State.SHOP:
			run.skip_shop()
