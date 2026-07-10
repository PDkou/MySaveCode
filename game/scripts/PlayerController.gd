extends CharacterBody3D

# First-person hunter controller: WASD + mouse look, simple grounded movement.
# No jump/crouch — the hunt is about where you choose to walk, not platforming.

signal moved

const SPEED := 4.2
const MOUSE_SENSITIVITY := 0.0028
const GRAVITY := 18.0

var camera: Camera3D
var yaw: float = 0.0
var pitch: float = 0.0
var input_enabled: bool = true


func _ready() -> void:
	var shape := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.4
	capsule.height = 1.7
	shape.shape = capsule
	shape.position.y = 0.85
	add_child(shape)

	camera = Camera3D.new()
	camera.position = Vector3(0, 1.55, 0)
	camera.fov = 75
	add_child(camera)


func set_input_enabled(enabled: bool) -> void:
	input_enabled = enabled
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED if enabled else Input.MOUSE_MODE_VISIBLE


func _unhandled_input(event: InputEvent) -> void:
	if not input_enabled:
		return
	if event is InputEventMouseMotion:
		yaw -= event.relative.x * MOUSE_SENSITIVITY
		pitch = clamp(pitch - event.relative.y * MOUSE_SENSITIVITY, -1.3, 1.3)
		rotation.y = yaw
		camera.rotation.x = pitch


func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity.y -= GRAVITY * delta
	else:
		velocity.y = 0.0

	if input_enabled:
		var input_dir := Vector2.ZERO
		if Input.is_action_pressed("ui_up") or Input.is_key_pressed(KEY_W):
			input_dir.y -= 1
		if Input.is_action_pressed("ui_down") or Input.is_key_pressed(KEY_S):
			input_dir.y += 1
		if Input.is_key_pressed(KEY_A):
			input_dir.x -= 1
		if Input.is_key_pressed(KEY_D):
			input_dir.x += 1
		input_dir = input_dir.normalized()

		var move_dir := (transform.basis * Vector3(input_dir.x, 0, input_dir.y)).normalized()
		velocity.x = move_dir.x * SPEED
		velocity.z = move_dir.z * SPEED
		if input_dir != Vector2.ZERO:
			moved.emit()
	else:
		velocity.x = 0.0
		velocity.z = 0.0

	move_and_slide()
