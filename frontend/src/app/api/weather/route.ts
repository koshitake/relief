// 指定日の天気情報と現在地名を取得する API Route です。
// 天気: Open-Meteo（無料・APIキー不要）
// 地名: Nominatim / OpenStreetMap（無料・APIキー不要）
// 90日以内: forecast API、それより古い日付: archive API を使用します。

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/AuthOptions";

const FORECAST_URL   = process.env.OPEN_METEO_FORECAST_URL ?? "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_URL    = process.env.OPEN_METEO_ARCHIVE_URL  ?? "https://archive-api.open-meteo.com/v1/archive";
const NOMINATIM_URL  = process.env.NOMINATIM_URL           ?? "https://nominatim.openstreetmap.org/reverse";

// 日次で取得する気象変数
const DAILY_PARAMS = "temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean,weather_code";

const querySchema = z.object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    // YYYY-MM-DD 形式の日付
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// Open-Meteo の日次レスポンス型
interface OpenMeteoDailyResponse {
    daily: {
        time:                       string[];
        temperature_2m_max:         number[];
        temperature_2m_min:         number[];
        relative_humidity_2m_mean:  number[];
        weather_code:               number[];
    };
}

// Nominatim のレスポンス型（必要なフィールドのみ）
interface NominatimResponse {
    address: {
        city?:       string;
        town?:       string;
        village?:    string;
        suburb?:     string;
        state?:      string;
    };
}

/** 過去90日より古い日付は archive API を使う */
function buildWeatherUrl(lat: number, lng: number, day: string): { url: string; revalidate: number } {
    const today    = new Date();
    today.setHours(0, 0, 0, 0);
    const target   = new Date(day);
    const diffDays = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

    const baseUrl  = diffDays > 90 ? ARCHIVE_URL : FORECAST_URL;
    const params   = new URLSearchParams({
        latitude:   String(lat),
        longitude:  String(lng),
        daily:      DAILY_PARAMS,
        start_date: day,
        end_date:   day,
        timezone:   "auto",
    });

    // 過去日は変化しないので長くキャッシュ、当日は30分でキャッシュ
    const revalidate = diffDays > 0 ? 86400 : 1800;

    return { url: `${baseUrl}?${params}`, revalidate };
}

/** Nominatim で座標から地名を取得する（市区町村 + 都道府県） */
async function fetchLocationName(lat: number, lng: number): Promise<string | null> {
    const params = new URLSearchParams({
        lat:    String(lat),
        lon:    String(lng),
        format: "json",
        "accept-language": "ja",
    });
    try {
        // 地名は座標が変わらない限り変化しないため長くキャッシュ
        const res = await fetch(`${NOMINATIM_URL}?${params}`, {
            headers: { "User-Agent": "ReliefApp/1.0" },
            next: { revalidate: 86400 },
        });
        if (!res.ok) return null;
        const data = (await res.json()) as NominatimResponse;
        const { city, town, village, suburb, state } = data.address;
        const place = city ?? town ?? village ?? suburb ?? null;
        if (!place) return state ?? null;
        return state ? `${place}, ${state}` : place;
    } catch {
        return null;
    }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const result = querySchema.safeParse({
        lat: searchParams.get("lat"),
        lng: searchParams.get("lng"),
        day: searchParams.get("day"),
    });

    if (!result.success) {
        return NextResponse.json({ error: "Invalid params" }, { status: 400 });
    }

    const { lat, lng, day } = result.data;
    const { url, revalidate } = buildWeatherUrl(lat, lng, day);

    try {
        // 天気を先に取得し、失敗時は地名取得をスキップする
        const weatherRes = await fetch(url, { next: { revalidate } });

        if (!weatherRes.ok) {
            return NextResponse.json({ error: "Weather API error" }, { status: 502 });
        }

        // JSON パースと地名取得は互いに独立しているため並列実行する
        const [data, locationName] = await Promise.all([
            weatherRes.json() as Promise<OpenMeteoDailyResponse>,
            fetchLocationName(lat, lng),
        ]);
        const { temperature_2m_max, temperature_2m_min, relative_humidity_2m_mean, weather_code } = data.daily;

        if (!temperature_2m_max?.length) {
            return NextResponse.json({ error: "No data for this date" }, { status: 404 });
        }

        return NextResponse.json({
            temperatureMax: Math.round(temperature_2m_max[0]),
            temperatureMin: Math.round(temperature_2m_min[0]),
            humidity:       Math.round(relative_humidity_2m_mean[0]),
            weatherCode:    weather_code[0],
            locationName,
        });
    } catch {
        return NextResponse.json({ error: "Failed to fetch weather" }, { status: 500 });
    }
}
