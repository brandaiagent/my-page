"""스레드(Threads) 자동 게시 도구 — life_tip_hub (오늘의 살림 꿀팁)

토큰은 환경의 네트워크 시크릿(graph.threads.net)에 저장돼 있고, 프록시가 요청에 자동으로 넣는다.
코드·파일에는 토큰을 절대 쓰지 않는다.

사용법:
  python3 post.py me                              # 연결 확인
  python3 post.py post 글.json [--dry]            # 게시 (--dry: 컨테이너만 만들고 게시 안 함)
  python3 post.py recent [n]                      # 최근 게시물

글.json 예:
  {"text": "본문 (500자 이하)",
   "image_url": "https://brandaihub.com/images/xxx.webp",   # 선택. 공개 URL 이어야 함 (JPEG/PNG 권장)
   "replies": ["댓글 1", "댓글 2"],                # 선택. 본인 댓글로 이어 쓰기(각 댓글은 바로 앞 글에 연결)
   "reply": "첫 댓글 (예전 형식, replies 와 같은 역할)",
   "ad": true}                                    # 제휴 글이면 true → 본문·댓글 맨 앞에 [광고] 표시 자동 추가
"""
import json, sys, time, urllib.parse, urllib.request

API = "https://graph.threads.net/v1.0"
HDR = {"Authorization": "Bearer proxy-injected"}  # 실제 값은 프록시가 넣음
AD_LINE = "[광고] 제휴 링크로 구매 시 수수료를 받을 수 있어요"


def call(method, path, **params):
    data = None
    url = f"{API}/{path}"
    if method == "GET":
        url += "?" + urllib.parse.urlencode(params)
    else:
        data = urllib.parse.urlencode(params).encode()
    req = urllib.request.Request(url, data=data, headers=HDR, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise SystemExit(f"API 오류 {e.code}: {e.read().decode()[:500]}")


def wait_ready(cid, tries=20):
    for _ in range(tries):
        st = call("GET", cid, fields="status,error_message")
        if st.get("status") == "FINISHED":
            return
        if st.get("status") in ("ERROR", "EXPIRED"):
            raise SystemExit(f"컨테이너 실패: {st}")
        time.sleep(3)
    raise SystemExit("컨테이너 준비 시간 초과")


def publish(text, image_url=None, reply_to=None, dry=False):
    p = {"text": text}
    if image_url:
        p.update(media_type="IMAGE", image_url=image_url)
    else:
        p.update(media_type="TEXT")
    if reply_to:
        p["reply_to_id"] = reply_to
    cid = call("POST", "me/threads", **p)["id"]
    wait_ready(cid)
    if dry:
        return {"container": cid, "dry": True}
    pid = call("POST", "me/threads_publish", creation_id=cid)["id"]
    return {"id": pid}


def cmd_post(path, dry):
    g = json.load(open(path, encoding="utf-8"))
    text = g["text"].strip()
    replies = [x.strip() for x in (g.get("replies") or ([g["reply"]] if g.get("reply") else [])) if x.strip()]
    if g.get("ad"):
        text = f"{AD_LINE}\n\n{text}"
        replies = [f"[광고] {x}" if ("http" in x) else x for x in replies]
    for t in [text] + replies:
        if len(t) > 500:
            raise SystemExit(f"500자를 넘는 글이 있어요: {len(t)}자")
    r = publish(text, g.get("image_url"), dry=dry)
    out = {"post": r, "replies": []}
    prev = r.get("id")
    for x in replies:
        if dry:
            break
        time.sleep(5)
        rr = publish(x, reply_to=prev)
        out["replies"].append(rr)
        prev = rr["id"]
    if not dry:
        out["permalink"] = call("GET", r["id"], fields="permalink").get("permalink")
    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a or a[0] == "me":
        print(call("GET", "me", fields="id,username"))
    elif a[0] == "post":
        cmd_post(a[1], "--dry" in a)
    elif a[0] == "recent":
        n = int(a[1]) if len(a) > 1 else 5
        print(json.dumps(call("GET", "me/threads", fields="id,text,timestamp,permalink", limit=n), ensure_ascii=False, indent=1))
