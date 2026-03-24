# app.py
# Relief - アトピーセルフケアアプリ
# 起動方法: streamlit run app.py

import html
import json
import streamlit as st
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Optional


# ── 定数定義 ─────────────────────────────────────────────────────────────────
# アプリ全体で使用する定数をここで一元管理します。
# 数値を直接コードに書く（ハードコード）のを避けるため、定数化しています。

# 無料プランで保持する記録の最大日数
MAX_RECORD_DAYS: int = 14

# かゆみスコアの最大値
MAX_ITCH_SCORE: int = 10

# 水分入力の設定（ml単位）
MAX_WATER_ML: int = 5000
WATER_STEP_ML: int = 100

# 栄養推定の失敗時に使用するダミー値
DUMMY_CARB_G: int = 68
DUMMY_SALT_G: float = 6.2

# アドバイス生成プロンプトの目標文字数
ADVICE_CHAR_COUNT: int = 200


# ── データモデル ─────────────────────────────────────────────────────────────
# 1日分の記録をまとめて管理するデータクラスです。
# @dataclass を使うと、クラスの初期値設定が簡潔に書けます。
# Optional[型] は「値がある場合はその型、ない場合は None」という意味です。

@dataclass
class DayRecord:
    """1日分の記録データを表すクラス"""
    itch_area: str = ""                       # かゆみの部位（例: 腕、首）
    itch_score: int = 0                       # かゆみスコア（0〜MAX_ITCH_SCORE）
    water_ml: int = 0                         # 水分摂取量（ml）
    exercise_text: str = ""                   # 運動内容（自由記述）
    note: str = ""                            # メモ・症状・気づき
    meals_text: str = ""                      # 食事内容（自由記述）
    carb_estimated_g: Optional[int] = None    # 糖質推定値（AI推定）
    carb_override_g: Optional[int] = None     # 糖質上書き値（手動入力）
    salt_estimated_g: Optional[float] = None  # 塩分推定値（AI推定）
    salt_override_g: Optional[float] = None   # 塩分上書き値（手動入力）


# ── ダミー AI 関数 ────────────────────────────────────────────────────────────
# 実際の AI API が使えない場合に呼ばれるダミー関数です。
# 本番実装時はこれを本物の AI 呼び出しに差し替えます。

def _dummy_nutrition_sender(prompt: str) -> str:
    """栄養推定のダミー関数（固定値を JSON 形式で返す）"""
    return json.dumps({
        "carbs_g": DUMMY_CARB_G,
        "salt_g": DUMMY_SALT_G,
        "reason": "（ダミー推定値）",
    })


def _dummy_advice_sender(prompt: str) -> str:
    """アドバイス生成のダミー関数（固定テキストを返す）"""
    return (
        "水分をしっかり摂り、保湿を忘れずに行いましょう。"
        "睡眠を十分にとることもかゆみの軽減に効果的です。\n\n"
        "⚠️ このアドバイスはセルフケアの参考情報です。"
        "症状が続く場合は皮膚科・主治医へご相談ください。"
    )


# ── セッション管理 ────────────────────────────────────────────────────────────
# st.session_state はブラウザを閉じるまで値を保持する Streamlit の機能です。
# アプリ起動時に初期値を設定し、ページ再描画をまたいでデータを維持します。

def _init_session() -> None:
    """セッションの初期値を設定する"""
    defaults = {
        "records": {},                                   # 日付 → DayRecord の辞書
        "selected_day": date.today(),                    # 現在表示中の日付
        "chat": [],                                      # チャット履歴（辞書のリスト）
        "nutrition_ai_sender": _dummy_nutrition_sender,  # 栄養推定に使う AI 関数
        "advice_ai_sender": _dummy_advice_sender,        # アドバイス生成に使う AI 関数
    }
    # まだセットされていないキーにだけ初期値を代入する
    for key, val in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = val


def _get_or_create_record(day: date) -> DayRecord:
    """指定日の記録を返す。存在しない場合は新規作成してから返す"""
    if day not in st.session_state.records:
        st.session_state.records[day] = DayRecord()
    return st.session_state.records[day]


