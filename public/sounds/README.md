# 撒花音效檔

這兩個檔案由 ffmpeg 合成，授權為公共領域（無版權）。

| 檔名 | 用途 | 觸發點 |
| --- | --- | --- |
| `confetti-short.mp3` | 短促「叮」聲（約 0.6 秒、上行三個高頻） | 單張卡片產生成功、潤飾語法完成、一致性檢查完成 |
| `confetti-grand.mp3` | 上行琶音歡騰聲（約 1.2 秒、C-E-G-C 大調 + sparkle） | 故事合成成功（最爽的時刻） |

## 想換成更專業的音效？

推薦 CC0 / 免費商用來源（直接覆蓋同名檔即可）：
- [Mixkit — Game Win](https://mixkit.co/free-sound-effects/win/)
- [Pixabay — Confetti / Win](https://pixabay.com/sound-effects/search/confetti/)
- [Freesound](https://freesound.org/search/?q=confetti+pop) — 注意 license

## 重新合成命令（ffmpeg 速查）

```bash
# Short
ffmpeg -y \
  -f lavfi -i "sine=f=1760:d=0.5" \
  -f lavfi -i "sine=f=2349:d=0.5" \
  -f lavfi -i "sine=f=2637:d=0.5" \
  -filter_complex "[0]adelay=0|0,volume=0.4[a];[1]adelay=60|60,volume=0.3[b];[2]adelay=120|120,volume=0.25[c];[a][b][c]amix=inputs=3:duration=longest,afade=t=out:st=0.15:d=0.45" \
  -ar 44100 -c:a libmp3lame -b:a 96k confetti-short.mp3

# Grand
ffmpeg -y \
  -f lavfi -i "sine=f=523.25:d=0.3" \
  -f lavfi -i "sine=f=659.25:d=0.3" \
  -f lavfi -i "sine=f=783.99:d=0.3" \
  -f lavfi -i "sine=f=1046.5:d=0.6" \
  -f lavfi -i "sine=f=1567.98:d=0.6" \
  -f lavfi -i "sine=f=2093:d=0.6" \
  -filter_complex "[0]adelay=0|0,volume=0.35[a];[1]adelay=120|120,volume=0.35[b];[2]adelay=240|240,volume=0.35[c];[3]adelay=360|360,volume=0.4[d];[4]adelay=400|400,volume=0.25[e];[5]adelay=440|440,volume=0.18[f];[a][b][c][d][e][f]amix=inputs=6:duration=longest,afade=t=out:st=0.7:d=0.5" \
  -ar 44100 -c:a libmp3lame -b:a 128k confetti-grand.mp3
```
