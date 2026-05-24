"use client";

// 指定された日の天気情報を取得するカスタムフックです。
// 位置情報は初回のみ取得してキャッシュします。
// selectedDay が変わるたびに天気を再取得します。

import { useState, useEffect } from "react";

interface WeatherData {
    temperatureMax: number;
    temperatureMin: number;
    humidity: number;
    weatherCode: number;
}

interface WeatherState {
    temperatureMax: number | null;
    temperatureMin: number | null;
    humidity: number | null;
    weatherCode: number | null;
    loading: boolean;
    error: "permission_denied" | "fetch_error" | null;
}

const INITIAL_STATE: WeatherState = {
    temperatureMax: null,
    temperatureMin: null,
    humidity: null,
    weatherCode: null,
    loading: true,
    error: null,
};

interface Coords {
    lat: number;
    lng: number;
}

export function useWeather(day: string): WeatherState {
    // 位置情報は一度取得したらキャッシュし、日付変更時に再要求しない
    const [coords, setCoords] = useState<Coords | null>(null);
    const [locationError, setLocationError] = useState<"permission_denied" | "fetch_error" | null>(null);
    const [state, setState] = useState<WeatherState>(INITIAL_STATE);

    // コンポーネントマウント時に一度だけ位置情報を取得する
    useEffect(() => {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
            setLocationError("fetch_error");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setCoords({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
            },
            () => {
                // 位置情報の許可拒否またはタイムアウト
                setLocationError("permission_denied");
            },
            { timeout: 10000 }
        );
    }, []);

    // 位置情報取得後、または選択日変更時に天気を再取得する
    useEffect(() => {
        if (locationError) {
            setState((s) => ({ ...s, loading: false, error: locationError }));
            return;
        }

        // 位置情報がまだ取得中なら待機する
        if (!coords) return;

        setState({ temperatureMax: null, temperatureMin: null, humidity: null, weatherCode: null, loading: true, error: null });

        const fetchWeather = async () => {
            try {
                const res = await fetch(`/api/weather?lat=${coords.lat}&lng=${coords.lng}&day=${day}`);
                if (!res.ok) throw new Error("response not ok");
                const data = (await res.json()) as WeatherData;
                setState({
                    temperatureMax: data.temperatureMax,
                    temperatureMin: data.temperatureMin,
                    humidity: data.humidity,
                    weatherCode: data.weatherCode,
                    loading: false,
                    error: null,
                });
            } catch {
                setState((s) => ({ ...s, loading: false, error: "fetch_error" }));
            }
        };

        fetchWeather();
    }, [coords, day, locationError]);

    return state;
}
