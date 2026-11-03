package com.lingualive.ai.network

import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class SignalingWebSocket(
    private val serverUrl: String,
    private val onMessageReceived: (JSONObject) -> Unit,
    private val onConnectionStateChanged: (Boolean) -> Unit
) {
    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .build()

    private var webSocket: WebSocket? = null

    fun connect(roomId: String, clientId: String, username: String, spokenLang: String, targetLang: String) {
        val url = "$serverUrl/ws/room/$roomId?client_id=$clientId&username=$username&spoken_lang=$spokenLang&target_lang=$targetLang"
        val request = Request.Builder().url(url).build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                onConnectionStateChanged(true)
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    val json = JSONObject(text)
                    onMessageReceived(json)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                onConnectionStateChanged(false)
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                onConnectionStateChanged(false)
            }
        })
    }

    fun sendTranscript(text: String, sourceLang: String, speakerName: String) {
        val payload = JSONObject().apply {
            put("text", text)
            put("source_lang", sourceLang)
            put("speaker_name", speakerName)
        }
        val message = JSONObject().apply {
            put("type", "transcript")
            put("payload", payload)
        }
        webSocket?.send(message.toString())
    }

    fun disconnect() {
        webSocket?.close(1000, "Leaving room")
        webSocket = null
    }
}
