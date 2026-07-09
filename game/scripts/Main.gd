extends Node2D

const Palette := preload("res://scripts/GamePalette.gd")
const Winter := preload("res://scripts/Winter.gd")

var run: Node
var current_offers: Array = []

var round_label: Label
var quota_label: Label
var attempts_label: Label
var risk_label: Label
var winter_label: Label
var pot_label: Label
var message_label: Label
var action_button: Button
var secondary_button: Button
var scout_button: Button
var charm_layer: CanvasLayer
var charm_buttons: Array = []

var bag_layer: CanvasLayer
var bag_grid: GridContainer
var aim_container: Control
var aim_track: ColorRect
var aim_sweet: ColorRect
var aim_marker: ColorRect

var aiming: bool = false
var aim_pos: float = 0.0
var aim_dir: float = 1.0
var aim_sweet_start: float = 0.0
var aim_sweet_width: float = 20.0
var aim_speed: float = 150.0  # percent per second
var current_aim_tile: Panel = null
var pending_refresh: bool = false


func _ready() -> void:
	var viewport_size := get_viewport_rect().size

	var bg := ColorRect.new()
	bg.size = viewport_size
	bg.color = Palette.BG
	add_child(bg)

	run = Node.new()
	run.set_script(load("res://scripts/RunManager.gd"))
	add_child(run)
	run.state_changed.connect(_on_state_changed)
	run.pot_changed.connect(_on_pot_changed)
	run.message.connect(_on_message)

	_build_hud(viewport_size)
	_build_bag_ui(viewport_size)

	run.start_run()


func _process(delta: float) -> void:
	if not aiming:
		return
	aim_pos += aim_dir * aim_speed * delta
	if aim_pos >= 100.0:
		aim_pos = 100.0
		aim_dir = -1.0
	elif aim_pos <= 0.0:
		aim_pos = 0.0
		aim_dir = 1.0
	aim_marker.position.x = aim_track.size.x * (aim_pos / 100.0) - aim_marker.size.x / 2.0


func _build_hud(viewport_size: Vector2) -> void:
	var hud := CanvasLayer.new()
	add_child(hud)

	round_label = _make_label(hud, Vector2(20, 20), 24, Palette.MOONLIGHT)
	quota_label = _make_label(hud, Vector2(20, 55), 20, Palette.MOONLIGHT)
	attempts_label = _make_label(hud, Vector2(20, 85), 20, Palette.MOONLIGHT)
	risk_label = _make_label(hud, Vector2(20, 115), 18, Palette.DANGER)

	winter_label = _make_label(hud, Vector2(0, 130), 20, Palette.MOONLIGHT)
	winter_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	winter_label.custom_minimum_size = Vector2(viewport_size.x, 28)

	pot_label = _make_label(hud, Vector2(0, 172), 36, Palette.TEXT)
	pot_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	pot_label.custom_minimum_size = Vector2(viewport_size.x, 46)

	message_label = _make_label(hud, Vector2(0, 425), 18, Palette.TEXT)
	message_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	message_label.custom_minimum_size = Vector2(viewport_size.x, 30)

	action_button = _make_button(hud, Vector2(200, 50), Vector2(viewport_size.x / 2.0 - 210, 480))
	action_button.pressed.connect(_on_action_pressed)

	secondary_button = _make_button(hud, Vector2(200, 50), Vector2(viewport_size.x / 2.0 + 10, 480))
	secondary_button.pressed.connect(_on_secondary_pressed)

	scout_button = _make_button(hud, Vector2(190, 40), Vector2(viewport_size.x - 210, 20))
	scout_button.pressed.connect(_on_scout_pressed)

	charm_layer = CanvasLayer.new()
	add_child(charm_layer)
	for i in 3:
		var b := _make_button(charm_layer, Vector2(320, 60), Vector2(viewport_size.x / 2.0 - 160, 260 + i * 75))
		b.pressed.connect(_on_charm_button_pressed.bind(i))
		charm_buttons.append(b)


