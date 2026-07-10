# Exercises Main.gd's 3D-world assembly and HuntField trigger logic that a
# plain idle headless run never touches. Physics-body overlap isn't reliable
# to time deterministically in a headless SceneTree script, so marker
# triggers are invoked directly (same call HuntField's own signal handler
# makes) rather than waiting for real Area3D collision frames.
# Run with: godot --headless --path game --script test_main_scene.gd
extends SceneTree

func _initialize() -> void:
	var main_scene: PackedScene = load("res://scenes/Main.tscn")
	var main: Node = main_scene.instantiate()
	root.add_child(main)

	await process_frame
	await process_frame

	print("[OK] Main scene ready, run.state=", main.run.state)
	assert(main.player is CharacterBody3D, "player should be a CharacterBody3D")
	assert(main.hunt_field != null, "hunt_field should exist")

	# If Winter opened with a deal, exercise the refuse path first.
	if not main.run.current_deal.is_empty():
		print("[OK] deal offered at start: ", main.run.current_deal["id"])
		main._on_secondary_pressed()

	main._on_action_pressed()  # IDLE -> start_attempt() + spawn_field()
	print("[OK] entered DRAWING, marker count=", main.hunt_field.marker_count(),
		" expected=", main.run.bag.size())
	assert(main.hunt_field.marker_count() == main.run.bag.size(), "one marker per bag token")

	# Trigger markers directly (bypassing physics timing) until the attempt resolves.
	var attempts := 0
	while main.hunt_field.marker_count() > 0 and attempts < 12:
		attempts += 1
		var uid = main.hunt_field.markers.keys()[0]
		var area: Area3D = main.hunt_field.markers[uid]
		var token: Dictionary = {}
		for t in main.run.bag:
			if t["uid"] == uid:
				token = t
				break
		main.hunt_field._on_body_entered(main.player, area, token)
		print("[OK] resolved trigger #", attempts, " run.state=", main.run.state,
			" pot=", main.run.pot, " chain=", main.run.chain, " food=", main.run.total_food,
			" markers_left=", main.hunt_field.marker_count())
		if main.run.state != main.run.State.DRAWING:
			break

	# Exercise the deal accept path deterministically.
	main.run.state = main.run.State.IDLE
	main.run.total_food = 20
	main.run.current_deal = {"id": "winters_test", "name": "겨울의 시험",
		"desc": "다음 사냥에 함정을 하나 더 심겠다. 대신 살아서 거두면 수확의 절반을 더 주지.", "cost": 0}
	main._refresh()
	print("[OK] deal UI shown, action=", main.action_button.text)
	main._on_action_pressed()  # 1st click: accept the deal (still IDLE afterward)
	assert(main.run.current_deal.is_empty(), "deal should be consumed")
	assert(main.run.next_hunt_extra_traps == 1, "winters_test should queue an extra trap for the next hunt")
	main._on_action_pressed()  # 2nd click: now actually start the hunt
	print("[OK] deal accepted -> bag size=", main.run.bag.size(),
		" markers=", main.hunt_field.marker_count(), " bust_count=", main.run.bust_count)
	assert(main.hunt_field.marker_count() == main.run.bag.size(), "markers should match the post-deal bag")
	assert(main.run.next_hunt_extra_traps == 0, "deal effect should be consumed once the bag is built")

	# Scout + highlight must not error even without a real physics frame.
	var peeked: Dictionary = main.run.scout()
	if not peeked.is_empty():
		main.hunt_field.highlight_marker(peeked["uid"], peeked["type"] == "trap")
	print("[OK] scout/highlight cycled")

	# Winter portrait mood switching must not error.
	for mood in ["calm", "pleased", "wary"]:
		main.winter_portrait.set_mood(mood)
	print("[OK] portrait moods cycled")

	print("MAIN_SCENE_TEST_OK")
	quit()
