#!/usr/bin/env python3
"""키워드 틈새 찾기 (상위 노출이 덜 된 키워드 찾기)

사용법: python3 keyword-scout.py "가습기" "전기요" ...   (씨앗 키워드 여러 개)
옵션:   --max 12   씨앗당 분석할 연관 검색어 수 (기본 12)

하는 일
1. 수요: 네이버 자동완성 + 구글 자동완성에서 실제로 사람들이 치는 연관 검색어를 모은다
   (두 곳 모두에 나오면 수요 신호가 더 강하다고 본다)
2. 경쟁: 검색어마다 네이버 통합검색 첫 화면의 글 제목·작성 시점을 읽어
   - 제목 일치율: 검색어의 모든 단어가 들어간 제목 비율 (낮을수록 딱 맞는 글이 적음 = 틈새)
   - 최근성: 1주 안에 쓴 글 비율 (높을수록 지금 경쟁이 치열함)
3. 틈새 점수(0~100, 높을수록 노리기 좋음) = (1-일치율)×60 + (1-최근성)×40, 두 자동완성 모두 나오면 +10(최대 100)
※ 실측 검색량·순위가 아니라 검색 결과 첫 화면으로 본 상대 지표다. 최종 선택은 사실 확인 가능성까지 보고 정한다.
"""
import json, re, sys, time, html, subprocess, urllib.parse

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"

def get(url):
    r = subprocess.run(["curl", "-s", "-m", "15", "-A", UA, url], capture_output=True)
    return r.stdout.decode("utf-8", "replace")

def naver_ac(q):
    u = "https://ac.search.naver.com/nx/ac?con=1&frm=nv&ans=2&r_format=json&r_enc=UTF-8&st=100&q=" + urllib.parse.quote(q)
    try:
        return [x[0] for x in json.loads(get(u))["items"][0]]
    except Exception:
        return []

def google_ac(q):
    u = "https://suggestqueries.google.com/complete/search?client=firefox&hl=ko&q=" + urllib.parse.quote(q)
    try:
        return json.loads(get(u))[1]
    except Exception:
        return []

def naver_serp(q):
    t = get("https://search.naver.com/search.naver?query=" + urllib.parse.quote(q))
    titles = []
    for m in re.findall(r'"title":"([^"]{6,120})"', t):
        s = re.sub(r"<[^>]+>", "", html.unescape(m.encode().decode("unicode_escape", "ignore") if "\\u" in m else html.unescape(m)))
        if s not in titles and not re.match(r"^(네이버|NAVER|더보기|관련 검색어|다른 어학정보|\$\.|[\w.-]+\.(com|kr|net|org)$)", s):
            titles.append(s)
    dates = re.findall(r"(\d{4}\.\s?\d{1,2}\.\s?\d{1,2}\.|\d+(?:분|시간|일|주|개월) 전)", t)
    return titles[:12], dates[:20]

def norm(s):
    return re.sub(r"\s+", "", s).lower()

def analyze(q, in_both):
    titles, dates = naver_serp(q)
    words = [w for w in q.split() if w]
    match = sum(1 for t in titles if all(norm(w) in norm(t) for w in words)) / len(titles) if titles else 0.0
    fresh = sum(1 for d in dates if re.search(r"(분|시간|일) 전", d) or re.match(r"1주 전", d)) / len(dates) if dates else 0.0
    score = (1 - match) * 60 + (1 - fresh) * 40 + (10 if in_both else 0)
    return {"keyword": q, "gap_score": round(min(score, 100)), "title_match": round(match, 2),
            "fresh_ratio": round(fresh, 2), "both_suggest": in_both, "top_titles": titles[:3]}

def main():
    args = sys.argv[1:]
    mx = 12
    if "--max" in args:
        i = args.index("--max"); mx = int(args[i + 1]); del args[i:i + 2]
    out = []
    for seed in args:
        n, g = naver_ac(seed), google_ac(seed)
        cands = []
        for k in n + g:
            # 씨앗 단어가 들어 있고, 사전·번역 검색(영어로, 뜻)은 뺀다
            if k not in cands and k != seed and all(norm(w) in norm(k) for w in seed.split()) and not re.search(r"(영어|뜻|어원|번역)", k):
                cands.append(k)
        cands = cands[:mx]
        for k in cands:
            out.append(dict(analyze(k, k in n and k in g), seed=seed))
            time.sleep(1.0)
    out.sort(key=lambda x: -x["gap_score"])
    print(json.dumps(out, ensure_ascii=False, indent=1))

if __name__ == "__main__":
    main()
