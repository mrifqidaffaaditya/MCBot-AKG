# AiKei Minecraft Bot - API & Webhook Documentation

Dokumentasi ini menjelaskan cara menggunakan **API Bot Chat** untuk mengirim pesan dari aplikasi/server Anda ke dalam game Minecraft, serta cara menerima log pesan bot melalui **Webhook**.

---

## 1. Authentication (API Key)

Setiap request ke API Bot (seperti chat/command) membutuhkan **API Key**. 
API Key ini unik per sesi Bot dan bisa didapatkan di Dashboard:

1. Buka Dashboard AiKei panel.
2. Masuk ke halaman **Bot Settings / Config**.
3. Di bagian bawah klik **Generate API Key** (atau Regenerate jika ingin mengganti).
4. Gunakan API Key tersebut di header `Authorization` sebagai **Bearer Token**.

```http
Authorization: Bearer <API_KEY_ANDA_DI_SINI>
```

---

## 2. API Endpoints

### Mengirim Pesan / Command ke Game
Endpoint ini digunakan untuk menyuruh bot mengirim pesan chat atau mengeksekusi command (seperti `/spawn`, `/tpa`, dll) di dalam server Minecraft.

- **URL:** `/api/bots/{bot_id}/chat`
- **Method:** `POST`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <API_KEY>`

**Request Body (JSON):**
```json
{
  "message": "Halo dari luar game!"
}
```

**Response (Sukses 200 OK):**
```json
{
  "success": true
}
```

**Response (Error / Bot Offline):**
```json
{
  "error": "Bot is offline or not running"
}
```

**Contoh Request (cURL):**
```bash
curl -X POST \
  -H "Authorization: Bearer c7b23...[API_KEY_PANJANG]...89a2" \
  -H "Content-Type: application/json" \
  -d '{"message":"/suicide"}' \
  https://domain-anda.com/api/bots/ck12345/chat
```

---

## 3. Webhook (Menerima Chat & Event)

Fitur Webhook memungkinkan server Anda menerima notifikasi secara real-time setiap kali ada chat dari player di dalam game, atau saat status bot berubah (login, disconnect, error).

### Cara Setup Webhook:
1. Siapkan endpoint HTTP POST di server Anda (contoh: `https://api.server-anda.com/webhook/minecraft`).
2. Masukkan URL tersebut ke kolom **Webhook URL** di Config panel Bot.
3. Bot akan otomatis melakukan HTTP POST request ke URL tersebut setiap kali ada event terjadi.

### Format Webhook Payload

Setiap request webhook yang masuk ke server Anda akan memiliki format body JSON sebagai berikut:

```json
{
  "sessionId": "cuid_bot_session_id_12345",
  "botName": "Nama Session Bot",
  "botUsername": "PlayerBotName",
  "event": {
    "type": "chat",
    "sender": "Steve",
    "message": "Halo semuanya!",
    "timestamp": "2026-03-14T05:00:00.000Z"
  }
}
```

#### Penjelasan Properti `event`:

Terdapat 3 jenis `event.type` yang mungkin dikirimkan:

**1. Tipe: `chat`**
Ditembakkan ketika ada pesan chat masuk.
- Jika dari player: `sender` akan berisi nama player (berdasarkan setting Custom Chat Regex atau Default Vanilla Regex).
- Jika dari server/system announce: `sender` akan bernilai `"GAME"`.

**2. Tipe: `system`**
Ditembakkan saat ada kejadian sistem (Bot Bypass Resource Pack, Kicked by server, Error, Disconnect, dll).
- `sender` akan selalu bernilai `"SYSTEM"`.
- `message` akan berisi detail deskripsi dari kejadian tersebut.

**3. Tipe: `status`**
Ditembakkan saat status bot itu sendiri berubah (`online`, `offline`, `connecting`, `reconnecting`).
- `sender` tidak ada.
- `message` berisi status saat itu (contoh: `"online"`).

### Contoh Handler Webhook Sederhana (Node.js / Express)

```javascript
const express = require('express');
const app = express();
app.use(express.json());

app.post('/webhook/minecraft', (req, res) => {
  const { botUsername, event } = req.body;

  if (event.type === 'chat') {
    if (event.sender === "GAME") {
      console.log(`[BOT: ${botUsername}] 📢 Server Broadcast: ${event.message}`);
    } else {
      console.log(`[BOT: ${botUsername}] 💬 ${event.sender}: ${event.message}`);
    }
  } 
  else if (event.type === 'status') {
    console.log(`[BOT: ${botUsername}] Status bot berubah menjadi: ${event.message}`);
  }

  // Wajib response 200 OK agar bot tahu webhook sukses diterima
  res.sendStatus(200); 
});

app.listen(8080, () => console.log('Webhook server running on port 8080'));
```

---

## 4. Custom Chat Regex (Advance)

Beberapa server "Custom/Modded/Plugin-heavy" format chat-nya merusak regex standar Minecraft. Anda dapat mengkonfigurasi **Custom Chat Regex** di menu Config.

- Fitur ini opsional. Jika kosong, bot kembali menggunakan format Vanilla (`<PlayerName> Message`).
- Pembuatan Regex Wajib menggunakan **2 Capture Groups `()`**.
  - Group 1: Untuk menangkap `username`.
  - Group 2: Untuk menangkap isi `message`.

**Contoh untuk Server NaturalSMP:**
Pesan asli dari server: `[Not Secure] ⭐ Player 👑 » Halo!`
Regex yang dimasukkan di panel:
```regex
^\[Not Secure\]\s+\S+\s+([a-zA-Z0-9_]+)\s+.*?\s+»\s+(.*)$
```
Jika regex berhasil mencocokan pesan, `event.sender` di webhook akan menampilkan nama `Player` dan `event.message` berisi `Halo!`.
