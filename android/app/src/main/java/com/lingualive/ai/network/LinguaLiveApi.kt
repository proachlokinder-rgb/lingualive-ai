package com.lingualive.ai.network

import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import java.util.concurrent.TimeUnit

data class TranslateReq(val text: String, val source_lang: String = "auto", val target_lang: String)
data class TranslateRes(val original_text: String, val translated_text: String, val latency_ms: Float, val provider: String)

data class TTSReq(val text: String, val lang: String = "en", val slow: Boolean = false)
data class TTSRes(val audio_base64: String, val format: String, val duration_estimate_sec: Float?)

data class RoomCreateReq(val room_name: String? = null, val host_language: String = "en", val target_language: String = "hi")
data class RoomStatusRes(val room_id: String, val participant_count: Int, val max_capacity: Int)

interface LinguaLiveApiService {
    @POST("/api/translate")
    suspend fun translate(@Body req: TranslateReq): TranslateRes

    @POST("/api/tts")
    suspend fun synthesizeSpeech(@Body req: TTSReq): TTSRes

    @POST("/api/rooms/create")
    suspend fun createRoom(@Body req: RoomCreateReq): RoomStatusRes

    @GET("/api/rooms/{id}/status")
    suspend fun getRoomStatus(@Path("id") roomId: String): RoomStatusRes
}

object ApiClient {
    // 127.0.0.1 connects over USB via adb reverse tcp:8000 tcp:8000
    private const val BASE_URL = "http://127.0.0.1:8000"

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(2, TimeUnit.SECONDS)
        .readTimeout(2, TimeUnit.SECONDS)
        .build()

    val service: LinguaLiveApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(LinguaLiveApiService::class.java)
    }
}
