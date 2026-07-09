# Exercises Main.gd's dynamic UI paths (tile grid build, aim start/strike,
# draw resolution styling) that a plain idle headless run never touches.
# Run with: godot --headless --path game --script test_main_scene.gd
extends SceneTree

func _initialize() -> void:
	var main_scene: PackedScene = load("res://scenes/Main.tscn")
	var main: Node = main_scene.instantiate()
	root.add_child(main)

	await process_frame
	await process_frame

	print("[OK] Main scene ready, run.state=", main.run.state)

	# Force into DRAWING (state_changed already triggers _refresh() automatically).
	main.run.start_attempt()
	print("[OK] entered DRAWING, tile count=", main.bag_grid.get_child_count(),
		" expected=", main.run.bag.size())

	# Exercise aim start/strike/miss and resolution styling for a few tiles.
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
		main._start_aim(tile)
		main.aim_pos = randf() * 100.0
		main._on_aim_strike()
		print("[OK] resolved draw #", attempts, " run.state=", main.run.state,
			" pot=", main.run.pot, " food=", main.run.total_food)
		if main.run.state != main.run.State.DRAWING:
			break

	print("MAIN_SCENE_TEST_OK")
	quit()
