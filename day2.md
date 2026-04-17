# Day2 — オプトインフロー修正 + チャットCTA 実装仕様書

> 情報源
> - `オプトインのフロー(確定版).zip`（`2.png` / `最新.png`）
> - 音声メモ（本ファイル末尾に原文転記）
> - 既存コード: `components/PwaGate.tsx`, `components/PushGate.tsx`, `app/api/chat/route.ts`
>
> 本ファイルは day2 の TODO 決定版。これに沿って上から順に対応する。

---

## 全体像（やること4つ）

| # | 対象 | 概要 | 優先 |
|---|------|------|------|
| 1 | InAppBrowserCard | 「ブラウザで開かせる」カードに**ループ再生のミュート動画**を埋め込む | ★★★ |
| 2 | IosVideoSteps | iOS Safari 手順を **3ステップ → 4ステップ** 化（通知許可ステップ追加）、矢印位置調整 | ★★★ |
| 3 | PushGate | 通知許可カード（緑の完了画面含む）を**英語化** | ★★ |
| 4 | Chat CTA | 4回目のユーザー送信後に**無料セッション誘導メッセージ**を自動挿入 | ★★ |

---

## 1. InAppBrowserCard に動画を埋め込む

**対象ファイル**: `components/PwaGate.tsx` の `InAppBrowserCard` 関数（L341-404）

**現状**:
- 茶色/amber のカード内に静的な「TAP HERE!」バッジ＋SVGの下向き矢印がアニメ表示されているのみ。
- 画面右下には別途 `FloatingArrow`（⋯ボタンを指す用）。

**修正仕様**（最新.png + 音声メモ）:
- カード上部の「TAP HERE!」バッジ＋SVG矢印**の代わり**、もしくは下に **動画を埋め込む**。
- 動画は「アプリ内ブラウザの ⋯ → Safari で開く」操作のアニメーション。
- 再生仕様:
  - `autoPlay` / `muted` / `loop` / `playsInline`
  - `controls` は **非表示**（再生バー不要）
  - **音は不要**（muted で統一。音声トラックがあっても鳴らない）
- 既存テキスト「**If that doesn't work**」→ Copy link ボタンは**そのまま残す**（音声メモでも「これでOK」と明言あり）。
- パフォーマンス:
  - **重くないはずだが、重かったら圧縮する**（最新.png 注釈）
  - `preload="metadata"` 推奨。動画サイズ目安 < 1MB、解像度は表示領域に合わせる。

**成果物**:
- 動画ファイル: `public/videos/open-in-browser.mp4`（仮名）
- `InAppBrowserCard` 内に `<video>` タグを追加してバッジ＋矢印を置換（またはバッジを動画内に焼き付ける）。

```tsx
<video
  src="/videos/open-in-browser.mp4"
  autoPlay
  muted
  loop
  playsInline
  preload="metadata"
  className="w-full rounded-xl"
/>
```

---

## 2. iOS Safari 手順を 4 ステップに拡張

**対象ファイル**: `components/PwaGate.tsx` の `IOS_VIDEO_STEPS`（L180-196）と `IosVideoSteps`（L198-287）

**現状**:
- 3ステップ（Share → Add to Home Screen → Add）。
- 動画は `autoPlay muted loop playsInline` で `controls` なし → **ループ/再生バー非表示/ミュートは既に満たしている**。
- ステップ1のみ画面右下に `FloatingArrow` を出している（直近のコミットで右下へ移動済み）。

**修正仕様**（最新.png「手順（4steps）」+「くこれを真ん中に」注釈）:

### 2-A. ステップ4の追加
最新.png に明記された手順 = 4 ステップ:

```
1. Safari 下部の共有ボタン（↑）をタップ
2. 共有メニューをスクロールダウン →「ホーム画面に追加」をタップ
3. 右上の「追加」をタップ → ホーム画面に戻る
4. 追加されたアプリアイコンをタップ → 通知を許可 → 完了！   ← ×ここがまだ
```

→ `IOS_VIDEO_STEPS` 配列に4つ目を追加:

```ts
{
  title: "Open the app & allow notifications",
  body: "Tap the new Chat with Marin icon on your home screen, then allow notifications when prompted.",
  src: "/videos/install-step-4.mp4",
}
```

- 動画ファイル `public/videos/install-step-4.mp4` を配置。
- プログレスドット / "Step x / total" 表示は `total = IOS_VIDEO_STEPS.length` で自動追従する（コード変更不要）。
- 最終ステップのボタン文言は現状 `"Follow the steps above"`。4ステップ目では「Open the app now」等の CTA に変えても良い。

### 2-B. 矢印「<」を動画の真ん中に

最新.png 注釈「**くこれを真ん中に**」= 動画コンテナの**縦中央・右端に重ねる矢印**を、左向き赤矢印 `<` として表示したい。

