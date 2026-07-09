extends Area2D

const RADIUS := 16.0
const VALUE := 10

var fall_speed: float = 220.0


func setup(x: float, y: float) -> void:
	position = Vector2(x, y)

	var shape := CollisionShape2D.new()
	var circle := CircleShape2D.new()
	circle.radius = RADIUS
	shape.shape = circle
	add_child(shape)

	var visual := ColorRect.new()
	visual.size = Vector2(RADIUS * 2.0, RADIUS * 2.0)
	visual.position = Vector2(-RADIUS, -RADIUS)
	visual.color = Color(1.0, 0.85, 0.2)
	add_child(visual)

	collision_layer = 2
	collision_mask = 0


func _process(delta: float) -> void:
	position.y += fall_speed * delta
	if position.y > get_viewport_rect().size.y + 100.0:
		queue_free()


func on_hit_player(_player: Area2D) -> void:
	GameManager.add_score(VALUE)
	queue_free()
