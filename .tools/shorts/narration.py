#!/usr/bin/env python3
"""쇼츠 나레이션 (Typecast API)

사용법
  python3 narration.py voices "밝고 또렷한 20~30대 여성 정보 전달 쇼츠"   # 목소리 후보 찾기
  python3 narration.py sub                                              # 남은 크레딧 확인
  python3 narration.py tts spec.json 작업폴더                            # 장면별 나레이션 → 작업폴더/narration.m4a

spec.json 의 scenes 에 "say": "읽을 문장" 을 넣으면 그 장면 시작(s) 0.1초 뒤에 나레이션이 깔린다.
장면 길이(e - s)보다 길면 말 속도(tempo)를 최대 1.3배까지 올려 맞추고, 그래도 길면 경고한다.

API 키: 환경 변수 TYPECAST_API_KEY. 키를 세션 환경에 '네트워크 비밀'로 저장해 두면
프록시가 X-API-KEY 헤더를 넣어 주므로 코드에는 키를 두지 않는다. (키를 파일·로그·저장소에 남기지 말 것)
설정(목소리·모델·기본 속도): 같은 폴더 typecast.json
"""
import json, os, subprocess, sys
from pathlib import Path

from typecast import Typecast
from typecast.models import TTSRequest, SmartPrompt, PresetPrompt, Output

HERE = Path(__file__).resolve().parent
CONF = json.loads((HERE / "typecast.json").read_text(encoding="utf-8"))

# Typecast 통합 출처 표시 (Typecast 요청에 따라 유지: API 페이지 안내로 Claude Code 가 작성)
TYPECAST_SOURCE = "api-page"
TYPECAST_GENERATED_BY = "claude-code"


def client() -> Typecast:
    return Typecast(
        api_key=os.environ.get("TYPECAST_API_KEY", "injected-by-proxy"),
        source=TYPECAST_SOURCE,
        generated_by=TYPECAST_GENERATED_BY,
    )


def duration(path: Path) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                       capture_output=True, text=True, check=True)
    return float(r.stdout.strip())


def cmd_voices(query: str):
    c = client()
    for rv in c.recommend_voices(query, count=5):
        try:
            v = c.voice_v3(rv.voice_id)
            extra = v.model_dump(exclude_none=True)
            info = {k: extra.get(k) for k in ("gender", "age", "use_cases", "models") if k in extra}
        except Exception as e:  # 상세 조회 실패해도 후보는 보여 준다
            info = {"detail_error": str(e)}
        print(json.dumps({"voice_id": rv.voice_id, "name": rv.voice_name, "score": rv.score, **info},
                         ensure_ascii=False, default=str))


def cmd_sub():
    print(client().get_my_subscription().model_dump_json(indent=1))


def say_one(c: Typecast, text: str, prev: str, nxt: str, tempo: float, out: Path):
    # 감정: CONF["emotion"] 이 있으면 고정 감정(happy·toneup 등, 세기 0~2), 없으면 문맥으로 추론(smart)
    emo = CONF.get("emotion")
    prompt = (PresetPrompt(emotion_preset=emo, emotion_intensity=CONF.get("emotion_intensity", 1.3)) if emo
              else SmartPrompt(emotion_type="smart", previous_text=prev or None, next_text=nxt or None))
    req = TTSRequest(
        text=text, model=CONF["model"], voice_id=CONF["voice_id"], language=CONF.get("language", "kor"),
        prompt=prompt,
        output=Output(audio_tempo=tempo, audio_format="wav"),
    )
    out.write_bytes(c.text_to_speech(req).audio_data)


def cmd_tts(spec_path: str, workdir: str):
    spec = json.loads(Path(spec_path).read_text(encoding="utf-8"))
    for k in ("emotion", "emotion_intensity", "tempo"):  # spec 이 설정 파일 값을 덮어씀
        if k in spec: CONF[k] = spec[k]
    pool = CONF.get("voices") or {}
    if spec.get("voice") in pool:
        CONF["voice_id"] = pool[spec["voice"]]
    elif not CONF.get("voice_id") and pool:  # 이름 지정이 없으면 파일 이름 기준으로 돌아가며 고른다
        names = sorted(pool); CONF["voice_id"] = pool[names[sum(map(ord, Path(spec_path).stem)) % len(names)]]
    if not CONF.get("voice_id"):
        sys.exit("typecast.json 에 voices 또는 voice_id 를 먼저 넣으세요")
    print("목소리:", next((k for k, v in pool.items() if v == CONF["voice_id"]), CONF["voice_id"]))
    W = Path(workdir); W.mkdir(parents=True, exist_ok=True)
    scenes = spec["scenes"]; lines = [s.get("say", "") for s in scenes]
    c = client(); parts = []
    for i, sc in enumerate(scenes):
        if not lines[i]:
            continue
        room = (sc["e"] - sc["s"]) - 0.2
        tempo = CONF.get("tempo", 1.0); f = W / f"say{i}.wav"
        while True:
            say_one(c, lines[i], lines[i - 1] if i else "", lines[i + 1] if i + 1 < len(lines) else "", tempo, f)
            d = duration(f)
            if d <= room or tempo >= 1.3:
                break
            tempo = min(1.3, round(tempo * d / room + 0.02, 2))
        if d > room:
            print(f"경고: 장면 {i} 나레이션 {d:.1f}초 > 장면 {room:.1f}초. 문장을 줄이거나 장면을 늘리세요")
        print(f"장면 {i}: {d:.1f}초 (속도 {tempo}) {lines[i]}")
        parts.append((f, sc["s"] + 0.1))
    if not parts:
        sys.exit("say 가 있는 장면이 없습니다")
    ins, flt = [], []
    for k, (f, at) in enumerate(parts):
        ins += ["-i", str(f)]
        flt.append(f"[{k}:a]aresample=44100,adelay={int(at * 1000)}:all=1[a{k}]")
    mix = "".join(f"[a{k}]" for k in range(len(parts))) + f"amix=inputs={len(parts)}:normalize=0,loudnorm=I=-14:TP=-1.5,apad,atrim=0:{spec['total']}[out]"
    subprocess.run(["ffmpeg", "-y", "-v", "error", *ins, "-filter_complex", ";".join(flt + [mix]),
                    "-map", "[out]", "-ac", "2", "-c:a", "aac", "-b:a", "160k", str(W / "narration.m4a")], check=True)
    print("완료", W / "narration.m4a")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["voices"] and len(a) == 2: cmd_voices(a[1])
    elif a[:1] == ["sub"]: cmd_sub()
    elif a[:1] == ["tts"] and len(a) == 3: cmd_tts(a[1], a[2])
    else: print(__doc__)
