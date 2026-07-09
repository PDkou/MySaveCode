extends Node

const SAVE_PATH := "user://savegame.dat"

var best_round: int = 0


func _ready() -> void:
	_load_best()


func report_run_result(round_reached: int) -> void:
	if round_reached > best_round:
		best_round = round_reached
		_save_best()


func _load_best() -> void:
	if FileAccess.file_exists(SAVE_PATH):
		var f := FileAccess.open(SAVE_PATH, FileAccess.READ)
		if f:
			best_round = f.get_32()
			f.close()


func _save_best() -> void:
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f:
		f.store_32(best_round)
		f.close()
