extends Node

signal state_changed
signal pot_changed(pot: int)
signal message(text: String)

enum State { IDLE, DRAWING, SHOP, GAME_OVER }

const BASE_QUOTA := 14
const QUOTA_GROWTH := 10
const BASE_ATTEMPTS := 3
const BASE_BUST_COUNT := 1
const BASE_BAG_SIZE := 10

const CHARM_DEFS := [
	{"id": "lucky_paw", "name": "행운의 발자국", "desc": "함정 토큰 1개 감소"},
	{"id": "thick_fur", "name": "두꺼운 털가죽", "desc": "먹잇감 가치 +1"},
	{"id": "safety_net", "name": "안전망", "desc": "함정에 걸려도 이번 사냥 식량의 50% 보존"},
	{"id": "extra_hunt", "name": "추가 사냥", "desc": "라운드당 시도 횟수 +1"},
	{"id": "steady_howl", "name": "차분한 울음", "desc": "다음 라운드부터 목표 증가폭 20% 감소"},
	{"id": "moonlight", "name": "달빛 축복", "desc": "사냥 성공 시 획득 식량 10% 보너스"},
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


func start_run() -> void:
	round_number = 1
	quota = BASE_QUOTA
	attempts_per_round = BASE_ATTEMPTS
	bust_count = BASE_BUST_COUNT
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
	message.emit("사냥 성공! 식량 +%d" % (pot + bonus))
	total_food += pot + bonus
	pot = 0
	pot_changed.emit(pot)
	_resolve_after_attempt()


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
	message.emit("함정이다! 식량 %d만 겨우 건짐" % kept)
	total_food += kept
	pot = 0
	pot_changed.emit(pot)
	_resolve_after_attempt()


func _resolve_after_attempt() -> void:
	if total_food >= quota:
		state = State.SHOP
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
