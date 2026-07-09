extends Node

signal state_changed
signal pot_changed(pot: int)
signal message(text: String, kind: String)

enum State { IDLE, DRAWING, ROUND_CLEAR, SHOP, GAME_OVER, RETREATED }

const BASE_QUOTA := 10
const QUOTA_GROWTH := 10
const BASE_ATTEMPTS := 4
const BASE_BUST_COUNT := 1
const MIN_BUST_COUNT := 1  # the bag must always keep at least one trap — risk can never be fully removed
const BASE_BAG_SIZE := 10

# Prey have identity (not just anonymous numbers) so charms can build
# synergies around specific types, the way Luck be a Landlord / Balatro's
# symbol systems create "discovery" depth instead of pure math.
const PREY_TYPES := [
	{"id": "rabbit", "name": "토끼", "icon": "●", "base_value": 1, "weight": 45},
	{"id": "fox", "name": "여우", "icon": "◆", "base_value": 2, "weight": 30},
	{"id": "deer", "name": "사슴", "icon": "▲", "base_value": 3, "weight": 15},
	{"id": "bear", "name": "곰", "icon": "★", "base_value": 5, "weight": 10},
]

# Charms are data: a list of {stat, amount[, type]} effects applied
# generically by _apply_effect(). Adding a new charm almost never needs new
# code — only a new "stat" needs a case in _apply_effect(), and only once.
const CHARM_DEFS := [
	{"id": "lucky_paw", "name": "행운의 발자국", "desc": "함정 토큰 1개 감소 (최소 1개는 유지), 정찰 +1회", "tier": "good",
		"effects": [{"stat": "bust_count", "amount": -1}, {"stat": "bonus_scouts", "amount": 1}]},
	{"id": "thick_fur", "name": "두꺼운 털가죽", "desc": "먹잇감 가치 +1 (전 종류)", "tier": "good",
		"effects": [{"stat": "value_bonus", "amount": 1}]},
	{"id": "fat_reserves", "name": "두둑한 비축", "desc": "먹잇감 가치 +2 (전 종류)", "tier": "good",
		"effects": [{"stat": "value_bonus", "amount": 2}]},
	{"id": "safety_net", "name": "안전망", "desc": "함정에 걸려도 이번 사냥 식량의 50% 보존", "tier": "good",
		"effects": [{"stat": "safety_percent", "amount": 0.5}]},
	{"id": "sure_footing", "name": "확실한 발걸음", "desc": "함정 손실 방어 +25% (중첩 가능)", "tier": "good",
		"effects": [{"stat": "safety_percent", "amount": 0.25}]},
	{"id": "extra_hunt", "name": "추가 사냥", "desc": "라운드당 시도 횟수 +1", "tier": "good",
		"effects": [{"stat": "attempts_per_round", "amount": 1}]},
	{"id": "steady_howl", "name": "차분한 울음", "desc": "다음 라운드부터 목표 증가폭 20% 감소", "tier": "good",
		"effects": [{"stat": "quota_growth_multiplier", "amount": 0.8}]},
	{"id": "moonlight", "name": "달빛 축복", "desc": "사냥 성공 시 획득 식량 10% 보너스", "tier": "good",
		"effects": [{"stat": "cashout_bonus_percent", "amount": 0.1}]},
	{"id": "trackers_eye", "name": "추적자의 눈", "desc": "매 사냥마다 정찰 +1회 (다음 뽑을 것을 미리 확인)", "tier": "good",
		"effects": [{"stat": "bonus_scouts", "amount": 1}]},
	{"id": "keen_instinct", "name": "타고난 감각", "desc": "정찰 +2회, 대신 함정 토큰 1개 추가", "tier": "risky",
		"effects": [{"stat": "bonus_scouts", "amount": 2}, {"stat": "bust_count", "amount": 1}]},
	{"id": "wide_pouch", "name": "넉넉한 주머니", "desc": "주머니 속 사냥감 슬롯 +2 (함정 개수는 그대로)", "tier": "good",
		"effects": [{"stat": "bag_size_bonus", "amount": 2}]},
	{"id": "keen_nose", "name": "예민한 코", "desc": "매 라운드 첫 함정 자동 회피", "tier": "good",
		"effects": [{"stat": "bonus_trap_immunity", "amount": 1}]},
	{"id": "sharp_eyes", "name": "날카로운 눈", "desc": "매 라운드 함정 자동 회피 +1회 (중첩 가능)", "tier": "good",
		"effects": [{"stat": "bonus_trap_immunity", "amount": 1}]},
	{"id": "packmother_blessing", "name": "무리 어미의 축복", "desc": "게임 오버 1회 무효 (목숨 보험)", "tier": "good",
		"effects": [{"stat": "extra_life", "amount": 1}]},
	{"id": "homeward_scent", "name": "귀향의 냄새", "desc": "귀환 시 명성 +20%", "tier": "good",
		"effects": [{"stat": "retreat_bonus_percent", "amount": 0.2}]},
	{"id": "rabbit_hunter", "name": "토끼 사냥꾼", "desc": "토끼 가치 +2", "tier": "good",
		"effects": [{"stat": "type_bonus", "type": "rabbit", "amount": 2}]},
	{"id": "fox_tracker", "name": "여우 추적자", "desc": "여우 가치 +2", "tier": "good",
		"effects": [{"stat": "type_bonus", "type": "fox", "amount": 2}]},
	{"id": "deer_eye", "name": "사슴의 눈썰미", "desc": "사슴 가치 +3", "tier": "good",
		"effects": [{"stat": "type_bonus", "type": "deer", "amount": 3}]},
	{"id": "bear_pride", "name": "곰 사냥의 긍지", "desc": "곰 가치 +5", "tier": "good",
		"effects": [{"stat": "type_bonus", "type": "bear", "amount": 5}]},
	{"id": "greedy_claw", "name": "탐욕의 발톱", "desc": "먹잇감 가치 +3, 대신 함정 토큰 1개 추가", "tier": "risky",
		"effects": [{"stat": "value_bonus", "amount": 3}, {"stat": "bust_count", "amount": 1}]},
	{"id": "hasty_hunt", "name": "성급한 사냥", "desc": "시도 횟수 +1, 대신 다음부터 목표 증가폭 15% 증가", "tier": "risky",
		"effects": [{"stat": "attempts_per_round", "amount": 1}, {"stat": "quota_growth_multiplier", "amount": 1.15}]},
	{"id": "timid_pack", "name": "겁 많은 무리", "desc": "함정 피해 완전 무효화, 대신 시도 횟수 -1", "tier": "risky",
		"effects": [{"stat": "safety_percent", "amount": 1.0}, {"stat": "attempts_per_round", "amount": -1}]},
	{"id": "bold_leap", "name": "대담한 도약", "desc": "먹잇감 가치 +2, 대신 함정 방어 전부 초기화", "tier": "risky",
		"effects": [{"stat": "value_bonus", "amount": 2}, {"stat": "safety_percent", "amount": -1.0}]},
	{"id": "night_hunt", "name": "밤 사냥", "desc": "시도 횟수 +2, 대신 함정 토큰 1개 추가", "tier": "risky",
		"effects": [{"stat": "attempts_per_round", "amount": 2}, {"stat": "bust_count", "amount": 1}]},
	{"id": "reckless_pace", "name": "무모한 질주", "desc": "캐시아웃 보너스 +25%, 대신 목표 증가폭 20% 증가", "tier": "risky",
		"effects": [{"stat": "cashout_bonus_percent", "amount": 0.25}, {"stat": "quota_growth_multiplier", "amount": 1.2}]},
	{"id": "cramped_pouch", "name": "비좁은 주머니", "desc": "함정 1개 감소, 대신 먹잇감 가치 -1", "tier": "risky",
		"effects": [{"stat": "bust_count", "amount": -1}, {"stat": "value_bonus", "amount": -1}]},
	{"id": "moon_howl", "name": "만월의 하울", "desc": "캐시아웃 보너스 +15%, 대신 함정 토큰 1개 추가", "tier": "risky",
		"effects": [{"stat": "cashout_bonus_percent", "amount": 0.15}, {"stat": "bust_count", "amount": 1}]},
	{"id": "warm_den", "name": "따뜻한 굴", "desc": "귀환 시 명성 +10%, 대신 시도 횟수 -1", "tier": "risky",
		"effects": [{"stat": "retreat_bonus_percent", "amount": 0.1}, {"stat": "attempts_per_round", "amount": -1}]},
	{"id": "old_scar", "name": "오래된 흉터", "desc": "목숨 보험 +1, 대신 먹잇감 가치 -1", "tier": "risky",
		"effects": [{"stat": "extra_life", "amount": 1}, {"stat": "value_bonus", "amount": -1}]},
	{"id": "specialist_hunter", "name": "특화 사냥꾼", "desc": "곰 가치 +6, 대신 토끼 가치 -1", "tier": "risky",
		"effects": [{"stat": "type_bonus", "type": "bear", "amount": 6}, {"stat": "type_bonus", "type": "rabbit", "amount": -1}]},
	{"id": "weary_steps", "name": "지친 발걸음", "desc": "라운드당 시도 횟수 -1 (보상 없음)", "tier": "bad",
		"effects": [{"stat": "attempts_per_round", "amount": -1}]},
	{"id": "thin_pouch", "name": "얇은 주머니", "desc": "주머니 속 사냥감 슬롯 -2 (보상 없음)", "tier": "bad",
		"effects": [{"stat": "bag_size_bonus", "amount": -2}]},
	{"id": "nervous_pack", "name": "불안한 무리", "desc": "목표 증가폭 25% 증가 (보상 없음)", "tier": "bad",
		"effects": [{"stat": "quota_growth_multiplier", "amount": 1.25}]},
	{"id": "clumsy_paws", "name": "서투른 발", "desc": "함정 토큰 1개 추가 (보상 없음)", "tier": "bad",
		"effects": [{"stat": "bust_count", "amount": 1}]},
	{"id": "clumsy_bear", "name": "서투른 곰사냥", "desc": "곰 가치 -2 (보상 없음)", "tier": "bad",
		"effects": [{"stat": "type_bonus", "type": "bear", "amount": -2}]},
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
var bag_size_bonus: int = 0
var extra_life: int = 0
var retreat_bonus_percent: float = 0.0
var bonus_trap_immunity: int = 0
var trap_immunity_left: int = 0
var type_bonus: Dictionary = {}
var bonus_scouts: int = 0
var scouts_left: int = 0

var total_food: int = 0
var pot: int = 0
var bag: Array = []
var owned_charms: Array = []
var rerolls_left: int = 0


func start_run() -> void:
	round_number = 1
	quota = BASE_QUOTA
	attempts_per_round = BASE_ATTEMPTS + GameManager.get_bonus_attempts()
	bust_count = max(MIN_BUST_COUNT, BASE_BUST_COUNT - GameManager.get_bonus_bust_reduction())
	value_bonus = 0
	safety_percent = 0.0
	cashout_bonus_percent = 0.0
	quota_growth_multiplier = 1.0
	bag_size_bonus = 0
	extra_life = 0
	retreat_bonus_percent = 0.0
	bonus_trap_immunity = 0
	type_bonus.clear()
	bonus_scouts = 0
	total_food = 0
	owned_charms.clear()
	_start_round()


func scout() -> Dictionary:
	if state != State.DRAWING or scouts_left <= 0 or bag.is_empty():
		return {}
	scouts_left -= 1
	var next: Dictionary = bag.back()
	if next["type"] == "trap":
		message.emit("정찰 결과: 다음은 함정이다!", "trap")
	else:
		message.emit("정찰 결과: 다음은 %s %s (+%d)" % [next["icon"], next["name"], next["value"]], "neutral")
	return next


func start_attempt() -> void:
	if state != State.IDLE or attempts_left <= 0:
		return
	scouts_left = 1 + bonus_scouts
	attempts_left -= 1
	pot = 0
	_build_bag()
	state = State.DRAWING
	state_changed.emit()
	pot_changed.emit(pot)


func draw(precise: bool = false) -> Dictionary:
	if state != State.DRAWING or bag.is_empty():
		return {}
	var token: Dictionary = bag.pop_back()
	if token["type"] == "trap":
		if precise:
			message.emit("정확한 일격으로 함정을 쳐냈다!", "success")
			if bag.is_empty():
				cash_out()
			return {"kind": "parried"}
		if trap_immunity_left > 0:
			trap_immunity_left -= 1
			message.emit("무리가 함정을 미리 감지해 피했다!", "success")
			if bag.is_empty():
				cash_out()
			return {"kind": "dodged"}
		_on_trap()
		return {"kind": "trap"}
	else:
		var bonus: int = 2 if precise else 0
		var value: int = token["value"] + bonus
		pot += value
		if precise:
			message.emit("정확한 일격! %s %s (+%d)" % [token["icon"], token["name"], value], "neutral")
		else:
			message.emit("%s %s 발견 (+%d)" % [token["icon"], token["name"], value], "neutral")
		pot_changed.emit(pot)
		if bag.is_empty():
			cash_out()
		return {"kind": "prey", "value": value, "type": token["type"], "name": token["name"], "icon": token["icon"], "precise": precise}


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
	var base_earned := round_number * 5 + total_food
	var earned := base_earned + int(base_earned * retreat_bonus_percent)
	message.emit("무리가 안전하게 귀환했다! 명성 +%d" % earned, "success")
	GameManager.report_extraction(round_number, earned)
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
	var def := _find_charm_def(id)
	if def:
		for effect in def.get("effects", []):
			_apply_effect(effect)
	_next_round()


func offer_charms() -> Array:
	var pool := CHARM_DEFS.filter(func(c): return not owned_charms.has(c["id"]))
	pool.shuffle()
	return pool.slice(0, min(3, pool.size()))


# --- risk indicator: surfaces the odds that are already implicit in the
# shuffled bag, so "draw again?" becomes an informed bet instead of a
# blind click (see GDD.md design-meeting notes, 2026-07-09). ---
func remaining_trap_count() -> int:
	var c := 0
	for t in bag:
		if t["type"] == "trap":
			c += 1
	return c


func remaining_tile_count() -> int:
	return bag.size()


func _find_charm_def(id: String) -> Dictionary:
	for c in CHARM_DEFS:
		if c["id"] == id:
			return c
	return {}


func _apply_effect(effect: Dictionary) -> void:
	var amount = effect["amount"]
	match effect["stat"]:
		"bust_count":
			bust_count = max(MIN_BUST_COUNT, bust_count + int(amount))
		"value_bonus":
			value_bonus += int(amount)
		"safety_percent":
			safety_percent = clamp(safety_percent + amount, 0.0, 1.0)
		"attempts_per_round":
			attempts_per_round = max(1, attempts_per_round + int(amount))
		"quota_growth_multiplier":
			quota_growth_multiplier *= amount
		"cashout_bonus_percent":
			cashout_bonus_percent = max(0.0, cashout_bonus_percent + amount)
		"bag_size_bonus":
			bag_size_bonus += int(amount)
		"extra_life":
			extra_life = max(0, extra_life + int(amount))
		"retreat_bonus_percent":
			retreat_bonus_percent = max(0.0, retreat_bonus_percent + amount)
		"bonus_trap_immunity":
			bonus_trap_immunity = max(0, bonus_trap_immunity + int(amount))
		"type_bonus":
			var t: String = effect["type"]
			type_bonus[t] = type_bonus.get(t, 0) + int(amount)
		"bonus_scouts":
			bonus_scouts = max(0, bonus_scouts + int(amount))


func _roll_prey_type() -> Dictionary:
	var total_weight := 0
	for p in PREY_TYPES:
		total_weight += p["weight"]
	var roll := randi() % total_weight
	var acc := 0
	for p in PREY_TYPES:
		acc += p["weight"]
		if roll < acc:
			return p
	return PREY_TYPES[0]


func _build_bag() -> void:
	bag.clear()
	var value_slots: int = max(1, BASE_BAG_SIZE + bag_size_bonus - bust_count)
	for i in value_slots:
		var prey := _roll_prey_type()
		var value: int = max(0, prey["base_value"] + value_bonus + type_bonus.get(prey["id"], 0))
		bag.append({"type": prey["id"], "value": value, "name": prey["name"], "icon": prey["icon"]})
	for i in bust_count:
		bag.append({"type": "trap", "value": -1})
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
	trap_immunity_left = bonus_trap_immunity
	state = State.IDLE
	state_changed.emit()


func _next_round() -> void:
	round_number += 1
	quota += int(QUOTA_GROWTH * quota_growth_multiplier)
	_start_round()


func _game_over() -> void:
	if extra_life > 0:
		extra_life -= 1
		message.emit("무리 중 하나가 대신 희생해 살아남았다...", "trap")
		attempts_left = 1
		state = State.IDLE
		state_changed.emit()
		return
	state = State.GAME_OVER
	state_changed.emit()
	GameManager.report_run_result(round_number)
