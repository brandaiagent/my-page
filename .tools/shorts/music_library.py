#!/usr/bin/env python3
"""쇼츠 배경음악 보관함 (Freesound, CC0 음악만)

python3 music_library.py fill [곡수]      분위기별로 CC0 음악을 찾아 my-page/.music/<분위기>/ 에 저장
python3 music_library.py pick <분위기> <길이초> <출력.wav> <시드>   보관함에서 한 곡 골라 길이에 맞게 잘라 저장(없으면 종료 코드 2)

- 라이선스: Creative Commons 0 (출처 표기 없이 상업 이용 가능) 만 받는다. 곡 정보는 .music/index.json 에 기록
- 키: freesound.org 네트워크 비밀(프록시가 Authorization 헤더를 넣음). 코드에 키 없음
- 미리듣기 고음질 mp3(preview-hq-mp3)를 쓴다(정식 원본 다운로드는 OAuth 필요)
"""
import json, subprocess, sys, zlib, urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / ".music"
QUERIES = {
    "upbeat": ["upbeat background music", "happy music loop", "corporate upbeat"],
    "calm": ["chill background music", "lofi", "calm piano music"],
    "curious": ["quirky music", "curious music", "playful pizzicato"],
    "urgent": ["tension music", "suspense music loop", "dramatic background music"],
}
API = "https://freesound.org/apiv2/search/text/"


def get_json(url):
    r = subprocess.run(["curl", "-s", "-m", "30", url], capture_output=True, text=True)
    return json.loads(r.stdout)


def fill(per=6):
    index = json.loads((ROOT / "index.json").read_text()) if (ROOT / "index.json").exists() else {}
    for mood, qs in QUERIES.items():
        d = ROOT / mood; d.mkdir(parents=True, exist_ok=True)
        res, seen = [], set()
        for q in qs:
            params = {"query": q, "filter": 'license:"Creative Commons 0" duration:[25 TO 400]',
                      "fields": "id,name,duration,license,username,url,previews,num_downloads,avg_rating,tags",
                      "sort": "downloads_desc", "page_size": "10"}
            for r in get_json(API + "?" + urllib.parse.urlencode(params)).get("results", []):
                if r["id"] not in seen and any(t in ("music", "loop", "background", "bgm", "song", "soundtrack") for t in r.get("tags", [])):
                    seen.add(r["id"]); res.append(r)
        res.sort(key=lambda r: -r["num_downloads"])
        got = len(list(d.glob("*.mp3")))
        for r in res:
            if got >= per: break
            if "zero" not in r["license"]: continue
            out = d / f"{r['id']}.mp3"
            if not out.exists():
                ok = subprocess.run(["curl", "-s", "--retry", "2", "-m", "120", "-o", str(out), r["previews"]["preview-hq-mp3"]]).returncode == 0
                if not ok:
                    out.unlink(missing_ok=True); print("  다운로드 실패, 건너뜀:", r["id"]); continue
            index[str(r["id"])] = {"mood": mood, "name": r["name"], "user": r["username"], "url": r["url"],
                                   "license": r["license"], "duration": r["duration"]}
            got += 1
        print(mood, got)
    (ROOT / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1))


def pick(mood, length, out, seed):
    files = sorted((ROOT / mood).glob("*.mp3"))
    if not files:
        sys.exit(2)
    h = zlib.crc32(seed.encode()); f = files[h % len(files)]
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(f)],
                               capture_output=True, text=True).stdout or 0)
    start = 0.0 if dur <= length + 2 else round((h % 1000) / 1000 * min(20, dur - length - 1), 2)
    fade_out = max(0.1, length - 1.2)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-stream_loop", "-1", "-ss", str(start), "-i", str(f), "-t", str(length),
                    "-af", f"afade=t=in:d=0.4,afade=t=out:st={fade_out}:d=1.2", "-ac", "2", "-ar", "44100", out], check=True)
    print("음악:", f.name, json.loads((ROOT / "index.json").read_text()).get(f.stem, {}).get("name", ""))


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["fill"]: fill(int(a[1]) if len(a) > 1 else 6)
    elif a[:1] == ["pick"] and len(a) == 5: pick(a[1], float(a[2]), a[3], a[4])
    else: print(__doc__)
