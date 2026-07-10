extends Node3D

# Spatializes RunManager's bag: one hidden ground marker per token, scattered
# across the hunting field. Walking into a marker triggers that specific
# token's draw() — replaces the old click-a-tile grid with "get caught by
# walking into it," per the lead's immersion direction (2026-07-10).

signal token_triggered(result: Dictionary)

const FIELD_RADIUS := 9.0
const MIN_SPACING := 2.2
const TRIGGER_RADIUS := 1.1
const DESPAWN_DELAY := 1.0

var run: Node
var markers: Dictionary = {}  # uid -> Area3D


func setup(run_manager: Node) -> void:
	run = run_manager


func clear_field() -> void:
	for uid in markers.keys():
		var m: Area3D = markers[uid]
		if is_instance_valid(m):
			m.queue_free()
	markers.clear()


func spawn_field(bag: Array) -> void:
	clear_field()
	var placed: Array = []
	for token in bag:
		var pos := _find_spot(placed)
		placed.append(pos)
		_spawn_marker(token, pos)


func marker_count() -> int:
	return markers.size()


func highlight_marker(uid: int, is_trap: bool) -> void:
	if not markers.has(uid):
		return
	var area: Area3D = markers[uid]
	var mesh: MeshInstance3D = area.get_node("Visual")
	var mat: StandardMaterial3D = mesh.material_override
	mat.emission_enabled = true
	mat.emission = Color(0.75, 0.20, 0.15) if is_trap else Color(0.30, 0.75, 0.35)
	mat.emission_energy_multiplier = 1.4


func _find_spot(placed: Array) -> Vector3:
	for i in 24:
		var angle := randf() * TAU
		var dist := randf_range(3.0, FIELD_RADIUS)
		var pos := Vector3(cos(angle) * dist, 0.0, sin(angle) * dist)
		var ok := true
		for p in placed:
			if pos.distance_to(p) < MIN_SPACING:
				ok = false
				break
		if ok:
			return pos
	return Vector3(randf_range(-FIELD_RADIUS, FIELD_RADIUS), 0.0, randf_range(-FIELD_RADIUS, FIELD_RADIUS))


func _spawn_marker(token: Dictionary, pos: Vector3) -> void:
	var area := Area3D.new()
	area.position = pos
	area.set_meta("triggered", false)

	var shape := CollisionShape3D.new()
	var sphere := SphereShape3D.new()
	sphere.radius = TRIGGER_RADIUS
	shape.shape = sphere
	area.add_child(shape)

	var mesh := MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = Vector3(0.9, 0.4, 0.9)
	mesh.mesh = box
	mesh.position.y = 0.2
	mesh.name = "Visual"
	var mat := StandardMaterial3D.new()
	# every marker looks like the same plain snow mound — prey and traps are
	# indistinguishable until triggered, or unless a scout charge reveals one.
	mat.albedo_color = Color(0.86, 0.90, 0.95)
	mesh.material_override = mat
	area.add_child(mesh)

	add_child(area)
	markers[token["uid"]] = area
	area.body_entered.connect(_on_body_entered.bind(area, token))


func _on_body_entered(_body: Node3D, area: Area3D, token: Dictionary) -> void:
	if area.get_meta("triggered", false):
		return
	area.set_meta("triggered", true)
	area.monitoring = false
	var result: Dictionary = run.draw(token["uid"])
	if result.is_empty():
		return
	_style_marker(area, result)
	markers.erase(token["uid"])
	token_triggered.emit(result)
	var timer := get_tree().create_timer(DESPAWN_DELAY)
	timer.timeout.connect(func():
		if is_instance_valid(area):
			area.queue_free()
	)


func _style_marker(area: Area3D, result: Dictionary) -> void:
	var mesh: MeshInstance3D = area.get_node("Visual")
	var mat: StandardMaterial3D = mesh.material_override
	var box: BoxMesh = mesh.mesh
	match result["kind"]:
		"trap":
			mat.albedo_color = Color(0.55, 0.14, 0.10)
			box.size.y = 0.12
		"dodged":
			mat.albedo_color = Color(0.35, 0.55, 0.35)
		"prey":
			mat.albedo_color = Color(0.85, 0.62, 0.20)
			box.size.y = 0.5 + min(result.get("chain_bonus", 0), 3) * 0.15