def _purge_old_records() -> None:
    """無料プランの制限: MAX_RECORD_DAYS 日より古い記録を削除する"""
    cutoff = date.today() - timedelta(days=MAX_RECORD_DAYS)
    # ループ中に辞書を変更するとエラーになるため、先に削除対象リストを作る
    old_days = [d for d in st.session_state.records if d < cutoff]
    for d in old_days:
        del st.session_state.records[d]


# ── スタイル ─────────────────────────────────────────────────────────────────
# アプリの見た目を CSS で定義します。
# ここでは固定の CSS 文字列のみを埋め込むため、XSS のリスクはありません。

def _inject_css() -> None:
    """カスタム CSS をページに注入する"""
    st.markdown("""
    <style>
    /* コンテンツ幅をモバイルサイズに制限 */
    .block-container { max-width: 480px; padding: 1rem 1rem 3rem; }

    /* ヘッダー */
    .relief-header { text-align: center; padding: 10px 0 4px; }
    .relief-header .brand { font-size: 1.8rem; font-weight: 800; color: #e06030; letter-spacing: 0.05em; }
    .relief-header .sub   { font-size: 0.75rem; color: #a06040; margin-left: 8px; }
    .relief-header .desc  { font-size: 0.72rem; color: #c09070; margin-top: 2px; }

    /* サマリーカード */
    .summary-row { display: flex; gap: 8px; margin: 14px 0; }
    .chip {
        flex: 1; background: #fff0e8; border-radius: 12px;
        padding: 10px 4px; text-align: center;
        font-size: 0.72rem; color: #7b4f36; line-height: 1.4;
    }
    .chip .val { display: block; font-size: 1.25rem; font-weight: 700; color: #e06030; line-height: 1.2; }

    /* セクション見出し */
    .section-title { font-size: 0.85rem; font-weight: 600; color: #a06040; margin: 18px 0 6px; letter-spacing: 0.04em; }

    /* アドバイスボックス */
    .advice-box {
        background: #f0f9f0; border-left: 4px solid #66bb6a;
        border-radius: 8px; padding: 12px 14px;
        font-size: 0.9rem; color: #2e5930;
        white-space: pre-wrap; line-height: 1.6;
    }

    /* チャットバブル */
    .bubble-user {
        background: #c84f10; color: #ffffff;
        border-radius: 16px 16px 4px 16px;
        padding: 10px 14px; margin: 6px 0 6px 40px;
        font-size: 0.9rem; line-height: 1.5;
    }
    .bubble-ai {
        background: #3a3a3a; color: #f0f0f0;
        border-radius: 16px 16px 16px 4px;
        padding: 10px 14px; margin: 6px 40px 6px 0;
        font-size: 0.9rem; line-height: 1.5; white-space: pre-wrap;
    }
    </style>
    """, unsafe_allow_html=True)


# ── UI コンポーネント ─────────────────────────────────────────────────────────

def _render_header() -> None:
    """アプリのヘッダー（ブランド名・説明文）を描画する"""
    # 固定文字列のみ使用しているため XSS のリスクはありません
    st.markdown("""
    <div class="relief-header">
        <span class="brand">Relief</span>
        <span class="sub">アトピーセルフケア</span>
        <div class="desc">食事・かゆみ・水分を記録して、肌の傾向を把握しよう</div>
    </div>
    """, unsafe_allow_html=True)


def _render_calendar() -> None:
    """日付ナビゲーション（前日 ← 日付 → 翌日）を描画する"""
    col_prev, col_date, col_next = st.columns([1, 3, 1])

    # 前日ボタン
    with col_prev:
        if st.button("＜", use_container_width=True, key="prev_day"):
            st.session_state.selected_day -= timedelta(days=1)
            st.rerun()

    # 日付ピッカー（直接日付を選択できる）
    with col_date:
        new_day = st.date_input(
            "日付",
            value=st.session_state.selected_day,
            label_visibility="collapsed",
            key="date_picker",
        )
        # 日付が変更された場合は選択日を更新して再描画する
        if new_day != st.session_state.selected_day:
            st.session_state.selected_day = new_day
            st.rerun()

    # 翌日ボタン
    with col_next:
        if st.button("＞", use_container_width=True, key="next_day"):
            st.session_state.selected_day += timedelta(days=1)
            st.rerun()


