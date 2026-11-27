#!/usr/bin/env python3
"""쇼츠 한 편 만들기: python3 make-short.py spec.json 작업폴더 출력.mp4
spec.segs: [{"video":"경로.mp4","ss":시작초,"d":길이,"punch":true}, {"image":"경로.jpg","d":길이}]  (길이 합 = total)
spec.scenes/tag/total: kinetic.js 자막 스펙 (같은 파일)"""
import json, subprocess, sys, os
spec_path, W, out = sys.argv[1:4]
SP = json.load(open(spec_path)); os.makedirs(W, exist_ok=True)
HERE = os.path.dirname(os.path.abspath(__file__)); T = SP['total']
files = []
for i, g in enumerate(SP['segs']):
    n = int(round(g['d'] * 30)); punch = g.get('punch', i == 0)
    z = "if(lt(on,10),1.28-0.028*on,1+0.0008*(on-10))" if punch else "1.04+0.0012*on"
    fx = "eq=brightness=-0.02:saturation=1.1:contrast=1.05"
    o = f"{W}/nb{i}.mp4"; files.append(o)
    if 'video' in g:
        vf = f"scale=-2:1920,crop=1080:1920,setsar=1,fps=30,{fx},zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30"
        cmd = ['ffmpeg','-y','-v','error','-ss',str(g.get('ss',0)),'-t',str(g['d']+0.2),'-i',g['video'],'-vf',vf,'-frames:v',str(n),'-an','-c:v','libx264','-preset','fast','-crf','18',o]
    else:  # 사진: 천천히 확대 (켄 번스)
        vf = f"scale=-2:2112,crop=1188:2112,setsar=1,{fx},zoompan=z='{z if punch else '1+0.0015*on'}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={n}:s=1080x1920:fps=30"
        cmd = ['ffmpeg','-y','-v','error','-loop','1','-i',g['image'],'-vf',vf,'-frames:v',str(n),'-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p',o]
    subprocess.run(cmd, check=True)
open(f"{W}/list.txt",'w').write('\n'.join(f"file '{os.path.abspath(f)}'" for f in files))
subprocess.run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',f"{W}/list.txt",'-c','copy',f"{W}/bg.mp4"],check=True)
subprocess.run(['rm','-rf',f"{W}/frames"]); subprocess.run(['node',f"{HERE}/kinetic.js",spec_path,f"{W}/frames"],check=True)
subprocess.run(['ffmpeg','-y','-v','error','-i',f"{W}/bg.mp4",'-framerate','30','-i',f"{W}/frames/f%04d.png",'-f','lavfi','-t',str(T),'-i','color=c=0xffe033:s=1080x12:r=30','-f','lavfi','-t',str(T),'-i','anullsrc=r=44100:cl=stereo',
  '-filter_complex',f"[0:v][1:v]overlay=0:0:shortest=1[a];[a]drawbox=x=0:y=70:w=1080:h=12:color=white@0.25:t=fill[b];[b][2:v]overlay=x='-1080+1080*t/{T}':y=70[v]",
  '-map','[v]','-map','3:a','-t',str(T),'-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart',out],check=True)
# 확인용 장면 시트
from PIL import Image
ts = [min(T-0.3, sc['s'] + (sc['e']-sc['s'])*0.8) for sc in SP['scenes']]
c = Image.new('RGB', (len(ts)*188, 320), 'white')
for i, t in enumerate(ts):
    subprocess.run(['ffmpeg','-v','error','-y','-ss',str(t),'-i',out,'-frames:v','1','-vf','scale=180:-1',f"{W}/c{i}.png"])
    c.paste(Image.open(f"{W}/c{i}.png"), (i*188, 0))
c.save(f"{W}/sheet.png"); print('완료', out)
