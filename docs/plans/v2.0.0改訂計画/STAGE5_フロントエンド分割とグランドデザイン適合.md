# STAGE 5 詳細作業手順書: フロントエンド分割とグランドデザイン適合

- **ステージ番号**: STAGE 5
- **主担当エージェント**: 🎨 UI/UXデザイナー (`ui-designer`), 🛡️ 品質監査スペシャリスト (`qa-engineer`)
- **統括**: 👑 プロジェクトコンダクター (`conductor`)
- **目的**: Anti-God Component（1ファイル最大250行制限）を徹底し、6大巨大画面をカスタムフックとサブコンポーネントへ物理分割するとともに、画面グランドデザイン新規格（4px/8pxグリッド、明暗ペア、デイライト視認性）および MSW モック透過切替環境を配備してコード品質レビュー（`dev-review-code`）を CLEAN で通過する。
- **所要想定時間**: 2 セッション
- **スレッドクローズ基準**: コード品質レビュー合格およびフロントエンドビルド成功後、ユーザー承認を得て Git コミットを実施。

---

## 1. MSW モック制御アダプター層の配備（直書きモック排除）

コンポーネント内に散在するダミーデータや直書きモックを完全撤廃し、MSW (Mock Service Worker) による中央集約型モックアダプター層を配備する。

### 構成
- `frontend/src/mocks/browser.ts`: MSW ワーカーの起動設定。
- `frontend/src/mocks/handlers.ts`: REST API（`/api/bikes`, `/api/activities`, `/api/places`, `/api/analytics` 等）のモックハンドラー定義。
- `frontend/src/main.tsx`: 環境変数 `import.meta.env.VITE_ENABLE_MOCK === "true"` の場合のみ MSW を有効化。`false` の場合は実バックエンドと透過通信。

---

## 2. 6大巨大コンポーネントの物理分割（Anti-God Component / 250行制限）

担当: 🎨 `ui-designer`

### 分割計画一覧

| 対象ファイル | 現行行数 | 分割後の構成（全ファイル250行以下） |
| :--- | :--- | :--- |
| `ItemDetailPage.tsx` | **1,443行** | ・`useItemDetail.ts`（データ取得・状態管理フック / ~180行）<br>・`useItemMap.ts`（Google Maps 描画・ポリラインフック / ~160行）<br>・`ItemDetailHeader.tsx`（基本情報・アクションボタン / ~120行）<br>・`ItemDetailMapSection.tsx`（地図表示領域 / ~150行）<br>・`SpotListSection.tsx`（滞在スポット一覧 / ~200行）<br>・`SpotEditModal.tsx`（スポット編集ダイアログ / ~220行）<br>・`PhotoGallerySection.tsx`（写真一覧・アップロード / ~180行）<br>・`ItemDetailPage.tsx`（親コンテナ / ~140行） |
| `AnalyticsPage.tsx` | **1,127行** | ・`useAnalytics.ts`（統計集計・期間フィルタフック / ~190行）<br>・`MonthlyDistanceChart.tsx`（月間距離バーチャート / ~180行）<br>・`CategoryRatioCard.tsx`（滞在カテゴリ円グラフ / ~160行）<br>・`HeatmapCalendarCard.tsx`（ライド頻度ヒートマップ / ~210行）<br>・`RideSummaryTable.tsx`（期間サマリ表 / ~170行）<br>・`AnalyticsPage.tsx`（親コンテナ / ~130行） |
| `MasterPage.tsx` | **870行** | ・`BikeSettingsTab.tsx`（自転車登録・一覧 / ~220行）<br>・`CategorySettingsTab.tsx`（スポットカテゴリ編集 / ~200行）<br>・`TagSettingsTab.tsx`（タグ管理 / ~180行）<br>・`StravaSettingsTab.tsx`（Strava連携・同期トリガー / ~190行）<br>・`MasterPage.tsx`（タブ切り替え親コンテナ / ~110行） |
| `DashboardPage.tsx` | **635行** | ・`useDashboard.ts`（サマリデータフック / ~150行）<br>・`SummaryStatsGrid.tsx`（KPIカード群 / ~160行）<br>・`RecentActivitiesList.tsx`（最新アクティビティリスト / ~200行）<br>・`QuickSyncWidget.tsx`（即時同期ボタン・状態 / ~120行）<br>・`DashboardPage.tsx`（親コンテナ / ~110行） |
| `ItemsPage.tsx` | **370行** | ・`useItemsSearch.ts`（検索・フィルタリングフック / ~140行）<br>・`ItemsSearchBar.tsx`（検索入力・日付範囲UI / ~150行）<br>・`ItemsPage.tsx`（リスト描画・親コンテナ / ~180行） |
| `RouteDetailModal.tsx`| **260行** | ・`useRouteDetail.ts`（ルートポリライン解析フック / ~110行）<br>・`RouteDetailModal.tsx`（モーダルUI / ~160行） |

---

## 3. 画面グランドデザイン新規格への適合

1. **4px / 8px スペーシンググリッド**:
   - 余白・パディング・マージンを `p-2 (8px)`, `p-4 (16px)`, `gap-4 (16px)`, `space-y-6 (24px)` 等の 8px 基準に統一。
2. **デイライト視認性 & 明暗ペア**:
   - 屋外直射日光下でも視認可能な高コントラスト配色（WCAG AA 4.5:1 以上）。
   - クラス指定は明暗ペアを徹底（例: `bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-800`）。
3. **デザイントークン定義 (`frontend/src/index.css`)**:
   - ブランドカラー（Primary, Secondary, Accent, Neutral, Danger）の HEX / px 絶対値を CSS 変数として定義。

---

## 4. フロントエンドビルドおよび静的同期

```bash
cd frontend
# 1. 依存関係（MSW 等）の確認・ビルド
npm run build

# 2. バックエンド静的ディレクトリへの同期
cp -r dist/* ../backend/static/
cd ..
```

---

## 5. コード品質レビュー (dev-review-code) と台帳更新

担当: 🛡️ `qa-engineer`

```bash
# Hard Gate 検査の完全実行（違反 0 件必須）
python3 scripts/harness_guard.py --all
```

- 監査観点:
  - 1ファイル最大行数（フロント250行 / バック400行）の完全遵守。
  - 直書きモックの完全排除（MSW集約）。
  - レイヤーバイパス、生SQL DDL、例外握りつぶしのゼロ件確認。
- 成果物: `docs/reports/コード品質レビュー及びリファクタリング提案書_v2.0.0.md`（判定: `CLEAN`）

```bash
python3 scripts/state_manager.py record-review code CLEAN docs/reports/コード品質レビュー及びリファクタリング提案書_v2.0.0.md
```

---

## 6. スレッドクローズと承認ゲート（Git Commit 準備）

コンダクターは以下のサマリをユーザーに提示し、承認を仰ぐ。

### ユーザー確認項目
- [ ] すべてのフロントエンドファイルが 250 行以下に物理分割されていること。
- [ ] MSW モック基盤が配備され、直書きモックが排除されていること。
- [ ] 画面グランドデザイン（明暗ペア・8pxグリッド）が適用されていること。
- [ ] `harness_guard.py --all` が PASS（違反 0 件）していること。
- [ ] コード品質レビュー判定が CLEAN であること。

> **承認後の Git コミットメッセージ例**:
> `refactor(frontend): STAGE 5 - Anti-God Component分割・グランドデザイン適合・MSW配備`
