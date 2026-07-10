# Mass simulation for balance/bug probing. Runs many full games inside a
# single engine process (does NOT relaunch Godot per run).
# Usage: godot --headless --path game --script test_mass_sim.gd -- <num_runs>
extends SceneTree

const DEFAULT_RUNS := 100000
const PER_RUN_SAFETY_CAP := 2000

func _initialize() -> void:
	var n := DEFAULT_RUNS
	var fresh_mode := false
	for arg in OS.get_cmdline_user_args():
		if arg.is_valid_int():
			n = arg.to_int()
		elif arg == "fresh":
			fresh_mode = true

	var t0 := Time.get_ticks_msec()

	var reached_round2 := 0
	var retreats := 0
	var game_overs := 0
	var stuck := 0
	var total_pelts := 0
	var max_round := 0
	var round_sum := 0
	var all_bad_shop_count := 0
	var shop_visits := 0
	var charm_pick_counts := {}
	var charm_offer_counts := {}
	var negative_food_bug := 0
	var deals_offered := 0
	var deals_accepted := 0
	var deal_counts := {}

	var run := Node.new()
	run.set_script(load("res://scripts/RunManager.gd"))
	root.add_child(run)
	var gm := root.get_node("GameManager")

	for i in n:
		if fresh_mode:
			gm.total_pelts = 0
		run.start_run()
		var steps := 0
		while run.state != run.State.GAME_OVER and run.state != run.State.RETREATED and steps < PER_RUN_SAFETY_CAP:
			steps += 1
			match run.state:
				run.State.IDLE:
					if not run.current_deal.is_empty():
						deals_offered += 1
						deal_counts[run.current_deal["id"]] = deal_counts.get(run.current_deal["id"], 0) + 1
						if randf() < 0.5:
							deals_accepted += 1
							run.accept_deal()
						else:
							run.refuse_deal()
					else:
						run.start_attempt()
				run.State.DRAWING:
					if run.total_food < 0:
						negative_food_bug += 1
					if run.pot < 20 and randf() < 0.85:
						run.draw()
					else:
						run.cash_out()
				run.State.ROUND_CLEAR:
					if randf() < 0.3:
						run.retreat()
					else:
						run.continue_hunting()
				run.State.SHOP:
					if run.rerolls_left > 0 and randf() < 0.3:
						run.use_reroll()
					else:
						var offers: Array = run.offer_charms()
						shop_visits += 1
						if offers.size() > 0:
							var all_bad := true
							for o in offers:
								if o["tier"] != "bad":
									all_bad = false
								if not charm_pick_counts.has(o["id"]):
									charm_pick_counts[o["id"]] = 0
								charm_offer_counts[o["id"]] = charm_offer_counts.get(o["id"], 0) + 1
							if all_bad:
								all_bad_shop_count += 1
							var pick: Dictionary = offers[randi() % offers.size()]
							charm_pick_counts[pick["id"]] = charm_pick_counts.get(pick["id"], 0) + 1
							run.pick_charm(pick["id"])
						else:
							run.skip_shop()

		if steps >= PER_RUN_SAFETY_CAP:
			stuck += 1

		if run.round_number >= 2:
			reached_round2 += 1
		round_sum += run.round_number
		max_round = max(max_round, run.round_number)

		if run.state == run.State.RETREATED:
			retreats += 1
		elif run.state == run.State.GAME_OVER:
			game_overs += 1

	total_pelts = gm.total_pelts

	var elapsed_ms := Time.get_ticks_msec() - t0

	print("===== MASS SIM REPORT (n=", n, ", mode=", ("fresh" if fresh_mode else "persistent"), ") =====")
	print("elapsed_ms=", elapsed_ms, " (", String.num(elapsed_ms / 1000.0, 2), "s, ",
		String.num(float(elapsed_ms) / n, 4), "ms/run)")
	print("reached_round2_or_more: ", reached_round2, " (", String.num(100.0 * reached_round2 / n, 2), "%)")
	print("retreats: ", retreats, " (", String.num(100.0 * retreats / n, 2), "%)")
	print("game_overs: ", game_overs, " (", String.num(100.0 * game_overs / n, 2), "%)")
	print("avg_round_reached: ", String.num(float(round_sum) / n, 3))
	print("max_round_reached: ", max_round)
	print("stuck_at_safety_cap: ", stuck)
	print("negative_food_observations: ", negative_food_bug)
	print("shop_visits: ", shop_visits)
	print("all_bad_shop_offers: ", all_bad_shop_count,
		" (", (String.num(100.0 * all_bad_shop_count / shop_visits, 2) if shop_visits > 0 else "n/a"), "% of visits)")
	print("deals_offered: ", deals_offered, " accepted: ", deals_accepted, " by_type: ", deal_counts)
	print("total_pelts_accumulated_in_gamemanager: ", total_pelts)
	print("charm_offer_counts: ", charm_offer_counts)
	print("charm_pick_counts: ", charm_pick_counts)
	quit()
