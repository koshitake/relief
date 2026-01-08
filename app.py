# app.py (updated)
# Relief - UI prototype (sample data only, no DB)
# - Mobile-first
# - Dashboard / Chat switch
# - Calendar for past view/edit (in-memory only)
# - Direct input: itch area, itch score, water total
# - Meals: user inputs what they ate (text), AI estimates carbs + salt
# - FIX: chat input stays visible + chat history scrolls
#
# Run:
#   streamlit run app.py

from __future__ import annotations
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Dict, List, Tuple, Optional

import streamlit as st


# ======================
# アプリケーション定数
# ======================
APP_NAME = "Relief"
FREE_ANALYSIS_DAYS = 7
DISCLAIMER_SHORT = "※診断・治療の指示はできません。悪化時は皮膚科へ。"

# UI設定
SYMPTOMS = ["赤み", "乾燥", "浸出", "苔癬化", "ひび割れ"]
ITCH_SCORE_MIN = 0
ITCH_SCORE_MAX = 10
WATER_ML_MIN = 0
WATER_ML_MAX = 6000
WATER_ML_STEP = 100
CARB_MAX = 500
SALT_MAX = 30.0
SALT_STEP = 0.1
MEALS_TEXTAREA_HEIGHT = 140

# サンプルデータ設定
DEFAULT_SAMPLE_DAYS = 14
DEFAULT_ITCH_SCORE = 4
DEFAULT_WATER_ML = 1400
DEFAULT_CHAT_RENDER_LIMIT = 60
MAX_CHAT_HISTORY = 200

# カレンダー設定
CALENDAR_COLUMN_RATIOS = [1, 5, 1]  # [前日ボタン, 日付入力, 翌日ボタン]


# ======================
# データモデル
# ======================
@dataclass
class DayRecord:
    """1日分の記録データ"""
    # かゆみ関連
    itch_area: str = ""  # かゆみの部位
    itch_score: int = DEFAULT_ITCH_SCORE  # かゆみスコア（0-10）
    symptoms: List[str] = field(default_factory=list)  # 症状リスト
    note: str = ""  # メモ
    
    # 水分
    water_ml: int = DEFAULT_WATER_ML  # 水分摂取量（ml）
    
    # 食事と栄養推定
    meals_text: str = ""  # 食事内容（ユーザー入力）
    carb_estimated_g: int = 0  # 糖質推定値（g）
    carb_override_g: Optional[int] = None  # 糖質上書き値（g）
    salt_estimated_g: float = 0.0  # 塩分推定値（g）
    salt_override_g: Optional[float] = None  # 塩分上書き値（g）


def effective_carb_g(rec: DayRecord) -> int:
    """有効な糖質値を取得（上書きがあれば上書き、なければ推定値）"""
    return int(rec.carb_override_g) if rec.carb_override_g is not None else int(rec.carb_estimated_g)


def effective_salt_g(rec: DayRecord) -> float:
    """有効な塩分值を取得（上書きがあれば上書き、なければ推定値）"""
    return float(rec.salt_override_g) if rec.salt_override_g is not None else float(rec.salt_estimated_g)


# ======================
# サンプルデータ生成
# ======================
def create_sample_records(days: int = DEFAULT_SAMPLE_DAYS) -> Dict[str, DayRecord]:
    """サンプル記録データを生成"""
    records: Dict[str, DayRecord] = {}
    for i in range(days):
        d = date.today() - timedelta(days=i)
        score = max(0, min(10, 4 + (i % 3) - 1))
        sample_meals = (
            "朝：納豆ごはん、味噌汁\n"
            "昼：そば\n"
            "夜：唐揚げ、キャベツ"
            if i % 2 == 0 else
            "朝：ヨーグルト、ナッツ\n"
            "昼：サラダチキン、サラダ\n"
            "夜：焼き魚、豆腐、味噌汁"
        )

        # sample estimates
        carb_est = 70 if i % 2 == 0 else 25
        salt_est = 8.0 if i % 2 == 0 else 5.5  # grams

        records[d.isoformat()] = DayRecord(
            itch_area="首の右側" if i % 3 == 0 else "",
            itch_score=score,
            symptoms=["乾燥"] if i % 2 == 0 else [],
            note="入浴後に少しかゆい" if i % 4 == 0 else "",
            water_ml=DEFAULT_WATER_ML + i * 50,
            meals_text=sample_meals,
            carb_estimated_g=carb_est,
            carb_override_g=None,
            salt_estimated_g=salt_est,
            salt_override_g=None,
        )
    return records


