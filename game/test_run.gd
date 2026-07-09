# Headless RunManager smoke test / balance probe.
# Run with: godot --headless --path game --script test_run.gd
extends SceneTree

func _initialize() -> void:
	var run := Node.new()
	run.set_script(load("res://scripts/RunManager.gd"))
	root.add_child(run)
	run.message.connect(func(t): print("[MSG] ", t))
	run.state_changed.connect(func():
		print("[STATE] ", run.state, " round=", run.round_number,
			" food=", run.total_food, "/", run.quota,
			" attempts=", run.attempts_left, "/", run.attempts_per_round))

	run.start_run()
	var safety := 0
	while run.state != run.State.GAME_OVER and safety < 500:
		safety += 1
		match run.state:
			run.State.IDLE:
				run.start_attempt()
			run.State.DRAWING:
				if run.pot < 20 and randf() < 0.85:
					run.draw()
				else:
					run.cash_out()
			run.State.SHOP:
				var offers: Array = run.offer_charms()
				print("[SHOP] offers=", offers.map(func(c): return c["id"]))
				if offers.size() > 0:
					run.pick_charm(offers[0]["id"])
				else:
					run.skip_shop()

	var gm := root.get_node("GameManager")
	print("FINAL round=", run.round_number, " best_saved=", gm.best_round, " safety_used=", safety)
	quit()
