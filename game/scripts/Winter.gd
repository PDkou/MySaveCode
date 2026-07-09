extends RefCounted

# "겨울" — the personified opponent. Per Inscryption's design lesson: the
# antagonist doesn't need deep AI, just a consistent voice that reacts to
# what the player does. Cold, ancient, amused by tenacity, never surprised.

const TRAP_LINES := [
	"이빨을 보았나?",
	"겨울다운 인사로군.",
	"숨을 곳은 없다.",
	"잊었나, 여긴 내 영역이다.",
]
const ROUND_CLEAR_LINES := [
	"버텼군. 하지만 다음은 더 춥다.",
	"여기까지가 다인가?",
	"제법이군... 이번엔.",
]
const RETREAT_LINES := [
	"현명한 선택이다... 이번엔.",
	"돌아서는 자에게 박수를.",
	"살아서 도망치는군.",
]
const CONTINUE_LINES := [
	"탐욕이군. 마음에 든다.",
	"후회하게 될 거다.",
	"좋아, 계속해보지.",
]
const GAME_OVER_LINES := [
	"겨울은 언제나 이긴다.",
	"무리는... 여기까지였군.",
	"다음 생엔 더 신중하길.",
]
const SHOP_LINES := [
	"그 힘, 오래가진 않을 거다.",
	"무엇을 챙기든, 나는 여전히 겨울이다.",
]
const SCOUT_LINES := [
	"훔쳐본다고 달라지진 않는다.",
	"미리 본들 무슨 소용이지.",
]


static func line(bank: Array) -> String:
	return bank[randi() % bank.size()]