func _build_bag_ui(viewport_size: Vector2) -> void:
	bag_layer = CanvasLayer.new()
	add_child(bag_layer)

	bag_grid = GridContainer.new()
	bag_grid.columns = 5
	bag_grid.add_theme_constant_override("h_separation", 10)
	bag_grid.add_theme_constant_override("v_separation", 10)
	bag_grid.position = Vector2(viewport_size.x / 2.0 - 155, 222)
	bag_layer.add_child(bag_grid)

	aim_container = Control.new()
	aim_container.position = Vector2(viewport_size.x / 2.0 - 160, 362)
	aim_container.custom_minimum_size = Vector2(320, 34)
	aim_container.visible = false
	bag_layer.add_child(aim_container)

	aim_track = ColorRect.new()
	aim_track.size = Vector2(320, 22)
	aim_track.color = Palette.BG
	aim_container.add_child(aim_track)

	aim_sweet = ColorRect.new()
	aim_sweet.size = Vector2(64, 22)
	aim_sweet.color = Color(Palette.SUCCESS.r, Palette.SUCCESS.g, Palette.SUCCESS.b, 0.4)
	aim_track.add_child(aim_sweet)

	aim_marker = ColorRect.new()
	aim_marker.size = Vector2(6, 26)
	aim_marker.position = Vector2(-3, -2)
	aim_marker.color = Palette.TEXT
	aim_track.add_child(aim_marker)

	var aim_button := Button.new()
	aim_button.custom_minimum_size = Vector2(320, 22)
	aim_button.flat = true
	aim_button.modulate.a = 0.01
	aim_button.pressed.connect(_on_aim_strike)
	aim_container.add_child(aim_button)


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
	pot_label.text = "%d 이번 사냥" % pot if pot > 0 else ""


func _winter_say(bank: Array) -> void:
	winter_label.text = "겨울: \"%s\"" % Winter.line(bank)


func _on_message(text: String, kind: String) -> void:
	_set_message(text, kind)
	if kind == "trap":
		_winter_say(Winter.TRAP_LINES)


func _set_message(text: String, kind: String) -> void:
	message_label.text = text
	match kind:
		"success":
			message_label.add_theme_color_override("font_color", Palette.SUCCESS)
		"trap":
			message_label.add_theme_color_override("font_color", Palette.DANGER)
		_:
			message_label.add_theme_color_override("font_color", Palette.TEXT)


func _on_state_changed() -> void:
	if pending_refresh:
		return
	_refresh()


func _refresh() -> void:
	charm_layer.hide()
	_clear_bag_grid()
	aim_container.visible = false
	aiming = false

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
			action_button.hide()
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
			_build_bag_grid()
		run.State.ROUND_CLEAR:
			action_button.text = "계속 사냥"
			action_button.show()
			secondary_button.text = "귀환 (지금까지 성과 보존)"
			secondary_button.show()
			_set_message("라운드 클리어! 더 나아갈까, 여기서 귀환할까?", "success")
			_winter_say(Winter.ROUND_CLEAR_LINES)
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
			_winter_say(Winter.SHOP_LINES)
		run.State.GAME_OVER:
			action_button.text = "다시 시작"
			action_button.show()
			secondary_button.hide()
			_set_message("게임 오버 — 전부 잃었다 (%d라운드까지 생존, 최고 %d)" % [run.round_number, GameManager.best_round], "trap")
			_winter_say(Winter.GAME_OVER_LINES)
		run.State.RETREATED:
			action_button.text = "다시 시작"
			action_button.show()
			secondary_button.hide()
			_set_message("무리가 귀환했다! %d라운드 생존 (누적 명성 %d)" % [run.round_number, GameManager.total_pelts], "success")
			_winter_say(Winter.RETREAT_LINES)


func _clear_bag_grid() -> void:
	for child in bag_grid.get_children():
		bag_grid.remove_child(child)
		child.free()


