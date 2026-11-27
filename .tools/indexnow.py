#!/usr/bin/env python3
"""IndexNow: 새 글·수정 글 주소를 네이버·빙 등에 바로 알린다.
사용법: python3 indexnow.py https://brandaihub.com/p/slug/ [주소 ...]
        python3 indexnow.py --sitemap https://brandaihub.com   (사이트맵의 모든 주소)
키 파일 <키>.txt 는 4개 저장소 루트에 있다 (키는 이 파일의 KEY 값과 같다).
"""
import json, re, sys, subprocess, urllib.parse
KEY = "18bd10676cee9ee425f8f690deafe891"
ENDPOINTS = ["https://searchadvisor.naver.com/indexnow", "https://api.indexnow.org/indexnow"]

def post(endpoint, host, urls):
    body = json.dumps({"host": host, "key": KEY, "keyLocation": f"https://{host}/{KEY}.txt", "urlList": urls})
    r = subprocess.run(["curl", "-s", "-m", "30", "-o", "/dev/null", "-w", "%{http_code}", "-X", "POST",
                        "-H", "Content-Type: application/json; charset=utf-8", "--data-binary", body, endpoint],
                       capture_output=True, text=True)
    return r.stdout

def main():
    args = sys.argv[1:]
    urls = []
    if args[:1] == ["--sitemap"]:
        site = args[1].rstrip("/")
        xml = subprocess.run(["curl", "-s", "-m", "30", site + "/sitemap.xml"], capture_output=True, text=True).stdout
        urls = re.findall(r"<loc>([^<]+)</loc>", xml)
    else:
        urls = args
    by_host = {}
    for u in urls:
        by_host.setdefault(urllib.parse.urlparse(u).netloc, []).append(u)
    for host, lst in by_host.items():
        for ep in ENDPOINTS:
            print(host, len(lst), "개 →", ep.split("/")[2], post(ep, host, lst[:10000]))

if __name__ == "__main__":
    main()
