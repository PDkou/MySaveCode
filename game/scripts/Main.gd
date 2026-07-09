extends Node2D

const Palette := preload("res://scripts/GamePalette.gd")

var run: Node
var current_offers: Array = []

var round_label: Label
var quota_label: Label
var attempts_label: Label
var risk_label: Label
var pot_label: Label
var message_label: Label
var action_button: Button
var secondary_button: Button
var scout_button: Button
var charm_layer: CanvasLayer
var charm_buttons: Array = []


func _ready() -> void:
	var viewport_size := get_viewport_rect().size

	var bg := ColorRect.new()
	bg.size = viewport_size
	bg.color = Palette.BG
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

	round_label = _make_label(hud, Vector2(20, 20), 24, Palette.MOONLIGHT)
	quota_label = _make_label(hud, Vector2(20, 55), 20, Palette.MOONLIGHT)
	attempts_label = _make_label(hud, Vector2(20, 85), 20, Palette.MOONLIGHT)
	risk_label = _make_label(hud, Vector2(20, 115), 18, Palette.DANGER)

	pot_label = _make_label(hud, Vector2(0, viewport_size.y / 2.0 - 90), 40, Palette.TEXT)
	pot_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	pot_label.custom_minimum_size = Vector2(viewport_size.x, 50)

	message_label = _make_label(hud, Vector2(0, viewport_size.y / 2.0 - 40), 18, Palette.TEXT)
	message_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	message_label.custom_minimum_size = Vector2(viewport_size.x, 30)

	action_button = _make_button(hud, Vector2(200, 50), Vector2(viewport_size.x / 2.0 - 210, viewport_size.y / 2.0 + 20))
	action_button.pressed.connect(_on_action_pressed)

	secondary_button = _make_button(hud, Vector2(200, 50), Vector2(viewport_size.x / 2.0 + 10, viewport_size.y / 2.0 + 20))
	secondary_button.pressed.connect(_on_secondary_pressed)

	scout_button = _make_button(hud, Vector2(190, 40), Vector2(viewport_size.x - 210, 20))
	scout_button.pressed.connect(_on_scout_pressed)

	charm_layer = CanvasLayer.new()
	add_child(charm_layer)
	for i in 3:
		var b := _make_button(charm_layer, Vector2(320, 60), Vector2(viewport_size.x / 2.0 - 160, viewport_size.y / 2.0 - 100 + i * 75))
		b.pressed.connect(_on_charm_button_pressed.bind(i))
		charm_buttons.append(b)


func _make_label(parent: CanvasLayer, pos: Vector2, font_size: int, color: Color) -> Label:
	var l := Label.new()
	l.position = pos
	l.add_theme_font_size_override("font_size", font_size)
	l.add_theme_color_override("font_color", color)
	parent.add_child(l)
	return l


func _make_button(parent: CanvasLayer, min_size: Vector2, pos: Vector2) -> Button:
	var b := Button.new()
	b.custom_minimum_size = min_size
	b.position = pos
	b.add_theme_color_override("font_color", Palette.TEXT)
	parent.add_child(b)
	return b


func _on_pot_changed(pot: int) -> void:
	pot_label.text = "이번 사냥: %d" % pot if pot > 0 else ""


func _on_message(text: String, kind: String) -> void:
	_set_message(text, kind)


func _set_message(text: String, kind: String) -> void:
	message_label.text = text
	match kind:
		"success":
			message_label.add_theme_color_override("font_color", Palette.SUCCESS)
		"trap":
			message_label.add_theme_color_override("font_color", Palette.DANGER)
		_:
			message_label.add_theme_color_override("font_color", Palette.TEXT)


func _refresh() -> void:
	charm_layer.hide()

	round_label.text = "라운드 %d" % run.round_number
	quota_label.text = "식량 %d / 목표 %d" % [run.total_food, run.quota]
	attempts_label.text = "남은 사냥 %d / %d" % [run.attempts_left, run.attempts_per_round]

	risk_label.text = ""
	scout_button.hide()

	match run.state:
		run.State.IDLE:
			pot_label.text = ""
			_set_message("", "info")
			action_button.text = "사냥 시작"
			action_button.show()
			secondary_button.hide()
		run.State.DRAWING:
			action_button.text = "뽑기"
			action_button.show()
			secondary_button.text = "저장하고 멈추기"
			secondary_button.show()
			var traps: int = run.remaining_trap_count()
			var tiles: int = run.remaining_tile_count()
			if tiles > 0:
				var odds := int(round(100.0 * traps / tiles))
				risk_label.text = "위험도: 함정 %d / 남은 %d장 (약 %d%%)" % [traps, tiles, odds]
			if run.scouts_left > 0:
				scout_button.text = "정찰 (%d)" % run.scouts_left
				scout_button.show()
		run.State.ROUND_CLEAR:
			action_button.text = "계속 사냥"
			action_button.show()
			secondary_button.text = "귀환 (지금까지 성과 보존)"
			secondary_button.show()
			_set_message("라운드 클리어! 더 나아갈까, 여기서 귀환할까?", "success")
		run.State.SHOP:
			secondary_button.text = "건너뛰기"
			secondary_button.show()
			if run.rerolls_left > 0:
				action_button.text = "새로고침 (%d)" % run.rerolls_left
				action_button.show()
			else:
				action_button.hide()
			_show_charms()
			if current_offers.is_empty():
				_set_message("유물 선택! (더 얻을 유물 없음)", "success")
			else:
				_set_message("유물을 선택하세요 — 항상 좋은 것만 있지는 않다", "success")
		run.State.GAME_OVER:
			action_button.text = "다시 시작"
			action_button.show()
			secondary_button.hide()
			_set_message("게임 오버 — 전부 잃었다 (%d라운드까지 생존, 최고 %d)" % [run.round_number, GameManager.best_round], "trap")
		run.State.RETREATED:
			action_button.text = "다시 시작"
			action_button.show()
			secondary_button.hide()
			_set_message("무리가 귀환했다! %d라운드 생존 (누적 명성 %d)" % [run.round_number, GameManager.total_pelts], "success")


func _show_charms() -> void:
	current_offers = run.offer_charms()
	charm_layer.show()
	for i in charm_buttons.size():
		var b: Button = charm_buttons[i]
		if i < current_offers.size():
			var charm: Dictionary = current_offers[i]
			b.text = "%s — %s" % [charm["name"], charm["desc"]]
			b.add_theme_color_override("font_color", _tier_color(charm.get("tier", "good")))
			b.show()
		else:
			b.hide()


func _tier_color(tier: String) -> Color:
	match tier:
		"good":
			return Palette.SUCCESS
		"risky":
			return Palette.MOONLIGHT
		"bad":
			return Palette.DANGER
		_:
			return Palette.TEXT


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
		run.State.ROUND_CLEAR:
			run.continue_hunting()
		run.State.SHOP:
			run.use_reroll()
		run.State.GAME_OVER, run.State.RETREATED:
			run.start_run()


func _on_scout_pressed() -> void:
	run.scout()
	_refresh()


func _on_secondary_pressed() -> void:
	match run.state:
		run.State.DRAWING:
			run.cash_out()
		run.State.ROUND_CLEAR:
			run.retreat()
		run.State.SHOP:
			run.skip_shop()