def _render_summary(rec: DayRecord) -> None:
    """今日のサマリーカード（かゆみ・水分・糖質・塩分・運動）を描画する"""
    # 上書き値があれば優先して使用し、なければ AI 推定値を使う
    carb = rec.carb_override_g if rec.carb_override_g is not None else rec.carb_estimated_g
    salt = rec.salt_override_g if rec.salt_override_g is not None else rec.salt_estimated_g

    # 値がない場合は「―」を表示する
    carb_str = str(carb) if carb is not None else "―"
    salt_str = f"{salt:.1f}" if salt is not None else "―"

    # XSS対策: ユーザー入力（exercise_text）は HTML エスケープしてから表示する
    # html.escape() は <, >, & などの特殊文字を無害な文字列に変換します
    exercise_raw = rec.exercise_text.strip() if rec.exercise_text.strip() else "―"
    exercise_str = html.escape(exercise_raw)

    # itch_score と water_ml は int 型なのでエスケープ不要
    st.markdown(f"""
    <div class="summary-row">
        <div class="chip">かゆみ<span class="val">{rec.itch_score}</span>/10</div>
        <div class="chip">水分<span class="val">{rec.water_ml}</span>ml</div>
        <div class="chip">糖質<span class="val">{carb_str}</span>g</div>
        <div class="chip">塩分<span class="val">{salt_str}</span>g</div>
    </div>
    <div style="font-size:0.78rem; color:#7b4f36; margin-bottom:14px;">🏃 運動: {exercise_str}</div>
    """, unsafe_allow_html=True)


def _render_itch_section(rec: DayRecord, day: date) -> None:
    """かゆみセクション（部位・スコア）を描画する"""
    st.markdown('<div class="section-title">かゆみ</div>', unsafe_allow_html=True)

    rec.itch_area = st.text_input(
        "部位（任意）", value=rec.itch_area,
        placeholder="例: 腕、首、背中",
        key=f"itch_area_{day}",
    )
    rec.itch_score = st.slider(
        "かゆみスコア (0〜10)", 0, MAX_ITCH_SCORE,
        value=rec.itch_score,
        key=f"itch_score_{day}",
    )


def _render_water_section(rec: DayRecord, day: date) -> None:
    """水分摂取量セクションを描画する"""
    st.markdown('<div class="section-title">水分</div>', unsafe_allow_html=True)

    rec.water_ml = st.number_input(
        "合計水分量 (ml)", min_value=0, max_value=MAX_WATER_ML, step=WATER_STEP_ML,
        value=rec.water_ml,
        key=f"water_{day}",
    )


def _render_exercise_section(rec: DayRecord, day: date) -> None:
    """運動セクションを描画する"""
    st.markdown('<div class="section-title">運動</div>', unsafe_allow_html=True)

    rec.exercise_text = st.text_input(
        "運動内容（任意）", value=rec.exercise_text,
        placeholder="例: ウォーキング30分、ストレッチ10分",
        key=f"exercise_{day}",
    )


def _render_note_section(rec: DayRecord, day: date) -> None:
    """メモ（症状・気づき）セクションを描画する"""
    st.markdown('<div class="section-title">メモ（症状・気づき）</div>', unsafe_allow_html=True)

    rec.note = st.text_area(
        "メモ", value=rec.note,
        placeholder="今日気づいたことを書いてください",
        height=80,
        label_visibility="collapsed",
        key=f"note_{day}",
    )


def _render_meals_section(rec: DayRecord, day: date) -> None:
    """食事内容・栄養推定セクションを描画する"""
    st.markdown('<div class="section-title">食事内容</div>', unsafe_allow_html=True)

    # 食事内容テキスト入力
    rec.meals_text = st.text_area(
        "食事内容", value=rec.meals_text,
        placeholder="例: ご飯1杯、味噌汁、鮭の塩焼き、サラダ",
        height=100,
        label_visibility="collapsed",
        key=f"meals_{day}",
    )

    # AI 推定ボタン
    if st.button("糖質・塩分を推定する", use_container_width=True, key=f"estimate_{day}"):
        _run_nutrition_estimate(rec)

    # 推定値の手動上書きフォーム
    _render_nutrition_override(rec, day)