- 現状は `FloatingArrow anchor="right"` を画面固定位置に出している。
- 修正: **動画コンテナ内に absolute 配置**で、`top: 50%`, `right: 8px`, `translate-y: -50%` にして「動画の真ん中」に重なる左向き矢印を描画する。
- ページ全体の固定矢印（`FloatingArrow`）は、ステップ1以外では出さない現状維持で OK。

```tsx
<div className="relative bg-slate-900 aspect-[9/16] max-h-[60vh] mx-auto w-full">
  <video … />
  {/* 動画中央右端に重ねる左向き矢印 */}
  <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
    <svg /* 左向き "<" 矢印 */ className="w-7 h-12 text-red-600 animate-bounce" />
  </div>
</div>
```

### 2-C. 動画ファイルの実体差し込み

- ステップ1〜4 の mp4 を `public/videos/` に配置（現状ディレクトリは空）。
- 各動画要件（再度まとめ）:
  - ループ再生
  - 再生バー非表示（`controls` 無し）
  - ミュート（`muted`）
  - `playsInline`（iOSでインライン再生）
- 音声メモの「重かったら圧縮」は全動画共通。

---

## 3. 通知許可カード（緑の部分）を英語化

**対象ファイル**: `components/PushGate.tsx`（L130-253）

**現状**: 全文日本語。見出し `通知を許可してください`、ボタン `通知を許可する`、denied/granted/unsupported の各カードも日本語。

**修正仕様**（最新.png「ここの緑の部分はこれでOKなのでこのまま英語にしてください」）:
- 文面は現状維持、**全て英語に置換**する。
- 対象文言（例）:
  - `通知を許可してください` → `Allow notifications`
  - サブ説明 → `We'll let you know when install is complete, plus new-feature updates. On iPhone, you only need to allow once.`
  - `通知を許可する` → `Allow notifications`
  - `許可を要求中…` → `Requesting permission…`
  - denied セクション（iPhone設定の開き方手順）→ 英語に翻訳
  - granted セクション `通知は許可済み` / `通知を再送する` / `チャットへ進む` → `Notifications enabled` / `Resend welcome push` / `Continue to chat`
  - unsupported / エラー文言もすべて英語化
- 診断ボックス（`DiagBox`）はそのまま（開発用）。

---

## 4. Chat CTA — 4回目のメッセージ送信後に自動挿入

### 4-1. 仕様（確定）

**目的**: ユーザーが一定回数チャットした後に、無料個別セッションへ誘導する定型メッセージを assistant ロールで自動表示する。

**トリガー**: `anon_user_id` 単位で、**4回目の user メッセージ送信後**に1回だけ発火。

**挿入メッセージ本文**:

```
I'm so glad I could help you! 🎉

By the way, I'm currently offering Free Personalized Japanese Sessions for learners like you.

This is perfect if you:
- Have no partner to practice Japanese conversations with
- Want to improve your pronunciation
- Struggle with Japanese slang and natural expressions
- Find it hard to stay motivated when learning alone
- Are just starting out and have no idea where to start

In this 1-on-1 session, we'll:
1. Identify your current challenges and areas for improvement
2. Define a clear, achievable goal based on your needs
3. Build a step-by-step action plan that helps you progress confidently

Plus, you'll get 10 incredible bonuses for free!

Spots fill up fast, so don't miss out.

👉 Book your free session here: https://kaz-honban-orpin.vercel.app/
```

- **確定URL**: `https://kaz-honban-orpin.vercel.app/`
- 実装時は `prompts/cta.ts` に定数として置く（環境変数化しても良いが、現時点ではハードコードで十分）。

### 4-2. 実装方針（判定: 簡単 / 数時間）

既存基盤で全条件クリア:
- ✅ `anon_user_id` による匿名ユーザー管理（`lib/anonId.ts`）
- ✅ `chat_messages` テーブルに全履歴保存
- ✅ SSE ストリームで assistant メッセージを返す仕組み（`app/api/chat/route.ts`）

→ **エンジニア側で実装**する。プロンプト側でのカウント制御は不確実なので採用しない。

### 4-3. 実装手順

1. **マイグレーション追加** `supabase/migrations/2026xxxxx_cta_shown.sql`
   ```sql
   create table if not exists anon_user_flags (
     anon_user_id text primary key,
     cta_shown_at timestamptz,
     created_at timestamptz default now()
   );
   ```
   - `chat_sessions` に列を足す案より、**anon単位**で1行持つ方が「1ユーザー1回」に合う。

