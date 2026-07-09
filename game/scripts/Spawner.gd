extends Node

const LANE_COUNT := 3
const LANE_WIDTH := 140.0
const MIN_INTERVAL := 0.45
const MAX_INTERVAL := 0.9
const OBSTACLE_CHANCE := 0.35
const COIN_CHANCE := 0.5

var lanes_x: Array[float] = []
var spawn_holder: Node2D
var spawn_timer: Timer


func setup(parent_for_spawns: Node2D, viewport_width: float) -> void:
	spawn_holder = parent_for_spawns
	lanes_x.clear()
	var start_x := viewport_width / 2.0 - LANE_WIDTH
	for i in LANE_COUNT:
		lanes_x.append(start_x + i * LANE_WIDTH)

	spawn_timer = Timer.new()
	add_child(spawn_timer)
	spawn_timer.one_shot = true
	spawn_timer.timeout.connect(_on_timer_timeout)


func start() -> void:
	_schedule_next()


func stop() -> void:
	spawn_timer.stop()
	for child in spawn_holder.get_children():
		child.queue_free()


func _schedule_next() -> void:
	spawn_timer.start(randf_range(MIN_INTERVAL, MAX_INTERVAL))


func _on_timer_timeout() -> void:
	if GameManager.state != GameManager.State.PLAYING:
		return
	_spawn_wave()
	_schedule_next()


func _spawn_wave() -> void:
	var safe_lane := randi() % LANE_COUNT
	for i in LANE_COUNT:
		if i == safe_lane:
			continue
		var x: float = lanes_x[i]
		var roll := randf()
		if roll < OBSTACLE_CHANCE:
			_spawn_obstacle(x)
		elif roll < COIN_CHANCE:
			_spawn_coin(x)


func _spawn_obstacle(x: float) -> void:
	var obstacle := Area2D.new()
	obstacle.set_script(load("res://scripts/Obstacle.gd"))
	spawn_holder.add_child(obstacle)
	obstacle.setup(x, -60.0, Vector2(70, 70), Color(0.9, 0.3, 0.35))
	obstacle.fall_speed = GameManager.speed


func _spawn_coin(x: float) -> void:
	var coin := Area2D.new()
	coin.set_script(load("res://scripts/Coin.gd"))
	spawn_holder.add_child(coin)
	coin.setup(x, -60.0)
	coin.fall_speed = GameManager.speed
