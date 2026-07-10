extends Node2D

# Winter's visible presence — moon, wolf silhouette, mood-lit eyes.
# Pure _draw() primitives (no textures) so it renders for free; the mood
# color is the entire "animation" budget, per the lead's simple-optimized
# graphics direction.

var mood: String = "calm"

const EYE_COLORS := {
	"calm": Color(0.55, 0.75, 0.88),     # ice blue — watching
	"pleased": Color(0.93, 0.68, 0.25),  # amber — enjoying your misfortune
	"wary": Color(0.78, 0.27, 0.20),     # red — you're doing too well
}


func set_mood(m: String) -> void:
	if mood != m:
		mood = m
		queue_redraw()


func _draw() -> void:
	# moon halo + crescent (cut by a bg-colored disc)
	draw_circle(Vector2(0, -6), 48, Color(0.55, 0.75, 0.88, 0.08))
	draw_circle(Vector2(0, -6), 34, Color(0.88, 0.93, 0.97, 0.9))
	draw_circle(Vector2(11, -13), 30, Color(0.059, 0.09, 0.141))

	# wolf head silhouette, angular per the moodboard's danger shape language
	var pts := PackedVector2Array([
		Vector2(-44, 30), Vector2(-26, 12), Vector2(-20, -10),
		Vector2(-14, -30), Vector2(-8, -12), Vector2(0, -14),
		Vector2(8, -30), Vector2(12, -10), Vector2(28, 2),
		Vector2(48, 16), Vector2(30, 22), Vector2(-44, 30),
	])
	draw_colored_polygon(pts, Color(0.03, 0.045, 0.07))

	# eyes: color = mood, faint outer glow
	var c: Color = EYE_COLORS.get(mood, EYE_COLORS["calm"])
	for eye_pos in [Vector2(-6, 2), Vector2(10, 4)]:
		draw_circle(eye_pos, 7.0, Color(c.r, c.g, c.b, 0.22))
		draw_circle(eye_pos, 3.2, c)