func _build_bag_grid() -> void:
	_clear_bag_grid()
	for i in run.bag.size():
		var tile := Panel.new()
		tile.custom_minimum_size = Vector2(50, 50)
		var style := StyleBoxFlat.new()
		style.bg_color = Color(0.10, 0.14, 0.20)
		style.border_color = Color(Palette.MOONLIGHT.r, Palette.MOONLIGHT.g, Palette.MOONLIGHT.b, 0.3)
		style.set_border_width_all(1)
		style.corner_radius_top_left = 10
		style.corner_radius_top_right = 10
		style.corner_radius_bottom_left = 10
		style.corner_radius_bottom_right = 10
		tile.add_theme_stylebox_override("panel", style)

		var label := Label.new()
		label.set_anchors_preset(Control.PRESET_FULL_RECT)
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		label.add_theme_font_size_override("font_size", 12)
		tile.add_child(label)

		var btn := Button.new()
		btn.set_anchors_preset(Control.PRESET_FULL_RECT)
		btn.flat = true
		btn.modulate.a = 0.01
		btn.pressed.connect(_on_tile_pressed.bind(tile))
		tile.add_child(btn)

		bag_grid.add_child(tile)


func _on_tile_pressed(tile: Panel) -> void:
	if aiming or not tile.get_meta("active", true):
		return
	_start_aim(tile)


func _start_aim(tile: Panel) -> void:
	current_aim_tile = tile
	aiming = true
	aim_pos = 0.0
	aim_dir = 1.0
	aim_sweet_width = 20.0
	aim_sweet_start = randf_range(4.0, 96.0 - aim_sweet_width)
	aim_sweet.position.x = aim_track.size.x * (aim_sweet_start / 100.0)
	aim_sweet.size.x = aim_track.size.x * (aim_sweet_width / 100.0)
	aim_container.visible = true


func _on_aim_strike() -> void:
	if not aiming:
		return
	aiming = false
	aim_container.visible = false
	var precise: bool = aim_pos >= aim_sweet_start and aim_pos <= aim_sweet_start + aim_sweet_width
	_resolve_draw(current_aim_tile, precise)


func _resolve_draw(tile: Panel, precise: bool) -> void:
	var result: Dictionary = run.draw(precise)
	if result.is_empty():
		return
	tile.set_meta("active", false)
	var label: Label = tile.get_child(0)
	var style: StyleBoxFlat = tile.get_theme_stylebox("panel").duplicate()
	match result["kind"]:
		"trap":
			label.text = ""
			style.bg_color = Color(0.35, 0.14, 0.11)
			style.border_color = Palette.DANGER
		"parried":
			label.text = "⛊"
			style.bg_color = Color(0.14, 0.25, 0.14)
			style.border_color = Palette.SUCCESS
		"dodged":
			label.text = "✓"
			style.bg_color = Color(0.14, 0.25, 0.14)
			style.border_color = Palette.SUCCESS
		"prey":
			label.text = "%s\n%d" % [result["icon"], result["value"]]
			style.bg_color = Color(0.30, 0.22, 0.10) if not result.get("precise", false) else Color(0.30, 0.26, 0.10)
			style.border_color = Palette.SUCCESS
	tile.add_theme_stylebox_override("panel", style)

	pending_refresh = true
	get_tree().create_timer(0.42).timeout.connect(func():
		pending_refresh = false
		_refresh()
	)


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
		run.State.ROUND_CLEAR:
			run.continue_hunting()
			_winter_say(Winter.CONTINUE_LINES)
		run.State.SHOP:
			run.use_reroll()
		run.State.GAME_OVER, run.State.RETREATED:
			run.start_run()


func _on_scout_pressed() -> void:
	if aiming:
		return
	var peeked: Dictionary = run.scout()
	if peeked.get("type", "") != "trap":
		_winter_say(Winter.SCOUT_LINES)
	_refresh()


func _on_secondary_pressed() -> void:
	if aiming:
		return
	match run.state:
		run.State.DRAWING:
			run.cash_out()
			match run.state:
				run.State.ROUND_CLEAR:
					_winter_say(Winter.ROUND_CLEAR_LINES)
				run.State.GAME_OVER:
					_winter_say(Winter.GAME_OVER_LINES)
		run.State.ROUND_CLEAR:
			run.retreat()
		run.State.SHOP:
			run.skip_shop()
