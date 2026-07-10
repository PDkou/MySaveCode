# Exercises Main.gd's dynamic UI paths (tile grid build, tile draw
# resolution styling, Winter portrait moods, deal accept/refuse UI flow)
# that a plain idle headless run never touches.
# Run with: godot --headless --path game --script test_main_scene.gd
extends SceneTree

func _initialize() -> void:
	var main_scene: PackedScene = load("res://scenes/Main.tscn")
	var main: Node = main_scene.instantiate()
	root.add_child(main)

	await process_frame
	await process_frame

	print("[OK] Main scene ready, run.state=", main.run.state)

	# If Winter opened with a deal, exercise the refuse path first.
	if not main.run.current_deal.is_empty():
		print("[OK] deal offered at start: ", main.run.current_deal["id"])
		main._on_secondary_pressed()

	# Force into DRAWING (state_changed already triggers _refresh() automatically).
	main.run.start_attempt()
	print("[OK] entered DRAWING, tile count=", main.bag_grid.get_child_count(),
		" expected=", main.run.bag.size())

	# Draw tiles until the attempt resolves; verify styling code runs clean.
	var attempts := 0
	while main.bag_grid.get_child_count() > 0 and attempts < 12:
		attempts += 1
		var tile: Panel = null
		for child in main.bag_grid.get_children():
			if child.get_meta("active", true):
				tile = child
				break
		if tile == null:
			break
		main._on_tile_pressed(tile)
		print("[OK] resolved draw #", attempts, " run.state=", main.run.state,
			" pot=", main.run.pot, " chain=", main.run.chain, " food=", main.run.total_food)
		if main.run.state != main.run.State.DRAWING:
			break

	# Exercise the deal accept path deterministically: force a known deal
	# in IDLE and accept it through the button handler.
	main.run.state = main.run.State.IDLE
	main.run.total_food = 20
	main.run.current_deal = {"id": "winters_test", "name": "겨울의 시험",
		"desc": "다음 사냥에 함정을 하나 더 심겠다. 대신 살아서 거두면 수확의 절반을 더 주지.", "cost": 0}
	main._refresh()
	print("[OK] deal UI shown, action=", main.action_button.text)
	main._on_action_pressed()
	assert(main.run.current_deal.is_empty(), "deal should be consumed")
	assert(main.run.next_hunt_extra_traps == 1, "winters_test should add a trap")
	assert(is_equal_approx(main.run.next_hunt_cashout_bonus, 0.5), "winters_test should add cashout bonus")
	main.run.attempts_left = 2
	main.run.start_attempt()
	var traps := 0
	for t in main.run.bag:
		if t["type"] == "trap":
			traps += 1
	print("[OK] deal accepted -> bag traps=", traps, " (bust_count=", main.run.bust_count, " +1 expected)")
	assert(traps == main.run.bust_count + 1, "bag should contain one extra trap")

	# Winter portrait mood switching must not error.
	for mood in ["calm", "pleased", "wary"]:
		main.winter_portrait.set_mood(mood)
	print("[OK] portrait moods cycled")

	print("MAIN_SCENE_TEST_OK")
	quit()
