extends Node

const SAVE_PATH := "user://savegame.dat"

const BONUS_ATTEMPT_PELT_THRESHOLD := 50
const BONUS_BUST_REDUCTION_PELT_THRESHOLD := 150
const REROLL_UNLOCK_PELT_THRESHOLD := 100

var best_round: int = 0
var total_pelts: int = 0


func _ready() -> void:
	_load_data()


func report_run_result(round_reached: int) -> void:
	if round_reached > best_round:
		best_round = round_reached
		_save_data()


func report_extraction(round_reached: int, food_banked: int) -> void:
	total_pelts += round_reached * 5 + food_banked
	if round_reached > best_round:
		best_round = round_reached
	_save_data()


func get_bonus_attempts() -> int:
	return 1 if total_pelts >= BONUS_ATTEMPT_PELT_THRESHOLD else 0


func get_bonus_bust_reduction() -> int:
	return 1 if total_pelts >= BONUS_BUST_REDUCTION_PELT_THRESHOLD else 0


func get_max_rerolls() -> int:
	return 1 if total_pelts >= REROLL_UNLOCK_PELT_THRESHOLD else 0


func _load_data() -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		return
	var f := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if not f:
		return
	best_round = f.get_32()
	if f.get_position() < f.get_length():
		total_pelts = f.get_32()
	f.close()


func _save_data() -> void:
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f:
		f.store_32(best_round)
		f.store_32(total_pelts)
		f.close()
