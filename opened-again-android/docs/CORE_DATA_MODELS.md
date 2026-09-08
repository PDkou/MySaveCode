# CORE_DATA_MODELS

```kotlin
enum class EventType { FOREGROUND, BACKGROUND, SCREEN_ON, SCREEN_OFF, UNLOCK }

data class AppUsageEvent(
    val packageName: String?,
    val type: EventType,
    val timestamp: Long
)

data class AppVisit(
    val packageName: String,
    val startTime: Long,
    val endTime: Long
)

data class UsageSession(
    val startTime: Long,
    val endTime: Long,
    val visits: List<AppVisit>,
    val unlockTime: Long?
)

enum class Rarity { NORMAL, RARE, EPIC, LEGENDARY, HIDDEN }
```

`DetectedIncident`는 사건 종류/등급/점수/시간/주요 패키지/metrics/related를 가진다.
`DailyUsageSummary`는 하루 총 사용시간, 오픈 수, 전환 수, 고유 앱 수, 잠금해제 세션 수, 심야 사용시간, 상위 패키지를 가진다.
