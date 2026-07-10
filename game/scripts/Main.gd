extends Node2D

const Palette := preload("res://scripts/GamePalette.gd")
const Winter := preload("res://scripts/Winter.gd")
const WinterPortraitScript := preload("res://scripts/WinterPortrait.gd")
const PlayerControllerScript := preload("res://scripts/PlayerController.gd")
const HuntFieldScript := preload("res://scripts/HuntField.gd")

var run: Node
var player: CharacterBody3D
var hunt_field: Node3D
var winter_portrait: Node2D
var current_offers: Array = []

var round_label: Label
var quota_label: Label
var attempts_label: Label
var risk_label: Label
var winter_label: Label
var pot_label: Label
var chain_label: Label
var message_label: Label
var hint_label: Label
var action_button: Button
var secondary_button: Button
var charm_layer: CanvasLayer
var charm_buttons: Array = []

var pending_refresh: bool = false


func _ready() -> void:
	var viewport_size := get_viewport_rect().size

	run = Node.new()
	run.set_script(load("res://scripts/RunManager.gd"))
	add_child(run)
	run.state_changed.connect(_on_state_changed)
	run.pot_changed.connect(_on_pot_changed)
	run.message.connect(_on_message)

	_build_world()
	_build_hud(viewport_size)

	run.start_run()


func _build_world() -> void:
	var world_env := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0.03, 0.05, 0.08)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.25, 0.32, 0.42)
	env.ambient_light_energy = 0.5
	env.fog_enabled = true
	env.fog_light_color = Color(0.35, 0.45, 0.55)
	env.fog_density = 0.025
	world_env.environment = env
	add_child(world_env)

	var moon := DirectionalLight3D.new()
	moon.rotation_degrees = Vector3(-55, -35, 0)
	moon.light_color = Color(0.75, 0.85, 1.0)
	moon.light_energy = 0.9
	add_child(moon)

	var ground := StaticBody3D.new()
	var ground_shape := CollisionShape3D.new()
	var box_shape := BoxShape3D.new()
	box_shape.size = Vector3(64, 0.2, 64)
	ground_shape.shape = box_shape
	ground_shape.position.y = -0.1
	ground.add_child(ground_shape)
	var ground_mesh := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	plane.size = Vector2(64, 64)
	ground_mesh.mesh = plane
	var ground_mat := StandardMaterial3D.new()
	ground_mat.albedo_color = Color(0.75, 0.80, 0.86)
	ground_mesh.material_override = ground_mat
	ground.add_child(ground_mesh)
	add_child(ground)

	for i in 26:
		var angle := randf() * TAU
		var dist := randf_range(10.0, 29.0)
		var tree := MeshInstance3D.new()
		var cone := CylinderMesh.new()
		cone.top_radius = 0.05
		cone.bottom_radius = randf_range(1.0, 1.6)
		cone.height = randf_range(3.0, 5.5)
		tree.mesh = cone
		tree.position = Vector3(cos(angle) * dist, cone.height / 2.0, sin(angle) * dist)
		var tree_mat := StandardMaterial3D.new()
		tree_mat.albedo_color = Color(0.04, 0.07, 0.06)
		tree.material_override = tree_mat
		add_child(tree)

	player = CharacterBody3D.new()
	player.set_script(PlayerControllerScript)
	player.position = Vector3.ZERO
	add_child(player)

	hunt_field = Node3D.new()
	hunt_field.set_script(HuntFieldScript)
	add_child(hunt_field)
	hunt_field.setup(run)
	hunt_field.token_triggered.connect(_on_token_triggered)


func _build_hud(viewport_size: Vector2) -> void:
	var hud := CanvasLayer.new()
	add_child(hud)

	round_label = _make_label(hud, Vector2(20, 20), 24, Palette.MOONLIGHT)
	quota_label = _make_label(hud, Vector2(20, 55), 20, Palette.MOONLIGHT)
	attempts_label = _make_label(hud, Vector2(20, 85), 20, Palette.MOONLIGHT)
	risk_label = _make_label(hud, Vector2(20, 115), 18, Palette.DANGER)

	winter_portrait = Node2D.new()
	winter_portrait.set_script(WinterPortraitScript)
	winter_portrait.position = Vector2(viewport_size.x / 2.0, 78)
	hud.add_child(winter_portrait)

	winter_label = _make_label(hud, Vector2(0, 130), 20, Palette.MOONLIGHT)
	winter_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	winter_label.custom_minimum_size = Vector2(viewport_size.x, 28)

	pot_label = _make_label(hud, Vector2(0, 172), 36, Palette.TEXT)
	pot_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	pot_label.custom_minimum_size = Vector2(viewport_size.x, 46)

	chain_label = _make_label(hud, Vector2(0, 214), 18, Palette.SUCCESS)
	chain_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	chain_label.custom_minimum_size = Vector2(viewport_size.x, 24)

	hint_label = _make_label(hud, Vector2(0, viewport_size.y - 60), 15, Palette.TEXT)
	hint_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint_label.custom_minimum_size = Vector2(viewport_size.x, 24)
	hint_label.modulate.a = 0.7

	message_label = _make_label(hud, Vector2(0, 425), 18, Palette.TEXT)
	message_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	message_label.custom_minimum_size = Vector2(viewport_size.x, 30)

	action_button = _make_button(hud, Vector2(200, 50), Vector2(viewport_size.x / 2.0 - 210, 480))
	action_button.pressed.connect(_on_action_pressed)

	secondary_button = _make_button(hud, Vector2(200, 50), Vector2(viewport_size.x / 2.0 + 10, 480))
	secondary_button.pressed.connect(_on_secondary_pressed)

	charm_layer = CanvasLayer.new()
	add_child(charm_layer)
	for i in 3:
		var b := _make_button(charm_layer, Vector2(320, 60), Vector2(viewport_size.x / 2.0 - 160, 260 + i * 75))
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


