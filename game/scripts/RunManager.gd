extends Node

signal state_changed
signal pot_changed(pot: int)
signal message(text: String, kind: String)

enum State { IDLE, DRAWING, ROUND_CLEAR, SHOP, GAME_OVER, RETREATED }

const BASE_QUOTA := 14
const QUOTA_GROWTH := 10
const BASE_ATTEMPTS := 3
const BASE_BUST_COUNT := 1
const BASE_BAG_SIZE := 10

const CHARM_DEFS := [
	{"id": "lucky_paw", "name": "행운의 발자국", "desc": "함정 토큰 1개 감소", "tier": "good"},
	{"id": "thick_fur", "name": "두꺼운 털가죽", "desc": "먹잇감 가치 +1", "tier": "good"},
	{"id": "safety_net", "name": "안전망", "desc": "함정에 걸려도 이번 사냥 식량의 50% 보존", "tier": "good"},
	{"id": "extra_hunt", "name": "추가 사냥", "desc": "라운드당 시도 횟수 +1", "tier": "good"},
	{"id": "steady_howl", "name": "차분한 울음", "desc": "다음 라운드부터 목표 증가폭 20% 감소", "tier": "good"},
	{"id": "moonlight", "name": "달빛 축복", "desc": "사냥 성공 시 획득 식량 10% 보너스", "tier": "good"},
	{"id": "greedy_claw", "name": "탐욕의 발톱", "desc": "먹잇감 가치 +3, 대신 함정 토큰 1개 추가", "tier": "risky"},
	{"id": "hasty_hunt", "name": "성급한 사냥", "desc": "시도 횟수 +1, 대신 다음부터 목표 증가폭 15% 증가", "tier": "risky"},
	{"id": "timid_pack", "name": "겁 많은 무리", "desc": "함정 피해 완전 무효화, 대신 라운드당 시도 횟수 -1", "tier": "risky"},
	{"id": "weary_steps", "name": "지친 발걸음", "desc": "라운드당 시도 횟수 -1 (보상 없음)", "tier": "bad"},
]

var state: State = State.IDLE
var round_number: int = 1
var quota: int = BASE_QUOTA
var attempts_left: int = BASE_ATTEMPTS
var attempts_per_round: int = BASE_ATTEMPTS
var bust_count: int = BASE_BUST_COUNT
var value_bonus: int = 0
var safety_percent: float = 0.0
var cashout_bonus_percent: float = 0.0
var quota_growth_multiplier: float = 1.0

var total_food: int = 0
var pot: int = 0
var bag: Array = []
var owned_charms: Array = []
var rerolls_left: int = 0


func start_run() -> void:
	round_number = 1
	quota = BASE_QUOTA
	attempts_per_round = BASE_ATTEMPTS + GameManager.get_bonus_attempts()
	bust_count = max(0, BASE_BUST_COUNT - GameManager.get_bonus_bust_reduction())
	value_bonus = 0
	safety_percent = 0.0
	cashout_bonus_percent = 0.0
	quota_growth_multiplier = 1.0
	total_food = 0
	owned_charms.clear()
	_start_round()


func start_attempt() -> void:
	if state != State.IDLE or attempts_left <= 0:
		return
	attempts_left -= 1
	pot = 0
	_build_bag()
	state = State.DRAWING
	state_changed.emit()
	pot_changed.emit(pot)


func draw() -> void:
	if state != State.DRAWING or bag.is_empty():
		return
	var token: int = bag.pop_back()
	if token == -1:
		_on_trap()
	else:
		pot += token
		pot_changed.emit(pot)
		if bag.is_empty():
			cash_out()


func cash_out() -> void:
	if state != State.DRAWING:
		return
	var bonus := int(pot * cashout_bonus_percent)
	message.emit("사냥 성공! 식량 +%d" % (pot + bonus), "success")
	total_food += pot + bonus
	pot = 0
	pot_changed.emit(pot)
	_resolve_after_attempt()


func retreat() -> void:
	if state != State.ROUND_CLEAR:
		return
	var earned := round_number * 5 + total_food
	message.emit("무리가 안전하게 귀환했다! 명성 +%d" % earned, "success")
	GameManager.report_extraction(round_number, total_food)
	state = State.RETREATED
	state_changed.emit()


func continue_hunting() -> void:
	if state != State.ROUND_CLEAR:
		return
	state = State.SHOP
	rerolls_left = GameManager.get_max_rerolls()
	state_changed.emit()


func use_reroll() -> void:
	if state != State.SHOP or rerolls_left <= 0:
		return
	rerolls_left -= 1
	state_changed.emit()


func skip_shop() -> void:
	if state != State.SHOP:
		return
	_next_round()


func pick_charm(id: String) -> void:
	if state != State.SHOP:
		return
	owned_charms.append(id)
	match id:
		"lucky_paw":
			bust_count = max(0, bust_count - 1)
		"thick_fur":
			value_bonus += 1
		"safety_net":
			safety_percent = 0.5
		"extra_hunt":
			attempts_per_round += 1
		"steady_howl":
			quota_growth_multiplier *= 0.8
		"moonlight":
			cashout_bonus_percent += 0.1
		"greedy_claw":
			value_bonus += 3
			bust_count += 1
		"hasty_hunt":
			attempts_per_round += 1
			quota_growth_multiplier *= 1.15
		"timid_pack":
			safety_percent = 1.0
			attempts_per_round = max(1, attempts_per_round - 1)
		"weary_steps":
			attempts_per_round = max(1, attempts_per_round - 1)
	_next_round()


func offer_charms() -> Array:
	var pool := CHARM_DEFS.filter(func(c): return not owned_charms.has(c["id"]))
	pool.shuffle()
	return pool.slice(0, min(3, pool.size()))


func _build_bag() -> void:
	bag.clear()
	var value_slots := BASE_BAG_SIZE - bust_count
	for i in value_slots:
		var roll := randi() % 100
		var base_value: int
		if roll < 55:
			base_value = 1
		elif roll < 85:
			base_value = 2
		else:
			base_value = 4
		bag.append(base_value + value_bonus)
	for i in bust_count:
		bag.append(-1)
	bag.shuffle()


func _on_trap() -> void:
	var kept := int(pot * safety_percent)
	message.emit("함정이다! 식량 %d만 겨우 건짐" % kept, "trap")
	total_food += kept
	pot = 0
	pot_changed.emit(pot)
	_resolve_after_attempt()


func _resolve_after_attempt() -> void:
	if total_food >= quota:
		state = State.ROUND_CLEAR
		state_changed.emit()
	elif attempts_left > 0:
		state = State.IDLE
		state_changed.emit()
	else:
		_game_over()


func _start_round() -> void:
	attempts_left = attempts_per_round
	state = State.IDLE
	state_changed.emit()


func _next_round() -> void:
	round_number += 1
	quota += int(QUOTA_GROWTH * quota_growth_multiplier)
	_start_round()


func _game_over() -> void:
	state = State.GAME_OVER
	state_changed.emit()
	GameManager.report_run_result(round_number)
