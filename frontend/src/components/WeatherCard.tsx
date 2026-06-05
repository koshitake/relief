"use client";

// 選択日の天気・気温・湿度を表示するコンポーネントです。
// カレンダーで日付を切り替えるたびに該当日の天気を取得します。

import { useWeather } from "@/hooks/UseWeather";
import { useTranslations } from "@/hooks/UseTranslations";
import { useAppStore } from "@/store/UseAppStore";

type WeatherConditionKey =
    | "clear"
    | "partlyCloudy"
    | "cloudy"
    | "fog"
    | "drizzle"
    | "lightRain"
    | "rain"
    | "heavyRain"
    | "snow"
    | "shower"
    | "snowShower"
    | "thunder";

interface WeatherInfo {
    icon: string;
    conditionKey: WeatherConditionKey;
}

// WMO 天気コードをアイコンと天気状況キーに変換する
// コード定義: https://open-meteo.com/en/docs#weathervariables
function getWeatherInfo(code: number): WeatherInfo {
    if (code === 0)        return { icon: "☀️",  conditionKey: "clear" };
    if (code <= 2)         return { icon: "⛅",  conditionKey: "partlyCloudy" };
    if (code === 3)        return { icon: "☁️",  conditionKey: "cloudy" };
    if (code <= 48)        return { icon: "🌫️", conditionKey: "fog" };
    if (code <= 57)        return { icon: "🌧️", conditionKey: "drizzle" };
    if (code === 61)       return { icon: "🌂",  conditionKey: "lightRain" };
    if (code === 63)       return { icon: "🌧️", conditionKey: "rain" };
    if (code <= 67)        return { icon: "☔",  conditionKey: "heavyRain" };
    if (code <= 77)        return { icon: "❄️",  conditionKey: "snow" };
    if (code <= 82)        return { icon: "🌦️", conditionKey: "shower" };
    if (code <= 86)        return { icon: "🌨️", conditionKey: "snowShower" };
    return                         { icon: "⛈️", conditionKey: "thunder" };
}

export default function WeatherCard() {
    const selectedDay = useAppStore((s) => s.selectedDay);
    const { temperatureMax, temperatureMin, humidity, weatherCode, locationName, loading, error } = useWeather(selectedDay);
    const t = useTranslations();

    if (loading) {
        return (
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textAlign: "center" }}>
                {t.weather.loading}
            </div>
        );
    }

    if (error === "permission_denied") {
        return (
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textAlign: "center" }}>
                {t.weather.permissionDenied}
            </div>
        );
    }

    const hasData     = temperatureMax !== null && temperatureMin !== null && humidity !== null && weatherCode !== null;
    const weatherInfo = hasData ? getWeatherInfo(weatherCode!) : null;
    const conditionText   = weatherInfo ? `${weatherInfo.icon} ${t.weather[weatherInfo.conditionKey]}` : "—";
    const temperatureText = hasData ? `🌡 ${temperatureMax}° / ${temperatureMin}°` : "🌡 —";
    const humidityText    = hasData ? `💧 ${humidity}%` : "💧 —";

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {locationName && (
                <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", textAlign: "center" }}>
                    📍 {locationName}
                </div>
            )}
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "20px",
                fontSize: "0.82rem",
                color: "var(--color-text-secondary)",
            }}>
                <span>{conditionText}</span>
                <span>{temperatureText}</span>
                <span>{humidityText}</span>
            </div>
        </div>
    );
}
