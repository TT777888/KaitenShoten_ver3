# KaitenShoten

GitHub Pages用・ブラウザアップロード軽量版です。

## アップロード方法
ZIPそのものはアップロードせず、このZIPをPCで解凍してください。

GitHubのリポジトリで:
1. Add file → Upload files
2. 解凍後の中身をアップロード
3. Commit changes
4. Settings → Pages
5. Source: Deploy from a branch
6. Branch: main
7. Folder: /(root)
8. Save

## 構成
- index.html
- style.css
- app.js
- assets/
- .nojekyll
- README.md

大きな画像はWebPに軽量化し、サイト内参照も更新済みです。


## BGM
説明画面では再生せず、3ページ目のSTARTクリック時に `assets/bgm_washoku.mp3` が先頭から再生され、その後ループします。
