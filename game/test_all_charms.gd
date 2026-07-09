# Applies every charm definition once (bypassing shop RNG) to verify
# _apply_effect() handles every "stat" key without error.
# Run with: godot --headless --path game --script test_all_charms.gd
extends SceneTree

func _initialize() -> void:
	var run := Node.new()
	run.set_script(load("res://scripts/RunManager.gd"))
	root.add_child(run)

	for def in run.CHARM_DEFS:
		var fresh := Node.new()
		fresh.set_script(load("res://scripts/RunManager.gd"))
		root.add_child(fresh)
		fresh.start_run()
		fresh.state = fresh.State.SHOP
		fresh.pick_charm(def["id"])
		print("[OK] ", def["id"], " tier=", def["tier"],
			" attempts=", fresh.attempts_per_round,
			" bust=", fresh.bust_count,
			" value_bonus=", fresh.value_bonus,
			" safety=", fresh.safety_percent,
			" quota_mult=", fresh.quota_growth_multiplier,
			" cashout_bonus=", fresh.cashout_bonus_percent,
			" bag_bonus=", fresh.bag_size_bonus,
			" extra_life=", fresh.extra_life,
			" retreat_bonus=", fresh.retreat_bonus_percent,
			" trap_immunity=", fresh.bonus_trap_immunity)
		fresh.start_attempt()
		for i in 20:
			if fresh.state != fresh.State.DRAWING:
				break
			fresh.draw()
		fresh.queue_free()

	print("ALL_CHARMS_OK count=", run.CHARM_DEFS.size())
	quit()