func _unhandled_input(event: InputEvent) -> void:
	if run.state != run.State.DRAWING:
		return
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_Q:
			_do_cash_out()
		elif event.keycode == KEY_F:
			_do_scout()


func _on_pot_changed(pot: int) -> void:
	pot_label.text = "%d 이번 사냥" % pot if pot > 0 else ""


func _winter_say(bank: Array, mood: String = "") -> void:
	winter_label.text = "겨울: \"%s\"" % Winter.line(bank)
	if mood != "":
		winter_portrait.set_mood(mood)


func _on_message(text: String, kind: String) -> void:
	_set_message(text, kind)
	if kind == "trap":
		_winter_say(Winter.TRAP_LINES, "pleased")


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

	round_label.text = "라운드 %d" % run.round_number
	quota_label.text = "식량 %d / 목표 %d" % [run.total_food, run.quota]
	attempts_label.text = "남은 사냥 %d / %d" % [run.attempts_left, run.attempts_per_round]

	risk_label.text = ""
	chain_label.text = ""
	hint_label.text = ""

	match run.state:
		run.State.IDLE:
			pot_label.text = ""
			winter_portrait.set_mood("calm")
			hunt_field.clear_field()
			player.set_input_enabled(false)
			if not run.current_deal.is_empty():
				winter_label.text = "겨울: \"%s\"" % run.current_deal["desc"]
				_set_message("겨울이 거래를 제안한다 — %s" % run.current_deal["name"], "info")
				action_button.text = "거래를 받아들인다"
				action_button.show()
				secondary_button.text = "거절한다"
				secondary_button.show()
			else:
				_set_message("", "info")
				action_button.text = "사냥 시작"
				action_button.show()
				secondary_button.hide()
		run.State.DRAWING:
			action_button.hide()
			secondary_button.hide()
			var traps: int = run.remaining_trap_count()
			var tiles: int = run.remaining_tile_count()
			if tiles > 0:
				var odds := int(round(100.0 * traps / tiles))
				risk_label.text = "위험도: 함정 %d / 남은 %d곳 (약 %d%%)" % [traps, tiles, odds]
			if run.chain >= 2:
				chain_label.text = "연쇄 x%d" % run.chain
			var scout_hint := " · F: 정찰 (%d)" % run.scouts_left if run.scouts_left > 0 else ""
			hint_label.text = "이동: WASD / 시점: 마우스 · Q: 저장하고 멈추기%s" % scout_hint
		run.State.ROUND_CLEAR:
			action_button.text = "계속 사냥"
			action_button.show()
			secondary_button.text = "귀환 (지금까지 성과 보존)"
			secondary_button.show()
			_set_message("라운드 클리어! 더 나아갈까, 여기서 귀환할까?", "success")
			_winter_say(Winter.ROUND_CLEAR_LINES, "wary")
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
			_winter_say(Winter.GAME_OVER_LINES, "pleased")
		run.State.RETREATED:
			action_button.text = "다시 시작"
			action_button.show()
			secondary_button.hide()
			_set_message("무리가 귀환했다! %d라운드 생존 (누적 명성 %d)" % [run.round_number, GameManager.total_pelts], "success")
			_winter_say(Winter.RETREAT_LINES, "calm")


func _on_token_triggered(result: Dictionary) -> void:
	match result["kind"]:
		"prey":
			var ch: int = result.get("chain", 0)
			if ch >= 2:
				chain_label.text = "연쇄 x%d" % ch
			if ch == 4:
				_winter_say(Winter.CHAIN_LINES, "wary")
	pending_refresh = true
	get_tree().create_timer(0.15).timeout.connect(func():
		pending_refresh = false
		_refresh()
	)


func _do_cash_out() -> void:
	run.cash_out()
	match run.state:
		run.State.ROUND_CLEAR:
			_winter_say(Winter.ROUND_CLEAR_LINES, "wary")
		run.State.GAME_OVER:
			_winter_say(Winter.GAME_OVER_LINES, "pleased")


func _do_scout() -> void:
	var peeked: Dictionary = run.scout()
	if peeked.is_empty():
		return
	hunt_field.highlight_marker(peeked["uid"], peeked["type"] == "trap")
	if peeked.get("type", "") != "trap":
		_winter_say(Winter.SCOUT_LINES)
	_refresh()


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
			if not run.current_deal.is_empty():
				run.accept_deal()
				_winter_say(Winter.DEAL_ACCEPT_LINES, "pleased")
			else:
				player.position = Vector3.ZERO
				run.start_attempt()
				hunt_field.spawn_field(run.bag)
				player.set_input_enabled(true)
		run.State.ROUND_CLEAR:
			run.continue_hunting()
			_winter_say(Winter.CONTINUE_LINES)
		run.State.SHOP:
			run.use_reroll()
		run.State.GAME_OVER, run.State.RETREATED:
			run.start_run()


func _on_secondary_pressed() -> void:
	match run.state:
		run.State.IDLE:
			if not run.current_deal.is_empty():
				run.refuse_deal()
				_winter_say(Winter.DEAL_REFUSE_LINES, "calm")
		run.State.ROUND_CLEAR:
			run.retreat()
		run.State.SHOP:
			run.skip_shop()
