# public/video/ — d'où viennent ces fichiers

Source fournie par le client : `riviere_or_lave.mp4`, 1024×558, 8,00 s,
30 i/s, H.264, sans piste audio, 1,86 Mo.

Les trois fichiers servis en sont dérivés. ffmpeg n'est **pas** une
dépendance du projet : il a été installé le temps de l'encodage, puis
retiré. Pour refaire les fichiers :

```sh
npm install --no-save ffmpeg-static
FF=$(node -e "console.log(require('ffmpeg-static'))")

# WebM VP9 — la source qui marche partout, y compris sur les Chromium
# construits sans les codecs propriétaires.
"$FF" -i source.mp4 -c:v libvpx-vp9 -crf 40 -b:v 0 -row-mt 1 -cpu-used 0 \
      -tile-columns 1 -auto-alt-ref 1 -lag-in-frames 25 -an riviere-or-v1.webm

# MP4 H.264 — le repli pour Safari et iOS.
"$FF" -i source.mp4 -c:v libx264 -crf 26 -preset slow -profile:v high \
      -pix_fmt yuv420p -movflags +faststart -an riviere-or-v1.mp4

# L'affiche : la première image, celle sur laquelle la boucle revient.
"$FF" -i source.mp4 -frames:v 1 -q:v 7 riviere-or-v1.jpg
```

## Pourquoi ces réglages

Mesuré au SSIM contre la source, et non choisi au jugé :

| fichier | poids | SSIM |
|---|---|---|
| MP4 H.264 crf 26 | 618 ko | 0,981 |
| WebM VP9 crf 40 | 672 ko | 0,978 |
| WebM VP9 crf 36 | 880 ko | 0,984 |

En octets le MP4 gagne. Le WebM reste servi **en premier** parce qu'un
Chromium sans codecs propriétaires ne lit pas le H.264 — vérifié,
`canPlayType('video/mp4; codecs="avc1.42E01E"')` y répond « non » là où
VP9 répond « probably ». Les 54 ko d'écart achètent cette garantie.

La vidéo passe sous un voile sombre et derrière du verre flou : un SSIM
de 0,978 y est indiscernable de la source.

## Le nom porte sa version

`-v1` : une nouvelle version prendra un nouveau nom, ce qui permet à
`public/_headers` de mettre `/video/*` en cache un an sans risque.

## L'autre vidéo

Une seconde variante, `riviere_or_cristaux.mp4` (3,67 Mo), avait été
fournie. Elle n'est pas utilisée.
