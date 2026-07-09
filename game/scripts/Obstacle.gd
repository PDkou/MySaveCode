extends Area2D

var fall_speed: float = 220.0


func setup(x: float, y: float, size: Vector2, color: Color) -> void:
	position = Vector2(x, y)

	var shape := CollisionShape2D.new()
	var rect := RectangleShape2D.new()
	rect.size = size
	shape.shape = rect
	add_child(shape)

	var visual := ColorRect.new()
	visual.size = size
	visual.position = -size / 2.0
	visual.color = color
	add_child(visual)

	collision_layer = 2
	collision_mask = 0


func _process(delta: float) -> void:
	position.y += fall_speed * delta
	if position.y > get_viewport_rect().size.y + 100.0:
		queue_free()


func on_hit_player(_player: Area2D) -> void:
	GameManager.end_game()
