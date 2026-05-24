// 指定日の天気情報を取得する API Route です。
// Open-Meteo（無料・APIキー不要）をサーバー側でプロキシし、
// 日次の気温・湿度・天気コードを返します。
// 90日以内: forecast API、それより古い日付: archive API を使用します。

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const FORECAST_URL = process.env.OPEN_METEO_FORECAST_URL ?? "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_URL  = process.env.OPEN_METEO_ARCHIVE_URL  ?? "https://archive-api.open-meteo.com/v1/archive";

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

/** 過去90日より古い日付は archive API を使う */
function buildUrl(lat: number, lng: number, day: string): { url: string; revalidate: number } {
    const today      = new Date();
    today.setHours(0, 0, 0, 0);
    const target     = new Date(day);
    const diffDays   = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

    const baseUrl    = diffDays > 90 ? ARCHIVE_URL : FORECAST_URL;
    const params     = new URLSearchParams({
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

export async function GET(req: NextRequest): Promise<NextResponse> {
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
    const { url, revalidate } = buildUrl(lat, lng, day);

    try {
        const response = await fetch(url, { next: { revalidate } });
        if (!response.ok) {
            return NextResponse.json({ error: "Weather API error" }, { status: 502 });
        }

        const data = (await response.json()) as OpenMeteoDailyResponse;
        const { temperature_2m_max, temperature_2m_min, relative_humidity_2m_mean, weather_code } = data.daily;

        if (!temperature_2m_max?.length) {
            return NextResponse.json({ error: "No data for this date" }, { status: 404 });
        }

        return NextResponse.json({
            temperatureMax: Math.round(temperature_2m_max[0]),
            temperatureMin: Math.round(temperature_2m_min[0]),
            humidity:       Math.round(relative_humidity_2m_mean[0]),
            weatherCode:    weather_code[0],
        });
    } catch {
        return NextResponse.json({ error: "Failed to fetch weather" }, { status: 500 });
    }
}
