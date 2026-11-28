#!/usr/bin/env python3
"""쇼츠 배경음악 직접 만들기 (저작권 걱정 없음 — 코드로 합성한 우리 음악)

사용법: python3 bgm.py <분위기> <길이초> <출력.wav> [시드]
분위기: upbeat(밝고 경쾌) / calm(차분한 정보) / curious(궁금증·반전) / urgent(긴급·마감)
시드: 같은 시드면 같은 곡. 영상 이름을 넣으면 영상마다 멜로디가 달라진다
"""
import sys, wave, zlib
import numpy as np

SR = 44100
PRESETS = {
    # bpm, 코드 진행(루트 미디 번호, 단조 여부), 드럼 세기, 음색
    "upbeat":  dict(bpm=112, prog=[(60, 0), (67, 0), (69, 1), (65, 0)], drums=1.0, pad=0.25, pluck=0.55),
    "calm":    dict(bpm=84,  prog=[(60, 0), (57, 1), (65, 0), (67, 0)], drums=0.35, pad=0.55, pluck=0.35),
    "curious": dict(bpm=96,  prog=[(57, 1), (53, 0), (60, 0), (55, 0)], drums=0.7, pad=0.35, pluck=0.5),
    "urgent":  dict(bpm=124, prog=[(57, 1), (57, 1), (53, 0), (55, 0)], drums=1.0, pad=0.3, pluck=0.6),
}


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env(n, a=0.01, d=0.2, s=0.6, r=0.2):
    t = np.arange(n) / SR
    e = np.ones(n) * s
    ai, di, ri = int(a * SR), int(d * SR), int(r * SR)
    if ai: e[:ai] = np.linspace(0, 1, ai)
    if di: e[ai:ai + di] = np.linspace(1, s, len(e[ai:ai + di]))
    if ri: e[-ri:] *= np.linspace(1, 0, len(e[-ri:]))
    return e


def tone(f, dur, harm=(1, .5, .25), a=.01, d=.2, s=.6, r=.2):
    n = int(dur * SR); t = np.arange(n) / SR
    w = sum(h * np.sin(2 * np.pi * f * (k + 1) * t) for k, h in enumerate(harm))
    return w * env(n, a, d, s, r)


def pluck(f, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + .4 * np.sin(4 * np.pi * f * t) + .15 * np.sin(6 * np.pi * f * t)) * np.exp(-t * 6)


def kick(dur=0.35):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 50 + 90 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)


def hat(rng, dur=0.06):
    n = int(dur * SR); x = rng.standard_normal(n)
    x = np.diff(np.concatenate([[0], x]))  # 고음만 남기기
    return x * np.exp(-np.arange(n) / SR * 60) * .25


def clap(rng, dur=0.18):
    n = int(dur * SR); x = rng.standard_normal(n)
    return x * np.exp(-np.arange(n) / SR * 25) * .35


def add(buf, x, at):
    i = int(at * SR)
    if i >= len(buf): return
    j = min(len(buf), i + len(x)); buf[i:j] += x[:j - i]


def make(mood, length, seed):
    p = PRESETS[mood]; rng = np.random.default_rng(seed)
    beat = 60 / p["bpm"]; bar = beat * 4
    n = int((length + 1) * SR); L = np.zeros(n); R = np.zeros(n)
    scale_major, scale_minor = [0, 2, 4, 7, 9], [0, 3, 5, 7, 10]  # 5음 음계라 어떤 조합도 어울림
    t, i = 0.0, 0
    while t < length:
        root, minor = p["prog"][i % len(p["prog"])]
        third = 3 if minor else 4
        chord = [root, root + third, root + 7]
        # 패드(깔리는 화음)
        for m in chord:
            x = tone(hz(m), bar, harm=(1, .3, .1), a=.25, d=.4, s=.7, r=.4) * p["pad"] * .22
            add(L, x, t); add(R, x * .9, t)
        # 베이스
        for b in range(4):
            x = tone(hz(root - 24), beat * .9, harm=(1, .25), a=.005, d=.1, s=.8, r=.08) * .5
            add(L, x, t + b * beat); add(R, x, t + b * beat)
        # 플럭 멜로디(8분음표, 시드마다 다름)
        sc = scale_minor if minor else scale_major
        for e8 in range(8):
            if rng.random() < .62:
                m = root + 12 + sc[rng.integers(len(sc))] + (12 if rng.random() < .25 else 0)
                x = pluck(hz(m), beat * .9) * p["pluck"] * .3
                pan = rng.uniform(.3, .7)
                add(L, x * (1 - pan) * 2, t + e8 * beat / 2); add(R, x * pan * 2, t + e8 * beat / 2)
        # 드럼
        d = p["drums"]
        for b in range(4):
            if b in (0, 2) or (mood == "urgent"): add(L, kick() * .9 * d, t + b * beat); add(R, kick() * .9 * d, t + b * beat)
            if b in (1, 3) and d > .5: c = clap(rng) * d; add(L, c, t + b * beat); add(R, c, t + b * beat)
            for h in (0, .5):
                x = hat(rng) * d; add(L, x * .8, t + (b + h) * beat); add(R, x, t + (b + h) * beat)
        t += bar; i += 1
    # 간단한 잔향
    for delay, g in ((.031, .25), (.047, .2), (.073, .15), (.11, .1)):
        k = int(delay * SR)
        L[k:] += R[:-k] * g; R[k:] += L[:-k] * g
    st = np.stack([L, R], 1)[: int(length * SR)]
    fade = int(1.0 * SR); st[-fade:] *= np.linspace(1, 0, fade)[:, None]; st[: int(.05 * SR)] *= np.linspace(0, 1, int(.05 * SR))[:, None]
    st = np.tanh(st / (np.abs(st).max() + 1e-9) * 1.2) * .8
    return (st * 32767).astype(np.int16)


if __name__ == "__main__":
    if len(sys.argv) < 4 or sys.argv[1] not in PRESETS:
        print(__doc__); sys.exit(1)
    mood, length, out = sys.argv[1], float(sys.argv[2]), sys.argv[3]
    seed = zlib.crc32((sys.argv[4] if len(sys.argv) > 4 else out).encode())
    data = make(mood, length, seed)
    with wave.open(out, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(data.tobytes())
    print("완료", out)
