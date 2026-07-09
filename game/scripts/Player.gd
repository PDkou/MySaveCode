extends Area2D

const LANE_COUNT := 3
const LANE_WIDTH := 140.0
const MOVE_SPEED := 900.0
const BODY_SIZE := Vector2(56, 56)

var current_lane: int = 1
var lanes_x: Array[float] = []


func setup(viewport_width: float, y: float) -> void:
	position.y = y
	lanes_x.clear()
	var start_x := viewport_width / 2.0 - LANE_WIDTH
	for i in LANE_COUNT:
		lanes_x.append(start_x + i * LANE_WIDTH)
	current_lane = 1
	position.x = lanes_x[current_lane]

	var shape := CollisionShape2D.new()
	var rect := RectangleShape2D.new()
	rect.size = BODY_SIZE
	shape.shape = rect
	add_child(shape)

	var visual := ColorRect.new()
	visual.size = BODY_SIZE
	visual.position = -BODY_SIZE / 2.0
	visual.color = Color(0.25, 0.85, 0.95)
	add_child(visual)

	collision_layer = 1
	collision_mask = 2
	area_entered.connect(_on_area_entered)


func reset() -> void:
	current_lane = 1
	if not lanes_x.is_empty():
		position.x = lanes_x[current_lane]


func _unhandled_input(event: InputEvent) -> void:
	if GameManager.state != GameManager.State.PLAYING:
		return
	if event.is_action_pressed("ui_left"):
		move_lane(-1)
	elif event.is_action_pressed("ui_right"):
		move_lane(1)
	elif event is InputEventMouseButton and event.pressed:
		_handle_tap(event.position.x)
	elif event is InputEventScreenTouch and event.pressed:
		_handle_tap(event.position.x)


func _handle_tap(x: float) -> void:
	var viewport_width := get_viewport_rect().size.x
	if x < viewport_width / 2.0:
		move_lane(-1)
	else:
		move_lane(1)


func move_lane(direction: int) -> void:
	current_lane = clamp(current_lane + direction, 0, LANE_COUNT - 1)


func _process(delta: float) -> void:
	if lanes_x.is_empty():
		return
	var target_x: float = lanes_x[current_lane]
	position.x = move_toward(position.x, target_x, MOVE_SPEED * delta)


func _on_area_entered(area: Area2D) -> void:
	if GameManager.state != GameManager.State.PLAYING:
		return
	if area.has_method("on_hit_player"):
		area.on_hit_player(self)