def _run_nutrition_estimate(rec: DayRecord) -> None:
    """AI（またはダミー）で糖質・塩分を推定し、結果を rec に保存する"""
    # 食事内容が未入力の場合は何もしない
    if not rec.meals_text.strip():
        st.info("食事内容を入力してから推定してください。")
        return

    with st.spinner("推定中..."):
        try:
            # AI へ渡すプロンプトを作成する
            prompt = f"以下の食事内容から糖質(g)と塩分(g)を推定してください。\n\n{rec.meals_text}"
            result = st.session_state.nutrition_ai_sender(prompt)

            # AI が返す JSON 文字列を Python の辞書に変換する
            data = json.loads(result)
            rec.carb_estimated_g = int(data.get("carbs_g", 0))
            rec.salt_estimated_g = float(data.get("salt_g", 0))
            reason = data.get("reason", "")

            # 推定根拠がある場合は括弧付きで表示する
            reason_text = f"（{reason}）" if reason else ""
            st.success(
                f"推定完了: 糖質 {rec.carb_estimated_g}g / 塩分 {rec.salt_estimated_g}g{reason_text}"
            )
        except Exception:
            # 推定失敗時はダミー値を使用してユーザーに通知する
            rec.carb_estimated_g = DUMMY_CARB_G
            rec.salt_estimated_g = DUMMY_SALT_G
            st.warning(
                f"推定に失敗しました。ダミー値を使用します"
                f"（糖質 {DUMMY_CARB_G}g / 塩分 {DUMMY_SALT_G}g）。"
            )


def _render_nutrition_override(rec: DayRecord, day: date) -> None:
    """糖質・塩分の手動上書きフォームを描画する"""
    with st.expander("推定値を手動で上書き"):
        col_c, col_s = st.columns(2)

        # 糖質の上書き入力（0 は「入力なし」と見なす）
        with col_c:
            carb_ov = st.number_input(
                "糖質 (g)", min_value=0,
                value=rec.carb_override_g if rec.carb_override_g is not None else 0,
                key=f"carb_ov_{day}",
            )
            rec.carb_override_g = carb_ov if carb_ov > 0 else None

        # 塩分の上書き入力（0.0 は「入力なし」と見なす）
        with col_s:
            salt_ov = st.number_input(
                "塩分 (g)", min_value=0.0, step=0.1,
                value=rec.salt_override_g if rec.salt_override_g is not None else 0.0,
                key=f"salt_ov_{day}",
            )
            rec.salt_override_g = salt_ov if salt_ov > 0.0 else None


def _render_advice_section(rec: DayRecord, day: date) -> None:
    """日次アドバイスセクションを描画する"""
    st.markdown('<div class="section-title">日次アドバイス</div>', unsafe_allow_html=True)

    # アドバイス生成ボタン
    if st.button("アドバイスを生成する", use_container_width=True, key=f"gen_advice_{day}"):
        _generate_advice(rec, day)

    # 生成済みアドバイスがあれば表示する
    advice_key = f"advice_{day}"
    if st.session_state.get(advice_key):
        # XSS対策: AI 出力も HTML エスケープしてから表示する
        escaped_advice = html.escape(st.session_state[advice_key])
        st.markdown(
            f'<div class="advice-box">{escaped_advice}</div>',
            unsafe_allow_html=True,
        )


def _generate_advice(rec: DayRecord, day: date) -> None:
    """AI（またはダミー）でアドバイスを生成し、セッションに保存する"""
    advice_key = f"advice_{day}"

    with st.spinner("生成中..."):
        # 有効な栄養値を取得する（上書き値 > 推定値 > 0 の優先順位）
        carb_val = rec.carb_override_g or rec.carb_estimated_g or 0
        salt_val = rec.salt_override_g or rec.salt_estimated_g or 0

        # AI へ渡すプロンプトを作成する
        prompt = (
            f"日付: {day}\n"
            f"かゆみスコア: {rec.itch_score}/10（部位: {rec.itch_area or 'なし'}）\n"
            f"水分: {rec.water_ml}ml\n"
            f"運動: {rec.exercise_text or 'なし'}\n"
            f"食事: {rec.meals_text}\n"
            f"推定糖質: {carb_val}g / 推定塩分: {salt_val}g\n"
            f"メモ: {rec.note or 'なし'}\n\n"
            f"上記のデータをもとに、アトピー性皮膚炎のセルフケアアドバイスを"
            f"{ADVICE_CHAR_COUNT}字程度で日本語で生成してください。"
        )

        try:
            advice = st.session_state.advice_ai_sender(prompt)
        except Exception:
            # AI 呼び出し失敗時はダミー関数で代替する
            advice = _dummy_advice_sender(prompt)

        # 生成したアドバイスをセッションに保存する
        st.session_state[advice_key] = advice