2. **`app/api/chat/route.ts` 改修**（L60-134 の間）
   - user メッセージを insert 後、`chat_messages` を `session_id in (select id from chat_sessions where anon_user_id = ?)` で user ロールのみ count。
   - count === 4 かつ `anon_user_flags.cta_shown_at is null` なら CTA 発火フラグを立てる。
   - OpenAI ストリーム完了後（`send({ type: "done" })` の直前）:
     - CTA 本文を assistant ロールで `chat_messages` に insert
     - SSE で `{ type: "delta", delta: CTA_TEXT }`（または `{ type: "cta", content }` 新設）を流す
     - `anon_user_flags.cta_shown_at = now()` を upsert
   - `prompts/cta.ts` に本文定数＋`NEXT_PUBLIC_BOOKING_URL` 注入関数を切り出す。

3. **フロント**: 既存 SSE delta 処理で assistant バブルに追加表示されるので、**UI改修不要**（新イベント型を足すなら `ChatView.tsx` の SSE switch に追加分岐）。

### 4-4. 仕様確認事項

- [x] `<LINK>` に入れる URL → **確定: `https://kaz-honban-orpin.vercel.app/`**
- [x] 「4回目」は user 送信数のみをカウント（assistant は除外）で良い → 確定
- [x] リセット要件（例: 30日後に再表示）は不要 → 確定（1ユーザー1回）

### 4-5. 「プロンプト側で制御」案について（不採用の理由）

プロンプトに「4回目のメッセージの後に以下の文面を挿入して」と指示する案は**不採用**。

- LLM は履歴からの**概算カウント**しかできず、発火タイミングが揺れる
- 「1ユーザー1回だけ」の**永続フラグ**を持てない（別セッション/別端末で重複）
- 本文が毎回微妙に変化する（プロンプト追従のブレ）

→ 上記 4-3 の DB 起点・決定論的発火で実装する。プロンプト調整は `prompts/system.ts` の**トーン/スタイル系のみ**に限定。

---

## 実装順と見積

| 順 | 作業 | 目安 |
|---|------|------|
| 1 | 動画5本を `public/videos/` に準備（ステップ1〜4 + open-in-browser） | 素材次第 |
| 2 | `InAppBrowserCard` に `<video>` 埋め込み | 30 分 |
| 3 | `IOS_VIDEO_STEPS` に step4 追加 + 矢印を動画中央右に移動 | 1 時間 |
| 4 | `PushGate.tsx` 英語化 | 30 分 |
| 5 | CTA: マイグレーション + API 改修 + 定数切り出し | 2〜3 時間 |
| 6 | 実機（iPhone Safari / Instagram IAB / Android Chrome）確認 | 1 時間 |

合計: **動画素材を除けば 4〜5 時間で完了可能**。

---

## 参考: 音声メモ原文（修正依頼部分の転記）

> タクミ君お疲れ様です。チャットボットのPWAのoptinのところの修正お願いします。まずですね、ここの部分、ブラウザで開かせるところなんですが、ここ修正お願いしたいです。まずイメージとしてはですね、こんな感じで。なってます イメージとしては、もう完成イメージとしては、(…) こんな感じで ここに、ここにね、で、これね動画も差し込んでほしくて、なんかもう別にアニメーションで動かしてればいいかな、こんな感じで (…) これ埋め込んどいてもらって この動画ここに埋め込んでいてもらってで文言とかはこんな感じで if that doesn't work コピーリンクでタップ here はいいと思うもうこれでこのままで ここだけかな 埋め込むだけかな、修正としては うんでえっとねこれねループする形にしてほしいんです 普通にただこれがこうやって動いてるだけだから で、あとこの再生バーもさ、非表示にしたい 普通に、うん、非表示にしたいっていうのがあります で、あとこれなんか音を鳴ってるんですけど あの、音ってなんか鳴ってるんだけど これ音は不要なので、別にいらないです まぁ別になんか鳴っちゃうんだったらいいけど 多分不要の方がいいよね、わかんないけど

---

## 参考: ZIP画像 要点

### `2.png`
- 左上: 茶色カード（InAppBrowserCard の現状）＝「ここはこんな感じ」⭐アイコン追加イメージ
- 左下: ステップカード＝「ここは動画にしたい」
- 右下フロー: 「動画1→Nextボタン→動画2→…→最後まで」＝**現状の IosVideoSteps 設計を踏襲**
- 注記「わざわざこれにする理由は1本の動画にすると記憶できなくて分かりづらくなるため」= 4本分割方針の根拠

### `最新.png`
- 「動画を埋め込む → ループする形 / 再生バー非表示 / 音は不要」
- 「重くないはずだが重かったら圧縮する」
- 「手順（4steps）」→ 通知許可まで含む4段階
- 「×ここがまだ」= ステップ4（通知許可）が未実装
- 「くこれを真ん中に」= 動画の中央右に矢印重ね
- 「ここの緑の部分はこれでOKなのでこのまま英語にしてください」= PushGate の緑カード英語化