# ======================
# セッション状態管理
# ======================
def init_state() -> None:
    """セッション状態を初期化"""
    if "records" not in st.session_state:
        st.session_state.records = create_sample_records()
    if "selected_day" not in st.session_state:
        st.session_state.selected_day = date.today()
    if "chat" not in st.session_state:
        st.session_state.chat: List[Tuple[str, str]] = []
    if "analysis_days" not in st.session_state:
        st.session_state.analysis_days = FREE_ANALYSIS_DAYS
    if "advice_text" not in st.session_state:
        st.session_state.advice_text = (
            "今日は落ち着いていそうです。"
            "無理せず今のケアを続けて、気になる変化があれば短くメモしておくと安心です。"
        )
    if "max_chat_render" not in st.session_state:
        st.session_state.max_chat_render = DEFAULT_CHAT_RENDER_LIMIT


def get_record_for_selected_day() -> DayRecord:
    """選択された日の記録を取得（存在しない場合は新規作成）"""
    key = st.session_state.selected_day.isoformat()
    if key not in st.session_state.records:
        st.session_state.records[key] = DayRecord()
    return st.session_state.records[key]


# ======================
# UI: CSSスタイル
# ======================
def inject_css() -> None:
    """アプリケーション用のCSSスタイルを注入"""
    st.markdown(
        """
        <style>
        /* チャット履歴：スクロール */
        .relief-chat-scroll {
            max-height: 58vh;
            overflow-y: auto;
            padding-right: 0.25rem;
            padding-bottom: 0.5rem;
        }

        /* 入力欄に隠れないための余白 */
        .relief-chat-bottom-pad {
            height: 90px;
        }

        /* チャット入力欄を下に固定（テーマ追従） */
        div[data-testid="stChatInput"],
        section[data-testid="stChatInput"] {
            position: sticky;
            bottom: 0;
            z-index: 999;
            background: var(--background-color);
            padding-top: 0.5rem;
            padding-bottom: 0.5rem;
            border-top: 1px solid rgba(128,128,128,0.2);
        }

        /* 内側ラッパーもテーマに合わせる */
        [data-testid="stChatInput"] > div {
            background: var(--background-color);
        }

        /* カレンダー部分のカラムを横並びに強制（スマホでも） */
        /* Streamlitのカラムコンテナを横並びに固定 */
        div[data-testid="column-container"] {
            display: flex !important;
            flex-direction: row !important;
        }

        /* スマホでも横並びを維持 */
        @media (max-width: 768px) {
            /* すべてのカラムコンテナを横並びに強制 */
            div[data-testid="column-container"] {
                display: flex !important;
                flex-direction: row !important;
                flex-wrap: nowrap !important;
                gap: 0.3rem !important;
            }
            
            /* 各カラムの幅を調整 */
            div[data-testid="column"] {
                flex: 0 0 auto !important;
                min-width: 0 !important;
            }
            
            /* 前日・翌日ボタンのカラム（最初と最後） */
            div[data-testid="column"]:first-of-type,
            div[data-testid="column"]:last-of-type {
                flex: 0 0 12% !important;
                max-width: 12% !important;
            }
            
            /* 日付入力のカラム（中央） */
            div[data-testid="column"]:nth-of-type(2) {
                flex: 1 1 auto !important;
                min-width: 0 !important;
                padding-left: 0.1rem !important;
                padding-right: 0.1rem !important;
            }
            
            /* 日付入力フィールドの余白を削減 */
            div[data-testid="column"]:nth-of-type(2) div[data-baseweb="datepicker"],
            div[data-testid="column"]:nth-of-type(2) div[data-baseweb="input"],
            div[data-testid="column"]:nth-of-type(2) input,
            div[data-testid="column"]:nth-of-type(2) div[data-baseweb="base-input"] {
                padding-left: 0.4rem !important;
                padding-right: 0.4rem !important;
                margin: 0 !important;
                width: 10% !important;
                box-sizing: border-box !important;
            }
            
            /* 日付入力のラッパー要素の余白も削減 */
            div[data-testid="column"]:nth-of-type(2) > div {
                padding: 0 !important;
                margin: 0 !important;
                width: 10% !important;
            }
            
            /* 日付入力の内部要素も余白削減 */
            div[data-testid="column"]:nth-of-type(2) > div > div {
                padding: 0 !important;
                margin: 0 !important;
            }
            
            /* ボタンのスタイル調整（矢印のみなので小さく） */
            button[key*="prev_day"],
            button[key*="next_day"] {
                font-size: 1.2rem !important;
                padding: 0.25rem 0.2rem !important;
                white-space: nowrap !important;
                width: 10% !important;
                min-width: 35px !important;
                text-align: center !important;
            }
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


# ======================
# AIスタブ: 栄養推定
# ======================

# 栄養推定用のキーワードと値のマッピング
CARB_KEYWORDS = {
    "ごはん": 55, "米": 55, "ライス": 55, "丼": 55,
    "パン": 40, "トースト": 40, "サンド": 40,
    "そば": 55, "うどん": 55, "ラーメン": 55, "パスタ": 55,
    "じゃがいも": 25, "ポテト": 25,
    "ヨーグルト": 8,
    "ナッツ": 5,
}

SALT_KEYWORDS = {
    "味噌汁": 1.8, "みそ汁": 1.8,
    "漬物": 1.5, "キムチ": 1.5,
    "そば": 3.0, "うどん": 3.0, "ラーメン": 3.0,
    "唐揚げ": 1.3, "からあげ": 1.3, "フライ": 1.3,
    "ハム": 2.0, "ベーコン": 2.0, "ソーセージ": 2.0,
    "しょうゆ": 1.0, "醤油": 1.0,
}

DEFAULT_CARB_ESTIMATE = 25
DEFAULT_SALT_ESTIMATE = 4.5


def _estimate_carbs_from_text(meals_text: str) -> int:
    """食事テキストから糖質を推定"""
    text_lower = meals_text.lower()
    total_carbs = 0
    
    for keyword, value in CARB_KEYWORDS.items():
        if keyword in text_lower:
            total_carbs += value
    
    # キーワードが見つからず、テキストが空でない場合はデフォルト値を返す
    if total_carbs == 0 and meals_text.strip():
        return DEFAULT_CARB_ESTIMATE
    
    return total_carbs


def _estimate_salt_from_text(meals_text: str) -> float:
    """食事テキストから塩分を推定"""
    text_lower = meals_text.lower()
    total_salt = 0.0
    
    for keyword, value in SALT_KEYWORDS.items():
        if keyword in text_lower:
            total_salt += value
    
    # キーワードが見つからず、テキストが空でない場合はデフォルト値を返す
    if total_salt == 0.0 and meals_text.strip():
        return DEFAULT_SALT_ESTIMATE
    
    return round(total_salt, 1)


def estimate_nutrition_stub(meals_text: str) -> Tuple[int, float, str]:
    """
    食事テキストから栄養素を推定（スタブ実装）
    
    Args:
        meals_text: 食事内容のテキスト
        
    Returns:
        (糖質_g, 塩分_g, 推定理由)のタプル
        
    Note:
        実際のLLM呼び出しに置き換える予定
    """
    carbs = _estimate_carbs_from_text(meals_text)
    salt = _estimate_salt_from_text(meals_text)
    reason = "食事テキストから主食/麺/汁物/加工品などをざっくり拾って推定（プロトタイプの仮推定）"
    
    return int(carbs), float(salt), reason


# ======================
# UIコンポーネント
# ======================
def render_header() -> None:
    """アプリケーションヘッダーを表示"""
    st.markdown(f"## {APP_NAME}")
    st.caption("肌の状態を、落ち着いて理解するためのセルフケアツール")


def _change_selected_day(days_delta: int) -> None:
    """選択日を変更（未来日は選択不可）"""
    new_day = st.session_state.selected_day + timedelta(days=days_delta)
    if new_day <= date.today():
        st.session_state.selected_day = new_day
        st.rerun()


def render_calendar() -> None:
    """カレンダーUIをレンダリング"""
    st.markdown("📅 日付を選択（過去も閲覧・編集できます）")
    
    # 左右のボタンと日付表示を配置（スマホでも横並び）
    col_prev, col_date, col_next = st.columns(CALENDAR_COLUMN_RATIOS, gap="small")
    
    with col_prev:
        if st.button("◀", key="prev_day", use_container_width=True):
            _change_selected_day(-1)
    
    with col_date:
        picked = st.date_input(
            "",
            value=st.session_state.selected_day,
            max_value=date.today(),
            label_visibility="collapsed",
        )
        st.session_state.selected_day = picked
    
    with col_next:
        if st.button("▶", key="next_day", use_container_width=True):
            _change_selected_day(1)


def _get_day_key() -> str:
    """選択日のISO形式キーを取得"""
    return st.session_state.selected_day.isoformat()


def _render_day_summary(rec: DayRecord) -> None:
    """選択日の状態サマリーを表示"""
    with st.container(border=True):
        st.markdown("### 選択日の状態")
        area_text = f"（部位：{rec.itch_area}）" if rec.itch_area else ""
        st.markdown(f"**かゆみ：{rec.itch_score} / {ITCH_SCORE_MAX}** {area_text}")
        st.caption(
            f"糖質：{effective_carb_g(rec)} g ・ "
            f"塩分：{effective_salt_g(rec)} g ・ "
            f"水分：{rec.water_ml} ml"
        )


def _render_itch_inputs(rec: DayRecord, day_key: str) -> None:
    """かゆみ関連の入力フォームを表示"""
    with st.container(border=True):
        st.markdown("**かゆみ**")
        rec.itch_area = st.text_input(
            "かゆみの部位（任意）",
            value=rec.itch_area,
            placeholder="例：顎の下、首の右側、肘の内側",
            key=f"itch_area_{day_key}",
        )
        
        rec.itch_score = st.number_input(
            f"かゆみスコア（{ITCH_SCORE_MIN}–{ITCH_SCORE_MAX}）",
            min_value=ITCH_SCORE_MIN,
            max_value=ITCH_SCORE_MAX,
            value=int(rec.itch_score),
            step=1,
            key=f"itch_score_{day_key}",
        )
        
        rec.symptoms = st.multiselect(
            "症状（任意）",
            SYMPTOMS,
            default=rec.symptoms,
            key=f"symptoms_{day_key}",
        )
        
        rec.note = st.text_input(
            "メモ（任意）",
            value=rec.note,
            placeholder="例：入浴後に少しかゆい",
            key=f"note_{day_key}",
        )


def _render_water_input(rec: DayRecord, day_key: str) -> None:
    """水分入力フォームを表示"""
    with st.container(border=True):
        st.markdown("**水分**")
        rec.water_ml = st.number_input(
            "その日の水分合計（ml）",
            min_value=WATER_ML_MIN,
            max_value=WATER_ML_MAX,
            value=int(rec.water_ml),
            step=WATER_ML_STEP,
            key=f"water_ml_{day_key}",
        )


def _render_nutrition_estimation(rec: DayRecord, day_key: str) -> None:
    """栄養推定セクションを表示"""
    st.markdown("### 食事（何を食べたか）→ AIが糖質・塩分を推定")
    
    with st.container(border=True):
        rec.meals_text = st.text_area(
            "食事内容（自由記述）",
            value=rec.meals_text,
            height=MEALS_TEXTAREA_HEIGHT,
            placeholder="例：朝：納豆ごはん、味噌汁\n昼：そば\n夜：焼き魚、豆腐、味噌汁",
            key=f"meals_text_{day_key}",
        )
        
        col_estimate, col_override = st.columns([1, 1])
        
        with col_estimate:
            if st.button("糖質・塩分を推定（仮）", key=f"estimate_{day_key}"):
                carbs, salt, reason = estimate_nutrition_stub(rec.meals_text)
                rec.carb_estimated_g = carbs
                rec.salt_estimated_g = salt
                rec.carb_override_g = None
                rec.salt_override_g = None
                st.toast(f"推定しました：糖質 {carbs} g / 塩分 {salt} g（仮）")
                st.caption(reason)
                st.rerun()
        
        with col_override:
            _render_nutrition_overrides(rec, day_key)
        
        _render_nutrition_summary(rec)


def _render_nutrition_overrides(rec: DayRecord, day_key: str) -> None:
    """栄養値の上書き入力フォームを表示"""
    use_carb_override = rec.carb_override_g is not None
    use_salt_override = rec.salt_override_g is not None
    
    if st.checkbox("糖質を上書き", value=use_carb_override, key=f"use_carb_override_{day_key}"):
        rec.carb_override_g = st.number_input(
            "糖質を上書き（g, 任意）",
            min_value=0,
            max_value=CARB_MAX,
            value=int(rec.carb_override_g) if rec.carb_override_g is not None else int(effective_carb_g(rec)),
            step=5,
            help="推定が違うと感じたら上書き（上書きが優先）",
            key=f"carb_override_{day_key}",
        )
    else:
        rec.carb_override_g = None
    
    if st.checkbox("塩分を上書き", value=use_salt_override, key=f"use_salt_override_{day_key}"):
        rec.salt_override_g = st.number_input(
            "塩分を上書き（g, 任意）",
            min_value=0.0,
            max_value=SALT_MAX,
            value=float(rec.salt_override_g) if rec.salt_override_g is not None else float(effective_salt_g(rec)),
            step=SALT_STEP,
            help="推定が違うと感じたら上書き（上書きが優先）",
            key=f"salt_override_{day_key}",
        )
    else:
        rec.salt_override_g = None


def _render_nutrition_summary(rec: DayRecord) -> None:
    """栄養値のサマリーを表示"""
    carb_override_text = rec.carb_override_g if rec.carb_override_g is not None else "なし"
    salt_override_text = rec.salt_override_g if rec.salt_override_g is not None else "なし"
    
    st.caption(
        f"現在：糖質 **{effective_carb_g(rec)} g**"
        f"（推定 {rec.carb_estimated_g} / 上書き {carb_override_text}）"
        f" / 塩分 **{effective_salt_g(rec)} g**"
        f"（推定 {rec.salt_estimated_g} / 上書き {salt_override_text}）"
    )


def _render_ai_advice(rec: DayRecord, day_key: str) -> None:
    """AIアドバイスセクションを表示"""
    st.markdown("### AIの日次アドバイス")
    with st.container(border=True):
        st.write(st.session_state.advice_text)
        st.caption(DISCLAIMER_SHORT)
    
    if st.button("アドバイスを生成/更新（仮）", key=f"advice_{day_key}"):
        area_text = f"（{rec.itch_area}）" if rec.itch_area else ""
        st.session_state.advice_text = (
            f"{st.session_state.selected_day.isoformat()}の記録を見る限り、"
            f"今日は大きな変化はなさそうです{area_text}。"
            f"食事は糖質 {effective_carb_g(rec)}g / 塩分 {effective_salt_g(rec)}g くらいの見立てです。"
            "無理のない範囲で整えていけそうです。"
            "もし気になるなら『入浴後10分以内の保湿』だけ丁寧にしてみましょう。"
        )
        st.toast("更新しました（仮）")
        st.rerun()


def render_dashboard(rec: DayRecord) -> None:
    """ダッシュボード全体をレンダリング"""
    st.caption(f"🔍 分析範囲：直近{st.session_state.analysis_days}日（Free）")
    
    day_key = _get_day_key()
    
    _render_day_summary(rec)
    
    st.markdown("### 記録（直接入力）")
    _render_itch_inputs(rec, day_key)
    _render_water_input(rec, day_key)
    
    _render_nutrition_estimation(rec, day_key)
    
    st.divider()
    _render_ai_advice(rec, day_key)
    
    # レコードをセッション状態に保存
    st.session_state.records[day_key] = rec


def _build_chat_context(rec: DayRecord) -> str:
    """チャット用のコンテキスト文字列を構築"""
    area_text = f"・{rec.itch_area}" if rec.itch_area else ""
    return (
        f"（対象日：{st.session_state.selected_day.isoformat()} / "
        f"かゆみ={rec.itch_score}/{ITCH_SCORE_MAX}"
        f"{area_text}, "
        f"水分={rec.water_ml}ml, "
        f"糖質={effective_carb_g(rec)}g, "
        f"塩分={effective_salt_g(rec)}g）"
    )


def _generate_assistant_response(context: str) -> str:
    """AIアシスタントの応答を生成（スタブ実装）"""
    return (
        f"つらいですね。{context}\n"
        '今日は"増やさない"を目標に、できることを1つだけ選びましょう。\n'
        "1) 入浴後10分以内の保湿を優先\n"
        "2) 今夜は汁物や味の濃いものを少し控えて、シンプルめにする\n"
        "どっちなら続けやすそうですか？\n\n"
        f"{DISCLAIMER_SHORT}"
    )


def _render_chat_history() -> None:
    """チャット履歴を表示"""
    st.markdown('<div class="relief-chat-scroll">', unsafe_allow_html=True)
    history = st.session_state.chat[-st.session_state.max_chat_render:]
    for role, msg in history:
        with st.chat_message(role):
            st.write(msg)
    st.markdown("</div>", unsafe_allow_html=True)
    st.markdown('<div class="relief-chat-bottom-pad"></div>', unsafe_allow_html=True)


def _handle_chat_input(rec: DayRecord) -> None:
    """チャット入力の処理"""
    user_msg = st.chat_input("例：昨日からかゆみが増えた。どうすれば？")
    if not user_msg:
        return
    
    st.session_state.chat.append(("user", user_msg))
    
    context = _build_chat_context(rec)
    assistant_msg = _generate_assistant_response(context)
    st.session_state.chat.append(("assistant", assistant_msg))
    
    # チャット履歴が長すぎる場合は古いものを削除
    if len(st.session_state.chat) > MAX_CHAT_HISTORY:
        st.session_state.chat = st.session_state.chat[-MAX_CHAT_HISTORY:]
    
    st.rerun()


def render_chat(rec: DayRecord) -> None:
    """チャット画面をレンダリング"""
    st.caption(f"🔍 分析範囲：直近{st.session_state.analysis_days}日（Free）")
    st.markdown("### AIに相談")
    st.caption("記録を整理して、できることを一緒に考えます（断定はしません）。")
    
    _render_chat_history()
    _handle_chat_input(rec)


# ======================
# メインエントリーポイント
# ======================
def main() -> None:
    """アプリケーションのメインエントリーポイント"""
    st.set_page_config(page_title=APP_NAME, layout="centered")
    init_state()
    inject_css()

    render_header()
    st.divider()

    render_calendar()
    rec = get_record_for_selected_day()

    st.divider()

    tab_dash, tab_chat = st.tabs(["🏠 ダッシュボード", "💬 相談チャット"])
    with tab_dash:
        render_dashboard(rec)
    with tab_chat:
        render_chat(rec)


if __name__ == "__main__":
    main()