def _render_record_tab(rec: DayRecord, day: date) -> None:
    """「記録」タブ全体を描画する（各セクション関数を順番に呼び出す）"""
    _render_itch_section(rec, day)
    _render_water_section(rec, day)
    _render_exercise_section(rec, day)
    _render_note_section(rec, day)
    _render_meals_section(rec, day)
    _render_advice_section(rec, day)


def _render_chat_tab() -> None:
    """「相談チャット」タブを描画する"""
    # 医療免責の注意書きを最上部に表示する
    st.caption(
        "⚠️ AIの回答はセルフケアの参考情報です。"
        "医療的な診断・治療の代わりにはなりません。"
        "症状が続く場合は必ず皮膚科・主治医にご相談ください。"
    )

    # チャット履歴を上から順に表示する
    for msg in st.session_state.chat:
        css_class = "bubble-user" if msg["role"] == "user" else "bubble-ai"
        # XSS対策: ユーザー入力・AI出力をどちらも HTML エスケープする
        escaped_content = html.escape(msg["content"])
        st.markdown(
            f'<div class="{css_class}">{escaped_content}</div>',
            unsafe_allow_html=True,
        )

    # メッセージ入力フォーム（送信後に自動でクリアされる）
    with st.form("chat_form", clear_on_submit=True):
        user_input = st.text_input(
            "メッセージ",
            placeholder="例: 夜にかゆみが強くなるのはなぜですか？",
            label_visibility="collapsed",
        )
        submitted = st.form_submit_button("送信", use_container_width=True)

    # 空白のみのメッセージは送信しない
    if submitted and user_input.strip():
        _process_chat_message(user_input.strip())


def _process_chat_message(user_input: str) -> None:
    """ユーザーのメッセージを処理し、AI 返答を生成してチャット履歴に追加する"""
    # ユーザーのメッセージをチャット履歴に追加する
    st.session_state.chat.append({"role": "user", "content": user_input})

    with st.spinner("返答を生成中..."):
        # AI へ渡すプロンプトを作成する
        prompt = (
            "アトピー性皮膚炎のセルフケアに関する以下の質問に、"
            "簡潔に日本語で答えてください。\n\n"
            f"{user_input}"
        )
        try:
            reply = st.session_state.advice_ai_sender(prompt)
        except Exception:
            reply = "申し訳ありません。現在応答できません。"

    # 免責文言を末尾に付加する
    reply += "\n\n⚠️ セルフケアの参考情報です。症状が続く場合は皮膚科へご相談ください。"

    # AI の返答をチャット履歴に追加して画面を再描画する
    st.session_state.chat.append({"role": "ai", "content": reply})
    st.rerun()


# ── メイン ────────────────────────────────────────────────────────────────────

def main() -> None:
    """アプリケーションのエントリーポイント（最初に呼ばれる関数）"""
    # ページ設定（ブラウザのタブに表示されるタイトル・アイコン）
    st.set_page_config(page_title="Relief", page_icon="🌿", layout="centered")

    # 初期化処理
    _init_session()    # セッションの初期値を設定する
    _inject_css()      # カスタムスタイルを適用する
    _purge_old_records()  # 古い記録を削除する（無料プランの制限）

    # ヘッダーとカレンダーナビを描画する
    _render_header()
    _render_calendar()

    # 選択中の日付の記録を取得する（なければ新規作成）
    day = st.session_state.selected_day
    rec = _get_or_create_record(day)

    # 今日のデータをカードで表示する
    _render_summary(rec)

    # タブで「記録」と「相談チャット」を切り替える
    tab_record, tab_chat = st.tabs(["📋 記録", "💬 相談チャット"])
    with tab_record:
        _render_record_tab(rec, day)
    with tab_chat:
        _render_chat_tab()


if __name__ == "__main__":
    main()
