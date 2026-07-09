extends Node

signal score_changed(score: int)
signal game_over(score: int, best: int)

enum State { READY, PLAYING, GAME_OVER }

const SAVE_PATH := "user://savegame.dat"
const BASE_SPEED := 220.0
const SPEED_INCREASE_PER_SEC := 6.0

var state: State = State.READY
var score: int = 0
var best_score: int = 0
var speed: float = BASE_SPEED


func _ready() -> void:
	_load_best()


func start_game() -> void:
	state = State.PLAYING
	score = 0
	speed = BASE_SPEED
	score_changed.emit(score)


func add_score(amount: int) -> void:
	if state != State.PLAYING:
		return
	score += amount
	score_changed.emit(score)


func end_game() -> void:
	if state != State.PLAYING:
		return
	state = State.GAME_OVER
	if score > best_score:
		best_score = score
		_save_best()
	game_over.emit(score, best_score)


func _process(delta: float) -> void:
	if state == State.PLAYING:
		speed += SPEED_INCREASE_PER_SEC * delta


func _load_best() -> void:
	if FileAccess.file_exists(SAVE_PATH):
		var f := FileAccess.open(SAVE_PATH, FileAccess.READ)
		if f:
			best_score = f.get_32()
			f.close()


func _save_best() -> void:
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f:
		f.store_32(best_score)
		f.close()
